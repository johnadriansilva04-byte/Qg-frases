/**
 * Testes runtime (jiti) do motor central de conversas do celular.
 * Regras sob teste: uma conversa por contato, mensagens dentro da conversa,
 * dedupe por id, idempotência, limites de crescimento, normalização legada.
 */
import {
  anexarConversa,
  chaveConversa,
  idConversaEstavel,
  normalizarConversas,
  MAX_CONVERSAS,
  MAX_MENSAGENS_POR_CONVERSA,
} from "./src/components/botao/career/conversasEngine";
import { garantirContatosRpg, processarEventosRpg } from "./src/components/botao/career/rpg/rpgEngine";
import { convidarRitualTrilha } from "./src/components/botao/career/trilhaIntegracao";
import { normalizarCareer, EMPTY_CAREER } from "./src/components/botao/career/careerStorage";
import type { CareerState, ConversaCelular } from "./src/components/botao/career/types";

let passou = 0;
let falhou = 0;
function ok(cond: boolean, nome: string) {
  if (cond) {
    passou++;
    console.log(`  ✓ ${nome}`);
  } else {
    falhou++;
    console.error(`  ✗ ${nome}`);
  }
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

function conv(n: Partial<ConversaCelular> & { id: string }): ConversaCelular {
  return {
    tipo: "narrativa",
    nome: "Contato",
    avatar: "🙂",
    cargo: "Cargo",
    mensagens: [],
    naoLida: true,
    ...n,
  };
}
function msg(id: string, texto = "oi"): ConversaCelular["mensagens"][number] {
  return { id, texto, remetente: "outro", timestamp: "10:00" };
}

console.log("\n== anexarConversa ==");
{
  let c = careerBase();
  // 1. Cria conversa nova com id estável por NPC.
  c = anexarConversa(c, conv({ id: "x", npcId: "npc-pracinha", mensagens: [msg("m1")] }));
  ok(c.conversas.length === 1, "cria a primeira conversa");
  ok(c.conversas[0]!.id === "conv-npc-npc-pracinha", "id estável conv-npc-*");

  // 2. Segunda mensagem do MESMO NPC entra na mesma conversa.
  c = anexarConversa(c, conv({ id: "y", npcId: "npc-pracinha", mensagens: [msg("m2")] }));
  ok(c.conversas.length === 1, "mesmo NPC NÃO cria outra conversa");
  ok(c.conversas[0]!.mensagens.map((m) => m.id).join(",") === "m1,m2", "mensagens acumulam na conversa");

  // 3. Dedupe por id de mensagem (retry/reentrega não duplica).
  c = anexarConversa(c, conv({ id: "z", npcId: "npc-pracinha", mensagens: [msg("m2"), msg("m3")] }));
  ok(c.conversas[0]!.mensagens.length === 3, "dedupe por id de mensagem");

  // 4. Outro NPC vira outra conversa, no topo.
  c = anexarConversa(c, conv({ id: "v", npcId: "npc-valeria", mensagens: [msg("v1")] }));
  ok(c.conversas.length === 2 && c.conversas[0]!.npcId === "npc-valeria", "outro NPC no topo");

  // 5. Mensagem nova do Pracinha traz a conversa dele ao topo.
  c = anexarConversa(c, conv({ id: "w", npcId: "npc-pracinha", mensagens: [msg("m4")] }));
  ok(c.conversas[0]!.npcId === "npc-pracinha", "conversa mesclada sobe ao topo");

  // 6. Canal estável (medico) mescla sem npcId.
  c = anexarConversa(c, conv({ id: "a", canal: "medico", nome: "Dr. Maurício", mensagens: [msg("d1")] }));
  c = anexarConversa(c, conv({ id: "b", canal: "medico", nome: "Dr. Maurício", mensagens: [msg("d2")] }));
  const med = c.conversas.filter((x) => x.canal === "medico");
  ok(med.length === 1 && med[0]!.mensagens.length === 2, "canal medico = uma conversa");
  ok(med[0]!.id === "conv-canal-medico", "id estável conv-canal-*");

  // 7. naoLida: entrega lida não marca; entrega não lida marca.
  let c2 = anexarConversa(careerBase(), conv({ id: "k", canal: "redes", mensagens: [msg("r1")], naoLida: false }));
  ok(c2.conversas[0]!.naoLida === false, "entrega lida não marca conversa");
  c2 = anexarConversa(c2, conv({ id: "k2", canal: "redes", mensagens: [msg("r2")], naoLida: true }));
  ok(c2.conversas[0]!.naoLida === true, "entrega não lida marca conversa");

  // 8. Dilema pendente protegido: novo dilema de outro evento não sobrescreve.
  let c3 = anexarConversa(
    careerBase(),
    conv({
      id: "conv-npc-npc-dario",
      npcId: "npc-dario",
      mensagens: [msg("e1")],
      eventoRpg: { eventoId: "proposta-dario", respondido: false, tom: "drama" },
    }),
  );
  c3 = anexarConversa(c3, {
    ...conv({
      id: "conv-npc-npc-dario",
      npcId: "npc-dario",
      mensagens: [msg("e2")],
      eventoRpg: { eventoId: "divida-corretor", respondido: false, tom: "suspense" },
    }),
  });
  ok(c3.conversas.length === 2, "dilema pendente não é sobrescrito (entrada separada)");

  // 9. Limite de conversas.
  let c4 = careerBase();
  for (let i = 0; i < MAX_CONVERSAS + 5; i++) {
    c4 = anexarConversa(c4, conv({ id: `solo-${i}`, nome: `Solo ${i}`, mensagens: [msg(`s${i}`)] }));
  }
  ok(c4.conversas.length === MAX_CONVERSAS, `cap de ${MAX_CONVERSAS} conversas`);

  // 10. Limite de mensagens por conversa.
  let c5 = careerBase();
  for (let i = 0; i < MAX_MENSAGENS_POR_CONVERSA + 10; i++) {
    c5 = anexarConversa(c5, conv({ id: "p", npcId: "npc-pracinha", mensagens: [msg(`pm${i}`)] }));
  }
  ok(
    c5.conversas[0]!.mensagens.length === MAX_MENSAGENS_POR_CONVERSA,
    `cap de ${MAX_MENSAGENS_POR_CONVERSA} mensagens por conversa`,
  );
}

console.log("\n== normalizarConversas (legado do banco) ==");
{
  // Simula JSONB legado corrompido: 3 conversas do Pracinha (uma por evento),
  // 2 da "Torcida (Redes Sociais)" sem npcId/canal, mensagens duplicadas.
  const legado = [
    conv({ id: "ritual-trilha-1-r5", npcId: "npc-pracinha", nome: "Pracinha", mensagens: [msg("rit-5")], naoLida: true }),
    conv({ id: "npc-pracinha-999-0", npcId: "npc-pracinha", nome: "Pracinha", mensagens: [msg("ini"), msg("dup")] }),
    conv({ id: "ia-redes-1-0", nome: "Torcida (Redes Sociais)", mensagens: [msg("red1")] }),
    conv({ id: "ia-redes-2-0", nome: "Torcida (Redes Sociais)", mensagens: [msg("red2"), msg("red1")] }),
    conv({ id: "ritual-trilha-1-r3", npcId: "npc-pracinha", nome: "Pracinha", mensagens: [msg("rit-3"), msg("dup")] }),
  ];
  const n = normalizarConversas(legado);
  ok(n.length === 2, `duplicatas fundidas (5 → ${n.length})`);
  const prac = n.find((c) => c.npcId === "npc-pracinha")!;
  ok(prac.id === "conv-npc-npc-pracinha", "conversa fundida ganha id estável");
  ok(prac.mensagens.map((m) => m.id).join(",") === "rit-3,dup,ini,rit-5", "mensagens em ordem cronológica sem dup");
  ok(prac.naoLida === true, "naoLida preservada se qualquer cópia não lida");
  const red = n.find((c) => c.nome === "Torcida (Redes Sociais)")!;
  // Cópia mais antiga (ia-redes-2-0, mais abaixo na lista newest-first) entra
  // primeiro; a duplicata "red1" da outra cópia é removida pelo dedupe.
  ok(red.mensagens.map((m) => m.id).join(",") === "red2,red1", "fallback por nome funde e dedup");
  ok(normalizarConversas(null).length === 0 && normalizarConversas("lixo").length === 0, "entrada inválida → []");
}

console.log("\n== garantirContatosRpg (idempotente por contato) ==");
{
  let c = garantirContatosRpg(careerBase());
  ok(c.conversas.length === 4, "4 contatos-base criados");
  const ids1 = c.conversas.map((x) => x.id).sort().join(",");
  c = garantirContatosRpg(c);
  ok(c.conversas.length === 4, "segunda execução NÃO duplica");
  ok(c.conversas.map((x) => x.id).sort().join(",") === ids1, "ids estáveis entre execuções");

  // Cenário real do bug: só o Pracinha existe (convite do ritual chegou antes)
  // → os outros 3 contatos ainda precisam nascer, e o Pracinha não duplica.
  let c2 = careerBase({
    conversas: [conv({ id: "conv-npc-npc-pracinha", npcId: "npc-pracinha", nome: "Pracinha", mensagens: [msg("rit-1")] })],
  });
  c2 = garantirContatosRpg(c2);
  ok(c2.conversas.length === 4, "contatos faltantes são criados mesmo com 1 NPC existente");
  ok(c2.conversas.filter((x) => x.npcId === "npc-pracinha").length === 1, "Pracinha não duplica");
}

console.log("\n== convidarRitualTrilha (uma conversa do Pracinha) ==");
{
  const sombria = careerBase({ rodadaAtual: 5 });
  sombria.coach = { ...sombria.coach, sov: 10 }; // condição sombria: sov < 30
  let c = garantirContatosRpg(sombria);
  c = convidarRitualTrilha(c);
  const prac1 = c.conversas.find((x) => x.npcId === "npc-pracinha")!;
  ok(c.conversas.filter((x) => x.npcId === "npc-pracinha").length === 1, "convite entra na conversa do Pracinha");
  ok(prac1.mensagens.some((m) => m.id === "ritual-m-ritual-trilha-1-r5"), "mensagem do convite presente");
  c = convidarRitualTrilha(c);
  const prac2 = c.conversas.find((x) => x.npcId === "npc-pracinha")!;
  ok(prac2.mensagens.filter((m) => m.id.startsWith("ritual-m-")).length === 1, "idempotente por rodada (F5 não duplica)");
  // Rodada seguinte: novo convite vira NOVA MENSAGEM na MESMA conversa.
  c = convidarRitualTrilha({ ...c, rodadaAtual: 6 });
  const prac3 = c.conversas.find((x) => x.npcId === "npc-pracinha")!;
  ok(c.conversas.filter((x) => x.npcId === "npc-pracinha").length === 1, "nova rodada: mesma conversa");
  ok(prac3.mensagens.filter((m) => m.id.startsWith("ritual-m-")).length === 2, "nova rodada: nova mensagem");
  // Sem sombra: nenhum convite (sem spam).
  const rica = garantirContatosRpg(careerBase({ rodadaAtual: 7 }));
  const semConvite = convidarRitualTrilha(rica);
  ok(
    semConvite.conversas.find((x) => x.npcId === "npc-pracinha")!.mensagens.every((m) => !m.id.startsWith("ritual-m-")),
    "sem condição sombria → sem mensagem (nada de spam)",
  );
}

console.log("\n== processarEventosRpg (evento entra na conversa do NPC) ==");
{
  const c = garantirContatosRpg(careerBase({ rodadaAtual: 10 }));
  const sombria: CareerState = { ...c, coach: { ...c.coach, sov: 10 } }; // gatilho divida-corretor (sov<30)
  const r = processarEventosRpg(sombria);
  ok(r !== null, "gatilho disparou com sov<30 e rodada 10");
  if (r) {
    const total = r.conversas.length;
    ok(total === c.conversas.length || total === c.conversas.length + 1, "evento NÃO explode a lista de conversas");
    const comDilema = r.conversas.filter((x) => x.eventoRpg && !x.eventoRpg.respondido);
    ok(comDilema.length === 1, "exatamente 1 dilema pendente");
    // Reprocessar o MESMO evento (simula reentrega) não duplica mensagem:
    const eventoId = comDilema[0]!.eventoRpg!.eventoId;
    const r2 = processarEventosRpg({ ...sombria }); // mem sem o evento visto → mesmo evento
    if (r2) {
      const merged = normalizarConversas([...r.conversas, ...r2.conversas]);
      const convs = merged.filter((x) => x.mensagens.some((m) => m.id === `rpg-m-${eventoId}`));
      ok(convs.length === 1 && convs[0]!.mensagens.filter((m) => m.id === `rpg-m-${eventoId}`).length === 1, "reentrega do mesmo evento deduplica por id");
    }
    // eventosVistos impede novo disparo imediato (idempotência de negócio):
    const r3 = processarEventosRpg(r);
    ok(r3 === null || !r3.conversas.some((x) => x.eventoRpg?.eventoId === eventoId && !x.eventoRpg.respondido && x.mensagens.length > comDilema[0]!.mensagens.length), "evento visto não dispara de novo");
  }
}

console.log("\n== normalizarCareer (hidratação saneia o celular) ==");
{
  const bruta = {
    ...careerBase(),
    conversas: [
      conv({ id: "ia-med-1", nome: "Dr. Maurício", mensagens: [msg("a")] }),
      conv({ id: "ia-med-2", nome: "Dr. Maurício", mensagens: [msg("b")] }),
      conv({ id: "ia-med-3", nome: "Dr. Maurício", mensagens: [msg("c")] }),
    ],
  };
  const n = normalizarCareer(bruta as unknown as Partial<CareerState>);
  ok(n.conversas.length === 1, "JSONB com 3 médicos vira 1 conversa");
  ok(n.conversas[0]!.mensagens.length === 3, "mensagens preservadas na fusão");
}

console.log(`\n==== RESULTADO: ${passou} passaram, ${falhou} falharam ====`);
if (falhou > 0) process.exit(1);
