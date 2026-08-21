import { useNavigate } from "@tanstack/react-router";
import { useBotaoAuth } from "@/components/botao/online/useBotaoAuth";
import { OnboardingTour } from "@/components/cidadela/OnboardingTour";
import { useOnboarding } from "@/lib/onboarding/useOnboarding";
import type { OnboardingDestinoKey } from "@/lib/onboarding/onboardingEngine";

type Props = {
  children: React.ReactNode;
  /** Destino atual (§32: tour contextual respeita a rota clicada). */
  destinoInicial?: OnboardingDestinoKey | undefined;
};

/**
 * PORTÃO DO ONBOARDING (§2/§33): reconhece usuário novo e só libera a rota
 * depois do tour concluído. Sessão é recuperada pela autenticação única
 * (§5); se onboarding COMPLETED → destino direto, nunca re-apaga (§7/§30).
 */
export function OnboardingGate({ children, destinoInicial }: Props) {
  const navigate = useNavigate();
  const { perfil } = useBotaoAuth();
  const userId = perfil?.user_id ?? null;
  const onboarding = useOnboarding(userId);

  if (onboarding.carregando) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
      </div>
    );
  }

  if (!onboarding.concluido) {
    return (
      <OnboardingTour
        perfil={perfil}
        destinoInicial={destinoInicial}
        onboarding={onboarding}
        onConcluir={(link) => navigate({ to: link })}
      />
    );
  }

  return <>{children}</>;
}
