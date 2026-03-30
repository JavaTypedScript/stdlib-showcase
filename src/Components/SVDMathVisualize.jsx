import { useRef, useEffect } from "react";
import katex from "katex";
import "katex/dist/katex.min.css"; 

export default function SVDMathVisualizer({
  rows,
  cols,
  k,
  sValues,
  isComputing,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (isComputing || !sValues) {
      const loadingLatex = String.raw`A_{m \times n} = U \Sigma V^T \dots \text{Computing}`;
      katex.render(loadingLatex, containerRef.current, { displayMode: true });
      return;
    }
    const getS = (idx) => (sValues[idx] ? sValues[idx].toFixed(1) : "0.0");
    let sigmaMatrix = "";
    if (k === 1) {
      sigmaMatrix = String.raw`\begin{bmatrix} ${getS(0)} \end{bmatrix}`;
    } else if (k === 2) {
      sigmaMatrix = String.raw`\begin{bmatrix} ${getS(0)} & 0 \\ 0 & ${getS(1)} \end{bmatrix}`;
    } else {
      sigmaMatrix = String.raw`\begin{bmatrix} 
        ${getS(0)} & 0 & \cdots & 0 \\ 
        0 & ${getS(1)} & \cdots & 0 \\ 
        \vdots & \vdots & \ddots & \vdots \\ 
        0 & 0 & \cdots & ${getS(k - 1)} 
      \end{bmatrix}`;
    }

    const latex = String.raw`
      \begin{aligned}
      A_{${rows} \times ${cols}} &\approx U_{${rows} \times \color{#38bdf8}{${k}}} \cdot \Sigma_{\color{#38bdf8}{${k}} \times \color{#38bdf8}{${k}}} \cdot V^T_{\color{#38bdf8}{${k}} \times ${cols}} \\
      \\
      \Sigma_{\color{#38bdf8}{${k}} \times \color{#38bdf8}{${k}}} &= ${sigmaMatrix}
      \end{aligned}
    `;

    katex.render(latex, containerRef.current, {
      displayMode: true,
      throwOnError: false,
      trust: true,
    });
  }, [rows, cols, k, sValues, isComputing]);

  return (
    <div className="bg-[#101421] p-4 border border-slate-700 shadow-black/50 overflow-x-auto w-full">
      <div ref={containerRef} className="text-slate-200 font-mono" />
    </div>
  );
}
