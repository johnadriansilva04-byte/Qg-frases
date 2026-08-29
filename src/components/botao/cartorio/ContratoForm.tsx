/**
 * Formulário de criação de contrato no Cartório.
 * Dados pré-preenchidos via props (vindos do pedido/evento RPG).
 */

import type { CartorioFormContrato } from "./cartorioTypes";

type Props = {
  value: CartorioFormContrato;
  onChange: (v: CartorioFormContrato) => void;
};

const CLAUSULAS_OPCOES = [
  "Vínculo até fim da temporada declarada",
  "Multa rescisória em caso de descumprimento",
  "Bônus por classificação na mata-mata",
  "Cláusula de confidencialidade narrativa",
  "Renovação automática após promoção de divisão",
];

export function ContratoForm({ value, onChange }: Props) {
  const set = (k: keyof CartorioFormContrato, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-xs font-semibold text-muted-foreground">Nome do clube</span>
        <input
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={value.nomeClube}
          onChange={(e) => set("nomeClube", e.target.value)}
          placeholder="Ex.: Clube do Treinador"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-muted-foreground">Treinador</span>
        <input
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={value.treinador}
          onChange={(e) => set("treinador", e.target.value)}
          placeholder="Nome do treinador do vínculo"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-muted-foreground">Temporada</span>
        <input
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={value.tempo}
          onChange={(e) => set("tempo", e.target.value)}
          placeholder="Ex.: Temporada 3"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-muted-foreground">Valor do vínculo</span>
        <input
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={value.valor}
          onChange={(e) => set("valor", e.target.value)}
          placeholder="Ex.: 50.000 SOV"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-muted-foreground">Cláusula</span>
        <select
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={value.clausulas}
          onChange={(e) => set("clausulas", e.target.value)}
        >
          <option value="">Escolha uma cláusula...</option>
          {CLAUSULAS_OPCOES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
