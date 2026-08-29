import { useState } from "react";
import { ArrowLeft, Plus, Users, Link2, Coins, RefreshCw, Trophy, Zap } from "lucide-react";
import type { FormatoCampeonato, CampeonatoOnline } from "@/lib/multiplayer/campeonato.api";
import { SOV_MINIMO_CAMPEONATO } from "./OnlineChampionship";

type Props = {
  onBack?: (() => void) | undefined;
  nomeSala: string;
  setNomeSala: (v: string) => void;
  formato: FormatoCampeonato;
  setFormato: (v: FormatoCampeonato) => void;
  maxJogadores: number;
  setMaxJogadores: (v: number) => void;
  premioSov: number;
  setPremioSov: (v: number) => void;
  codigoEntrar: string;
  setCodigoEntrar: (v: string) => void;
  onCriar: () => void;
  onEntrar: (codigo?: string) => void;
  criando: boolean;
  perfil: unknown;
  abertos: CampeonatoOnline[];
  onRecarregar: () => void;
  erro: string | null;
};

type SubView = "hub" | "criar" | "entrar" | "salas";

export function CampeonatoHub({
  onBack, nomeSala, setNomeSala, formato, setFormato, maxJogadores, setMaxJogadores,
  premioSov, setPremioSov, codigoEntrar, setCodigoEntrar, onCriar, onEntrar,
  criando, perfil, abertos, onRecarregar, erro,
}: Props) {
  const [view, setView] = useState<SubView>("hub");

  // === Sub-views ===
  if (view === "criar") {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-md">
          <button onClick={() => setView("hub")} className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10">
            <ArrowLeft className="size-4 text-white" />
          </button>
          <Plus className="size-5 text-emerald-400" />
          <h1 className="font-display text-lg text-white">Criar Sala</h1>
        </div>
        <div className="flex-1 space-y-5 p-4 pb-8">
          <Field label="Nome da sala">
            <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-emerald-400/50 focus:outline-none" value={nomeSala} onChange={(e) => setNomeSala(e.target.value)} placeholder="Campeonato Online" maxLength={40} />
          </Field>
          <Field label="Formato">
            <div className="grid grid-cols-2 gap-2">
              {([["pontos", "Pontos Corridos", "Todos vs todos"], ["mata-mata", "Mata-Mata", "Eliminatório"]] as const).map(([id, label, desc]) => (
                <button key={id} onClick={() => setFormato(id)} className={`rounded-xl border p-3 text-left transition ${formato === id ? "border-emerald-400/60 bg-emerald-400/10" : "border-white/10 hover:border-white/20"}`}>
                  <p className="text-sm font-bold text-white">{label}</p>
                  <p className="text-[11px] text-white/40">{desc}</p>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Máximo de jogadores">
            <div className="flex flex-wrap gap-2">
              {[4, 8, 16, 32].map((n) => (
                <button key={n} onClick={() => setMaxJogadores(n)} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${maxJogadores === n ? "bg-emerald-500 text-white" : "border border-white/10 text-white/60 hover:border-white/20"}`}>
                  {n}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Prêmio do campeão (SOV, opcional)">
            <div className="flex items-center gap-2">
              <Coins className="size-4 text-amber-400" />
              <input type="number" min={0} max={10000} value={premioSov} onChange={(e) => setPremioSov(Math.max(0, Number(e.target.value) || 0))} className="w-32 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none" />
              <span className="text-xs text-white/30">SOV</span>
            </div>
          </Field>
          <p className="text-[11px] text-white/30">Mínimo de {SOV_MINIMO_CAMPEONATO} SOV para criar/entrar.</p>
          <button onClick={onCriar} disabled={criando || !perfil} className="w-full rounded-xl bg-emerald-500 py-3.5 font-display text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50">
            {criando ? "Criando..." : "Abrir sala"}
          </button>
          {!perfil && <p className="text-sm text-red-400">Faça login para criar.</p>}
        </div>
      </div>
    );
  }

  if (view === "entrar") {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-md">
          <button onClick={() => setView("hub")} className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10">
            <ArrowLeft className="size-4 text-white" />
          </button>
          <Link2 className="size-5 text-blue-400" />
          <h1 className="font-display text-lg text-white">Entrar por Código</h1>
        </div>
        <div className="flex-1 space-y-5 p-4 pb-8">
          <Field label="Cole o código ou link da sala">
            <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 font-mono focus:border-blue-400/50 focus:outline-none" value={codigoEntrar} onChange={(e) => setCodigoEntrar(e.target.value)} placeholder="CAMP-..." />
          </Field>
          <button onClick={() => onEntrar()} disabled={!perfil || !codigoEntrar.trim()} className="w-full rounded-xl bg-blue-500 py-3.5 font-display text-sm font-bold text-white transition hover:bg-blue-400 disabled:opacity-50">
            <Users className="mr-2 inline size-4" /> Entrar na sala
          </button>
        </div>
      </div>
    );
  }

  if (view === "salas") {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-md">
          <button onClick={() => setView("hub")} className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10">
            <ArrowLeft className="size-4 text-white" />
          </button>
          <Zap className="size-5 text-amber-400" />
          <h1 className="font-display text-lg text-white">Salas Abertas</h1>
          <button onClick={onRecarregar} className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 transition hover:text-white">
            <RefreshCw className="size-3" /> Atualizar
          </button>
        </div>
        <div className="flex-1 space-y-3 p-4 pb-8">
          {abertos.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <Trophy className="mx-auto mb-3 size-10 text-white/20" />
              <p className="text-sm text-white/40">Nenhuma sala aberta. Crie a primeira!</p>
            </div>
          )}
          {abertos.map((c) => {
            const numPart = Array.isArray(c.participantes) ? c.participantes.length : 0;
            const vagas = c.max_jogadores - numPart;
            return (
              <button key={c.id} onClick={() => onEntrar(c.codigo)} disabled={!perfil} className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-amber-400/40 hover:bg-amber-400/5 active:scale-[0.98]">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-400">
                  <Trophy className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base text-white">{c.nome}</p>
                  <p className="text-[11px] text-white/40">
                    <span className="font-mono">{c.codigo}</span> · {numPart}/{c.max_jogadores} jogadores · {vagas} vagas
                    {c.formato === "mata-mata" && <span className="ml-1 text-amber-300"> · Mata-Mata</span>}
                  </p>
                </div>
                <div className="text-right">
                  {(c.premio_sov ?? 0) > 0 && <p className="text-xs font-bold text-amber-300">{c.premio_sov} SOV</p>}
                  <span className="text-xs text-white/30 transition group-hover:text-amber-400">→</span>
                </div>
              </button>
            );
          })}
          {erro && <p className="text-sm text-red-400">{erro}</p>}
        </div>
      </div>
    );
  }

  // === Hub principal ===
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-md">
        {onBack && (
          <button onClick={onBack} className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10">
            <ArrowLeft className="size-4 text-white" />
          </button>
        )}
        <Trophy className="size-5 text-amber-400" />
        <h1 className="font-display text-lg text-white">Campeonato Online</h1>
      </div>

      <div className="flex-1 space-y-3 p-4 pb-8">
        {/* Card 1: Criar Sala */}
        <button onClick={() => setView("criar")} className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-emerald-400/40 hover:bg-emerald-400/5 active:scale-[0.98]">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-400 transition group-hover:bg-emerald-400/25">
            <Plus className="size-6" />
          </div>
          <div className="flex-1">
            <p className="font-display text-lg text-white">Criar Sala</p>
            <p className="text-xs text-white/40">Defina nome, formato e prêmio</p>
          </div>
          <span className="text-sm text-white/30 transition group-hover:text-emerald-400">→</span>
        </button>

        {/* Card 2: Entrar por Código */}
        <button onClick={() => setView("entrar")} className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-blue-400/40 hover:bg-blue-400/5 active:scale-[0.98]">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-blue-400/15 text-blue-400 transition group-hover:bg-blue-400/25">
            <Link2 className="size-6" />
          </div>
          <div className="flex-1">
            <p className="font-display text-lg text-white">Entrar por Código</p>
            <p className="text-xs text-white/40">Cole o código ou link da sala</p>
          </div>
          <span className="text-sm text-white/30 transition group-hover:text-blue-400">→</span>
        </button>

        {/* Card 3: Salas Abertas */}
        <button onClick={() => setView("salas")} className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-amber-400/40 hover:bg-amber-400/5 active:scale-[0.98]">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-400 transition group-hover:bg-amber-400/25">
            <Zap className="size-6" />
          </div>
          <div className="flex-1">
            <p className="font-display text-lg text-white">Salas Abertas</p>
            <p className="text-xs text-white/40">{abertos.length} sala(s) disponível(is)</p>
          </div>
          <span className="text-sm text-white/30 transition group-hover:text-amber-400">→</span>
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</span>
      {children}
    </label>
  );
}
