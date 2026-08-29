import { useState } from "react";
import {
  Play,
  Save,
  Trash2,
  Plus,
  Shield,
  Trophy,
  Coins,
  Calendar,
  HardDrive,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { CareerState } from "./types";
import { DIVISAO_LABEL } from "./competitionApi";

type Props = {
  career: CareerState | null;
  onLoadCareer: () => void;
  onNewCareer: () => void;
  onSaveCampaign: () => void;
  onDeleteCareer: () => void;
  onBack: () => void;
};

export function CareerMenu({
  career,
  onLoadCareer,
  onNewCareer,
  onSaveCampaign,
  onDeleteCareer,
  onBack,
}: Props) {
  const [showManageSaves, setShowManageSaves] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasCareer = career && career.coach.nome;

  return (
    <div className="relative min-h-[80vh] w-full max-w-4xl mx-auto px-4 py-6">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-500/5 blur-[100px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20">
            <Shield className="size-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-300 bg-clip-text text-transparent">
              CARREIRA
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
              Modo Carreira · Campus
            </p>
          </div>
        </div>
      </div>

      {/* Active Career Summary Card */}
      {hasCareer && (
        <div className="relative z-10 mb-6 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/50 to-slate-950/80 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                <Trophy className="size-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-500/70">
                  Campanha Atual
                </p>
                <h2 className="font-display text-xl font-bold text-white">
                  {career.coach.apelido || career.coach.nome}
                </h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    Temporada {career.temporada}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-emerald-400/80">
                    {DIVISAO_LABEL[career.divisao ?? "serie-c"]}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <Coins className="size-4 text-amber-400" />
                <span className="font-display text-lg font-black text-amber-300">
                  {career.coach.sov}
                </span>
              </div>
              <p className="text-[9px] uppercase tracking-widest text-slate-500 mt-0.5">
                SOV
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Action Cards */}
      <div className="relative z-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Continue Campaign */}
        {hasCareer && (
          <button
            onClick={onLoadCareer}
            className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/40 to-slate-950/60 p-6 text-left transition-all duration-300 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] active:scale-[0.98]"
          >
            {/* Glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 transition-all duration-300 group-hover:from-emerald-500/5 group-hover:to-transparent" />

            <div className="relative z-10">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/20 transition-all duration-300 group-hover:bg-emerald-500/25 group-hover:scale-110">
                <Play className="size-6 text-emerald-400" />
              </div>

              <h3 className="font-display text-xl font-black text-white mb-1">
                Continuar
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Retome sua jornada de onde parou
              </p>

              <div className="mt-4 flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <span>Entrar</span>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </button>
        )}

        {/* Card 2: New Career */}
        <button
          onClick={onNewCareer}
          className="group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/40 to-slate-950/60 p-6 text-left transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/0 transition-all duration-300 group-hover:from-cyan-500/5 group-hover:to-transparent" />

          <div className="relative z-10">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/20 transition-all duration-300 group-hover:bg-cyan-500/25 group-hover:scale-110">
              <Sparkles className="size-6 text-cyan-400" />
            </div>

            <h3 className="font-display text-xl font-black text-white mb-1">
              Nova Carreira
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {hasCareer
                ? "Reinicie com um novo treinador e um novo destino"
                : "Comece sua jornada e construa uma lenda"}
            </p>

            <div className="mt-4 flex items-center gap-1.5 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <span>Começar</span>
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </button>

        {/* Card 3: Manage Saves */}
        <button
          onClick={() => setShowManageSaves(!showManageSaves)}
          className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-950/30 to-slate-950/60 p-6 text-left transition-all duration-300 hover:border-amber-500/40 hover:shadow-[0_0_30px_rgba(245,158,11,0.08)] active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/0 transition-all duration-300 group-hover:from-amber-500/5 group-hover:to-transparent" />

          <div className="relative z-10">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/20 transition-all duration-300 group-hover:bg-amber-500/25 group-hover:scale-110">
              <HardDrive className="size-6 text-amber-400" />
            </div>

            <h3 className="font-display text-xl font-black text-white mb-1">
              Gerenciar Saves
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Salvar, excluir ou gerenciar campanhas
            </p>

            <div className="mt-4 flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <span>Abrir</span>
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </button>
      </div>

      {/* Manage Saves Panel (expandable) */}
      {showManageSaves && (
        <div className="relative z-10 mt-4 rounded-2xl border border-amber-500/15 bg-slate-950/80 backdrop-blur-sm p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-amber-300 uppercase tracking-wider">
            Gerenciar Campanhas
          </h3>

          {hasCareer && (
            <button
              onClick={onSaveCampaign}
              className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-slate-900/60 p-4 text-left transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Save className="size-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="font-display text-sm font-bold text-white">Salvar Agora</p>
                <p className="text-xs text-slate-500">
                  Sincroniza com o servidor
                </p>
              </div>
              <ArrowRight className="size-4 text-slate-600" />
            </button>
          )}

          {hasCareer && (
            <div>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-slate-900/60 p-4 text-left transition-all hover:border-red-500/30 hover:bg-red-500/5"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10">
                    <Trash2 className="size-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-sm font-bold text-white">Excluir Campanha</p>
                    <p className="text-xs text-slate-500">
                      Remove todo o progresso permanentemente
                    </p>
                  </div>
                </button>
              ) : (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                  <p className="text-sm text-red-300 font-bold">
                    ⚠ Tem certeza? Esta ação é irreversível.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={onDeleteCareer}
                      className="flex-1 rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-500/30"
                    >
                      Sim, Excluir
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded-lg bg-slate-800 border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-400 transition hover:bg-slate-700"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* No career placeholder */}
      {!hasCareer && (
        <div className="relative z-10 mt-8 text-center">
          <p className="text-sm text-slate-600">
            Nenhuma campanha ativa. Inicie uma nova carreira para começar.
          </p>
        </div>
      )}
    </div>
  );
}
