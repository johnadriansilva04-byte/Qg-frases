/**
 * Guarda estrutural — pipeline SEMÂNTICO do resultado do gol até a persistência.
 *
 * Proíbe as regressões encontradas na auditoria (2026-08-26):
 *  1. physics.step() marcava ownGoal quando o último a tocar era o LADO
 *     CREDITADO (exatamente invertido — todo gol normal virava "contra").
 *  2. MatchView propagava o gol ao cliente só com discId="goal"/"own_goal"
 *     (sem qual lado atacou o gol atingido).
 *  3. MesaOnlineMatch creditava no servidor QUEM CHUTOU (autor=chutador) —
 *     gol contra invertia o placar no campeonato online.
 *  4. Winner/placar em toda a cadeia deve derivar da identidade dos times,
 *     nunca de posição visual, índice 0/1, Math.max/Math.min.
 */
import { readFileSync } from "fs";

let passou = 0;
let falhou = 0;
const ok = (cond, msg) => {
  if (cond) {
    passou++;
    console.log(`OK: ${msg}`);
  } else {
    falhou++;
    console.log(`FALHOU: ${msg}`);
  }
};

const PHYS = readFileSync("src/components/botao/engine/physics.ts", "utf8");
const MATCHVIEW = readFileSync("src/components/botao/components/MatchView.tsx", "utf8");
const MESA = readFileSync("src/components/botao/components/MesaOnlineMatch.tsx", "utf8");
const CAMP = readFileSync("src/components/botao/components/OnlineChampionship.tsx", "utf8");

// ---------------------------------------------------------------- physics
ok(
  PHYS.includes("concedingSide: Side | null") && PHYS.includes("lastTouchSide === concedingSide"),
  "physics: gol contra = último a tocar é o lado que SOFREU (concedingSide), invertido corrigido",
);
ok(PHYS.includes("lastTouchSide: Side | null"), "physics: StepResult expõe lastTouchSide (autoria)");
ok(!/ownGoal\s*=\s*goal\s*\?\s*lastTouchSide\s*===\s*goal/.test(PHYS),
  "physics: padrão invertido (lastTouchSide === goal) eliminado");

// ---------------------------------------------------------------- MatchView
ok(
  MATCHVIEW.includes("ultimoToqueRef") && MATCHVIEW.includes("r.lastTouchSide"),
  "MatchView: acumula último toque da jogada inteira (ultimoToqueRef)",
);
ok(
  MATCHVIEW.includes("discId: \"gol_contra\"") && MATCHVIEW.includes("discId: \"gol\""),
  "MatchView: discId semântico gol/gol_contra (labels antigos eliminados)",
);
ok(
  MATCHVIEW.includes("golInfo") && MATCHVIEW.includes("scoringSide: Side"),
  "MatchView: onPlay carrega evento de gol SEMÂNTICO (scoringSide/authorSide/ownGoal)",
);
ok(
  !MATCHVIEW.includes('onPlay(1, { discId: "own_goal"') && !MATCHVIEW.includes('onPlay(1, { discId: "goal"'),
  "MatchView: discId antigo goal/own_goal não é mais enviado",
);

// ---------------------------------------------------------------- MesaOnlineMatch
ok(
  MESA.includes("golInfo?.scoringSide") && MESA.includes("autorDoPonto"),
  "MesaOnlineMatch: ponto vai a quem atacou o gol atingido (scoringSide→j1/j2)",
);
ok(
  !MESA.includes("ehGolContra") && !MESA.includes('msgGolContra'),
  "MesaOnlineMatch: atribuição por discId (ehGolContra) eliminada",
);
ok(
  MESA.includes('"gol_contra"') && MESA.includes('"gol"'),
  "MesaOnlineMatch: discrimina jogada/remessage sem usar identidade do chutador",
);

// ------------------------------------------------------------- Campeonato
ok(
  CAMP.includes("j1 === mesaAtiva.jogador_1_id ? r.golsJ1 : r.golsJ2") &&
    CAMP.includes("j2 === mesaAtiva.jogador_1_id ? r.golsJ1 : r.golsJ2"),
  "OnlineChampionship: mapeia a série ao slot j1/j2 do CONFRONTO pela identidade, não pela posição",
);

// ---------------------------------------------------------- Anti ordenação
const files = [MATCHVIEW, MESA, CAMP];
ok(
  !files.some((f) => /Math\.(max|min)\(([^)\n]*(gols|placar|j1|j2)[^)\n]*)\)/.test(f)),
  "Nenhum caminho computa placar com Math.max/Math.min (ordem = identidade, não tamanho)",
);
ok(
  !files.some((f) => /\.sort\([^)\n]*(gols|placar|j1|j2)/.test(f)),
  "Nenhum caminho ordena os números do placar",
);

console.log(`\n== gol-semantico-guarda: ${passou} OK / ${falhou} falhas ==`);
if (falhou > 0) process.exit(1);
