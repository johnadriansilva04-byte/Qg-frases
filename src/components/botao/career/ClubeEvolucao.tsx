import { ArrowLeft, Coins, Sparkles } from "lucide-react";
import { CORES_PADRAO, type Perfil } from "../online/auth";
import { custoProximoNivel, estrelasNivel, MAX_NIVEL_BOTAO, podeEvoluir, type NiveisBotoes } from "./evolucaoBotoes";
import { TEAMS } from "../data/teams";

const SIMBOLOS_ESCUDOS = [...new Set(TEAMS.map((t) => t.escudo).filter((e): e is string => !!e))];

type Props = {
  evolucao: {
    niveis: NiveisBotoes;
    saldoSov: number;
    simbolo: string;
    cor: string;
    evoluindo: number | null;
    carreiraAtiva: boolean;
    onEvoluir: (idx: number) => void;
    onIdentidade: (simbolo: string, cor: string) => void;
  };
  cores: string[];
  abreviacao: string;
  onBack: () => void;
};

export function ClubeEvolucao({ evolucao, cores, abreviacao, onBack }: Props) {
  const { niveis, saldoSov, simbolo, cor, evoluindo, carreiraAtiva, onEvoluir, onIdentidade } = evolucao;
  const corAtiva = cor || cores[0] ?? CORES_PADRAO[0] ?? "#1e3a8a";
  const botoesNomes = ["Zagueiro", "Lateral-Esq", "Lateral-Dir", "Ponta", "Centroavante"];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-md">
        <button onClick={onBack} className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10">
          <ArrowLeft className="size-4 text-white" />
        </button>
        <Sparkles className="size-5 text-amber-400" />
        <h1 className="font-display text-lg text-white">Evolução dos Botões</h1>
        <div className="ml-auto flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1">
          <Coins className="size-3.5 text-amber-300" />
          <span className="text-xs font-bold text-amber-200">{saldoSov} SOV</span>
        </div>
      </div>

      <div className="flex-1 space-y-5 p-4 pb-8">
        {!carreiraAtiva && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            Comece uma carreira para evoluir seus botões.
          </div>
        )}

        <p className="text-xs text-white/50">
          Cada botão tem uma habilidade. Invista SOV para evoluí-la: chute mais forte e botão mais pesado em campo.
        </p>

        {/* 5 botões */}
        <div className="space-y-3">
          {niveis.map((nivel, i) => {
            const custo = custoProximoNivel(nivel);
            const check = podeEvoluir(niveis, i, saldoSov);
            return (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  {/* Avatar do botão */}
                  <div
                    className="flex size-12 shrink-0 items-center justify-center rounded-xl border-2 text-sm font-bold text-white"
                    style={{ background: corAtiva, borderColor: cores[1] ?? "#f59e0b" }}
                  >
                    {simbolo || i + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">{botoesNomes[i]}</p>
                        <p className="text-[10px] text-white/40">Botão {i + 1}</p>
                      </div>
                      <span className="text-xs tracking-wider text-amber-300">{estrelasNivel(nivel)}</span>
                    </div>
                    {/* Barra de progresso */}
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
                        style={{ width: `${(nivel / MAX_NIVEL_BOTAO) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-white/30">Nível {nivel}/{MAX_NIVEL_BOTAO}</p>
                  </div>

                  {/* Botão evoluir */}
                  <button
                    onClick={() => onEvoluir(i)}
                    disabled={!carreiraAtiva || !check.ok || evoluindo !== null}
                    className="shrink-0 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-30"
                  >
                    {custo === null ? "MAX" : evoluindo === i ? "..." : `${custo} SOV`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Escudo */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Escudo dentro do botão</p>
          <div className="flex flex-wrap gap-2">
            {SIMBOLOS_ESCUDOS.map((s) => (
              <button
                key={s}
                onClick={() => onIdentidade(s === simbolo ? "" : s, corAtiva)}
                className={`flex size-10 items-center justify-center rounded-xl border text-lg transition ${
                  simbolo === s ? "border-emerald-400 bg-emerald-400/15" : "border-white/10 hover:border-white/20"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Cor */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Cor do botão</p>
          <div className="flex gap-3">
            {cores.map((c, i) => (
              <button
                key={i}
                onClick={() => onIdentidade(simbolo, c)}
                className={`size-10 rounded-full border-2 transition ${corAtiva === c ? "border-white scale-110" : "border-white/20"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
