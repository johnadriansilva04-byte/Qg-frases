/**
 * Testes runtime (jiti): entregas da história principal e das entrevistas
 * passam pela fila (anexarConversa) e entram na conversa ÚNICA do NPC.
 */
import { anexarConversa } from "./src/components/botao/career/conversasEngine";
import { processarGatilhoEntrevista } from "./src/components/botao/career/historia/historiaEngine";
import { consequenciasEntrevista, registrarEntrevista } from "./src/components/botao/career/entrevistaEngine";
import { garantirContatosRpg } from "./src/components/botao/career/rpg/rpgEngine";
import { EMPTY_CAREER } from "./src/components/botao/career/careerStorage";
import type { CareerState, DeclaracaoEntrevista } from "./src/components/botao/career/types";

let passou = 0, falhou = 0;
function ok(cond: boolean, nome: string) {
  if (cond) { passou++; console.log(`  ✓ ${nome}`); }
  else { falhou++; console.error(`  ✗ ${nome}`); }
}

function careerBase(patch: Partial<CareerState> = {}): CareerState {
  return {
    ...EMPTY_CAREER,
    coach: { ...EMPTY_CAREER.coach, nome: "Técnico Teste", apelido: "TT", sov: 100 },
    rodadaAtual: 5,
    conversas: [],
    ...patch,
  };
}

const declaracaoProvocativa: DeclaracaoEntrevista = {
  texto: "O Bragança que se prepare, aqui quem manda sou eu.",
  interpretacao: "Provocação direta",
  tom: "provocacao",
  importancia: "alta",
};

console.log("\n== história principal: capítulos na MESMA conversa do NPC ==");
{
  let c = garantirContatosRpg(careerBase());
  // Duas entrevistas (duas partidas) → dois capítulos → mesma Helena.
  const g1 = processarGatilhoEntrevista(c, "partida-1", [declaracaoProvocativa]);
  ok(g1.conversas.length >= 1 && g1.recompensaSov > 0, "capítulo 1 entregue");
  for (const entrega of g1.conversas) c = anexarConversa(entrega === g1.conversas[0] ? g1.career : c, entrega);
  c = g1.career;
  for (const entrega of g1.conversas) c = anexarConversa(c, entrega);

  const g2 = processarGatilhoEntrevista(c, "partida-2", [declaracaoProvocativa]);
  ok(g2.conversas.length >= 1, "capítulo 2 entregue");
  c = g2.career;
  for (const entrega of g2.conversas) c = anexarConversa(c, entrega);

  const helenas = c.conversas.filter((x) => x.npcId === "npc-bibliotecaria");
  ok(helenas.length === 1, "Helena = UMA conversa após 2 capítulos");
  ok(helenas[0]!.mensagens.length === 2, "2 capítulos = 2 mensagens na conversa");

  // Idempotência: mesma partida não avança capítulo nem reentrega mensagem.
  const g1b = processarGatilhoEntrevista(c, "partida-1", [declaracaoProvocativa]);
  ok(g1b.conversas.length === 0 && g1b.recompensaSov === 0, "mesma partidaId não reentrega (idempotente)");
}

console.log("\n== consequências da entrevista: reação na conversa do NPC ==");
{
  let c = garantirContatosRpg(careerBase());
  const reg = {
    id: "ent-p1",
    partidaId: "p1",
    competicao: "Brasileirão",
    adversario: "Rival FC",
    placar: "2x0",
    rodada: 5,
    temporada: 1,
    declaracoes: [declaracaoProvocativa],
    recompensa: 30,
  };
  c = registrarEntrevista(c, reg);
  const res = consequenciasEntrevista(c, {
    placarUser: 2, placarAdv: 0, timeUserNome: "Meu Time", timeAdvNome: "Rival FC",
    competicao: "Brasileirão", rodada: "Rodada 5",
  });
  c = res.career;
  ok(
    res.reacoes.some((r) => r.npcId === "npc-braganca") &&
      res.reacoes.some((r) => r.npcId === "npc-dirigente"),
    "provocação → reação do Bragança + dirigente",
  );
  for (const entrega of res.reacoes) c = anexarConversa(c, entrega);
  const brag = c.conversas.filter((x) => x.npcId === "npc-braganca");
  ok(brag.length === 1, "Bragança = UMA conversa");

  // Segunda coletiva provocativa (outra partida) → mesma conversa, +1 mensagem.
  c = registrarEntrevista(c, { ...reg, id: "ent-p2", partidaId: "p2" });
  const res2 = consequenciasEntrevista(c, {
    placarUser: 1, placarAdv: 0, timeUserNome: "Meu Time", timeAdvNome: "Rival FC",
    competicao: "Brasileirão", rodada: "Rodada 6",
  });
  c = res2.career;
  for (const entrega of res2.reacoes) c = anexarConversa(c, entrega);
  const brag2 = c.conversas.filter((x) => x.npcId === "npc-braganca");
  ok(brag2.length === 1 && brag2[0]!.mensagens.length === 2, "2ª provocação = nova mensagem na mesma conversa");

  // registrarEntrevista idempotente: mesma partida não duplica registro nem SOV.
  const antes = c.entrevistas!.length;
  const cDup = registrarEntrevista(c, reg);
  ok(cDup.entrevistas!.length === antes, "registrarEntrevista idempotente por partidaId");
}

console.log(`\n==== RESULTADO: ${passou} passaram, ${falhou} falharam ====`);
if (falhou > 0) process.exit(1);
