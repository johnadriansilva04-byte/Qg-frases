import {
  salvarEstadoCidadela,
  type CidadelaPerfil,
} from "@/lib/cidadela/profissoes";
import { registrarTransacaoSov } from "@/lib/financial/sovApi";

/** Persiste patch de estado individual + delta de reputação. */
export async function salvareEstadoCidadelaHelper(
  userId: string,
  patch: Record<string, unknown>,
  deltaReputacao: number,
): Promise<CidadelaPerfil> {
  return salvarEstadoCidadela(userId, patch, deltaReputacao);
}

/** Registra a transação de SOV de uma atividade de campus. */
export async function salvareSovHelper(
  userId: string,
  sov: number,
  atividadeId: string,
  opcaoIdx: number,
): Promise<void> {
  await registrarTransacaoSov(
    userId,
    sov,
    sov >= 0 ? "reward" : "penalty",
    `Campus: atividade ${atividadeId}`,
    "campus",
    { atividadeId, opcaoIdx },
  );
}
