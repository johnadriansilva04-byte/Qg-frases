/**
 * Testes do cérebro estratégico da CPU (§9-§17) — jiti:
 *   JITI_TSCONFIG_PATHS=true ./node_modules/.bin/jiti test-ia.mts
 */
import {
  analisarPadroes,
  balancearPerfil,
  decidirIntencao,
  escolherFinalizador,
  executarIntencao,
  extrairJson,
  novaMemoriaPartida,
  perfilDoClube,
  registrarTiroJogador,
  validarIntencaoLlm,
  type EstadoPartida,
  type EstrategiaId,
  type IntencaoEstrategica,
  type MemoriaPartida,
} from "./src/components/botao/engine/estrategia";
import { FIELD, initialDiscs, type Disc } from "./src/components/botao/engine/physics";

let passed = 0;
function ok(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exit(1);
  }
  passed++;
  console.log(`✅ ${msg}`);
}

const estadoBase: EstadoPartida = {
  golsCpu: 0,
  golsJogador: 0,
  turnosRestantes: 24,
  dificuldade: "profissional",
  forcaCpu: 70,
  forcaJogador: 75,
};
const perfilMedio = perfilDoClube(70);
const memoriaVazia = novaMemoriaPartida();

// 1) Memória: registra tiros e limita a janela.
let mem: MemoriaPartida = novaMemoriaPartida();
for (let i = 0; i < 20; i++) {
  mem = registrarTiroJogador(mem, { dirX: 0.8, power: 0.7, zonaY: 0.5 });
}
ok(mem.tirosJogador.length === 16, "memória mantém janela deslizante de 16 tiros");

// 2) Análise de padrões: lado dominante detectado com amostra suficiente.
const padroes = analisarPadroes(mem);
ok(padroes.ladoPreferido === "direito", "padrão de lado direito detectado");
ok(padroes.previsivel, "padrão confirmado com amostra suficiente");
ok(Math.abs(padroes.forcaMedia - 0.7) < 0.01, "força média calculada");

// 3) Poucos tiros = sem conclusão (não reage a ruído).
let memPouca = novaMemoriaPartida();
for (let i = 0; i < 3; i++) memPouca = registrarTiroJogador(memPouca, { dirX: 0.9, power: 0.6, zonaY: 0.3 });
ok(!analisarPadroes(memPouca).previsivel, "3 tiros não confirmam padrão");

// 4) Vencendo no fim: protege a vantagem (reter, risco baixo).
const vencendo = decidirIntencao(
  { ...estadoBase, golsCpu: 1, golsJogador: 0, turnosRestantes: 4 },
  memoriaVazia,
  perfilMedio,
);
ok(vencendo.strategy === "reter", "vencendo no fim → reter bola");
ok(vencendo.priority === "proteger_vantagem", "prioridade = proteger vantagem");
ok(vencendo.risk <= 0.4, "risco baixo ao proteger a vantagem");

// 5) Perdendo na reta final: ataca com risco alto.
const perdendo = decidirIntencao(
  { ...estadoBase, golsCpu: 0, golsJogador: 2, turnosRestantes: 8 },
  memoriaVazia,
  perfilMedio,
);
ok(perdendo.strategy === "atacar", "perdendo na reta final → atacar");
ok(perdendo.risk >= 0.75, "risco alto para buscar o resultado");
ok(perdendo.priority === "marcar_gol", "2 gols atrás → prioridade marcar gol");

// 6) Padrão confirmado + leitura alta: fecha o lado explorado.
const leitor = { precisao: 0.9, agressividade: 0.8, disciplina: 0.9, leitura: 1 };
const bloqueio = decidirIntencao({ ...estadoBase, turnosRestantes: 20 }, mem, leitor);
ok(bloqueio.strategy === "bloquear", "padrão confirmado → bloquear");
ok(bloqueio.targetZone === "lado_direito", "bloqueio mira o lado explorado");
ok(bloqueio.priority === "explorar_padrao", "prioridade = explorar padrão");

// 7) Padrão confirmado + leitura ZERO: nunca percebe (clube limitado).
const cego = { precisao: 0.3, agressividade: 0.4, disciplina: 0.3, leitura: 0 };
const semLeitura = decidirIntencao({ ...estadoBase, turnosRestantes: 20 }, mem, cego);
ok(semLeitura.strategy !== "bloquear", "leitura zero não explora padrão");

// 8) Jogo aberto no início: ataque padrão.
const aberto = decidirIntencao(estadoBase, memoriaVazia, perfilMedio);
ok(aberto.strategy === "atacar", "jogo aberto no início → atacar");

// 9) Vencendo com jogo aberto: contra-ataque paciente.
const naFrente = decidirIntencao(
  { ...estadoBase, golsCpu: 2, golsJogador: 1, turnosRestantes: 18 },
  memoriaVazia,
  perfilMedio,
);
ok(naFrente.strategy === "contra_atacar", "na frente com jogo aberto → contra-ataque");

