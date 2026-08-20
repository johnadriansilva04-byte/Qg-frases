import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bot,
  ClipboardList,
  ChevronLeft,
  FileSignature,
  Heart,
  MessageSquare,
  Newspaper,
  Send,
  Smartphone,
  Store,
  Trash2,
  Users,
  Search,
  UserPlus,
  Bell,
} from "lucide-react";
import { ControlledMonetagButton } from "@/components/ControlledMonetagButton";
import { supabase } from "@/integrations/supabase/client";
import { SovMarket } from "@/components/financial/SovMarket";
import { AuthScreen } from "../components/AuthScreen";
import {
  carregarChatCidadela,
  enviarMensagemCidadela,
  inicializarPracinha,
  registrarEventoMissao,
  resgatarMissao,
  type MensagemChatCidadela,
  type MissaoDiaria,
} from "@/lib/cidadela/pracinhaCore";
import type { ConversaCelular, DesafioPatrocinador } from "./types";
import { eventoPorId } from "./rpg/eventos";
import type { PostFeed } from "./rpg/types";
import type { MissaoTrilhaLocal } from "./trilhaIntegracao";
import type { Perfil } from "../online/auth";
import type { CidadelaPerfil } from "@/lib/cidadela/profissoes";
import { PainelReputacao } from "@/components/cidadela/PainelReputacao";
import { PainelMundo } from "@/components/cidadela/PainelMundo";

type AbaCelular = "mensagens" | "rede" | "missoes" | "grupo" | "mercado" | "notificacoes";

type JogadorOnline = {
  user_id: string;
  nome: string;
  profissao_atual: string | null;
  ultima_atividade: string;
  status: string;
};

type Props = {
  conversas: ConversaCelular[];
  /** Desafio de patrocinador ativo: vira uma conversa "virtual" no topo. */
  desafioPatrocinador?: DesafioPatrocinador | null;
  /** Feed da Rede da Cidadela (posts reativos ao jogo). */
  feed?: PostFeed[] | undefined;
  /** Missões locais da Trilha (válvula narrativa do Modo Carreira). */
  trilhaMissoes?: MissaoTrilhaLocal[] | undefined;
  /** Conversa cujo NPC está "digitando..." no momento. */
  npcDigitandoId?: string | null | undefined;
  onEnviarMensagem: (conversaId: string, texto: string) => void;
  onExcluirConversa: (conversaId: string) => void;
  /** Escolha num dilema RPG anexado à conversa. */
  onEscolhaRpg?: ((conversaId: string, indice: number) => void) | undefined;
  onVoltar: () => void;
  userId?: string | null | undefined;
  nomeJogador?: string | null | undefined;
  /** Callback quando login é realizado no celular */
  onLogin?: ((perfil: Perfil) => void) | undefined;
  /** Perfil da Cidadela para notificações */
  perfilCidadela?: CidadelaPerfil | null;
};

