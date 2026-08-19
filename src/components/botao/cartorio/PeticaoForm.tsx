/**
 * Formulário de criação de petição de defesa no Cartório.
 * Dados pré-preenchidos via props (vindos do pedido/evento RPG).
 */

import type { CartorioFormPeticao } from "./cartorioTypes";

type Props = {
  value: CartorioFormPeticao;
  onChange: (v: CartorioFormPeticao) => void;
};

const TIPOS_INCIDENTE = [
  "Incidente em quadra",
  "Conduta de adversário",
  "Arbitragem hostil",
  "Rumor maldoso da imprensa",
  "Confusão em festa da colina",
];

export function PeticaoForm({ value, onChange }: Props) {
  const set = (k: keyof CartorioFormPeticao, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-xs font-semibold text-muted-foreground">Tipo do incidente</span>
        <select
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={value.tipoIncidente}
          onChange={(e) => set("tipoIncidente", e.target.value)}
        >
          <option value="">Escolha o tipo...</option>
          {TIPOS_INCIDENTE.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-muted-foreground">Descrição</span>
        <textarea
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          rows={4}
          value={value.descricao}
          onChange={(e) => set("descricao", e.target.value)}
          placeholder="Descreva sua versão do incidente (aparece no documento)..."
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-muted-foreground">
          Anexos / provas (opcional)
        </span>
        <input
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={value.anexos}
          onChange={(e) => set("anexos", e.target.value)}
          placeholder="Ex.: vídeo do lance, testemunhas, relatório médico"
        />
      </label>
    </div>
  );
}
