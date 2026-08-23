/**
 * Ofertas de transferência de clube (§6) — jiti:
 *   JITI_TSCONFIG_PATHS=true ./node_modules/.bin/jiti testes/transferencias.test.mts
 */
import {
  gerarOfertaTransferencia,
  normalizarOfertasTransferencia,
  responderOferta,
  type ClubeElegivel,
} from "../src/components/botao/career/transferenciaEngine";

let passed = 0;
function ok(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exit(1);
  }
  passed++;
  console.log(`✅ ${msg}`);
}

const CLUBES: ClubeElegivel[] = [
  { id: "c1", nome: "Ponte do Vale", sigla: "PDV", power: 35, escudo: "🌉", divisao: "serie-c" },
  { id: "c2", nome: "Estrela do Norte", sigla: "EDN", power: 40, escudo: "⭐", divisao: "serie-c" },
  { id: "b1", nome: "Aurico Lampião", sigla: "ALP", power: 55, escudo: "🌵", divisao: "serie-b" },
  { id: "b2", nome: "Nortuno", sigla: "NOR", power: 60, escudo: "🧭", divisao: "serie-b" },
  { id: "a1", nome: "Galo Mineiro", sigla: "GAL", power: 85, escudo: "🐔", divisao: "serie-a" },
];

/* --- gatilho por DATA: só meio (r10) e fim (r19) --- */
ok(gerarOfertaTransferencia(CLUBES, 1, 5, "serie-c", 50, "u1") === null, "rodada 5: sem oferta");
ok(gerarOfertaTransferencia(CLUBES, 1, 12, "serie-c", 50, "u1") === null, "rodada 12: sem oferta");
ok(gerarOfertaTransferencia(CLUBES, 1, 10, "serie-c", 50, "u1") !== null, "rodada 10 (meio): oferta chega");
ok(gerarOfertaTransferencia(CLUBES, 1, 19, "serie-c", 50, "u1") !== null, "rodada 19 (fim): oferta chega");

/* --- meio da temporada: mesmo nível/divisão --- */
{
  const o = gerarOfertaTransferencia(CLUBES, 2, 10, "serie-c", 50, "u1")!;
  ok(o.divisaoOfertante === "serie-c", "meio da temporada: oferta da MESMA divisão");
  ok(o.respondida === "pendente", "oferta começa pendente");
  ok(o.salarioPor10 > 0 && o.proposta.length > 20, "oferta informa salário e proposta clara");
  ok(o.rodadaGatilho === 10 && o.temporada === 2, "oferta registrada por data");
  // Determinística: F5 não muda.
  const o2 = gerarOfertaTransferencia(CLUBES, 2, 10, "serie-c", 50, "u1")!;
  ok(o.id === o2.id && o.clubeId === o2.clubeId, "oferta determinística por seed (F5 não duplica)");
}

/* --- fim da temporada com prestígio alto: divisão de cima olha o treinador --- */
{
  const alta = gerarOfertaTransferencia(CLUBES, 3, 19, "serie-c", 80, "u1")!;
  ok(alta.divisaoOfertante === "serie-b", "fim + prestígio alto: clube da divisão de CIMA oferta");
  ok(alta.salarioPor10 >= 15, "salário da divisão de cima");
  const baixa = gerarOfertaTransferencia(CLUBES, 3, 19, "serie-c", 20, "u1")!;
  ok(baixa.divisaoOfertante === "serie-c", "fim + prestígio baixo: fica na mesma divisão");
}

/* --- responder: aceitar / recusar --- */
{
  const o = gerarOfertaTransferencia(CLUBES, 1, 10, "serie-c", 50, "u1")!;
  const aceita = responderOferta(o, true);
  ok(aceita.respondida === "aceita", "aceitar marca a oferta");
  const recusada = responderOferta(o, false);
  ok(recusada.respondida === "recusada", "recusar marca a oferta");
}

/* --- saneamento do JSONB --- */
{
  const n = normalizarOfertasTransferencia("lixo");
  ok(n.length === 0, "JSONB inválido → lista vazia");
  const valida = gerarOfertaTransferencia(CLUBES, 1, 10, "serie-c", 50, "u1")!;
  const n2 = normalizarOfertasTransferencia([valida, valida, { id: "quebrada" }]);
  ok(n2.length === 1, "dedup por id e descarta corrompidas");
  ok(n2[0]!.clubeNome === valida.clubeNome, "dados preservados na hidratação");
}

console.log(`\n🎉 ${passed} invariantes de transferências OK`);
