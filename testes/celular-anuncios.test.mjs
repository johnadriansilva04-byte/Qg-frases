/**
 * Auditoria do celular (mensagem de número desconhecido) e dos anúncios.
 *
 * Celular: a mensagem do Corretor ("Número desconhecido") NUNCA pode ficar
 * presa. O remetente existe; ao CONTINUAR o usuário cai na CONVERSA; voltar de
 * leitura retorna à LISTA — nunca fecha o celular sem querer.
 *
 * Anúncios: cada script aparece no máximo 1x a cada 15h; recarregar (F5) ou
 * clicar no jogo não reexibe antes do intervalo; nunca em loop.
 */
import { readFileSync } from "node:fs";

let ok = 0,
  bad = 0;
function check(nome, cond) {
  if (!cond) {
    bad++;
    console.error("FALHOU:", nome);
  } else {
    ok++;
    console.log("OK:", nome);
  }
}

const conversas = readFileSync("src/components/botao/career/CelularConversas.tsx", "utf8");
const celularFixo = readFileSync("src/components/CelularFixo.tsx", "utf8");
const personagens = readFileSync("src/components/botao/career/rpg/personagens.ts", "utf8");
const eventos = readFileSync("src/components/botao/career/rpg/eventos.ts", "utf8");
const adManager = readFileSync("src/lib/adManager.ts", "utf8");
const subornoStory = readFileSync("src/components/botao/career/SubornoStory.tsx", "utf8");

/* ─── Celular ─── */
check(
  "Corretor (número desconhecido) é um remetente real e identificável",
  personagens.includes('"npc-corretor"') && personagens.includes('nome: "O Corretor"'),
);
check(
  "A mensagem de número desconhecido é um evento RPG com escolhas (não trava)",
  eventos.includes('"divida-corretor"') && eventos.includes("Número desconhecido") && eventos.includes("escolhas:"),
);
check(
  "Voltar de leitura retorna à LISTA (Contatos), nunca fecha o app",
  conversas.includes("voltar às mensagens") && conversas.includes('setAba("contatos")'),
);
check(
  "O botão de leitura NÃO chama onVoltar (que fecharia o celular)",
  !/onClick=\{onVoltar\}[^>]*>\s*Entendido/.test(conversas),
);
check(
  "Decisão prioritária (suborno) tem caminho de saída (onFechar → hub)",
  celularFixo.includes("prioridade") && subornoStory.includes("onFechar"),
);
check(
  "Celular fecha só pelo botão Fechar (não pelo voltar de uma mensagem)",
  celularFixo.includes("setAberto(false)"),
);

/* ─── Anúncios: 1x por script a cada 15h ─── */
check("Frequência: cooldown de 15h definido", adManager.includes("SCRIPT_COOLDOWN_MS = 15 * 60 * 60 * 1000"));
check("Frequência: timestamp por script (monetag/adsterra/adsense)", adManager.includes("ad_script_ts:"));
check("Frequência: cooldown verificado antes de injetar", adManager.includes("scriptCooldownPassou(network)"));
check("Frequência: marca exibição ao carregar", adManager.includes("marcarScriptExibido(network)"));
check(
  "Sem loop: cooldown impede reexibição imediata (mesmo script)",
  adManager.includes("Date.now() - ultimo >= AdManager.SCRIPT_COOLDOWN_MS"),
);
check(
  "Cooldown persistido (sobrevive a F5/reload)",
  adManager.includes('localStorage.setItem(`ad_script_ts:${network}`'),
);

console.log(`\n== ${ok} OK / ${bad} falhas ==`);
process.exit(bad === 0 ? 0 : 1);
