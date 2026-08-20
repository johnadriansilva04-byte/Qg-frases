import { useEffect, useRef, useState } from "react";
import { BadgeDollarSign, Loader2, Mic, MicOff, Newspaper, Send } from "lucide-react";
import { ControlledMonetagButton } from "@/components/ControlledMonetagButton";
import { AIService } from "../ai/AIService";
import { personagem } from "../career/rpg/personagens";
import {
  contextoJornalista,
  gerarPerguntaJornalista,
  interpretarDeclaracao,
  type DadosEntrevista,
} from "../career/entrevistaEngine";
import type { CareerState, DeclaracaoEntrevista } from "../career/types";

// Tipos para Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type Msg = { autor: "jornalista" | "user"; texto: string };
type Etapa = "intro" | "q1" | "q2" | "final";

const SUGESTOES = [
  "Trabalhamos duro a semana inteira. O resultado é consequência.",
  "O mérito é todo do grupo. Esses botões jogam demais.",
  "O adversário fala demais. Dentro de campo não faz nada.",
];

type Props = {
  career: CareerState;
  dados: DadosEntrevista;
  /** Recompensa da coletiva (coletada somente no botão final). */
  ganho: number;
  coachNome: string;
  /**
   * Chamado pelo botão final [COLETAR] — é o ÚNICO lugar onde o "onClick" de
   * processamento (anúncio + recompensa + persistência) dispara (§9).
   */
  onColetar: (declaracoes: DeclaracaoEntrevista[]) => void;
  onFechar: () => void;
};

/**
 * Entrevista Coletiva pós-jogo conduzida pelo JORNALISTA-IA (Cícero Ramos):
 * ele conhece os fatos reais da partida, pergunta, interpreta as respostas
 * livres do treinador e reage. A recompensa só é processada no botão final de
 * coleta — durante a entrevista nenhum "onClick" de anúncio dispara (§7-§9).
 */
