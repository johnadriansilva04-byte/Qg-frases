import { ArrowLeft, Crown, Link2, Users, Coins, Calendar, Swords } from "lucide-react";
import type { MesaFutebol } from "@/lib/multiplayer/mesa.api";

type Props = {
  mesa: MesaFutebol;
  userId: string;
  onVoltar: () => void;
  onEntrar: () => void;
  onCopiarLink: () => void;
};

/**
 * Administração da Mesa (§10): área do criador com visão completa e coerente
 * com o backend — participantes, status, aposta, premiação, data de liberação
 * e o link direto de convite. Somente leitura de dados reais (a partida em si
 * continua sendo jogada na MesaOnlineMatch).
 */
export function AdminMesaPanel({ mesa, userId, onVoltar, onEntrar, onCopiarLink }: Props) {
  const souCriador = mesa.jogador_1_id === userId;
  const aposta = mesa.aposta_sov ?? 0;
  // Arrecadado REAL: aposta × quantos jogadores já pagaram (cobrança no servidor).
  const pagantes = mesa.aposta_cobrada_de?.length ?? 0;
  const arrecadado = aposta * Math.max(pagantes, mesa.jogador_2_id ? 2 : 1);
  const bloqueada =
    mesa.data_liberacao != null && new Date(mesa.data_liberacao).getTime() > Date.now();
  const statusLabel =
    mesa.status === "aguardando"
      ? bloqueada
        ? "Bloqueada (aguardando data)"
        : "Aguardando adversário"
      : mesa.status === "em_andamento"
        ? "Em andamento"
        : "Finalizada";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8" data-testid="admin-mesa-panel">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onVoltar} className="btn-ghost">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="font-display text-2xl">Administração da Mesa</h2>
      </div>

      {/* Cabeçalho da mesa */}
      <section className="surface mb-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-lg">{mesa.mesa_id}</p>
            <p className="text-xs text-muted-foreground">
              Criada em {new Date(mesa.criado_em).toLocaleString("pt-BR")}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
              mesa.status === "em_andamento"
                ? "bg-emerald-400/15 text-emerald-300"
                : mesa.status === "finalizado"
                  ? "bg-slate-400/15 text-slate-300"
                  : bloqueada
                    ? "bg-sky-400/15 text-sky-300"
                    : "bg-amber-400/15 text-amber-300"
            }`}
          >
            {statusLabel}
          </span>
        </div>
        {!souCriador && (
          <p className="mt-2 text-xs text-amber-300">Você é participante — só o criador administra.</p>
        )}
      </section>

      {/* Participantes */}
      <section className="surface mb-4 p-5">
        <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Users className="size-4" /> Participantes
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <Crown className="size-4 text-amber-300" />
              <span className="text-sm font-semibold text-white">{mesa.time_j1}</span>
            </div>
            <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-amber-300">
              {aposta > 0 && (mesa.aposta_cobrada_de ?? []).includes(mesa.jogador_1_id) && (
                <span className="text-emerald-300">aposta paga</span>
              )}
              Criador
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2">
            <span className="text-sm font-semibold text-white">
              {mesa.time_j2 ?? "Aguardando convidado..."}
            </span>
            <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500">
              {aposta > 0 && mesa.jogador_2_id && (
                <span
                  className={
                    (mesa.aposta_cobrada_de ?? []).includes(mesa.jogador_2_id)
                      ? "text-emerald-300"
                      : "text-rose-300"
                  }
                >
                  {(mesa.aposta_cobrada_de ?? []).includes(mesa.jogador_2_id)
                    ? "aposta paga"
                    : "aposta pendente"}
                </span>
              )}
              {mesa.jogador_2_id ? "Convidado" : "vaga aberta"}
            </span>
          </div>
        </div>
      </section>

      {/* Finanças da mesa */}
      <section className="surface mb-4 p-5">
        <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Coins className="size-4" /> Finanças da mesa
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Aposta /jogador</p>
            <p className="font-display text-xl text-white">{aposta} SOV</p>
          </div>
          <div className="rounded-lg bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Arrecadado</p>
            <p className="font-display text-xl text-emerald-300">{arrecadado} SOV</p>
          </div>
          <div className="rounded-lg bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Premiação (vencedor)</p>
            <p className="font-display text-xl text-amber-300">{arrecadado} SOV</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          Zero-sum: o que entra é o que sai — o vencedor leva o pote inteiro. Nenhum SOV é criado.
        </p>
      </section>

      {/* Data de liberação */}
      <section className="surface mb-4 p-5">
        <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Calendar className="size-4" /> Data de liberação
        </p>
        {mesa.data_liberacao ? (
          <p className={`text-sm ${bloqueada ? "text-sky-300" : "text-emerald-300"}`}>
            {bloqueada
              ? `Bloqueada até ${new Date(mesa.data_liberacao).toLocaleString("pt-BR")}`
              : `Liberada em ${new Date(mesa.data_liberacao).toLocaleString("pt-BR")}`}
          </p>
        ) : (
          <p className="text-sm text-slate-400">Aberta desde a criação (sem data de liberação).</p>
        )}
      </section>

      {/* Resultado */}
      {mesa.status === "finalizado" && (
        <section className="surface mb-4 p-5">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Swords className="size-4" /> Resultado
          </p>
          <p className="font-display text-2xl">
            {mesa.placar_j1} × {mesa.placar_j2}
          </p>
          <p className="text-xs text-muted-foreground">
            {mesa.motivo_finalizacao ?? "partida concluída"}
          </p>
        </section>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <button onClick={onCopiarLink} className="btn-primary gap-2" data-testid="admin-copiar-link">
          <Link2 className="size-4" /> Copiar link de convite
        </button>
        {mesa.status !== "finalizado" && (
          <button onClick={onEntrar} className="btn-ghost">
            Ir para a partida
          </button>
        )}
      </div>
    </main>
  );
}
