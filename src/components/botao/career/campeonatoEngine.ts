/**
 * campeonatoEngine — motor PURO e configurável de Campeonato Online ao Vivo.
 *
 * Não importa nada com alias "@" (executável via jiti). Não toca em SOV,
 * carteira ou partida — só deriva ESTRUTURA (grupos, confrontos, classificação,
 * chaveamento mata-mata, agenda de mesas) a partir da lista de participantes e
 * dos resultados. O estado autoritativo vive em `botao_campeonatos_online`
 * (JSONB `confrontos`); este módulo gera/interpreta esse JSONB.
 *
 * Formatos:
 *  - "liga": round-robin único (pontos corridos). 1º colocado = campeão.
 *  - "grupos": fase de grupos (round-robin dentro de cada grupo) → classifica
 *    os N melhores de cada grupo → mata-mata em mesa principal única.
 *
 * Configurável por tamanho (8/16/32 ou qualquer par), não por condicionais
 * espalhadas: `configGrupos(n)` deriva grupos/classificados/rodadas.
 */

export type FormatoCampeonato = "liga" | "grupos";

export type ConfigCampeonato = {
  formato: FormatoCampeonato;
  /** Duração estimada de uma partida (min) — base para a agenda. */
  duracaoPartidaMin: number;
  /** Janela entre partidas na mesma mesa (min) — tolerância/aquecimento. */
  intervaloMin: number;
  /** Tolerância de ausência (min) antes de aplicar W.O. */
  toleranciaMin: number;
};

export const CONFIG_PADRAO: ConfigCampeonato = {
  formato: "liga",
  duracaoPartidaMin: 6,
  intervaloMin: 4,
  toleranciaMin: 5,
};

export type ParticipanteBase = { user_id: string; nome: string };

export type ConfrontoMotor = {
  rodada: number;
  grupo: string | null;
  fase: "grupos" | "oitavas" | "quartas" | "semifinal" | "final" | null;
  mesa: string | null; // rótulo da mesa ("A","B",... ou "Principal")
  j1_id: string | null;
  j2_id: string | null;
  pl_j1: number | null;
  pl_j2: number | null;
  status: "pendente" | "finalizado";
  bye: boolean;
};

/** Deriva a estrutura de grupos para n participantes (par). */
export function configGrupos(n: number): {
  numGrupos: number;
  porGrupo: number;
  classificadosPorGrupo: number;
  fasesMataMata: Array<"oitavas" | "quartas" | "semifinal" | "final">;
} {
  // Grupos de 4 são o alvo (3 rodadas por grupo). numGrupos = n/4 (potência
  // de 2): 8→2, 16→4, 32→8. Fallback para outras potências se n não for /4.
  let numGrupos = Math.max(2, Math.round(n / 4));
  // Garante potência de 2 e grupos de 2..8.
  const pows = [2, 4, 8, 16];
  numGrupos = pows.reduce((best, g) => {
    const pg = n / g;
    const ok = n % g === 0 && pg >= 2 && pg <= 8;
    if (!ok) return best;
    return Math.abs(pg - 4) < Math.abs(n / best - 4) ? g : best;
  }, 2);
  const porGrupo = Math.max(2, Math.floor(n / numGrupos));
  // Classificados por grupo = metade do grupo (potência de 2, mín 1): 4→2.
  let classificadosPorGrupo = 1;
  while (classificadosPorGrupo * 2 <= porGrupo / 2) classificadosPorGrupo *= 2;
  if (porGrupo >= 4) classificadosPorGrupo = Math.max(2, classificadosPorGrupo);
  const totalClassificados = numGrupos * classificadosPorGrupo;
  const fases: Array<"oitavas" | "quartas" | "semifinal" | "final"> = [];
  if (totalClassificados >= 16) fases.push("oitavas");
  if (totalClassificados >= 8) fases.push("quartas");
  if (totalClassificados >= 4) fases.push("semifinal");
  fases.push("final");
  return { numGrupos, porGrupo, classificadosPorGrupo, fasesMataMata: fases };
}

/** Distribui participantes em grupos (serpente — equilibra força). */
export function distribuirGrupos(ids: string[], numGrupos: number): string[][] {
  const grupos: string[][] = Array.from({ length: numGrupos }, () => []);
  ids.forEach((id, i) => {
    const rodada = Math.floor(i / numGrupos);
    const dir = rodada % 2 === 0 ? 1 : -1;
    let g = i % numGrupos;
    if (dir === -1) g = numGrupos - 1 - g;
    grupos[g]!.push(id);
  });
  return grupos;
}

