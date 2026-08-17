import { Newspaper } from "lucide-react";
import type { Headline } from "./types";

const TAG_STYLE: Record<Headline["tag"], string> = {
  "seu-time": "bg-primary/20 text-primary border-primary/40",
  geral: "bg-slate-700/30 text-slate-200 border-white/10",
  polemica: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  zebra: "bg-purple-500/20 text-purple-200 border-purple-500/30",
  coletiva: "bg-blue-500/15 text-blue-200 border-blue-500/30",
};

const TAG_LABEL: Record<Headline["tag"], string> = {
  "seu-time": "SEU TIME",
  geral: "GERAL",
  polemica: "POLÊMICA",
  zebra: "ZEBRA",
  coletiva: "COLETIVA",
};

export function NewsFeed({ headlines, titulo }: { headlines: Headline[]; titulo?: string }) {
  if (headlines.length === 0) return null;
  return (
    <div className="panel" data-testid="news-feed">
      <div className="mb-3 flex items-center gap-2">
        <Newspaper className="size-5 text-primary" />
        <p className="font-display text-lg">{titulo ?? "Jornal do Torneio"}</p>
      </div>
      <ul className="space-y-3">
        {headlines.slice(0, 8).map((h) => (
          <li key={h.id} className="border-l-2 border-white/10 pl-3">
            <div className="flex items-center gap-2">
              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${TAG_STYLE[h.tag]}`}>
                {TAG_LABEL[h.tag]}
              </span>
              <span className="text-[10px] text-muted-foreground">Rodada {h.rodada}</span>
            </div>
            <p className="mt-1 font-display text-sm leading-snug">{h.manchete}</p>
            {h.subtitulo && <p className="text-xs text-muted-foreground">{h.subtitulo}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
