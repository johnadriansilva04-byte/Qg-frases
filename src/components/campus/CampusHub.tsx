import { useCallback, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Dna,
  FlaskConical,
  GraduationCap,
  Landmark,
  Lock,
  Sparkles,
  TrendingUp,
  BrainCircuit,
} from "lucide-react";
import type { CidadelaPerfil } from "@/lib/cidadela/profissoes";
import { salvareEstadoCidadelaHelper, salvareSovHelper } from "./campusHelpers";
import { EstudanteTour } from "./EstudanteTour";
import { atividadesDoDia } from "./integracaoEngine";
import {
  CONFLITO_INICIAL,
  atividadesElegiveis,
  aplicarOpcao,
  mediaGeral,
  novoEstudante,
  normalizarEstudante,
  tracoDominante,
} from "./atividadesEngine";
import type { Atividade, EstudanteState } from "./types";
import { CURSOS } from "./types";
import { SovBankApp } from "@/components/financial/SovBankApp";
import { IQTestComponent } from "./desenvolvimento-brio/teste-qi";

const TRACO_LABEL: Record<string, string> = {
  diligente: "Diligente",
  arriscado: "Arriscado",
  pragmatico: "Pragmático",
  malandro: "Malandro",
  solidario: "Solidário",
};

type Props = {
  userId: string | null;
  perfil: CidadelaPerfil | null;
  onPerfilAtualizado: (p: CidadelaPerfil) => void;
  onVoltar: () => void;
};

function cloneAtividade(a: Atividade): Atividade {
  return {
    ...a,
    opcoes: a.opcoes.map((o) => ({ ...o, efeitos: { ...o.efeitos } })),
  };
}

