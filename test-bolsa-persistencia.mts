/**
 * Teste de persistência da Bolsa de Valores (bug reportado: comprar cotas →
 * F5 → cotas somem). Prova o ciclo completo SEM Supabase:
 *
 *   compra (engine) → JSONB serializado → leitura pós-F5 (normalizarCareer)
 *   → cotas/saldo EXATAMENTE iguais.
 *
 * Também cobre venda, custo médio, dividendos idempotentes e saneamento de
 * registros antigos/corrompidos (garantirBolsa).
 *
 * Rodar: JITI_TSCONFIG_PATHS=true ./node_modules/.bin/jiti test-bolsa-persistencia.mts
 */
import {
  comprarAtivo,
  venderAtivo,
  garantirBolsa,
  custoCompra,
  pagarDividendos,
  patrimonioJogador,
  valorCarteira,
  ATIVOS,
} from "./src/components/botao/career/bolsaEngine";
import { normalizarCareer, EMPTY_CAREER } from "./src/components/botao/career/careerStorage";
import type { BolsaState, CareerState } from "./src/components/botao/career/types";

let ok = 0;
let falhas = 0;
function expect(cond: boolean, nome: string) {
  if (cond) {
    ok++;
    console.log("OK:", nome);
  } else {
    falhas++;
    console.log("FALHOU:", nome);
  }
}

function careerBase(): CareerState {
  return {
    ...EMPTY_CAREER,
    coach: { ...EMPTY_CAREER.coach, nome: "Auditor", sov: 1000 },
    // Forma pós-separação CLUBE×TREINADOR: sem clubeCaixa o normalizador
    // migra o coach.sov para o caixa do clube (comportamento legado correto,
    // mas não é o que este teste mede).
    clubeCaixa: 0,
    clubeExtrato: [],
  };
}

// --- Ciclo F5: compra → serializa (JSONB) → normaliza (hidratação) ---------
{
  const career = careerBase();
  const bolsa0 = garantirBolsa(career.bolsa);
  const custo = custoCompra(bolsa0, "clube", 5);
  expect(custo === 500, `custo de 5 cotas do clube = 500 (veio ${custo})`);

  // handleComprarAtivo: débito local + engine + persistCareer (JSONB)
  const comprada = comprarAtivo(bolsa0, "clube", 5, 0, 1);
  const posCompra = comprada.carteira.find((p) => p.ativoId === "clube");
  expect(posCompra?.quantidade === 5, "compra registra 5 cotas na carteira");
  expect(posCompra?.custoMedio === 100, "custo médio = preço de compra");

  const careerPersistida: CareerState = {
    ...career,
    coach: { ...career.coach, sov: career.coach.sov - custo },
    bolsa: comprada,
  };

  // === F5 ===: o JSONB vai e volta como texto; a hidratação normaliza.
  const jsonb = JSON.parse(JSON.stringify({ career: careerPersistida }));
  const hidratada = normalizarCareer(jsonb.career);

  const posHidratada = hidratada.bolsa?.carteira.find((p) => p.ativoId === "clube");
  expect(posHidratada?.quantidade === 5, "F5: as 5 cotas CONTINUAM na carteira");
  expect(posHidratada?.custoMedio === 100, "F5: custo médio preservado");
  expect(hidratada.coach.sov === 500, "F5: saldo local permanece 500 (1000 - 500)");
  expect(
    hidratada.bolsa?.transacoes.some((t) => t.tipo === "compra" && t.quantidade === 5) === true,
    "F5: transação de compra preservada no histórico",
  );
}

// --- Compra adicional faz custo médio ponderado e SOMA as cotas ------------
{
  let bolsa = garantirBolsa(undefined);
  bolsa = comprarAtivo(bolsa, "ciencia", 2, 0, 1); // 2 × 60
  // preço mudou (simula rodada): compra mais 2 a 80
  bolsa = { ...bolsa, precos: { ...bolsa.precos, ciencia: 80 } };
  bolsa = comprarAtivo(bolsa, "ciencia", 2, 1, 1);
  const pos = bolsa.carteira.find((p) => p.ativoId === "ciencia");
  expect(pos?.quantidade === 4, "cotas somam (2 + 2 = 4)");
  expect(pos?.custoMedio === 70, `custo médio ponderado = 70 (veio ${pos?.custoMedio})`);
}

