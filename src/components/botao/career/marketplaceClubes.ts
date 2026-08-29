/**
 * VALOR DE CLUBES — PURE, DETERMINÍSTICO (§15/§16).
 * Preço não é Math.random(): é função determinística do modelo real do
 * clube (power, divisão, escudo). Engines de decisão do projeto: proibido
 * importar alias "@/" — caminhos relativos apenas (testável com jiti).
 */

export type ClubeDados = {
  id: string;
  name: string;
  short: string;
  power: number;
  divisaoInicial?: "serie-a" | "serie-b" | "serie-c" | undefined;
};

/**
 * Valor base da franquia: adequado ao investimento real da Cidadela.
 * power 88 (elite) ≈ 440 SOV, power 48 (modesto) ≈ 240 SOV.
 */
export function precoClube(clube: ClubeDados): number {
  const base = Math.round(clube.power * 5);
  // Divisão impacta: ser A exige caixa maior; série C é acessível às bases.
  const mult = clube.divisaoInicial === "serie-a" ? 1.4
    : clube.divisaoInicial === "serie-b" ? 1.1
    : 0.8;
  return Math.max(80, Math.round(base * mult));
}

/** Potência visual 1-5 estrelas (persistente, não sorteável) (§16). */
export function estrelasClube(clube: ClubeDados): number {
  const p = clube.power;
  if (p >= 80) return 5;
  if (p >= 70) return 4;
  if (p >= 60) return 3;
  if (p >= 48) return 2;
  return 1;
}

/** Rótulo narrativo de prestígio do clube (lens da torcida). */
export function prestigioClube(clube: ClubeDados): string {
  const e = estrelasClube(clube);
  if (e === 5) return "Gigante da Cidadela";
  if (e === 4) return "Forte candidato";
  if (e === 3) return "Investimento em crescimento";
  return "Projeto de base";
}

/** Aquisição: o usuário tenta comprar — valida saldo (§12/§17). */
export function podeComprar(clube: ClubeDados, saldoSov: number): boolean {
  return saldoSov >= precoClube(clube);
}
