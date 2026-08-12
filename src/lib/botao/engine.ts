/**
 * Motor de física do Futebol de Botão.
 * Unidades do campo: 100 (largura) x 150 (altura). Lado "A" defende embaixo
 * (y = 150) e ataca o gol de cima; lado "B" faz o oposto.
 * Puramente funcional: nenhuma dependência de React ou do DOM.
 */

export const CAMPO = {
  w: 100,
  h: 150,
  golW: 32,
  areaW: 52,
  areaH: 22,
} as const;

export type Lado = "A" | "B";

export type Peca = {
  id: string;
  lado: Lado | "BOLA";
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  m: number;
  gk?: boolean;
};

const ATRITO = 2.4; // desaceleração exponencial por segundo
const PARADA = 0.45; // velocidade mínima antes de considerar parado
const RESTITUICAO = 0.94;
const PAREDE = 0.62;

/** Formação inicial (5 botões de linha + goleiro por lado). */
export function formacaoInicial(): Peca[] {
  const linhaA: Array<[number, number]> = [
    [22, 118],
    [50, 122],
    [78, 118],
    [34, 96],
    [66, 96],
  ];
  const pecas: Peca[] = [];

  pecas.push({ id: "A-gk", lado: "A", x: 50, y: 144, vx: 0, vy: 0, r: 5.2, m: 2.4, gk: true });
  linhaA.forEach(([x, y], i) => {
    pecas.push({ id: `A-${i}`, lado: "A", x, y, vx: 0, vy: 0, r: 4.2, m: 1.6 });
  });

  pecas.push({ id: "B-gk", lado: "B", x: 50, y: CAMPO.h - 144, vx: 0, vy: 0, r: 5.2, m: 2.4, gk: true });
  linhaA.forEach(([x, y], i) => {
    pecas.push({ id: `B-${i}`, lado: "B", x: CAMPO.w - x, y: CAMPO.h - y, vx: 0, vy: 0, r: 4.2, m: 1.6 });
  });

  pecas.push({ id: "BOLA", lado: "BOLA", x: 50, y: 75, vx: 0, vy: 0, r: 2.5, m: 0.35 });
  return pecas;
}

export function clonar(pecas: Peca[]): Peca[] {
  return pecas.map((p) => ({ ...p }));
}

export function bola(pecas: Peca[]): Peca {
  return pecas.find((p) => p.lado === "BOLA")!;
}

export function emRepouso(pecas: Peca[]): boolean {
  return pecas.every((p) => p.vx === 0 && p.vy === 0);
}

/** Aplica o impulso do toque (estilo estilingue) em um botão. */
export function aplicarToque(peca: Peca, dirX: number, dirY: number, forca: number) {
  const dist = Math.hypot(dirX, dirY) || 1;
  const potencia = Math.min(Math.max(forca, 0), 1) * 190;
  peca.vx = (dirX / dist) * potencia;
  peca.vy = (dirY / dist) * potencia;
}

export type ResultadoPasso = {
  golDe: Lado | null;
  bolaTocadaPor: Lado | null;
};

/**
 * Avança a simulação em `dt` segundos. Retorna se saiu gol nesse passo e
 * qual lado tocou na bola (para a regra dos 3 toques).
 */
export function passo(pecas: Peca[], dt: number): ResultadoPasso {
  let golDe: Lado | null = null;
  let bolaTocadaPor: Lado | null = null;

  for (const p of pecas) {
    if (p.vx === 0 && p.vy === 0) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const f = Math.exp(-ATRITO * dt);
    p.vx *= f;
    p.vy *= f;
    if (Math.hypot(p.vx, p.vy) < PARADA) {
      p.vx = 0;
      p.vy = 0;
    }
  }

  // Colisões entre botões / bola
  for (let i = 0; i < pecas.length; i++) {
    for (let j = i + 1; j < pecas.length; j++) {
      const a = pecas[i]!;
      const b = pecas[j]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const min = a.r + b.r;
      if (dist === 0 || dist >= min) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      const sobra = min - dist;
      const totalM = a.m + b.m;
      a.x -= nx * sobra * (b.m / totalM);
      a.y -= ny * sobra * (b.m / totalM);
      b.x += nx * sobra * (a.m / totalM);
      b.y += ny * sobra * (a.m / totalM);

      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        const imp = (-(1 + RESTITUICAO) * vn) / (1 / a.m + 1 / b.m);
        a.vx -= (imp * nx) / a.m;
        a.vy -= (imp * ny) / a.m;
        b.vx += (imp * nx) / b.m;
        b.vy += (imp * ny) / b.m;
      }

      if (a.lado === "BOLA" && b.lado !== "BOLA") bolaTocadaPor = b.lado;
      if (b.lado === "BOLA" && a.lado !== "BOLA") bolaTocadaPor = a.lado;
    }
  }

  // Paredes e detecção de gol
  const meiaTrave = CAMPO.golW / 2;
  for (const p of pecas) {
    if (p.x < p.r) {
      p.x = p.r;
      p.vx = -p.vx * PAREDE;
    }
    if (p.x > CAMPO.w - p.r) {
      p.x = CAMPO.w - p.r;
      p.vx = -p.vx * PAREDE;
    }
    const naBoca = Math.abs(p.x - CAMPO.w / 2) < meiaTrave - p.r * 0.35;

    if (p.y < p.r) {
      if (p.lado === "BOLA" && naBoca) {
        golDe = "A";
      }
      p.y = p.r;
      p.vy = -p.vy * PAREDE;
    }
    if (p.y > CAMPO.h - p.r) {
      if (p.lado === "BOLA" && naBoca) {
        golDe = "B";
      }
      p.y = CAMPO.h - p.r;
      p.vy = -p.vy * PAREDE;
    }
  }

  return { golDe, bolaTocadaPor };
}

/** Escolhe um toque para a IA: botão mais próximo da bola, mirando o gol. */
export function jogadaDaIA(pecas: Peca[], lado: Lado, dificuldade = 0.7) {
  const b = bola(pecas);
  const meus = pecas.filter((p) => p.lado === lado && !p.gk);
  let melhor = meus[0]!;
  let melhorDist = Infinity;
  for (const p of meus) {
    const d = Math.hypot(p.x - b.x, p.y - b.y);
    if (d < melhorDist) {
      melhorDist = d;
      melhor = p;
    }
  }
  const golY = lado === "A" ? 0 : CAMPO.h;
  const alvoX = b.x + (CAMPO.w / 2 - b.x) * 0.35;
  const rumoX = alvoX - b.x;
  const rumoY = golY - b.y;
  const norma = Math.hypot(rumoX, rumoY) || 1;
  const erro = (1 - dificuldade) * 26;
  const mira = {
    x: b.x - (rumoX / norma) * (b.r + melhor.r) + (Math.random() - 0.5) * erro,
    y: b.y - (rumoY / norma) * (b.r + melhor.r) + (Math.random() - 0.5) * erro,
  };
  const dirX = mira.x - melhor.x;
  const dirY = mira.y - melhor.y;
  const dist = Math.hypot(dirX, dirY);
  const forca = Math.min(1, 0.42 + dist / 90);
  return { pecaId: melhor.id, dirX, dirY, forca };
}
