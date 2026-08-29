/**
 * estrategia — Cérebro estratégico da CPU do Futebol de Botão (§9-§17).
 *
 * Arquitetura: o LLM decide O QUÊ (intenção estratégica estruturada), o motor
 * físico decide COMO (impulso válido). O núcleo heurístico é DETERMINÍSTICO e
 * sempre disponível; o LLM (AIService.generatePersona) só REFINA a intenção,
 * com validação estrita — qualquer saída inválida cai no heurístico. O LLM
 * nunca toca em placar, posições ou regras.
 *
 * - Memória de partida: observa os tiros do jogador (lado, força, zona) e
 *   detecta padrões; a estratégia MUDA quando um padrão é confirmado (§11-12).
 * - Perfil do clube: força efetiva → precisão/agressividade/disciplina/leitura
 *   (§13). Clubes fortes decidem melhor; fracos erram mais — sem trapaça.
 * - Balanceamento dinâmico (§14-15): jogador dominante → CPU mais disciplinada
 *   e precisa (dentro de tetos); jogador em má fase → CPU arrisca mais.
 *
 * Módulo PURO (só importa ./physics, que também é puro) — testável com jiti.
 */

import { FIELD, type Disc, type Side } from "./physics";
import type { Difficulty } from "../types";

/* ------------------------------------------------------------------------ */
/* Tipos públicos                                                            */
/* ------------------------------------------------------------------------ */

export type EstrategiaId =
  | "atacar"
  | "contra_atacar"
  | "reter"
  | "defender"
  | "bloquear";

/** Intenção estratégica estruturada (§16) — única saída do "cérebro". */
export interface IntencaoEstrategica {
  strategy: EstrategiaId;
  /** 0..1 — apetite ao risco (força/ângulo da jogada). */
  risk: number;
  /** Zona-alvo conceitual da jogada. */
  targetZone: "gol_adversario" | "fundo_proprio" | "lado_esquerdo" | "lado_direito" | "centro";
  /** Prioridade tática do momento. */
  priority: "marcar_gol" | "proteger_vantagem" | "buscar_empate" | "controlar_risco" | "explorar_padrao";
  /** Explicação curta (auditoria/depuração; pode alimentar comentarista). */
  reason: string;
}

/** Perfil estratégico do clube (§13) — derivado da força efetiva (0..1). */
export interface PerfilClube {
  precisao: number;
  agressividade: number;
  disciplina: number;
  leitura: number;
}

/** Forma recente do JOGADOR — base do balanceamento dinâmico (§14-15). */
export interface FormaJogador {
  sequenciaVitorias: number;
  sequenciaDerrotas: number;
  invicto: boolean;
}

/** Estado relevante da partida entregue ao cérebro (§17). */
export interface EstadoPartida {
  golsCpu: number;
  golsJogador: number;
  turnosRestantes: number;
  dificuldade: Difficulty;
  forcaCpu: number;
  forcaJogador: number;
}

/* ------------------------------------------------------------------------ */
/* Memória de partida (§11-§12)                                              */
/* ------------------------------------------------------------------------ */

export interface TiroObservado {
  /** Direção horizontal normalizada do tiro (−1 esq .. +1 dir, na visão da CPU). */
  dirX: number;
  power: number;
  /** Zona vertical de origem do tiro (0 topo .. 1 base). */
  zonaY: number;
}

export interface MemoriaPartida {
  tirosJogador: TiroObservado[];
}

export function novaMemoriaPartida(): MemoriaPartida {
  return { tirosJogador: [] };
}

export function registrarTiroJogador(mem: MemoriaPartida, tiro: TiroObservado): MemoriaPartida {
  // Janela deslizante: os 16 tiros mais recentes bastam para ler o momento.
  return { tirosJogador: [...mem.tirosJogador, tiro].slice(-16) };
}

export interface PadroesJogador {
  ladoPreferido: "esquerdo" | "direito" | "variado";
  forcaMedia: number;
  zonaPreferida: "alto" | "baixo" | "variado";
  /** true quando há evidência suficiente de um padrão explorável. */
  previsivel: boolean;
  amostras: number;
}

