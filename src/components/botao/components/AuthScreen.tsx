import { useState, useEffect } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { ControlledMonetagButton } from "@/components/ControlledMonetagButton";
import { cadastrar, cachePerfil, entrar, CORES_PADRAO, type Perfil } from "../online/auth";
import {
  BOTOES_NOMES_DEFAULT,
  FORMACAO_DEFAULT,
  FORMACOES,
  formacaoById,
  normalizarBotoesNomes,
  type Tatica,
} from "../career/formacoes";
import { atualizarPerfilClube } from "@/lib/botao/api";

type Props = {
  onPronto: (p?: Perfil) => void;
};

export function AuthScreen({ onPronto }: Props) {
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [time, setTime] = useState("Meu Time");
  const [abreviacao, setAbreviacao] = useState("MTI");
  const [numero, setNumero] = useState(10);
  const [cores, setCores] = useState<string[]>(CORES_PADRAO);
  const [tatica, setTatica] = useState<Tatica>(FORMACAO_DEFAULT);
  const [botoes, setBotoes] = useState<[string, string, string, string, string]>(BOTOES_NOMES_DEFAULT);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // Mensagens variadas sobre mistérios/como joga
  const LOGIN_MESSAGES = [
    "Descubra os segredos da Cidadela enquanto espera...",
    "Aprenda a dominar o Campeonato do Campus com estratégia!",
    "Mistérios aguardam na Trilha dos Mistérios...",
    "Construa sua carreira e conquiste troféus!",
    "Desafie jogadores de todo o mundo no modo online!",
    "Cada partida é uma nova história para contar...",
  ];

  const [mensagemIndex, setMensagemIndex] = useState(0);

  // Garante que só rode no client-side para evitar hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Rotação de mensagens (após montagem)
  useEffect(() => {
    if (!isMounted) return;
    const interval = setInterval(() => {
      setMensagemIndex((prev) => (prev + 1) % LOGIN_MESSAGES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isMounted]);

  const submit = async () => {
    console.log("Modo atual:", modo);
    console.log("Email digitado:", email);

    if (cooldown > 0) {
      setErro(`Aguarde ${cooldown} segundos antes de tentar novamente.`);
      return;
    }

    setErro(null);
    setCarregando(true);
    try {
      if (modo === "login") {
        console.log("Chamando função entrar com:", email);
        const p = await entrar(email, senha);
        if (!p) {
          throw new Error("Login feito, mas o perfil não foi encontrado. Tente novamente.");
        }
        cachePerfil(p);
        onPronto(p);
      } else {
        console.log("Chamando função cadastrar com:", { email, nome, time });
        const p = await cadastrar({ email, senha, nome, time, abreviacao, numero, cores });
        // Atualiza tática e botões após cadastro
        if (p.user_id) {
          const atualizado = await atualizarPerfilClube(p.user_id, {
            tatica,
            botoes: botoes,
          });
          if (atualizado) {
            const perfilFinal: Perfil = {
              ...p,
              tatica: atualizado.tatica ?? tatica,
              botoes_nomes: atualizado.botoes_nomes ?? botoes,
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
      const errorMessage = e instanceof Error ? e.message : "Algo deu errado. Tente de novo.";
      console.error("Erro no submit:", errorMessage);

      // Melhorar mensagem para email rate limit
      const friendlyMessage = errorMessage.includes("email rate limit")
        ? "Muitas tentativas de criação de conta. Aguarde 1 minuto antes de tentar novamente."
        : errorMessage;

      setErro(friendlyMessage);

      // Se for erro de rate limiting (429 ou email rate limit), adicionar cooldown
      if (
        errorMessage.includes("Too Many Requests") ||
        errorMessage.includes("429") ||
        errorMessage.includes("email rate limit")
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
      setCarregando(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h2 className="font-display text-3xl">{modo === "login" ? "Entrar" : "Criar conta"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sua conta guarda o time personalizado, os troféus e libera o modo online.
        </p>
      </div>

      <div className="panel space-y-4">
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
          <>
            <Campo label="Seu nome">
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
            <Campo label="Cores do time">
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

            {/* Seleção de formação */}
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block font-display text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
                  Formação (tática)
                </span>
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {FORMACOES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setTatica(f.id);
                      setBotoes([...f.nomesPadrao] as [string, string, string, string, string]);
                    }}
                    className={`rounded-lg border p-3 text-left transition ${
                      tatica === f.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-display text-sm leading-tight">{f.label}</p>
                    <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Nomes dos botões */}
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1 block font-display text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
                  Nomear botões de campo
                </span>
              </label>
              {formacaoById(tatica).posicoes.map((pos, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="size-6 shrink-0 rounded-full bg-blue-600 text-center text-xs leading-6 font-bold text-white">
                    {i + 1}
                  </span>
                  <input
                    className="field-input flex-1 text-sm"
                    maxLength={18}
                    value={botoes[i]}
                    onChange={(e) => {
                      const next = [...botoes] as [string, string, string, string, string];
                      next[i] = e.target.value;
                      setBotoes(next);
                    }}
                    placeholder={`Botão ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <button
          onClick={submit}
          disabled={carregando || cooldown > 0}
          className="btn-primary w-full disabled:opacity-60"
        >
          {modo === "login" ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
          {carregando
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

      {/* Mensagem variada e botão de Monetag */}
      {isMounted && (
        <div className="rounded-lg border border-border/50 bg-surface/30 p-3">
          <p className="mb-3 text-center text-xs text-muted-foreground">
            {LOGIN_MESSAGES[mensagemIndex]}
          </p>
          <ControlledMonetagButton
            className="w-full text-xs"
            message="Uma página de patrocinador pode abrir. Deseja continuar?"
          >
            Cansou de jogar? Descubra algo novo.
          </ControlledMonetagButton>
        </div>
      )}
    </div>
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
