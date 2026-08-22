/**
 * Propriedade de clubes visível para toda a Cidadela + propostas entre
 * jogadores (compra de clube / contratação de treinador).
 *
 * Fonte de verdade: `botao_times.dono_user_id` (mapa público) e
 * `cidadela_propostas_clubes` (negociações). O SOV das transferências nasce
 * no bank_ledger via RPC — nunca no cliente.
 */
import { supabase } from "@/integrations/supabase/client";

export type DonoClube = { donoUserId: string; donoNome: string | null };

export type PropostaClube = {
  id: string;
  deUserId: string;
  deNome: string | null;
  paraUserId: string;
  paraNome: string | null;
  clubeId: string;
  clubeNome: string;
  tipo: "compra" | "treinador";
  valorSov: number;
  status: "pendente" | "aceita" | "recusada" | "cancelada";
  createdAt: string;
};

function logErro(contexto: string, error: unknown) {
  const e = error as { code?: string; message?: string; details?: string; hint?: string };
  console.error(`[ClubesPropriedade] ${contexto}:`, e?.code, e?.message, e?.details, e?.hint);
}

/** Mapa clubeId → dono. Retorna null em erro (a UI NÃO assume "sem dono"). */
export async function mapaDonosClubes(): Promise<Map<string, DonoClube> | null> {
  const { data, error } = await supabase.rpc("cidadela_mapa_clubes");
  if (error || !Array.isArray(data)) {
    logErro("cidadela_mapa_clubes", error);
    return null;
  }
  const mapa = new Map<string, DonoClube>();
  for (const row of data) {
    if (row.dono_user_id) {
      mapa.set(row.clube_id, { donoUserId: row.dono_user_id, donoNome: row.dono_nome });
    }
  }
  return mapa;
}

/**
 * Registra o usuário autenticado como dono do clube (chamado ao atingir 100%
 * de participação na carreira). Retorna true em sucesso; false em erro
 * (inclusive "clube já tem outro dono") — o chamador decide como informar.
 */
export async function registrarDonoClube(clubeId: string): Promise<boolean> {
  const { error } = await supabase.rpc("cidadela_registrar_dono_clube", { p_clube_id: clubeId });
  if (error) {
    logErro("cidadela_registrar_dono_clube", error);
    return false;
  }
  return true;
}

/** Libera o clube quando o dono vende cotas e deixa de ter 100%. */
export async function liberarDonoClube(clubeId: string): Promise<boolean> {
  const { error } = await supabase.rpc("cidadela_liberar_dono_clube", { p_clube_id: clubeId });
  if (error) {
    logErro("cidadela_liberar_dono_clube", error);
    return false;
  }
  return true;
}

export async function listarPropostasClubes(): Promise<PropostaClube[] | null> {
  const { data, error } = await supabase.rpc("cidadela_listar_propostas_clubes");
  if (error || !Array.isArray(data)) {
    logErro("cidadela_listar_propostas_clubes", error);
    return null;
  }
  return data.map((p) => ({
    id: p.id,
    deUserId: p.de_user_id,
    deNome: p.de_nome,
    paraUserId: p.para_user_id,
    paraNome: p.para_nome,
    clubeId: p.clube_id,
    clubeNome: p.clube_nome,
    tipo: p.tipo === "treinador" ? "treinador" : "compra",
    valorSov: p.valor_sov,
    status:
      p.status === "aceita" || p.status === "recusada" || p.status === "cancelada"
        ? p.status
        : "pendente",
    createdAt: p.created_at,
  }));
}

/** Envia proposta. Retorna mensagem de erro legível ou null em sucesso. */
export async function enviarPropostaClube(
  paraUserId: string,
  clubeId: string,
  tipo: "compra" | "treinador",
  valorSov: number,
): Promise<string | null> {
  const { error } = await supabase.rpc("cidadela_enviar_proposta_clube", {
    p_para: paraUserId,
    p_clube_id: clubeId,
    p_tipo: tipo,
    p_valor: Math.max(0, Math.floor(valorSov)),
  });
  if (error) {
    logErro("cidadela_enviar_proposta_clube", error);
    return error.message ?? "Não foi possível enviar a proposta.";
  }
  return null;
}

/** Aceita/recusa proposta recebida. Retorna mensagem de erro ou null. */
export async function responderPropostaClube(
  propostaId: string,
  aceitar: boolean,
): Promise<string | null> {
  const { error } = await supabase.rpc("cidadela_responder_proposta_clube", {
    p_id: propostaId,
    p_aceitar: aceitar,
  });
  if (error) {
    logErro("cidadela_responder_proposta_clube", error);
    return error.message ?? "Não foi possível responder a proposta.";
  }
  return null;
}
