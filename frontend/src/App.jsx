import React, { useState } from 'react';
import MermaidGraph from './MermaidGraph';
import logo from '../assets/logo.png';  // ロゴ画像を assets フォルダに配置してください

// テキストをMermaid用のグラフ記法に変換する関数
function convertToMermaid(treeText) {
  const lines = treeText.split('\n');
  let result = 'graph TD\n';
  const stack = [];
  const seenEdges = new Set();

  for (let raw of lines) {
    const cleanLine = raw.replace(/^[\s\-–—_　]+/, '');
    if (!cleanLine) continue;
    const label = cleanLine.trim();
    const nodeId = label.replace(/\s+/g, '_');

    const indent = Math.floor((raw.length - raw.trimStart().length) / 2);

    while (stack.length && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (stack.length) {
      const parentId = stack[stack.length - 1].id;
      const edgeKey = `${parentId}->${nodeId}`;
      if (!seenEdges.has(edgeKey)) {
        result += `  ${parentId} --> ${nodeId}\n`;
        seenEdges.add(edgeKey);
      }
    }

    result += `  ${nodeId}["${label}"]\n`;
    stack.push({ indent, id: nodeId });
  }

  return result;
}

function App() {
  const [input, setInput] = useState("中小企業の利益率を上げたい");
  const [output, setOutput] = useState("");
  const [mermaidChart, setMermaidChart] = useState("");
  const [file, setFile] = useState(null);
  const [useRag, setUseRag] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("ファイルを選択してください");
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/upload', { method: 'POST', body: form });
    const j = await res.json();
    alert(j.message);
  };

  const handleGenerate = async () => {
    const res = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_input: input, use_rag: useRag })
    });
    const data = await res.json();
    setOutput(data.tree);

    const chart = convertToMermaid(data.tree);
    console.log('▶ mermaidChart:', chart);
    setMermaidChart(chart);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      {/* ロゴ表示 */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <img src={logo} alt="Evidra Logo" style={{ width: '180px', height: 'auto' }} />
      </div>

      <h1>Evidra</h1>
      <h3>Structure your strategy</h3>

      <div>
        <h4>ファイル参照RAGオプション</h4>
        <input type="file" onChange={e => setFile(e.target.files[0])} />
        <button onClick={handleUpload}>ファイルアップロード（※現在この機能は無効化されています）</button>
        <label style={{ marginLeft: '1rem' }}>
          <input type="checkbox" checked={useRag} onChange={() => setUseRag(v => !v)} />
          参照資料を利用する
        </label>
      </div>

      <textarea
        rows={4}
        cols={60}
        value={input}
        onChange={e => setInput(e.target.value)}
        style={{ marginTop: '1rem', width: '100%' }}
      />
      <br />
      <button onClick={handleGenerate} style={{ marginTop: '0.5rem' }}>
        生成
      </button>

      <h2>出力テキスト</h2>
      <pre>{output}</pre>

      <h2>ツリー可視化</h2>
      <MermaidGraph chart={mermaidChart} />
    </div>
  );
}

export default App;
