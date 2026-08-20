/**
 * Bolsa de Valores da Cidadela (§22-§28 do mestre).
 *
 * Ativos representam setores REAIS do universo (Clube, Ciência, Biblioteca,
 * Trilha) — nunca empresas fictícias sem função. Os preços evoluem com os
 * acontecimentos da carreira (resultados das partidas, eventos do mundo e
 * atividades de Cartório/Ritual), e o jogador pode comprar/vender/manter
 * cotas e receber dividendos por rodada.
 *
 * Fonte de verdade: o estado inteiro da bolsa vive no JSONB da carreira
 * (`progresso_caminpanha` no Supabase) — nunca é um valor apenas de tela.
 * Toda mutação financeira real é espelhada no Banco Central SOV (ledger),
 * module 'market'.
 */

import type {
  AtivoId,
  BolsaState,
  CareerState,
  PosicaoBolsa,
  TransacaoBolsa,
} from "./types";

export interface AtivoInfo {
  ativoId: AtivoId;
  nome: string;
  setor: "Clube" | "Ciência" | "Biblioteca" | "Trilha";
  emoji: string;
  precoBase: number;
  /** Rendimento por rodada pago em dividendos (percentual do preço). */
  dividendYield: number;
}

export const ATIVOS: AtivoInfo[] = [
  {
    ativoId: "clube",
    nome: "Clube do Treinador",
    setor: "Clube",
    emoji: "⚽",
    precoBase: 100,
    dividendYield: 0.01,
  },
  {
    ativoId: "ciencia",
    nome: "Instituto de Ciência",
    setor: "Ciência",
    emoji: "🔬",
    precoBase: 60,
    dividendYield: 0.008,
  },
  {
    ativoId: "biblioteca",
    nome: "Biblioteca Viva",
    setor: "Biblioteca",
    emoji: "📚",
    precoBase: 40,
    dividendYield: 0.012,
  },
  {
    ativoId: "trilha",
    nome: "Trilha da Cidadela",
    setor: "Trilha",
    emoji: "⛰️",
    precoBase: 45,
    dividendYield: 0.01,
  },
];

export const PATRIMONIO_BASE_CIDADELA = 10_000_000;
const MIN_PRECO = 5;
const MAX_PRECO = 999;
/** Cap de memória por ativo (últimas N rodadas, para a sparkline). */
const HISTORICO_MAX = 12;
const TRANSACOES_MAX = 80;

function bolsaInicial(): BolsaState {
  const precos = Object.fromEntries(ATIVOS.map((a) => [a.ativoId, a.precoBase])) as Record<
    AtivoId,
    number
  >;
  return {
    precos,
    precosAnteriores: precos,
    historicoPrecos: Object.fromEntries(ATIVOS.map((a) => [a.ativoId, [a.precoBase]])),
    carteira: [],
    transacoes: [],
    ultimaRodadaBolsa: -1,
    patrimonioCidadela: PATRIMONIO_BASE_CIDADELA,
  };
}

/** Normaliza/garante a estrutura da bolsa (registros antigos ou malformados). */
export function garantirBolsa(bolsa: BolsaState | undefined): BolsaState {
  const base = bolsaInicial();
  if (!bolsa || typeof bolsa !== "object") return base;
  const precos = { ...base.precos, ...bolsa.precos } as Record<AtivoId, number>;
  for (const a of ATIVOS) {
    if (!Number.isFinite(precos[a.ativoId]) || precos[a.ativoId] <= 0) {
      precos[a.ativoId] = a.precoBase;
    }
    precos[a.ativoId] = clampPreco(precos[a.ativoId]);
  }
  return {
    precos,
    precosAnteriores: { ...precos, ...bolsa.precosAnteriores } as Record<AtivoId, number>,
    historicoPrecos: bolsa.historicoPrecos ?? base.historicoPrecos,
    carteira: Array.isArray(bolsa.carteira) ? bolsa.carteira : [],
    transacoes: Array.isArray(bolsa.transacoes) ? bolsa.transacoes : [],
    ultimaRodadaBolsa: Number.isFinite(bolsa.ultimaRodadaBolsa) ? bolsa.ultimaRodadaBolsa : -1,
    patrimonioCidadela: Number.isFinite(bolsa.patrimonioCidadela)
      ? bolsa.patrimonioCidadela
      : base.patrimonioCidadela,
  };
}

