import { useCallback, useEffect, useState } from "react";
import { carregarOnboarding, salvarOnboarding } from "./onboardingApi";
import {
  avancarStage,
  concluirOnboarding,
  ehConcluido,
  marcarDestino,
  type OnboardingDestinoKey,
  type OnboardingEstado,
} from "./onboardingEngine";

/**
 * Máquina de onboarding de um usuário (§7): o estado persiste no Supabase
 * com espelho local; reload nunca perde onde parou (§30).
 */
export function useOnboarding(userId: string | null) {
  const [estado, setEstado] = useState<OnboardingEstado | null>(null);
  const [carregando, setCarregando] = useState(Boolean(userId));

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    void carregarOnboarding(userId).then((e) => {
      if (!vivo) return;
      setEstado(e);
      setCarregando(false);
    });
    return () => {
      vivo = false;
    };
  }, [userId]);

  /** Persistência centralizada: todas as mutações por aqui (§6). */
  const mutar = useCallback(
    (proximo: OnboardingEstado) => {
      setEstado(proximo);
      // Local sempre; RPC quando autenticado (§30 reload seguro).
      void salvarOnboarding(userId, proximo);
    },
    [userId],
  );

  const avancar = useCallback(() => {
    if (!estado) return;
    mutar(avancarStage(estado));
  }, [estado, mutar]);

  const escolherDestino = useCallback(
    (destino: OnboardingDestinoKey) => {
      if (!estado) return;
      mutar(marcarDestino(estado, destino));
    },
    [estado, mutar],
  );

  const concluir = useCallback(() => {
    if (!estado) return;
    mutar(concluirOnboarding(estado));
  }, [estado, mutar]);

  return {
    estado,
    carregando,
    concluido: estado ? ehConcluido(estado) : true,
    avancar,
    escolherDestino,
    concluir,
    setEstado: mutar,
  };
}
