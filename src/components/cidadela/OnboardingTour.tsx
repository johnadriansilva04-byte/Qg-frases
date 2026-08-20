import { useEffect, useRef, useState } from "react";
import { ArrowDown, Bot, Send, Smartphone } from "lucide-react";
import { ChatAuthCard } from "@/components/cidadela/ChatAuthCard";
import {
  DESTINOS,
  destinoPorKey,
  mensagemDoStage,
  responderPracinha,
  type OnboardingEstado,
  type OnboardingDestinoKey,
} from "@/lib/onboarding/onboardingEngine";
import type { Perfil } from "@/components/botao/online/auth";

type Msg = { autor: "pracinha" | "user"; texto: string };

type Props = {
  /** Perfil do usuário autenticado (null se ainda em identificação). */
  perfil: Perfil | null;
  /** Destino pré-selecionado pela rota clicada (§32: tour contextual). */
  destinoInicial?: OnboardingDestinoKey | undefined;
  /** Máquina de onboarding (pai). */
  onboarding: {
    estado: OnboardingEstado | null;
    avancar: () => void;
    escolherDestino: (d: OnboardingDestinoKey) => void;
    concluir: () => void;
  };
  /** Quando o tour concluir: navega ao destino. */
  onConcluir: (link: string) => void;
};

const AVATAR_PRACINHA = "🤖";

/**
 * CELULAR DO TOUR (§3/§15): frame de celular premium, central da primeira
 * experiência. Componente único. Rolagem vertical nativa, indicação discreta
 * de scroll que some após a primeira interação. O Pracinha é a IA ativa (§4):
 * as mensagens reagem ao estado do tour e ao texto do usuário.
 */