function clampPreco(p: number): number {
  return Math.max(MIN_PRECO, Math.min(MAX_PRECO, Math.round(p * 100) / 100));
}

/** Informação do ativo por id. */
export function ativoInfo(id: AtivoId): AtivoInfo {
  return ATIVOS.find((a) => a.ativoId === id)!;
}

/* ---------------------------------------------------------------- */
/* Evolução de preços (§24).                                        */
/* ---------------------------------------------------------------- */

export interface ImpactoRodada {
  /** Rodada atual da carreira (torna o drift variável por rodada). */
  rodada?: number | undefined;
  /** Resultado da partida do usuário (se houve). */
  resultado?: "vitoria" | "empate" | "derrota" | undefined;
  /** Goleada do usuário (amplia o efeito no Clube). */
  goleada?: boolean | undefined;
  /** Moral atual do elenco (0-100). */
  moral?: number | undefined;
  /** Eventos narrativos da rodada (ex.: "cartorio", "provocacao", "crise"). */
  eventos?: string[] | undefined;
}

/**
 * Evolui os preços da rodada: o Clube reage a resultados reais; os demais
 * setores caminham com drift suave e reagem a eventos do mundo (crise,
 * cartório, ritual). Atualiza também o patrimônio total da Cidadela.
 */
export function evoluirBolsa(bolsa: BolsaState, imp: ImpactoRodada): BolsaState {
  const precos = { ...bolsa.precos };
  const historico = { ...bolsa.historicoPrecos };
  const anterior = { ...bolsa.precos };

  for (const info of ATIVOS) {
    let delta = ruidoRodada(info.ativoId, imp.rodada ?? 0, imp.eventos ?? []);
    const atual = precos[info.ativoId];

    if (info.ativoId === "clube") {
      // Resultado real da partida (§24).
      if (imp.resultado === "vitoria") delta += imp.goleada ? 7 : 4;
      else if (imp.resultado === "derrota") delta -= imp.goleada ? 7 : 4;
      else if (imp.resultado === "empate") delta -= 1;
      // Moral do elenco modula o Clube.
      if (typeof imp.moral === "number") delta += ((imp.moral - 50) / 100) * 2;
    }
    // Eventos do mundo impactam setores específicos (§24, §26).
    for (const e of imp.eventos ?? []) {
      if (e === "crise") delta -= 4;
      if (e === "cartorio" && info.ativoId === "biblioteca") delta += 5;
      if (e === "ritual" && info.ativoId === "trilha") delta += 4;
      if (e === "provocacao" && info.ativoId === "clube") delta += 1.5;
      if (e === "ciencia" && info.ativoId === "ciencia") delta += 5;
    }

    precos[info.ativoId] = clampPreco(atual * (1 + delta / 100));
    const hist = [...(historico[info.ativoId] ?? []), precos[info.ativoId]].slice(-HISTORICO_MAX);
    historico[info.ativoId] = hist;
  }

  // Patrimônio total da Cidadela = índice econômico derivado dos ativos.
  const soma = Object.values(precos).reduce((a, b) => a + b, 0);
  const patrimonioCidadela = clampPreco(bolsa.patrimonioCidadela * (1 + (soma - 245) / 10_000));

  return {
    ...bolsa,
    precos: { ...precos } as Record<AtivoId, number>,
    precosAnteriores: anterior as Record<AtivoId, number>,
    historicoPrecos: historico,
    patrimonioCidadela,
  };
}

/** Drift suave determinístico por rodada (±1.8%) para setores não-clube. */
function ruidoRodada(id: AtivoId, rodada: number, eventos: string[]): number {
  let h = (rodada * 97 + 13) % 1000;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000;
  for (const e of eventos) h = (h * 17 + e.length) % 1000;
  return (h % 37) / 10 - 1.8;
}

/* ---------------------------------------------------------------- */
/* Compra/venda/dividendos (§25).                                    */
/* ---------------------------------------------------------------- */

