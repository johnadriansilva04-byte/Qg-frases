import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Users, ArrowLeft, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MatchView } from "./MatchView";
import { supabase } from "@/integrations/supabase/client";
import { useJogador } from "@/hooks/useJogador";
import { useBotaoAuth } from "../online/useBotaoAuth";
import { createCustomTeam } from "../data/teams";
import type { Difficulty, MatchResult } from "../types";
import {
  criarBloco,
  criarLobby,
  encerrarLobby,
  entrarNoBloco,
  finalizarBloco,
  getBlocos,
  getLobbiesAtivos,
  registrarGolBloco,
  registrarJogadaBloco,
  sairDoBloco,
  salvarResultado,
  limparSalasAntigas,
  type Bloco,
  type Lobby,
} from "@/lib/botao/api";

type Screen = "lobby-list" | "lobby-view" | "jogo" | "resultado";

const FORMATOS = [
  { valor: "melhor_de_3", rotulo: "Melhor de 3", jogadas: 12 },
  { valor: "melhor_de_6", rotulo: "Melhor de 6", jogadas: 20 },
  { valor: "melhor_de_9", rotulo: "Melhor de 9", jogadas: 30 },
];

export function OnlineMatchV2({ onBack }: { onBack?: () => void }) {
  const queryClient = useQueryClient();
  const { data: jogador } = useJogador();
  const { perfil } = useBotaoAuth();

  const [lobbyAtivo, setLobbyAtivo] = useState<Lobby | null>(null);
  const [nomeSala, setNomeSala] = useState("");
  const [formato, setFormato] = useState("melhor_de_3");
  const [blocoId, setBlocoId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("lobby-list");

  const session = jogador?.user_id ?? perfil?.user_id ?? "";

  // Timer para limpar salas antigas a cada minuto
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await limparSalasAntigas();
        // Recarregar lobbies após limpeza
        if (screen === "lobby-list") {
          recarregarLobbies();
        }
      } catch (error) {
        console.error('[OnlineMatchV2] Erro ao limpar salas antigas:', error);
      }
    }, 60000); // 1 minuto

    return () => clearInterval(interval);
  }, [screen]);

  // Time personalizado do usuário (vem do login)
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
    };
  }, [perfil]);

  const { data: lobbies = [], refetch: recarregarLobbies } = useQuery({
    queryKey: ["botao_lobbies"],
    queryFn: getLobbiesAtivos,
    refetchInterval: 8000,
  });
  const { data: blocos = [] } = useQuery({
    queryKey: ["botao_blocos", lobbyAtivo?.id],
    queryFn: () => getBlocos(lobbyAtivo!.id),
    enabled: !!lobbyAtivo,
    refetchInterval: 4000,
  });

  // Sincronização em tempo real dos blocos da sala aberta
  useEffect(() => {
    if (!lobbyAtivo) return;
    const canal = supabase
      .channel(`blocos-${lobbyAtivo.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "botao_blocos", filter: `lobby_id=eq.${lobbyAtivo.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["botao_blocos", lobbyAtivo.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [lobbyAtivo, queryClient]);

  const novaSala = useMutation({
    mutationFn: async () => {
      if (!perfil || !session) throw new Error("Perfil não carregado.");
      return criarLobby({
        nome: nomeSala.trim() || `Mesa de ${perfil.nome}`,
        criadorSession: session,
        criadorNome: perfil.nome,
        formato,
      });
    },
    onSuccess: (lobby) => {
      console.log('[OnlineMatchV2] Lobby criado:', lobby);
      setNomeSala("");
      setLobbyAtivo(lobby);
      setScreen("lobby-view");
      recarregarLobbies();
    },
    onError: (error) => {
      console.error('[OnlineMatchV2] Erro ao criar lobby:', error);
    },
  });

  const novoBloco = useMutation({
    mutationFn: async () => {
      if (!perfil || !lobbyAtivo || !meuTime) throw new Error("Perfil não carregado.");
      const cfg = FORMATOS.find((f) => f.valor === lobbyAtivo.formato) ?? FORMATOS[0]!;
      console.log('[OnlineMatchV2] Criando bloco:', { lobbyId: lobbyAtivo.id, session, timeId: meuTime.id });
      return criarBloco({
        lobbyId: lobbyAtivo.id,
        session: session,
        nome: perfil.nome,
        timeId: meuTime.id,
        jogadas: cfg.jogadas,
        tempoTurno: 30,
      });
    },
    onSuccess: (bloco) => {
      console.log('[OnlineMatchV2] Bloco criado:', bloco);
      setBlocoId(bloco.id);
      queryClient.invalidateQueries({ queryKey: ["botao_blocos", lobbyAtivo?.id] });
    },
    onError: (error) => {
      console.error('[OnlineMatchV2] Erro ao criar bloco:', error);
    },
  });

  const entrar = useMutation({
    mutationFn: async (bloco: Bloco) => {
      if (!perfil || !meuTime) throw new Error("Perfil não carregado.");
      console.log('[OnlineMatchV2] Entrando no bloco:', { blocoId: bloco.id, session, timeId: meuTime.id });
      return entrarNoBloco({
        blocoId: bloco.id,
        session: session,
        nome: perfil.nome,
        timeId: meuTime.id,
      });
    },
    onSuccess: (bloco) => {
      console.log('[OnlineMatchV2] Entrou no bloco:', bloco);
      setBlocoId(bloco.id);
      queryClient.invalidateQueries({ queryKey: ["botao_blocos", lobbyAtivo?.id] });
    },
    onError: (error) => {
      console.error('[OnlineMatchV2] Erro ao entrar no bloco:', error);
    },
  });

  const blocoAtual = blocos.find((b) => b.id === blocoId) ?? null;

  if (screen === "jogo" && blocoAtual && perfil) {
    return (
      <MesaOnline
        bloco={blocoAtual}
        perfil={perfil}
        meuTime={meuTime}
        session={session}
        onSair={() => {
          setBlocoId(null);
          setScreen("lobby-view");
        }}
        onVoltarLobby={() => { setScreen("lobby-view"); }}
      />
    );
  }

  if (screen === "lobby-view" && lobbyAtivo) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setScreen("lobby-list"); }} className="btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-display text-2xl">{lobbyAtivo.nome}</h2>
        </div>

        <section className="surface mb-6 space-y-4 p-5">
          <h2 className="text-xl">Seu time</h2>
          {meuTime && (
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <span
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border"
                style={{ background: meuTime.cores[0] }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: meuTime.cores[1] }}
                >
                  <span className="h-4 w-4 rounded-full" style={{ background: meuTime.cores[2] }} />
                </span>
              </span>
              <div>
                <p className="font-display text-lg">{meuTime.nome}</p>
                <p className="text-sm text-muted-foreground">{meuTime.abreviacao}</p>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="surface flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl leading-tight">{lobbyAtivo.nome}</h2>
              <p className="text-xs text-muted-foreground">
                {FORMATOS.find((f) => f.valor === lobbyAtivo.formato)?.rotulo} · blocos {blocos.length}/
                {lobbyAtivo.max_blocos}
              </p>
            </div>
            <button
              onClick={() => novoBloco.mutate()}
              disabled={novoBloco.isPending || blocos.length >= lobbyAtivo.max_blocos}
              className="btn-primary"
            >
              <Plus className="mr-1 h-4 w-4" /> Abrir bloco
            </button>
            {lobbyAtivo.criador_session === session && (
              <button
                className="btn-ghost"
                onClick={async () => {
                  await encerrarLobby(lobbyAtivo.id);
                  setLobbyAtivo(null);
                  setScreen("lobby-list");
                  recarregarLobbies();
                }}
              >
                Encerrar sala
              </button>
            )}
            <button className="btn-secondary" onClick={() => { setScreen("lobby-list"); }}>
              Voltar
            </button>
          </div>

          {blocos.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum bloco aberto nesta sala ainda.</p>
          )}

          {blocos.map((bloco) => {
            const meuBloco = bloco.jogador1_session === session || bloco.jogador2_session === session;
            return (
              <article key={bloco.id} className="surface flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-lg leading-tight">
                    {bloco.jogador1_nome} x {bloco.jogador2_nome ?? "aguardando"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {bloco.status === "aguardando"
                      ? "Aguardando adversário"
                      : bloco.status === "em_jogo"
                        ? `Em jogo · ${bloco.jogador1_gols} x ${bloco.jogador2_gols} · ${bloco.jogadas_restantes} jogadas`
                        : `Finalizado · ${bloco.jogador1_gols} x ${bloco.jogador2_gols}`}
                  </p>
                </div>
                {meuBloco ? (
                  <>
                    <button onClick={() => { setBlocoId(bloco.id); setScreen("jogo"); }} className="btn-primary">
                      Abrir mesa
                    </button>
                    {bloco.status === "aguardando" && bloco.jogador1_session === session && (
                      <button
                        className="btn-ghost"
                        onClick={async () => {
                          await sairDoBloco(bloco.id);
                          setBlocoId(null);
                          queryClient.invalidateQueries({ queryKey: ["botao_blocos", lobbyAtivo.id] });
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                  </>
                ) : bloco.status === "aguardando" ? (
                  <button onClick={() => entrar.mutate(bloco)} disabled={entrar.isPending} className="btn-primary">
                    Assumir o outro lado
                  </button>
                ) : (
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Mesa ocupada</span>
                )}
              </article>
            );
          })}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <button onClick={onBack} className="btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h2 className="font-display text-2xl">Mesas Online</h2>
      </div>

      <section className="surface mb-6 space-y-4 p-5">
        <h2 className="text-xl">Seu time</h2>
        {meuTime && (
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <span
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border"
              style={{ background: meuTime.cores[0] }}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: meuTime.cores[1] }}
              >
                <span className="h-4 w-4 rounded-full" style={{ background: meuTime.cores[2] }} />
              </span>
            </span>
            <div>
              <p className="font-display text-lg">{meuTime.nome}</p>
              <p className="text-sm text-muted-foreground">{meuTime.abreviacao}</p>
            </div>
          </div>
        )}
      </section>

      {!lobbyAtivo ? (
        <>
          <section className="surface mb-6 space-y-4 p-5">
            <h2 className="text-xl">Criar sala</h2>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Nome da sala</label>
              <input
                value={nomeSala}
                onChange={(e) => setNomeSala(e.target.value)}
                placeholder={`Mesa de ${perfil?.nome ?? "jogador"}`}
                className="w-full px-3 py-2 rounded border bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Formato</label>
              <div className="flex flex-wrap gap-2">
                {FORMATOS.map((f) => (
                  <button
                    key={f.valor}
                    onClick={() => setFormato(f.valor)}
                    className={`px-3 py-1 rounded border ${
                      formato === f.valor ? "bg-primary text-primary-foreground" : "bg-background"
                    }`}
                  >
                    {f.rotulo}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => novaSala.mutate()} disabled={novaSala.isPending || !perfil} className="btn-primary">
              <Plus className="mr-1 h-4 w-4" /> {novaSala.isPending ? "Criando..." : "Abrir sala"}
            </button>
            {!perfil && (
              <p className="text-sm text-red-500">Você precisa estar logado para criar uma sala.</p>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl">Salas ativas</h2>
              <button className="btn-ghost text-sm" onClick={() => recarregarLobbies()}>
                <RefreshCw className="mr-1 h-4 w-4" /> Atualizar
              </button>
            </div>
            {lobbies.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma sala ativa. Seja o primeiro a abrir.</p>
            )}
            {lobbies.map((lobby) => (
              <article key={lobby.id} className="surface flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg leading-tight">{lobby.nome}</h3>
                  <p className="text-xs text-muted-foreground">
                    {lobby.criador_nome} · {FORMATOS.find((f) => f.valor === lobby.formato)?.rotulo ?? lobby.formato}{" "}
                    · até {lobby.max_blocos} blocos
                  </p>
                </div>
                <button onClick={() => { setLobbyAtivo(lobby); setScreen("lobby-view"); }} className="btn-primary">
                  <Users className="mr-1 h-4 w-4" /> Entrar
                </button>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </main>
  );
}

/** Mesa online: usa MatchView com interface idêntica ao torneio */
function MesaOnline({
  bloco,
  perfil,
  meuTime,
  session,
  onSair,
  onVoltarLobby,
}: {
  bloco: Bloco;
  perfil: any;
  meuTime: any;
  session: string;
  onSair: () => void;
  onVoltarLobby: () => void;
}) {
  const queryClient = useQueryClient();
  const [salvo, setSalvo] = useState(false);
  const [currentTurn, setCurrentTurn] = useState<"home" | "away">("home");
  const souJogador1 = bloco.jogador1_session === session;

  // Sincronizar o turno com o banco de dados
  useEffect(() => {
    const novoTurno = bloco.turno === "jogador1"
      ? (souJogador1 ? "home" : "away")
      : (souJogador1 ? "away" : "home");
    
    console.log('[MesaOnline] Turno no banco mudou:', bloco.turno, '->', novoTurno);
    setCurrentTurn(novoTurno);
  }, [bloco.turno, souJogador1]);

  // Converter time personalizado para formato Team do MatchView
  const userTeam = useMemo(() => {
    if (!meuTime) return createCustomTeam('custom', 'Meu Time', 'MTI', '#FF0000', '#00FF00', 75);
    return createCustomTeam(
      meuTime.id,
      meuTime.nome,
      meuTime.abreviacao,
      meuTime.cores[0],
      meuTime.cores[1],
      75
    );
  }, [meuTime]);

  // Criar time para o oponente
  const opponentTeam = useMemo(() => {
    return createCustomTeam('opponent', 'Oponente', 'OPP', '#0000FF', '#FFFF00', 75);
  }, []);

  const homeId = souJogador1 ? userTeam.id : opponentTeam.id;
  const awayId = souJogador1 ? opponentTeam.id : userTeam.id;
  const userSide = souJogador1 ? "home" : "away";

  // Usar jogadas restantes do bloco, não do formato
  const turns = bloco.jogadas_restantes || 12;

  const handleFinish = useCallback((result: MatchResult) => {
    console.log('[MesaOnline] Partida finalizada:', result);
    onVoltarLobby();
  }, [onVoltarLobby]);

  const handlePlay = useCallback(async (goals: number) => {
    console.log('[MesaOnline] Jogada realizada, gols:', goals);
    console.log('[MesaOnline] Turno atual no banco:', bloco.turno);
    console.log('[MesaOnline] Sou jogador1?', souJogador1);
    
    // Verificar se é realmente o turno deste jogador
    const meuTurnoNoBanco = souJogador1 ? bloco.turno === 'jogador1' : bloco.turno === 'jogador2';
    
    if (!meuTurnoNoBanco) {
      console.warn('[MesaOnline] Não é seu turno! Jogada ignorada.');
      return;
    }
    
    // Registrar a jogada no banco (decrementa jogadas e alterna turno)
    try {
      await registrarJogadaBloco(bloco.id);
      
      // Se houve gol, registrar o gol também
      if (goals > 0) {
        const jogador = souJogador1 ? 'jogador1' : 'jogador2';
        await registrarGolBloco(bloco.id, jogador);
      }
    } catch (error) {
      console.error('[MesaOnline] Erro ao registrar jogada:', error);
    }
  }, [bloco.id, bloco.turno, souJogador1]);

  const handleQuit = useCallback(() => {
    console.log('[MesaOnline] Saindo da partida');
    onSair();
  }, [onSair]);

  // Registra resultado no perfil quando a mesa termina
  useEffect(() => {
    if (bloco.status !== "finalizado" || salvo || !perfil) return;
    const meu = souJogador1 ? "jogador1" : "jogador2";
    const res = bloco.vencedor === "empate" ? "e" : bloco.vencedor === meu ? "v" : "d";
    setSalvo(true);
    salvarResultado({
      usuario: perfil,
      resultado: res,
      pontos: res === "v" ? 20 : res === "e" ? 6 : 2,
    })
      .then(() => queryClient.invalidateQueries({ queryKey: ["botao_usuarios", "atual"] }))
      .catch(() => console.error("Não foi possível salvar o resultado."));
  }, [bloco.status, bloco.vencedor, salvo, perfil, souJogador1, queryClient]);

  // Sincronização em tempo real do bloco atual
  useEffect(() => {
    const canal = supabase
      .channel(`bloco-${bloco.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "botao_blocos", filter: `id=eq.${bloco.id}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["botao_blocos", bloco.lobby_id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [bloco.id, bloco.lobby_id, queryClient]);

  return (
    <MatchView
      homeId={homeId}
      awayId={awayId}
      userSide={userSide}
      difficulty="amador"
      turns={turns}
      knockout={false}
      stageLabel={`Partida Online - ${bloco.turno === 'jogador1' ? (souJogador1 ? 'Seu turno' : 'Turno do oponente') : (souJogador1 ? 'Turno do oponente' : 'Seu turno')}`}
      onFinish={handleFinish}
      onQuit={handleQuit}
      isOnline={true}
      customTeam={userTeam}
      onPlay={handlePlay}
      initialTurn={currentTurn}
    />
  );
}
