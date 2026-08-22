/**
 * Runtime (jiti): regra determinística AUTENTICAÇÃO ≠ CONTA DE JOGO.
 *
 * Cenários obrigatórios:
 *  - sessão antiga + perfil apagado → RECUSA (nunca auto-provisionamento);
 *  - signUp legítimo (conta Auth recém-criada, trigger ainda sem perfil) →
 *    recuperação permitida na janela;
 *  - perfil existente → entra;
 *  - borda da janela (10 min) e relógio do cliente adiantado.
 *
 * Rodar: node testes/sessao-antiga.test.mts (Node ≥22.18, strip-types nativo)
 *    ou: JITI_TSCONFIG_PATHS=true ./node_modules/.bin/jiti testes/sessao-antiga.test.mts
 */
import {
  decidirDestinoSessao,
  JANELA_CADASTRO_RECENTE_MS,
} from "../src/components/botao/online/sessaoRegras.ts";

let ok = 0;
let falhas = 0;
function expect(cond: boolean, nome: string) {
  if (cond) { ok++; console.log("OK:", nome); }
  else { falhas++; console.log("FALHOU:", nome); }
}

const AGORA = Date.parse("2026-08-22T12:00:00.000Z");
const iso = (msAtras: number) => new Date(AGORA - msAtras).toISOString();

// 1. Perfil existente → entra (conta Auth de qualquer idade).
expect(
  decidirDestinoSessao({ temPerfil: true, usuarioCriadoEm: iso(365 * 24 * 3600_000), agora: AGORA }) === "entrar",
  "perfil existente + conta antiga → entrar",
);
expect(
  decidirDestinoSessao({ temPerfil: true, usuarioCriadoEm: iso(0), agora: AGORA }) === "entrar",
  "perfil existente + conta nova → entrar",
);

// 2. Sessão ANTIGA sem perfil → RECUSA (o cenário do login fantasma).
expect(
  decidirDestinoSessao({ temPerfil: false, usuarioCriadoEm: iso(JANELA_CADASTRO_RECENTE_MS + 1), agora: AGORA }) === "recusar-conta-sem-cadastro",
  "sessão antiga (10min+1ms) sem perfil → RECUSA",
);
expect(
  decidirDestinoSessao({ temPerfil: false, usuarioCriadoEm: iso(30 * 24 * 3600_000), agora: AGORA }) === "recusar-conta-sem-cadastro",
  "sessão de 30 dias sem perfil → RECUSA",
);
expect(
  decidirDestinoSessao({ temPerfil: false, usuarioCriadoEm: null, agora: AGORA }) === "recusar-conta-sem-cadastro",
  "sem created_at (não dá pra provar cadastro recente) → RECUSA",
);
expect(
  decidirDestinoSessao({ temPerfil: false, usuarioCriadoEm: "lixo-inválido", agora: AGORA }) === "recusar-conta-sem-cadastro",
  "created_at inválido → RECUSA (desconhecido nunca vira legítimo)",
);

// 3. SignUp legítimo → recuperação permitida dentro da janela.
expect(
  decidirDestinoSessao({ temPerfil: false, usuarioCriadoEm: iso(0), agora: AGORA }) === "recuperar-cadastro-recente",
  "signUp agora (trigger ainda não criou perfil) → recuperação",
);
expect(
  decidirDestinoSessao({ temPerfil: false, usuarioCriadoEm: iso(JANELA_CADASTRO_RECENTE_MS - 1), agora: AGORA }) === "recuperar-cadastro-recente",
  "signUp há 9min59s (borda interna) → recuperação",
);
expect(
  decidirDestinoSessao({ temPerfil: false, usuarioCriadoEm: iso(JANELA_CADASTRO_RECENTE_MS), agora: AGORA }) === "recuperar-cadastro-recente",
  "exatamente na borda de 10min → recuperação (<= inclusivo)",
);

// 4. Relógio do cliente adiantado (idade negativa) = cadastro recém-criado.
expect(
  decidirDestinoSessao({ temPerfil: false, usuarioCriadoEm: iso(-60_000), agora: AGORA }) === "recuperar-cadastro-recente",
  "created_at 1min no futuro (skew do cliente) → recuperação",
);

// 5. Monotonicidade: envelhecer NUNCA transforma recusa em recuperação.
const idades = [0, 60_000, JANELA_CADASTRO_RECENTE_MS - 1, JANELA_CADASTRO_RECENTE_MS, JANELA_CADASTRO_RECENTE_MS + 1, 86_400_000];
const destinos = idades.map((ms) => decidirDestinoSessao({ temPerfil: false, usuarioCriadoEm: iso(ms), agora: AGORA }));
expect(
  destinos.slice(0, 4).every((d) => d === "recuperar-cadastro-recente") &&
    destinos.slice(4).every((d) => d === "recusar-conta-sem-cadastro"),
  "destino é monotônico na idade: recuperar → recusar, sem volta",
);

console.log(`== ${ok} OK / ${falhas} falhas ==`);
if (falhas > 0) process.exit(1);
