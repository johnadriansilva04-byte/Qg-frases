/**
 * ENTRADA TRIUNFAL DA PRIMEIRA CARREIRA
 *
 * 3 passos com impacto visual:
 * 1. Apresentação Triunfal — Animação de boas-vindas
 * 2. Propostas de Clubes REAIS (do banco via ofertasIniciais)
 * 3. Chegada/Boas-vindas — Página interativa com diretoria e comitiva
 */
import { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Trophy,
  TrendingUp,
  Building2,
  Crown,
  ChevronRight,
  Users,
  Zap,
  Target,
  Star,
  Coins,
  Newspaper,
  Camera,
  Handshake,
} from "lucide-react";
import type { CareerState } from "./types";
import type { OfertaClube } from "./ofertasIniciais";
import { DIVISAO_LABEL } from "./competitionApi";

type Props = {
  nomeJogador?: string | undefined;
  onIniciar: (clubeId?: string, nome?: string) => void;
  onBack?: (() => void) | undefined;
  /** Ofertas reais do banco (via ofertasIniciais). */
  ofertas?: OfertaClube[];
};

export function CareerIntro({ nomeJogador, onIniciar, onBack, ofertas = [] }: Props) {
  const [step, setStep] = useState(0);
  const [animateIn, setAnimateIn] = useState(false);
  const [clubeEscolhido, setClubeEscolhido] = useState<OfertaClube | null>(null);
  const [nomeTreinador, setNomeTreinador] = useState(nomeJogador || "");

  const NOME = nomeJogador || "Treinador";

  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(t);
  }, [step]);

  // Usar ofertas reais do banco
  const clubesPropostas = useMemo(() => {
    if (ofertas.length > 0) return ofertas.slice(0, 3);
    // Fallback: se não houver ofertas, usar dados mínimos
    return [
      { clubeId: "fallback-1", nome: "Clube Local", sigla: "CLB", escudo: "⚽", cidade: "Sua Cidade", power: 50, porte: "pequeno" as const, estrutura: 30, torcida: 5000, bonusAssinatura: 50, manutencao: 50, discurso: "Venha construir algo com a gente." },
      { clubeId: "fallback-2", nome: "Associação Esportiva", sigla: "AES", escudo: "⚽", cidade: "Cidade Próxima", power: 55, porte: "pequeno" as const, estrutura: 35, torcida: 8000, bonusAssinatura: 60, manutencao: 50, discurso: "Nosso orçamento é curto, mas a paciência é longa." },
      { clubeId: "fallback-3", nome: "Grêmio Esportivo", sigla: "GRE", escudo: "⚽", cidade: "Vizinhança", power: 48, porte: "pequeno" as const, estrutura: 28, torcida: 4000, bonusAssinatura: 40, manutencao: 50, discurso: "Precisamos de fome de provar. O clube é a porta de entrada." },
    ];
  }, [ofertas]);

  const handleSelectClube = (clube: OfertaClube) => {
    setClubeEscolhido(clube);
    setAnimateIn(false);
    setTimeout(() => {
      setStep(2); // Página de chegada
      setAnimateIn(true);
    }, 300);
  };

  const handleConfirmar = () => {
    if (clubeEscolhido) {
      onIniciar(clubeEscolhido.clubeId, nomeTreinador.trim() || undefined);
    } else {
      onIniciar();
    }
  };

  return (
    <div className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
      {/* Cinematic background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-500/8 blur-[120px] transition-all duration-[2000ms] ${animateIn ? "opacity-100 scale-100" : "opacity-0 scale-50"}`} />
        <div className={`absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-amber-500/6 blur-[100px] transition-all duration-[2000ms] delay-300 ${animateIn ? "opacity-100 scale-100" : "opacity-0 scale-50"}`} />
        <div className={`absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-[80px] transition-all duration-[2500ms] delay-500 ${animateIn ? "opacity-100 scale-100" : "opacity-0 scale-75"}`} />
      </div>

      {/* Back button */}
      {onBack && step < 2 && (
        <button onClick={onBack} className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 text-xs font-bold text-slate-400 backdrop-blur-sm transition hover:border-white/20 hover:text-white">
          ← Voltar
        </button>
      )}

      {/* ═══════ Step 0: Triumphant Welcome ═══════ */}
      {step === 0 && (
        <div className={`relative z-10 w-full max-w-2xl text-center transition-all duration-1000 ${animateIn ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.4em] text-emerald-400/80">
            Modo Carreira · Primeira Entrada
          </p>
          <div className="relative inline-block">
            <h1 className="font-display text-5xl md:text-7xl font-black bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-300 bg-clip-text text-transparent" style={{ textShadow: "0 0 60px rgba(16,185,129,0.15)" }}>
              {NOME}
            </h1>
            <Sparkles className="absolute -right-6 -top-2 size-6 text-amber-300/60 animate-pulse" />
          </div>
          <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-lg mx-auto">
            Sua carreira começa agora.
            <br />
            <span className="text-slate-500 text-sm">Treine, conquiste títulos e construa seu império.</span>
          </p>
          <div className="mt-10 space-y-4 text-left max-w-lg mx-auto">
            <ProgressionCard icon={<Trophy className="size-5 text-emerald-300" />} color="emerald" title="Comece como Técnico" desc="Assine com um clube, vença partidas e construa reputação." delay={200} animateIn={animateIn} />
            <ProgressionCard icon={<TrendingUp className="size-5 text-amber-300" />} color="amber" title="Acumule Patrimônio" desc="Use seu SOV para comprar participações em clubes da Cidadela." delay={400} animateIn={animateIn} />
            <ProgressionCard icon={<Building2 className="size-5 text-cyan-300" />} color="cyan" title="Torne-se Proprietário" desc="Compre um clube inteiro. Decida nome, cores e o futuro." delay={600} animateIn={animateIn} />
          </div>
          <button onClick={() => { setAnimateIn(false); setTimeout(() => { setStep(1); setAnimateIn(true); }, 300); }} className="mt-10 w-full max-w-lg rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-4 text-lg font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition-all hover:from-emerald-500 hover:to-emerald-400 hover:shadow-emerald-500/20 active:scale-[0.98]">
            Ver Propostas
          </button>
          <p className="mt-4 text-xs text-slate-600">Uma carreira, um personagem, um destino</p>
        </div>
      )}

      {/* ═══════ Step 1: Real Club Proposals ═══════ */}
      {step === 1 && (
        <div className={`relative z-10 w-full max-w-3xl transition-all duration-700 ${animateIn ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          <div className="text-center mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400/80 mb-2">Passo 2 · Escolha seu Clube</p>
            <h2 className="font-display text-2xl font-black text-white">Propostas de Contrato</h2>
            <p className="text-sm text-slate-400 mt-1">Clubes reais estão interessados em você. Analise e escolha onde começar.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {clubesPropostas.map((clube, i) => (
              <ClubProposalCard key={clube.clubeId} clube={clube} index={i} animateIn={animateIn} onSelect={() => handleSelectClube(clube)} />
            ))}
          </div>
        </div>
      )}

      {/* ═══════ Step 2: Welcome / Arrival Page ═══════ */}
      {step === 2 && clubeEscolhido && (
        <div className={`relative z-10 w-full max-w-2xl transition-all duration-1000 ${animateIn ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          {/* Confetti effect */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="absolute animate-bounce" style={{
                left: `${10 + (i * 4.5) % 80}%`,
                top: `${-5 + (i * 7) % 30}%`,
                animationDelay: `${i * 0.15}s`,
                animationDuration: `${1.5 + (i % 3) * 0.5}s`,
                fontSize: "1.2rem",
              }}>
                {["🎉", "⚽", "🏆", "🎊", "⭐"][i % 5]}
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400/80 mb-2">🎉 Bem-vindo ao Clube</p>
            <h2 className="font-display text-3xl font-black text-white">{clubeEscolhido.nome}</h2>
            <p className="text-sm text-slate-400 mt-1">{clubeEscolhido.cidade} · {clubeEscolhido.sigla}</p>
          </div>

          {/* Comitiva / Board */}
          <div className="rounded-2xl border border-amber-500/15 bg-gradient-to-b from-amber-950/20 to-slate-950/60 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Handshake className="size-5 text-amber-400" />
              <h3 className="font-display text-sm font-black text-amber-300 uppercase tracking-wider">Diretoria do Clube</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { nome: "Dr. Maurício", cargo: "Presidente", icon: <Crown className="size-4 text-amber-300" /> },
                { nome: "Carlos Silva", cargo: "Diretor Esportivo", icon: <Target className="size-4 text-emerald-300" /> },
                { nome: "Ana Santos", cargo: "Assessora de Imprensa", icon: <Newspaper className="size-4 text-cyan-300" /> },
              ].map((pessoa) => (
                <div key={pessoa.nome} className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-center">
                  <div className="flex size-8 mx-auto items-center justify-center rounded-full bg-white/5 mb-2">{pessoa.icon}</div>
                  <p className="text-xs font-bold text-white">{pessoa.nome}</p>
                  <p className="text-[9px] text-slate-500">{pessoa.cargo}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Discurso do Presidente */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
                <span className="text-lg">🎖️</span>
              </div>
              <div>
                <p className="text-xs font-bold text-amber-300 mb-1">Dr. Maurício — Presidente</p>
                <p className="text-sm text-slate-300 leading-relaxed italic">
                  "{clubeEscolhido.discurso}"
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Bônus de assinatura: <span className="font-bold text-amber-300">{clubeEscolhido.bonusAssinatura} SOV</span>
                </p>
              </div>
            </div>
          </div>

          {/* Stats do clube */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3 text-center">
              <Zap className="size-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-lg font-black text-white">{clubeEscolhido.power}</p>
              <p className="text-[9px] text-slate-500 uppercase">Força</p>
            </div>
            <div className="rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-3 text-center">
              <Users className="size-4 text-cyan-400 mx-auto mb-1" />
              <p className="text-lg font-black text-white">{(clubeEscolhido.torcida / 1000).toFixed(0)}k</p>
              <p className="text-[9px] text-slate-500 uppercase">Torcida</p>
            </div>
            <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-3 text-center">
              <Coins className="size-4 text-amber-400 mx-auto mb-1" />
              <p className="text-lg font-black text-white">{clubeEscolhido.bonusAssinatura}</p>
              <p className="text-[9px] text-slate-500 uppercase">SOV Bônus</p>
            </div>
          </div>

          {/* CTA */}
          <button onClick={() => { setAnimateIn(false); setTimeout(() => { setStep(3); setAnimateIn(true); }, 300); }} className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-4 text-lg font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition-all hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98]">
            Continuar
          </button>
        </div>
      )}

      {/* ═══════ Step 3: Nome do Treinador ═══════ */}
      {step === 3 && clubeEscolhido && (
        <div className={`relative z-10 w-full max-w-lg transition-all duration-700 ${animateIn ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          <div className="text-center mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400/80 mb-2">Passo 3 · Identidade</p>
            <h2 className="font-display text-2xl font-black text-white">Quem é você, treinador?</h2>
            <p className="text-sm text-slate-400 mt-1">{clubeEscolhido.nome} precisa saber seu nome.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-6">
            <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Nome completo</label>
            <input
              type="text"
              value={nomeTreinador}
              onChange={(e) => setNomeTreinador(e.target.value)}
              placeholder="Ex: João Silva"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white font-display text-lg placeholder:text-slate-600 focus:border-emerald-500/40 focus:outline-none"
              autoFocus
            />
            {nomeTreinador.trim().length >= 2 && (
              <button onClick={handleConfirmar} className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-4 text-lg font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition-all hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98]">
                ⚽ Iniciar Temporada
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════ Sub-components ═══════ */

function ProgressionCard({ icon, color, title, desc, delay, animateIn }: { icon: React.ReactNode; color: "emerald" | "amber" | "cyan"; title: string; desc: string; delay: number; animateIn: boolean }) {
  const colorMap = { emerald: "border-emerald-500/20 bg-emerald-500/5", amber: "border-amber-500/20 bg-amber-500/5", cyan: "border-cyan-500/20 bg-cyan-500/5" };
  const iconBg = { emerald: "bg-emerald-500/15", amber: "bg-amber-500/15", cyan: "bg-cyan-500/15" };
  return (
    <div className={`flex items-start gap-4 rounded-2xl border p-4 transition-all duration-700 ${colorMap[color]} ${animateIn ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconBg[color]}`}>{icon}</div>
      <div>
        <h3 className="font-display text-sm font-bold text-white">{title}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function ClubProposalCard({ clube, index, animateIn, onSelect }: { clube: OfertaClube; index: number; animateIn: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-left transition-all duration-700 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.08)] active:scale-[0.98] ${animateIn ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`} style={{ transitionDelay: `${200 + index * 150}ms` }}>
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
      <div className="flex items-center gap-3 mb-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-emerald-500/10 text-lg">{clube.escudo}</div>
        <div>
          <h3 className="font-display text-base font-bold text-white leading-tight">{clube.nome}</h3>
          <span className="text-[10px] uppercase tracking-widest text-slate-500">{clube.cidade}</span>
        </div>
      </div>
      <div className="space-y-2.5">
        <StatBar icon={<Zap className="size-3" />} label="Força" value={clube.power} max={100} color="emerald" />
        <StatBar icon={<Users className="size-3" />} label="Torcida" value={clube.torcida} max={15000} color="cyan" formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-500"><Coins className="size-3" /> Bônus</span>
          <span className="font-bold text-amber-300/80">{clube.bonusAssinatura} SOV</span>
        </div>
      </div>
      <p className="mt-3 text-[10px] text-slate-500 italic leading-relaxed">"{clube.discurso}"</p>
      <div className="mt-3 flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider opacity-0 transition group-hover:opacity-100">
        <span>Assinar</span><ChevronRight className="size-3" />
      </div>
    </button>
  );
}

function StatBar({ icon, label, value, max, color, formatValue }: { icon: React.ReactNode; label: string; value: number; max: number; color: "emerald" | "cyan"; formatValue?: (v: number) => string }) {
  const pct = Math.min(100, (value / max) * 100);
  const barColor = color === "emerald" ? "bg-emerald-500" : "bg-cyan-500";
  const textColor = color === "emerald" ? "text-emerald-400" : "text-cyan-400";
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1.5 text-slate-500">{icon} {label}</span>
        <span className={`font-bold ${textColor}`}>{formatValue ? formatValue(value) : value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
