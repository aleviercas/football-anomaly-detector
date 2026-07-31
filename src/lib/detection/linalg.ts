export type Vec = number[];
export type Mat = number[][];

export function mean(data: Vec[]): Vec {
  const n = data.length;
  const d = data[0].length;
  const out = new Array(d).fill(0);
  for (const row of data) for (let i = 0; i < d; i++) out[i] += row[i];
  for (let i = 0; i < d; i++) out[i] /= n;
  return out;
}

export function covariance(data: Vec[], mu: Vec, ridge = 1e-3): Mat {
  const n = data.length;
  const d = mu.length;
  const cov: Mat = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const row of data) {
    for (let i = 0; i < d; i++) {
      const di = row[i] - mu[i];
      for (let j = 0; j < d; j++) {
        cov[i][j] += di * (row[j] - mu[j]);
      }
    }
  }
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) cov[i][j] /= Math.max(1, n - 1);
    cov[i][i] += ridge; // ridge regularization so the matrix stays invertible with small samples
  }
  return cov;
}

/** Gauss-Jordan matrix inverse. Assumes `m` is already ridge-regularized (invertible). */
export function invert(m: Mat): Mat {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const pv = a[col][col] || 1e-9;
    for (let c = 0; c < 2 * n; c++) a[col][c] /= pv;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = a[r][col];
      if (factor === 0) continue;
      for (let c = 0; c < 2 * n; c++) a[r][c] -= factor * a[col][c];
    }
  }
  return a.map((row) => row.slice(n));
}

export function matVec(m: Mat, v: Vec): Vec {
  return m.map((row) => row.reduce((s, x, i) => s + x * v[i], 0));
}

export function dot(a: Vec, b: Vec): number {
  return a.reduce((s, x, i) => s + x * b[i], 0);
}

export function sub(a: Vec, b: Vec): Vec {
  return a.map((x, i) => x - b[i]);
}

/** Squared Mahalanobis distance: (x-mu)^T * Sigma^-1 * (x-mu). */
export function mahalanobisSq(x: Vec, mu: Vec, covInv: Mat): number {
  const d = sub(x, mu);
  return dot(d, matVec(covInv, d));
}

/**
 * Top-k eigenvectors of a symmetric matrix via power iteration + deflation.
 * Good enough for our small feature dimensionality (~20 features, k<=5) —
 * no need for a full SVD library.
 */
export function topEigenvectors(cov: Mat, k: number, iters = 200): { values: number[]; vectors: Vec[] } {
  const n = cov.length;
  let work = cov.map((row) => [...row]);
  const values: number[] = [];
  const vectors: Vec[] = [];
  for (let c = 0; c < k; c++) {
    let v = Array.from({ length: n }, () => Math.random() - 0.5);
    let norm = Math.sqrt(dot(v, v)) || 1;
    v = v.map((x) => x / norm);
    let lambda = 0;
    for (let it = 0; it < iters; it++) {
      const w = matVec(work, v);
      norm = Math.sqrt(dot(w, w)) || 1e-9;
      v = w.map((x) => x / norm);
      lambda = norm;
    }
    values.push(lambda);
    vectors.push(v);
    // Deflate: remove this component's contribution before finding the next
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) work[i][j] -= lambda * v[i] * v[j];
    }
  }
  return { values, vectors };
}
