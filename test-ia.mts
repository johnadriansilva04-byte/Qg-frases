/**
 * Testes do cérebro estratégico da CPU (§9-§17) — jiti:
 *   JITI_TSCONFIG_PATHS=true ./node_modules/.bin/jiti test-ia.mts
 */
import {
  analisarPadroes,
  balancearPerfil,
  decidirIntencao,
  executarIntencao,
  extrairJson,
  novaMemoriaPartida,
  perfilDoClube,
  registrarTiroJogador,
  validarIntencaoLlm,
  type EstadoPartida,
  type EstrategiaId,
  type MemoriaPartida,
} from "./src/components/botao/engine/estrategia";
import { initialDiscs } from "./src/components/botao/engine/physics";

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
