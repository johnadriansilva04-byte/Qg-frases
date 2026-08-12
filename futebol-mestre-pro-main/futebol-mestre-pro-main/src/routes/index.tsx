import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy, Swords, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mesa Soberana — Portal de Futebol de Botão" },
      {
        name: "description",
        content:
          "Portal de futebol de botão: monte Amistosos Lendários, encare o Seminário Retro de 1940 ao século XVIII e dispute mesas online em tempo real.",
      },
      { property: "og:title", content: "Mesa Soberana — Portal de Futebol de Botão" },
      {
        property: "og:description",
        content:
          "Amistoso Lendário, Seminário Retro e mesas online: futebol de botão com física de verdade no celular e no computador.",
      },
    ],
  }),
  component: Portal,
});

function Portal() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <header className="text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Futebol de botão
        </p>
        <h1 className="mt-4 text-4xl leading-none sm:text-6xl">
          Mesa <span className="text-primary">Soberana</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Toque, palheta e disco: arraste o botão para trás e solte. Três toques por vez, gol no feltro e a
          soberania em jogo — no celular ou no computador.
        </p>
      </header>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <Cartao
          to="/amistoso"
          icone={<Swords className="h-5 w-5 text-primary" />}
          titulo="Amistoso Lendário"
          texto="Escolha livremente as duas confrarias no catálogo, ajuste jogadas e tempo de turno e entre em campo."
          rodape="Catálogo completo de times"
        />
        <Cartao
          to="/retro"
          icone={<Trophy className="h-5 w-5 text-primary" />}
          titulo="Seminário / Retro Challenge"
          texto="De 1940 ao século XVIII: cinco etapas históricas, feltro envelhecido e troféus acumulados no seu perfil."
          rodape="Desafio por etapas"
        />
        <Cartao
          to="/online"
          icone={<Users className="h-5 w-5 text-primary" />}
          titulo="Online — Salas e Blocos"
          texto="Crie uma sala, abra um bloco e espere um adversário. Placar e turnos sincronizados em tempo real."
          rodape="Melhor de 3, 6 ou 9"
          destaque
        />
      </section>

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        Já tem conta? O portal reconhece seu perfil, seu time personalizado e suas três cores automaticamente.
      </footer>
    </main>
  );
}

function Cartao({
  to,
  icone,
  titulo,
  texto,
  rodape,
  destaque = false,
}: {
  to: string;
  icone: React.ReactNode;
  titulo: string;
  texto: string;
  rodape: string;
  destaque?: boolean;
}) {
  return (
    <article className={`surface flex flex-col justify-between p-6 ${destaque ? "border-primary glow" : ""}`}>
      <div>
        <div className="flex items-center gap-2">
          {icone}
          <h2 className="text-2xl leading-none">{titulo}</h2>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{texto}</p>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{rodape}</span>
        <Button asChild variant={destaque ? "default" : "secondary"}>
          <Link to={to}>Entrar</Link>
        </Button>
      </div>
    </article>
  );
}