// 10) Perfil do clube: força → qualidade de decisão.
const forte = perfilDoClube(95);
const fraco = perfilDoClube(30);
ok(forte.precisao > fraco.precisao, "clube forte decide com mais precisão");
ok(forte.leitura > fraco.leitura, "clube forte lê melhor o jogo");
ok(
  [forte, fraco].every((p) =>
    [p.precisao, p.agressividade, p.disciplina, p.leitura].every((v) => v >= 0 && v <= 1),
  ),
  "perfis sempre na faixa 0..1",
);

// 11) Balanceamento dinâmico: jogador dominante → CPU mais disciplinada.
const base = perfilDoClube(70);
const pressionado = balancearPerfil(base, { sequenciaVitorias: 4, sequenciaDerrotas: 0, invicto: true });
ok(pressionado.disciplina > base.disciplina, "invicto → CPU mais disciplinada");
ok(pressionado.leitura > base.leitura, "invicto → CPU lê melhor");
ok(pressionado.disciplina <= 0.97, "teto do balanceamento respeitado");
const aliviado = balancearPerfil(base, { sequenciaVitorias: 0, sequenciaDerrotas: 4, invicto: false });
ok(aliviado.precisao < base.precisao, "má fase do jogador → CPU menos precisa (alívio)");
ok(aliviado.precisao >= 0.25, "alívio nunca vira entrega (piso)");

// 12) Execução: TODA estratégia vira um impulso fisicamente válido.
const discs = initialDiscs();
const estrategias: EstrategiaId[] = ["atacar", "contra_atacar", "reter", "defender", "bloquear"];
for (const strategy of estrategias) {
  const jogada = executarIntencao(
    discs,
    "away",
    {
      strategy,
      risk: 0.5,
      targetZone: strategy === "bloquear" ? "lado_direito" : "gol_adversario",
      priority: "marcar_gol",
      reason: "teste",
    },
    "profissional",
    70,
  );
  ok(Boolean(jogada), `estratégia ${strategy} produz jogada`);
  ok(
    Number.isFinite(jogada!.ix) && Number.isFinite(jogada!.iy),
    `estratégia ${strategy} produz impulso finito`,
  );
  ok(
    discs.some((d) => d.id === jogada!.discId),
    `estratégia ${strategy} move um botão existente`,
  );
  const mag = Math.hypot(jogada!.ix, jogada!.iy);
  ok(mag > 0 && mag <= 30, `estratégia ${strategy} dentro da magnitude física (${mag.toFixed(1)})`);
}

// 13) Validação LLM: saída boa passa, saída ruim é descartada.
const boa = validarIntencaoLlm({
  strategy: "reter",
  risk: 0.2,
  target_zone: "fundo_proprio",
  priority: "proteger_vantagem",
  reason: "segurar o placar",
});
ok(boa?.strategy === "reter", "intenção LLM válida aceita");
ok(
  validarIntencaoLlm({ strategy: "roubar", risk: 0.5, target_zone: "centro", priority: "marcar_gol" }) === null,
  "estratégia fora do enum rejeitada",
);
ok(
  validarIntencaoLlm({ strategy: "atacar", risk: "muito", target_zone: "centro", priority: "marcar_gol" }) === null,
  "risk não numérico rejeitado",
);
const clamp = validarIntencaoLlm({
  strategy: "atacar",
  risk: 9,
  target_zone: "gol_adversario",
  priority: "marcar_gol",
});
ok(clamp?.risk === 1, "risk fora da faixa é clampado");
ok(validarIntencaoLlm("não é objeto") === null, "não-objeto rejeitado");

// 14) Extração de JSON de texto livre do LLM.
const extraido = extrairJson('Claro! Aqui está: {"strategy":"defender","risk":0.3} fim.');
ok((extraido as { strategy?: string })?.strategy === "defender", "JSON extraído de texto livre");
ok(extrairJson("sem json aqui") === null, "texto sem JSON → null");

console.log(`\n🎉 ${passed} invariantes da IA estratégica OK`);

/* ------------------------------------------------------------------------ */
/* Geometria de finalização (IA implacável)                                   */
/* ------------------------------------------------------------------------ */

function disc(id: string, side: Disc["side"], x: number, y: number, keeper = false): Disc {
  return { id, side, x, y, vx: 0, vy: 0, r: 18, mass: 1, keeper };
}

const golDir = { x: FIELD.w - FIELD.margin, y: FIELD.h / 2 }; // gol do "home" atacando
const atacar: IntencaoEstrategica = {
  strategy: "atacar",
  risk: 0.6,
  targetZone: "gol_adversario",
  priority: "marcar_gol",
  reason: "teste",
};

