/**
 * Camada de acesso ao banco (Supabase).
 * Todas as consultas usam exclusivamente as tabelas botao_usuarios,
 * botao_times, botao_lobbies e botao_blocos.
 */
import { supabase } from "@/integrations/supabase/client";
import { bootstrapFinanceiro } from "@/lib/financial/sovBankApi";
import { registrarTransacaoSov } from "@/lib/financial/sovApi";
import { mergeProgressInSupabase } from "@/components/botao/storage";

/**
 * Alinha o cache `botao_usuarios.pontos_soberania` ao saldo autoritativo do
 * ledger. Só escreve quando diverge; chamadores só passam saldos REAIS
 * (retornados pelo ledger) — erro nunca chega aqui como número.
 */
export async function alinharCacheSoberania(userId: string, saldo: number): Promise<void> {
  const { error } = await supabase
    .from("botao_usuarios")
    .update({ pontos_soberania: Math.max(0, Math.round(saldo)) })
    .eq("user_id", userId);
  if (error) console.warn("[api] falha ao alinhar cache de soberania:", error);
}

export type TimeBotao = {
  id: string;
  nome: string;
  abreviacao: string;
  cores: string[];
  pais: string;
  liga: string;
  is_personalizado: boolean;
  usuario_id: string | null;
  created_at: string;
};

export type UsuarioBotao = {
  id: string;
  user_id: string;
  email: string;
  nome: string;
  cores: string[];
  time_personalizado: string;
  abreviacao_time: string;
  numero_jogador: number;
  pontos_soberania: number;
  partidas_jogadas: number;
  partidas_vencidas: number;
  progresso_caminpanha: any;
  created_at: string;
  updated_at: string;
  campeonatos_ganhos: number;
  gols_feitos: number;
  gols_sofridos: number;
  vitorias: number;
  derrotas: number;
  empates: number;
  tatica?: string | null;
  botoes_nomes?: string[] | null;
};

export type Lobby = {
  id: string;
  created_at: string;
  nome: string;
  criador_session: string;
  criador_nome: string;
  formato: string;
  status: string;
  max_blocos: number;
};

export type Bloco = {
  id: string;
  created_at: string;
  lobby_id: string;
  jogador1_session: string;
  jogador1_nome: string;
  jogador1_time: string;
  jogador2_session: string | null;
  jogador2_nome: string | null;
  jogador2_time: string | null;
  status: string;
  turno: string;
  jogadas_restantes: number;
  timestamp_inicio_turno: string;
  tempo_maximo_turno: number;
  jogador1_gols: number;
  jogador2_gols: number;
  rodada: number;
  vencedor: string | null;
  finalizada_em: string | null;
};

export type ProgressoCampanha = {
  titles: { amador: number; profissional: number; lenda: number };
  trophies: string[];
  friendlies: { w: number; d: number; l: number };
};

export const PROGRESSO_PADRAO: ProgressoCampanha = {
  titles: { amador: 0, profissional: 0, lenda: 0 },
  trophies: [],
  friendlies: { w: 0, d: 0, l: 0 },
};

export function lerProgresso(valor: unknown): ProgressoCampanha {
  const bruto = (valor ?? {}) as Partial<ProgressoCampanha>;
  return {
    titles: { ...PROGRESSO_PADRAO.titles, ...(bruto.titles ?? {}) },
    trophies: Array.isArray(bruto.trophies) ? bruto.trophies : [],
    friendlies: { ...PROGRESSO_PADRAO.friendlies, ...(bruto.friendlies ?? {}) },
  };
}

/* ---------------------------------- Times --------------------------------- */

