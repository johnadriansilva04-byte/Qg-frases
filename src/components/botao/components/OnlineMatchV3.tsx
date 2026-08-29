import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, RefreshCw, Users, ArrowLeft, Coins } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useJogador } from "@/hooks/useJogador";
import { useBotaoAuth } from "../online/useBotaoAuth";
import {
  criarMesa,
  entrarMesa,
  buscarMesa,
  buscarMesasAguardando,
  linkConviteMesa,
  pagarPremioMesa,
  type MesaFutebol,
} from "@/lib/multiplayer/mesa.api";
import { MesaOnlineMatch, type ResultadoMesa } from "./MesaOnlineMatch";
import { AdminMesaPanel } from "./AdminMesaPanel";
import { useAdManager } from "@/lib/adManager";

type Screen = "lobby-list" | "lobby-view" | "jogo" | "resultado" | "admin";

export function OnlineMatchV3({
  onBack,
  onEstadoPartida,
  mesaInicialId,
}: {
  onBack?: () => void;
  onEstadoPartida?: (emPartida: boolean) => void;
  /** Link direto (?mesa=...): entra direto nesta mesa ao carregar o perfil. */
  mesaInicialId?: string | undefined;
}) {
  const queryClient = useQueryClient();
  const { data: jogador } = useJogador();
  const { perfil, recarregar, aplicarPerfil } = useBotaoAuth();
  const { markFirstGamePlayed } = useAdManager("/botao");
  const userId = jogador?.user_id ?? perfil?.user_id ?? "";

  const [mesaId, setMesaId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("lobby-list");
  // Aposta de SOV da mesa (opcional, 0 = sem aposta) — cobrada no servidor na
  // criação/entrada e paga ao vencedor (zero-sum).
  const [apostaSoberania, setApostaSoberania] = useState<number>(0);
  // §9: data de liberação da mesa (vazio = abre na hora).
  const [dataLiberacao, setDataLiberacao] = useState<string>("");
  const [toastLink, setToastLink] = useState<string | null>(null);
  const [erroMesa, setErroMesa] = useState<string | null>(null);
  const linkDiretoTentado = useRef<string | null>(null);
  const soberaniaAtual = perfil?.pontos_soberania ?? 0;

  // Notificar estado de partida online
  useEffect(() => {
    if (onEstadoPartida) onEstadoPartida(screen === "jogo");
  }, [screen, onEstadoPartida]);

  // Time personalizado
  const meuTime = useMemo(() => {
    if (!perfil) return null;
    return {
      id: `custom-${perfil.user_id}`,
      nome: perfil.time_personalizado,
      abreviacao: perfil.abreviacao_time,
      cores: perfil.cores,
      pais: "Brasil",
      liga: "Personalizado",
      is_personalizado: true,
      usuario_id: perfil.user_id,
      botoesNomes: perfil.botoes_nomes ?? undefined,
    };
  }, [perfil]);

  const { data: mesas = [], refetch: recarregarMesas } = useQuery({
    queryKey: ["mesas_futebol"],
    queryFn: buscarMesasAguardando,
    refetchInterval: 5000,
  });

  const { data: mesaAtual } = useQuery({
    queryKey: ["mesa_atual", mesaId],
    queryFn: () => (mesaId ? buscarMesa(mesaId) : null),
    enabled: !!mesaId,
    refetchInterval: screen === "jogo" ? false : 3000, // Desativar polling durante partida
  });

  // Criar mesa — a aposta é cobrada no servidor na hora (débito do criador).
  const novaMesa = useMutation({
    mutationFn: async () => {
      if (!perfil || !userId) throw new Error("Perfil não carregado.");
      const timeId = meuTime?.id ?? "MTI";
      return criarMesa(timeId, {
        dataLiberacao: dataLiberacao ? new Date(dataLiberacao).toISOString() : null,
        apostaSov: apostaSoberania,
      });
    },
    onSuccess: (novaMesaId) => {
      setMesaId(novaMesaId);
      setScreen("jogo");
      recarregarMesas();
    },
    onError: (error) => {
      setErroMesa((error as Error)?.message ?? "Não foi possível criar a mesa.");
    },
  });

  // Entrar em mesa — a aposta é cobrada no servidor na entrada.
  const entrar = useMutation({
    mutationFn: async (mesa: MesaFutebol) => {
      if (!perfil || !meuTime) throw new Error("Perfil não carregado.");
      return entrarMesa(mesa.mesa_id, meuTime.id);
    },
    onSuccess: (mesa) => {
      setMesaId(mesa.mesa_id);
      setScreen("jogo");
      recarregarMesas();
    },
    onError: (error) => {
      setErroMesa((error as Error)?.message ?? "Não foi possível entrar na mesa.");
    },
  });

  // Link direto (?mesa=...): entra nesta mesa exata assim que o perfil carrega —
  // o convidado não precisa procurar a mesa na lista.
  useEffect(() => {
    if (!mesaInicialId || !perfil || !meuTime || linkDiretoTentado.current === mesaInicialId) return;
    linkDiretoTentado.current = mesaInicialId;
    void (async () => {
      const mesa = await buscarMesa(mesaInicialId).catch(() => null);
      if (!mesa) {
        setErroMesa("Mesa do link não encontrada.");
        return;
      }
      const souParticipante = mesa.jogador_1_id === userId || mesa.jogador_2_id === userId;
      if (!souParticipante && mesa.status === "aguardando") {
        entrar.mutate(mesa);
      } else {
        setMesaId(mesa.mesa_id);
        setScreen("jogo");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesaInicialId, perfil?.user_id, meuTime?.id]);

  if (screen === "jogo" && mesaAtual && perfil && meuTime) {
    return (
      <MesaOnlineMatch
        mesa={mesaAtual}
        perfil={perfil}
        userId={userId}
        meuTime={meuTime}
        stageLabel="Amistoso Online"
        onSair={() => {
          setMesaId(null);
          setScreen("lobby-list");
        }}
        onFinalizada={async (r: ResultadoMesa) => {
          // Marcar que o usuário jogou o primeiro jogo (habilita anúncios após)
          markFirstGamePlayed();

          // Aposta da mesa: o pote é pago NO SERVIDOR (zero-sum, idempotente)
          // — nunca mais um delta local solto no cliente.
          await pagarPremioMesa(mesaAtual.mesa_id).catch(() => null);
          // Recarrega o perfil para refletir SOV/ranking atualizados
          const novoPerfil = await recarregar();
          if (novoPerfil) aplicarPerfil(novoPerfil);
        }}
      />
    );
  }

  // §10: Administração da Mesa (só o criador).
  if (screen === "admin" && mesaAtual && perfil) {
    return (
      <AdminMesaPanel
        mesa={mesaAtual}
        userId={userId}
        onVoltar={() => setScreen("lobby-list")}
        onEntrar={() => setScreen("jogo")}
        onCopiarLink={() => {
          const link = linkConviteMesa(mesaAtual.mesa_id);
          void navigator.clipboard?.writeText(link).catch(() => {});
          setToastLink(link);
        }}
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 relative">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 left-1/4 h-[300px] w-[300px] rounded-full bg-emerald-500/4 blur-[100px]" />
        <div className="absolute bottom-0 right-1/3 h-[250px] w-[250px] rounded-full bg-cyan-500/3 blur-[80px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {onBack && (
            <button onClick={onBack} className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10">
              <ArrowLeft className="size-4 text-white" />
            </button>
          )}
          <div>
            <h2 className="font-display text-2xl font-black text-white">AMISTOSO ONLINE</h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Partida 1v1 · Tempo Real</p>
          </div>
        </div>

        {/* Toasts */}
        {toastLink && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200 flex items-center gap-2">
            <span>🔗</span>
            <span className="break-all font-mono">{toastLink}</span>
            <button onClick={() => setToastLink(null)} className="ml-auto text-emerald-400 hover:text-white">fechar</button>
          </div>
        )}
        {erroMesa && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 flex items-center gap-2">
            <span>⚠️</span>
            <span className="flex-1">{erroMesa}</span>
            <button onClick={() => setErroMesa(null)} className="text-red-400 hover:text-white">fechar</button>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr] items-start">
          {/* ── Left Column: Seu Time + Criar Mesa ── */}
          <div className="space-y-5">
            {/* Seu Time */}
            {meuTime && (
              <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-950/30 to-slate-950/60 p-5">
                <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-500/60 font-bold mb-3">Seu Time</p>
                <div className="flex items-center gap-4">
                  <div
                    className="flex size-14 items-center justify-center rounded-xl border border-white/10"
                    style={{ background: meuTime.cores[0] }}
                  >
                    <span
                      className="flex size-10 items-center justify-center rounded-lg"
                      style={{ background: meuTime.cores[1] }}
                    >
                      <span className="size-5 rounded-full" style={{ background: meuTime.cores[2] }} />
                    </span>
                  </div>
                  <div>
                    <p className="font-display text-lg font-black text-white">{meuTime.nome}</p>
                    <p className="text-xs text-slate-400">
                      {meuTime.abreviacao} · {perfil?.nome ?? "Treinador"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Criar Mesa */}
            <div className="rounded-2xl border border-sky-500/15 bg-gradient-to-br from-sky-950/30 to-slate-950/60 p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/15 border border-sky-500/20">
                  <Plus className="size-4 text-sky-400" />
                </div>
                <h3 className="font-display text-sm font-black text-white uppercase tracking-wider">Criar Mesa</h3>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Coins className="size-3.5 text-amber-400" />
                <span>Saldo: <span className="font-bold text-amber-300">{soberaniaAtual} SOV</span></span>
              </div>

              {/* Aposta */}
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-slate-600 font-bold mb-2">Apostar SOV</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={soberaniaAtual}
                    value={apostaSoberania}
                    onChange={(e) => setApostaSoberania(Math.max(0, Math.min(soberaniaAtual, Number(e.target.value) || 0)))}
                    className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white font-bold focus:border-sky-500/40 focus:outline-none"
                  />
                  <div className="flex gap-1">
                    {[5, 10, 25].map((v) => (
                      <button key={v} onClick={() => setApostaSoberania(Math.min(soberaniaAtual, v))} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-slate-400 transition hover:border-white/20 hover:text-white">
                        {v}
                      </button>
                    ))}
                    <button onClick={() => setApostaSoberania(0)} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 transition hover:border-white/20 hover:text-white">
                      Limpar
                    </button>
                  </div>
                </div>
                {apostaSoberania > 0 && (
                  <p className="mt-1.5 text-[10px] text-emerald-400/80">
                    Vence: +{apostaSoberania} · Perde: -{Math.min(apostaSoberania, soberaniaAtual)}
                  </p>
                )}
              </div>

              {/* Data de liberação */}
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-slate-600 font-bold mb-2">Liberação (opcional)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={dataLiberacao}
                    onChange={(e) => setDataLiberacao(e.target.value)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-sky-500/40 focus:outline-none"
                  />
                  {dataLiberacao && (
                    <button onClick={() => setDataLiberacao("")} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-slate-400 transition hover:border-white/20 hover:text-white">
                      Abrir agora
                    </button>
                  )}
                </div>
                {dataLiberacao && (
                  <p className="mt-1.5 text-[10px] text-sky-300/80">
                    Bloqueada até {new Date(dataLiberacao).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>

              <button
                onClick={() => novaMesa.mutate()}
                disabled={novaMesa.isPending || !perfil}
                className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 px-5 py-3 font-display text-sm font-black uppercase tracking-wider text-white transition-all hover:from-sky-500 hover:to-sky-400 active:scale-[0.98] disabled:opacity-50"
              >
                {novaMesa.isPending ? "Criando..." : "+ Abrir Mesa"}
              </button>
              {!perfil && (
                <p className="text-xs text-red-400/80 text-center">Precisa estar logado.</p>
              )}
            </div>
          </div>

          {/* ── Right Column: Mesas Disponíveis ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent w-8" />
                <span className="text-[9px] uppercase tracking-[0.3em] text-emerald-500/50 font-bold">Mesas Abertas</span>
                <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/30 to-transparent w-8" />
              </div>
              <button onClick={() => recarregarMesas()} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-slate-400 transition hover:border-white/20 hover:text-white">
                <RefreshCw className="size-3" /> Atualizar
              </button>
            </div>

            {mesas.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center">
                <p className="text-sm text-slate-600">Nenhuma mesa disponível.</p>
                <p className="text-xs text-slate-700 mt-1">Seja o primeiro a abrir uma partida.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mesas.map((mesa) => {
                  const souJogador1 = mesa.jogador_1_id === userId;
                  const souParticipante = souJogador1 || mesa.jogador_2_id === userId;
                  const bloqueada = mesa.data_liberacao != null && new Date(mesa.data_liberacao).getTime() > Date.now();
                  const statusCor = mesa.status === "aguardando" ? "emerald" : mesa.status === "em_andamento" ? "amber" : "slate";
                  return (
                    <div key={mesa.id} className={`rounded-2xl border p-4 transition-all ${
                      statusCor === "emerald" ? "border-emerald-500/15 bg-gradient-to-r from-emerald-950/20 to-slate-950/60" :
                      statusCor === "amber" ? "border-amber-500/15 bg-gradient-to-r from-amber-950/20 to-slate-950/60" :
                      "border-white/5 bg-white/[0.02]"
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-sm font-black text-white">Mesa {mesa.mesa_id}</h3>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              statusCor === "emerald" ? "bg-emerald-500/15 text-emerald-400" :
                              statusCor === "amber" ? "bg-amber-500/15 text-amber-400" :
                              "bg-slate-500/15 text-slate-400"
                            }`}>
                              {bloqueada ? "Bloqueada" : mesa.status === "aguardando" ? "Aberta" : mesa.status === "em_andamento" ? "Em jogo" : "Finalizada"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {bloqueada
                              ? `Liberação: ${new Date(mesa.data_liberacao!).toLocaleString("pt-BR")}`
                              : mesa.status === "em_andamento"
                                ? `Placar: ${mesa.placar_j1} x ${mesa.placar_j2}`
                                : (mesa.aposta_sov ?? 0) > 0 ? `Aposta: ${mesa.aposta_sov} SOV` : "Sem aposta"}
                          </p>
                          <button
                            onClick={() => {
                              const link = linkConviteMesa(mesa.mesa_id);
                              void navigator.clipboard?.writeText(link).catch(() => {});
                              setToastLink(link);
                            }}
                            className="mt-1.5 text-[10px] text-sky-400/70 hover:text-sky-300 transition"
                          >
                            📋 Copiar link de convite
                          </button>
                        </div>

                        {souParticipante ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <button
                              onClick={() => { setMesaId(mesa.mesa_id); setScreen("jogo"); }}
                              className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-all hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.97]"
                            >
                              Reentrar
                            </button>
                            {souJogador1 && (
                              <button
                                onClick={() => { setMesaId(mesa.mesa_id); setScreen("admin"); }}
                                className="text-[10px] text-slate-500 hover:text-white transition"
                                data-testid={`admin-${mesa.mesa_id}`}
                              >
                                Admin
                              </button>
                            )}
                          </div>
                        ) : mesa.status === "aguardando" && !bloqueada ? (
                          <button
                            onClick={() => entrar.mutate(mesa)}
                            disabled={entrar.isPending}
                            className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-all hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.97] disabled:opacity-50"
                          >
                            <Users className="mr-1 inline size-3" /> Entrar
                          </button>
                        ) : (
                          <span className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">
                            {bloqueada ? "🔒" : "Ocupada"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