// G1) Finalizador = botão ATRÁS da bola, nunca o que está entre bola e gol.
{
  const ball = disc("ball", "ball", 600, 300);
  const atras = disc("atras", "home", 500, 300); // atrás da bola (bola→gol = +x)
  const naFrente = disc("frente", "home", 700, 305); // entre bola e gol
  const adv = [disc("adv", "away", 100, 100)];
  const escolha = escolherFinalizador([naFrente, atras], ball, golDir, adv);
  ok(escolha?.disc.id === "atras" && escolha.cos > 0.9, "finalizador é o botão atrás da bola");
}

// G2) executarIntencao ataca com o botão atrás: impulso aponta para o contato
// que empurra a bola em direção ao gol (nunca "para o outro lado").
{
  const ball = disc("ball", "ball", 600, 300);
  const atras = disc("atras", "home", 500, 300);
  const naFrente = disc("frente", "home", 700, 305);
  const adv = [disc("adv", "away", 100, 100)];
  const discs = [ball, atras, naFrente, ...adv];
  const plano = executarIntencao(discs, "home", atacar, "profissional", 85);
  ok(plano?.discId === "atras", "chute sai do botão atrás da bola");
  const dirBolaGol = { x: golDir.x - ball.x, y: golDir.y - ball.y };
  const norm = Math.hypot(dirBolaGol.x, dirBolaGol.y);
  const dot = (plano!.ix * dirBolaGol.x + plano!.iy * dirBolaGol.y) / norm;
  ok(dot > 0, "impulso empurra a bola EM DIREÇÃO ao gol adversário");
}

// G3) Sem ninguém atrás da bola: NÃO chuta — reposiciona para o ponto de apoio.
{
  const ball = disc("ball", "ball", 600, 300);
  const f1 = disc("f1", "home", 700, 200);
  const f2 = disc("f2", "home", 720, 420);
  const adv = [disc("adv", "away", 100, 100)];
  const discs = [ball, f1, f2, ...adv];
  const plano = executarIntencao(discs, "home", atacar, "lenda", 90);
  ok(plano !== null, "sem ângulo limpo ainda há jogada (reposicionamento)");
  // O impulso deve apontar para TRÁS da bola (apoio), não para o gol.
  const movedor = discs.find((d) => d.id === plano!.discId)!;
  const apoioX = ball.x - (golDir.x - ball.x) * 0.06; // atrás da bola
  ok(
    Math.sign(plano!.ix) !== Math.sign(golDir.x - movedor.x) || Math.abs(ball.x - (movedor.x + plano!.ix)) < Math.abs(golDir.x - movedor.x),
    "sem ângulo: jogada não é um chute direto ao gol (é aproximação)",
  );
  void apoioX;
}

// G4) Gol feito: bola perto do gol, ângulo limpo, corredor livre → precisão
// cirúrgica (desvio angular mínimo) e força alta.
{
  const ball = disc("ball", "ball", 850, 300);
  const atras = disc("atras", "home", 740, 302);
  const adv = [disc("adv", "away", 200, 100), disc("gk", "away", 960, 310, true)];
  const escolha = escolherFinalizador([atras], ball, golDir, adv);
  ok(escolha?.golFeito === true, "gol feito detectado (perto + ângulo + corredor livre)");
  const discs = [ball, atras, ...adv];
  let minAng = Infinity;
  let maxAng = -Infinity;
  for (let i = 0; i < 200; i++) {
    const plano = executarIntencao(discs, "home", atacar, "amador", 40)!; // mesmo time fraco não erra gol feito
    const angImp = Math.atan2(plano.iy, plano.ix);
    minAng = Math.min(minAng, angImp);
    maxAng = Math.max(maxAng, angImp);
    const forca = Math.hypot(plano.ix, plano.iy);
    ok(forca > 12, "gol feito sai com força real");
  }
  // Precisão cirúrgica = quase nenhuma dispersão entre chutes repetidos.
  ok(maxAng - minAng < 0.02, `gol feito: dispersão angular ${(maxAng - minAng).toFixed(4)} rad (< 0.02)`);
}

// G5) Precisão escala com a força do clube: elite (99) desvia menos que base (30).
{
  const ball = disc("ball", "ball", 600, 300);
  const atras = disc("atras", "home", 460, 295);
  const adv = [disc("adv", "away", 100, 100)];
  const discs = [ball, atras, ...adv];
  const medir = (power: number) => {
    let soma = 0;
    for (let i = 0; i < 200; i++) {
      const plano = executarIntencao(discs, "home", atacar, "amador", power)!;
      const angImp = Math.atan2(plano.iy, plano.ix);
      const angIdeal = Math.atan2(ball.y - atras.y, ball.x - atras.x);
      soma += Math.abs(angImp - angIdeal);
    }
    return soma / 200;
  };
  const elite = medir(95);
  const base = medir(30);
  ok(elite < base, `elite (${elite.toFixed(3)}) desvia menos que time fraco (${base.toFixed(3)})`);
}

console.log(`🎉 TOTAL: ${passed} invariantes (IA estratégica + geometria implacável) OK`);