function registrar(bolsa: BolsaState, t: Omit<TransacaoBolsa, "id" | "timestamp">): BolsaState {
  const tx: TransacaoBolsa = {
    ...t,
    id: `bolsa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
  return { ...bolsa, transacoes: [tx, ...bolsa.transacoes].slice(0, TRANSACOES_MAX) };
}

/** Custo de compra de N cotas ao preço atual. */
export function custoCompra(bolsa: BolsaState, ativoId: AtivoId, quantidade: number): number {
  return Math.round(bolsa.precos[ativoId] * quantidade * 100) / 100;
}

/** Executa a compra (o débito de SOV é aplicado/cobrado pelo chamador). */
export function comprarAtivo(
  bolsa: BolsaState,
  ativoId: AtivoId,
  quantidade: number,
  rodada: number,
  temporada: number,
): BolsaState {
  if (quantidade <= 0) return bolsa;
  const preco = bolsa.precos[ativoId];
  const valor = custoCompra(bolsa, ativoId, quantidade);
  const existente = bolsa.carteira.find((p) => p.ativoId === ativoId);

  const carteira: PosicaoBolsa[] = existente
    ? bolsa.carteira.map((p) =>
        p.ativoId === ativoId
          ? {
              ativoId,
              quantidade: p.quantidade + quantidade,
              custoMedio:
                (p.custoMedio * p.quantidade + preco * quantidade) / (p.quantidade + quantidade),
            }
          : p,
      )
    : [...bolsa.carteira, { ativoId, quantidade, custoMedio: preco }];

  let atual = { ...bolsa, carteira };
  return registrar(atual, { tipo: "compra", ativoId, quantidade, valor, rodada, temporada });
}

/** Executa a venda (o crédito de SOV é aplicado/cobrado pelo chamador). */
export function venderAtivo(
  bolsa: BolsaState,
  ativoId: AtivoId,
  quantidade: number,
  rodada: number,
  temporada: number,
): BolsaState {
  if (quantidade <= 0) return bolsa;
  const pos = bolsa.carteira.find((p) => p.ativoId === ativoId);
  if (!pos || pos.quantidade < quantidade) return bolsa;
  const preco = bolsa.precos[ativoId];
  const valor = Math.round(preco * quantidade * 100) / 100;
  const nova = pos.quantidade - quantidade;

  const carteira =
    nova === 0
      ? bolsa.carteira.filter((p) => p.ativoId !== ativoId)
      : bolsa.carteira.map((p) =>
          p.ativoId === ativoId ? { ...p, quantidade: nova } : p,
        );

  let atual = { ...bolsa, carteira };
  return registrar(atual, { tipo: "venda", ativoId, quantidade, valor, rodada, temporada });
}

/**
 * Distribui dividendos da rodada à carteira (§25). Retorna o total creditado
 * e a bolsa com as transações de dividendos registradas.
 */
export function pagarDividendos(
  bolsa: BolsaState,
  rodada: number,
  temporada: number,
): { bolsa: BolsaState; total: number } {
  // Idempotente por rodada (§25): pagou nesta rodada → não paga de novo.
  // O ciclo de dividendos acontece a cada 3 rodadas.
  if (bolsa.carteira.length === 0 || rodada % DIVIDENDOS_INTERVALO !== 0) {
    return { bolsa, total: 0 };
  }
  if (bolsa.ultimaRodadaBolsa === rodada) return { bolsa, total: 0 };

  let total = 0;
  let atual: BolsaState = { ...bolsa, ultimaRodadaBolsa: rodada };
  for (const pos of bolsa.carteira) {
    const info = ativoInfo(pos.ativoId);
    const valor = Math.round(bolsa.precos[pos.ativoId] * pos.quantidade * info.dividendYield * 100) / 100;
    if (valor > 0) {
      total += valor;
      atual = registrar(atual, {
        tipo: "dividendo",
        ativoId: pos.ativoId,
        quantidade: pos.quantidade,
        valor,
        rodada,
        temporada,
      });
    }
  }
  return { bolsa: atual, total };
}

const DIVIDENDOS_INTERVALO = 3;

/* ---------------------------------------------------------------- */
/* Patrimônio (§22).                                                 */
/* ---------------------------------------------------------------- */

/** Valor atual da carteira do jogador ao preço de mercado. */
export function valorCarteira(bolsa: BolsaState): number {
  return bolsa.carteira.reduce(
    (acc, p) => acc + bolsa.precos[p.ativoId] * p.quantidade,
    0,
  );
}

/** Patrimônio total do jogador: SOV em carteira + valor investido. */
export function patrimonioJogador(career: CareerState): {
  sobCarteira: number;
  investido: number;
  total: number;
} {
  const bolsa = garantirBolsa(career.bolsa);
  const sobCarteira = career.coach.sov;
  const investido = valorCarteira(bolsa);
  return { sobCarteira, investido, total: sobCarteira + investido };
}
