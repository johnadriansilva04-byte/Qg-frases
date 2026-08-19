import { Brain, Coins, GraduationCap, ScrollText, Shield, Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { AIService } from "@/components/botao/ai/AIService";
import { InfoModal, InfoButton } from "./InfoModal";
import { SEO_CONTENT } from "@/data/seoContent";

interface CidadelaIntroProps {
  onContinue: () => void;
}

export function CidadelaIntro({ onContinue }: CidadelaIntroProps) {
  const [activeModal, setActiveModal] = useState<"sobre" | "como" | "soberania" | null>(null);

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#2f1b55_0%,#0f172a_48%,#020617_100%)] p-4 text-white sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-5xl items-center justify-center">
        <section className="relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-purple-950/40 backdrop-blur-xl sm:p-10">
          <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
                <GraduationCap className="size-4" />
                Aprender jogando
              </div>

              <h1 className="font-display text-4xl font-black leading-tight sm:text-6xl">
                Cidadela do
                <span className="block bg-gradient-to-r from-emerald-300 via-cyan-300 to-purple-300 bg-clip-text text-transparent">
                  Pracinha
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">
                Nossa intenção é educar e ensinar economia, educação financeira e
                raciocínio lógico para crianças e jovens através de jogos clássicos.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Brain className="mb-3 size-6 text-cyan-300" />
                  <p className="text-sm font-bold">Raciocínio lógico</p>
                  <p className="mt-1 text-xs text-slate-400">Estratégia em cada jogada.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Coins className="mb-3 size-6 text-amber-300" />
                  <p className="text-sm font-bold">Educação financeira</p>
                  <p className="mt-1 text-xs text-slate-400">SOV escasso, decisões reais.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Target className="mb-3 size-6 text-purple-300" />
                  <p className="text-sm font-bold">Economia</p>
                  <p className="mt-1 text-xs text-slate-400">Mercado, oferta e negociação.</p>
                </div>
              </div>
            </div>

            <aside className="rounded-[1.75rem] border border-purple-300/20 bg-purple-500/10 p-5 shadow-inner shadow-purple-950/30 sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-purple-400/15 p-3">
                  <ScrollText className="size-6 text-purple-200" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-purple-200">Arquivo confidencial</p>
                  <h2 className="text-xl font-black">O segredo de John Adrian</h2>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-slate-100 sm:text-base">
                “A Cidadela não é apenas um lugar de jogos. Ela foi fundada por
                <strong> John Adrian</strong> com um propósito secreto. Mas a verdadeira
                razão de sua criação e os mistérios por trás de suas muralhas estão
                trancados em <strong>Pergaminhos Secretos</strong>.”
              </p>

              <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-amber-200">
                  <Shield className="size-4" />
                  <p className="text-xs font-bold uppercase tracking-[0.18em]">Pergaminhos Secretos</p>
                </div>
                <p className="text-sm leading-relaxed text-slate-200">
                  Para descobrir a história completa, encontre ou adquira os
                  Pergaminhos espalhados pela comunidade. Eles podem ser negociados
                  entre jogadores no Marketplace da Cidadela usando Sovereign (SOV).
                </p>
              </div>
            </aside>
          </div>

          <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
            <InfoButton onClick={() => setActiveModal("sobre")} label="Sobre a Pracinha" className="justify-center" />
            <InfoButton onClick={() => setActiveModal("como")} label="Como Jogar" className="justify-center" />
            <InfoButton onClick={() => setActiveModal("soberania")} label="Economia SOV" className="justify-center" />
          </div>

          <button
            onClick={onContinue}
            className="relative mt-5 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-6 py-4 text-base font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:scale-[1.01] hover:brightness-110 active:scale-[0.99]"
          >
            Continuar para a Cidadela
          </button>
          <p className="mt-4 text-center text-xs text-slate-400">
            Economia, estratégia e lógica — sem peso, com diversão.
          </p>
        </section>
      </div>

      <InfoModal isOpen={activeModal === "sobre"} onClose={() => setActiveModal(null)} title="Sobre a Pracinha Online" content={SEO_CONTENT.sobrePracinha} />
      <InfoModal isOpen={activeModal === "como"} onClose={() => setActiveModal(null)} title="Como Jogar" content={SEO_CONTENT.comoJogar} />
      <InfoModal isOpen={activeModal === "soberania"} onClose={() => setActiveModal(null)} title="Economia da Soberania" content={SEO_CONTENT.soberania} />
    </div>
  );
}

