import { useState, useRef, useEffect } from "react";
import * as d3 from "d3";
import { computeTruncatedSVD, reconstructImage } from "../../logic/svdMath";
import SVDMathVisualizer from "./SVDMathVisualize";

export default function SVDCompressor() {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isComputing, setIsComputing] = useState(false);

  const [dims, setDims] = useState({ width: 200, height: 200, maxK: 75 });
  const [kValues, setKValues] = useState(25);

  const [uMatrix, setUMatrix] = useState(null);
  const [sValues, setSValues] = useState(null);
  const [vtMatrix, setVtMatrix] = useState(null);

  const origCanvasRef = useRef(null);
  const compCanvasRef = useRef(null);
  const d3ContainerRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const MAX_RENDER_DIM = 400;
      let { width, height } = img;

      if (width > MAX_RENDER_DIM || height > MAX_RENDER_DIM) {
        const ratio = Math.min(MAX_RENDER_DIM / width, MAX_RENDER_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const maxK = Math.min(width, height);
      setDims({ width, height, maxK });
      setKValues(Math.min(25, maxK));

      setIsComputing(true);

      origCanvasRef.current.width = width;
      origCanvasRef.current.height = height;
      compCanvasRef.current.width = width;
      compCanvasRef.current.height = height;

      const ctx = origCanvasRef.current.getContext("2d", {
        willReadFrequently: true,
      });
      ctx.drawImage(img, 0, 0, width, height);

      setTimeout(() => {
        const imgData = ctx.getImageData(0, 0, width, height).data;
        const matrix = new Float64Array(width * height);

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            matrix[y * width + x] =
              imgData[idx] * 0.299 +
              imgData[idx + 1] * 0.587 +
              imgData[idx + 2] * 0.114;
          }
        }

        const { U, S, VT } = computeTruncatedSVD(matrix, height, width, maxK);

        setUMatrix(U);
        setSValues(S);
        setVtMatrix(VT);
        setImageLoaded(true);
        setIsComputing(false);
      }, 50);
    };
  };

  useEffect(() => {
    if (!sValues) return;
    const svg = d3.select(d3ContainerRef.current);
    svg.selectAll("*").remove();

    const width = 400,
      height = 120;
    const margin = { top: 10, right: 10, bottom: 20, left: 10 };

    const chart = svg
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleLinear()
      .domain([0, dims.maxK])
      .range([0, width - margin.left - margin.right]);
    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(sValues)])
      .range([height - margin.top - margin.bottom, 0]);

    chart
      .append("path")
      .datum(sValues)
      .attr("fill", "rgba(56, 189, 248, 0.2)")
      .attr("stroke", "#38bdf8")
      .attr("stroke-width", 2)
      .attr(
        "d",
        d3
          .area()
          .x((_, i) => xScale(i))
          .y0(height - margin.top - margin.bottom)
          .y1((d) => yScale(d)),
      );

    chart
      .append("line")
      .attr("x1", xScale(kValues))
      .attr("x2", xScale(kValues))
      .attr("y1", 0)
      .attr("y2", height - margin.top - margin.bottom)
      .attr("stroke", "#f87171")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,4");
  }, [sValues, kValues, dims.maxK]);

  useEffect(() => {
    if (!uMatrix || !sValues || !vtMatrix || !imageLoaded) return;

    const output = reconstructImage(
      uMatrix,
      sValues,
      vtMatrix,
      dims.height,
      dims.width,
      dims.maxK,
      kValues,
    );

    const ctx = compCanvasRef.current.getContext("2d");
    const imgData = ctx.createImageData(dims.width, dims.height);

    for (let i = 0; i < dims.width * dims.height; i++) {
      const val = Math.max(0, Math.min(255, output[i]));
      const idx = i * 4;
      imgData.data[idx] = val;
      imgData.data[idx + 1] = val;
      imgData.data[idx + 2] = val;
      imgData.data[idx + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
  }, [kValues, uMatrix, sValues, vtMatrix, dims, imageLoaded]);

  return (
    <div className="flex flex-col items-center gap-8 bg-[#0b0e14] text-slate-100 p-8  border border-slate-700 shadow-[0_15px_30px_-12px_rgba(0,0,0,0.8)] font-mono">
      <label className="bg-linear-to-r from-emerald-500 to-blue-500 text-[#0b0f18] px-6 py-3  cursor-pointer font-semibold shadow-lg hover:from-blue-500 hover:to-emerald-500 transition-all">
        Upload Image
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </label>

      <div className="h-6">
        {isComputing && (
          <div className="text-emerald-400 animate-pulse font-mono tracking-widest">
            COMPUTING SVD...
          </div>
        )}
      </div>

      <div
        className={`flex flex-wrap justify-center gap-8 ${!imageLoaded && !isComputing ? "opacity-20 pointer-events-none" : ""}`}
      >
        <div className="bg-slate-800 p-6  border border-slate-700 text-center flex flex-col items-center">
          <h2 className="font-bold mb-4">
            Original ({dims.width}x{dims.height})
          </h2>
          <canvas
            ref={origCanvasRef}
            className="bg-black  shadow-lg max-w-full h-auto"
          />
        </div>

        <div className="bg-slate-800 p-6  border border-slate-700 text-center flex flex-col items-center">
          <h2 className="font-bold mb-4 text-emerald-400">Compressed</h2>
          <div className="relative  shadow-emerald-900/50 shadow-lg overflow-hidden">
            <canvas
              ref={compCanvasRef}
              className="bg-black max-w-full h-auto block"
            />
            {isComputing && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                <div className="w-10 h-10 border-4 border-slate-400 border-t-emerald-400  animate-spin mb-3"></div>
                <span className="text-sm font-mono text-emerald-400 animate-pulse">
                  Processing
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {imageLoaded && (
        <div className="w-full max-w-2xl bg-slate-800 p-6  border border-slate-700">
          <label className="flex justify-between font-bold mb-4">
            <span>Singular Values Kept (k)</span>
            <span className="text-blue-400">
              {kValues} / {dims.maxK}
            </span>
          </label>
          <input
            type="range"
            min="1"
            max={dims.maxK}
            value={kValues}
            onChange={(e) => setKValues(parseInt(e.target.value))}
            className="w-full accent-blue-500 rounded-full cursor-pointer h-2 bg-slate-700  appearance-none"
            disabled={isComputing}
          />

          <SVDMathVisualizer
            rows={dims.height}
            cols={dims.width}
            k={kValues}
            sValues={sValues}
            isComputing={isComputing}
          />

          <div className="mt-6 flex justify-center">
            <div ref={d3ContainerRef}></div>
          </div>
        </div>
      )}
    </div>
  );
}