/** Analisa os tiros observados e extrai padrões exploráveis (§11). */
export function analisarPadroes(mem: MemoriaPartida): PadroesJogador {
  const tiros = mem.tirosJogador;
  const n = tiros.length;
  if (n === 0) {
    return { ladoPreferido: "variado", forcaMedia: 0.6, zonaPreferida: "variado", previsivel: false, amostras: 0 };
  }
  const dir = tiros.filter((t) => t.dirX > 0.25).length;
  const esq = tiros.filter((t) => t.dirX < -0.25).length;
  const forcaMedia = tiros.reduce((acc, t) => acc + t.power, 0) / n;
  const alto = tiros.filter((t) => t.zonaY < 0.4).length;
  const baixo = tiros.filter((t) => t.zonaY > 0.6).length;

  const ladoPreferido: PadroesJogador["ladoPreferido"] =
    dir / n >= 0.6 ? "direito" : esq / n >= 0.6 ? "esquerdo" : "variado";
  const zonaPreferida: PadroesJogador["zonaPreferida"] =
    alto / n >= 0.6 ? "alto" : baixo / n >= 0.6 ? "baixo" : "variado";
  // Padrão confirmado exige amostra mínima — evita reação a ruído.
  const previsivel = n >= 6 && (ladoPreferido !== "variado" || zonaPreferida !== "variado");
  return { ladoPreferido, forcaMedia, zonaPreferida, previsivel, amostras: n };
}

/* ------------------------------------------------------------------------ */
/* Perfil do clube + balanceamento dinâmico                                  */
/* ------------------------------------------------------------------------ */

/** Força efetiva (28..99) → perfil estratégico 0..1 (§13). */
export function perfilDoClube(forcaEfetiva: number): PerfilClube {
  const n = Math.max(0, Math.min(1, (forcaEfetiva - 28) / 71));
  return {
    precisao: 0.35 + n * 0.6,
    agressividade: 0.3 + n * 0.55,
    disciplina: 0.3 + n * 0.6,
    leitura: 0.25 + n * 0.65,
  };
}

/**
 * Balanceamento dinâmico (§14-15): ajusta o perfil da CPU pela forma do
 * jogador, dentro de tetos rígidos. Jogador dominante → CPU mais disciplinada
 * e precisa; jogador em má fase → CPU arrisca mais (comete mais erros).
 * NUNCA altera força física — a dificuldade vem da inteligência.
 */
export function balancearPerfil(perfil: PerfilClube, forma: FormaJogador): PerfilClube {
  let { precisao, agressividade, disciplina, leitura } = perfil;
  if (forma.invicto || forma.sequenciaVitorias >= 3) {
    // Adversários passam a respeitar: menos risco, mais disciplina/leitura.
    precisao = Math.min(0.97, precisao + 0.08);
    disciplina = Math.min(0.97, disciplina + 0.12);
    leitura = Math.min(0.97, leitura + 0.1);
    agressividade = Math.max(0.2, agressividade - 0.06);
  } else if (forma.sequenciaDerrotas >= 3) {
    // Alívio razoável contra espiral impossível: CPU fica mais afobada.
    agressividade = Math.min(0.95, agressividade + 0.1);
    disciplina = Math.max(0.2, disciplina - 0.1);
    precisao = Math.max(0.25, precisao - 0.06);
  }
  return { precisao, agressividade, disciplina, leitura };
}

/* ------------------------------------------------------------------------ */
/* Núcleo heurístico determinístico (sempre disponível)                      */
/* ------------------------------------------------------------------------ */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Decide a intenção estratégica a partir do estado real + padrões observados.
 * Determinística: mesma entrada → mesma intenção (testável, auditável).
 */
