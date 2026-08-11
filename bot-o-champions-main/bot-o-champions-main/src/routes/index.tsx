import { createFileRoute } from "@tanstack/react-router";
import { BotaoGame } from "@/modules/botao/BotaoGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Futebol de Botão — Copa dos Botões" },
      {
        name: "description",
        content:
          "Jogue futebol de botão com times brasileiros: amistosos, torneio com fase de grupos e mata-mata, três níveis de dificuldade e sala de troféus.",
      },
      { property: "og:title", content: "Futebol de Botão — Copa dos Botões" },
      {
        property: "og:description",
        content: "Amistosos, torneio em grupos e mata-mata, 3 dificuldades e progressão por troféus.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <BotaoGame />;
}
