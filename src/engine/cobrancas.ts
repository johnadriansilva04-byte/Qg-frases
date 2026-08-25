/**
 * Núcleo PURO da disputa de cobranças (pênaltis + faltas) — sem three, sem
 * DOM, testável em Node/jiti. O MatchEngine consome estas funções; os testes
 * exercitam o MESMO código de produção.
 *
 * Contrato do modo:
 *  - 15 cobranças por lado (TOTAL_COBRANCAS);
 *  - o jogador executa por SWIPE (direção + força + elevação);
 *  - o adversário é resolvido de forma DETERMINÍSTICA por
 *    resolverCobrancaAdversaria (mesma semente → mesmo resultado: F5 nunca
 *    transforma nem duplica uma cobrança);
 *  - a dificuldade vem dos atributos reais (shooting do elenco × defending
 *    do goleiro adversário).
 */

export const TOTAL_COBRANCAS = 15;

export type TipoCobranca = "penalti" | "falta";

export type Desfecho = "goal" | "save" | "out" | "post";

export const DESFECHO_ROTULO: Record<Desfecho, string> = {
  goal: "GOL",
  save: "DEFESA",
  out: "PARA FORA",
  post: "TRAVE",
};

/** Gesto de swipe em pixels de tela (dx>0 = direita, dy>0 = baixo). */
export interface SwipeInput {
  dx: number;
  dy: number;
  dtMs: number;
}

