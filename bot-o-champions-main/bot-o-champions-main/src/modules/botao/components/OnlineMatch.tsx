import { useEffect, useMemo, useState } from "react";
import { Users, Plus, RefreshCw, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CUSTOM_TEAM_ID, teamById } from "../data/teams";
import type { Perfil } from "../online/auth";
import {
  criarBloco,
  criarLobby,
  entrarNoLobby,
  finalizarBloco,
  finalizarLobby,
  registrarJogada,
  registrarResultadoPerfil,
  useLobbies,
  useLobby,
  type Bloco,
  type Lobby,
} from "../online/useBotaoOnline";
import { MatchView, type Shot } from "./MatchView";
import { TeamPicker } from "./TeamPicker";

type Props = {
  perfil: Perfil;
  onSair: () => void;
  onEstadoPartida: (emPartida: boolean) => void;
};

export function OnlineMatch({ perfil, onSair, onEstadoPartida }: Props) {
  const [lobbyId, setLobbyId] = useState<string | null>(() => localStorage.getItem("botao_online_lobby_id"));
  const [meuTime, setMeuTime] = useState<string>(
    () => localStorage.getItem("botao_online_time_escolhido") || CUSTOM_TEAM_ID,
  );
  const [nomeSala, setNomeSala] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [nomes, setNomes] = useState<Record<string, string>>({});

  const { lobbies, carregando, recarregar } = useLobbies();
  const { lobby, blocos, souCriador } = useLobby(lobbyId, perfil);

  useEffect(() => {
    if (lobbyId) localStorage.setItem("botao_online_lobby_id", lobbyId);
    else localStorage.removeItem("botao_online_lobby_id");
    onEstadoPartida(!!lobbyId);
  }, [lobbyId, onEstadoPartida]);

  // nomes dos perfis das salas listadas
  useEffect(() => {
    const ids = Array.from(new Set(lobbies.flatMap((l) => [l.criador_id, l.adversario_id]).filter(Boolean))) as string[];
    const faltando = ids.filter((id) => !nomes[id]);
    if (!faltando.length) return;
    void supabase
      .from("botao_perfis")
      .select("id, time_personalizado, abreviacao_time")
      .in("id", faltando)
      .then(({ data }) => {
        if (!data) return;
        setNomes((prev) => {
          const next = { ...prev };
          for (const p of data as { id: string; time_personalizado: string }[]) next[p.id] = p.time_personalizado;
          return next;
        });
      });
  }, [lobbies, nomes]);

  // o criador cria o próximo bloco quando o adversário entra / bloco anterior termina
  useEffect(() => {
    if (!lobby || !souCriador || !lobby.adversario_id || lobby.status === "finalizado") return;
    const emAndamento = blocos.some((b) => b.status !== "finalizado");
    if (emAndamento) return;
    const vitoriasJ1 = blocos.filter((b) => b.status === "finalizado" && b.placar_j1 > b.placar_j2).length;
    const vitoriasJ2 = blocos.filter((b) => b.status === "finalizado" && b.placar_j2 > b.placar_j1).length;
    if (vitoriasJ1 >= 2 || vitoriasJ2 >= 2 || blocos.length >= 3) {
      if (blocos.length > 0) void finalizarLobby(lobby.id);
      return;
    }
    const time2 = localStorage.getItem("botao_online_time_adversario") || "pal";
    void criarBloco(lobby, blocos.length + 1, meuTime, time2);
  }, [lobby, souCriador, blocos, meuTime]);

  const blocoAtivo = blocos.find((b) => b.status !== "finalizado") ?? null;
  const souJogador1 = !!(lobby && lobby.criador_id === perfil.id);

  const vitorias = useMemo(() => {
    const j1 = blocos.filter((b) => b.status === "finalizado" && b.placar_j1 > b.placar_j2).length;
    const j2 = blocos.filter((b) => b.status === "finalizado" && b.placar_j2 > b.placar_j1).length;
    return { j1, j2 };
  }, [blocos]);

  /* ---------- partida ---------- */
  if (lobby && blocoAtivo && lobby.adversario_id) {
    return (
      <BlocoEmJogo
        key={blocoAtivo.id}
        bloco={blocoAtivo}
        perfil={perfil}
        souJogador1={souJogador1}
        onSairDaSala={() => setLobbyId(null)}
      />
    );
  }

  /* ---------- dentro da sala ---------- */
  if (lobby) {
    const encerrada = lobby.status === "finalizado" || vitorias.j1 >= 2 || vitorias.j2 >= 2;
    const euVenci = souJogador1 ? vitorias.j1 >= 2 : vitorias.j2 >= 2;
    return (
      <div className="space-y-5">
        <h2 className="font-display text-3xl">{lobby.nome}</h2>
        <div className="panel space-y-2">
          <p className="text-sm text-muted-foreground">
            Formato: melhor de 3 · {lobby.adversario_id ? "sala completa" : "aguardando adversário..."}
          </p>
          <p className="font-display text-2xl">
            {vitorias.j1} <span className="text-muted-foreground">x</span> {vitorias.j2}
          </p>
          {encerrada && (
            <p className="flex items-center gap-2 font-display text-lg text-accent-foreground">
              <Trophy className="size-5" /> {euVenci ? "Você venceu a série!" : "Seu adversário levou a série."}
            </p>
          )}
        </div>

        <ul className="space-y-2 text-sm">
          {blocos.map((b) => (
            <li key={b.id} className="panel flex items-center justify-between">
              <span>Bloco {b.numero}</span>
              <span className="font-mono">
                {b.placar_j1} - {b.placar_j2} {b.status === "finalizado" ? "" : "(em jogo)"}
              </span>
            </li>
          ))}
          {!blocos.length && <li className="text-muted-foreground">Nenhum bloco ainda.</li>}
        </ul>

        <button className="btn-ghost" onClick={() => setLobbyId(null)}>
          Sair da sala
        </button>
      </div>
    );
  }

  /* ---------- lista de salas ---------- */
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-3xl">Online</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie uma sala ou entre em uma. Melhor de 3 contra outro jogador, ao vivo.
          </p>
        </div>
        <button className="btn-ghost shrink-0 gap-2" onClick={() => void recarregar()}>
          <RefreshCw className="size-4" /> Atualizar
        </button>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="panel space-y-3">
        <p className="font-display text-lg">Nova sala</p>
        <input
          className="field-input"
          maxLength={40}
          placeholder={`Sala de ${perfil.nome}`}
          value={nomeSala}
          onChange={(e) => setNomeSala(e.target.value)}
        />
        <button
          className="btn-primary w-full gap-2"
          onClick={async () => {
            setErro(null);
            try {
              const l = await criarLobby(perfil, nomeSala, meuTime);
              setLobbyId(l.id);
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Erro ao criar a sala.");
            }
          }}
        >
          <Plus className="size-4" /> Criar sala
        </button>
      </div>

      <TeamPicker label="Time que você vai usar" value={meuTime} onChange={setMeuTime} />

      <div className="space-y-2">
        <p className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">Salas abertas</p>
        {carregando && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!carregando && !lobbies.length && <p className="text-sm text-muted-foreground">Nenhuma sala aberta.</p>}
        {lobbies.map((l: Lobby) => (
          <button
            key={l.id}
            className="panel flex items-center justify-between gap-3 text-left"
            onClick={async () => {
              setErro(null);
              try {
                await entrarNoLobby(l, perfil, meuTime);
                localStorage.setItem("botao_online_time_adversario", meuTime);
                setLobbyId(l.id);
              } catch (e) {
                setErro(e instanceof Error ? e.message : "Erro ao entrar na sala.");
              }
            }}
          >
            <span className="min-w-0">
              <span className="block truncate font-display text-lg">{l.nome}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {nomes[l.criador_id] ?? "Jogador"} {l.adversario_id ? "· sala cheia" : "· aguardando"}
              </span>
            </span>
            <Users className="size-5 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>

      <button className="btn-ghost" onClick={onSair}>
        Menu principal
      </button>
    </div>
  );
}

function BlocoEmJogo({
  bloco,
  perfil,
  souJogador1,
  onSairDaSala,
}: {
  bloco: Bloco;
  perfil: Perfil;
  souJogador1: boolean;
  onSairDaSala: () => void;
}) {
  const home = teamById(bloco.time1);
  const away = teamById(bloco.time2);
  return (
    <MatchView
      homeId={home.id}
      awayId={away.id}
      userSide={souJogador1 ? "home" : "away"}
      difficulty="profissional"
      turns={24}
      stageLabel={`Online · Bloco ${bloco.numero}`}
      net={{
        shots: (bloco.jogadas ?? []) as Shot[],
        onShot: (s: Shot) => void registrarJogada(bloco, s),
      }}
      onFinish={async (r) => {
        if (souJogador1) {
          await finalizarBloco(bloco, r.homeGoals, r.awayGoals);
        }
        const meusGols = souJogador1 ? r.homeGoals : r.awayGoals;
        const golsDele = souJogador1 ? r.awayGoals : r.homeGoals;
        await registrarResultadoPerfil(perfil, meusGols > golsDele);
      }}
      onQuit={onSairDaSala}
    />
  );
}
