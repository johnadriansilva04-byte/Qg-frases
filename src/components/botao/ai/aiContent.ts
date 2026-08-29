/**
 * aiContent — reaproveitamento do AIService para os "outros usos" da IA:
 *  1. Entrevista Coletiva Pós-Jogo (perguntas ácidas da imprensa pelo placar);
 *  2. Relatório do Departamento Médico (irônico, sobre lesões/preparo);
 *  3. Redes Sociais do Clube (tweets/comentários de torcedores por rodada).
 *
 * Todos são construídos em cima do `AIService.generateText(context, promptType)`
 * — a "voz" central do jogo — e usam variáveis reais vindas da base Futebol SQL.
 */

import { AIService } from "./AIService";
import type { AIContext } from "./types";

export type ResultadoPartida = AIContext & {
  golsPro: number;
  golsContra: number;
  timeNome: string;
  coach: string;
};

function ctxDe(r: ResultadoPartida): AIContext {
  const venceu = r.golsPro > r.golsContra;
  return {
    ...r,
    vencedor: venceu ? r.timeNome : r.adversarioNome,
    perdedor: venceu ? r.adversarioNome : r.timeNome,
    diff: Math.abs(r.golsPro - r.golsContra),
  };
}

/** 1. Entrevista Coletiva Pós-Jogo: 1-2 perguntas ácidas da imprensa. */
export async function coletivaPosJogo(r: ResultadoPartida): Promise<string[]> {
  const ctx = ctxDe(r);
  const q1 = await AIService.generateText(ctx, "coletiva");
  const segunda = Math.random() < 0.6;
  const q2 = segunda ? await AIService.generateText(ctx, "coletiva") : null;
  return [q1, ...(q2 ? [q2] : [])];
}

/** 2. Relatório do Departamento Médico — irônico, sobre lesões/preparo. */
export async function relatorioMedico(r: ResultadoPartida): Promise<string> {
  const ctx: AIContext = {
    ...ctxDe(r),
    categoria: Math.random() < 0.5 ? "lesao" : "preparo",
  };
  return AIService.generateText(ctx, "medico");
}

/** 3. Redes Sociais do Clube — tweets de torcedores por rodada (2-3). */
export async function redesSociaisRodada(r: ResultadoPartida): Promise<string[]> {
  const ctx = ctxDe(r);
  const t1 = await AIService.generateText(ctx, "redes_sociais");
  const t2 = await AIService.generateText({ ...ctx, categoria: "geral" }, "redes_sociais");
  const terceiro = Math.random() < 0.5;
  const t3 = terceiro
    ? await AIService.generateText({ ...ctx, categoria: "polemica" }, "redes_sociais")
    : null;
  return [t1, t2, ...(t3 ? [t3] : [])];
}

/**
 * Bundle completo: ao final de uma partida, gera manchete + coletiva + médico +
 * redes sociais, tudo reaproveitando o AIService. Usado no fluxo pós-jogo.
 */
export async function bundlePosJogo(r: ResultadoPartida) {
  const ctx = ctxDe(r);
  const [manchete, coletiva, medico, redes] = await Promise.all([
    AIService.generateText(ctx, "noticia"),
    coletivaPosJogo(r),
    relatorioMedico(r),
    redesSociaisRodada(r),
  ]);
  return { manchete, coletiva, medico, redes };
}
