import { useEffect, useState } from "react";
import { BrainCircuit, ChevronLeft, Coins, Save, Shirt, Sparkles, Users } from "lucide-react";
import { listarTentativas } from "@/components/campus/desenvolvimento-brio/simulacao-qi/api";
import { formatarData, formatarTempo } from "@/components/campus/desenvolvimento-brio/simulacao-qi/scoring";
import type { TentativaResumo } from "@/components/campus/desenvolvimento-brio/simulacao-qi/types";
import { cachePerfil, CORES_PADRAO, salvarTimeLocal, type Perfil, type TimeLocal } from "../online/auth";
import { atualizarPerfilClube } from "@/lib/botao/api";
import { FORMACAO_DEFAULT, FORMACOES, formacaoById, type Tatica } from "./formacoes";
import { custoProximoNivel, estrelasNivel, MAX_NIVEL_BOTAO, podeEvoluir, type NiveisBotoes } from "./evolucaoBotoes";
import { TEAMS } from "../data/teams";

type Props = {
  /** Perfil do Supabase. null = modo sem login ("meu time" local). */
  perfil: Perfil | null;
  /** Time local (sem sessão) — preenche os campos quando não há perfil. */
  timeLocal?: TimeLocal | null;
  /** Persiste o time local quando não há sessão (Futebol sem login). */
  onSalvarTimeLocal?: ((t: TimeLocal) => void) | undefined;
  onPronto: (p?: Perfil) => void;
  onBack: () => void;
  /** Evolução dos botões + identidade visual (§7-§11). Ligado à carreira. */
  evolucao?: {
    niveis: NiveisBotoes;
    saldoSov: number;
    simbolo: string;
    cor: string;
    evoluindo: number | null;
    carreiraAtiva: boolean;
    onEvoluir: (idx: number) => void;
    onIdentidade: (simbolo: string, cor: string) => void;
  } | undefined;
};

/**
 * Módulo "Meu Time" (PS2-style). O LOGIN NÃO mora mais aqui: entrou na conta?
 * Edita e salva o perfil no Supabase. Sem sessão? Edita o time local do
 * navegador — o Futebol roda sem login; quem quer conta sincronizada/online
 * faz login na Cidadela dos Clássicos.
 */