/** Hub do Campus Universitário — casa do Estudante (e visitante com limitações). */
export function CampusHub({ userId, perfil, onPerfilAtualizado, onVoltar }: Props) {
  const [estudanteLocal, setEstudanteLocal] = useState<EstudanteState | null>(null);
  const [atividadeAberta, setAtividadeAberta] = useState<Atividade | null>(null);
  const [ultimoDesfecho, setUltimoDesfecho] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [sovBankAberto, setSovBankAberto] = useState(false);
  const [iqTestAberto, setIqTestAberto] = useState(false);

  const estudando = perfil?.profissao_atual === "estudante";
  const estado: EstudanteState = useMemo(() => {
    if (estudanteLocal) return estudanteLocal;
    const cru = perfil?.estado?.["estudante"];
    return normalizarEstudante(cru);
  }, [estudanteLocal, perfil]);

  const atualizarEstado = useCallback(
    (novo: EstudanteState, deltaReputacao: number) => {
      if (userId && perfil) {
        salvareEstadoCidadelaHelper(userId, { estudante: novo }, deltaReputacao).then(
          onPerfilAtualizado,
        );
      }
      setEstudanteLocal(novo);
    },
    [userId, perfil, onPerfilAtualizado],
  );

  const concluirTour = () => {
    const novo = { ...estado, tourConcluido: true };
    atualizarEstado(novo, 0);
  };

  const resolverOpcao = (atividade: Atividade, opcaoIdx: number) => {
    if (salvando) return;
    setSalvando(true);
    try {
      const resultado = aplicarOpcao(estado, atividade, opcaoIdx);
      setUltimoDesfecho(resultado.desfecho);
      setAtividadeAberta(null);
      atualizarEstado(resultado.estado, resultado.reputacao);
      // SOV: aplica somente para usuário autenticado
      if (userId && resultado.sov !== 0) {
        void salvareSovHelper(userId, resultado.sov, atividade.id, opcaoIdx);
      }
    } finally {
      setSalvando(false);
    }
  };

  if (!estado.tourConcluido) {
    return <EstudanteTour onConcluir={concluirTour} />;
  }

  if (!userId || !perfil) {
    return (
      <GatePanel
        onVoltar={onVoltar}
        titulo="Campus trancado"
        texto="Entre com sua conta na Cidadela para estudar no Campus."
      />
    );
  }

  if (!estudando) {
    return (
      <GatePanel
        onVoltar={onVoltar}
        titulo="Área restrita a estudantes"
        texto="Você visita o Campus como convidado. Matricule-se como Estudante na seleção de profissão da Cidadela para abrir as atividades."
      />
    );
  }

  const dataISO = new Date().toISOString().slice(0, 10);
  const concluidasIds = new Set(estado.concluidas.map((c) => c.atividadeId));
  const elegiveis = atividadesDoDia(
    atividadesElegiveis(estado),
    perfil.profissoes_desbloqueadas,
    dataISO,
    concluidasIds,
  );
  const conflitoPendente = !estado.conflitoInicial;
  const cursoNome = CURSOS.find((c) => c.id === estado.cursoId)?.nome ?? "Curso Livre";
  const traco = tracoDominante(estado);

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
          <div className="rounded-full bg-primary/20 p-2.5 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground">Campus Universitário</h1>
            <p className="text-xs text-muted-foreground">
              {cursoNome} · {estado.semestre}º semestre · Média {mediaGeral(estado)}
              {traco ? ` · Você é ${TRACO_LABEL[traco] ?? traco}` : ""}
            </p>
          </div>
        </header>

        {ultimoDesfecho && (
          <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
            <CheckCircle2 className="mr-2 inline h-4 w-4" />
            {ultimoDesfecho}
          </div>
        )}

        {conflitoPendente && (
          <section className="mb-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4">
            <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-300">
              <Sparkles className="h-4 w-4" /> Primeiro dilema do semestre
            </p>
            <h3 className="mb-1 font-bold text-foreground">{CONFLITO_INICIAL.titulo}</h3>
            <p className="mb-3 text-sm text-muted-foreground">{CONFLITO_INICIAL.descricao}</p>
            <button
              onClick={() => setAtividadeAberta(CONFLITO_INICIAL)}
              className="rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-amber-950 transition hover:opacity-90"
            >
              Encarar o dilema
            </button>
          </section>
        )}

        <section className="mb-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" /> Atividades disponíveis
          </h2>
          {elegiveis.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface/40 p-4 text-sm text-muted-foreground">
              Semestre tranquilo hoje. As integrações com outras profissões voltam amanhã —
              enquanto isso, {estado.concluidas.length} decisões moldam quem você é.
            </p>
          ) : (
            <div className="grid gap-3">
              {elegiveis.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAtividadeAberta(cloneAtividade(a))}
                  className="flex items-start gap-3 rounded-xl border border-border bg-surface/50 p-4 text-left transition hover:border-primary hover:bg-primary/10"
                >
                  <span className="rounded-lg bg-primary/20 p-2 text-primary">
                    {a.area === "biblioteca" ? (
                      <BookOpen className="h-5 w-5" />
                    ) : a.area === "laboratorio" ? (
                      <FlaskConical className="h-5 w-5" />
                    ) : a.area === "aula" ? (
                      <Dna className="h-5 w-5" />
                    ) : (
                      <GraduationCap className="h-5 w-5" />
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="mb-1 flex items-center gap-2">
                      <span className="font-bold text-foreground">{a.titulo}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                        {a.tipo}
                      </span>
                    </span>
                    <span className="block text-sm text-muted-foreground">{a.descricao}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/biblioteca"
            className="flex items-center gap-3 rounded-xl border border-border bg-surface/50 p-4 transition hover:border-primary hover:bg-primary/10"
          >
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <p className="font-bold text-foreground">Biblioteca da Cidadela</p>
              <p className="text-sm text-muted-foreground">Acervo aberto para pesquisas.</p>
            </div>
          </Link>
          <button
            onClick={() => setSovBankAberto(true)}
            className="flex items-center gap-3 rounded-xl border border-primary bg-primary/10 p-4 transition hover:bg-primary/20"
          >
            <Landmark className="h-5 w-5 text-primary" />
            <div>
              <p className="font-bold text-foreground">SOV BANK</p>
              <p className="text-sm text-muted-foreground">Livro-caixa central da Cidadela.</p>
            </div>
          </button>
          <button
            onClick={() => setIqTestAberto(true)}
            className="flex items-center gap-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-4 transition hover:border-emerald-500 hover:bg-emerald-500/20"
          >
            <BrainCircuit className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="font-bold text-foreground">Desenvolvimento do Brio</p>
              <p className="text-sm text-muted-foreground">Teste de QI procedural.</p>
            </div>
          </button>
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-surface/30 p-4 opacity-60">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-bold text-muted-foreground">Laboratórios</p>
              <p className="text-sm text-muted-foreground">
                Desbloqueado para a profissão Pesquisador.
              </p>
            </div>
          </div>
        </section>

        {estado.concluidas.length > 0 && (
          <section className="mt-4">
            <h2 className="mb-2 text-sm font-bold text-foreground">Registro acadêmico</h2>
            <div className="space-y-2">
              {estado.concluidas.map((c, i) => (
                <div
                  key={`${c.atividadeId}-${i}`}
                  className="rounded-lg border border-border/50 bg-surface/30 p-3 text-xs text-muted-foreground"
                >
                  <span className="font-bold text-foreground">
                    {c.atividadeId === CONFLITO_INICIAL.id ? "Dilema: " : ""}
                    {c.atividadeId}
                  </span>{" "}
                  — {c.desfecho}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {atividadeAberta && (
        <OpcaoModal
          atividade={atividadeAberta}
          onEscolher={(idx) => resolverOpcao(atividadeAberta, idx)}
          onFechar={() => setAtividadeAberta(null)}
          salvando={salvando}
        />
      )}

      {sovBankAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-lg font-black text-foreground">SOV BANK</h2>
              <button
                onClick={() => setSovBankAberto(false)}
                className="rounded-lg border border-border/50 p-2 text-muted-foreground transition hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <SovBankApp userId={userId} />
            </div>
          </div>
        </div>
      )}

      {iqTestAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-6xl rounded-2xl border border-emerald-500/50 bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-lg font-black text-foreground">Desenvolvimento do Brio - Teste de QI</h2>
              <button
                onClick={() => setIqTestAberto(false)}
                className="rounded-lg border border-border/50 p-2 text-muted-foreground transition hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <IQTestComponent
                showSolution={true}
                onReward={(amount) => {
                  if (userId && amount > 0) void salvareSovHelper(userId, amount, "teste-qi", 0);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GatePanel({
  onVoltar,
  titulo,
  texto,
}: {
  onVoltar: () => void;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <main className="painel w-full max-w-md rounded-3xl p-6 text-center shadow-2xl">
        <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h1 className="mb-2 text-lg font-black text-foreground">{titulo}</h1>
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

function OpcaoModal({
  atividade,
  onEscolher,
  onFechar,
  salvando,
}: {
  atividade: Atividade;
  onEscolher: (idx: number) => void;
  onFechar: () => void;
  salvando: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-5 shadow-2xl">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
          {atividade.tipo} · dificuldade {atividade.dificuldade}
        </p>
        <h2 className="mb-2 text-lg font-black text-foreground">{atividade.titulo}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{atividade.descricao}</p>
        <div className="space-y-2">
          {atividade.opcoes.map((op, idx) => (
            <button
              key={idx}
              onClick={() => onEscolher(idx)}
              disabled={salvando}
              className="w-full rounded-lg border border-border bg-surface/50 p-3 text-left text-sm text-foreground transition hover:border-primary hover:bg-primary/10 disabled:opacity-50"
            >
              {op.texto}
            </button>
          ))}
        </div>
        <button
          onClick={onFechar}
          className="mt-3 w-full rounded-lg border border-border/50 p-2 text-xs text-muted-foreground transition hover:bg-muted"
        >
          Pensar melhor (voltar)
        </button>
      </div>
    </div>
  );
}
