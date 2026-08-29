import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Users,
  Trophy,
  Play,
  Plus,
  RefreshCw,
  Link2,
  Swords,
  Target,
  Wifi,
  WifiOff,
} from "lucide-react";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060910] via-[#0a1020] to-[#060910]">
      {/* Header compacto */}
      <header className="border-b border-white/[0.06] px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Target className="size-4 text-purple-400" />
            <h1 className="font-display text-base font-black text-white">
              TRILHA <span className="text-purple-400 text-[10px]">ONLINE</span>
            </h1>
          </div>
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white/70">
              <ArrowLeft className="size-3" /> Menu
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        {/* Cards compactos lado a lado */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowChampionship(true)}
            className="group flex flex-col items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-all hover:border-amber-500/30 hover:bg-amber-500/[0.04]"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Trophy className="size-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-black text-white">Campeonato</p>
              <p className="text-[10px] text-white/25">Grupos · Robots</p>
            </div>
          </button>

          <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-4 text-center">
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-purple-500/10">
              <Swords className="size-5 text-purple-400" />
            </div>
            <p className="text-sm font-black text-white">PvP 1×1</p>
            <p className="text-[10px] text-white/25">Mesa rápida</p>
          </div>
        </div>

        {/* Criar Mesa compacto */}
        <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="size-4 text-emerald-400" />
            <h2 className="text-xs font-black text-white">Criar Mesa</h2>
          </div>
          <div className="flex gap-2">
            <input
              value={nomeSala}
              onChange={(e) => setNomeSala(e.target.value)}
              placeholder="Nome da sala..."
              maxLength={30}
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-white/20 focus:border-purple-500/50 focus:outline-none"
            />
            <button
              onClick={() => void criarMesa()}
              disabled={criandoMesa}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-2 text-xs font-bold text-white hover:from-purple-500 hover:to-purple-400 disabled:opacity-50"
            >
              <Play className="size-3" />
              {criandoMesa ? "..." : "Criar"}
            </button>
          </div>
        </section>

        {/* Mesas disponíveis */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-black text-white">
              Mesas {mesas.length > 0 && <span className="ml-1 rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[9px] text-purple-300">{mesas.length}</span>}
            </h2>
            <button onClick={() => void carregarMesas()} className="text-[9px] text-white/20 hover:text-white/50">
              <RefreshCw className={`size-3 inline ${loading ? "animate-spin" : ""}`} /> atualizar
            </button>
          </div>

          {loading ? (
            <p className="py-6 text-center text-[10px] text-white/20">Carregando...</p>
          ) : mesas.length === 0 ? (
            <p className="py-6 text-center text-[10px] text-white/20">Nenhuma mesa aberta</p>
          ) : (
            <div className="space-y-1.5">
              {mesas.map((mesa) => {
                const cheia = !!mesa.jogador_2_id;
                return (
                  <div key={mesa.mesa_id} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition ${cheia ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`size-1.5 rounded-full ${cheia ? "bg-emerald-400" : "bg-purple-400"}`} />
                      <span className="truncate font-bold text-white/80">{mesa.nome_sala?.trim() || `Mesa ${mesa.jogador_1_id.slice(0, 6)}`}</span>
                      <span className="text-[9px] text-white/20">{fmtTempo(mesa.criado_em)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button onClick={() => copiarLink(mesa.mesa_id)} className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-white/25 hover:text-white/50">
                        <Link2 className="size-2.5 inline" />
                      </button>
                      <button
                        onClick={() => void entrarMesa(mesa.mesa_id)}
                        disabled={entrandoMesa === mesa.mesa_id || cheia}
                        className={`rounded px-2.5 py-0.5 text-[10px] font-bold transition ${cheia ? "text-white/15" : "bg-purple-600 text-white hover:bg-purple-500"} disabled:opacity-40`}
                      >
                        {cheia ? "Cheia" : entrandoMesa === mesa.mesa_id ? "..." : "Entrar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Toast link */}
      {toastLink && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/90 px-3 py-2 text-[10px] text-emerald-300 shadow-xl backdrop-blur-sm">
            <Link2 className="size-3 shrink-0" />
            <span className="max-w-[200px] truncate">{toastLink}</span>
            <button onClick={() => setToastLink(null)} className="text-emerald-400/40 hover:text-emerald-300">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