interface PracinhaIntroProps {
  nomeJogador?: string | undefined;
  onComplete: () => void;
}

const FALA_PADRAO =
  "Saudações, recruta. Eu sou o Pracinha: guardião retrô da Cidadela e oficial de campo da FEB. Suas ordens são claras: explore o modo carreira, complete as 5 missões diárias, chame rivais para o online e procure a verdade nos Pergaminhos de John Adrian.";

export function PracinhaIntro({ nomeJogador, onComplete }: PracinhaIntroProps) {
  const [fala, setFala] = useState(FALA_PADRAO);

  useEffect(() => {
    let vivo = true;
    AIService.generateText(
      { coach: nomeJogador || "Recruta", categoria: "boas_vindas" },
      "pracinha",
    )
      .then((texto) => {
        if (vivo && texto.trim()) setFala(texto);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [nomeJogador]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_center,#173526_0%,#0f172a_48%,#020617_100%)] p-4 text-white">
      <section className="w-full max-w-3xl rounded-[2rem] border border-emerald-300/20 bg-slate-950/80 p-6 shadow-2xl shadow-emerald-950/40 backdrop-blur-xl sm:p-8">
        <div className="mx-auto max-w-md">
          <div className="relative mx-auto h-44 w-40">
            <div className="absolute left-1/2 top-0 h-8 w-1 -translate-x-1/2 rounded bg-emerald-300/70" />
            <div className="absolute left-1/2 top-5 h-4 w-4 -translate-x-1/2 rounded-full bg-emerald-300 shadow-[0_0_24px_rgba(110,231,183,0.8)]" />
            <div className="absolute inset-x-2 top-8 h-20 rounded-t-[3rem] border-4 border-emerald-200/50 bg-gradient-to-b from-emerald-700 to-emerald-950 shadow-inner" />
            <div className="absolute inset-x-5 top-24 h-20 rounded-b-[2rem] rounded-t-lg border border-emerald-300/30 bg-gradient-to-b from-slate-700 to-slate-950" />
            <div className="absolute left-9 top-[5.8rem] h-5 w-5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
            <div className="absolute right-9 top-[5.8rem] h-5 w-5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
            <div className="absolute bottom-3 left-1/2 h-2 w-16 -translate-x-1/2 rounded-full bg-emerald-300/40" />
          </div>
        </div>

        <div className="mt-2 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">Unidade de orientação ativa</p>
          <h2 className="font-display mt-2 text-4xl font-black">Pracinha</h2>
          <p className="mt-1 text-sm text-slate-400">Robô militar retrô • Guardião da Cidadela</p>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-base leading-relaxed text-slate-100 sm:text-lg">{fala}</p>
        </div>

        <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
          <div className="rounded-2xl bg-emerald-400/10 p-3">
            <TrendingUp className="mb-2 size-5 text-emerald-300" />
            5 missões novas por dia
          </div>
          <div className="rounded-2xl bg-cyan-400/10 p-3">
            <Target className="mb-2 size-5 text-cyan-300" />
            Online sempre em movimento
          </div>
          <div className="rounded-2xl bg-purple-400/10 p-3">
            <ScrollText className="mb-2 size-5 text-purple-300" />
            Pergaminhos contam a verdade
          </div>
        </div>

        <button
          onClick={onComplete}
          className="mt-6 w-full rounded-2xl bg-emerald-400 px-6 py-4 font-black text-slate-950 transition hover:brightness-110 active:scale-[0.99]"
        >
          Receber missões do dia
        </button>
      </section>
    </div>
  );
}