export function ProfileSetup({ perfil, timeLocal = null, onSalvarTimeLocal, onPronto, onBack, evolucao }: Props) {
  // --- campos do time (perfil da sessão OU time local) ---
  const [nome, setNome] = useState(perfil?.nome ?? "");
  const [time, setTime] = useState(perfil?.time_personalizado ?? timeLocal?.nome ?? "Meu Time");
  const [abreviacao, setAbreviacao] = useState(
    perfil?.abreviacao_time ?? timeLocal?.abreviacao ?? "MTI",
  );
  const [numero, setNumero] = useState(perfil?.numero_jogador ?? timeLocal?.numero ?? 10);
  const [cores, setCores] = useState<string[]>(
    perfil?.cores && perfil.cores.length === 3
      ? perfil.cores
      : timeLocal?.cores ?? CORES_PADRAO,
  );
  // --- personalização PS2 ---
  const [tatica, setTatica] = useState<Tatica>(
    (perfil?.tatica as Tatica) ?? timeLocal?.tatica ?? FORMACAO_DEFAULT,
  );

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const formacao = formacaoById(tatica);

  const validarCoresUnicas = (c: string[]) => c[0] !== c[1] && c[1] !== c[2] && c[0] !== c[2];

  const salvarEdicao = async () => {
    if (!validarCoresUnicas(cores)) {
      setErro("As três cores devem ser diferentes.");
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      if (perfil?.user_id) {
        // Logado (via Cidadela): salva no Supabase.
        const atualizado = await atualizarPerfilClube(perfil.user_id, {
          nome,
          time,
          abreviacao,
          cores,
          tatica,
          botoes: [...formacao.nomesPadrao],
        });
        if (!atualizado) throw new Error("Não foi possível salvar.");
        const perfilFinal: Perfil = {
          ...perfil,
          nome: atualizado.nome,
          time_personalizado: atualizado.time_personalizado,
          abreviacao_time: atualizado.abreviacao_time,
          cores: atualizado.cores,
          numero_jogador: perfil.numero_jogador,
          tatica: atualizado.tatica ?? tatica,
          botoes_nomes: atualizado.botoes_nomes ?? [...formacao.nomesPadrao],
        };
        cachePerfil(perfilFinal);
        onPronto(perfilFinal);
      } else {
        // Sem sessão: "meu time" local (Futebol roda sem login).
        const local: TimeLocal = {
          nome: time,
          abreviacao,
          numero,
          cores,
          tatica,
          botoesNomes: [...formacao.nomesPadrao],
        };
        salvarTimeLocal(local);
        onSalvarTimeLocal?.(local);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  // ===================== Tela do MEU TIME (login/saída/exclusão:
  // ===================== pertencem à Cidadela dos Clássicos) =====================
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn-ghost p-2" title="Voltar">
            <ChevronLeft className="size-4" />
          </button>
          <div>
            <h2 className="font-display text-3xl">Meu Time</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {perfil?.user_id
                ? "Personalize seu time, tática e botões. Salvo na sua conta."
                : "Personalize seu time, tática e botões. Salvo neste navegador — sem login."}
            </p>
          </div>
        </div>
      </div>

      {/* Resumo do treinador */}
      <div className="panel flex flex-wrap items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
          <span className="text-xs font-bold">{abreviacao.slice(0, 3) || "MTI"}</span>
        </div>
        <div className="min-w-0">
          <p className="font-display text-xl truncate">{time || "Meu Time"}</p>
          <p className="text-sm text-muted-foreground truncate">
            {nome || "Treinador"} · Nº {numero} · Soberania {perfil?.pontos_soberania ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">Treinador</p>
        </div>
        <div className="ml-auto flex gap-1.5">
          {cores.map((c, i) => (
            <span
              key={i}
              className="size-6 rounded-full border border-border"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      {/* Identidade do clube */}
      <div className="panel space-y-4">
        <SectionTitle icon={<Shirt className="size-4" />}>Identidade do clube</SectionTitle>
        <PersonalizacaoClube
          nome={nome}
          setNome={setNome}
          time={time}
          setTime={setTime}
          abreviacao={abreviacao}
          setAbreviacao={setAbreviacao}
          numero={numero}
          setNumero={setNumero}
          cores={cores}
          setCores={setCores}
        />
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <button
          onClick={salvarEdicao}
          disabled={salvando}
          className="btn-primary w-full disabled:opacity-60"
        >
          <Save className="size-4" />
          {salvando ? "Salvando..." : "Salvar personalização"}
        </button>
      </div>

      {/* Tática */}
      <PersonalizacaoTatica tatica={tatica} setTatica={setTatica} formacao={formacao} />

      {/* Evolução dos botões + identidade visual (§7-§11) */}
      {evolucao && (
        <PainelEvolucaoBotoes
          evolucao={evolucao}
          cores={cores}
          abreviacao={abreviacao}
        />
      )}

      {/* QI / Inteligência — resultado da SIMULAÇÃO (linkado ao mesmo user_id dos jogos) */}
      <PainelQi userId={perfil?.user_id ?? undefined} />
    </div>
  );
}

/* =========================== Sub-componentes =========================== */

function PersonalizacaoClube({
  nome,
  setNome,
  time,
  setTime,
  abreviacao,
  setAbreviacao,
  numero,
  setNumero,
  cores,
  setCores,
}: {
  nome: string;
  setNome: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  abreviacao: string;
  setAbreviacao: (v: string) => void;
  numero: number;
  setNumero: (v: number) => void;
  cores: string[];
  setCores: (v: string[]) => void;
}) {
  return (
    <>
      <Campo label="Seu nome (treinador)">
        <input
          className="field-input"
          maxLength={40}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
        <Campo label="Nome do time">
          <input
            className="field-input"
            maxLength={30}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </Campo>
        <Campo label="Sigla">
          <input
            className="field-input w-24 uppercase"
            maxLength={4}
            value={abreviacao}
            onChange={(e) => setAbreviacao(e.target.value.toUpperCase())}
          />
        </Campo>
        <Campo label="Número">
          <input
            className="field-input w-20"
            inputMode="numeric"
            value={numero}
            onChange={(e) => setNumero(Number(e.target.value.replace(/\D/g, "")) || 0)}
          />
        </Campo>
      </div>
      <Campo label="Cores do time (3, todas diferentes)">
        <div className="flex gap-3">
          {cores.map((c, i) => (
            <input
              key={i}
              type="color"
              aria-label={`Cor ${i + 1}`}
              value={c}
              onChange={(e) => setCores(cores.map((x, j) => (j === i ? e.target.value : x)))}
              className="size-11 cursor-pointer rounded-lg border border-border bg-background"
            />
          ))}
        </div>
      </Campo>
    </>
  );
}

/** Seletor de formação + prévia (sem nomear botões — §7: o foco agora é evoluir). */
function PersonalizacaoTatica({
  tatica,
  setTatica,
  formacao,
}: {
  tatica: Tatica;
  setTatica: (t: Tatica) => void;
  formacao: ReturnType<typeof formacaoById>;
}) {
  return (
    <div className="panel space-y-4">
      <SectionTitle icon={<Users className="size-4" />}>Tática de campo</SectionTitle>

      <div className="grid gap-2 sm:grid-cols-2">
        {FORMACOES.map((f) => (
          <button
            key={f.id}
            onClick={() => setTatica(f.id)}
            className={`rounded-lg border p-3 text-left transition ${
              tatica === f.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <p className="font-display text-lg leading-tight">{f.label}</p>
            <p className="text-xs text-muted-foreground">{f.desc}</p>
          </button>
        ))}
      </div>

      <Campo label="Pré-visualização da formação">
        <CampoMini formacao={formacao} cores={["#1e3a8a", "#f59e0b"]} />
      </Campo>
    </div>
  );
}

/** Símbolos/escudos disponíveis para o botão (§11): os símbolos dos clubes. */
const SIMBOLOS_ESCUDOS = [...new Set(TEAMS.map((t) => t.escudo).filter((e): e is string => !!e))];

/**
 * Painel de evolução dos botões (§7-§11): cada botão tem UMA habilidade com
 * nível 0..5 (estrelas), preço progressivo em SOV, e o jogador escolhe o
 * escudo/símbolo + a cor de acento que aparecem dentro do botão em campo.
 */
function PainelEvolucaoBotoes({
  evolucao,
  cores,
  abreviacao,
}: {
  evolucao: NonNullable<Props["evolucao"]>;
  cores: string[];
  abreviacao: string;
}) {
  const { niveis, saldoSov, simbolo, cor, evoluindo, carreiraAtiva, onEvoluir, onIdentidade } =
    evolucao;
  const corAtiva = cor || cores[0] || "#1e3a8a";

  return (
    <div className="panel space-y-4" data-testid="painel-evolucao-botoes">
      <SectionTitle icon={<Sparkles className="size-4" />}>Evolução dos botões</SectionTitle>
      <p className="text-xs text-muted-foreground">
        Cada botão tem uma habilidade. Invista SOV para evoluí-la: chute mais forte e botão mais
        pesado em campo. O preço sobe a cada nível — escolha bem onde investir.
      </p>

      {!carreiraAtiva && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          Comece uma carreira para evoluir seus botões (a evolução usa o dinheiro da carreira).
        </p>
      )}

      <div className="space-y-3">
        {niveis.map((nivel, i) => {
          const custo = custoProximoNivel(nivel);
          const check = podeEvoluir(niveis, i, saldoSov);
          return (
            <div key={i} className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-sm"
                  style={{ background: corAtiva, borderColor: cores[1] ?? "#f59e0b" }}
                  title={simbolo || abreviacao}
                >
                  {simbolo || <span className="text-[10px] font-bold text-white">{i + 1}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">Botão {i + 1}</span>
                    <span className="text-sm tracking-wider text-amber-300">
                      {estrelasNivel(nivel)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
                      style={{ width: `${(nivel / MAX_NIVEL_BOTAO) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Habilidade nível {nivel}/{MAX_NIVEL_BOTAO}
                  </p>
                </div>
                <button
                  data-testid={`evoluir-botao-${i}`}
                  onClick={() => onEvoluir(i)}
                  disabled={!carreiraAtiva || !check.ok || evoluindo !== null}
                  className="btn-primary shrink-0 gap-1 px-3 py-2 text-xs disabled:opacity-40"
                  title={check.ok ? undefined : (check.motivo ?? "")}
                >
                  <Coins className="size-3.5" />
                  {custo === null
                    ? "Máximo"
                    : evoluindo === i
                      ? "..."
                      : `Aumentar — $${custo}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
        <p className="font-display text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
          Escudo dentro do botão
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SIMBOLOS_ESCUDOS.map((s) => (
            <button
              key={s}
              data-testid={`escudo-${s}`}
              onClick={() => onIdentidade(s === simbolo ? "" : s, corAtiva)}
              className={`flex size-9 items-center justify-center rounded-lg border text-lg transition ${
                simbolo === s
                  ? "border-primary bg-primary/15"
                  : "border-white/10 hover:border-primary/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="mt-3 font-display text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
          Cor do botão
        </p>
        <div className="mt-2 flex gap-2">
          {cores.map((c, i) => (
            <button
              key={i}
              data-testid={`cor-botao-${i}`}
              onClick={() => onIdentidade(simbolo, c)}
              className={`size-9 rounded-full border-2 transition ${
                corAtiva === c ? "border-white" : "border-white/20"
              }`}
              style={{ background: c }}
              title={`Cor ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Campo de futebol miniatura mostrando a formação escolhida. */
function CampoMini({
  formacao,
  cores,
}: {
  formacao: ReturnType<typeof formacaoById>;
  cores: [string, string];
}) {
  const W = 100;
  const H = 62;
  const [primaria, secundaria] = cores;
  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-border bg-green-950/30"
      style={{ aspectRatio: `${W}/${H}` }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
        {/* gramado listrado */}
        {Array.from({ length: 10 }).map((_, i) => (
          <rect
            key={i}
            x={(W / 10) * i}
            y={0}
            width={W / 10}
            height={H}
            fill={i % 2 === 0 ? "#166534" : "#15803d"}
            opacity={0.5}
          />
        ))}
        {/* linhas do campo */}
        <rect
          x={1}
          y={1}
          width={W - 2}
          height={H - 2}
          fill="none"
          stroke="#fff"
          strokeWidth={0.4}
        />
        <line x1={W / 2} y1={1} x2={W / 2} y2={H - 1} stroke="#fff" strokeWidth={0.4} />
        <circle cx={W / 2} cy={H / 2} r={6} fill="none" stroke="#fff" strokeWidth={0.4} />
        {/* goleiro */}
        <BotaoCampo x={5} y={H / 2} label="GK" primaria={primaria} secundaria={secundaria} />
        {/* 5 botões de linha */}
        {formacao.posicoes.map((pos, i) => (
          <BotaoCampo
            key={i}
            x={pos[0] * W}
            y={pos[1] * H}
            label={String(i + 1)}
            primaria={primaria}
            secundaria={secundaria}
          />
        ))}
      </svg>
    </div>
  );
}

function BotaoCampo({
  x,
  y,
  label,
  primaria,
  secundaria,
  nome,
}: {
  x: number;
  y: number;
  label: string;
  primaria: string;
  secundaria: string;
  nome?: string | undefined;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={3.2} fill={primaria} stroke={secundaria} strokeWidth={1.2} />
      <text x={x} y={y + 1} textAnchor="middle" fontSize={3} fontWeight="bold" fill="#fff">
        {label}
      </text>
      {nome && (
        <text x={x} y={y - 4.2} textAnchor="middle" fontSize={2.4} fill="#fff" opacity={0.9}>
          {nome.slice(0, 10)}
        </text>
      )}
    </g>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-display text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <h3 className="font-display text-lg">{children}</h3>
    </div>
  );
}

const QI_STATUS_PT: Record<TentativaResumo["status"], string> = {
  completed: "Concluída",
  expired: "Tempo esgotado",
  in_progress: "Em andamento",
  abandoned: "Abandonada",
};

/**
 * QI / Inteligência — mostra a ÚLTIMA simulação do usuário no MESMO perfil
 * dos jogos (mesmo user_id). Não apaga resultados: lista o histórico por
 * attempt_id. Fallback silencioso se a migration qi_simulacao.sql ainda não
 * foi aplicada (mostra convite para /simulacao-qi).
 */
function PainelQi({ userId }: { userId?: string | undefined }) {
  const [historico, setHistorico] = useState<TentativaResumo[] | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!userId) {
      setHistorico([]);
      return;
    }
    let ativo = true;
    setCarregando(true);
    void listarTentativas(10)
      .then((h) => {
        if (ativo) setHistorico(h ?? []);
      })
      .catch(() => {
        if (ativo) setHistorico([]);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [userId]);

  const ultima = historico?.find((t) => t.status !== "in_progress") ?? historico?.[0] ?? null;
  const restante = historico ? historico.slice(0, 5) : [];

  if (!userId) {
    return (
      <div className="panel space-y-3">
        <SectionTitle icon={<BrainCircuit className="size-4" />}>QI / Inteligência</SectionTitle>
        <p className="text-xs text-muted-foreground">
          Entre na Cidadela para salvar suas simulações neste perfil.
        </p>
      </div>
    );
  }

  return (
    <div className="panel space-y-3" data-testid="painel-qi-perfil">
      <SectionTitle icon={<BrainCircuit className="size-4" />}>QI / Inteligência</SectionTitle>
      {carregando && <p className="text-xs text-muted-foreground">Carregando…</p>}
      {!carregando && historico !== null && historico.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhuma simulação ainda. Faça a <a href="/simulacao-qi" className="text-primary underline">Simulação de Teste de QI</a>.
        </p>
      )}
      {ultima && (
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
          <p className="font-display text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            Última simulação · {formatarData(ultima.started_at)}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Acertos</span>
              <span className="font-bold text-white" data-qi-perfil-acertos>
                {ultima.raw_score} / {ultima.total_questions}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Percentual</span>
              <span className="font-bold text-white">
                {ultima.total_questions ? Math.round((ultima.raw_score / ultima.total_questions) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Tempo</span>
              <span className="font-bold text-white">{formatarTempo(ultima.time_used_seconds)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Estimativa exp.</span>
              <span className="font-bold text-indigo-300" data-qi-perfil-estimativa>
                {ultima.estimated_result ?? "—"}
              </span>
            </div>
          </div>
        </div>
      )}

      {restante.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
          <p className="font-display text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            Histórico
          </p>
          <ul className="mt-2 space-y-1.5">
            {restante.map((t) => (
              <li key={t.attempt_id} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  {formatarData(t.started_at)} · {QI_STATUS_PT[t.status] ?? t.status}
                </span>
                <span className="font-semibold text-white">
                  {t.raw_score}/{t.total_questions} · {t.estimated_result ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