// --- Venda parcial e total ---------------------------------------------------
{
  let bolsa = garantirBolsa(undefined);
  bolsa = comprarAtivo(bolsa, "trilha", 4, 0, 1);
  bolsa = venderAtivo(bolsa, "trilha", 1, 0, 1);
  expect(
    bolsa.carteira.find((p) => p.ativoId === "trilha")?.quantidade === 3,
    "venda parcial deixa 3 cotas",
  );
  bolsa = venderAtivo(bolsa, "trilha", 3, 0, 1);
  expect(
    bolsa.carteira.find((p) => p.ativoId === "trilha") === undefined,
    "venda total remove a posição",
  );
  // Venda acima do saldo é recusada (estado inalterado)
  const antes = comprarAtivo(garantirBolsa(undefined), "clube", 1, 0, 1);
  const depois = venderAtivo(antes, "clube", 99, 0, 1);
  expect(depois.carteira.length === 1, "venda acima da posição é recusada");
}

// --- Dividendos: idempotente por rodada (F5 não paga 2x) --------------------
{
  let bolsa = garantirBolsa(undefined);
  bolsa = comprarAtivo(bolsa, "biblioteca", 10, 3, 1);
  const r3a = pagarDividendos(bolsa, 3, 1);
  expect(r3a.total > 0, `dividendos pagos na rodada 3 (total ${r3a.total})`);
  const r3b = pagarDividendos(r3a.bolsa, 3, 1);
  expect(r3b.total === 0, "mesma rodada NÃO paga de novo (idempotente)");
  const r4 = pagarDividendos(r3a.bolsa, 4, 1);
  expect(r4.total === 0, "rodada fora do ciclo (não múltipla de 3) não paga");
}

// --- Saneamento: JSONB antigo/corrompido nunca perde o que é válido ---------
{
  const corrompida = garantirBolsa({
    precos: { clube: -5, ciencia: Number.NaN } as never,
    carteira: [{ ativoId: "clube", quantidade: 7, custoMedio: 100 }],
    transacoes: "lixo" as never,
    ultimaRodadaBolsa: Number.NaN,
    patrimonioCidadela: Number.NaN,
  } as unknown as BolsaState);
  expect(corrompida.precos.clube > 0, "preço negativo saneado para o base");
  expect(Number.isFinite(corrompida.precos.ciencia), "preço NaN saneado");
  expect(corrompida.carteira[0]?.quantidade === 7, "carteira válida NÃO é descartada");
  expect(Array.isArray(corrompida.transacoes), "transações inválidas viram array");
  expect(corrompida.ultimaRodadaBolsa === -1, "ultimaRodadaBolsa NaN → -1");

  const semBolsa = normalizarCareer({ coach: { nome: "X" } } as never);
  expect(semBolsa.bolsa === undefined, "career antiga sem bolsa não quebra a hidratação");
  const garantida = garantirBolsa(semBolsa.bolsa);
  expect(garantida.carteira.length === 0, "bolsa nova nasce zerada (sem cotas fantasmas)");
}

// --- Patrimônio: carteira + investido, consistente antes/depois do F5 -------
{
  const career = careerBase();
  let bolsa = garantirBolsa(undefined);
  bolsa = comprarAtivo(bolsa, "clube", 5, 0, 1);
  const comBolsa: CareerState = {
    ...career,
    coach: { ...career.coach, sov: 500 },
    bolsa,
  };
  const antes = patrimonioJogador(comBolsa);
  expect(antes.sobCarteira === 500 && antes.investido === 500 && antes.total === 1000,
    `patrimônio = 500 + 500 (veio ${antes.sobCarteira}+${antes.investido})`);

  const hidratada = normalizarCareer(JSON.parse(JSON.stringify(comBolsa)));
  const depois = patrimonioJogador(hidratada);
  expect(depois.total === antes.total, "F5: patrimônio total idêntico");
  expect(valorCarteira(garantirBolsa(hidratada.bolsa)) === 500, "F5: valor investido idêntico");
}

// --- Todos os ativos têm preço base positivo (nunca divisão por zero) -------
for (const a of ATIVOS) {
  expect(a.precoBase > 0 && a.dividendYield > 0, `ativo ${a.ativoId} íntegro`);
}

console.log(`\n==== RESULTADO: ${ok} passaram, ${falhas} falharam ====`);
if (falhas > 0) process.exit(1);
