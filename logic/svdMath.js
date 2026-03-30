import Float64Array from "@stdlib/array/float64/lib";
import randu from "@stdlib/random/base/randu/lib";
import dnrm2 from "@stdlib/blas/base/dnrm2/lib";
import dscal from "@stdlib/blas/base/dscal/lib";
import dcopy from "@stdlib/blas/base/dcopy/lib";
import ddot from "@stdlib/blas/base/ddot/lib";
import daxpy from "@stdlib/blas/base/daxpy/lib";
import dgemv from "@stdlib/blas/base/dgemv/lib";
import dger from "@stdlib/blas/base/dger/lib";
import dgemm from "@stdlib/blas/base/dgemm/lib";

const cache = {
  v: null,
  u: null,
  SkVTkBuffer: null,
  reconstructBuffer: null,
  lastRows: 0,
  lastCols: 0,
  lastMaxK: 0,
};

function ensureCache(rows, cols, maxK) {
  if (
    cache.lastRows !== rows ||
    cache.lastCols !== cols ||
    cache.lastMaxK < maxK
  ) {
    cache.v = new Float64Array(cols);
    cache.u = new Float64Array(rows);
    cache.SkVTkBuffer = new Float64Array(maxK * cols);
    cache.reconstructBuffer = new Float64Array(rows * cols);
    cache.lastRows = rows;
    cache.lastCols = cols;
    cache.lastMaxK = maxK;
  }
}

export function computeTruncatedSVD( matrixData, rows, cols, maxK ) {
  ensureCache( rows, cols, maxK );

  const A = new Float64Array( matrixData );
  const U = new Float64Array( rows * maxK );
  const S = new Float64Array( maxK );
  const VT = new Float64Array( maxK * cols );
  const { v, u } = cache;

  for ( let k = 0; k < maxK; k++ ) {
    for ( let i = 0; i < cols; i++ ) v[ i ] = randu();
    let vNorm = dnrm2( cols, v, 1 );
    dscal( cols, 1.0 / vNorm, v, 1 );

    let sigma = 0;

    for ( let iter = 0; iter < 30; iter++ ) {
      // 1. u = A * v
      dgemv(
        "row-major",
        "no-transpose",
        rows,
        cols,
        1.0,
        A,
        cols,
        v,
        1,
        0.0,
        u,
        1,
      );

      // GRAM-SCHMIDT: Force 'u' to be orthogonal to all previously found 'U' vectors
      for ( let j = 0; j < k; j++ ) {
        let dotProduct = ddot( rows, u, 1, U.subarray(j), maxK );
        daxpy( rows, -dotProduct, U.subarray(j), maxK, u, 1 );
      }

      let uNorm = dnrm2( rows, u, 1 );
      dscal( rows, 1.0 / uNorm, u, 1 );

      // 2. v = A^T * u
      dgemv(
        "row-major",
        "transpose",
        rows,
        cols,
        1.0,
        A,
        cols,
        u,
        1,
        0.0,
        v,
        1,
      );

      // GRAM-SCHMIDT: Force 'v' to be orthogonal to all previously found 'VT' vectors
      for ( let j = 0; j < k; j++ ) {
        let dotProduct = ddot( cols, v, 1, VT.subarray( j * cols ), 1 );
        daxpy( cols, -dotProduct, VT.subarray(j * cols), 1, v, 1 );
      }

      vNorm = dnrm2( cols, v, 1 );
      sigma = vNorm;
      dscal( cols, 1.0 / vNorm, v, 1 );
    }

    S[k] = sigma;
    dcopy( rows, u, 1, U.subarray( k ), maxK);
    dcopy( cols, v, 1, VT.subarray( k * cols ), 1);
    dger( "row-major", rows, cols, -sigma, u, 1, v, 1, A, cols );
  }

  return { U, S, VT };
}

export function reconstructImage(
  uMatrix,
  sValues,
  vtMatrix,
  rows,
  cols,
  maxK,
  kValues,
) {
  ensureCache( rows, cols, maxK );
  const { SkVTkBuffer, reconstructBuffer } = cache;

  for ( let k = 0; k < kValues; k++ ) {
    dcopy(
      cols,
      vtMatrix.subarray(k * cols),
      1,
      SkVTkBuffer.subarray(k * cols),
      1,
    );
    dscal( cols, sValues[k], SkVTkBuffer.subarray(k * cols), 1 );
  }

  dgemm(
    "row-major",
    "no-transpose",
    "no-transpose",
    rows,
    cols,
    kValues,
    1.0,
    uMatrix,
    maxK,
    SkVTkBuffer,
    cols,
    0.0,
    reconstructBuffer,
    cols,
  );

  return reconstructBuffer;
}
