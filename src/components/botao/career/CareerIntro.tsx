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
} from "lucide-react";
import type { CareerState } from "./types";
import { DIVISAO_LABEL } from "./competitionApi";

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
 * 2 passos com impacto visual:
 * 1. Apresentação Triunfal — Animação de boas-vindas chamando o jogador pelo nome
 * 2. Propostas Aleatórias — 3 clubes com atributos (torcida, orçamento, expectativas)
 */
export function CareerIntro({ nomeJogador, onIniciar, onBack }: Props) {
  const [step, setStep] = useState(0);
  const [animateIn, setAnimateIn] = useState(false);

  const NOME = nomeJogador || "Treinador";

  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(t);
  }, [step]);

  // Random club proposals — deterministic by name
  const clubesPropostas = useMemo(() => {
    const hash = (NOME + "clubes").split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
    const abs = Math.abs(hash);
    const ALL_CLUBES = [
      { nome: "São Paulo FC", cor: "#cc0000", poder: 72, torcida: 85000, orcamento: "Médio", estilo: "Equilibrado" },
      { nome: "Flamengo", cor: "#cc0000", poder: 78, torcida: 120000, orcamento: "Alto", estilo: "Ofensivo" },
      { nome: "Palmeiras", cor: "#006633", poder: 76, torcida: 95000, orcamento: "Alto", estilo: "Versátil" },
      { nome: "Corinthians", cor: "#1a1a1a", poder: 70, torcida: 110000, orcamento: "Médio", estilo: "Raça" },
      { nome: "Santos FC", cor: "#1a1a1a", poder: 65, torcida: 45000, orcamento: "Baixo", estilo: "Ofensivo" },
      { nome: "Grêmio", cor: "#0066cc", poder: 71, torcida: 65000, orcamento: "Médio", estilo: "Técnico" },
      { nome: "Internacional", cor: "#cc0000", poder: 70, torcida: 60000, orcamento: "Médio", estilo: "Ofensivo" },
      { nome: "Cruzeiro", cor: "#0033cc", poder: 68, torcida: 55000, orcamento: "Baixo", estilo: "Equilibrado" },
      { nome: "Atlético-MG", cor: "#1a1a1a", poder: 69, torcida: 48000, orcamento: "Médio", estilo: "Técnico" },
      { nome: "Botafogo", cor: "#1a1a1a", poder: 66, torcida: 35000, orcamento: "Baixo", estilo: "Retranca" },
    ];
    // Pick 3 from different positions based on hash
    const idx1 = abs % ALL_CLUBES.length;
    let idx2 = (abs + 3) % ALL_CLUBES.length;
    let idx3 = (abs + 7) % ALL_CLUBES.length;
    if (idx2 === idx1) idx2 = (idx2 + 1) % ALL_CLUBES.length;
    if (idx3 === idx1 || idx3 === idx2) idx3 = (idx3 + 1) % ALL_CLUBES.length;
    return [ALL_CLUBES[idx1]!, ALL_CLUBES[idx2]!, ALL_CLUBES[idx3]!];
  }, [NOME]);

  return (
    <div className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
      {/* Cinematic background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-500/8 blur-[120px] transition-all duration-[2000ms] ${animateIn ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}
        />
        <div
          className={`absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-amber-500/6 blur-[100px] transition-all duration-[2000ms] delay-300 ${animateIn ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}
        />
        <div
          className={`absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-[80px] transition-all duration-[2500ms] delay-500 ${animateIn ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
        />
      </div>

      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 text-xs font-bold text-slate-400 backdrop-blur-sm transition hover:border-white/20 hover:text-white"
        >
          ← Voltar
        </button>
      )}

      {/* Step 0: Triumphant Welcome */}
      {step === 0 && (
        <div
          className={`relative z-10 w-full max-w-2xl text-center transition-all duration-1000 ${animateIn ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
        >
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.4em] text-emerald-400/80">
            Modo Carreira · Primeira Entrada
          </p>

          <div className="relative inline-block">
            <h1
              className="font-display text-5xl md:text-7xl font-black bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-300 bg-clip-text text-transparent"
              style={{ textShadow: "0 0 60px rgba(16,185,129,0.15)" }}
            >
              {NOME}
            </h1>
            <Sparkles className="absolute -right-6 -top-2 size-6 text-amber-300/60 animate-pulse" />
          </div>

          <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-lg mx-auto">
            Sua carreira começa agora.
            <br />
            <span className="text-slate-500 text-sm">
              Treine, conquiste títulos e construa seu império.
            </span>
          </p>

          {/* Career progression cards */}
          <div className="mt-10 space-y-4 text-left max-w-lg mx-auto">
            <ProgressionCard
              icon={<Trophy className="size-5 text-emerald-300" />}
              color="emerald"
              title="Comece como Técnico"
              desc="Assine com um clube, vença partidas e construa reputação."
              delay={200}
              animateIn={animateIn}
            />
            <ProgressionCard
              icon={<TrendingUp className="size-5 text-amber-300" />}
              color="amber"
              title="Acumule Patrimônio"
              desc="Use seu SOV para comprar participações em clubes da Cidadela."
              delay={400}
              animateIn={animateIn}
            />
            <ProgressionCard
              icon={<Building2 className="size-5 text-cyan-300" />}
              color="cyan"
              title="Torne-se Proprietário"
              desc="Compre um clube inteiro. Decida nome, cores e o futuro."
              delay={600}
              animateIn={animateIn}
            />
          </div>

          <button
            onClick={() => {
              setAnimateIn(false);
              setTimeout(() => {
                setStep(1);
                setAnimateIn(true);
              }, 300);
            }}
            className="mt-10 w-full max-w-lg rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-4 text-lg font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition-all hover:from-emerald-500 hover:to-emerald-400 hover:shadow-emerald-500/20 active:scale-[0.98]"
          >
            Ver Propostas
          </button>

          <p className="mt-4 text-xs text-slate-600">
            Uma carreira, um personagem, um destino
          </p>
        </div>
      )}

      {/* Step 1: Club Proposals */}
      {step === 1 && (
        <div
          className={`relative z-10 w-full max-w-3xl transition-all duration-700 ${animateIn ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
        >
          <div className="text-center mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400/80 mb-2">
              Passo 2 · Escolha seu Clube
            </p>
            <h2 className="font-display text-2xl font-black text-white">
              Propostas de Contrato
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Clubes estão interessados em você. Analise e escolha onde começar.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {clubesPropostas.map((clube, i) => (
              <ClubProposalCard
                key={clube.nome}
                clube={clube}
                index={i}
                animateIn={animateIn}
                onSelect={() => onIniciar()}
              />
            ))}
          </div>

          <button
            onClick={onIniciar}
            className="mt-6 w-full max-w-3xl mx-auto flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-3.5 text-sm font-bold text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            <Zap className="size-4" />
            Aceitar Primeira Opção
          </button>
        </div>
      )}
    </div>
  );
}

function ProgressionCard({
  icon,
  color,
  title,
  desc,
  delay,
  animateIn,
}: {
  icon: React.ReactNode;
  color: "emerald" | "amber" | "cyan";
  title: string;
  desc: string;
  delay: number;
  animateIn: boolean;
}) {
  const colorMap = {
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
    cyan: "border-cyan-500/20 bg-cyan-500/5",
  };
  const iconBg = {
    emerald: "bg-emerald-500/15",
    amber: "bg-amber-500/15",
    cyan: "bg-cyan-500/15",
  };

  return (
    <div
      className={`flex items-start gap-4 rounded-2xl border p-4 transition-all duration-700 ${colorMap[color]} ${animateIn ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconBg[color]}`}>
        {icon}
      </div>
      <div>
        <h3 className="font-display text-sm font-bold text-white">{title}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function ClubProposalCard({
  clube,
  index,
  animateIn,
  onSelect,
}: {
  clube: { nome: string; cor: string; poder: number; torcida: number; orcamento: string; estilo: string };
  index: number;
  animateIn: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-left transition-all duration-700 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.08)] active:scale-[0.98] ${animateIn ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
      style={{ transitionDelay: `${200 + index * 150}ms` }}
    >
      {/* Club color accent bar */}
      <div
        className="absolute top-0 left-0 h-1 w-full"
        style={{ background: clube.cor }}
      />

      <div className="flex items-center gap-3 mb-4">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-lg"
          style={{ background: `${clube.cor}22` }}
        >
          ⚽
        </div>
        <div>
          <h3 className="font-display text-base font-bold text-white leading-tight">
            {clube.nome}
          </h3>
          <span className="text-[10px] uppercase tracking-widest text-slate-500">
            {clube.estilo}
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        <StatBar
          icon={<Zap className="size-3" />}
          label="Força"
          value={clube.poder}
          max={100}
          color="emerald"
        />
        <StatBar
          icon={<Users className="size-3" />}
          label="Torcida"
          value={clube.torcida}
          max={150000}
          color="cyan"
          formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
        />
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-500">
            <Coins className="size-3" />
            Orçamento
          </span>
          <span className="font-bold text-amber-300/80">{clube.orcamento}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider opacity-0 transition group-hover:opacity-100">
        <span>Assinar</span>
        <ChevronRight className="size-3" />
      </div>
    </button>
  );
}

function StatBar({
  icon,
  label,
  value,
  max,
  color,
  formatValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  color: "emerald" | "cyan";
  formatValue?: (v: number) => string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const barColor = color === "emerald" ? "bg-emerald-500" : "bg-cyan-500";
  const textColor = color === "emerald" ? "text-emerald-400" : "text-cyan-400";

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1.5 text-slate-500">
          {icon}
          {label}
        </span>
        <span className={`font-bold ${textColor}`}>
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-1000`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