export function EntrevistaColetiva({ career, dados, ganho, coachNome, onColetar, onFechar }: Props) {
  const jornalista = personagem("npc-jornalista");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [etapa, setEtapa] = useState<Etapa>("intro");
  const [carregando, setCarregando] = useState(true);
  const [input, setInput] = useState("");
  const [declaracoes, setDeclaracoes] = useState<DeclaracaoEntrevista[]>([]);
  const [pergunta2, setPergunta2] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Intro + primeira pergunta do jornalista (com contexto real escopado).
  useEffect(() => {
    let vivo = true;
    const intro: Msg = {
      autor: "jornalista",
      texto:
        `Boa noite, ${coachNome}. ${jornalista.nome}, da imprensa. ` +
        `${dados.timeUserNome} ${dados.placarUser}x${dados.placarAdv} ${dados.timeAdvNome}, ${dados.competicao}. Pode começar?`,
    };
    setMsgs([intro]);
    void gerarPerguntaJornalista(career, dados)
      .then((q1) => {
        if (!vivo) return;
        setMsgs((m) => [...m, { autor: "jornalista", texto: q1 }]);
        setEtapa("q1");
      })
      .catch(() => {
        if (!vivo) return;
        setMsgs((m) => [
          ...m,
          { autor: "jornalista", texto: "—Como o senhor avalia a atuação do time hoje?" },
        ]);
        setEtapa("q1");
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, carregando]);

  // Configuração do reconhecimento de voz (Web Speech API)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const SpeechRecognitionClass = (window as unknown as { SpeechRecognition?: any }).SpeechRecognition 
      || (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;
    
    if (!SpeechRecognitionClass) return;
    
    const recognition = new SpeechRecognitionClass();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setGravando(false);
    };
    
    recognition.onerror = () => {
      setGravando(false);
    };
    
    recognition.onend = () => {
      setGravando(false);
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      recognition.abort();
    };
  }, []);

  const toggleGravacao = () => {
    if (!recognitionRef.current) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }
    
    if (gravando) {
      recognitionRef.current.abort();
      setGravando(false);
    } else {
      recognitionRef.current.start();
      setGravando(true);
    }
  };

  /** O jornalista IA reage à resposta livre do treinador (§7, §11). */
  const reacaoJornalista = async (decl: DeclaracaoEntrevista): Promise<string> => {
    const fallback =
      decl.tom === "provocacao"
        ? "Forte. Isso vira manchete amanhã — o rival vai ler cada palavra."
        : decl.tom === "humildade"
          ? "Discurso de grupo, respeito ao torcedor. Bonito. Registrado."
          : decl.tom === "orgulho"
            ? "Confiança é bom. Manchete pronta. A próxima rodada cobra."
            : "Registrado. A edição de amanhã conta a sua versão.";
    try {
      const resposta = await AIService.generatePersona(
        jornalista.systemPrompt,
        `Contexto escopado:\n${contextoJornalista(career, dados)}` +
          `\nO treinador respondeu: "${decl.texto}"\nInterpretação do sistema: ${decl.interpretacao}.` +
          `\nReaja com 1 frase de imprensa, sem inventar fatos.`,
      );
      return resposta ?? fallback;
    } catch {
      return fallback;
    }
  };

  const responder = (texto: string) => {
    const limpo = texto.trim();
    if (!limpo || carregando || etapa === "final") return;
    const decl = interpretarDeclaracao(limpo, dados);
    setDeclaracoes((d) => [...d, decl]);
    setMsgs((m) => [...m, { autor: "user", texto: limpo }]);
    setInput("");
    setCarregando(true);

    void (async () => {
      const reacao = await reacaoJornalista(decl);
      setMsgs((m) => [...m, { autor: "jornalista", texto: reacao }]);

      if (etapa === "q1") {
        // UMA pergunta de acompanhamento adaptada à resposta (§7) — sem
        // repetir pergunta nem abrir uma "segunda entrevista" (§8).
        let q2 = pergunta2;
        if (!q2) {
          q2 =
            decl.tom === "provocacao"
              ? `—Seu rival vai ler isso. Algum recado direto para o ${dados.timeAdvNome}, ou a resposta vem em campo?`
              : `—Última: o que o senhor promete à torcida para a sequência do ${dados.competicao}?`;
          setPergunta2(q2);
        }
        window.setTimeout(() => {
          setMsgs((m) => [...m, { autor: "jornalista", texto: q2! }]);
          setEtapa("q2");
          setCarregando(false);
        }, 650);
        return;
      }

      // Segunda resposta: encerra a coletiva (§9, §10 — mensagem curta).
      setEtapa("final");
      window.setTimeout(() => {
        setMsgs((m) => [
          ...m,
          {
            autor: "jornalista",
            texto: "Coletiva encerrada. Obrigado, treinador. Registrado e impresso.",
          },
        ]);
        setCarregando(false);
      }, 750);
    })();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex h-[540px] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Cabeçalho do chat: o jornalista é o personagem (§1, §7). */}
        <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-950/80 px-4 py-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-sky-500/20 text-xl">
            {jornalista.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{jornalista.nome}</p>
            <p className="text-[10px] uppercase tracking-widest text-sky-400">
              {jornalista.cargo} · coletiva pós-jogo
            </p>
          </div>
          <button
            onClick={onFechar}
            className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-800 hover:text-white"
          >
            Pular
          </button>
        </div>

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.autor === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.autor === "user"
                    ? "rounded-br-sm bg-emerald-600 text-white"
                    : "rounded-bl-sm bg-slate-800 text-slate-100"
                }`}
              >
                {m.texto}
              </div>
            </div>
          ))}
          {carregando && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-slate-800 px-3 py-2 text-xs text-slate-400">
                <Loader2 className="size-3 animate-spin" /> {jornalista.nome} está digitando...
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="border-t border-slate-800 bg-slate-950/80 p-3">
          {etapa === "final" && !carregando ? (
            // §10: mensagem curta + §9: o "onClick" de processamento SÓ existe
            // neste botão de coleta (com aviso de patrocinador).
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-3 text-center">
                <p className="text-sm font-bold text-emerald-300">Entrevista concluída.</p>
                <p className="mt-0.5 text-xs text-slate-400">Recompensa disponível: +{ganho} SOV</p>
              </div>
              <ControlledMonetagButton
                className="w-full text-xs"
                message="Para coletar a recompensa da coletiva, uma página de patrocinador pode abrir em uma nova aba. Deseja continuar?"
                onDisparado={() => onColetar(declaracoes)}
              >
                <span className="flex w-full items-center justify-center gap-2">
                  <BadgeDollarSign className="size-4" /> Finalizar coletiva (+{ganho} SOV)
                </span>
              </ControlledMonetagButton>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <Mic className="size-3" /> Sua resposta — texto livre vale contexto (§11)
              </p>
              {/* Texto livre: a IA interpreta o significado (§11). */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && responder(input)}
                  placeholder="Escreva sua resposta ao jornalista..."
                  maxLength={240}
                  disabled={carregando}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500/60 disabled:opacity-40"
                />
                <button
                  onClick={toggleGravacao}
                  disabled={carregando || etapa === "final"}
                  className={`rounded-xl px-3 transition ${
                    gravando 
                      ? "bg-red-600 hover:bg-red-500" 
                      : "bg-slate-700 hover:bg-slate-600"
                  } disabled:opacity-40`}
                  aria-label={gravando ? "Parar gravação" : "Iniciar gravação"}
                  title={gravando ? "Parar gravação" : "Falar com microfone"}
                >
                  {gravando ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </button>
                <button
                  onClick={() => responder(input)}
                  disabled={carregando || !input.trim()}
                  className="rounded-xl bg-sky-600 px-3 text-white transition hover:bg-sky-500 disabled:opacity-40"
                  aria-label="Enviar"
                >
                  <Send className="size-4" />
                </button>
              </div>
              {/* Sugestões rápidas (atalhos; texto livre continua preferencial). */}
              <div className="grid gap-1.5">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    disabled={carregando || etapa === "final"}
                    onClick={() => responder(s)}
                    className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-left text-[11px] text-slate-300 transition hover:border-sky-500/50 hover:bg-slate-800 disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
