/**
 * Motor de Templates Procedurais — fallback da IA on-device.
 *
 * Quando o aparelho é fraco (sem WebGPU/WebLLM), o AIService cai aqui. O motor
 * monta textos com a "voz" de comentarista sarcástica combinando:
 *  - templates do banco `botao_frases_ia` (Supabase, Futebol SQL) quando
 *    disponíveis (busca assíncrona, cacheada);
 *  - fallback local embutido (garante que o jogo tenha voz mesmo offline);
 *  - variáveis reais do jogo (nome do time do jogador, adversário, placar,
 *    treinador, etc.) passadas via `AIContext`.
 *
 * Custo ZERO de API e nunca trava: qualquer erro cai no fallback local.
 */

import { supabase } from "@/integrations/supabase/client";
import { teamByIdSync } from "../data/teams";
import type { AIContext, PromptType } from "./types";

interface FraseRow {
  prompt_type: string;
  categoria: string;
  template_text: string;
}

// Fallback local: espelha o seed do SQL p/ funcionar mesmo sem Supabase.
const FALLBACK: Record<PromptType, Record<string, string[]>> = {
  comentarista: {
    vitoria: [
      "E OLHE O FOGUETE! {T} sai de campo encantando a galera, {coach} fazendo pose de gênio no banco!",
      "HÉEEE... {coach} acerta a tática e o {T} passeia! Será genética ou foi sorte? Você decide!",
      "{T} vence na {divisao}, sobe para {posicao}º e a temporada {temporada} fica iluminada!",
    ],
    derrota: [
      "GENTEEE, que vexame! {T} leva de {gA} e {coach} faz cara de quem caiu da chaleira. Coitado!",
      "O {T} fez o quê? Perdeu de {gA}? {coach} já deve estar arrumando as malas, né não?",
      "{T} tropeça na {divisao}, fica {posicao}º e a moral vira {moral}/100 na temporada {temporada}.",
    ],
    goleada: [
      "DESTRUIÇÃO TOTAL! {W} goleia e o {L} some do mapa da {divisao}. Que noite esquecível pra {coachL}!",
    ],
    empate: [
      "EMPATOU! {coach} sai de campo com aquela cara de quem não entendeu se é bom ou ruim. Patético!",
    ],
    suborno: [
      "Olha o detalhe: dizem que rolou envelope no vestiário do {T}. Coincidência? Eu duvido!",
    ],
    crise: [
      "Crise financeira no {T}? Se {coach} não vencer logo, a diretoria vai vender até o botão goleador!",
    ],
    geral: ["Bola rolando no Futebol de Botão! {coach} no comando do {T}!"],
  },
  coletiva: {
    vitoria: [
      "— {coach}, essa goleada de {gH} a {gA} foi planejada ou o adversário entregou de bandeja?",
    ],
    derrota: [
      "— {coach}, o {T} foi humilhado hoje. O senhor continua afirmando que o time tá pronto pra grande coisa?",
    ],
    empate: [
      "— {coach}, empate em casa contra o lanterna. Como o senhor explica isso pro torcedor que paga seu salário?",
    ],
    geral: ["— {coach}, qual a expectativa pro próximo jogo do {T}?"],
  },
  medico: {
    lesao: [
      "— Treinador, aqui é o Dr. Maurício. Seu craque reclamou de cãibra. Pode ser lesão, pode ser preguiça. Pode escalar?",
    ],
    preparo: [
      "— O departamento médico alerta: o elenco tá em risco de lesão muscular. Dizem que treino é coisa de amador, né {coach}?",
    ],
    geral: ["— Dr. Maurício: elente sob observação, {coach}. Nada grave por enquanto."],
  },
  redes_sociais: {
    vitoria: ["@TorcedorFiel: {coach} é o REI! {T} é CAMPEÃO! Quem duvidou peça desculpa!"],
    derrota: ["@DesesperadoFC: {coach} FORA! Que vergonha alheia perder pro {L} em casa!"],
    goleada: ["@BotaoEC: {W} {gH} x {gA} {L}! QUEMassacre! Futebol de botão não pra frangote!"],
    polemica: ["@BastidorFC: ouviram? Envelope rolando no {T}. Tá tudo comprado, eu hein!"],
    geral: ["@TorcedorAnon: bora {T}! {coach} manda ver!"],
  },
  noticia: {
    escandalo: ["Vazou! Bastidores do {T} em ebulição após reunião secreta da diretoria com empresário"],
    suborno: ["Imprensa apura: esquema de propina ronda o {T} e {coach} é citado nos bastidores"],
    crise: ["Crise no {T}: salário atrasado e torcida cobra cabeça de {coach}"],
    geral: ["Futebol de Botão: {coach} no comando do {T} nesta rodada"],
  },
  pracinha: {
    boas_vindas: [
      "Saudações, {coach}. Eu sou o Pracinha. Complete as 5 missões do dia, procure oponentes online e siga o rastro dos Pergaminhos.",
    ],
    missoes: [
      "Ordem do dia: cinco missões, recompensa limitada e economia protegida. Quem joga em grupo avança mais rápido.",
    ],
    geral: [
      "Pracinha na escuta: explore a Cidadela, convide rivais e procure a verdade nos Pergaminhos.",
    ],
  },
};

