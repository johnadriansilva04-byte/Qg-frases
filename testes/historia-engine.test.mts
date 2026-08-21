/**
 * História Principal (John Adrian) — invariantes do gatilho de entrevista.
 * §20/§39: só avança por coletiva concluída; idempotente por partidaId;
 * mensageiro muda em Helena→John Adrian; desfecho UMA vez; dica sempre vaga.
 * Engine PURO (sem alias '@/') — executável com:
 *   JITI_TSCONFIG_PATHS=true ./node_modules/.bin/jiti testes/historia-engine.test.mts
 */
import {
  processarGatilhoEntrevista,
  registrarPosicaoFinal,
  pergaminhosColetados,
  dicaInvestigacao,
  tracoDominante,
  historia,
} from "../src/components/botao/career/historia/historiaEngine";
import {
  HISTORIA_INICIAL,
  CAPITULO_DESFECHO,
  type HistoriaState,
} from "../src/components/botao/career/historia/types";
import { PERGAMINHOS, pergaminhosDoCapitulo } from "../src/components/botao/career/historia/pergaminhos";
import type { CareerState } from "../src/components/botao/career/types";
import type { DeclaracaoEntrevista } from "../src/components/botao/career/entrevistaEngine";

let ok = 0;
let falhas = 0;
function expect(cond: unknown, nome: string) {
  if (cond) {
    ok++;
    console.log("OK:", nome);
  } else {
    falhas++;
    console.error("FALHOU:", nome);
  }
}

/** Career mínimo: only fields the engine actually reads. */
function careerStub(h: Partial<HistoriaState> = {}): CareerState {
  return {
    coach: { nome: "Técnico", apelido: "Téti" } as unknown as CareerState["coach"],
    historia: { ...HISTORIA_INICIAL, ...h },
  } as CareerState;
}
const tom = (t: string): DeclaracaoEntrevista => ({ texto: `declaracao ${t}`, tom: t as DeclaracaoEntrevista["tom"] }) as DeclaracaoEntrevista;

// ─── 1. Gatilho = só coletiva concluída ────────────────────────────────────
{
  const res = processarGatilhoEntrevista(careerStub(), "p1", [tom("provocacao")]);
  expect(res.career.historia!.capitulo === 1, "1 entrevista concluída avança cap 0→1");
  expect(res.recompensaSov > 0, "recompensa SOV ao avançar capítulo");
  expect(res.conversas.length === 1, "cap avançado entrega conversa do NPC");
  expect(res.post !== undefined, "post críptico para a Rede (§26)");
  expect(res.conversas[0]!.npcId === "npc-bibliotecaria", "caps 1-3 via Helena");
  expect(res.career.historia!.entrevistasProcessadas.includes("p1"), "partida id registrada");
}

// ─── 2. Idempotência por partidaId (§ em entrevista) ───────────────────────
{
  const primeiro = processarGatilhoEntrevista(careerStub(), "p1", [tom("neutro")]);
  const repetido = processarGatilhoEntrevista(primeiro.career, "p1", [tom("neutro")]);
  expect(repetido.career.historia!.capitulo === 1, "mesma partidaId não avança 2x");
  expect(repetido.recompensaSov === 0, "mesma partidaId não repaga SOV");
  expect(repetido.conversas.length === 0, "mesma partidaId não reenvia conversa");
}

// ─── 3. Progressão cap 1→...→desfecho com troca de mensageiro ──────────────
{
  let c = careerStub();
  const mensageiros: (string | undefined)[] = [];
  for (let i = 0; i < CAPITULO_DESFECHO; i++) {
    const res = processarGatilhoEntrevista(c, `p${i + 1}`, [tom("orgulho")]);
    c = res.career;
    mensageiros.push(res.conversas[0]?.npcId);
  }
  expect(c.historia!.capitulo === CAPITULO_DESFECHO, `6 entrevistas → capítulo ${CAPITULO_DESFECHO}`);
  expect(
    mensageiros.slice(0, 3).every((m) => m === "npc-bibliotecaria"),
    "caps 1-3: Bibliotecária",
  );
  expect(
    mensageiros.slice(3).every((m) => m === "npc-john-adrian"),
    "caps 4+: John Adrian",
  );
  expect(
    c.historia!.pergaminhos.length === PERGAMINHOS.length,
    "ao fim todos os fragmentos foram entregues",
  );
  // Depois do desfecho: entrevista ainda atualiza o perfil, mas não avança.
  const pos = processarGatilhoEntrevista(c, "p7", [tom("provocacao")]);
  expect(pos.career.historia!.capitulo === CAPITULO_DESFECHO, "cap não passa do desfecho");
  expect(pos.recompensaSov === 0, "sem SOV após o desfecho");
  expect(pos.career.historia!.perfil.confronto > c.historia!.perfil.confronto, "perfil ainda acumula");
}