/** Catálogo completo do Amistoso Lendário (todos os times do banco). */
export async function getLendarios(): Promise<TimeBotao[]> {
  const { data, error } = await supabase
    .from("botao_times")
    .select("*")
    .order("pais", { ascending: true })
    .order("nome", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Times do usuário logado (inclui o time personalizado criado no cadastro). */
export async function getMeusTimes(userId: string): Promise<TimeBotao[]> {
  const { data, error } = await supabase
    .from("botao_times")
    .select("*")
    .eq("usuario_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/* -------------------------------- Usuário -------------------------------- */

export async function getUsuarioAtual(userId: string): Promise<UsuarioBotao | null> {
  const { data, error } = await supabase
    .from("botao_usuarios")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type DadosNovoPerfil = {
  nome?: string | undefined;
  time?: string | undefined;
  abreviacao?: string | undefined;
  numero?: number | undefined;
  cores?: string[] | undefined;
};

/**
 * Cria o perfil de jogo SOMENTE em contextos legítimos de cadastro:
 *  1. recuperação do primeiro acesso imediatamente após o signUp (trigger
 *     falhou — janela determinística de `decidirDestinoSessao`);
 *  2. re-cadastro explícito com prova de posse (senha válida) no fluxo de
 *     cadastro quando o e-mail já existe em auth.users sem perfil de jogo.
 * NUNCA é chamada por uma sessão antiga sem perfil (essa é recusada).
 */
export async function criarPerfilSeNaoExistir(
  userId: string,
  email: string,
  dados?: string | DadosNovoPerfil,
): Promise<UsuarioBotao | null> {
  // Primeiro tenta buscar
  const existente = await getUsuarioAtual(userId);
  if (existente) return existente;

  const d: DadosNovoPerfil = typeof dados === "string" ? { nome: dados } : (dados ?? {});

  // Se não existe, cria
  const { data, error } = await supabase
    .from("botao_usuarios")
    .insert({
      user_id: userId,
      email: email,
      nome: d.nome || email.split("@")[0] || email,
      time_personalizado: d.time || "Meu Time",
      abreviacao_time: d.abreviacao || "MTI",
      numero_jogador: d.numero ?? 10,
      pontos_soberania: 50,
      cores: d.cores ?? ["#FF0000", "#00FF00", "#0000FF"],
    })
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao criar perfil:", error);
    return null;
  }

  // Bootstrap financeiro: carteira + bônus de cadastro idempotente no ledger.
  // O cache pontos_soberania é alinhado ao saldo AUTORITATIVO retornado pelo
  // SOV BANK — nunca assume 50 sem o lançamento ter acontecido. Em erro real
  // (null), o login seguinte tenta de novo (bootstrap roda em toda sessão).
  const saldo = await bootstrapFinanceiro(userId);
  if (saldo != null && saldo !== data.pontos_soberania) {
    await alinharCacheSoberania(userId, saldo);
    data.pontos_soberania = saldo;
  }

  return data;
}

/** Salva o resultado de uma partida no perfil do jogador. */
export async function salvarResultado(params: {
  usuario: UsuarioBotao;
  resultado: "v" | "e" | "d";
  pontos: number;
  trofeu?: string | undefined;
  titulo?: "amador" | "profissional" | "lenda" | undefined;
}): Promise<UsuarioBotao> {
  const progresso = lerProgresso(params.usuario.progresso_caminpanha);
  if (params.resultado === "v") progresso.friendlies.w += 1;
  else if (params.resultado === "e") progresso.friendlies.d += 1;
  else progresso.friendlies.l += 1;

  if (params.trofeu && !progresso.trophies.includes(params.trofeu)) {
    progresso.trophies.push(params.trofeu);
  }
  if (params.titulo) progresso.titles[params.titulo] += 1;

  // Regra do SOV Bank: nenhum Sovereign entra/sai fora do ledger. O saldo
  // autoritativo retornado pela RPC vira o cache pontos_soberania. Se o
  // ledger não confirma, a operação econômica NÃO é concluída: o cache
  // permanece como estava (nunca confirmado com cálculo local).
  let saldoSov: number | null = null;
  if (params.pontos !== 0) {
    saldoSov = await registrarTransacaoSov(
      params.usuario.user_id,
      params.pontos,
      params.pontos >= 0 ? "reward" : "penalty",
      `Resultado de partida (${params.resultado === "v" ? "vitória" : params.resultado === "e" ? "empate" : "derrota"})`,
      "online",
      { resultado: params.resultado },
      { sourceEvent: "salvar_resultado" },
    );
    if (saldoSov === null) {
      console.warn(
        "[api] SOV da partida NÃO confirmado: ledger indisponível — cache preservado (nada criado localmente).",
      );
    }
  }

  const { data, error } = await supabase
    .from("botao_usuarios")
    .update({
      partidas_jogadas: params.usuario.partidas_jogadas + 1,
      partidas_vencidas: params.usuario.partidas_vencidas + (params.resultado === "v" ? 1 : 0),
      pontos_soberania: saldoSov ?? params.usuario.pontos_soberania,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", params.usuario.user_id)
    .select("*")
    .single();
  if (error) throw error;
  // O JSONB de campanha é mesclado (nunca sobrescrito): regravar o objeto
  // inteiro a partir da cópia em memória apagaria chaves salvas por outras
  // telas (carreira, bolsa, torneio). Só `friendlies` é mesclado — trophies/
  // titles deste fluxo legado usam formato string[], incompatível com o modo
  // carreira, e não devem tocar na chave compartilhada.
  await mergeProgressInSupabase(params.usuario.user_id, {
    friendlies: progresso.friendlies,
  });
  return data;
}

/* --------------------------- Lobbies e blocos ---------------------------- */

export async function getLobbiesAtivos(): Promise<Lobby[]> {
  const { data, error } = await supabase
    .from("botao_lobbies")
    .select("*")
    .eq("status", "ativo")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function criarLobby(params: {
  nome: string;
  criadorSession: string;
  criadorNome: string;
  formato: string;
}): Promise<Lobby> {
  const { data, error } = await supabase
    .from("botao_lobbies")
    .insert({
      nome: params.nome,
      criador_session: params.criadorSession,
      criador_nome: params.criadorNome,
      formato: params.formato,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function encerrarLobby(lobbyId: string): Promise<void> {
  const { error } = await supabase
    .from("botao_lobbies")
    .update({ status: "encerrado" })
    .eq("id", lobbyId);
  if (error) throw error;
}

export async function getBlocos(lobbyId: string): Promise<Bloco[]> {
  const { data, error } = await supabase
    .from("botao_blocos")
    .select("*")
    .eq("lobby_id", lobbyId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function criarBloco(params: {
  lobbyId: string;
  session: string;
  nome: string;
  timeId: string;
  jogadas: number;
  tempoTurno: number;
}): Promise<Bloco> {
  const { data, error } = await supabase
    .from("botao_blocos")
    .insert({
      lobby_id: params.lobbyId,
      jogador1_session: params.session,
      jogador1_nome: params.nome,
      jogador1_time: params.timeId,
      jogadas_restantes: params.jogadas,
      tempo_maximo_turno: params.tempoTurno,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function entrarNoBloco(params: {
  blocoId: string;
  session: string;
  nome: string;
  timeId: string;
}): Promise<Bloco> {
  const { data, error } = await supabase
    .from("botao_blocos")
    .update({
      jogador2_session: params.session,
      jogador2_nome: params.nome,
      jogador2_time: params.timeId,
      status: "em_jogo",
      turno: "jogador1",
      timestamp_inicio_turno: new Date().toISOString(),
    })
    .eq("id", params.blocoId)
    .is("jogador2_session", null)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getBloco(blocoId: string): Promise<Bloco | null> {
  const { data, error } = await supabase
    .from("botao_blocos")
    .select("*")
    .eq("id", blocoId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Registra um gol usando a função do banco. */
export async function registrarGolBloco(blocoId: string, jogador: "jogador1" | "jogador2") {
  const { error } = await supabase.rpc("registrar_gol_bloco", {
    p_bloco_id: blocoId,
    p_jogador: jogador,
  } as any);
  if (error) throw error;
}

/** Consome uma jogada (decrementa, alterna turno e finaliza no zero). */
export async function registrarJogadaBloco(blocoId: string) {
  console.log("[API] Registrando jogada para bloco:", blocoId);

  // Tentar usar RPC primeiro
  const { error: rpcError, data: rpcData } = await supabase.rpc("registrar_jogada_bloco", {
    p_bloco_id: blocoId,
  } as any);

  if (rpcError) {
    console.error("[API] Erro ao registrar jogada via RPC:", rpcError);
    console.log("[API] Tentando método alternativo via update direto...");

    // Método alternativo: fazer update direto
    const { data: bloco, error: fetchError } = await supabase
      .from("botao_blocos")
      .select("*")
      .eq("id", blocoId)
      .single();

    if (fetchError) {
      console.error("[API] Erro ao buscar bloco:", fetchError);
      throw fetchError;
    }

    const novasJogadas = Math.max(0, ((bloco.jogadas_restantes as number) || 20) - 1);
    const novoTurno = (bloco.turno as string) === "jogador1" ? "jogador2" : "jogador1";

    console.log("[API] Atualizando bloco:", { novasJogadas, novoTurno });

    const { error: updateError } = await supabase
      .from("botao_blocos")
      .update({
        jogadas_restantes: novasJogadas,
        turno: novoTurno,
        timestamp_inicio_turno: new Date().toISOString(),
        status: novasJogadas <= 0 ? "finalizado" : bloco.status,
        vencedor:
          novasJogadas <= 0
            ? ((bloco.jogador1_gols as number) || 0) > ((bloco.jogador2_gols as number) || 0)
              ? "jogador1"
              : ((bloco.jogador2_gols as number) || 0) > ((bloco.jogador1_gols as number) || 0)
                ? "jogador2"
                : "empate"
            : bloco.vencedor,
        finalizada_em: novasJogadas <= 0 ? new Date().toISOString() : bloco.finalizada_em,
      } as any)
      .eq("id", blocoId);

    if (updateError) {
      console.error("[API] Erro ao atualizar bloco:", updateError);
      throw updateError;
    }

    console.log("[API] Jogada registrada com sucesso via update direto");
    return;
  }

  console.log("[API] Jogada registrada com sucesso via RPC:", rpcData);
}

export async function forcarTrocaTurnoBloco(blocoId: string) {
  const { error } = await supabase.rpc("forcar_troca_turno_bloco", { p_bloco_id: blocoId });
  if (error) throw error;
}

export async function finalizarBloco(blocoId: string, vencedor: string) {
  const { error } = await supabase.rpc("finalizar_bloco", {
    p_bloco_id: blocoId,
    p_vencedor: vencedor,
  });
  if (error) throw error;
}

export async function sairDoBloco(blocoId: string) {
  const { error } = await supabase.from("botao_blocos").delete().eq("id", blocoId);
  if (error) throw error;
}

/** Limpa salas e blocos antigos (mais de 4 minutos) */
export async function limparSalasAntigas() {
  const { error } = await supabase.rpc("limpar_salas_antigas");
  if (error) {
    console.error("[API] Erro ao limpar salas antigas:", error);
    throw error;
  }
  console.log("[API] Salas antigas limpas com sucesso");
}

/* --------------------- Personalização do clube (PS2) --------------------- */

export type PerfilClubeInput = {
  nome?: string;
  time?: string;
  abreviacao?: string;
  cores?: string[];
  tatica?: string;
  botoes?: string[];
};

/**
 * Atualiza a personalização do clube do usuário (nome, time, cores, tática,
 * nomes dos botões) via RPC `atualizar_perfil_clube` (SECURITY DEFINER,
 * valida auth.uid()). Retorna o perfil atualizado.
 */
export async function atualizarPerfilClube(
  userId: string,
  input: PerfilClubeInput,
): Promise<UsuarioBotao | null> {
  const { data, error } = await supabase.rpc("atualizar_perfil_clube", {
    p_uid: userId,
    p_nome: input.nome ?? null,
    p_time: input.time ?? null,
    p_abreviacao: input.abreviacao ?? null,
    p_cores: input.cores ?? null,
    p_tatica: input.tatica ?? null,
    p_botoes: input.botoes ?? null,
  });
  if (error) {
    console.error("[API] Erro ao atualizar perfil do clube:", error);
    throw error;
  }
  return (data as UsuarioBotao | null) ?? null;
}

/**
 * Apaga a conta DE VERDADE: perfil, carteira SOV, extrato, carreira, dados da
 * Cidadela, mesas online e o próprio registro de autenticação (auth.users) —
 * tudo via RPC `excluir_conta_total` (SECURITY DEFINER). Se a migration ainda
 * não estiver aplicada em produção, cai no comportamento legado (apaga só o
 * perfil público) para não quebrar o botão. Retorna true se removeu.
 */
export async function excluirContaUsuario(userId: string): Promise<boolean> {
  const { error } = await (supabase.rpc as CallableFunction)("excluir_conta_total");
  if (error) {
    const msg = String((error as { message?: string }).message ?? "");
    const codigo = String((error as { code?: string }).code ?? "");
    const funcaoInexistente =
      codigo === "PGRST202" || codigo === "42883" || /function .* does not exist/i.test(msg);
    if (!funcaoInexistente) {
      console.error("[API] Erro ao excluir conta (RPC):", error);
      throw error;
    }
    // Fallback legado (migration pendente): apaga só o perfil público.
    const { error: errDelete } = await supabase
      .from("botao_usuarios")
      .delete()
      .eq("user_id", userId);
    if (errDelete) {
      console.error("[API] Erro ao excluir perfil:", errDelete);
      throw errDelete;
    }
  }
  // Sessão encerrada — com a RPC aplicada, o auth.users já não existe.
  await supabase.auth.signOut();
  return true;
}