export function decidirIntencao(
  estado: EstadoPartida,
  memoria: MemoriaPartida,
  perfil: PerfilClube,
): IntencaoEstrategica {
  const saldo = estado.golsCpu - estado.golsJogador;
  const fimDeJogo = estado.turnosRestantes <= 6;
  const retaFinal = estado.turnosRestantes <= 10;
  const padroes = analisarPadroes(memoria);
  // A leitura do clube define se ele CONSEGUE perceber o padrão (§13).
  const padraoExploravel = padroes.previsivel && Math.random() < perfil.leitura;

  // 1) Vencendo no fim: proteger a vantagem — reter bola / cortar risco (§10).
  if (saldo > 0 && fimDeJogo) {
    return {
      strategy: "reter",
      risk: clamp01(0.2 + (1 - perfil.disciplina) * 0.2),
      targetZone: "fundo_proprio",
      priority: "proteger_vantagem",
      reason: `Vencendo por ${saldo} com ${estado.turnosRestantes} jogadas: posse segura e risco mínimo.`,
    };
  }

  // 2) Perdendo na reta final: aumentar o risco e buscar o gol (§10).
  if (saldo < 0 && retaFinal) {
    return {
      strategy: "atacar",
      risk: clamp01(0.75 + perfil.agressividade * 0.25),
      targetZone: "gol_adversario",
      priority: saldo <= -2 ? "marcar_gol" : "buscar_empate",
      reason: `Perdendo por ${-saldo} na reta final: ataque com risco alto.`,
    };
  }

  // 3) Padrão do jogador confirmado: antecipar e fechar o lado explorado (§11).
  if (padraoExploravel) {
    return {
      strategy: "bloquear",
      risk: clamp01(0.3 + (1 - perfil.disciplina) * 0.2),
      targetZone: padroes.ladoPreferido === "direito" ? "lado_direito" : padroes.ladoPreferido === "esquerdo" ? "lado_esquerdo" : "centro",
      priority: "explorar_padrao",
      reason: `Jogador ataca pelo lado ${padroes.ladoPreferido}: fechar essa zona.`,
    };
  }

  // 4) Empate no fim: peso da disciplina decide entre controlar e buscar.
  if (saldo === 0 && fimDeJogo && perfil.disciplina > 0.62) {
    return {
      strategy: "defender",
      risk: clamp01(0.3),
      targetZone: "centro",
      priority: "controlar_risco",
      reason: "Empate no fim: clube disciplinado controla o risco.",
    };
  }

  // 5) Default: atacar — risco calibrado por agressividade e momento.
  const pressao = saldo < 0 ? 0.15 : 0;
  return {
    strategy: saldo > 0 ? "contra_atacar" : "atacar",
    risk: clamp01(0.45 + perfil.agressividade * 0.35 + pressao),
    targetZone: "gol_adversario",
    priority: "marcar_gol",
    reason: saldo > 0 ? "Na frente: contra-ataque com paciência." : "Jogo aberto: buscar o gol.",
  };
}

/* ------------------------------------------------------------------------ */
/* Refino via LLM (opcional, validado — §16)                                 */
/* ------------------------------------------------------------------------ */

const ESTRATEGIAS: EstrategiaId[] = ["atacar", "contra_atacar", "reter", "defender", "bloquear"];
const ZONAS: IntencaoEstrategica["targetZone"][] = [
  "gol_adversario",
  "fundo_proprio",
  "lado_esquerdo",
  "lado_direito",
  "centro",
];
const PRIORIDADES: IntencaoEstrategica["priority"][] = [
  "marcar_gol",
  "proteger_vantagem",
  "buscar_empate",
  "controlar_risco",
  "explorar_padrao",
];

/**
 * Valida uma saída bruta do LLM contra o schema da intenção. Retorna null se
 * qualquer campo for inválido — o chamador mantém a intenção heurística.
 */
export function validarIntencaoLlm(bruta: unknown): IntencaoEstrategica | null {
  if (typeof bruta !== "object" || bruta === null) return null;
  const o = bruta as Record<string, unknown>;
  if (!ESTRATEGIAS.includes(o["strategy"] as EstrategiaId)) return null;
  if (!ZONAS.includes(o["target_zone"] as IntencaoEstrategica["targetZone"])) return null;
  if (!PRIORIDADES.includes(o["priority"] as IntencaoEstrategica["priority"])) return null;
  const risk = Number(o["risk"]);
  if (!Number.isFinite(risk)) return null;
  return {
    strategy: o["strategy"] as EstrategiaId,
    risk: clamp01(risk),
    targetZone: o["target_zone"] as IntencaoEstrategica["targetZone"],
    priority: o["priority"] as IntencaoEstrategica["priority"],
    reason: typeof o["reason"] === "string" ? o["reason"].slice(0, 160) : "llm",
  };
}