export function OnboardingTour({ perfil, destinoInicial, onboarding, onConcluir }: Props) {
  const { estado, avancar, escolherDestino, concluir } = onboarding;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [mostrarHintScroll, setMostrarHintScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const stage = estado?.stage ?? "nao-iniciado";

  // Abertura de cada estágio — UMA vez por estágio, idempotente (§21 bug guard).
  const ultimoStagePracinha = useRef<string | null>(null);
  useEffect(() => {
    if (!estado) return;
    if (ultimoStagePracinha.current === stage) return;
    ultimoStagePracinha.current = stage;
    const abertura = mensagemDoStage(stage);
    setMsgs((m) => [...m, { autor: "pracinha", texto: abertura.texto }]);
  }, [estado, stage]);

  // Preserva as mensagens entre trocas de estágio (msgs só entram, nunca saem).
  const enviarTexto = (texto: string) => {
    const limpo = texto.trim();
    if (!limpo) return;
    setMostrarHintScroll(false);
    setMsgs((m) => [...m, { autor: "user", texto: limpo }]);
    if (!estado) return;
    const resp = responderPracinha(estado, limpo);
    setMsgs((m) => [...m, { autor: "pracinha", texto: resp.texto }]);
    setInput("");
  };

  const escolherDestinoClick = (d: OnboardingDestinoKey) => {
    const info = destinoPorKey(d);
    setMostrarHintScroll(false);
    if (!info) return;
    setMsgs((m) => [...m, { autor: "pracinha", texto: info.fala }]);
    escolherDestino(d);
    setMsgs((m) => [
      ...m,
      { autor: "pracinha", texto: "Pratique no seu destino e volte quando quiser: agora você é de casa. 🎉" },
    ]);
  };

  // Scroll to bottom, a gentler chat experience.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const acoesStage = (s: typeof stage): { rotulo: string; acao: () => void; variante: "prim" | "sec" }[] => {
    switch (s) {
      case "nao-iniciado":
        return [{ rotulo: "Iniciar tour", acao: avancar, variante: "prim" }];
      case "identificacao":
        return [];
      case "introducao":
      case "ambientes":
      case "sov":
        return [{ rotulo: "Entendi", acao: avancar, variante: "prim" }];
      case "destino":
        return [];
      case "primeiro-jogo": {
        const info = destinoPorKey(estado?.destino ?? null);
        return info
          ? [
              {
                rotulo: `Ir para ${info.rotulo}`,
                acao: () => {
                  concluir();
                  onConcluir(info.link);
                },
                variante: "prim",
              },
            ]
          : [];
      }
      default:
        return [];
    }
  };

  const acoes = acoesStage(stage);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 md:p-6">
      {/* Glow cyberpunk. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />
      </div>

      {/* PHONE-FRAME — única superfície do celular (§15/§34). */}
      <div className="relative z-10 w-full max-w-md">
        <div className="overflow-hidden rounded-[2rem] border border-emerald-500/25 bg-slate-900/80 shadow-2xl shadow-emerald-900/40 backdrop-blur">
          {/* Notch premium. */}
          <div className="relative mx-auto mt-0 h-6 w-40 rounded-b-2xl bg-black/60" />

          {/* Cabeçalho do celular. */}
          <div className="flex items-center justify-between border-b border-slate-800/60 bg-slate-950/70 px-4 py-2">
            <div className="flex items-center gap-2">
              <Smartphone className="size-4 text-emerald-300" />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300">
                Celular da Cidadela
              </span>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Bot className="size-3 text-emerald-300" /> Pracinha ativo
            </span>
          </div>

          {/* Messages — rolagem vertical nativa. O login vive NO CHAT (§3/§5):
              card encaixado após a última mensagem, sem sair do celular. */}
          <div
            ref={scrollRef}
            onTouchStart={() => setMostrarHintScroll(false)}
            onWheel={() => setMostrarHintScroll(false)}
            className="h-[380px] overflow-y-auto p-3 space-y-3"
          >
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.autor === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed animate-in slide-in-from-bottom-2 ${
                    m.autor === "user"
                      ? "rounded-br-sm bg-emerald-600 text-white"
                      : "rounded-bl-sm bg-slate-800 text-slate-100"
                  }`}
                >
                  {m.texto}
                </div>
              </div>
            ))}

            {stage === "identificacao" && !perfil && (
              <ChatAuthCard onPronto={() => avancar()} />
            )}

            {mostrarHintScroll && msgs.length > 0 && (
              <div className="flex justify-center pt-1">
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                  <ArrowDown className="size-3" /> deslize para explorar
                </span>
              </div>
            )}
          </div>

          {/* Stage Area. */}
          <div className="border-t border-slate-800 bg-slate-950/70 p-3">
            {stage === "destino" && (
              <div className="space-y-2">
                {DESTINOS.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => escolherDestinoClick(d.key)}
                    className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-left transition hover:border-emerald-400 hover:bg-emerald-500/20 active:scale-[0.99] animate-in slide-in-from-bottom-2"
                  >
                    <p className="text-sm font-bold text-emerald-300">{d.rotulo}</p>
                    <p className="text-xs text-slate-400">{d.descricao}</p>
                  </button>
                ))}
              </div>
            )}

            {acoes.length > 0 && (
              <div className="space-y-2">
                {acoes.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setMostrarHintScroll(false);
                      a.acao();
                    }}
                    className={`w-full rounded-2xl px-4 py-3 text-sm font-bold transition active:scale-[0.99] ${
                      a.variante === "prim"
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-900/40 hover:from-emerald-500 hover:to-emerald-400"
                        : "border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {a.rotulo}
                  </button>
                ))}
              </div>
            )}

            {/* Chat input — disponível em qualquer estágio que aceite resposta. */}
            <div className="mt-2 flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") enviarTexto(input);
                }}
                placeholder="Escreva ao Pracinha..."
                maxLength={240}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-500/60"
              />
              <button
                onClick={() => enviarTexto(input)}
                disabled={!input.trim()}
                className="rounded-xl bg-emerald-600 px-3 text-white transition hover:bg-emerald-500 disabled:opacity-40"
                aria-label="Enviar"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>

          {/* Fechar do celular — recusa o tour (§31) não mostra "Pular". */}
          <div className="flex items-center justify-center border-t border-slate-800 bg-slate-950/70 p-2">
            <span className="text-[10px] text-slate-500">Tour obrigatório do iniciante · ~1 min</span>
          </div>
        </div>
      </div>
    </div>
  );
}