export interface ChuteParams {
  /** Posição-alvo da bola no plano do gol (z lateral, y altura), em metros. */
  alvoZ: number;
  alvoY: number;
  /** 0..1 — define a velocidade da bola. */
  forca: number;
  /** Curva lateral (faltas). 0 na versão estável — parâmetro já existe. */
  curva: number;
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/** Hash FNV-1a 32 bits — base de toda aleatoriedade controlada do modo. */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** PRNG determinístico (mulberry32) a partir de uma semente textual. */
export function rngSemente(seed: string): () => number {
  let a = hashSeed(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Cobranças 1..10 são pênaltis; 11..15 são faltas (mais distantes, com
 * elevação). Determinístico — a rodada nunca muda de tipo num F5.
 */
export function tipoDaCobranca(indice: number): TipoCobranca {
  return indice <= 10 ? "penalti" : "falta";
}

/** Distância da cobrança à linha do gol (m): pênalti 11m; falta 19-24m. */
export function distanciaDaCobranca(indice: number): number {
  if (tipoDaCobranca(indice) === "penalti") return 11;
  const r = rngSemente(`falta-dist:${indice}`);
  return 19 + Math.floor(r() * 6); // 19..24
}

/**
 * SWIPE → parâmetros do chute. A câmera fica atrás da bola olhando para o
 * gol (-x); nesse referencial a DIREITA da tela é o -z do mundo
 * (right = forward × up = (-1,0,0)×(0,1,0) = (0,0,-1)).
 *
 *  - dx (px, direita+)  → alvo lateral: direita da tela = -z;
 *  - dy (px, baixo+)    → swipe para CIMA (dy<0) aumenta força e elevação;
 *  - extensão total     → força (com leve ganho por velocidade do gesto);
 *  - força muito alta   → menos precisão (erro cresce com a força e cai com
 *                         o atributo shooting do cobrador).
 */
export function swipeParaChute(swipe: SwipeInput, tipo: TipoCobranca, shooting: number): ChuteParams {
  const len = Math.hypot(swipe.dx, swipe.dy);
  const velPxMs = swipe.dtMs > 0 ? len / swipe.dtMs : 0;
  // Força: ~340px de swipe = força máxima; gesto rápido ganha até +15%.
  const forca = clamp(len / 340, 0, 1) * clamp(0.85 + velPxMs * 0.25, 0.85, 1.1);

  // Lateral: 120px ≈ beirada da trave (3.66m). Dá para mirar fora de
  // propósito (arriscado) — por isso o alcance vai além da trave.
  const lateral = clamp(swipe.dx / 120, -1, 1) * 4.4;

  // Elevação: swipe reto para frente = bola rasteira/alteira moderada;
  // componente vertical para cima levanta a bola. Falta eleva mais.
  const subida = clamp(-swipe.dy / 150, 0, 1);
  const elevBase = tipo === "falta" ? 0.9 : 0.45;
  const elevMax = tipo === "falta" ? 3.6 : 2.6;
  let alvoY = elevBase + subida * (elevMax - elevBase);
  // Swipe descendente (dy>0) cola a bola no chão.
  if (swipe.dy > len * 0.35) alvoY = 0.25;

  // Erro de precisão: força alta desloca o alvo; shooting alto protege.
  const imprecisao = (forca > 0.8 ? (forca - 0.8) * 2.2 : 0) * (1 - clamp(shooting, 0, 100) / 140);
  const alvoZ = -(lateral + Math.sign(lateral || 1) * imprecisao);
  alvoY = clamp(alvoY + imprecisao * 0.5, 0.2, 3.8);

  return { alvoZ, alvoY, forca, curva: 0 };
}

/**
 * Alcance de defesa do goleiro (m, raio em torno do ponto do mergulho).
 * Defesa alta amplia; chute muito forte reduz — mas nunca zera.
 */
export function alcanceGoleiro(defending: number, forca: number): number {
  return clamp(1.55 + (clamp(defending, 0, 100) / 100) * 0.95 - forca * 0.45, 0.7, 2.5);
}

/**
 * Canto escolhido pelo goleiro para o mergulho — DETERMINÍSTICO por
 * (matchId, índice da cobrança): F5 repete a mesma escolha, nunca sorteia
 * de novo. 25% das vezes ele fica no centro.
 */
export function escolherMergulhoGoleiro(seedKey: string): number {
  const r = rngSemente(`gk:${seedKey}`);
  const lado = r();
  const jitter = (r() - 0.5) * 0.8;
  if (lado < 0.25) return jitter * 0.5; // centro
  return (lado < 0.625 ? -2.4 : 2.4) + jitter;
}

/**
 * Desfecho da cobrança do jogador a partir do alvo, do mergulho do goleiro
 * e do alcance — ordem de avaliação: fraco demais → defesa fácil; fora do
 * gol → fora; beirada da trave → trave; no alcance do goleiro → defesa;
 * senão gol.
 */
export function calcularDesfecho(
  alvo: { z: number; y: number },
  forca: number,
  keeperZ: number,
  alcance: number,
  goalHalfWidth: number,
  goalHeight: number
): Desfecho {
  if (forca < 0.2) return "save"; // chute fraco: rola para as mãos do goleiro
  const faixaTrave = 0.3;
  const foraZ = Math.abs(alvo.z) > goalHalfWidth + 0.05;
  const foraY = alvo.y > goalHeight + 0.05;
  if (foraZ || foraY) {
    const naFaixaZ = Math.abs(Math.abs(alvo.z) - goalHalfWidth) <= faixaTrave && alvo.y <= goalHeight + faixaTrave;
    const naFaixaY = Math.abs(alvo.y - goalHeight) <= faixaTrave && Math.abs(alvo.z) <= goalHalfWidth + faixaTrave;
    return naFaixaZ || naFaixaY ? "post" : "out";
  }
  if (Math.abs(alvo.z - keeperZ) < alcance && alvo.y < 2.5) return "save";
  return "goal";
}

/**
 * Resultado das 15 cobranças do adversário — DETERMINÍSTICO por
 * (matchId, índice) com parâmetros de dificuldade: shooting do ataque
 * adversário × defending do nosso goleiro. Toda variação passa pelo PRNG semeado.
 */
export function resolverCobrancaAdversaria(
  matchId: string,
  indice: number,
  ataqueShooting: number,
  goleiroDefending: number
): Desfecho {
  const r = rngSemente(`adv:${matchId}:${indice}`)();
  const diff = (clamp(ataqueShooting, 20, 95) - clamp(goleiroDefending, 20, 95)) / 300;
  const pGoal = clamp(0.62 + diff, 0.35, 0.85);
  const pSave = clamp(0.22 - diff * 0.6, 0.08, 0.38);
  const pPost = 0.06;
  if (r < pGoal) return "goal";
  if (r < pGoal + pSave) return "save";
  if (r < pGoal + pSave + pPost) return "post";
  return "out";
}

/**
 * Placeholder da futura morte súbita. Hoje o empate permanece empate;
 * quando o desempate for implementado, ele entra AQUI sem tocar no fluxo
 * das 15 cobranças.
 */
export function resolverDesempate(): null {
  return null;
}
