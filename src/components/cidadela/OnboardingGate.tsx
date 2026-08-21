type Props = {
  children: React.ReactNode;
  /** Mantido por compatibilidade com as rotas que passavam destino. */
  destinoInicial?: string | undefined;
};

/**
 * O tour NÃO é mais um portão full-screen (era um celular gigante que
 * bloqueava a rota). O usuário entra direto na Cidadela, escolhe TRILHA ou
 * FUTEBOL, e o TOUR CONTEXTUAL (TourContextual — bolhas ancoradas em
 * elementos reais) acontece DEPOIS da escolha do módulo. Este componente
 * virou pass-through transparente; o estado de conclusão persiste no
 * onboarding engine (useOnboarding) consumido pelo TourContextual.
 */
export function OnboardingGate({ children }: Props) {
  return <>{children}</>;
}