/** Extrai o primeiro objeto JSON de um texto livre do LLM. */
export function extrairJson(texto: string): unknown | null {
  const ini = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (ini < 0 || fim <= ini) return null;
  try {
    return JSON.parse(texto.slice(ini, fim + 1));
  } catch {
    return null;
  }
}

/** Prompt de estratégia: o LLM recebe o estado REAL e responde só a intenção. */
export function promptEstrategia(
  estado: EstadoPartida,
  padroes: PadroesJogador,
  sugestao: IntencaoEstrategica,
): string {
  return [
    "Você é o treinador da CPU num futebol de botão. Decida a estratégia da PRÓXIMA jogada.",
    `Placar: CPU ${estado.golsCpu} x ${estado.golsJogador} Jogador. Jogadas restantes: ${estado.turnosRestantes}.`,
    `Força: CPU ${estado.forcaCpu} vs Jogador ${estado.forcaJogador}. Dificuldade: ${estado.dificuldade}.`,
    `Padrão observado do jogador: lado=${padroes.ladoPreferido}, zona=${padroes.zonaPreferida}, força média=${padroes.forcaMedia.toFixed(2)} (${padroes.amostras} tiros).`,
    `Sugestão tática do departamento: ${sugestao.strategy} (${sugestao.reason})`,
    "Responda APENAS um JSON neste formato exato:",
    '{"strategy":"atacar|contra_atacar|reter|defender|bloquear","risk":0.0-1.0,"target_zone":"gol_adversario|fundo_proprio|lado_esquerdo|lado_direito|centro","priority":"marcar_gol|proteger_vantagem|buscar_empate|controlar_risco|explorar_padrao","reason":"motivo curto"}',
  ].join("\n");
}

/* ------------------------------------------------------------------------ */
/* Execução: intenção → impulso físico válido (o motor decide COMO)          */
/* ------------------------------------------------------------------------ */

export interface JogadaPlanejada {
  discId: string;
  ix: number;
  iy: number;
}

const NOISE: Record<Difficulty, number> = { amador: 0.22, profissional: 0.12, lenda: 0.018 };
const FORCE: Record<Difficulty, number> = { amador: 0.86, profissional: 0.96, lenda: 1.12 };

function golAdversario(side: Side): { x: number; y: number } {
  return {
    x: side === "home" ? FIELD.w - FIELD.margin : FIELD.margin,
    y: FIELD.h / 2,
  };
}

function golProprio(side: Side): { x: number; y: number } {
  return {
    x: side === "home" ? FIELD.margin : FIELD.w - FIELD.margin,
    y: FIELD.h / 2,
  };
}

/** Impulso calibrado para empurrar `de` em direção a `para` (mesma física do ai.ts). */
function impulsoPara(
  de: Disc,
  para: { x: number; y: number },
  difficulty: Difficulty,
  teamPower: number,
  risco: number,
): { ix: number; iy: number } {
  let dx = para.x - de.x;
  let dy = para.y - de.y;
  const dist = Math.hypot(dx, dy) || 1;
  const skill = NOISE[difficulty] * (1 - (teamPower - 58) / 120) * (1.25 - risco * 0.5);
  const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * skill;
  const powerBase = Math.min(1, dist / 240 + 0.6) * FORCE[difficulty];
  const power = Math.max(0.4, Math.min(1.05, powerBase + (Math.random() - 0.5) * 0.14));
  dx = Math.cos(angle);
  dy = Math.sin(angle);
  return { ix: dx * 26 * power, iy: dy * 26 * power };
}