/** Circle-method round-robin para uma lista de ids (retorna rodadas com pares). */
export function roundRobin(ids: Array<string | null>): Array<Array<[string | null, string | null]>> {
  const arr = ids.slice();
  if (arr.length % 2 === 1) arr.push(null);
  const n = arr.length;
  const fixo = arr[0]!;
  let rot = arr.slice(1);
  const rodadas: Array<Array<[string | null, string | null]>> = [];
  for (let r = 0; r < n - 1; r++) {
    const pares: Array<[string | null, string | null]> = [];
    const half = n / 2;
    for (let i = 0; i < half; i++) {
      const home = i === 0 ? fixo : rot[i - 1]!;
      const away = i === 0 ? rot[half - 1]! : rot[n - i - 2]!;
      pares.push([home ?? null, away ?? null]);
    }
    rodadas.push(pares);
    rot = rot.slice(1).concat(rot[0]!);
  }
  return rodadas;
}

const NOME_GRUPO = (i: number) => String.fromCharCode(65 + i); // A, B, C...

/** Gera a fase de grupos completa (confrontos com mesa/grupo/fase). */
export function gerarFaseGrupos(ids: string[]): ConfrontoMotor[] {
  const { numGrupos } = configGrupos(ids.length);
  const grupos = distribuirGrupos(ids, numGrupos);
  const out: ConfrontoMotor[] = [];
  const numRodadas = Math.max(...grupos.map((g) => g.length)) - 1;
  grupos.forEach((grupo, gi) => {
    const rr = roundRobin(grupo.map((x) => x as string | null));
    rr.forEach((pares, r) => {
      pares.forEach(([h, a]) => {
        out.push({
          rodada: r + 1,
          grupo: NOME_GRUPO(gi),
          fase: "grupos",
          mesa: NOME_GRUPO(gi), // cada grupo ocupa sua própria mesa
          j1_id: h,
          j2_id: a,
          pl_j1: null,
          pl_j2: null,
          status: "pendente",
          bye: h === null || a === null,
        });
      });
    });
  });
  void numRodadas;
  return out;
}

/** Pontos de um participante dentro de um grupo (V=3/E=1/D=0). */
export function pontosNoGrupo(
  uid: string,
  grupo: string,
  confrontos: ConfrontoMotor[],
): { pontos: number; sg: number; gp: number } {
  let pontos = 0;
  let gp = 0;
  let gc = 0;
  for (const c of confrontos) {
    if (c.grupo !== grupo || c.status !== "finalizado") continue;
    if (c.j1_id === uid) {
      gp += c.pl_j1 ?? 0;
      gc += c.pl_j2 ?? 0;
      pontos += (c.pl_j1 ?? 0) > (c.pl_j2 ?? 0) ? 3 : c.pl_j1 === c.pl_j2 ? 1 : 0;
    } else if (c.j2_id === uid) {
      gp += c.pl_j2 ?? 0;
      gc += c.pl_j1 ?? 0;
      pontos += (c.pl_j2 ?? 0) > (c.pl_j1 ?? 0) ? 3 : c.pl_j2 === c.pl_j1 ? 1 : 0;
    }
  }
  return { pontos, sg: gp - gc, gp };
}

/** Classifica um grupo (ordena por pontos, saldo, gols pró). */
export function classificarGrupo(
  grupo: string,
  ids: string[],
  confrontos: ConfrontoMotor[],
): string[] {
  return ids
    .slice()
    .sort((a, b) => {
      const pa = pontosNoGrupo(a, grupo, confrontos);
      const pb = pontosNoGrupo(b, grupo, confrontos);
      return pb.pontos - pa.pontos || pb.sg - pa.sg || pb.gp - pa.gp;
    });
}

/** Seleciona os classificados de cada grupo (ordem: 1ºA,1ºB,...,2ºA,2ºB,...). */
export function selecionarClassificados(
  grupos: string[][],
  confrontos: ConfrontoMotor[],
): Array<{ uid: string; grupo: string; pos: number }> {
  const { classificadosPorGrupo } = configGrupos(grupos.reduce((s, g) => s + g.length, 0));
  const out: Array<{ uid: string; grupo: string; pos: number }> = [];
  for (let pos = 0; pos < classificadosPorGrupo; pos++) {
    grupos.forEach((grupo, gi) => {
      const ord = classificarGrupo(NOME_GRUPO(gi), grupo, confrontos);
      if (ord[pos]) out.push({ uid: ord[pos]!, grupo: NOME_GRUPO(gi), pos: pos + 1 });
    });
  }
  return out;
}

/** Se a fase de grupos está completa (todos os confrontos finalizados). */
export function gruposCompletos(confrontos: ConfrontoMotor[]): boolean {
  const g = confrontos.filter((c) => c.fase === "grupos");
  return g.length > 0 && g.every((c) => c.status === "finalizado" || c.bye);
}

/**
 * Gera a primeira fase do mata-mata a partir dos classificados.
 * Emparelha 1ºA×2ºB, 1ºB×2ºA, ... evitando mesmo grupo quando possível.
 * Mesa principal única (sequencial).
 */
