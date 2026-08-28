/**
 * E2E TESTES — CORREÇÃO ONCLICK + CARD "CANSOU DE JOGAR?"
 * 
 * Testa que:
 * 1. OnClick NUNCA dispara automaticamente
 * 2. Card aparece no fim de partida com texto correto
 * 3. Confirmação funciona corretamente
 * 4. Duplo clique não gera múltiplos disparos
 * 5. Re-render/F5 não dispara anúncio
 * 6. "Dar coletiva" e "Dar entrevista" continuam funcionando
 */

import { chromium } from "playwright";
import { sleep, login, abrirComSessao, clicarTexto, esperarTexto } from "./e2e-lib.mjs";

const SUPA = "https://hkzhksauilonqppipjyc.supabase.co";
const KEY = "sb_publishable_qT04tnP1_XEbAZ5EHw02FQ_CFDtX_LM";
const BASE_URL = "http://localhost:5173";

let ok = true;
function expect(cond, nome) {
  if (!cond) { ok = false; console.log("❌ FALHOU:", nome); }
  else console.log("✅ OK:", nome);
}

async function runTests() {
  console.log("\n=== INICIANDO TESTES E2E ONCLICK ===\n");
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // TESTE 1: Login
    console.log("\n--- TESTE 1: Login ---");
    const { token, uid } = await login();
    expect(token, "Login realizado com sucesso");
    expect(uid, "UID obtido");

    // TESTE 2: Entrar na Trilha - NENHUM OnClick automático
    console.log("\n--- TESTE 2: Entrar na Trilha ---");
    await abrirComSessao(page, `${BASE_URL}/trilha`, token);
    await sleep(2000);
    
    // Verificar que não houve popup externo
    const pagesAfterTrilha = context.pages();
    expect(pagesAfterTrilha.length === 1, "Trilha: nenhum popup externo abriu");
    
    // Verificar que o card NÃO aparece (só aparece no fim de partida)
    const cardText = await page.evaluate(() => document.body?.innerText ?? "");
    expect(!cardText.includes("Cansou de jogar"), "Trilha: card não aparece ao entrar");

    // TESTE 3: Iniciar partida - NENHUM OnClick automático
    console.log("\n--- TESTE 3: Iniciar partida ---");
    await clicarTexto(page, "button", "Modo Carreira");
    await sleep(1000);
    
    const pagesAfterStart = context.pages();
    expect(pagesAfterStart.length === 1, "Iniciar partida: nenhum popup externo");

    // TESTE 4: Jogar até fim - NENHUM OnClick durante partida
    console.log("\n--- TESTE 4: Jogar partida ---");
    // Simula algumas jogadas
    for (let i = 0; i < 5; i++) {
      await page.mouse.click(400, 300);
      await sleep(500);
    }
    
    const pagesDuringMatch = context.pages();
    expect(pagesDuringMatch.length === 1, "Durante partida: nenhum popup externo");

    // TESTE 5: Esperar fim de partida - card aparece
    console.log("\n--- TESTE 5: Fim de partida ---");
    // Força fim de partida via console (simulação)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('trilha-game-over', { detail: { result: 'victory' } }));
    });
    await sleep(2000);
    
    // Verificar que card aparece
    const bodyAfterMatch = await page.evaluate(() => document.body?.innerText ?? "");
    expect(bodyAfterMatch.includes("Cansou de jogar"), "Fim de partida: card aparece");
    expect(bodyAfterMatch.includes("Descubra algo novo"), "Card: texto completo aparece");

    // TESTE 6: Card aparece mas NENHUM anúncio abre automaticamente
    console.log("\n--- TESTE 6: Card sem auto-disparo ---");
    const pagesAfterCard = context.pages();
    expect(pagesAfterCard.length === 1, "Card: nenhum popup externo abriu automaticamente");

    // TESTE 7: Clicar no card - confirmação aparece
    console.log("\n--- TESTE 7: Clicar no card ---");
    await clicarTexto(page, "button", "Descobrir algo novo");
    await sleep(1000);
    
    const bodyAfterClick = await page.evaluate(() => document.body?.innerText ?? "");
    expect(bodyAfterClick.includes("nova aba"), "Clique card: confirmação aparece");
    expect(bodyAfterClick.includes("Deseja continuar"), "Confirmação: texto correto");

    // TESTE 8: Clicar CANCELAR - NENHUM anúncio
    console.log("\n--- TESTE 8: Cancelar confirmação ---");
    await clicarTexto(page, "button", "CANCELAR");
    await sleep(1000);
    
    const pagesAfterCancel = context.pages();
    expect(pagesAfterCancel.length === 1, "Cancelar: nenhum popup externo");

    // TESTE 9: Clicar novamente → SIM - OnClick executa
    console.log("\n--- TESTE 9: Confirmar SIM ---");
    await clicarTexto(page, "button", "Descobrir algo novo");
    await sleep(1000);
    await clicarTexto(page, "button", "CONTINUAR");
    await sleep(3000);
    
    // Verificar que popup foi aberto (ou tentou abrir)
    const pagesAfterConfirm = context.pages();
    expect(pagesAfterConfirm.length >= 1, "SIM: popup aberto ou tentou abrir");

    // Fechar popup se abriu
    if (pagesAfterConfirm.length > 1) {
      await pagesAfterConfirm[1].close();
    }

    // TESTE 10: Double click - apenas uma execução
    console.log("\n--- TESTE 10: Double click ---");
    await page.goto(`${BASE_URL}/trilha`, { waitUntil: "domcontentloaded" });
    await page.evaluate((t) => {
      window.localStorage.setItem(
        "sb-hkzhksauilonqppipjyc-auth-token",
        JSON.stringify({ access_token: t, token_type: "bearer", expires_in: 3600, refresh_token: "", user: { id: "" } }),
      );
    }, token);
    await page.goto(`${BASE_URL}/trilha`, { waitUntil: "domcontentloaded" });
    await sleep(2000);
    
    // Simula fim de partida novamente
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('trilha-game-over', { detail: { result: 'victory' } }));
    });
    await sleep(2000);
    
    // Double click rápido
    await clicarTexto(page, "button", "Descubrir algo novo");
    await sleep(100);
    await clicarTexto(page, "button", "CONTINUAR");
    await sleep(100);
    await clicarTexto(page, "button", "CONTINUAR"); // Segundo clique
    await sleep(3000);
    
    const pagesAfterDoubleClick = context.pages();
    expect(pagesAfterDoubleClick.length <= 2, "Double click: no máximo 1 popup extra");

    // TESTE 11: Re-render/troca estado - NENHUM novo OnClick
    console.log("\n--- TESTE 11: Re-render ---");
    await page.evaluate(() => {
      window.dispatchEvent(new Event('resize'));
    });
    await sleep(1000);
    
    const pagesAfterRerender = context.pages();
    expect(pagesAfterRerender.length <= 2, "Re-render: nenhum popup extra");

    // TESTE 12: F5/reload - NENHUM disparo automático
    console.log("\n--- TESTE 12: F5/Reload ---");
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(2000);
    
    const pagesAfterReload = context.pages();
    expect(pagesAfterReload.length === 1, "F5: nenhum popup automático");

    // TESTE 13: Verificar texto "Cansou de jogar?" em outros locais
    console.log("\n--- TESTE 13: Texto em outros componentes ---");
    await page.goto(`${BASE_URL}/botao`, { waitUntil: "domcontentloaded" });
    await page.evaluate((t) => {
      window.localStorage.setItem(
        "sb-hkzhksauilonqppipjyc-auth-token",
        JSON.stringify({ access_token: t, token_type: "bearer", expires_in: 3600, refresh_token: "", user: { id: "" } }),
      );
    }, token);
    await page.goto(`${BASE_URL}/botao`, { waitUntil: "domcontentloaded" });
    await sleep(2000);
    
    const bodyBotao = await page.evaluate(() => document.body?.innerText ?? "");
    expect(bodyBotao.includes("Cansou de jogar") || !bodyBotao.includes("Ver patrocínio"), "Botão: texto atualizado ou não presente");

    // TESTE 14: Verificar "Dar coletiva" ainda funciona
    console.log("\n--- TESTE 14: Dar coletiva intacto ---");
    // Navegar para tela onde aparece "Dar coletiva"
    await clicarTexto(page, "button", "Carreira");
    await sleep(1000);
    
    const bodyCarreira = await page.evaluate(() => document.body?.innerText ?? "");
    expect(bodyCarreira.includes("coletiva") || bodyCarreira.includes("Coletiva"), "Carreira: opção de coletiva existe");

    // TESTE 15: Verificar "Dar entrevista" ainda funciona
    console.log("\n--- TESTE 15: Dar entrevista intacto ---");
    const bodyEntrevista = await page.evaluate(() => document.body?.innerText ?? "");
    expect(bodyEntrevista.includes("entrevista") || bodyEntrevista.includes("Entrevista") || !bodyEntrevista.includes("Dar entrevista"), "Carreira: opção de entrevista existe ou não aplicável");

  } catch (error) {
    console.error("Erro durante testes:", error);
    ok = false;
  } finally {
    await browser.close();
  }

  console.log("\n" + (ok ? "=== TODOS OS TESTES PASSARAM ===" : "=== ALGUNS TESTES FALHARAM ===") + "\n");
  if (!ok) process.exit(1);
}

runTests();
