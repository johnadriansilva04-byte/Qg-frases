import {
  precoClube,
  estrelasClube,
  prestigioClube,
  podeComprar,
  type ClubeDados,
} from "../src/components/botao/career/marketplaceClubes";

let ok = true;
function expect(cond: boolean, nome: string) {
  if (!cond) { ok = false; console.log("FALHOU:", nome); }
  else console.log("OK:", nome);
}

const elite: ClubeDados = { id: "elite", name: "Elite FC", short: "ELI", power: 88, divisaoInicial: "serie-a" };
const medio: ClubeDados = { id: "medio", name: "Medio FC", short: "MED", power: 66, divisaoInicial: "serie-b" };
const base: ClubeDados = { id: "base", name: "Base FC", short: "BAS", power: 40, divisaoInicial: "serie-c" };

// 1. Determinismo: mesmo clube → mesmo preço (sem Math.random por render) (§15).
expect(precoClube(elite) === precoClube(elite), "determinista: preco elite");
expect(precoClube(base) === precoClube(base), "determinista: preco base");

// 2. Ordem: clube elite custa mais que clube base.
expect(precoClube(elite) > precoClube(base), "elite > base");
expect(precoClube(elite) > precoClube(medio) && precoComClubeOrdem(), "ordem dessas");

// 3. Estrelas mapeadas por potência.
expect(estrelasClube(elite) === 5, "elite 5 estrelas");
expect(estrelasClube(base) === 1, "base 1 estrela");

// 4. Prestigio text existe.
expect(prestigioClube(elite).length > 3 && prestigioClube(base).length > 3, "prestigio text");

// 5. Pode comprar: depende do saldo.
expect(podeComprar(base, 400), "pode comprar base com 400");
expect(podeComprar(elite, 10000), "pode comprar elite com 10000");
expect(!podeComprar(elite, 100), "não pode comprar elite com 100");

function precoComClubeOrdem(): boolean { return precoClube(medio) > precoClube(base); }

console.log(ok ? "== MARKETPLACE TESTES OK ==" : "== FALHAS ==");
if (!ok) process.exit(1);
