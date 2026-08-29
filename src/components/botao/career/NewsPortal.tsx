import { useEffect, useMemo, useRef, useState } from "react";
import { Newspaper, Megaphone } from "lucide-react";
import type { Headline } from "./types";
import { AIService } from "../ai/AIService";
import type { Team } from "../data/teams";

/**
 * NewsPortal — Feed de Notícias Dinâmico e Deslizante (Carrossel Continuous
 * Loop). Substitui o bloco estático de notícias do hub.
 *
 * Fluxo infinito: o portal passa notícias automaticamente sem poluir a tela.
 * Conteúdo variado conectado ao jogo: análises debochadas dos jogos da rodada,
 * fofocas de bastidores, escândalos e reações da torcida. Os textos
 * vêm das `headlines` reais da carreira + geração assíncrona da IA (fallback
 * procedural) — tudo na voz da comentarista sarcástica.
 */

interface NewsPortalProps {
  headlines: Headline[];
  userTeam: Team;
  coachNome?: string;
  /** Quantidade máxima de itens no carrossel. */
  maxItens?: number;
}

interface NewsItem {
  id: string;
  manchete: string;
  tag: Headline["tag"] | "ia";
  rodada: number;
}

const TAG_LABEL: Record<string, string> = {
  "seu-time": "SEU TIME",
  geral: "GERAL",
  polemica: "POLÊMICA",
  zebra: "ZEBRA",
  coletiva: "COLETIVA",
  ia: "IA",
};

const TAG_CLASS: Record<string, string> = {
  "seu-time": "news-chip news-chip-time",
  geral: "news-chip news-chip-geral",
  polemica: "news-chip news-chip-polemica",
  zebra: "news-chip news-chip-zebra",
  coletiva: "news-chip news-chip-coletiva",
  ia: "news-chip news-chip-ia",
};

export function NewsPortal({
  headlines,
  userTeam,
  coachNome,
  maxItens = 10,
}: NewsPortalProps) {
  const [extras, setExtras] = useState<NewsItem[]>([]);
  const offsetRef = useRef(0);
  const startedRef = useRef(false);

  // Gera 2-3 notícias IA adicionais (análise debochada + bastidores), na voz
  // da comentarista. Roda uma vez ao montar (e quando as headlines mudam).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const ctx = {
          coach: coachNome ?? "Treinador",
          timeNome: userTeam?.name ?? "Meu Time",
          rodada: headlines[0]?.rodada ?? 0,
          categoria: Math.random() < 0.5 ? "escandalo" : "crise",
        };
        const [a, b] = await Promise.all([
          AIService.generateText(ctx, "noticia"),
          AIService.generateText({ ...ctx, categoria: "escandalo" }, "noticia"),
        ]);
        const items: NewsItem[] = [];
        if (a)
          items.push({
            id: `ia-a-${Date.now()}`,
            manchete: a,
            tag: "ia",
            rodada: ctx.rodada,
          });
        if (b)
          items.push({
            id: `ia-b-${Date.now()}`,
            manchete: b,
            tag: "ia",
            rodada: ctx.rodada,
          });
        setExtras(items);
      } catch {
        // fallback silencioso
      }
    })();
  }, [headlines, userTeam, coachNome]);

  const itens = useMemo<NewsItem[]>(() => {
    const base: NewsItem[] = headlines.slice(0, maxItens).map((h) => ({
      id: h.id,
      manchete: h.manchete,
      tag: h.tag,
      rodada: h.rodada,
    }));
    return [...base, ...extras].slice(0, maxItens + extras.length);
  }, [headlines, extras, maxItens]);

  // Carrossel contínuo: avança 1 item a cada 3.5s (loop infinito).
  useEffect(() => {
    if (itens.length <= 1) return;
    const id = setInterval(() => {
      offsetRef.current = (offsetRef.current + 1) % itens.length;
      setOffset(offsetRef.current);
    }, 3500);
    return () => clearInterval(id);
  }, [itens.length]);

  const [offset, setOffset] = useState(0);

  if (itens.length === 0) {
    return (
      <div className="panel news-portal-empty">
        <Newspaper className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          As notícias começam a circular após a primeira rodada.
        </p>
      </div>
    );
  }

  const atual = itens[offset % itens.length]!;

  return (
    <div className="news-portal" data-testid="news-portal">
      <div className="news-portal-head">
        <Megaphone className="size-4 text-amber-400" />
        <span className="news-portal-title">Portal de Notícias & Bastidores</span>
        <span className="news-portal-live">AO VIVO</span>
      </div>
      <div className="news-portal-ticker">
        <span key={atual.id} className="news-portal-item">
          <span className={TAG_CLASS[atual.tag] ?? TAG_CLASS["geral"]!}>
            {TAG_LABEL[atual.tag] ?? "GERAL"}
          </span>
          <span className="news-portal-text">{atual.manchete}</span>
          <span className="news-portal-rodada">R{atual.rodada}</span>
        </span>
      </div>
    </div>
  );
}
