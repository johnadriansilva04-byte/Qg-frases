// GAP da auditoria (Teste 1 — conta inexistente / sessão antiga sem perfil):
// garante ESTRUTURALMENTE que uma sessão Auth válida sem perfil de jogo é
// RECUSADA (sem auto-provisionamento, sem carteira, sem bônus), enquanto o
// primeiro acesso pós-signUp e o re-cadastro com prova de senha continuam
// legítimos. Cobre também a regra econômica "ledger indisponível = operação
// econômica NÃO concluída" (sem fallback local confirmando SOV).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let ok = 0, bad = 0;
function check(nome, cond) {
  if (!cond) { bad++; console.error("FALHOU:", nome); }
  else { ok++; console.log("OK:", nome); }
}
const ler = (p) => readFileSync(join(ROOT, p), "utf8");

const useBotaoAuth = ler("src/components/botao/online/useBotaoAuth.ts");
const sessaoRegras = ler("src/components/botao/online/sessaoRegras.ts");
const authTs = ler("src/components/botao/online/auth.ts");
const apiTs = ler("src/lib/botao/api.ts");
const storageTs = ler("src/components/botao/storage.ts");
const careerRemote = ler("src/components/botao/career/careerRemote.ts");
const botaoGame = ler("src/components/botao/BotaoGame.tsx");
const economia = ler("src/components/botao/career/EconomiaScreen.tsx");
const bolsaCard = ler("src/components/financial/BolsaResumoCard.tsx");

// ─── 1. A decisão é determinística e vive num módulo puro ───────────────
check("sessaoRegras: módulo puro existe", sessaoRegras.includes("export function decidirDestinoSessao"));
check("sessaoRegras: janela de cadastro recente definida", sessaoRegras.includes("JANELA_CADASTRO_RECENTE_MS"));
check("sessaoRegras: três destinos possíveis", sessaoRegras.includes('"entrar"') && sessaoRegras.includes('"recuperar-cadastro-recente"') && sessaoRegras.includes('"recusar-conta-sem-cadastro"'));
check("sessaoRegras: perfil existente sempre entra", sessaoRegras.includes('if (opcoes.temPerfil) return "entrar";'));
check("sessaoRegras: desconhecido (created_at inválido) recusa", sessaoRegras.includes('return "recusar-conta-sem-cadastro";'));

// ─── 2. useBotaoAuth: recusa sem provisionar NADA ───────────────────────
check("useBotaoAuth: usa a regra determinística", useBotaoAuth.includes("decidirDestinoSessao({ temPerfil: false"));
check("useBotaoAuth: expõe contaSemCadastro", useBotaoAuth.includes("contaSemCadastro"));

const recusa = useBotaoAuth.slice(
  useBotaoAuth.indexOf("// RECUSA-CONTA-SEM-PERFIL:inicio"),
  useBotaoAuth.indexOf("// RECUSA-CONTA-SEM-PERFIL:fim"),
);
check("recusa: encerra a sessão (sair/signOut mata o refresh token)", recusa.includes("await sair()"));
check("recusa: limpa caches de jogo", recusa.includes("limparCache()"));
check("recusa: sinaliza para direcionar ao cadastro", recusa.includes("setContaSemCadastro(true)"));
check("recusa: NUNCA cria perfil", !recusa.includes("criarPerfilSeNaoExistir"));
check("recusa: NUNCA cria carteira nem concede bônus", !recusa.includes("bootstrapFinanceiro") && !recusa.includes("bonusCadastro"));

// ─── 3. Recuperação legítima pós-signUp continua possível ───────────────
const recupera = useBotaoAuth.slice(
  useBotaoAuth.indexOf('destino === "recuperar-cadastro-recente"'),
  useBotaoAuth.indexOf("// RECUSA-CONTA-SEM-PERFIL:inicio"),
);
check("recuperação: só dentro da janela pós-signUp", recupera.includes("criarPerfilSeNaoExistir"));
check("bootstrap financeiro só roda com perfil existente", useBotaoAuth.includes("if (p) {") && useBotaoAuth.includes("bootstrapFinanceiro(u.id)"));

// ─── 4. Re-cadastro legítimo exige prova de posse (senha) ───────────────
const cadastrarFn = authTs.slice(authTs.indexOf("export async function cadastrar"));
check("re-cadastro: exige senha válida (signInWithPassword)", cadastrarFn.includes("signInWithPassword"));
check("re-cadastro: senha errada não cria nada", cadastrarFn.includes("Faça login com a senha correta"));
check("re-cadastro: com prova, recria o perfil com os dados do formulário", cadastrarFn.includes("criarPerfilSeNaoExistir"));
check("re-cadastro: perfil existente é devolvido (não duplica)", cadastrarFn.includes("if (existente) return existente;"));

// ─── 5. Regra econômica: ledger indisponível = operação NÃO concluída ───
check("vídeo: sem confirmação do ledger retorna null (nada somado)", storageTs.includes('recompensa de vídeo NÃO confirmada'));
check("vídeo: sem fallback local de soma", !storageTs.includes("(currentData.pontos_soberania || 0) + pontos"));
check("carreira: cache nunca soma pontosTotais sem ledger", !storageTs.includes(") + pontosTotais"));
check("carreira/online: cache = saldo do ledger ou INALTERADO", storageTs.includes("cacheSoberaniaInteiro(saldoSov) : (currentData.pontos_soberania || 0)"));
check("salvarResultado (legado): sem fallback local", !apiTs.includes("params.usuario.pontos_soberania + params.pontos"));
check("salvarResultado (legado): falha logada e cache preservado", apiTs.includes("SOV da partida NÃO confirmado"));
check("aposta online: aborta sem confirmação do ledger", careerRemote.includes("aposta NÃO confirmada") && !careerRemote.includes("saldoLedger ?? Math.max(0, atual + delta)"));
check("BotaoGame: vídeo falho avisa o usuário (erro/retry)", botaoGame.includes("Não foi possível registrar a recompensa agora"));

// ─── 6. Bolsa: SOV Bank (líquido) ≠ SOV Invest ≠ patrimônio em ativos ────
check("EconomiaScreen: duas carteiras do jogador", economia.includes("SOV Bank") && economia.includes("SOV Invest"));
check("EconomiaScreen: patrimônio em ativos não é saldo", economia.includes("não é saldo"));
check("EconomiaScreen: patrimônio da Cidadela não é saldo de ninguém", economia.includes("não saldo de ninguém"));
check("EconomiaScreen: compra usa o SOV Invest", economia.includes("saldos.invest"));
check("EconomiaScreen: IOF 10% na retirada", economia.includes("IOF 10%") || economia.includes("IOF_RETIRADA"));
check("BolsaResumoCard: investido rotulado como valor de mercado", bolsaCard.includes("não é saldo"));

// ─── 7. BotaoGame: recusa direciona ao cadastro ─────────────────────────
// O Futebol roda sem login: a recusa de conta não leva mais ao módulo de
// cadastro interno — o jogador segue local e o cadastro mora na Cidadela.
check(
  "BotaoGame: reage à recusa com orientação (login/cadastro NÃO no Futebol)",
  botaoGame.includes("não possui cadastro") &&
    botaoGame.includes("Cidadela dos Clássicos para criar") &&
    !botaoGame.includes('setScreen("profile");\n  }, [contaSemCadastro]'),
);

console.log(`== ${ok} OK / ${bad} falhas ==`);
process.exit(bad === 0 ? 0 : 1);