/** Mira o contato atrás da bola na direção do alvo (como o ai.ts original). */
function chuteNaBola(
  shooter: Disc,
  ball: Disc,
  alvo: { x: number; y: number },
  difficulty: Difficulty,
  teamPower: number,
  risco: number,
): JogadaPlanejada {
  const gx = alvo.x - ball.x;
  const gy = alvo.y - ball.y;
  const gl = Math.hypot(gx, gy) || 1;
  const toque = difficulty === "lenda" ? 0.38 : difficulty === "profissional" ? 0.55 : 0.6;
  const aimX = ball.x - (gx / gl) * (shooter.r + ball.r) * toque;
  const aimY = ball.y - (gy / gl) * (shooter.r + ball.r) * toque;
  const imp = impulsoPara(shooter, { x: aimX, y: aimY }, difficulty, teamPower, risco);
  return { discId: shooter.id, ...imp };
}

/**
 * Converte a intenção estratégica em UMA jogada fisicamente válida. O motor
 * físico continua responsável por colisões, gol e regras — aqui só escolhemos
 * o botão e o impulso, sempre dentro das mesmas magnitudes do ai.ts original.
 */
export function executarIntencao(
  discs: Disc[],
  side: Side,
  intencao: IntencaoEstrategica,
  difficulty: Difficulty,
  teamPower: number,
): JogadaPlanejada | null {
  const ball = discs.find((d) => d.side === "ball");
  const mine = discs.filter((d) => d.side === side && !d.keeper);
  if (!ball || mine.length === 0) return null;

  const porProximidade = [...mine].sort(
    (a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y),
  );
  const shooter = porProximidade[0]!;
  const golAdv = golAdversario(side);
  const golProprioGoal = golProprio(side);
  const risco = intencao.risk;

  switch (intencao.strategy) {
    case "atacar": {
      // Chute ao gol com variação vertical pelo risco (mais risco = mais canto).
      const spread = FIELD.goalHeight * (0.2 + risco * 0.45);
      const alvo = { x: golAdv.x, y: golAdv.y + (Math.random() - 0.5) * spread };
      return chuteNaBola(shooter, ball, alvo, difficulty, teamPower, risco);
    }
    case "contra_atacar": {
      // Direciona a bola ao espaço mais vazio do ataque (canto oposto à bola).
      const yAlvo = ball.y < FIELD.h / 2 ? FIELD.h * 0.72 : FIELD.h * 0.28;
      return chuteNaBola(shooter, ball, { x: golAdv.x, y: yAlvo }, difficulty, teamPower, risco * 0.8);
    }
    case "reter": {
      // Posse segura: bola para o fundo próprio, longe do gol e do adversário.
      const yFundo = ball.y < FIELD.h / 2 ? FIELD.h - FIELD.margin - 40 : FIELD.margin + 40;
      const xFundo = golProprioGoal.x + (side === "home" ? FIELD.w * 0.18 : -FIELD.w * 0.18);
      return chuteNaBola(shooter, ball, { x: xFundo, y: yFundo }, difficulty, teamPower, risco * 0.5);
    }
    case "defender": {
      // Corta a bola para a lateral do campo (alivia sem entregar no meio).
      const yLateral = ball.y < FIELD.h / 2 ? FIELD.margin + 20 : FIELD.h - FIELD.margin - 20;
      return chuteNaBola(shooter, ball, { x: ball.x, y: yLateral }, difficulty, teamPower, risco * 0.6);
    }
    case "bloquear": {
      // Move um botão para a linha bola→gol próprio, no lado explorado pelo
      // jogador. Não mexe na bola: é posicionamento puro (dificulta a jogada).
      const fatorLado =
        intencao.targetZone === "lado_direito" ? 0.68 : intencao.targetZone === "lado_esquerdo" ? 0.32 : 0.5;
      const pontoMira = {
        x: ball.x + (golProprioGoal.x - ball.x) * 0.35,
        y: ball.y + (golProprioGoal.y - ball.y) * 0.35 + (fatorLado - 0.5) * FIELD.goalHeight,
      };
      // Botão mais próximo do ponto de bloqueio (não necessariamente o da bola).
      const bloqueador = [...mine].sort(
        (a, b) =>
          Math.hypot(a.x - pontoMira.x, a.y - pontoMira.y) -
          Math.hypot(b.x - pontoMira.x, b.y - pontoMira.y),
      )[0]!;
      const imp = impulsoPara(bloqueador, pontoMira, difficulty, teamPower, risco * 0.5);
      return { discId: bloqueador.id, ...imp };
    }
  }
}
