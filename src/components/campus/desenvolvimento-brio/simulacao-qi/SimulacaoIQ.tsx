/**
 * SIMULAÇÃO DE TESTE DE QI — componente principal.
 *
 * Fluxo: Tela inicial (info + INICIAR) → prova (32 questões, 6 alternativas,
 * 25 min, cronômetro por RELÓGIO REAL, sem feedback) → resultado (acertos,
 * percentual, tempo, estimativa experimental).
 *
 * PONTOS-CHAVE:
 * - Cronômetro derivado de started_at (horário real) — nunca reseta em
 *   render/reorientação/f5.
 * - Ordem fixa: difficulty_order ASC (mais fácil → mais difícil).
 * - Sem dicas/correções durante a prova; ao final, pontuação do SERVIDOR
 *   (qi_finalizar_simulacao). Fallback local honesto quando a migration
 *   ainda não foi aplicada.
 * - F5: recupera a tentativa in_progress do usuário (issues+started_at).
 * - O resultado é vinculado ao mesmo user_id dos jogos.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, TimerOff } from "lucide-react";
import { backendQiAtivo, buscarQuestoes, criarTentativa, finalizarSimulacao, gabaritoLocalOptionId, obterTentativaAtiva, salvarRespostas } from "./api";
import { embaralharOpcoes } from "./embaralhar";
import { MatrixSVG, OptionsGrid } from "./renderer";
import { formatarTempo } from "./scoring";
import { SIMULACAO, type QuestaoRender, type ResultadoSimulacao } from "./types";

const AVISO_EXPERIMENTAL =
  "Esta é uma simulação experimental de raciocínio inspirada no estilo de avaliações não verbais. Não é um teste oficial da Mensa Brasil, não possui validade para admissão e não substitui uma avaliação psicológica.";

type Fase = "inicio" | "prova" | "resultado";

const STORAGE_KEY = "qi:simulacao:ativo:v1";

function readLocalTentativa(): {
  attemptId: string;
  questions: Array<{ question_id: string; difficulty_order: number }>;
} | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { attemptId: string; questions: Array<{ question_id: string; difficulty_order: number }> };
    if (!parsed?.attemptId || !Array.isArray(parsed.questions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalTentativa(attemptId: string, questions: Array<{ question_id: string; difficulty_order: number }>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ attemptId, questions }));
  } catch {
    /* quota — ignora */
  }
}

function clearLocalTentativa() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* quota — ignora */
  }
}

/**
 * Estado da prova: respostas + índice atual + relógio real (started_at).
 * Persistido em sessionStorage para recuperar após F5 (além do servidor).
 */
interface EstadoProva {
  attemptId: string;
  questions: Array<{ question_id: string; difficulty_order: number }>;
  answers: Array<string | null>;
  currentIndex: number;
  startedAt: string; // ISO — o cronômetro deriva daqui
  backend: boolean;
}

