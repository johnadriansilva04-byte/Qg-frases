/**
 * RNG com seed (mulberry32) — substitui numpy.random no código original,
 * permitindo geração reproduzível de problemas 100% no cliente.
 */
export class Rng {
  private state: number;

  constructor(seed: number = (Math.random() * 0xffffffff) >>> 0) {
    this.state = seed >>> 0;
  }

  /** Float uniforme em [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Inteiro uniforme em [min, max] (inclusive), como np.random.choice(range(min, max+1)). */
  randint(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  choice<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]!;
  }

  /** Amostra k elementos distintos sem reposição (np.random.choice(arr, k, replace=False)). */
  sample<T>(arr: readonly T[], k: number): T[] {
    if (k > arr.length) throw new Error(`sample: k=${k} maior que a população (${arr.length})`);
    const pool = arr.slice();
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(this.next() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    return pool.slice(0, k);
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  }
}

/** Coeficiente binomial C(n, k) — substitui scipy.misc.comb (n pequenos). */
export function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}

/** range(min, max) inclusivo. */
export function irange(min: number, max: number): number[] {
  const out: number[] = [];
  for (let i = min; i <= max; i++) out.push(i);
  return out;
}

/** Clonagem profunda de estado puro (sem funções) — substitui copy.deepcopy. */
export function clone<T>(value: T): T {
  return structuredClone(value);
}
