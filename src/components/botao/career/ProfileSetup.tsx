import { useState } from "react";
import { ArrowLeft, Palette, Shirt, Sparkles, Trophy } from "lucide-react";
import type { Perfil, TimeLocal } from "../online/auth";
import { CORES_PADRAO } from "../online/auth";
import { formacaoById, type Tatica } from "./formacoes";
import { type NiveisBotoes } from "./evolucaoBotoes";
import { ClubeIdentidade } from "./ClubeIdentidade";
import { ClubeTatica } from "./ClubeTatica";
import { ClubeEvolucao } from "./ClubeEvolucao";

type SubPage = "hub" | "identidade" | "tatica" | "evolucao";

type Props = {
  perfil: Perfil | null;
  timeLocal?: TimeLocal | null;
  onSalvarTimeLocal?: ((t: TimeLocal) => void) | undefined;
  onPronto: (p?: Perfil) => void;
  onBack: () => void;
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
 * CLUBE — Hub modular de gestão do clube.
 * Header com resumo + 3 cards clicáveis. Cada card abre uma subpágina dedicada.
 * Sem scroll longo, sem conteúdo expandido na mesma página.
 */
export function ProfileSetup({ perfil, timeLocal = null, onSalvarTimeLocal, onPronto, onBack, evolucao }: Props) {
  const [subPage, setSubPage] = useState<SubPage>("hub");

  const nome = perfil?.nome ?? "";
  const time = perfil?.time_personalizado ?? timeLocal?.nome ?? "Meu Time";
  const abreviacao = perfil?.abreviacao_time ?? timeLocal?.abreviacao ?? "MTI";
  const cores = perfil?.cores && perfil.cores.length === 3 ? perfil.cores : timeLocal?.cores ?? CORES_PADRAO;
  const tatica = (perfil?.tatica ?? timeLocal?.tatica ?? "1-2-2") as Tatica;
  const formacao = formacaoById(tatica);
  const saldoSov = evolucao?.saldoSov ?? 0;

  // === Subpages ===
  if (subPage === "identidade") {
    return (
      <ClubeIdentidade
        perfil={perfil}
        timeLocal={timeLocal}
        onSalvarTimeLocal={onSalvarTimeLocal}
        onSalvar={(p) => { onPronto(p); setSubPage("hub"); }}
        onBack={() => setSubPage("hub")}
      />
    );
  }

  if (subPage === "tatica") {
    return (
      <ClubeTatica
        tatica={tatica}
        onSalvar={(novaTatica, _posicoes) => {
          // Salvar tática via perfil ou local
          if (perfil?.user_id) {
            import("@/lib/botao/api").then(({ atualizarPerfilClube }) => {
              atualizarPerfilClube(perfil.user_id, {
                nome, time, abreviacao, cores,
                tatica: novaTatica,
                botoes: [...formacao.nomesPadrao],
              }).then((atualizado) => {
                if (atualizado) {
                  import("../online/auth").then(({ cachePerfil }) => {
                    cachePerfil({ ...perfil, tatica: novaTatica });
                  });
                  onPronto({ ...perfil, tatica: novaTatica });
                }
              });
            });
          } else if (timeLocal) {
            const novoLocal: TimeLocal = { ...timeLocal, tatica: novaTatica };
            import("../online/auth").then(({ salvarTimeLocal }) => {
              salvarTimeLocal(novoLocal);
              onSalvarTimeLocal?.(novoLocal);
            });
          }
          setSubPage("hub");
        }}
        onBack={() => setSubPage("hub")}
      />
    );
  }

  if (subPage === "evolucao" && evolucao) {
    return (
      <ClubeEvolucao
        evolucao={evolucao}
        cores={cores}
        abreviacao={abreviacao}
        onBack={() => setSubPage("hub")}
      />
    );
  }

  // === Hub principal ===
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header fixo */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-md">
        <button onClick={onBack} className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10">
          <ArrowLeft className="size-4 text-white" />
        </button>
        <Shirt className="size-5 text-emerald-400" />
        <h1 className="font-display text-lg text-white">Clube</h1>
      </div>

      <div className="flex-1 space-y-5 p-4 pb-8">
        {/* Módulo Superior — Resumo do Clube */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-4">
            {/* Escudo/Avatar */}
            <div
              className="flex size-16 shrink-0 items-center justify-center rounded-2xl border-2 text-lg font-black text-white shadow-lg"
              style={{ background: cores[0], borderColor: cores[1] }}
            >
              {abreviacao.slice(0, 3) || "MTI"}
            </div>
            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl text-white">{time || "Meu Time"}</p>
              <p className="truncate text-sm text-white/50">{nome || "Treinador"}</p>
              <p className="text-[10px] text-white/30">{formacao.label}</p>
            </div>
            {/* SOV */}
            <div className="shrink-0 text-right">
              <p className="font-display text-2xl font-black text-amber-300">{saldoSov}</p>
              <p className="text-[10px] uppercase tracking-widest text-amber-400/60">SOV</p>
            </div>
          </div>
          {/* Cores */}
          <div className="mt-3 flex gap-1.5">
            {cores.map((c, i) => (
              <span key={i} className="size-5 rounded-full border border-white/20" style={{ background: c }} />
            ))}
          </div>
        </div>

        {/* 3 Cards Modulares */}
        <div className="space-y-3">
          {/* Card 1: Identidade */}
          <button
            onClick={() => setSubPage("identidade")}
            className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-emerald-400/40 hover:bg-emerald-400/5 active:scale-[0.98]"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-400 transition group-hover:bg-emerald-400/25">
              <Shirt className="size-5" />
            </div>
            <div className="flex-1">
              <p className="font-display text-base text-white">Identidade do Clube</p>
              <p className="text-xs text-white/40">Nome, sigla e cores</p>
            </div>
            <span className="text-xs text-white/30 transition group-hover:text-emerald-400">→</span>
          </button>

          {/* Card 2: Tática */}
          <button
            onClick={() => setSubPage("tatica")}
            className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-blue-400/40 hover:bg-blue-400/5 active:scale-[0.98]"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-400/15 text-blue-400 transition group-hover:bg-blue-400/25">
              <Palette className="size-5" />
            </div>
            <div className="flex-1">
              <p className="font-display text-base text-white">Tática de Campo</p>
              <p className="text-xs text-white/40">Formação e posições</p>
            </div>
            <span className="text-xs text-white/30 transition group-hover:text-blue-400">→</span>
          </button>

          {/* Card 3: Evolução */}
          <button
            onClick={() => evolucao && setSubPage("evolucao")}
            disabled={!evolucao}
            className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-amber-400/40 hover:bg-amber-400/5 active:scale-[0.98] disabled:opacity-40"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-400 transition group-hover:bg-amber-400/25">
              <Sparkles className="size-5" />
            </div>
            <div className="flex-1">
              <p className="font-display text-base text-white">Evolução dos Botões</p>
              <p className="text-xs text-white/40">Habilidades e melhorias</p>
            </div>
            <span className="text-xs text-white/30 transition group-hover:text-amber-400">→</span>
          </button>
        </div>

        {/* Conquistas rápidas (se disponível) */}
        {evolucao && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-amber-400" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Estatísticas</p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-white/40">Nível médio</p>
                <p className="font-display text-lg text-white">
                  {(evolucao.niveis.reduce((a, b) => a + b, 0) / 5).toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/40">Bônus de força</p>
                <p className="font-display text-lg text-emerald-300">
                  +{(evolucao.niveis.reduce((a, b) => a + b, 0) / 5).toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
