import { performance } from 'perf_hooks';
import Float64Array from '@stdlib/array/float64/lib/index.js';
import randu from '@stdlib/random/base/randu/lib/index.js';
import dnrm2 from '@stdlib/blas/base/dnrm2/lib/index.js';
import dscal from '@stdlib/blas/base/dscal/lib/index.js';
import dcopy from '@stdlib/blas/base/dcopy/lib/index.js';
import ddot from '@stdlib/blas/base/ddot/lib/index.js';
import daxpy from '@stdlib/blas/base/daxpy/lib/index.js';
import dgemv from '@stdlib/blas/base/dgemv/lib/index.js';
import dger from '@stdlib/blas/base/dger/lib/index.js';
import dgemm from '@stdlib/blas/base/dgemm/lib/index.js';

const SIZE = 1024;  
const MAX_K = 75;  
const K_VALS = 25; 

console.log(`\n=============================================================`);
console.log(` SVD BENCHMARK (${SIZE}x${SIZE} Matrix)`);
console.log(` Gram-Schmidt Orthogonalization`);
console.log(`=============================================================\n`);

const rawMatrix = new Array(SIZE * SIZE);
for (let i = 0; i < SIZE * SIZE; i++) rawMatrix[i] = Math.random() * 255;

// =====================================================================
// 1. @stdlib.js IMPLEMENTATION 
// =====================================================================

export function computeSVD_Stdlib(matrixData, rows, cols, maxK) {
  const A = new Float64Array(matrixData);
  const U = new Float64Array(rows * maxK);
  const S = new Float64Array(maxK);
  const VT = new Float64Array(maxK * cols);
  const  v = new Float64Array(SIZE);
  const  u = new Float64Array(SIZE)

  for (let k = 0; k < maxK; k++) {
    for (let i = 0; i < cols; i++) v[i] = randu();
    let vNorm = dnrm2(cols, v, 1);
    dscal(cols, 1.0 / vNorm, v, 1);

    let sigma = 0;
    for (let iter = 0; iter < 30; iter++) {
      dgemv('row-major', 'no-transpose', rows, cols, 1.0, A, cols, v, 1, 0.0, u, 1);
      
      for (let j = 0; j < k; j++) {
        let dotProduct = ddot(rows, u, 1, U.subarray(j), maxK);
        daxpy(rows, -dotProduct, U.subarray(j), maxK, u, 1);
      }

      let uNorm = dnrm2(rows, u, 1);
      dscal(rows, 1.0 / uNorm, u, 1);

      dgemv('row-major', 'transpose', rows, cols, 1.0, A, cols, u, 1, 0.0, v, 1);

      for (let j = 0; j < k; j++) {
        let dotProduct = ddot(cols, v, 1, VT.subarray(j * cols), 1);
        daxpy(cols, -dotProduct, VT.subarray(j * cols), 1, v, 1);
      }

      vNorm = dnrm2(cols, v, 1);
      sigma = vNorm;
      dscal(cols, 1.0 / vNorm, v, 1);
    }
    S[k] = sigma;
    dcopy(rows, u, 1, U.subarray(k), maxK);
    dcopy(cols, v, 1, VT.subarray(k * cols), 1);
    dger('row-major', rows, cols, -sigma, u, 1, v, 1, A, cols);
  }
  return { U, S, VT };
}

export function reconstruct_Stdlib(uMatrix, sValues, vtMatrix, rows, cols, maxK, kValues) {
  const SkVTkBuffer = new Float64Array(MAX_K * SIZE);
  const  reconstructBuffer = new Float64Array(SIZE * SIZE);
  for (let k = 0; k < kValues; k++) {
    dcopy(cols, vtMatrix.subarray(k * cols), 1, SkVTkBuffer.subarray(k * cols), 1);
    dscal(cols, sValues[k], SkVTkBuffer.subarray(k * cols), 1);
  }
  dgemm('row-major', 'no-transpose', 'no-transpose', rows, cols, kValues, 1.0, uMatrix, maxK, SkVTkBuffer, cols, 0.0, reconstructBuffer, cols);
  return reconstructBuffer;
}

// =====================================================================
// 2. NATIVE JS IMPLEMENTATION 
// =====================================================================