export function SimulacaoIQ() {
  const [fase, setFase] = useState<Fase>("inicio");
  const [questions, setQuestions] = useState<QuestaoRender[]>([]);
  const [prova, setProva] = useState<EstadoProva | null>(null);
  const [resultado, setResultado] = useState<ResultadoSimulacao | null>(null);
  const [restante, setRestante] = useState(SIMULACAO.TIME_LIMIT_SECONDS);
  const [backend, setBackend] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [apenasLocal, setApenasLocal] = useState(false);
  const timerRef = useRef<number | null>(null);
  const finalizandoRef = useRef(false);

  const iniciarCronometro = useCallback((startedAt: string) => {
    if (timerRef.current !== null) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const left = Math.max(0, SIMULACAO.TIME_LIMIT_SECONDS - elapsed);
      setRestante(left);
      if (left <= 0) {
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    tick();
    timerRef.current = window.setInterval(tick, 1000);
  }, []);

  // Carrega: tenta a tentativa ativa (servidor) → senão inicia pronto p/ começar.
  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const db = await backendQiAtivo();
        if (!ativo) return;
        setBackend(db);
        const qs = await buscarQuestoes("simulation");
        if (!ativo) return;
        setQuestions(qs);
        if (qs.length !== SIMULACAO.TOTAL_QUESTIONS) {
          setErro(`Banco de simulação incompleto (${qs.length} de ${SIMULACAO.TOTAL_QUESTIONS}).`);
          setCarregando(false);
          return;
        }
        const ordenadas = qs
          .map((q) => ({ question_id: q.id, difficulty_order: q.difficulty_order }))
          .sort((a, b) => a.difficulty_order - b.difficulty_order || a.question_id.localeCompare(b.question_id));

        // Tenta a retomada (F5/aba nova): servidor é a fonte verdade.
        if (db) {
          const tentativa = await obterTentativaAtiva();
          if (ativo && tentativa && tentativa.questions?.length) {
            const answers = Array.isArray(tentativa.answers) ? tentativa.answers : Array(tentativa.total_questions).fill(null);
            setProva({
              attemptId: tentativa.attempt_id,
              questions: tentativa.questions,
              answers: normalizeAnswers(answers, tentativa.questions.length),
              currentIndex: 0,
              startedAt: tentativa.started_at,
              backend: true,
            });
            setFase("prova");
            iniciarCronometro(tentativa.started_at);
            setApenasLocal(false);
          }
        } else {
          // Fallback local (migration não aplicada ainda)
          const local = readLocalTentativa();
          const localValida =
            local &&
            local.questions.length === SIMULACAO.TOTAL_QUESTIONS &&
            local.questions.every((q) => ordenadas.some((o) => o.question_id === q.question_id));
          if (localValida && local) {
            const startedAt = sessionStorage.getItem("qi:simulacao:start:v1") ?? new Date().toISOString();
            setProva({
              attemptId: local.attemptId,
              questions: local.questions,
              answers: (() => {
                try {
                  const raw = sessionStorage.getItem("qi:simulacao:resp:v1");
                  if (raw) return normalizeAnswers(JSON.parse(raw) as Array<string | null>, local.questions.length);
                } catch {
                  /* ignore */
                }
                return Array(local.questions.length).fill(null);
              })(),
              currentIndex: 0,
              startedAt,
              backend: false,
            });
            setFase("prova");
            iniciarCronometro(startedAt);
            setApenasLocal(true);
          }
        }
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Falha ao carregar a simulação.");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [iniciarCronometro]);

  useEffect(() => {
    if (restante <= 0 && fase === "prova" && prova && !finalizandoRef.current) {
      finalizandoRef.current = true;
      encerrarProva(prova, "expired").catch(() => {
        finalizandoRef.current = false;
      });
    }
  }, [restante, fase, prova]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  function normalizeAnswers(answers: Array<string | null>, n: number): Array<string | null> {
    const out: Array<string | null> = Array(n).fill(null);
    for (let i = 0; i < Math.min(n, answers.length); i++) {
      const v = answers[i];
      out[i] = typeof v === "string" && v.length > 0 ? v : null;
    }
    return out;
  }

  async function encerrarProva(estado: EstadoProva, finalizacao: "submit" | "expired") {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const todasAsRespostas = estado.answers;

    if (estado.backend) {
      // Score confiável: o servidor calcula cruzando com o banco.
      const res = await finalizarSimulacao(estado.attemptId, todasAsRespostas, finalizacao);
      if (res) {
        clearLocalTentativa();
        setResultado(res);
        setFase("resultado");
        return;
      }
      // Se a RPC final falhar, segue para o fallback local honesto.
    }

    // Fallback local: gabarito local, avisando que não persiste.
    const acertos = estado.questions.reduce((acc, q, i) => {
      const opt = todasAsRespostas[i];
      if (!opt) return acc;
      const optCorreta = gabaritoLocalOptionId("simulation", q.question_id);
      return acc + (optCorreta && opt === optCorreta ? 1 : 0);
    }, 0);
    const total = estado.questions.length;
    const percentual = total ? Math.round((acertos / total) * 100) : 0;
    const used = SIMULACAO.TIME_LIMIT_SECONDS - Math.max(0, restante);
    setResultado({
      attempt_id: `${estado.attemptId}-local`,
      status: finalizacao === "expired" ? "expired" : "completed",
      raw_score: acertos,
      correct_answers: acertos,
      answered_questions: todasAsRespostas.filter(Boolean).length,
      total_questions: total,
      percentual,
      estimated_result: Math.round(100 + (acertos - total / 2) * 2),
      time_used_seconds: used,
      time_limit_seconds: SIMULACAO.TIME_LIMIT_SECONDS,
    });
    clearLocalTentativa();
    setApenasLocal(true);
    setFase("resultado");
  }

  async function handleIniciar() {
    setErro(null);
    setCarregando(true);
    try {
      const db = await backendQiAtivo();
      if (db) {
        const novoTent = await criarTentativa();
        if (!novoTent || novoTent.total_questions !== SIMULACAO.TOTAL_QUESTIONS) {
          throw new Error("Não foi possível criar a tentativa no servidor.");
        }
        const ordenadas = questions
          .map((q) => ({ question_id: q.id, difficulty_order: q.difficulty_order }))
          .sort((a, b) => a.difficulty_order - b.difficulty_order || a.question_id.localeCompare(b.question_id));
        const startedAt = new Date().toISOString();
        const novo: EstadoProva = {
          attemptId: novoTent.attempt_id,
          questions: ordenadas,
          answers: Array(ordenadas.length).fill(null),
          currentIndex: 0,
          startedAt,
          backend: true,
        };
        setProva(novo);
        setFase("prova");
        setApenasLocal(false);
        iniciarCronometro(startedAt);
      } else {
        // Fallback local: sessionStorage (retomada por F5 mesmo sem servidor).
        const startedAt = new Date().toISOString();
        const attemptId = `local-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
        const ordenadas = questions
          .map((q) => ({ question_id: q.id, difficulty_order: q.difficulty_order }))
          .sort((a, b) => a.difficulty_order - b.difficulty_order || a.question_id.localeCompare(b.question_id));
        const novo: EstadoProva = {
          attemptId,
          questions: ordenadas,
          answers: Array(ordenadas.length).fill(null),
          currentIndex: 0,
          startedAt,
          backend: false,
        };
        writeLocalTentativa(attemptId, ordenadas);
        try {
          sessionStorage.setItem("qi:simulacao:resp:v1", JSON.stringify(novo.answers));
          sessionStorage.setItem("qi:simulacao:start:v1", startedAt);
        } catch {
          /* quota */
        }
        setProva(novo);
        setFase("prova");
        setApenasLocal(true);
        iniciarCronometro(startedAt);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao iniciar.");
      setCarregando(false);
    }
  }

  function responder(index: number) {
    if (!prova) return;
    const ans = [...prova.answers];
    const current = prova.questions[prova.currentIndex];
    if (!current) return;
    const base = questions.find((q) => q.id === current.question_id);
    if (!base) return;
    // Mesma ordem embaralhada exibida ao usuário (determinística por tentativa).
    const exibidas = embaralharOpcoes(base.options, prova.attemptId, base.id);
    const opt = exibidas[index];
    if (!opt) return;
    if (ans[prova.currentIndex] === opt.id) {
      ans[prova.currentIndex] = null; // desmarcar
    } else {
      ans[prova.currentIndex] = opt.id;
    }
    const novo = { ...prova, answers: ans };
    setProva(novo);
    void persistirRespostas(novo);
  }

  function persistirRespostas(novo: EstadoProva) {
    if (novo.backend) {
      void salvarRespostas(novo.attemptId, novo.answers);
    } else {
      try {
        sessionStorage.setItem("qi:simulacao:resp:v1", JSON.stringify(novo.answers));
      } catch {
        /* quota */
      }
    }
  }

  function irPara(idx: number) {
    if (!prova) return;
    const clamped = Math.max(0, Math.min(prova.questions.length - 1, idx));
    setProva({ ...prova, currentIndex: clamped });
  }

  async function handleFinalizar() {
    if (!prova || finalizandoRef.current) return;
    finalizandoRef.current = true;
    try {
      await encerrarProva(prova, "submit");
    } finally {
      void Promise.resolve(); // não destrava no meio de transições
    }
  }

  const responding = prova && questaoAtual(prova, questions);
  const selectedIndex = useMemo(() => {
    if (!prova || !responding) return null;
    const current = prova.questions[prova.currentIndex];
    if (!current) return null;
    const opt = responding.options.findIndex((o) => o.id === prova.answers[prova.currentIndex]);
    return opt;
  }, [prova, responding]);

  return (
    <div className="qi-simulacao" data-qi-fase={fase}>
      {fase === "inicio" && (
        <TelaInicial
          carregando={carregando}
          erro={erro}
          backend={backend}
          onIniciar={handleIniciar}
        />
      )}

      {fase === "prova" && prova && responding && (
        <TelaProva
          prova={prova}
          questions={questions}
          restante={restante}
          selectedIndex={selectedIndex}
          onSelect={responder}
          onIrPara={irPara}
          onFinalizar={handleFinalizar}
        />
      )}

      {fase === "resultado" && resultado && (
        <TelaResultado resultado={resultado} apenasLocal={apenasLocal} onRefazer={() => window.location.reload()} />
      )}
    </div>
  );
}

function questaoAtual(prova: EstadoProva, questions: QuestaoRender[]): QuestaoRender | null {
  const current = prova.questions[prova.currentIndex];
  if (!current) return null;
  const base = questions.find((q) => q.id === current.question_id);
  if (!base) return null;
  // Ordem de exibição embaralhada de forma DETERMINÍSTICA por tentativa
  // (attempt_id + questão): a correta nunca fica sempre na mesma posição
  // (§10) e o F5 re-deriva a MESMA ordem. O id da opção é estável, então o
  // servidor pontua por id (indiferente à posição exibida).
  return { ...base, options: embaralharOpcoes(base.options, prova.attemptId, base.id) };
}

function TelaInicial({
  carregando,
  erro,
  backend,
  onIniciar,
}: {
  carregando: boolean;
  erro: string | null;
  backend: boolean;
  onIniciar: () => void;
}) {
  return (
    <div className="qi-inicio">
      <h1 className="qi-titulo">SIMULAÇÃO DE TESTE DE QI</h1>
      <ul className="qi-info">
        <li><strong>32</strong> questões</li>
        <li><strong>25</strong> minutos</li>
        <li><strong>6</strong> alternativas por questão</li>
        <li>Dificuldade progressiva</li>
        <li>Sem feedback durante a prova</li>
      </ul>
      <p className="qi-aviso">{AVISO_EXPERIMENTAL}</p>
      {erro && <p className="qi-erro">{erro}</p>}
      {!backend && (
        <p className="qi-aviso qi-aviso--local">
          Modo local (banco de questões determinístico): o resultado desta
          prova não será salvo no servidor até a migration ser aplicada.
        </p>
      )}
      <button type="button" className="qi-botao-primary" disabled={carregando || !!erro} onClick={onIniciar}>
        {carregando ? "Carregando…" : "INICIAR SIMULAÇÃO"}
      </button>
    </div>
  );
}

const LABELS = ["A", "B", "C", "D", "E", "F"] as const;

function TelaProva({
  prova,
  questions,
  restante,
  selectedIndex,
  onSelect,
  onIrPara,
  onFinalizar,
}: {
  prova: EstadoProva;
  questions: QuestaoRender[];
  restante: number;
  selectedIndex: number | null;
  onSelect: (i: number) => void;
  onIrPara: (i: number) => void;
  onFinalizar: () => void;
}) {
  const q = questaoAtual(prova, questions);
  const pos = prova.currentIndex + 1;
  const total = prova.questions.length;
  const respondidas = prova.answers.filter(Boolean).length;
  const expirou = restante <= 0;

  return (
    <div className="qi-prova">
      <header className="qi-topo">
        <div className="qi-contador">
          Questão {pos} / {total}
        </div>
        <div className="qi-tempo" data-expirou={expirou}>
          <Clock size={14} aria-hidden="true" />
          {formatarTempo(restante)}
        </div>
      </header>

      {q && (
        <>
          <div className="qi-matrix-wrap">
            <MatrixSVG panels={q.matrix} className="qi-matrix--prova" />
          </div>
          <div className="qi-hint-num">
            <span>{String(pos).padStart(2, "0")}</span>
            <span className="qi-dot" aria-hidden="true" />
            <span>?</span>
          </div>
          <OptionsGrid
            options={q.options}
            labels={[...LABELS]}
            selectedIndex={selectedIndex}
            onSelect={onSelect}
            disabled={expirou}
          />
          <div aria-hidden="true" className="hidden" data-qi-options-count={q.options.length} />
        </>
      )}

      <footer className="qi-rodape">
        <button
          type="button"
          className="qi-botao-sec"
          disabled={prova.currentIndex === 0}
          onClick={() => onIrPara(prova.currentIndex - 1)}
          aria-label="Questão anterior"
        >
          <ChevronLeft size={18} /> Anterior
        </button>
        <span className="qi-respondidas">{respondidas}/{total} respondidas</span>
        {prova.currentIndex < total - 1 ? (
          <button
            type="button"
            className="qi-botao-sec"
            onClick={() => onIrPara(prova.currentIndex + 1)}
            aria-label="Próxima questão"
          >
            Próxima <ChevronRight size={18} />
          </button>
        ) : (
          <button type="button" className="qi-botao-finalizar" onClick={onFinalizar} disabled={expirou}>
            FINALIZAR
          </button>
        )}
      </footer>
    </div>
  );
}

function TelaResultado({ resultado, apenasLocal, onRefazer }: { resultado: ResultadoSimulacao; apenasLocal: boolean; onRefazer: () => void }) {
  return (
    <div className="qi-resultado" data-estado={resultado.status}>
      <h1 className="qi-titulo">
        {resultado.status === "expired" ? "TEMPO ESGOTADO" : "SIMULAÇÃO CONCLUÍDA"}
      </h1>
      <div className="qi-card-resultado">
        <div className="qi-linha-resultado">
          <span className="qi-rotulo">ACERTOS</span>
          <span className="qi-valor" data-qi-acertos>
            {resultado.raw_score} / {resultado.total_questions}
          </span>
        </div>
        <div className="qi-linha-resultado">
          <span className="qi-rotulo">PERCENTUAL</span>
          <span className="qi-valor" data-qi-percentual>{resultado.percentual}%</span>
        </div>
        <div className="qi-linha-resultado">
          <span className="qi-rotulo">TEMPO</span>
          <span className="qi-valor" data-qi-tempo>{formatarTempo(resultado.time_used_seconds)}</span>
        </div>
        <div className="qi-linha-resultado">
          <span className="qi-rotulo">ESTIMATIVA EXPERIMENTAL</span>
          <span className="qi-valor qi-valor--destacado" data-qi-estimativa>
            {resultado.estimated_result}
          </span>
        </div>
      </div>
      {resultado.status === "expired" && (
        <p className="qi-aviso"><TimerOff size={14} aria-hidden="true" /> O tempo limite foi atingido.</p>
      )}
      <p className="qi-aviso">
        Este resultado é experimental e pertence exclusivamente a esta simulação. Não
        representa um resultado oficial da Mensa Brasil nem uma avaliação psicológica válida.
      </p>
      {apenasLocal && (
        <p className="qi-aviso qi-aviso--local">
          Resultado calculado localmente (a migration ainda não persiste no servidor).
        </p>
      )}
      <button type="button" className="qi-botao-primary" onClick={onRefazer}>
        NÚCLEO DA SIMULAÇÃO
      </button>
    </div>
  );
}