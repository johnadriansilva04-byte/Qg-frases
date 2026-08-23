import { useState } from "react";
import { Sparkles, ChevronRight, FileSignature, Coins, Target } from "lucide-react";
import type { Coach, Divisao, TacticalStyle } from "./types";
import { CUSTO_MANUTENCAO, DIVISAO_LABEL } from "./competitionApi";

type Props = {
  timeName: string;
  /** Divisão da temporada 1 — compõe a oferta do clube. */
  divisao?: Divisao | undefined;
  /** Identidade já conhecida do login (§13) — o nome vem preenchido, editável. */
  nomeInicial?: string | undefined;
  onFinish: (coach: Coach) => void;
  onBack: () => void;
};

const ESTILOS: { id: TacticalStyle; nome: string; desc: string; icon: string }[] = [
  { id: "ataque", nome: "Ofensivo", desc: "Pressão alta e chegada. +1 força de ataque.", icon: "⚔️" },
  { id: "equilibrado", nome: "Equilibrado", desc: "Meio-campo forte. Sem bônus específico.", icon: "⚖️" },
  { id: "defesa", nome: "Retranca inteligente", desc: "Compacto e contra-ataques. -1 gol sofrido.", icon: "🛡️" },
];

/**
 * Entrada da carreira em 3 passos (nunca 6 telas de enrolação):
 *  1. OFERTA DO CLUBE — a diretoria apresenta a proposta da temporada 1;
 *  2. Identidade — quem é o treinador (nome vem do login);
 *  3. Estilo tático — e assina.
 */
export function CoachSetup({ timeName, divisao, nomeInicial, onFinish, onBack }: Props) {
  const [step, setStep] = useState(0);
  // §13: usuário logado já tem identidade — nunca pedir nome do zero.
  const [nome, setNome] = useState(nomeInicial ?? "");
  const [apelido, setApelido] = useState("");
  const [cidade, setCidade] = useState("");
  const [estilo, setEstilo] = useState<TacticalStyle>("equilibrado");
  const [bio, setBio] = useState("");

  const divisaoInicial = divisao ?? "serie-c";
  const manutencao = CUSTO_MANUTENCAO[divisaoInicial];
  const totalSteps = 3;

  const podeAvancar = () => {
    if (step === 1) return nome.trim().length >= 2;
    return true;
  };

  const avancar = () => {
    if (step < totalSteps - 1) return setStep(step + 1);
    onFinish({
      nome: nome.trim(),
      apelido: apelido.trim() || nome.trim().split(" ")[0]!,
      cidade: cidade.trim() || "—",
      estilo,
      bio: bio.trim(),
      sov: 0,
      campanhasJogadas: 0,
      titulos: 0,
      criadoEm: new Date().toISOString(),
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8" data-testid="coach-setup">
      <div className="panel">
        <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          <Sparkles className="size-4" />
          <span>Carreira no Campus · Etapa {step + 1}/{totalSteps}</span>
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <p className="font-display text-2xl leading-snug">
              O telefone toca. Do outro lado, a diretoria do{" "}
              <span className="text-primary">{timeName}</span> tem uma proposta.
            </p>
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">
                <FileSignature className="size-3.5" />
                Oferta de clube · Temporada 1
              </p>
              <h3 className="mt-2 font-display text-xl font-bold text-emerald-100">
                Contrato de treinador — {timeName}
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <Target className="size-4 shrink-0 text-emerald-300" />
                  <span>
                    Competição: <strong className="text-white">{DIVISAO_LABEL[divisaoInicial]}</strong>{" "}
                    do Brasileirão da Cidadela + Copa do Brasil
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Coins className="size-4 shrink-0 text-amber-300" />
                  <span>
                    Manutenção do clube: <strong className="text-white">{manutencao} SOV</strong> por
                    temporada (o clube pode fechar no vermelho — você recupera jogando)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="size-4 shrink-0 text-cyan-300" />
                  <span>Bônus por título, desafios de patrocinador e dividendos de investimentos</span>
                </li>
              </ul>
              <p className="mt-3 border-t border-white/10 pt-2 text-xs italic text-slate-400">
                "O time atravessa uma seca de títulos. A pressão é enorme. Mas quem nasceu treinador
                não recusa vestiário." — Diretoria
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-display text-2xl">Quem é você, treinador?</h3>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Nome completo</label>
              <input
                data-testid="coach-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Silveira"
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 outline-none focus:border-primary"
                maxLength={40}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Apelido nos jornais</label>
                <input
                  data-testid="coach-apelido"
                  value={apelido}
                  onChange={(e) => setApelido(e.target.value)}
                  placeholder="Ex: Cacá"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 outline-none focus:border-primary"
                  maxLength={20}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Cidade natal</label>
                <input
                  data-testid="coach-cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Ex: Belo Horizonte"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 outline-none focus:border-primary"
                  maxLength={30}
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Sua trajetória (opcional)
              </label>
              <textarea
                data-testid="coach-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Uma linha para os jornalistas usarem na primeira coletiva. Ex: Ex-jogador, começou como auxiliar em 2015…"
                rows={2}
                maxLength={160}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 outline-none focus:border-primary"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-display text-2xl">Escolha seu estilo tático</h3>
            <p className="text-sm text-muted-foreground">Ele muda como seu time começa cada partida do torneio.</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {ESTILOS.map((e) => (
                <button
                  key={e.id}
                  data-testid={`estilo-${e.id}`}
                  onClick={() => setEstilo(e.id)}
                  className={`diff-card text-left ${estilo === e.id ? "diff-card-active" : ""}`}
                >
                  <div className="text-2xl">{e.icon}</div>
                  <div className="mt-1 font-display text-lg">{e.nome}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{e.desc}</div>
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs uppercase tracking-widest text-primary">Prévia da manchete</p>
              <p className="mt-1 font-display text-lg">
                "{apelido || nome || "O treinador"} assume o comando do {timeName} para a nova temporada"
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button onClick={onBack} className="btn-ghost">Voltar</button>
          <button
            data-testid="coach-avancar"
            onClick={avancar}
            disabled={!podeAvancar()}
            className="btn-primary gap-2 disabled:opacity-50"
          >
            {step === 0 && "Aceitar proposta"}
            {step === 1 && "Continuar"}
            {step === 2 && "Assinar contrato"} <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
