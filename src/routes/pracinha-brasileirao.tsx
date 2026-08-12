import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Tv, Radio, PlayCircle, Clock, ChevronRight, ArrowLeft, Send, Users, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pracinha-brasileirao")({
  head: () => ({
    meta: [
      { title: "Pracinha do Brasileirão | Transmissões Ao Vivo" },
      {
        name: "description",
        content: "Assista aos jogos do Brasileirão Série A e B ao vivo com chat em tempo real.",
      },
    ],
  }),
  component: PracinhaBrasileirao,
});

interface Canal {
  id: string;
  nome: string;
  canalYoutube: string;
  descricao: string;
  icone: React.ReactNode;
  status: "ao_vivo" | "offline";
  videoFallback?: string;
}

const CANAIS: Canal[] = [
  {
    id: "cazetv",
    nome: "CazéTV",
    canalYoutube: "UCZ6yq8QqQqQqQqQqQqQqQqQ",
    descricao: "Transmissão oficial do Brasileirão",
    icone: <Tv className="w-5 h-5" />,
    status: "ao_vivo",
    videoFallback: "dQw4w9WgXcQ"
  },
  {
    id: "premiere",
    nome: "Premiere / GE",
    canalYoutube: "UCZ6yq8QqQqQqQqQqQqQqQqQ",
    descricao: "Narração oficial Premiere",
    icone: <Radio className="w-5 h-5" />,
    status: "ao_vivo",
    videoFallback: "dQw4w9WgXcQ"
  },
  {
    id: "narracao",
    nome: "Narração Ao Vivo",
    canalYoutube: "UCZ6yq8QqQqQqQqQqQqQqQqQ",
    descricao: "Narrção em tempo real",
    icone: <PlayCircle className="w-5 h-5" />,
    status: "ao_vivo",
    videoFallback: "dQw4w9WgXcQ"
  },
  {
    id: "posjogo",
    nome: "Pós-Jogo",
    canalYoutube: "UCZ6yq8QqQqQqQqQqQqQqQqQ",
    descricao: "Análise pós-jogo",
    icone: <Tv className="w-5 h-5" />,
    status: "offline",
    videoFallback: "dQw4w9WgXcQ"
  }
];

interface MensagemChat {
  id: string;
  usuario: string;
  texto: string;
  criado_em: string;
}