export function gerarMataMata(
  classificados: Array<{ uid: string; grupo: string; pos: number }>,
  rodadaBase: number,
): ConfrontoMotor[] {
  const metade = classificados.length / 2;
  const out: ConfrontoMotor[] = [];
  // Primeira fase derivada do total de classificados (não de configGrupos):
  // 16→oitavas, 8→quartas, 4→semifinal, 2→final.
  const total = classificados.length;
  const primeira: ConfrontoMotor["fase"] =
    total >= 16 ? "oitavas" : total >= 8 ? "quartas" : total >= 4 ? "semifinal" : "final";
  void metade;
  // Separa por posição: pos1 = 1ºs de cada grupo, pos2 = 2ºs, ...
  for (let j = 0; j < metade; j++) {
    const a = classificados[j];
    // Pareia com um de posição diferente e grupo diferente (espelhado).
    const b = classificados[classificados.length - 1 - j];
    out.push({
      rodada: rodadaBase + j, // mesa principal: um jogo por "janela"
      grupo: null,
      fase: primeira,
      mesa: "Principal",
      j1_id: a?.uid ?? null,
      j2_id: b?.uid ?? null,
      pl_j1: null,
      pl_j2: null,
      status: "pendente",
      bye: false,
    });
  }
  return out;
}

/** Vencedor de um confronto mata-mata (null se empate/nao finalizado). */
export function vencedorConfronto(c: ConfrontoMotor): string | null {
  if (c.status !== "finalizado") return null;
  if ((c.pl_j1 ?? 0) > (c.pl_j2 ?? 0)) return c.j1_id;
  if ((c.pl_j2 ?? 0) > (c.pl_j1 ?? 0)) return c.j2_id;
  return null;
}

/**
 * Avança o mata-mata: dado os confrontos da fase atual finalizados, gera a
 * próxima fase (ou null se a fase atual era a final). Mesa principal única.
 */
export function avancarMataMata(
  confrontos: ConfrontoMotor[],
  rodadaBase: number,
): ConfrontoMotor[] | null {
  const ordem: Array<ConfrontoMotor["fase"]> = ["oitavas", "quartas", "semifinal", "final"];
  const atual = ordem.filter((f) => confrontos.some((c) => c.fase === f)).pop();
  if (!atual || atual === "final") return null;
  const atuais = confrontos.filter((c) => c.fase === atual);
  if (!atuais.every((c) => c.status === "finalizado")) return null;
  const vencedores = atuais
    .slice()
    .sort((a, b) => a.rodada - b.rodada)
    .map((c) => vencedorConfronto(c));
  if (vencedores.some((v) => v === null)) return null;
  const proxima = ordem[ordem.indexOf(atual) + 1]!;
  const out: ConfrontoMotor[] = [];
  for (let i = 0; i < vencedores.length; i += 2) {
    out.push({
      rodada: rodadaBase + i / 2,
      grupo: null,
      fase: proxima,
      mesa: "Principal",
      j1_id: vencedores[i]!,
      j2_id: vencedores[i + 1]!,
      pl_j1: null,
      pl_j2: null,
      status: "pendente",
      bye: false,
    });
  }
  return out;
}

/** Estimativa de duração do evento (min) para n participantes. */
export function estimarDuracaoMin(n: number, formato: FormatoCampeonato, cfg: ConfigCampeonato): number {
  const slot = cfg.duracaoPartidaMin + cfg.intervaloMin;
  if (formato === "liga") return (n - 1) * slot; // n-1 rodadas, mesas paralelas
  const { porGrupo, fasesMataMata } = configGrupos(n);
  const rodadasGrupos = porGrupo - 1;
  const jogosMataMata = Math.pow(2, fasesMataMata.length) - 1; // mesa principal sequencial
  return rodadasGrupos * slot + jogosMataMata * slot;
}

/** Agenda (rótulo HH:MM) de cada confronto a partir do início. Mesa paralela
 *  na fase de grupos (uma por grupo), sequencial no mata-mata (Principal). */
export function gerarAgenda(
  confrontos: ConfrontoMotor[],
  inicioISO: string,
  cfg: ConfigCampeonato,
): Array<{ rodada: number; grupo: string | null; fase: ConfrontoMotor["fase"]; mesa: string | null; inicio: string }> {
  const slot = cfg.duracaoPartidaMin + cfg.intervaloMin;
  const t0 = new Date(inicioISO).getTime();
  return confrontos.map((c) => {
    const min = (c.rodada - 1) * slot;
    return {
      rodada: c.rodada,
      grupo: c.grupo,
      fase: c.fase,
      mesa: c.mesa,
      inicio: new Date(t0 + min * 60000).toISOString(),
    };
  });
}
