import { useState } from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import type { Coach, TacticalStyle } from "./types";

type Props = {
  timeName: string;
  onFinish: (coach: Coach) => void;
  onBack: () => void;
};

const ESTILOS: { id: TacticalStyle; nome: string; desc: string; icon: string }[] = [
  { id: "ataque", nome: "Ofensivo", desc: "Pressão alta e chegada. +1 força de ataque.", icon: "⚔️" },
  { id: "equilibrado", nome: "Equilibrado", desc: "Meio-campo forte. Sem bônus específico.", icon: "⚖️" },
  { id: "defesa", nome: "Retranca inteligente", desc: "Compacto e contra-ataques. -1 gol sofrido.", icon: "🛡️" },
];

const NARRATIVA = [
  "Um dia comum, telefone toca. Do outro lado, a diretoria do clube te oferece o cargo mais desejado da carreira.",
  "O time atravessa uma seca de títulos. A pressão é enorme. Mas você aceita — porque quem nasceu treinador não recusa vestiário.",
  "Antes da primeira coletiva, você precisa se apresentar. Quem é o novo comandante?",
];

export function CoachSetup({ timeName, onFinish, onBack }: Props) {
  const [step, setStep] = useState(0);
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [cidade, setCidade] = useState("");
  const [estilo, setEstilo] = useState<TacticalStyle>("equilibrado");
  const [bio, setBio] = useState("");

  const podeAvancar = () => {
    if (step < NARRATIVA.length) return true;
    if (step === NARRATIVA.length) return nome.trim().length >= 2;
    if (step === NARRATIVA.length + 1) return !!estilo;
    return true;
  };

  const totalSteps = NARRATIVA.length + 3;

  const avancar = () => {
    if (step < totalSteps - 1) return setStep(step + 1);
    onFinish({
      nome: nome.trim(),
      apelido: apelido.trim() || nome.trim().split(" ")[0]!,
      cidade: cidade.trim() || "—",
      estilo,
      bio: bio.trim(),
      soberania: 0,
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
          <span>Modo Carreira · Etapa {step + 1}/{totalSteps}</span>
        </div>

        {step < NARRATIVA.length && (
          <div className="space-y-4">
            <p className="font-display text-2xl leading-snug">{NARRATIVA[step]}</p>
            <p className="text-sm text-muted-foreground">Clube: <span className="text-foreground">{timeName}</span></p>
          </div>
        )}

        {step === NARRATIVA.length && (
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
          </div>
        )}

        {step === NARRATIVA.length + 1 && (
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
          </div>
        )}

        {step === NARRATIVA.length + 2 && (
          <div className="space-y-4">
            <h3 className="font-display text-2xl">Sua trajetória (opcional)</h3>
            <p className="text-sm text-muted-foreground">
              Uma linha para os jornalistas usarem na primeira coletiva.
            </p>
            <textarea
              data-testid="coach-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Ex: Ex-jogador, começou como auxiliar em 2015…"
              rows={3}
              maxLength={160}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 outline-none focus:border-primary"
            />
            <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
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
            {step < totalSteps - 1 ? "Continuar" : "Assinar contrato"} <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
