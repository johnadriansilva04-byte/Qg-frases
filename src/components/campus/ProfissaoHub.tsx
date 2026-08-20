import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, CheckCircle2, Lock, TrendingUp } from "lucide-react";
import type { CidadelaPerfil, ProfissaoId } from "@/lib/cidadela/profissoes";
import { salvareEstadoCidadelaHelper, salvareSovHelper } from "./campusHelpers";
import { DecisaoModal } from "./DecisaoModal";
import { atividadesDoDia } from "./integracaoEngine";
import {
  aplicarOpcao,
  atividadesElegiveis,
} from "./atividadesEngine";
import type { Atividade, EstudanteState } from "./types";

type Props = {
  userId: string | null;
  perfil: CidadelaPerfil | null;
  onPerfilAtualizado: (p: CidadelaPerfil) => void;
  onVoltar: () => void;
  /** Profissão exigida para operar o hub. */
  profissao: ProfissaoId;
  chaveEstado: string;
  titulo: string;
  subtitulo: string;
  icone: ReactNode;
  textoPortao: string;
  /** Normalizador específico do hub (defaults da profissão). */
  normalizar: (raw: unknown) => EstudanteState;
  /** Áreas/links extras do hub (ex.: acesso à Biblioteca). */
  extras?: ReactNode | undefined;
};

/**
 * Hub genérico de profissão com decisões: reutilizado por Empresário e
 * Pesquisador. O Estudante tem hub próprio (CampusHub) com tour.
 */
export function ProfissaoHub({
  userId,
  perfil,
  onPerfilAtualizado,
  onVoltar,
  profissao,
  chaveEstado,
  titulo,
  subtitulo,
  icone,
  textoPortao,
  normalizar,
  extras,
}: Props) {
  const [estadoLocal, setEstadoLocal] = useState<EstudanteState | null>(null);
  const [atividadeAberta, setAtividadeAberta] = useState<Atividade | null>(null);
  const [ultimoDesfecho, setUltimoDesfecho] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const ha = perfil?.profissao_atual === profissao;
  const estado: EstudanteState = useMemo(() => {
    if (estadoLocal) return estadoLocal;
    return normalizar(perfil?.estado?.[chaveEstado]);
  }, [estadoLocal, perfil, chaveEstado, normalizar]);

  const atualizar = useCallback(
    (novo: EstudanteState, deltaReputacao: number) => {
      if (userId && perfil) {
        salvareEstadoCidadelaHelper(userId, { [chaveEstado]: novo }, deltaReputacao).then(
          onPerfilAtualizado,
        );
      }
      setEstadoLocal(novo);
    },
    [userId, perfil, chaveEstado, onPerfilAtualizado],
  );

  const resolver = (atividade: Atividade, idx: number) => {
    if (salvando) return;
    setSalvando(true);
    try {
      const r = aplicarOpcao(estado, atividade, idx);
      setUltimoDesfecho(r.desfecho);
      setAtividadeAberta(null);
      atualizar(r.estado, r.reputacao);
      if (userId && r.sov !== 0) {
        void salvareSovHelper(userId, r.sov, atividade.id, idx);
      }
    } finally {
      setSalvando(false);
    }
  };

  if (!userId || !perfil) {
    return <Portao onVoltar={onVoltar} texto="Entre com sua conta para trabalhar por aqui." />;
  }
  if (!ha) {
    return <Portao onVoltar={onVoltar} texto={textoPortao} />;
  }

  const dataISO = new Date().toISOString().slice(0, 10);
  const concluidasIds = new Set(estado.concluidas.map((c) => c.atividadeId));
  const elegiveis = atividadesDoDia(
    atividadesElegiveis(estado),
    perfil.profissoes_desbloqueadas,
    dataISO,
    concluidasIds,
  );

  return (
    <div className="min-h-screen p-3 md:p-6">
      <main className="mx-auto w-full max-w-3xl">
        <header className="mb-4 flex items-center gap-3">
          <button
            onClick={onVoltar}
            className="rounded-full border border-border bg-surface/50 p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="rounded-full bg-primary/20 p-2.5 text-primary">{icone}</div>
          <div>
            <h1 className="text-lg font-black text-foreground">{titulo}</h1>
            <p className="text-xs text-muted-foreground">{subtitulo}</p>
          </div>
        </header>

        {ultimoDesfecho && (
          <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
            <CheckCircle2 className="mr-2 inline h-4 w-4" />
            {ultimoDesfecho}
          </div>
        )}

        <section className="mb-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" /> Pauta de hoje
          </h2>
          {elegiveis.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface/40 p-4 text-sm text-muted-foreground">
              Pauta zerada por hoje — a rotina gira amanhã.
            </p>
          ) : (
            <div className="grid gap-3">
              {elegiveis.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAtividadeAberta(a)}
                  className="rounded-xl border border-border bg-surface/50 p-4 text-left transition hover:border-primary hover:bg-primary/10"
                >
                  <p className="mb-1 flex items-center gap-2">
                    <span className="font-bold text-foreground">{a.titulo}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                      {a.tipo}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">{a.descricao}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {extras}

        <Registro estado={estado} />
      </main>

      {atividadeAberta && (
        <DecisaoModal
          atividade={atividadeAberta}
          onEscolher={(idx) => resolver(atividadeAberta, idx)}
          onFechar={() => setAtividadeAberta(null)}
          salvando={salvando}
        />
      )}
    </div>
  );
}

function Portao({ onVoltar, texto }: { onVoltar: () => void; texto: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <main className="painel w-full max-w-md rounded-3xl p-6 text-center shadow-2xl">
        <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="mb-4 text-sm text-muted-foreground">{texto}</p>
        <button
          onClick={onVoltar}
          className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90"
        >
          Voltar para a Praça
        </button>
      </main>
    </div>
  );
}

function Registro({ estado }: { estado: EstudanteState }) {
  if (estado.concluidas.length === 0) return null;
  return (
    <section className="mt-4">
      <h2 className="mb-2 text-sm font-bold text-foreground">Registro de decisões</h2>
      <div className="space-y-2">
        {estado.concluidas.map((c, i) => (
          <div
            key={`${c.atividadeId}-${i}`}
            className="rounded-lg border border-border/50 bg-surface/30 p-3 text-xs text-muted-foreground"
          >
            <span className="font-bold text-foreground">{c.atividadeId}</span> — {c.desfecho}
          </div>
        ))}
      </div>
    </section>
  );
}
