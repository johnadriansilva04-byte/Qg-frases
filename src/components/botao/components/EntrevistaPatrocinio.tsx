import { useEffect, useRef, useState } from "react";
import { Mic, BadgeDollarSign, Loader2, Building2 } from "lucide-react";
import { coletivaPosJogo } from "../ai/aiContent";
import type { MatchEndData } from "./MatchEndScreen";

type Msg = { autor: "empresario" | "user"; texto: string };
type Etapa = "intro" | "q1" | "q2" | "final";

const MARCAS = [
  "Banco Soberano SOV",
  "Cervejaria Ambrósio",
  "Rede Pracinha de Mercados",
  "Botões & Cia Sportswear",
  "Posto Estrela do Bairro",
];

const RESPOSTAS = [
  { rotulo: "Resposta firme", texto: "Trabalhamos duro a semana inteira. O resultado é consequência." },
  { rotulo: "Elogiar o elenco", texto: "O mérito é todo do grupo. Esses botões jogam demais." },
  { rotulo: "Desconversar com humor", texto: "Pergunta difícil... aceito responder em troca de patrocínio!" },
];

type Props = {
  dados: MatchEndData;
  /** Soberania concedida ao concluir a entrevista. */
  ganho: number;
  coachNome: string;
  onConcluir: () => void;
  onFechar: () => void;
};

/**
 * Entrevista de patrocínio pós-jogo: após o usuário liberar o anúncio, um
 * empresário/marca "entrevista" o treinador (perguntas geradas pela IA
 * acoplada — AIService/coletiva) e fecha o patrocínio ao final.
 */
export function EntrevistaPatrocinio({ dados, ganho, coachNome, onConcluir, onFechar }: Props) {
  const [marca] = useState(() => MARCAS[Math.floor(Math.random() * MARCAS.length)] ?? MARCAS[0]!);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [etapa, setEtapa] = useState<Etapa>("intro");
  const [carregando, setCarregando] = useState(true);
  const [pergunta2, setPergunta2] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let vivo = true;
    const intro: Msg = {
      autor: "empresario",
      texto: `Boa noite, ${coachNome}! Aqui é o Seu Rubens, da ${marca}. Vi o jogo: ${dados.timeUserNome} ${dados.placarUser}×${dados.placarAdv} ${dados.timeAdvNome}. Quero patrocinar você — mas antes, duas perguntinhas rápidas para a imprensa.`,
    };
    setMsgs([intro]);
    void coletivaPosJogo({
      golsPro: dados.placarUser,
      golsContra: dados.placarAdv,
      timeNome: dados.timeUserNome,
      adversarioNome: dados.timeAdvNome,
      coach: coachNome,
      competicaoNome: dados.competicao,
    })
      .then((perguntas) => {
        if (!vivo) return;
        const q1 = perguntas[0] ?? "Como o senhor avalia a atuação do time hoje?";
        const q2 = perguntas[1] ?? "O que muda no time com um patrocinador forte ao lado?";
        setMsgs((m) => [...m, { autor: "empresario", texto: q1 }]);
        setEtapa("q1");
        // guarda a segunda pergunta para depois via closure no estado
        setPergunta2(q2);
      })
      .catch(() => {
        if (!vivo) return;
        setMsgs((m) => [
          ...m,
          { autor: "empresario", texto: "Como o senhor avalia a atuação do time hoje?" },
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

  const responder = (texto: string) => {
    setMsgs((m) => [...m, { autor: "user", texto }]);
    if (etapa === "q1") {
      setEtapa("q2");
      setCarregando(true);
      // pequena pausa para parecer conversa real
      window.setTimeout(() => {
        setMsgs((m) => [
          ...m,
          { autor: "empresario", texto: pergunta2 ?? "E o que o senhor promete para a próxima rodada?" },
        ]);
        setCarregando(false);
      }, 700);
      return;
    }
    if (etapa === "q2") {
      setEtapa("final");
      setCarregando(true);
      window.setTimeout(() => {
        setMsgs((m) => [
          ...m,
          {
            autor: "empresario",
            texto: `Gostei do que ouvi! Fechado: a ${marca} estampa o seu time a partir de agora. O primeiro aporte já caiu: +${ganho} Soberania. Bom campeonato, ${coachNome}!`,
          },
        ]);
        setCarregando(false);
      }, 900);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex h-[520px] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* cabeçalho do chat */}
        <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-950/80 px-4 py-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
            <Building2 className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">Seu Rubens · {marca}</p>
            <p className="text-[10px] uppercase tracking-widest text-emerald-400">
              entrevista de patrocínio
            </p>
          </div>
          <button
            onClick={onFechar}
            className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-800 hover:text-white"
          >
            Pular
          </button>
        </div>

        {/* mensagens */}
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
                <Loader2 className="size-3 animate-spin" /> Seu Rubens está digitando...
              </div>
            </div>
          )}
        </div>

        {/* ações */}
        <div className="border-t border-slate-800 bg-slate-950/80 p-3">
          {etapa === "final" && !carregando ? (
            <button
              onClick={onConcluir}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-black uppercase tracking-widest text-slate-950 transition hover:from-amber-400 hover:to-orange-400 active:scale-[0.99]"
            >
              <BadgeDollarSign className="size-4" /> Receber patrocínio (+{ganho} SOV)
            </button>
          ) : (
            <div className="space-y-2">
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <Mic className="size-3" /> Sua resposta
              </p>
              <div className="grid gap-2">
                {RESPOSTAS.map((r) => (
                  <button
                    key={r.rotulo}
                    disabled={carregando || etapa === "final"}
                    onClick={() => responder(r.texto)}
                    className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-left text-xs text-slate-200 transition hover:border-emerald-500/50 hover:bg-slate-800 disabled:opacity-40"
                  >
                    <span className="font-bold text-emerald-400">{r.rotulo}:</span> {r.texto}
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
