import { useState } from "react";
import { ChevronLeft, LogIn, UserPlus, Trash2, Save, Shirt, Users, Sparkles, Coins } from "lucide-react";
import {
  cadastrar,
  cachePerfil,
  CORES_PADRAO,
  entrar,
  limparCache,
  type Perfil,
} from "../online/auth";
import { atualizarPerfilClube, excluirContaUsuario } from "@/lib/botao/api";
import { getSupabaseConfigError, supabase } from "@/integrations/supabase/client";
import {
  FORMACAO_DEFAULT,
  FORMACOES,
  formacaoById,
  type Tatica,
} from "./formacoes";
import {
  custoProximoNivel,
  estrelasNivel,
  MAX_NIVEL_BOTAO,
  podeEvoluir,
  type NiveisBotoes,
} from "./evolucaoBotoes";
import { TEAMS } from "../data/teams";

type Props = {
  perfil: Perfil | null;
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

type Modo = "login" | "cadastro" | "editar";

/**
 * Módulo de conta/login estável (PS2-style). Faz login automático quando o
 * usuário já tem sessão ativa (via useBotaoAuth). Permite:
 *  - Criar conta / logar / deslogar
 *  - Personalizar time (nome, sigla, cores, número)
 *  - Escolher tática/formação (1-2-2, 1-3-1, 1-1-3, 1-2-1-1, 2-2-1)
 *  - EVOLUIR os 5 botões de campo (habilidade única, preço progressivo — §7-§10)
 *  - Escolher o escudo/símbolo e a cor de acento dos botões (§11)
 *  - Excluir conta (exclusão TOTAL via RPC excluir_conta_total)
 * Tudo é salvo no Supabase (botao_usuarios + RPC atualizar_perfil_clube).
 */
export function ProfileSetup({ perfil, onPronto, onBack, evolucao }: Props) {
  const modoInicial: Modo = perfil ? "editar" : "login";
  const [modo, setModo] = useState<Modo>(modoInicial);

  // --- campos de auth ---
  const [email, setEmail] = useState(perfil?.email ?? "");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState(perfil?.nome ?? "");
  const [time, setTime] = useState(perfil?.time_personalizado ?? "Meu Time");
  const [abreviacao, setAbreviacao] = useState(perfil?.abreviacao_time ?? "MTI");
  const [numero, setNumero] = useState(perfil?.numero_jogador ?? 10);
  const [cores, setCores] = useState<string[]>(
    perfil?.cores && perfil.cores.length === 3 ? perfil.cores : CORES_PADRAO,
  );

  // --- personalização PS2 ---
  const [tatica, setTatica] = useState<Tatica>((perfil?.tatica as Tatica) ?? FORMACAO_DEFAULT);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const supabaseConfigErro = getSupabaseConfigError();

  const formacao = formacaoById(tatica);

  const validarCoresUnicas = (c: string[]) => c[0] !== c[1] && c[1] !== c[2] && c[0] !== c[2];

  const submitAuth = async () => {
    if (cooldown > 0) {
      setErro(`Aguarde ${cooldown}s antes de tentar novamente.`);
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      if (modo === "login") {
        const p = await entrar(email, senha);
        if (!p) {
          throw new Error("Login feito, mas o perfil não foi encontrado. Tente novamente.");
        }
        cachePerfil(p);
        onPronto(p);
      } else {
        if (!validarCoresUnicas(cores)) {
          throw new Error("As três cores devem ser diferentes.");
        }
        const p = await cadastrar({ email, senha, nome, time, abreviacao, numero, cores });
        // Criação via trigger usa defaults de tatica/botoes. Atualiza em seguida.
        if (p.user_id) {
          const atualizado = await atualizarPerfilClube(p.user_id, {
            tatica,
            botoes: [...formacao.nomesPadrao],
          });
          if (atualizado) {
            const perfilFinal: Perfil = {
              ...p,
              tatica: atualizado.tatica ?? tatica,
              botoes_nomes: atualizado.botoes_nomes ?? [...formacao.nomesPadrao],
            };
            cachePerfil(perfilFinal);
            onPronto(perfilFinal);
            return;
          }
        }
        cachePerfil(p);
        onPronto(p);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Algo deu errado. Tente de novo.";
      setErro(msg);
      if (
        msg.includes("Too Many Requests") ||
        msg.includes("429") ||
        msg.includes("email rate limit")
      ) {
        setCooldown(60);
        const interval = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } finally {
      setSalvando(false);
    }
  };

  const salvarEdicao = async () => {
    if (!perfil?.user_id) return;
    if (!validarCoresUnicas(cores)) {
      setErro("As três cores devem ser diferentes.");
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
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
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const excluirConta = async () => {
    if (!perfil?.user_id) return;
    if (
      !confirm(
        "Tem certeza que deseja EXCLUIR sua conta? Todos os dados (time, troféus, soberania, campanhas) serão apagados. Esta ação NÃO pode ser desfeita.",
      )
    ) {
      return;
    }
    setSalvando(true);
    try {
      // Exclusão TOTAL (RPC excluir_conta_total): perfil, carteira, ledger,
      // carreira, Cidadela e o próprio registro de autenticação.
      await excluirContaUsuario(perfil.user_id);
      limparCache();
      onPronto(undefined);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir conta.");
    } finally {
      setSalvando(false);
    }
  };

  const deslogar = async () => {
    await supabase.auth.signOut();
    limparCache();
    onPronto(undefined);
  };

  // ===================== Tela de LOGIN/CADASTRO =====================
  if (modo === "login" || modo === "cadastro") {
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn-ghost p-2" title="Voltar">
            <ChevronLeft className="size-4" />
          </button>
          <div>
            <h2 className="font-display text-3xl">{modo === "login" ? "Entrar" : "Criar conta"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sua conta guarda o time personalizado, tática, troféus e libera o modo online.
            </p>
          </div>
        </div>

        <div className="panel space-y-4">
          {supabaseConfigErro && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {supabaseConfigErro} O modo offline continua disponível sem login.
            </p>
          )}

          <Campo label="Email">
            <input
              className="field-input"
              type="email"
              maxLength={100}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </Campo>

          <Campo label="Senha">
            <input
              className="field-input"
              type="password"
              maxLength={72}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="mínimo 6 caracteres"
            />
          </Campo>

          {modo === "cadastro" && (
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
          )}

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <button
            onClick={submitAuth}
            disabled={salvando || cooldown > 0 || !!supabaseConfigErro}
            className="btn-primary w-full disabled:opacity-60"
          >
            {modo === "login" ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
            {salvando
              ? "Aguarde..."
              : cooldown > 0
                ? `Aguarde ${cooldown}s`
                : modo === "login"
                  ? "Entrar"
                  : "Criar conta"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn-ghost"
            onClick={() => {
              setErro(null);
              setModo(modo === "login" ? "cadastro" : "login");
            }}
          >
            {modo === "login" ? "Não tenho conta" : "Já tenho conta"}
          </button>
        </div>

        {modo === "cadastro" && (
          <PersonalizacaoTatica tatica={tatica} setTatica={setTatica} formacao={formacao} />
        )}
      </div>
    );
  }

  // ===================== Tela de EDIÇÃO (logado) =====================
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn-ghost p-2" title="Voltar">
            <ChevronLeft className="size-4" />
          </button>
          <div>
            <h2 className="font-display text-3xl">Meu Clube</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Personalize seu time, tática e botões. Salvo no servidor.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={deslogar} className="btn-ghost" title="Sair da conta">
            Sair
          </button>
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

      {/* Zona de perigo */}
      <div className="panel space-y-3 border-destructive/40">
        <SectionTitle icon={<Trash2 className="size-4 text-destructive" />}>
          Zona de perigo
        </SectionTitle>
        <p className="text-sm text-muted-foreground">
          Excluir a conta apaga definitivamente time, troféus, soberania e campanhas.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={excluirConta}
            disabled={salvando}
            className="btn-ghost text-destructive disabled:opacity-60"
          >
            <Trash2 className="size-4" />
            Excluir conta
          </button>
        </div>
      </div>
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