export function computeSVD_Native(matrixData, rows, cols, maxK) {
  const A = new Float64Array(matrixData);
  const U = new Float64Array(rows * maxK);
  const S = new Float64Array(maxK);
  const VT = new Float64Array(maxK * cols);

  for (let k = 0; k < maxK; k++) {
    const v = new Float64Array(cols);
    let vNorm = 0;
    for (let i = 0; i < cols; i++) { v[i] = Math.random(); vNorm += v[i]**2; }
    vNorm = Math.sqrt(vNorm);
    for (let i = 0; i < cols; i++) v[i] /= vNorm;

    const u = new Float64Array(rows);
    let sigma = 0;

    for (let iter = 0; iter < 30; iter++) {
      // u = A * v
      for (let i = 0; i < rows; i++) {
        let sum = 0;
        for (let j = 0; j < cols; j++) sum += A[i * cols + j] * v[j];
        u[i] = sum;
      }

      // Gram-Schmidt for U
      for (let j = 0; j < k; j++) {
        let dot = 0;
        for (let i = 0; i < rows; i++) dot += u[i] * U[i * maxK + j];
        for (let i = 0; i < rows; i++) u[i] -= dot * U[i * maxK + j];
      }

      let uNorm = 0;
      for (let i = 0; i < rows; i++) uNorm += u[i]**2;
      uNorm = Math.sqrt(uNorm);
      for (let i = 0; i < rows; i++) u[i] /= uNorm;

      // v = A^T * u
      for (let j = 0; j < cols; j++) {
        let sum = 0;
        for (let i = 0; i < rows; i++) sum += A[i * cols + j] * u[i];
        v[j] = sum;
      }

      // Gram-Schmidt for VT
      for (let j = 0; j < k; j++) {
        let dot = 0;
        for (let col = 0; col < cols; col++) dot += v[col] * VT[j * cols + col];
        for (let col = 0; col < cols; col++) v[col] -= dot * VT[j * cols + col];
      }

      vNorm = 0;
      for (let j = 0; j < cols; j++) vNorm += v[j]**2;
      vNorm = Math.sqrt(vNorm);
      sigma = vNorm;
      for (let j = 0; j < cols; j++) v[j] /= vNorm;
    }

    S[k] = sigma;
    for (let i = 0; i < rows; i++) U[i * maxK + k] = u[i];
    for (let j = 0; j < cols; j++) VT[k * cols + j] = v[j];

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) A[i * cols + j] -= sigma * u[i] * v[j];
    }
  }
  return { U, S, VT };
}

const nativeReconBuf = new Float64Array(SIZE * SIZE);
export function reconstruct_Native(uMatrix, sValues, vtMatrix, rows, cols, maxK, kValues) {
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      for (let k = 0; k < kValues; k++) sum += uMatrix[i * maxK + k] * sValues[k] * vtMatrix[k * cols + j];
      nativeReconBuf[i * cols + j] = sum;
    }
  }
  return nativeReconBuf;
}

// =====================================================================
// 3. EXECUTION
// =====================================================================

console.log("--- WARMUP (JIT Compilation) ---");
computeSVD_Native(rawMatrix, Math.min(SIZE, 100), Math.min(SIZE, 100), 5);
computeSVD_Stdlib(rawMatrix, Math.min(SIZE, 100), Math.min(SIZE, 100), 5);

// Test 1: SVD Calculation
console.log("\n--- TEST 1: SVD Factorization (Upload Image) ---");
let start = performance.now();
const nativeSVD = computeSVD_Native(rawMatrix, SIZE, SIZE, MAX_K);
let timeNativeSVD = (performance.now() - start).toFixed(2);

start = performance.now();
const stdlibSVD = computeSVD_Stdlib(rawMatrix, SIZE, SIZE, MAX_K);
let timeStdlibSVD = (performance.now() - start).toFixed(2);

console.log(`Native JS:  ${timeNativeSVD} ms`);
console.log(`@stdlib:    ${timeStdlibSVD} ms`);

// Test 2: Reconstruction (Slider drag)
console.log("\n--- TEST 2: Image Reconstruction (Slider Drag) ---");
const FRAMES = 30; 

start = performance.now();
for(let f=0; f<FRAMES; f++) reconstruct_Native(nativeSVD.U, nativeSVD.S, nativeSVD.VT, SIZE, SIZE, MAX_K, K_VALS);
let timeNativeRecon = (performance.now() - start).toFixed(2);

start = performance.now();
for(let f=0; f<FRAMES; f++) reconstruct_Stdlib(stdlibSVD.U, stdlibSVD.S, stdlibSVD.VT, SIZE, SIZE, MAX_K, K_VALS);
let timeStdlibRecon = (performance.now() - start).toFixed(2);

console.log(`Native JS (30 frames):  ${timeNativeRecon} ms`);
console.log(`@stdlib   (30 frames):  ${timeStdlibRecon} ms`);

console.log(`\n=============================================================`);
console.log(` Final Setup Speedup:      ${(timeNativeSVD / timeStdlibSVD).toFixed(2)}x`);
console.log(` Final Recon Speedup:      ${(timeNativeRecon / timeStdlibRecon).toFixed(2)}x`);
console.log(`=============================================================\n`);