let cacheRows: FraseRow[] | null = null;
let fetchPromise: Promise<FraseRow[]> | null = null;

/** Busca o banco de frases do Supabase (cacheado, só na 1ª chamada). */
async function fetchFrases(): Promise<FraseRow[]> {
  if (cacheRows) return cacheRows;
  if (fetchPromise) return fetchPromise;
  fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from("botao_frases_ia")
        .select("prompt_type,categoria,template_text")
        .eq("ativo", true);
      if (error || !data) return [];
      cacheRows = data as FraseRow[];
      return cacheRows;
    } catch {
      cacheRows = [];
      return [];
    } finally {
      fetchPromise = null;
    }
  })();
  return fetchPromise;
}

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)] ?? (arr[0] as T);

/** Preenche os placeholders {T}/{coach}/{W}/{L}/{gH}/{gA}/... do template. */
function fillTemplate(tpl: string, ctx: AIContext): string {
  const vars: Record<string, string | number> = {
    coach: ctx.coach ?? "Treinador",
    T: ctx.timeNome ?? "Meu Time",
    W: ctx.vencedor ?? ctx.timeNome ?? "",
    L: ctx.perdedor ?? "",
    coachW: ctx.coachVencedor ?? ctx.coach ?? "Treinador",
    coachL: ctx.coachPerdedor ?? "",
    gH: ctx.golsPro ?? 0,
    gA: ctx.golsContra ?? 0,
    diff: ctx.diff ?? 0,
    rodada: ctx.rodada ?? 0,
    competicao: ctx.competicaoNome ?? ctx.competicao ?? "liga",
    adversario: ctx.adversarioNome ?? "",
    divisao: ctx.divisao ? ({ "serie-a": "Série A", "serie-b": "Série B", "serie-c": "Série C" })[ctx.divisao] : "",
    temporada: ctx.temporada ?? "",
    posicao: ctx.posicaoTabela ?? "",
    moral: ctx.moralTime ?? "",
    soberania: ctx.soberania ?? "",
    restantes: ctx.rodadasRestantes ?? "",
    pendencia: ctx.decisaoPendente ?? "",
  };
  return tpl.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ""));
}

/** Decide a categoria de resultado com base no placar do contexto. */
function categoriaDeResultado(ctx: AIContext): string {
  const gp = ctx.golsPro ?? 0;
  const ga = ctx.golsContra ?? 0;
  if (gp > ga) return Math.abs(gp - ga) >= 3 ? "goleada" : "vitoria";
  if (gp < ga) return Math.abs(gp - ga) >= 3 ? "goleada" : "derrota";
  return "empate";
}

/**
 * Gera um texto procedural a partir de templates (Supabase > fallback local).
 * Nunca rejeita: sempre devolve uma string válida.
 */
export async function gerarTemplate(promptType: PromptType, ctx: AIContext): Promise<string> {
  const categoria = promptType === "comentarista" ? categoriaDeResultado(ctx) : ctx.categoria ?? "geral";

  // 1. Tenta o banco (Supabase).
  try {
    const rows = await fetchFrases();
    const candidatos = rows.filter(
      (r) => r.prompt_type === promptType && (r.categoria === categoria || r.categoria === "geral"),
    );
    if (candidatos.length > 0) {
      return fillTemplate(pick(candidatos).template_text, ctx);
    }
  } catch {
    // ignora — cai no fallback local
  }

  // 2. Fallback local embutido.
  const bucket = FALLBACK[promptType];
  const arr = bucket[categoria] ?? bucket["geral"] ?? [""];
  return fillTemplate(pick(arr), ctx);
}

/** Resolução de nome de time pelo id (para variáveis W/L dinâmicas). */
export function nomeDoTime(teamId: string): string {
  if (!teamId || teamId === "TBD") return "A definir";
  return teamByIdSync(teamId)?.short ?? teamId;
}
