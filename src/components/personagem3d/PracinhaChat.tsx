/**
 * PRACINHA CHAT — Chat de ajuda interativo com o Pracinha.
 *
 * Botão flutuante no canto inferior direito. Ao clicar:
 * - Pracinha 3D aparece no canto (pose "talking")
 * - Balão de chat abre ao lado
 * - Respostas pré-definidas sobre a plataforma
 *
 * Não usa IA externa — respostas são templates locais sobre
 * navegação, regras dos jogos e funcionalidades.
 */
import { useCallback, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { PracinhaCharacter3D } from "./PracinhaCharacter3D";

/* ─── Base de conhecimento do Pracinha ─── */

interface RespostaPracinha {
  keywords: string[];
  resposta: string;
}

const RESPOSTAS: RespostaPracinha[] = [
  {
    keywords: ["futebol", "botão", "jogo", "partida", "campo"],
    resposta: "O Futebol de Botão é o jogo principal! Você controla 5 botões-jogadores no campo. Escolha entre Amistoso (vs IA), Amistoso Online (1v1) ou Campeonato Online (torneios). Acesse pelo menu principal.",
  },
  {
    keywords: ["carreira", "campanha", "treinador", "clube", "temporada"],
    resposta: "No Modo Carreira você é um treinador subindo de divisão. Comece em clubes pequenos, gerencie finanças, contrate jogadores e conquiste títulos. Acesse em 'Carreira no Campus' no menu do futebol.",
  },
  {
    keywords: ["sov", "moeda", "dinheiro", "saldo", "coins"],
    resposta: "SOV (Soberania) é a moeda oficial da Cidadela. Você ganha jogando, completando atividades e vendendo cotas no mercado. Use para apostas online, melhorias do clube e investimentos.",
  },
  {
    keywords: ["clube", "meu time", "personalizar", "cores", "tática"],
    resposta: "Para personalizar seu clube, clique em 'CLUBE' no menu do futebol. Lá você edita nome, cores, sigla, tática e evolução dos botões. Suas mudanças aparecem em todos os modos de jogo.",
  },
  {
    keywords: ["online", "multiplayer", "adversário", "jogador"],
    resposta: "Para jogar online, você precisa ter conta (faça login pela Cidadela). Depois, escolha 'Amistoso Online' para 1v1 rápido ou 'Campeonato Online' para torneios com múltiplos jogadores.",
  },
  {
    keywords: ["qi", "teste", "inteligência", "raciocínio", "avaliação"],
    resposta: "O Teste de QI avalia raciocínio não verbal com figuras matrizes. Não é um teste oficial — é uma referência interna da Cidadela. Acesse no Campus Universitário. Resultado é salvo no seu perfil.",
  },
  {
    keywords: ["cidadela", "profissão", "estudante", "empresário"],
    resposta: "A Cidadela dos Clássicos é o coração da plataforma. Escolha uma profissão (Estudante, Técnico, Empresário, Bibliotecário ou Pesquisador) e complete atividades diárias para ganhar SOV e reputação.",
  },
  {
    keywords: ["transferência", "mercado", "comprar", "vender", "jogador"],
    resposta: "O Mercado de Transferências permite comprar e vender cotas de clubes, investir na Bolsa e negociar jogadores. Acesse pelo dashboard da Carreira em 'Mercado de Clubes'.",
  },
  {
    keywords: ["torneio", "campeonato", "mata-mata", "copa"],
    resposta: "O Campeonato Online suporta Mata-Mata (eliminação) e Pontos Corridos. Crie uma sala, defina o formato e prêmio, e compartilhe o link. O bracket visual acompanha cada fase em tempo real.",
  },
  {
    keywords: ["ajuda", "como", "onde", "tutorial", "guia"],
    resposta: "Estou aqui para ajudar! Pergunte sobre qualquer módulo: Futebol, Carreira, Campeonato Online, Teste de QI, Cidadela, Transferências, ou qualquer outra coisa da plataforma.",
  },
];

function buscarResposta(pergunta: string): string {
  const lower = pergunta.toLowerCase();
  for (const r of RESPOSTAS) {
    if (r.keywords.some((kw) => lower.includes(kw))) {
      return r.resposta;
    }
  }
  return "Hmm, não tenho certeza sobre isso. Tente perguntar sobre Futebol, Carreira, Campeonato Online, SOV, Teste de QI ou a Cidadela. Estou aqui pra ajudar!";
}

/* ─── Componentes ─── */

interface Mensagem {
  id: number;
  texto: string;
  isUser: boolean;
}

export function PracinhaChat() {
  const [aberto, setAberto] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [historico, setHistorico] = useState<Mensagem[]>([
    {
      id: 0,
      texto: "Fala, cidadão! Sou o Pracinha, seu guia na Cidadela dos Clássicos. Pode perguntar sobre qualquer coisa — futebol, carreira, moedas, tutoriais. Tô aqui pra ajudar!",
      isUser: false,
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  const enviar = useCallback(() => {
    const texto = mensagem.trim();
    if (!texto) return;

    const userMsg: Mensagem = { id: nextId.current++, texto, isUser: true };
    setHistorico((h) => [...h, userMsg]);
    setMensagem("");

    // Resposta do Pracinha (com delay simulado)
    setTimeout(() => {
      const resposta = buscarResposta(texto);
      setHistorico((h) => [
        ...h,
        { id: nextId.current++, texto: resposta, isUser: false },
      ]);
      // Auto-scroll
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    }, 600);
  }, [mensagem]);

  return (
    <>
      {/* Botão flutuante */}
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          title="Pedir ajuda ao Pracinha"
          className="fixed bottom-4 right-4 z-[70] flex size-12 items-center justify-center rounded-full border border-amber-500/30 bg-gradient-to-br from-amber-900/40 to-slate-950/80 text-amber-400 shadow-lg shadow-amber-500/10 transition-all hover:scale-110 hover:border-amber-500/50 hover:shadow-amber-500/20"
        >
          <MessageCircle className="size-5" />
        </button>
      )}

      {/* Chat aberto */}
      {aberto && (
        <div className="fixed bottom-4 right-4 z-[80] flex items-end gap-2 max-w-[calc(100vw-2rem)]">
          {/* Pracinha 3D */}
          <div className="shrink-0 hidden sm:block">
            <PracinhaCharacter3D pose="talking" size={80} />
          </div>

          {/* Janela de chat */}
          <div className="flex flex-col w-80 max-h-[70vh] rounded-2xl border border-amber-500/20 bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-md shadow-2xl shadow-black/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
              <div className="flex size-7 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/25">
                <span className="text-xs">🎖️</span>
              </div>
              <div className="flex-1">
                <p className="font-display text-xs font-black text-white">Pracinha da FEB</p>
                <p className="text-[9px] text-emerald-400/70">● Online agora</p>
              </div>
              <button
                onClick={() => setAberto(false)}
                className="text-slate-500 hover:text-white transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Mensagens */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[400px]"
            >
              {historico.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.isUser
                        ? "bg-emerald-600/20 border border-emerald-500/20 text-emerald-100"
                        : "bg-white/5 border border-white/10 text-slate-300"
                    }`}
                  >
                    {msg.texto}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-white/5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviar()}
                  placeholder="Digite sua pergunta..."
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-amber-500/40 focus:outline-none"
                />
                <button
                  onClick={enviar}
                  disabled={!mensagem.trim()}
                  className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white transition-all hover:from-amber-500 hover:to-amber-400 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
