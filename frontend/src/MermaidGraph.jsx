// MermaidGraph.jsx
import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false });

export default function MermaidGraph({ chart }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    // コンテナをクリア
    ref.current.innerHTML = '';

    // chart が不正ならメッセージを表示
    if (!chart || chart.trim().split('\n').length < 2) {
      ref.current.innerText = "（可視化データがありません）";
      return;
    }

    // Mermaid用DIVを作成
    const mdiv = document.createElement('div');
    mdiv.className = 'mermaid';
    // innerHTML ではなく textContent でコードのみ渡す
    mdiv.textContent = chart.trim();

    // コンテナに追加して描画
    ref.current.appendChild(mdiv);
    try {
      mermaid.init(undefined, mdiv);
    } catch (err) {
      ref.current.innerText = "Mermaid 描画エラー: " + err.message;
    }
  }, [chart]);

  return <div ref={ref} />;
}
