import { useState } from "react";
import { ArrowLeft, Save, Shirt } from "lucide-react";
import { CORES_PADRAO, type Perfil, type TimeLocal } from "../online/auth";
import { atualizarPerfilClube } from "@/lib/botao/api";
import { cachePerfil } from "../online/auth";

type Props = {
  perfil: Perfil | null;
  timeLocal?: TimeLocal | null;
  onSalvarTimeLocal?: ((t: TimeLocal) => void) | undefined;
  onSalvar: (p: Perfil) => void;
  onBack: () => void;
};

export function ClubeIdentidade({ perfil, timeLocal = null, onSalvarTimeLocal, onSalvar, onBack }: Props) {
  const [nome, setNome] = useState(perfil?.nome ?? "");
  const [time, setTime] = useState(perfil?.time_personalizado ?? timeLocal?.nome ?? "Meu Time");
  const [abreviacao, setAbreviacao] = useState(perfil?.abreviacao_time ?? timeLocal?.abreviacao ?? "MTI");
  const [cores, setCores] = useState<string[]>(
    perfil?.cores && perfil.cores.length === 3 ? perfil.cores : timeLocal?.cores ?? CORES_PADRAO,
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const coresUnicas = cores[0] !== cores[1] && cores[1] !== cores[2] && cores[0] !== cores[2];

  const salvar = async () => {
    if (!coresUnicas) {
      setErro("As três cores devem ser diferentes.");
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      if (perfil?.user_id) {
        const atualizado = await atualizarPerfilClube(perfil.user_id, {
          nome, time, abreviacao, cores,
          tatica: perfil.tatica ?? "1-2-2",
          botoes: perfil.botoes_nomes ?? ["Zagueiro", "Lateral-Esq", "Lateral-Dir", "Ponta", "Centroavante"],
        });
        if (!atualizado) throw new Error("Não foi possível salvar.");
        const final: Perfil = {
          ...perfil,
          nome: atualizado.nome,
          time_personalizado: atualizado.time_personalizado,
          abreviacao_time: atualizado.abreviacao_time,
          cores: atualizado.cores,
        };
        cachePerfil(final);
        onSalvar(final);
      } else {
        const local: TimeLocal = {
          nome: time, abreviacao, numero: timeLocal?.numero ?? 10, cores,
          tatica: timeLocal?.tatica ?? "1-2-2",
          botoesNomes: timeLocal?.botoesNomes ?? ["Zagueiro", "Lateral-Esq", "Lateral-Dir", "Ponta", "Centroavante"],
        };
        const { salvarTimeLocal } = await import("../online/auth");
        salvarTimeLocal(local);
        onSalvarTimeLocal?.(local);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header fixo */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-md">
        <button onClick={onBack} className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10">
          <ArrowLeft className="size-4 text-white" />
        </button>
        <Shirt className="size-5 text-emerald-400" />
        <h1 className="font-display text-lg text-white">Identidade do Clube</h1>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 space-y-5 p-4 pb-28">
        <Field label="Seu nome (treinador)">
          <input className="field-input" maxLength={40} value={nome} onChange={(e) => setNome(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Nome do clube">
            <input className="field-input" maxLength={30} value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Sigla">
            <input className="field-input w-24 uppercase" maxLength={4} value={abreviacao} onChange={(e) => setAbreviacao(e.target.value.toUpperCase())} />
          </Field>
        </div>
        <Field label="Cores do time (3, todas diferentes)">
          <div className="flex gap-3">
            {cores.map((c, i) => (
              <div key={i} className="relative">
                <input
                  type="color" aria-label={`Cor ${i + 1}`} value={c}
                  onChange={(e) => setCores(cores.map((x, j) => (j === i ? e.target.value : x)))}
                  className="size-12 cursor-pointer rounded-xl border-2 border-white/20 bg-transparent"
                />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-white/40">
                  {i === 0 ? "Principal" : i === 1 ? "Secundária" : "Destaque"}
                </span>
              </div>
            ))}
          </div>
        </Field>

        {/* Preview */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="mb-3 text-[10px] uppercase tracking-widest text-white/30">Preview</p>
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl border-2 text-lg font-black text-white" style={{ background: cores[0], borderColor: cores[1] }}>
              {abreviacao.slice(0, 3) || "MTI"}
            </div>
            <div>
              <p className="font-display text-xl text-white">{time || "Meu Time"}</p>
              <p className="text-sm text-white/50">{nome || "Treinador"}</p>
            </div>
          </div>
        </div>

        {erro && <p className="text-sm text-red-400">{erro}</p>}
      </div>

      {/* Botão salvar fixo no fundo */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur-md">
        <button
          onClick={salvar}
          disabled={salvando || !coresUnicas}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 font-display text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50"
        >
          <Save className="size-4" />
          {salvando ? "Salvando..." : "Salvar personalização"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</span>
      {children}
    </label>
  );
}