function PracinhaBrasileirao() {
  const [canalAtivo, setCanalAtivo] = useState<Canal>(CANAIS[0]);
  const [carregando, setCarregando] = useState(false);
  const [usandoFallback, setUsandoFallback] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [usuarioLogado, setUsuarioLogado] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Carregar mensagens do chat
  useEffect(() => {
    carregarMensagens();
    
    // Inscrever para novas mensagens
    const channel = supabase
      .channel('pracinha-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pracinha_chat' }, (payload) => {
        setMensagens(prev => [...prev, payload.new as MensagemChat]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-scroll para baixo quando novas mensagens chegam
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [mensagens]);

  // Verificar se usuário está logado
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUsuarioLogado(true);
        setNomeUsuario(user.user_metadata?.nome || "Anônimo");
      }
    };
    checkAuth();
  }, []);

  const carregarMensagens = async () => {
    const { data } = await supabase
      .from('pracinha_chat')
      .select('*')
      .order('criado_em', { ascending: true })
      .limit(50);
    
    if (data) {
      setMensagens(data as MensagemChat[]);
    }
  };

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !usuarioLogado) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('pracinha_chat')
      .insert({
        usuario: user.user_metadata?.nome || "Anônimo",
        texto: novaMensagem.trim(),
        user_id: user.id
      });

    if (!error) {
      setNovaMensagem("");
    }
  };

  const trocarCanal = (canal: Canal) => {
    setCarregando(true);
    setUsandoFallback(false);
    setCanalAtivo(canal);
    setTimeout(() => setCarregando(false), 500);
  };

  const usarFallback = () => {
    setUsandoFallback(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="btn-ghost">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3 flex-1">
              <Tv className="w-6 h-6 text-red-500" />
              <div>
                <h1 className="text-xl font-bold">Pracinha do Brasileirão</h1>
                <p className="text-sm text-slate-400">Transmissões ao vivo com chat em tempo real</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse">
              🔴 AO VIVO
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Área do Player (2/3 da tela em desktop) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Player */}
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
              <div className="absolute inset-0 bg-[#0b0f19] rounded-xl overflow-hidden border-2 border-border">
                {carregando && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0b0f19] z-10">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                )}
                {usandoFallback ? (
                  <iframe
                    key={`fallback-${canalAtivo.id}`}
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${canalAtivo.videoFallback}?autoplay=1`}
                    title={`${canalAtivo.nome} - Melhores Momentos`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <iframe
                    key={canalAtivo.id}
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/live_stream?channel=${canalAtivo.canalYoutube}&autoplay=1`}
                    title={canalAtivo.nome}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onError={usarFallback}
                  />
                )}
              </div>
            </div>

            {/* Placa de Informações */}
            <div className="p-4 bg-[#0b0f19] rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-red-500">{canalAtivo.icone}</div>
                  <div>
                    <h4 className="text-lg font-semibold">{canalAtivo.nome}</h4>
                    <p className="text-sm text-muted-foreground">{canalAtivo.descricao}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {usandoFallback && (
                    <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                      Melhores Momentos
                    </span>
                  )}
                  <button
                    onClick={usarFallback}
                    className="text-xs text-muted-foreground hover:text-foreground transition"
                  >
                    {usandoFallback ? "Tentar Live" : "Melhores Momentos"}
                  </button>
                </div>
              </div>
            </div>

            {/* Grade de Canais */}
            <div className="space-y-3">
              <p className="text-xs font-display tracking-[0.2em] text-muted-foreground uppercase">
                Canais Disponíveis
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CANAIS.map((canal) => (
                  <button
                    key={canal.id}
                    onClick={() => trocarCanal(canal)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-2 ${
                      canalAtivo.id === canal.id
                        ? 'bg-[#10b981]/10 border-[#10b981] shadow-lg shadow-[#10b981]/20'
                        : 'bg-surface/50 border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`${canalAtivo.id === canal.id ? 'text-[#10b981]' : 'text-muted-foreground'}`}>
                      {canal.icone}
                    </div>
                    <span className={`text-xs font-semibold text-center ${
                      canalAtivo.id === canal.id ? 'text-[#10b981]' : 'text-foreground'
                    }`}>
                      {canal.nome}
                    </span>
                    {canal.status === "ao_vivo" ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                        🔴
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">
                        OFF
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chat (1/3 da tela em desktop, tela cheia em mobile) */}
          <div className="lg:col-span-1 h-[600px] lg:h-[calc(100vh-200px)] flex flex-col bg-[#0b0f19] rounded-xl border border-border">
            {/* Header do Chat */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Chat Ao Vivo</h3>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{mensagens.length}</span>
              </div>
            </div>

            {/* Mensagens */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {mensagens.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma mensagem ainda</p>
                  <p className="text-xs mt-1">Seja o primeiro a comentar!</p>
                </div>
              ) : (
                mensagens.map((msg) => (
                  <div key={msg.id} className="bg-surface/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-primary">{msg.usuario}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{msg.texto}</p>
                  </div>
                ))
              )}
            </div>

            {/* Input do Chat */}
            <div className="p-4 border-t border-border">
              {usuarioLogado ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-surface/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    maxLength={500}
                  />
                  <button
                    onClick={enviarMensagem}
                    disabled={!novaMensagem.trim()}
                    className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Faça login para participar do chat
                  </p>
                  <Link
                    to="/cidadela"
                    className="btn-primary text-sm px-4 py-2 rounded-lg inline-block"
                  >
                    Entrar
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
