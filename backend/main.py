from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os, requests, io
import pandas as pd
import PyPDF2
import numpy as np

# 環境変数読み込み
load_dotenv()

# FastAPI アプリケーション定義
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],#http://localhost:5173
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# リクエストモデル
class PromptInput(BaseModel):
    user_input: str
    use_rag: bool = False

DISABLE_RAG = os.getenv("DISABLE_RAG") == "1"

if not DISABLE_RAG:
    from sentence_transformers import SentenceTransformer
    import faiss
    embedder = SentenceTransformer('all-MiniLM-L6-v2')
    vector_index = None
    chunks: list[str] = []
else:
    embedder = None
    vector_index = None
    chunks = []
    

# Together.ai 設定
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
TOGETHER_MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1"

# ファイルアップロード＆インデックス作成エンドポイント
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    global vector_index, chunks
    # PDF テキスト抽出
    if file.filename.lower().endswith(".pdf"):
        content = await file.read()
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        text = "".join([page.extract_text() or "" for page in reader.pages])
    # CSV テキスト抽出
    elif file.filename.lower().endswith(".csv"):
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        text = df.to_csv(index=False)
    # その他はプレーンテキスト
    else:
        text = (await file.read()).decode('utf-8')

    # チャンク化
    chunk_size = 500
    chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

    # 埋め込み算出 & FAISS インデックス構築
    embeddings = embedder.encode(chunks, convert_to_numpy=True)
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)
    vector_index = index

    return {"message": f"{len(chunks)} chunks indexed."}

# ツリー生成エンドポイント（RAG 対応）
@app.post("/generate")
def generate_tree(data: PromptInput):
    # RAG コンテキスト取得
    context = ""
    if data.use_rag and vector_index is not None:
        q_emb = embedder.encode([data.user_input], convert_to_numpy=True)
        D, I = vector_index.search(q_emb, k=3)
        retrieved = [chunks[i] for i in I[0]]
        context = "\n\n=== 参照資料抜粋 ===\n" + "\n---\n".join(retrieved) + "\n\n"

    # プロンプト組立
    prompt = f"""
以下の課題や目標を、必ずハイフンとスペースのみを使ったツリー形式（ネストは半角スペース2つのインデント）で、同じ行を重複せずに出力してください。文章説明は不要です。
{context}
課題: {data.user_input}

ツリー：
"""

    # Together.ai API 呼び出し
    headers = {
        "Authorization": f"Bearer {TOGETHER_API_KEY}",
        "Content-Type": "application/json"
    }
    body = {
        "model": TOGETHER_MODEL,
        "prompt": prompt,
        "max_tokens": 512,
        "temperature": 0.7,
        "top_p": 0.95
    }
    resp = requests.post("https://api.together.xyz/inference", headers=headers, json=body)
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Together.ai Error {resp.status_code}: {resp.text}")

    # レスポンスからテキスト取り出し
    result = resp.json()
    try:
        tree_text = result["choices"][0]["text"].strip()
    except (KeyError, IndexError):
        tree_text = "エラー：出力が得られませんでした。"

    return {"tree": tree_text}

from fastapi.staticfiles import StaticFiles
import os

# 既存の app 定義のあとに追記
# frontend/dist がサーバ上に存在するパスを指定
app.mount(
    "/",
    StaticFiles(directory=os.path.join(os.getcwd(), "frontend", "dist"), html=True),
    name="static",
)
