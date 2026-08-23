/**
 * Evolução dos botões (habilidade única, preço progressivo, impacto real) +
 * força dos clubes + ofertas iniciais — jiti:
 *   JITI_TSCONFIG_PATHS=true ./node_modules/.bin/jiti testes/evolucao-botoes.test.mts
 */
import {
  CUSTOS_EVOLUCAO,
  MAX_NIVEL_BOTAO,
  TOTAL_BOTOES_LINHA,
  bonusForcaTime,
  chaveEvolucao,
  custoInvestido,
  custoProximoNivel,
  estrelasNivel,
  evoluirBotao,
  massaExtra,
  multTiro,
  niveisIniciais,
  normalizarNiveis,
  podeEvoluir,
} from "../src/components/botao/career/evolucaoBotoes";
import {
  bonusDaTorcida,
  estruturaDoClube,
  forcaRealClube,
  porteDoClube,
} from "../src/components/botao/career/forcaClube";
import { gerarOfertasIniciais, TOTAL_OFERTAS } from "../src/components/botao/career/ofertasIniciais";

let passed = 0;
function ok(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exit(1);
  }
  passed++;
  console.log(`✅ ${msg}`);
}

/* ---------------- evolução de botões ---------------- */
ok(CUSTOS_EVOLUCAO.length === MAX_NIVEL_BOTAO, "existe um custo por nível até o máximo");
ok(
  CUSTOS_EVOLUCAO.every((c, i) => i === 0 || c > CUSTOS_EVOLUCAO[i - 1]!),
  "preço é ESTRITAMENTE progressivo (cada nível mais caro)",
);
ok(custoProximoNivel(0) === CUSTOS_EVOLUCAO[0], "nível 0 → custo do nível 1");
ok(custoProximoNivel(MAX_NIVEL_BOTAO) === null, "nível máximo → sem próximo custo");
ok(custoInvestido(3) === CUSTOS_EVOLUCAO[0]! + CUSTOS_EVOLUCAO[1]! + CUSTOS_EVOLUCAO[2]!, "custo investido soma os níveis");

ok(niveisIniciais().length === TOTAL_BOTOES_LINHA, "5 botões de linha");
ok(normalizarNiveis([99, -3, 2.7, "x"]).join() === "5,0,2,0,0", "saneamento clamp 0..5 e inválidos → 0");
ok(normalizarNiveis(null).join() === "0,0,0,0,0", "JSONB ausente → níveis zerados");

{
  const n = evoluirBotao(niveisIniciais(), 2);
  ok(n[2] === 1 && n[0] === 0, "evoluirBotao sobe só o botão alvo");
  ok(evoluirBotao([5, 5, 5, 5, 5], 0)[0] === 5, "nunca passa do nível máximo");
}
{
  const niveis = niveisIniciais();
  ok(podeEvoluir(niveis, 0, 100).ok === true, "com saldo suficiente pode evoluir");
  const semSaldo = podeEvoluir(niveis, 0, CUSTOS_EVOLUCAO[0]! - 1);
  ok(semSaldo.ok === false && semSaldo.motivo === "SOV insuficiente", "sem saldo não evolui (dívida não compra upgrade)");
  ok(podeEvoluir([5, 5, 5, 5, 5], 0, 9999).motivo === "Nível máximo", "nível máximo bloqueia");
}
ok(multTiro(0) === 1 && multTiro(5) > 1.2, "chute fica mais forte com o nível (impacto real)");
ok(massaExtra(5) > massaExtra(0), "botão evoluído fica mais pesado");
ok(bonusForcaTime([5, 5, 5, 5, 5]) === 5, "time com tudo no máximo ganha +5 de força");
ok(bonusForcaTime(niveisIniciais()) === 0, "time sem evolução não ganha bônus");
ok(estrelasNivel(0) === "☆☆☆☆☆" && estrelasNivel(3) === "★★★☆☆" && estrelasNivel(5) === "★★★★★", "estrelas visuais do nível");
ok(chaveEvolucao("u1", 0, 1) === "botao:u1:0:n1", "chave idempotente por botão+nível");

/* ---------------- força dos clubes ---------------- */
ok(porteDoClube(35) === "pequeno" && porteDoClube(60) === "medio" && porteDoClube(85) === "grande", "porte: pequeno/médio/grande bem separados");
ok(estruturaDoClube(88) === 5 && estruturaDoClube(28) === 1, "estrutura 1..5 por qualidade");
ok(bonusDaTorcida(0) === 0 && bonusDaTorcida(100_000) > 0, "torcida soma força real");
ok(forcaRealClube(85, 80_000) > forcaRealClube(30, 5_000), "clube grande com torcida > clube pequeno");
ok(forcaRealClube(30, 1_000_000) <= 40, "torcida sozinha não faz milagre (teto de influência)");

/* ---------------- ofertas iniciais ---------------- */
const CLUBES_C = [
  { id: "c1", nome: "Ponte do Vale", sigla: "PDV", cidade: "Interior", power: 30, escudo: "🌉" },
  { id: "c2", nome: "Estrela do Norte", sigla: "EDN", cidade: "Norte", power: 33, escudo: "⭐" },
  { id: "c3", nome: "Trilhante FC", sigla: "TRI", cidade: "Serra", power: 36, escudo: "⚡" },
  { id: "c4", nome: "Porto Azul", sigla: "PAZ", cidade: "Litoral", power: 40, escudo: "🌊" },
  { id: "c5", nome: "Serra Dourada", sigla: "SDO", cidade: "Altiplano", power: 44, escudo: "🏔️" },
  { id: "c6", nome: "Vila Operária", sigla: "VOP", cidade: "Vila", power: 47, escudo: "🔩" },
];
const TORCIDA = { c1: 5000, c2: 6000, c3: 7000, c4: 9000, c5: 11000, c6: 13000 };

{
  const o1 = gerarOfertasIniciais(CLUBES_C, "user-abc", TORCIDA, 50);
  ok(o1.length === TOTAL_OFERTAS, "exatamente 3 ofertas");
  ok(o1.every((o) => o.porte === "pequeno"), "SÓ clubes pequenos fazem proposta ao desconhecido");
  ok(o1.every((o) => o.bonusAssinatura >= 5 && o.bonusAssinatura <= 20), "bônus de assinatura modesto (orçamento pequeno)");
  ok(o1.every((o) => o.torcida > 0), "oferta mostra a torcida do clube");
  ok(o1.every((o) => o.discurso.length > 10), "oferta tem discurso da diretoria");
  ok(new Set(o1.map((o) => o.clubeId)).size === TOTAL_OFERTAS, "ofertas não repetem clube");

  const o2 = gerarOfertasIniciais(CLUBES_C, "user-abc", TORCIDA, 50);
  ok(o1.map((o) => o.clubeId).join() === o2.map((o) => o.clubeId).join(), "ofertas determinísticas por seed (F5 não muda)");
  const o3 = gerarOfertasIniciais(CLUBES_C, "user-xyz", TORCIDA, 50);
  ok(o3.length === TOTAL_OFERTAS, "outro usuário também recebe 3 ofertas");

  const ofertados = new Set(o1.map((o) => o.clubeId));
  ok(o1.every((o) => o.power <= 44), "só os clubes mais fracos entram na janela de ofertas");
  ok(!ofertados.has("c6"), "o clube 'mais forte' da divisão pode ficar de fora das ofertas");
}

console.log(`\n🎉 ${passed} invariantes de evolução/força/ofertas OK`);