export function CelularConversas({
  conversas,
  desafioPatrocinador,
  feed = [],
  trilhaMissoes = [],
  npcDigitandoId = null,
  onEnviarMensagem,
  onExcluirConversa,
  onEscolhaRpg,
  onVoltar,
  userId = null,
  nomeJogador = null,
  onLogin,
  perfilCidadela,
}: Props) {
  const [aba, setAba] = useState<AbaCelular>("mensagens");
  const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null);
  const [textoInput, setTextoInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [missoes, setMissoes] = useState<MissaoDiaria[]>([]);
  const [chat, setChat] = useState<MensagemChatCidadela[]>([]);
  const [motorIA, setMotorIA] = useState("local");
  const [carregandoMissoes, setCarregandoMissoes] = useState(false);
  const [carregandoChat, setCarregandoChat] = useState(false);
  const [resgatando, setResgatando] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  // IDs de conversas já abertas nesta sessão — limpa o indicador de "não lida"
  // ao abrir, evitando um ponto verde travado que nunca some.
  const [lidas, setLidas] = useState<Set<string>>(new Set());
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [jogadoresOnline, setJogadoresOnline] = useState<JogadorOnline[]>([]);
  const [carregandoJogadores, setCarregandoJogadores] = useState(false);
  const [pesquisaJogador, setPesquisaJogador] = useState("");

  // Títulos das abas
  const tituloAba: Record<AbaCelular, string> = {
    mensagens: "Mensagens",
    rede: "Rede Social",
    missoes: "Missões Diárias",
    grupo: "Grupo da Cidadela",
    mercado: "Mercado SOV",
    notificacoes: "Notificações",
  };

  // Mostrar login se não tiver userId e onLogin estiver disponível
  useEffect(() => {
    if (!userId && onLogin) {
      setMostrarLogin(true);
    } else {
      setMostrarLogin(false);
    }
  }, [userId, onLogin]);

  const handleLogin = (perfil?: Perfil | undefined) => {
    setMostrarLogin(false);
    if (perfil) onLogin?.(perfil);
  };
  // a partir do estado real — nunca gera mensagem automática sem evento.
  const convPatrocinador: ConversaCelular | null = desafioPatrocinador && !desafioPatrocinador.concluido
    ? {
        id: "conv-patrocinador",
        tipo: "patrocinador",
        nome: desafioPatrocinador.patrocinador,
        avatar: "💰",
        cargo: "Patrocinador",
        mensagens: [
          {
            id: "pat-msg",
            texto: `${desafioPatrocinador.mensagem}\n\nRecompensa: +${desafioPatrocinador.recompensa} de soberania.`,
            remetente: "outro",
            timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          },
        ],
        naoLida: true,
      }
    : null;

  // Filtra conversas malformadas (sem mensagens) que poderiam quebrar a UI ao
  // clicar — só exibe conversas válidas com ao menos 1 mensagem.
  const conversasValidas = conversas.filter((c) => c && c.mensagens && c.mensagens.length > 0);
  const todasConversas = convPatrocinador
    ? [convPatrocinador, ...conversasValidas]
    : conversasValidas;

  const conversaAtiva = todasConversas.find((c) => c.id === conversaSelecionada) ?? null;

  useEffect(() => {
    if (conversaSelecionada && !conversaAtiva) setConversaSelecionada(null);
  }, [conversaSelecionada, conversaAtiva]);


  const abrirConversa = (id: string) => {
    setConversaSelecionada(id);
    setLidas((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleEnviar = () => {
    if (!textoInput.trim() || !conversaSelecionada || conversaSelecionada === "conv-patrocinador")
      return;
    onEnviarMensagem(conversaSelecionada, textoInput);
    setTextoInput("");
  };

  const carregarMissoes = useCallback(async () => {
    if (!userId) return;
    setCarregandoMissoes(true);
    const diagnostico = await inicializarPracinha(userId);
    setMissoes(diagnostico.missoes);
    setMotorIA(diagnostico.motorIA);
    setCarregandoMissoes(false);
  }, [userId]);

  const carregarChat = useCallback(async () => {
    setCarregandoChat(true);
    setChat(await carregarChatCidadela());
    setCarregandoChat(false);
  }, []);

  const carregarJogadoresOnline = useCallback(async () => {
    if (!userId) return;
    setCarregandoJogadores(true);
    try {
      // Atualiza status do usuário atual
      await supabase.rpc("cidadela_atualizar_status", { p_status: "online" });
      
      // Carrega lista de jogadores
      const { data, error } = await supabase.rpc("cidadela_listar_jogadores");
      if (!error && data) {
        setJogadoresOnline(data as JogadorOnline[]);
      }
    } catch (err) {
      console.warn("[Celular] Erro ao carregar jogadores online:", err);
    } finally {
      setCarregandoJogadores(false);
    }
  }, [userId]);

  useEffect(() => {
    if (aba === "missoes") void carregarMissoes();
    if (aba === "mercado") void registrarEventoMissao("explorar_pergaminhos");
    if (aba === "grupo") void carregarJogadoresOnline();
  }, [aba, carregarMissoes, carregarJogadoresOnline]);

  useEffect(() => {
    if (aba !== "grupo") return;
    void carregarChat();
    const canal = supabase
      .channel("cidadela-chat-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "cidadela_chat_messages" },
        (payload) => {
          const nova = payload.new as MensagemChatCidadela;
          setChat((prev) => (prev.some((m) => m.id === nova.id) ? prev : [...prev, nova].slice(-80)));
        },
      )
      .subscribe();
    const intervalo = window.setInterval(() => void carregarChat(), 20000);
    const intervaloJogadores = window.setInterval(() => void carregarJogadoresOnline(), 30000);
    return () => {
      window.clearInterval(intervalo);
      window.clearInterval(intervaloJogadores);
      void supabase.removeChannel(canal);
    };
  }, [aba, carregarChat, carregarJogadoresOnline]);

  const resgatar = async (missao: MissaoDiaria) => {
    setResgatando(missao.id);
    const saldo = await resgatarMissao(missao.id);
    if (saldo !== null) {
      setFeedback(`Missão resgatada: saldo ${saldo.toFixed(2)} SOV.`);
      await carregarMissoes();
    } else {
      setFeedback("Não foi possível resgatar esta missão agora.");
    }
    setResgatando(null);
  };

  const enviarNoGrupo = async () => {
    if (!userId || !chatInput.trim()) return;
    const ok = await enviarMensagemCidadela(userId, nomeJogador ?? "Recruta", chatInput);
    if (ok) {
      setChatInput("");
      await carregarChat();
    } else {
      setFeedback("Mensagem não enviada. Verifique sua conexão.");
    }
  };

  // Se estiver mostrando login, renderiza AuthScreen dentro do celular
  if (mostrarLogin) {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="phone-frame">
          <div className="phone-notch" />
          <div className="phone-screen">
            <div className="phone-chat-head">
              <button onClick={onVoltar} className="phone-back" aria-label="Voltar">
                <ChevronLeft className="size-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">Login da Cidadela</p>
                <p className="truncate text-[10px] text-slate-400">Entre para acessar o celular</p>
              </div>
              <Smartphone className="size-4 text-slate-400" />
            </div>
            <div className="phone-chat-body p-4">
              <AuthScreen onPronto={handleLogin} />
            </div>
          </div>
        </div>
      </div>
    );
  }


  if (conversaAtiva && aba === "mensagens") {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="phone-frame">
          <div className="phone-notch" />

          <div className="phone-screen">
            {/* Cabeçalho da conversa */}
            <div className="phone-chat-head">
              <button onClick={() => setConversaSelecionada(null)} className="phone-back" aria-label="Voltar">
                <ChevronLeft className="size-5" />
              </button>
              <div className="phone-avatar">{conversaAtiva.avatar}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{conversaAtiva.nome}</p>
                <p className="truncate text-[10px] text-amber-300">{conversaAtiva.cargo}</p>
              </div>
              {conversaAtiva.id !== "conv-patrocinador" && (
                <button
                  onClick={() => {
                    onExcluirConversa(conversaAtiva.id);
                    setConversaSelecionada(null);
                  }}
                  className="text-slate-400 hover:text-red-400 transition"
                  aria-label="Excluir conversa"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>

            {/* Mensagens */}
            <div className="phone-chat-body">
              {conversaAtiva.mensagens.map((msg) => (
                <div
                  key={msg.id}
                  className={`phone-bubble-wrap ${
                    msg.remetente === "eu" ? "phone-bubble-me" : "phone-bubble-them"
                  }`}
                >
                  <div
                    className={`phone-bubble ${
                      conversaAtiva.eventoRpg?.tom === "terror" && msg.remetente === "outro"
                        ? "border border-red-900/60 bg-red-950/40"
                        : conversaAtiva.eventoRpg?.tom === "suspense" && msg.remetente === "outro"
                          ? "border border-indigo-900/60 bg-indigo-950/40"
                          : ""
                    }`}
                  >
                    <p className="whitespace-pre-line text-sm leading-relaxed">{msg.texto}</p>
                  </div>
                  <span className="phone-bubble-time">{msg.timestamp}</span>
                </div>
              ))}

              {/* NPC digitando... */}
              {npcDigitandoId === conversaAtiva.id && (
                <div className="phone-bubble-wrap phone-bubble-them">
                  <div className="phone-bubble">
                    <p className="text-sm italic text-slate-400">digitando…</p>
                  </div>
                </div>
              )}

              {/* Escolhas do dilema RPG (se ainda não respondido) */}
              {conversaAtiva.eventoRpg &&
                !conversaAtiva.eventoRpg.respondido &&
                (() => {
                  const ev = eventoPorId(conversaAtiva.eventoRpg.eventoId);
                  if (!ev) return null;
                  return (
                    <div className="mt-3 space-y-2 rounded-xl border border-amber-800/50 bg-amber-950/30 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                        {ev.tom === "terror" ? "⚠ Decisão sob pressão" : "Sua decisão"}
                      </p>
                      {ev.escolhas.map((esc, i) => (
                        <button
                          key={i}
                          onClick={() => onEscolhaRpg?.(conversaAtiva.id, i)}
                          className="w-full rounded-lg border border-amber-700/40 bg-slate-900/80 px-3 py-2.5 text-left text-xs font-semibold text-amber-100 transition hover:border-amber-500 hover:bg-amber-900/30 active:scale-[0.98]"
                        >
                          {esc.texto}
                        </button>
                      ))}
                    </div>
                  );
                })()}

              {/* Link de ação genérico (ex.: convite do Ritual da Trilha). */}
              {conversaAtiva.linkExterno ? (
                <div className="mt-3 rounded-xl border border-purple-800/50 bg-purple-950/30 p-3">
                  <Link
                    to={conversaAtiva.linkExterno.to}
                    className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-purple-500"
                  >
                    {conversaAtiva.linkExterno.rotulo}
                  </Link>
                </div>
              ) : null}

              {/* Link para o Cartório (pedido pendente da escolha escolhida). */}
              {conversaAtiva.linkCartorio ? (
                <div className="mt-3 rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                    📎 Cartório da Cidadela
                  </p>
                  <Link
                    to={conversaAtiva.linkCartorio}
                    className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500"
                  >
                    <FileSignature className="size-4" />
                    Abrir pedido na Biblioteca
                  </Link>
                </div>
              ) : null}
            </div>

            {/* Input de mensagem (apenas para conversas do usuário, não a virtual do patrocinador) */}
            {conversaAtiva.id !== "conv-patrocinador" &&
            !(conversaAtiva.eventoRpg && !conversaAtiva.eventoRpg.respondido) ? (
              <div className="phone-chat-input">
                <input
                  type="text"
                  value={textoInput}
                  onChange={(e) => setTextoInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleEnviar()}
                  placeholder="Digite sua mensagem..."
                  className="phone-input"
                />
                <button
                  onClick={handleEnviar}
                  disabled={!textoInput.trim()}
                  className="phone-send"
                >
                  <Send className="size-4" />
                </button>
              </div>
            ) : (
              <div className="phone-chat-input">
                <button onClick={onVoltar} className="btn-ghost w-full text-xs">
                  Entendido — voltar
                </button>
              </div>
            )}

            {/* Botão de Monetag no celular (apenas em conversas ativas) */}
            {conversaAtiva.id !== "conv-patrocinador" && (
              <div className="px-3 pb-3">
                <ControlledMonetagButton
                  className="w-full text-[10px]"
                  message="Uma página de patrocinador pode abrir. Deseja continuar?"
                >
                  Ver patrocinador
                </ControlledMonetagButton>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="phone-frame">
        <div className="phone-notch" />
        <div className="phone-screen">
          <div className="phone-chat-head">
            <button onClick={onVoltar} className="phone-back" aria-label="Voltar">
              <ChevronLeft className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{tituloAba[aba]}</p>
              <p className="truncate text-[10px] text-slate-400">Central integrada do jogador</p>
            </div>
            <Smartphone className="size-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-6 border-b border-slate-700/60 bg-slate-950/70 text-[10px] font-bold">
            {(
              [
                ["mensagens", MessageSquare, "Msgs"],
                ["rede", Newspaper, "Rede"],
                ["missoes", ClipboardList, "Missões"],
                ["grupo", Users, "Grupo"],
                ["mercado", Store, "Feira"],
                ["notificacoes", Bell, "Alertas"],
              ] as const
            ).map(([id, Icon, label]) => (
              <button
                key={id}
                onClick={() => {
                  setAba(id);
                  setConversaSelecionada(null);
                }}
                className={`flex flex-col items-center gap-1 px-1 py-2 transition ${
                  aba === id ? "bg-emerald-400/15 text-emerald-300" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="phone-chat-body">
            {feedback && (
              <div className="mb-3 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-xs text-cyan-100">
                {feedback}
              </div>
            )}

            {aba === "mensagens" && (
              todasConversas.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="size-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">Celular limpo</p>
                  <p className="text-xs text-slate-500 mt-1">
                    As notificações chegam sozinhas conforme sua carreira avança.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todasConversas.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => abrirConversa(conv.id)}
                      className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="phone-avatar">{conv.avatar}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-100">{conv.nome}</p>
                            {conv.naoLida && !lidas.has(conv.id) && (
                              <span className="w-2 h-2 rounded-full bg-green-400" />
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate">{conv.cargo}</p>
                          <p className="text-xs text-slate-500 truncate mt-1">
                            {conv.mensagens[conv.mensagens.length - 1]?.texto}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}

            {aba === "rede" && (
              feed.length === 0 ? (
                <div className="text-center py-8">
                  <Newspaper className="size-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">A Rede ainda está quieta</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Jogue uma partida e a Cidadela inteira vai comentar.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feed.map((post) => (
                    <article
                      key={post.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                    >
                      <header className="mb-2 flex items-center gap-2">
                        <span className="phone-avatar">{post.avatar}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">{post.autor}</p>
                          <p className="text-[10px] text-slate-500">
                            Rodada {post.rodada} · {post.timestamp}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                            post.selo === "noticia"
                              ? "bg-sky-400/15 text-sky-300"
                              : post.selo === "rumor"
                                ? "bg-purple-400/15 text-purple-300"
                                : post.selo === "rival"
                                  ? "bg-red-400/15 text-red-300"
                                  : "bg-emerald-400/15 text-emerald-300"
                          }`}
                        >
                          {post.selo}
                        </span>
                      </header>
                      <p className="text-xs leading-relaxed text-slate-200">{post.texto}</p>
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-pink-400">
                        <Heart className="size-3 fill-pink-400" /> {post.curtidas}
                      </div>
                      {post.comentarios.length > 0 && (
                        <div className="mt-2 space-y-1.5 border-t border-white/5 pt-2">
                          {post.comentarios.map((c, i) => (
                            <p key={i} className="text-[11px] leading-snug text-slate-400">
                              <span className="font-bold text-slate-300">
                                {c.avatar} {c.autor}:
                              </span>{" "}
                              {c.texto}
                            </p>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )
            )}

            {aba === "missoes" && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3">
                  <div className="flex items-center gap-2">
                    <Bot className="size-5 text-emerald-300" />
                    <div>
                      <p className="text-sm font-bold text-white">Rotina diária do Pracinha</p>
                      <p className="text-[10px] text-emerald-200">Motor {motorIA} • Banco Central protegendo o orçamento</p>
                    </div>
                  </div>
                </div>

                {/* Missões da Trilha — mesmos tabuleiros, mesmo universo. */}
                {trilhaMissoes.length > 0 && (
                  <div className="space-y-2 rounded-2xl border border-purple-400/20 bg-purple-400/5 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-300">
                      Ritual da Trilha · diário
                    </p>
                    {trilhaMissoes.map((m) => (
                      <div key={m.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-white">{m.titulo}</p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-400">{m.descricao}</p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-black ${
                              m.completa
                                ? "bg-emerald-400/20 text-emerald-300"
                                : "bg-purple-400/20 text-purple-200"
                            }`}
                          >
                            {m.completa ? "✓" : `${m.progresso}/${m.alvo}`}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                            style={{ width: `${Math.min(100, (m.progresso / m.alvo) * 100)}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[10px] text-slate-500">
                          Recompensa do ritual: +{m.recompensaSov} SOV ao completar na Trilha.
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {!userId ? (
                  <p className="py-6 text-center text-xs text-slate-400">Entre com sua conta para receber as 5 missões diárias.</p>
                ) : carregandoMissoes ? (
                  <p className="py-6 text-center text-xs text-slate-400">Pracinha calculando missões...</p>
                ) : missoes.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">Aplique a migração SQL da Cidadela para ativar as missões.</p>
                ) : (
                  missoes.map((missao) => {
                    const pct = Math.min(100, (missao.progresso / missao.alvo) * 100);
                    return (
                      <div key={missao.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-white">{missao.titulo}</p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-400">{missao.descricao}</p>
                          </div>
                          <span className="rounded-full bg-amber-300/20 px-2 py-1 text-[10px] font-black text-amber-200">
                            {missao.recompensa_sov.toFixed(2)} SOV
                          </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
                          <div className="h-full rounded-full bg-emerald-300" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{missao.progresso}/{missao.alvo}</span>
                          <span className="uppercase">{missao.status}</span>
                        </div>
                        {missao.status === "completa" && (
                          <button
                            onClick={() => void resgatar(missao)}
                            disabled={resgatando !== null}
                            className="mt-2 w-full rounded-xl bg-emerald-400 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-50"
                          >
                            {resgatando === missao.id ? "Resgatando..." : "Resgatar SOV"}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {aba === "grupo" && (
              <div className="space-y-3">
                {/* Barra de pesquisa */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar jogador..."
                    value={pesquisaJogador}
                    onChange={(e) => setPesquisaJogador(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {carregandoJogadores ? (
                  <div className="text-center py-8">
                    <div className="inline-block size-6 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
                    <p className="text-sm text-slate-400 mt-3">Carregando jogadores...</p>
                  </div>
                ) : jogadoresOnline.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="size-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Nenhum jogador online</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Seja o primeiro a entrar na Cidadela hoje!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      {jogadoresOnline.length} jogadores online
                    </p>
                    {jogadoresOnline
                      .filter((j) =>
                        j.nome.toLowerCase().includes(pesquisaJogador.toLowerCase()) ||
                        (j.profissao_atual && j.profissao_atual.toLowerCase().includes(pesquisaJogador.toLowerCase()))
                      )
                      .map((j) => (
                        <div
                          key={j.user_id}
                          className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-900/60 p-3"
                        >
                          <div className="relative">
                            <div className="phone-avatar">{j.profissao_atual === 'tecnico' ? '⚽' : j.profissao_atual === 'estudante' ? '📚' : j.profissao_atual === 'empresario' ? '💼' : j.profissao_atual === 'bibliotecario' ? '📖' : j.profissao_atual === 'pesquisador' ? '🔬' : '👤'}</div>
                            <div className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-slate-900 ${j.status === 'online' ? 'bg-emerald-400' : j.status === 'jogando' ? 'bg-amber-400' : 'bg-slate-500'}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate">{j.nome}</p>
                            <p className="text-[10px] text-slate-400 capitalize">{j.profissao_atual || 'Recruta'}</p>
                          </div>
                          <button
                            className="rounded-lg p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition"
                            title="Adicionar amigo"
                          >
                            <UserPlus className="size-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}

                {/* Chat do grupo */}
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">
                    Chat do grupo
                  </p>
                  {carregandoChat ? (
                    <div className="text-center py-4">
                      <div className="inline-block size-4 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
                    </div>
                  ) : chat.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-slate-500">Nenhuma mensagem ainda</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {chat.map((msg) => (
                        <div
                          key={msg.id}
                          className={`rounded-lg px-3 py-2 text-xs ${
                            msg.sender_id === userId
                              ? 'bg-emerald-600/20 ml-8'
                              : 'bg-slate-800'
                          }`}
                        >
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-white">{msg.sender_nome}</span>
                            <span className="text-[9px] text-slate-500">
                              {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-200 mt-1">{msg.texto}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="Mensagem para o grupo..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && void enviarNoGrupo()}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      onClick={enviarNoGrupo}
                      disabled={!chatInput.trim()}
                      className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <Send className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {aba === "mercado" && <SovMarket userId={userId} compact />}

            {aba === "notificacoes" && (
              <div className="space-y-3 p-3">
                {perfilCidadela ? (
                  <>
                    <PainelReputacao perfil={perfilCidadela} />
                    <PainelMundo perfil={perfilCidadela} />
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Bell className="size-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Faça login para ver notificações</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
