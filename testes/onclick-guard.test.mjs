import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let ok = true;
function expect(cond, nome) {
  if (!cond) { ok = false; console.log("FALHOU:", nome); }
  else console.log("OK:", nome);
}

const ler = (p) => {
  const full = join(ROOT, p);
  if (existsSync(full)) return readFileSync(full, "utf8");
  // fallback: componente pode viver em outro caminho (audit-friendly)
  throw new Error("não encontrado: " + p);
};

// === §23: listeners manuais exigem cleanup ===
// ControlledMonetagButton: listeners com cleanup em useEffect
const monetag = ler("src/components/ControlledMonetagButton.tsx");
expect(monetag.includes("removeEventListener") || monetag.includes("executionLockRef"), "MonetagButton: guard ou cleanup");
expect(monetag.includes("executionLockRef"), "MonetagButton: executionLockRef (barreira de execução)");
expect(monetag.includes("cooldown"), "MonetagButton: cooldown pós-execução");

// === §22/§25: adClickGuard consome autorização única ===
const guard = ler("src/lib/adClickGuard.ts");
expect(guard.includes("consumir") || guard.includes("consume") || guard.includes("autoriza"), "adClickGuard: mecanismo de consumo único");

// === §26/§27: voltar do patrocínio cancela autorização restante ===
const adMgr = ler("src/lib/adManager.ts");
expect(adMgr.includes("cancelarAutorizacao"), "adManager: cancelarAutorizacao() existe");
// A invalidação ao retornar é via timeout do disparo: após janela, remove script + cancela autorização.
expect(adMgr.includes("setTimeout") && adMgr.includes("cancelarAutorizacao"), "adManager: timer limpa autorização (janela monetag)");
// A invalidação no retorno da página mora no BotaoGame (visibilitychange/pageshow).
const bjFast = ler("src/components/botao/BotaoGame.tsx");
expect(bjFast.includes("visibilitychange") && bjFast.includes("pageshow"), "BotaoGame: visibilitychange/pageshow invalidam autorização ao retornar");

// === MatchEndScreen: 1 clique = 1 execução (sem addEventListener manual p/ onClick) ===
const matchEnd = ler("src/components/botao/components/MatchEndScreen.tsx");
// não deve registrar listeners click diretos no documento/window
expect(!matchEnd.includes("addEventListener(\"click\"") && !matchEnd.includes("addEventListener('click'"), "MatchEndScreen: sem listener de clique manual");
expect(matchEnd.includes("patrocin") || matchEnd.includes("Patroc"), "MatchEndScreen: contém fluxo de patrocínio");

// === EntrevistaColetiva: abertura idempotente ===
const entrev = ler("src/components/botao/components/EntrevistaColetiva.tsx");
expect(!entrev.includes("addEventListener(\"click\"") && !entrev.includes("addEventListener('click'"), "EntrevistaColetiva: sem listener de clique manual");

// === BotaoGame: guarda de partida da coletiva (patrocinioPagoPartida) ===
const bj = ler("src/components/botao/BotaoGame.tsx");
expect(bj.includes("patrocinioPagoPartida"), "BotaoGame: guarda patrocinioPagoPartida");
expect(bj.includes("entregoColetivaRef") || bj.includes("entregaColetiva") || bj.includes("coletiva"), "BotaoGame: fluxo de coletiva rastreado");

// === useOnboarding/onboardingApi: mutar centralizado + espelho local ===
const obApi = ler("src/lib/onboarding/onboardingApi.ts");
const useOb = ler("src/lib/onboarding/useOnboarding.ts");
expect(useOb.includes("mutar"), "useOnboarding: mutar() centraliza persistence");
expect(obApi.includes("localStorage"), "onboardingApi: espelha em localStorage");
expect(obApi.includes("salvarOnboardingLocal"), "onboardingApi: salvarOnboardingLocal definido");

// === Tour contextual: nunca oferece "Pular" (§31) ===
const tour = ler("src/components/cidadela/TourContextual.tsx");
expect(!/Pular/i.test(tour) || /não.*pular|sem pular/i.test(tour), "TourContextual: não exibe 'Pular'");

// === §13: Feira renomeada para Marketplace em UI ===
const celular = ler("src/components/botao/career/CelularConversas.tsx");
expect(!celular.includes("\"Feira\""), "CelularConversas: 'Feira' renomeada");
expect(celular.includes("Marketplace"), "CelularConversas: usa 'Marketplace'");

// === CORREÇÃO ONCLICK: "Ver patrocínio" substituído por "Cansou de jogar? Descubra algo novo." ===
const controlledMonetag = ler("src/components/ControlledMonetagButton.tsx");
expect(!controlledMonetag.includes("Ver patrocinador"), "ControlledMonetagButton: 'Ver patrocinador' removido");
expect(controlledMonetag.includes("Cansou de jogar"), "ControlledMonetagButton: novo texto presente");

const loadingScreen = ler("src/components/botao/career/LoadingScreen.tsx");
expect(!loadingScreen.includes("Ver patrocinador"), "LoadingScreen: 'Ver patrocinador' removido");
expect(loadingScreen.includes("Cansou de jogar"), "LoadingScreen: novo texto presente");

const authScreen = ler("src/components/botao/components/AuthScreen.tsx");
expect(!authScreen.includes("Ver patrocinador"), "AuthScreen: 'Ver patrocinador' removido");
expect(authScreen.includes("Cansou de jogar"), "AuthScreen: novo texto presente");

const classificacao = ler("src/components/botao/career/ClassificacaoScreen.tsx");
expect(!classificacao.includes("Ver patrocinador"), "ClassificacaoScreen: 'Ver patrocinador' removido");
expect(classificacao.includes("Cansou de jogar"), "ClassificacaoScreen: novo texto presente");

// === MatchEndAdCard: novo componente criado ===
const matchEndCard = ler("src/components/MatchEndAdCard.tsx");
expect(matchEndCard.includes("Cansou de jogar"), "MatchEndAdCard: componente criado com texto correto");
expect(matchEndCard.includes("ControlledMonetagButton"), "MatchEndAdCard: usa ControlledMonetagButton");

// === MatchEndScreen: card adicionado ===
const matchEndScreen = ler("src/components/botao/components/MatchEndScreen.tsx");
expect(matchEndScreen.includes("MatchEndAdCard"), "MatchEndScreen: card adicionado");

// === TrilhaRPGScreen: card adicionado ===
const trilhaRPG = ler("src/components/trilha/TrilhaRPGScreen.tsx");
expect(trilhaRPG.includes("MatchEndAdCard"), "TrilhaRPGScreen: card adicionado");

console.log(ok ? "== ONCLICK GUARD TESTES OK ==" : "== FALHAS ==");
if (!ok) process.exit(1);
