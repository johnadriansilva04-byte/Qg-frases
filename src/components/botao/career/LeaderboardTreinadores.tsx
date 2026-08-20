import { useEffect, useState } from "react";
import { Crown, Medal, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { nivelDoTreinador } from "@/components/botao/career/types";

type Row = {
  user_id: string;
  nome: string;
  time_personalizado: string;
  abreviacao_time: string;
  cores: string[];
  coach_apelido?: string | null;
  coach_nome?: string | null;
  pontos_soberania: number;
  titulos_treinador?: number | null;
  partidas_vencidas?: number;
  partidas_jogadas?: number;
};

export function LeaderboardTreinadores({ compact = false }: { compact?: boolean } = {}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Query base — só colunas garantidas na versão atual do banco
        const base = await (supabase as any)
          .from("botao_usuarios")
          .select(
            "user_id, nome, time_personalizado, abreviacao_time, cores, pontos_soberania, partidas_vencidas, partidas_jogadas, progresso_caminpanha",
          )
          .order("pontos_soberania", { ascending: false })
          .limit(20);
        if (!alive) return;
        if (base.error) throw base.error;
        // Extrair coach + titulos do JSONB progresso_caminpanha (fonte da verdade da carreira)
        const rows = ((base.data ?? []) as any[]).map((r) => {
          const prog = r.progresso_caminpanha ?? {};
          const coach = prog.career?.coach ?? null;
          return {
            user_id: r.user_id,
            nome: r.nome,
            time_personalizado: r.time_personalizado,
            abreviacao_time: r.abreviacao_time,
            cores: r.cores,
            pontos_soberania: r.pontos_soberania,
            partidas_vencidas: r.partidas_vencidas,
            partidas_jogadas: r.partidas_jogadas,
            coach_apelido: coach?.apelido ?? null,
            coach_nome: coach?.nome ?? null,
            titulos_treinador: coach?.titulos ?? 0,
          } as Row;
        });
        setRows(rows);
      } catch (e: any) {
        if (!alive) return;
        setErro(e?.message ?? "Erro ao carregar ranking");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="panel flex items-center justify-center gap-2 py-8" data-testid="leaderboard-loading">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando ranking…</span>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="panel text-center text-sm text-muted-foreground" data-testid="leaderboard-error">
        Não foi possível carregar o ranking agora.
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="panel text-center text-sm text-muted-foreground" data-testid="leaderboard-empty">
        Nenhum treinador registrado ainda. Seja o primeiro a fazer história!
      </div>
    );
  }

  const initialLimit = compact ? 5 : 20;
  const visible = expanded ? rows : rows.slice(0, initialLimit);

  return (
    <div className="panel" data-testid="leaderboard">
      <div className="mb-4 flex items-center gap-2">
        <Crown className="size-5 text-yellow-400" />
        <h3 className="font-display text-lg">Ranking Mundial de Treinadores</h3>
      </div>
      <ol className="space-y-2">
        {visible.map((r, i) => {
          const { atual } = nivelDoTreinador(r.pontos_soberania ?? 0);
          const nomeCoach = r.coach_apelido || r.coach_nome || r.nome;
          const cor = r.cores?.[0] || "#FF0000";
          const medal =
            i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-muted-foreground";
          return (
            <li
              key={r.user_id}
              data-testid={`leaderboard-row-${i}`}
              className={`flex items-center gap-3 rounded-lg border border-white/5 p-3 ${i < 3 ? "bg-white/5" : "bg-slate-900/40"}`}
            >
              <div className={`flex size-8 items-center justify-center rounded-full ${i < 3 ? "bg-white/10" : "bg-slate-800"}`}>
                {i < 3 ? <Medal className={`size-4 ${medal}`} /> : <span className="text-xs text-muted-foreground">{i + 1}</span>}
              </div>
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/10 text-[10px] font-bold"
                style={{ backgroundColor: cor, color: pickTextColor(cor) }}
              >
                {r.abreviacao_time}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm">
                  {nomeCoach} <span className="text-muted-foreground">·</span>{" "}
                  <span className="text-primary">{atual.nome}</span>
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {r.time_personalizado} · {r.titulos_treinador ?? 0} títulos · {r.partidas_vencidas ?? 0}V/{r.partidas_jogadas ?? 0}J
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl leading-none">{r.pontos_soberania ?? 0}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">soberania</p>
              </div>
            </li>
          );
        })}
      </ol>
      {rows.length > initialLimit && (
        <button
          data-testid="leaderboard-toggle"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 w-full rounded-lg border border-white/10 py-2 text-xs uppercase tracking-widest text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          {expanded ? "Mostrar menos" : `Ver todos (${rows.length})`}
        </button>
      )}
    </div>
  );
}

function pickTextColor(hex: string) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#000" : "#fff";
}
