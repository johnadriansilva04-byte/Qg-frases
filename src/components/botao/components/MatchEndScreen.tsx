import { Trophy, TrendingUp, TrendingDown, Minus, Flag, Sparkles } from "lucide-react";
import { AdsterraBanner } from "@/components/AdsterraBanner";
import { ControlledMonetagButton } from "@/components/ControlledMonetagButton";

export interface MatchEndData {
  resultado: "vitoria" | "empate" | "derrota";
  placarUser: number;
  placarAdv: number;
  timeUserNome: string;
  timeAdvNome: string;
  competicao: string;
  rodada: string;
  /** Variação de soberania na partida (0 quando não se aplica). */
  soberaniaDelta: number;
  /** Variação de moral na partida (0 quando não se aplica). */
  moralDelta: number;
  /** Posição do usuário na tabela da liga (quando modo carreira). */
  posicaoTabela?: number | undefined;
  /** Mensagem extra (ex.: "CAMPEÃO!", "PROMOÇÃO!"). */
  extra?: string | undefined;
}

type Props = {
  dados: MatchEndData;
  onContinuar: () => void;
  /** Chamado quando o usuário libera o anúncio de patrocínio (abre a entrevista). */
  onPatrocinio?: (() => void) | undefined;
};

const RESULTADO_MAP = {
  vitoria: { rotulo: "VITÓRIA", cor: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/40" },
  empate: { rotulo: "EMPATE", cor: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/40" },
  derrota: { rotulo: "DERROTA", cor: "text-red-400", bg: "bg-red-500/10 border-red-500/40" },
} as const;

function DeltaBadge({ valor }: { valor: number }) {
  if (valor === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-slate-400">
        <Minus className="size-3" /> 0
      </span>
    );
  }
  return valor > 0 ? (
    <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
      <TrendingUp className="size-3" /> +{valor}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-bold text-red-400">
      <TrendingDown className="size-3" /> {valor}
    </span>
  );
}

/**
 * Tela de fim de jogo: estatísticas da partida em painel esportivo, com
 * monetização discreta no rodapé (Adsterra nativo + Monetag sob clique com
 * aviso) — sem poluir a leitura das estatísticas.
 */
export function MatchEndScreen({ dados, onContinuar, onPatrocinio }: Props) {
  const r = RESULTADO_MAP[dados.resultado];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 text-white">
      <div className="w-full max-w-xl">
        {/* Competição / rodada */}
        <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
          {dados.competicao} · {dados.rodada}
        </p>

        {/* Placar esportivo */}
        <div className={`rounded-3xl border p-6 text-center shadow-2xl ${r.bg}`}>
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-black tracking-widest ${r.cor} ${r.bg}`}>
            <Flag className="size-3" />
            {r.rotulo}
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 md:gap-8">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold md:text-lg">{dados.timeUserNome}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-5xl font-black tabular-nums md:text-6xl">{dados.placarUser}</span>
              <span className="text-2xl font-bold text-slate-500">×</span>
              <span className="text-5xl font-black tabular-nums text-slate-400 md:text-6xl">
                {dados.placarAdv}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-400 md:text-lg">{dados.timeAdvNome}</p>
            </div>
          </div>
          {dados.extra ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
              <Sparkles className="size-3" /> {dados.extra}
            </p>
          ) : null}
        </div>

        {/* Estatísticas da partida */}
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Gols feitos</p>
            <p className="mt-1 text-xl font-black">{dados.placarUser}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Gols sofridos</p>
            <p className="mt-1 text-xl font-black">{dados.placarAdv}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Soberania</p>
            <p className="mt-1 text-xl font-black">
              <DeltaBadge valor={dados.soberaniaDelta} />
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Moral</p>
            <p className="mt-1 text-xl font-black">
              <DeltaBadge valor={dados.moralDelta} />
            </p>
          </div>
        </div>

        {typeof dados.posicaoTabela === "number" && dados.posicaoTabela > 0 ? (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
            <Trophy className="size-4 text-amber-400" />
            <p className="text-sm font-semibold text-slate-300">
              Posição na tabela: <span className="font-black text-white">#{dados.posicaoTabela}</span>
            </p>
          </div>
        ) : null}

        {/* Ação principal */}
        <button
          onClick={onContinuar}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 text-lg font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-900/40 transition hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.99]"
        >
          Continuar
        </button>

        {/* Monetização discreta no rodapé (profissional, sem poluir). */}
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
          <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
            Patrocínio
          </p>
          <AdsterraBanner slotId="match-end-banner" className="min-h-[90px]" />
          <div className="mt-2">
            <ControlledMonetagButton
              className="w-full text-xs"
              message="Um empresário de uma marca quer te PATROCINAR após essa partida! Para fechar o acordo, você dará uma entrevista rápida para a imprensa. Uma página do patrocinador pode abrir em uma nova aba."
              onDisparado={onPatrocinio}
            >
              🎤 Dar Entrevista · Ganho Patrocínio
            </ControlledMonetagButton>
          </div>
        </div>
      </div>
    </div>
  );
}
