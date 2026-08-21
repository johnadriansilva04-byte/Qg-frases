import { Sparkles, Trophy, TrendingUp, Building2, Crown } from "lucide-react";
import type { CareerState } from "./types";

type Props = {
  /** Nome do jogador do perfil existente. */
  nomeJogador?: string | undefined;
  /** Callback para iniciar carreira como técnico. */
  onIniciar: () => void;
  onBack?: (() => void) | undefined;
};

/**
 * ENTRADA TRIUNFAL DA PRIMEIRA CARREIRA
 * 
 * Você começa como técnico. Com desempenho, patrimônio e conquistas,
 * você pode comprar participações em clubes e, posteriormente, adquirir
 * clubes inteiros. Chegue a ser proprietário de vários clubes.
 */
export function CareerIntro({ nomeJogador, onIniciar, onBack }: Props) {
  const NOME = nomeJogador || "Treinador";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 text-white">
      <div className="relative z-10 w-full max-w-3xl">
        <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-300">
          Modo Carreira · Primeira Entrada
        </p>
        
        <h1 className="text-center bg-gradient-to-r from-emerald-300 via-amber-300 to-cyan-300 bg-clip-text text-5xl font-black text-transparent md:text-6xl">
          {NOME}
        </h1>
        
        <p className="mt-4 text-center text-lg text-slate-300">
          Sua carreira começa agora.
        </p>

        {onBack && (
          <button
            onClick={onBack}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-1.5 text-xs font-bold text-slate-300 transition hover:border-slate-500"
          >
            ← Voltar
          </button>
        )}

        {/* Progressão da carreira */}
        <div className="mt-8 space-y-6">
          <div className="flex items-start gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <div className="rounded-full bg-emerald-500/20 p-3">
              <Trophy className="size-6 text-emerald-300" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl font-bold text-emerald-200">Comece como Técnico</h3>
              <p className="mt-1 text-sm text-slate-300">
                Você não começa como dono. Você começa construindo seu nome.
                Assine com um clube, vença partidas e construa reputação.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <div className="rounded-full bg-amber-500/20 p-3">
              <TrendingUp className="size-6 text-amber-300" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl font-bold text-amber-200">Acumule Patrimônio</h3>
              <p className="mt-1 text-sm text-slate-300">
                Com desempenho e conquistas, você acumula SOV. Use seu patrimônio
                para comprar participações em clubes da Cidadela.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5">
            <div className="rounded-full bg-cyan-500/20 p-3">
              <Building2 className="size-6 text-cyan-300" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl font-bold text-cyan-200">Torne-se Proprietário</h3>
              <p className="mt-1 text-sm text-slate-300">
                Quando estiver preparado, compre um clube inteiro. Decida nome,
                cores e o futuro da trajetória. E se quiser ir além, construa
                seu próprio império — proprietário de múltiplos clubes.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onIniciar}
          className="mt-10 w-full rounded-3xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-5 text-xl font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-900/40 transition hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.99]"
        >
          Entrar como Técnico
        </button>

        <p className="mt-4 text-center text-xs text-slate-500">
          Teto econômico: 200.000 SOV · Uma carreira, um personagem, um destino
        </p>
      </div>

      {/* Glow cinematográfico */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <Sparkles className="absolute right-12 top-12 size-8 text-amber-300/40 animate-pulse" />
        <Trophy className="absolute left-12 bottom-12 size-8 text-emerald-300/30" />
        <Crown className="absolute right-1/2 top-1/3 size-6 text-cyan-300/20" />
      </div>
    </div>
  );
}