// ─── 4. Fragmentos por capítulo são reais e em ordem ───────────────────────
{
  expect(PERGAMINHOS.length === 8, "oito fragmentos no banco");
  const porCap = new Map<number, number>();
  for (const p of PERGAMINHOS) porCap.set(p.capitulo, (porCap.get(p.capitulo) ?? 0) + 1);
  // Cada capítulo 1..CAPITULO_DESFECHO entrega ao menos 1 fragmento.
  let completo = true;
  for (let cap = 1; cap <= CAPITULO_DESFECHO; cap++) {
    if ((pergaminhosDoCapitulo(cap).length || 0) < 1) completo = false;
  }
  expect(completo, `todos os capítulos 1..${CAPITULO_DESFECHO} têm fragmento`);

  const c = careerStub({ capitulo: 0, pergaminhos: PERGAMINHOS.map((p) => p.id) });
  const coletados = pergaminhosColetados(historia(c));
  expect(coletados.length === PERGAMINHOS.length, "pergaminhosColetados resolve todos");
  expect(
    coletados.every((p, i) => i === 0 || p.capitulo >= coletados[i - 1]!.capitulo),
    "coletados em ordem de capítulo",
  );
}

// ─── 5. Desfecho: só após cap final, UMA vez ───────────────────────────────
{
  const antes = registrarPosicaoFinal(careerStub({ capitulo: 2 }), "padrao_existe");
  expect(antes.recompensaSov === 0 && antes.conversas.length === 0, "desfecho bloqueado antes do cap final");

  let c = careerStub({ capitulo: CAPITULO_DESFECHO, pergaminhos: PERGAMINHOS.map((p) => p.id) });
  const r1 = registrarPosicaoFinal(c, "inconclusivo");
  expect(r1.recompensaSov > 0, "desfecho recompensa");
  expect(r1.career.historia!.posicaoFinal === "inconclusivo", "posição registrada");
  expect(r1.conversas[0]!.npcId === "npc-john-adrian", "o desfecho é de John Adrian");
  const r2 = registrarPosicaoFinal(r1.career, "padrao_existe");
  expect(r2.recompensaSov === 0, "não re-registra posição");
  expect(r2.career.historia!.posicaoFinal === "inconclusivo", "posição original preservada");
}

// ─── 6. Perfil de decisão varia só o TOM (§21), nunca moral ───────────────
{
  expect(tracoDominante({ curiosidade: 0, ceticismo: 5, confronto: 0, prudencia: 0 }) === "ceticismo", "traço dominante = maior");
  // Mensagem do cap 4 usa linha de perfil (string customizada por traço).
  const agressivo = processarGatilhoEntrevista(
    careerStub({ capitulo: 3, perfil: { curiosidade: 0, ceticismo: 0, confronto: 9, prudencia: 0 } }),
    "x",
    [tom("provocacao")],
  );
  expect(agressivo.conversas[0]!.mensagens[0]!.texto.includes("coragem"), "tom varia com confronto");
}

// ─── 7. Dica é SEMPRE vaga (§27) ───────────────────────────────────────────
{
  const termosProibidos = ["eugenia", "Meyer", "Tesla", "tese", "hipótese"];
  const amostras = [
    { capitulo: 0 }, { capitulo: 1 }, { capitulo: 3 }, { capitulo: 4 }, { capitulo: CAPITULO_DESFECHO },
  ];
  for (const am of amostras) {
    const dica = dicaInvestigacao({ ...HISTORIA_INICIAL, ...am } as HistoriaState);
    for (const t of termosProibidos) {
      expect(!dica.toLowerCase().includes(t.toLowerCase()), `cap ${am.capitulo}: dica não menciona "${t}"`);
    }
  }
}

console.log(`\n== ${ok} OK / ${falhas} falhas ==`);
if (falhas > 0) process.exit(1);
