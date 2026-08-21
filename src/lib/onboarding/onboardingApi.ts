import { supabase } from "@/integrations/supabase/client";
import type { CidadelaPerfil } from "@/lib/cidadela/profissoes";
import {
  estadoInicialOnboarding,
  normalizarEstadoOnboarding,
  type OnboardingEstado,
} from "./onboardingEngine";

/**
 * Persistência do onboarding (§6/§7):
 *  - Fonte de verdade: `botao_usuarios.estado_cidadela.onboarding` (JSONB) via RPC.
 *  - Espelho local: localStorage `cidadela:onboarding:{userId}` (not signed in
 *    yet? guardamos igual, e quando fizer login sincroniza).
 *
 * RELOAD seguro (§30): níCassandrao que só useState seria usado.
 */

const CHAVE = (userId: string) => `cidadela:onboarding:${userId}`;

export function lerOnboardingLocal(userId: string | null): OnboardingEstado | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(CHAVE(userId));
    if (!raw) return null;
    return normalizarEstadoOnboarding(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function salvarOnboardingLocal(userId: string | null, estado: OnboardingEstado): void {
  if (!userId) return;
  try {
    localStorage.setItem(CHAVE(userId), JSON.stringify(estado));
  } catch {
    /* sem storage */
  }
}

/** Extrai o onboarding do perfil Supabase (coluna `estado_cidadela` JSONB). */
export function extrairOnboardingDoPerfil(perfil: CidadelaPerfil | null): OnboardingEstado | null {
  if (!perfil) return null;
  const raw = (perfil.estado_cidadela as Record<string, unknown> | null)?.["onboarding"];
  if (!raw) return null;
  return normalizarEstadoOnboarding(raw);
}

/** "anon" — chave de dispositivo para usuários não logados (§33). */
export const ID_ANONIMO = "anon";

/**
 * Carrega: preferência do RPC (autenticado); fallback local; estado inicial.
 * Migração anônimo→conta: sem estado remoto mas com espelho de `anon` → o
 * tour feito ANTES do login segue feito (persiste no Supabase e no userId).
 */
export async function carregarOnboarding(userId: string | null): Promise<OnboardingEstado> {
  const chave = userId ?? ID_ANONIMO;
  const local = lerOnboardingLocal(chave);
  if (userId) {
    try {
      const { data, error } = await supabase.rpc("obter_perfil_cidadela");
      if (!error && data) {
        const remoto = extrairOnboardingDoPerfil(
          data as unknown as CidadelaPerfil,
        );
        if (remoto) return remoto;
      }
    } catch {
      /* offline → local */
    }
    // Sem estado remoto: migra o espelho anônimo (tour feito pré-login) e
    // todo o continuo de sessão local do próprio userId.
    const anon = lerOnboardingLocal(ID_ANONIMO);
    const migrado = local ?? anon;
    if (migrado) {
      salvarOnboardingLocal(userId, migrado);
      try {
        await supabase.rpc("atualizar_estado_cidadela", {
          p_estado: { onboarding: migrado } as unknown as import("@/integrations/supabase/types").Json,
        });
      } catch {
        /* offline: local do userId já cobre */
      }
      return migrado;
    }
    return estadoInicialOnboarding();
  }
  return local ?? estadoInicialOnboarding();
}

/** Salva em local sempre; botao_usuarios quando autenticado. */
export async function salvarOnboarding(userId: string | null, estado: OnboardingEstado): Promise<void> {
  salvarOnboardingLocal(userId ?? ID_ANONIMO, estado);
  if (!userId) return;
  try {
    await supabase
      .from("botao_usuarios")
      .update({ estado_cidadela: { onboarding: estado } })
      .eq("user_id", userId);
  } catch {
    /* local espelhado continua válido */
  }
}
