import { useState, useEffect, useRef } from "react";
import { Trophy, Swords, WifiOff } from "lucide-react";
import { OnlineLobbyLayout, type LobbyRoom } from "@/components/online/OnlineLobbyLayout";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { TrilhaOnlineGame } from "./TrilhaOnlineGame";
import { TrilhaChampionship } from "./TrilhaChampionship";

interface Mesa {
  mesa_id: string;
  dificuldade: string;
  jogador_1_id: string;
  criado_em: string;
  nome_sala?: string | null;
  jogador_2_id?: string | null;
}

interface TrilhaOnlineLobbyProps {
  onBack?: (() => void) | undefined;
  mesaInicial?: string | undefined;
}

export function TrilhaOnlineLobby({ onBack, mesaInicial }: TrilhaOnlineLobbyProps = {}) {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [criandoMesa, setCriandoMesa] = useState(false);
  const [entrandoMesa, setEntrandoMesa] = useState<string | null>(null);
  const [nomeSala, setNomeSala] = useState("");
  const [mesaAtual, setMesaAtual] = useState<string | null>(null);
  const [supabaseNotConfigured, setSupabaseNotConfigured] = useState(false);
  const [toastLink, setToastLink] = useState<string | null>(null);
  const [showChampionship, setShowChampionship] = useState(false);
  const entradaLinkTentada = useRef<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSupabaseNotConfigured(true);
      setLoading(false);
      return;
    }
    void carregarMesas();
    const channel = supabase
      .channel("mesas_trilha_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "mesas_trilha" }, () => void carregarMesas())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!mesaInicial || entradaLinkTentada.current === mesaInicial) return;
    entradaLinkTentada.current = mesaInicial;
    void (async () => { try { await entrarMesa(mesaInicial); } catch (e) { console.error(e); } })();
  }, [mesaInicial]);

  const carregarMesas = async () => {
    try {
      const { data, error } = await supabase.rpc("listar_mesas_trilha_disponiveis", { p_dificuldade: null });
      if (error) { if (error.code === "PGRST202" || error.code === "404") { setMesas([]); setLoading(false); return; } throw error; }
      setMesas(Array.isArray(data) ? (data as unknown as Mesa[]) : []);
    } catch { setMesas([]); } finally { setLoading(false); }
  };

  const linkDaMesa = (id: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/cidadela?mesaTrilha=${encodeURIComponent(id)}`;

  const criarMesa = async () => {
    setCriandoMesa(true);
    try {
      const { data, error } = await supabase.rpc("criar_mesa_trilha", { p_nome: nomeSala.trim() || null, p_formato: "normal", p_dificuldade: "recruta" });
      if (error) throw error;
      const link = linkDaMesa(data as string);
      void navigator.clipboard?.writeText(link).catch(() => {});
      setToastLink(link);
      setMesaAtual(data as string);
      setTimeout(() => void carregarMesas(), 500);
    } catch { alert("Erro ao criar mesa."); } finally { setCriandoMesa(false); }
  };

  const entrarMesa = async (id: string) => {
    setEntrandoMesa(id);
    try {
      const { error } = await supabase.rpc("entrar_mesa_trilha", { p_mesa_id: id });
      if (error) throw error;
      setMesaAtual(id);
    } catch (e) { console.error(e); alert("Erro ao entrar."); } finally { setEntrandoMesa(null); }
  };

  const copiarLink = (id: string) => { void navigator.clipboard?.writeText(linkDaMesa(id)).catch(() => {}); setToastLink(linkDaMesa(id)); };

  const fmtTempo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "agora";
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h`;
  };

  if (showChampionship) return <TrilhaChampionship onBack={() => setShowChampionship(false)} />;
  if (mesaAtual) return <TrilhaOnlineGame mesaId={mesaAtual} onBack={() => setMesaAtual(null)} />;

  if (supabaseNotConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <WifiOff className="mx-auto mb-3 size-10 text-purple-400/40" />
          <h2 className="font-display text-xl font-black text-foreground mb-2">Offline</h2>
          <p className="text-sm text-muted-foreground mb-4">Conecte o Supabase para jogar online.</p>
          {onBack && <button onClick={onBack} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Voltar</button>}
        </div>
      </div>
    );
  }

  const lobbyRooms: LobbyRoom[] = mesas.map((mesa) => ({
    id: mesa.mesa_id,
    name: mesa.nome_sala?.trim() || undefined,
    status: mesa.jogador_2_id ? "em_andamento" : "aguardando",
    playerCount: mesa.jogador_2_id ? 2 : 1,
    maxPlayers: 2,
    meta: fmtTempo(mesa.criado_em),
  }));

  const trilhaCreateForm = (
    <div className="space-y-3">
      <div>
        <p className="text-[9px] uppercase tracking-wider text-white/20 font-bold mb-1.5">Nome da sala</p>
        <input
          value={nomeSala}
          onChange={(e) => setNomeSala(e.target.value)}
          placeholder="Nome opcional..."
          maxLength={30}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-purple-500/40 focus:outline-none"
        />
      </div>
      <button
        onClick={() => void criarMesa()}
        disabled={criandoMesa}
        className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:from-purple-500 hover:to-purple-400 disabled:opacity-50"
      >
        {criandoMesa ? "Criando..." : "+ Criar Mesa"}
      </button>
    </div>
  );

  return (
    <OnlineLobbyLayout
      title="TRILHA ONLINE"
      subtitle="PvP 1×1 · Tempo Real"
      icon={<Swords className="size-4" />}
      onBack={onBack}
      accent="purple"
      createForm={trilhaCreateForm}
      leftExtra={
        <button
          onClick={() => setShowChampionship(true)}
          className="w-full rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2.5 text-center transition hover:border-amber-500/40 hover:bg-amber-500/[0.08]"
        >
          <Trophy className="mx-auto mb-1 size-4 text-amber-400" />
          <p className="text-[10px] font-bold text-white/60">Campeonato</p>
          <p className="text-[8px] text-white/20">Grupos · Robots</p>
        </button>
      }
      rooms={lobbyRooms}
      onJoinRoom={(id) => void entrarMesa(id)}
      onCopyRoomLink={(id) => copiarLink(id)}
      onRefresh={() => void carregarMesas()}
      roomsLoading={loading}
      toastLink={toastLink}
      onDismissToast={() => setToastLink(null)}
    />
  );
}
