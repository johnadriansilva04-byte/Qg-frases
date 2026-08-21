import { useEffect, useState } from "react";
import { Building2, Sparkles, Trophy, Briefcase, Star } from "lucide-react";
import { obterSaldoSov } from "@/lib/financial/sovApi";
import { TEAMS, type Team } from "@/components/botao/data/teams";
import type { CareerState } from "./types";
import {
  precoClube,
  estrelasClube,
  prestigioClube,
  podeComprar,
  type ClubeDados,
} from "./marketplaceClubes";

export type ModoEntrada = "treinador" | "proprietario";

type Props = {
  userId: string | null;
  /** Modo escolhido passa para o CoachSetup/TournamentSetup. */
  onEscolher: (modo: ModoEntrada, clube: Team | null) => void;
  onBack?: (() => void) | undefined;
};

/**
 * ENTRADA TRIUNFAL DA CARREIRA (§11) — "agora sua carreira começa".
 * Duas trilhas reais (§12): comprar um clube no Marketplace (§13) com
 * preço determinístico (§15) ou trabalhar como Treinador (§17).
 */
export function CareerIntro({ userId, onEscolher, onBack }: Props) {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [modo, setModo] = useState<ModoEntrada | null>(null);

  useEffect(() => {
    if (!userId) return;
    void obterSaldoSov(userId).then(setSaldo).catch(() => setSaldo(null));
  }, [userId]);

  const comprar = (clube: ClubeDados) => {
    onEscolher("proprietario", clube as Team);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 text-white">
      <div className="relative z-10 w-full max-w-2xl">
        <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-300">
          Modo Carreira · Entrada Triunfal
        </p>
        <h1 className="text-center bg-gradient-to-r from-emerald-300 via-amber-300 to-cyan-300 bg-clip-text text-4xl font-black text-transparent md:text-5xl">
          Sua carreira começa agora
        </h1>
        <p className="mt-3 text-center text-sm text-slate-300">
          Escolha como você entra no mundo dos clubes da Cidadela.
        </p>

        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-1.5 text-xs font-bold text-slate-300 transition hover:border-slate-500"
          >
            ← Voltar
          </button>
        )}
        {!modo ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <button
              onClick={() => setModo("treinador")}
              className="group rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-left transition hover:border-emerald-400 hover:bg-emerald-500/20 active:scale-[0.99]"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                <Briefcase className="size-4" /> Caminho do Treinador
              </span>
              <p className="mt-3 font-display text-2xl">Trabalhar como Treinador</p>
              <p className="mt-2 text-sm text-slate-300">
                Contrato com um clube existente. Diretor envia metas no celular, salário
                e reputação crescem com resultado. Depois: compra o clube.
              </p>
            </button>

            <button
              onClick={() => setModo("proprietario")}
              className="group rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-left transition hover:border-amber-400 hover:bg-amber-500/20 active:scale-[0.99]"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
                <Building2 className="size-4" /> Marketplace
              </span>
              <p className="mt-3 font-display text-2xl">Comprar um Clube</p>
              <p className="mt-2 text-sm text-slate-300">
                Usa seu SOV para adquirir um clube real da Cidadela. Dono decide
                nome, cores e o futuro da trajetória.
              </p>
              <p className="mt-2 text-xs text-amber-300/80">
                Saldo atual: {saldo == null ? "—" : `${saldo.toFixed(0)} SOV`}
              </p>
            </button>
          </div>
        ) : modo === "treinador" ? (
          <button
            onClick={() => onEscolher("treinador", null)}
            className="mt-8 w-full rounded-3xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 text-lg font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-900/40 transition hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.99]"
          >
            Assinar como Treinador
          </button>
        ) : (
          <div className="mt-8 max-h-[420px] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-300">
              MARKETPLACE · Clubes à venda
            </p>
            {TEAMS.map((c) => {
              const preco = precoClube(c);
              const estrelas = estrelasClube(c);
              const posso = userId && saldo != null && podeComprar(c, saldo);
              return (
                <div
                  key={c.id}
                  className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{c.name}</p>
                    <p className="text-[10px] text-slate-400">{prestigioClube(c)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: estrelas }).map((_, i) => (
                        <Star key={i} className="size-3 fill-amber-400 text-amber-400" />
                      ))}
                    </span>
                    <span className="text-xs font-bold text-amber-300 tabular-nums">
                      {preco} SOV
                    </span>
                    <button
                      onClick={() => comprar(c)}
                      disabled={!posso}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-900 transition hover:bg-amber-400 disabled:opacity-40"
                    >
                      Comprar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Glow cyberpunk. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/3 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <Sparkles className="absolute right-8 top-8 size-6 text-amber-300/40 animate-pulse" />
        <Trophy className="absolute left-8 bottom-8 size-6 text-emerald-300/30" />
      </div>
    </div>
  );
}
