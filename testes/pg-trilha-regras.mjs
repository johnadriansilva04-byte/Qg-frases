/* Valida as regras da Trilha Online no Postgres LOCAL (docker), aplicando o
 * trilha.sql real:
 *  1. colocação respeita a reserva (máximo de 9 peças por jogador);
 *  2. moinho/vitória: ao fechar trilha, o turno fica com quem fechou (captura
 *     pendente) — nunca com o adversário;
 *  3. captura SÓ de peça inimiga (a própria peça é rejeitada pelo servidor);
 *  4. captura pendente deve repetir o movimento da trilha;
 *  5. fim de jogo quando o adversário fica com 2 peças (aniquilação);
 *  6. bloqueio sem movimentos;
 *  7. captura fora de trilha é rejeitada.
 *
 * Uso: sudo docker run -d --name pg-trilha -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:16
 *      node testes/pg-trilha-regras.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const PSQL = (sql) =>
  execSync(
    `sudo -n docker exec -i pg-trilha psql -U postgres -v ON_ERROR_STOP=1 -At`,
    { input: sql, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
const PSQL_SEM_STOP = (sql) => {
  try {
    return { ok: true, out: PSQL(sql) };
  } catch (e) {
    return { ok: false, out: String(e.stderr ?? e.message) };
  }
};

let pass = 0, fail = 0;
const ok = (c, m) => {
  if (c) { pass++; console.log(`✅ ${m}`); }
  else { fail++; console.error(`❌ ${m}`); }
};

// Reset do banco (schemas limpos) para a cadeia aplicar de forma determinística.
PSQL(`DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS auth CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;`);

// Stubs de auth (fora do Supabase não existem).
PSQL(`
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT, created_at TIMESTAMPTZ DEFAULT now(),
  raw_user_meta_data JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', TRUE)::jsonb ->> 'sub', '')::UUID
$$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT 'authenticated' $$;
`);

// Cadeia real (trilha.sql inteiro).
let sql = fs.readFileSync("supabase/migrations/trilha.sql", "utf8");
let r = PSQL_SEM_STOP(sql);
ok(r.ok, `trilha.sql aplica limpa${r.ok ? "" : " → " + (r.out.match(/ERROR:[^\n]*/)?.[0] ?? r.out.slice(0, 400))}`);

const J1 = "11111111-1111-1111-1111-111111111111";
const J2 = "22222222-2222-2222-2222-222222222222";
PSQL(`
INSERT INTO auth.users (id, email) VALUES ('${J1}', 'j1@teste'), ('${J2}', 'j2@teste');
`);
const COMO = (uid, sqlq) => `SET request.jwt.claims = '{"sub":"${uid}"}'; ${sqlq}`;
const ULTIMA = (s) => s.trim().split("\n").filter((l) => l && l !== "SET").pop()?.trim() ?? "";

// Cria a mesa como J1 e J2 entra.
const MESA = ULTIMA(PSQL(COMO(J1, `SELECT public.criar_mesa_trilha('REGRA E2E', 'normal');`)));
ok(MESA.startsWith("trilha_"), `mesa criada (${MESA})`);
r = PSQL_SEM_STOP(COMO(J2, `SELECT public.entrar_mesa_trilha('${MESA}');`));
ok(r.ok, "jogador 2 entra na mesa");

const BOARD = (mesaJson) => JSON.parse(mesaJson).board;
const CELL = (b, i) => b[i];

// Converte literal de array do Postgres ({1,2,3}) em array JS.
function pgArray(texto) {
  const t = texto.trim();
  if (t === "{}") return [];
  const inner = t.slice(1, -1);
  return inner.split(",").map((s) => Number(s));
}

// helper de jogada: o servidor é autoritativo — reconstitui o tabuleiro e as
// mãos a partir da mesa persistida. O "cliente" só envia from/to/remove.
function jogada(uid, mesa, { from, to, remove }) {
  const res = PSQL_SEM_STOP(COMO(uid, `SELECT row_to_json(t) FROM (
    SELECT * FROM public.registrar_jogada_trilha(
      '${mesa}', ${from === null ? "NULL" : from}, ${to}, ${remove === null ? "NULL" : remove}
    ) AS t
  ) t;`));
  if (!res.ok) {
    const err = (res.out.match(/ERROR:[^\n]*/)?.[0] ?? res.out.slice(0, 400));
    return { ok: false, error: err };
  }
  const j = JSON.parse(ULTIMA(res.out));
  j.board = j.board ?? JSON.parse(j.board_json ?? "[]");
  return { ok: true, mesa: j };
}

const mesaAtual = () => {
  const linha = PSQL(`SELECT row_to_json(t) FROM (SELECT * FROM public.mesas_trilha WHERE mesa_id = '${MESA}') t;`);
  return JSON.parse(ULTIMA(linha));
};

// ===== 1) Fim de jogo ao reduzir adversário a 3 peças e moinho/captura corretos =====
console.log("\n— Fase 1: turno + moinho + captura —");
// J1 coloca 0, J2 coloca 6, J1 coloca 1, J2 coloca 5, J1 coloca 2 → trilha (0,1,2)
let r1 = jogada(J1, MESA, { from: null, to: 0, remove: null });
ok(r1.ok && r1.mesa.turn === 2, "J1 coloca 0 → turno J2");
r1 = jogada(J2, MESA, { from: null, to: 6, remove: null });
ok(r1.ok && r1.mesa.turn === 1, "J2 coloca 6 → turno J1");
r1 = jogada(J1, MESA, { from: null, to: 1, remove: null });
ok(r1.ok && r1.mesa.turn === 2, "J1 coloca 1 → turno J2");
r1 = jogada(J2, MESA, { from: null, to: 5, remove: null });
ok(r1.ok && r1.mesa.turn === 1, "J2 coloca 5 → turno J1");

r1 = jogada(J1, MESA, { from: null, to: 2, remove: null });
ok(r1.ok && r1.mesa.pending_capture === true, "J1 fecha trilha (0,1,2) → captura pendente");
ok(r1.ok && r1.mesa.turn === 1, "turno NÃO muda com captura pendente (fica com quem fechou)");
ok(r1.ok && r1.mesa.hand_p1 === 6, `reserva J1 correta após fechar trilha na colocação (${r1.mesa.hand_p1})`);

// Tentar capturar a PRÓPRIA peça (0, que é do J1) — deve ser rejeitado.
let own = jogada(J1, MESA, { from: null, to: 2, remove: 0 });
ok(!own.ok, "captura da PRÓPRIA peça é rejeitada");

// Capturar peça inimiga (6, do J2) repetindo o movimento da trilha.
let cap = jogada(J1, MESA, { from: null, to: 2, remove: 6 });
ok(cap.ok && cap.mesa.pending_capture === false, "captura de peça inimiga conclui a jogada");
ok(cap.ok && cap.mesa.turn === 2, "turno muda para o adversário após a captura");
ok(cap.ok && cap.mesa.board[6] === 0, `peça 6 removida do tabuleiro (board[6]=${cap.mesa.board[6]})`);
ok(cap.ok && cap.mesa.captured_p1 === 1, `captura contabilizada p/ J1 (${cap.mesa.captured_p1})`);

// Mudar o movimento da trilha pendente deveria falhar (mas não estamos pendentes agora)
console.log("\n— Fase 2: captures inválidas —");
// Mesa própria para não herdar contagem de peças da Fase 1 (que já dispara
// aniquilação). J1=0,1,2,3 (4 peças), J2=5,6,7,8 (4 peças), turno J2.
const MESA_B = ULTIMA(PSQL(COMO(J1, `SELECT public.criar_mesa_trilha('CAPTURA E2E', 'normal');`)));
PSQL_SEM_STOP(COMO(J2, `SELECT public.entrar_mesa_trilha('${MESA_B}');`));
PSQL(`UPDATE public.mesas_trilha
      SET phase = 'moving', hand_p1 = 0, hand_p2 = 0,
          board = ARRAY[1,1,1,1,0,2,2,2, 2,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0]::INTEGER[],
          turn = 2, pending_capture = FALSE, last_move_from = NULL, last_move_to = NULL
      WHERE mesa_id = '${MESA_B}';`);
// J2 move 5 → 13 (adjacente no eixo), sem captura
r1 = jogada(J2, MESA_B, { from: 5, to: 13, remove: null });
ok(r1.ok && r1.mesa.turn === 1, "J2 move 5→13 (sem captura) → turno J1");

// J1 tenta capturar sem trilha fechada
r1 = jogada(J1, MESA_B, { from: 0, to: 7, remove: 13 });
ok(!r1.ok, "captura sem trilha fechada é rejeitada");

console.log("\n— Fase 3: fim de jogo por aniquilação (2 peças) —");
// J2 já fechou trilha (moinho 16,17,18) e está com captura pendente.
// 3a) Capturar até J1 ficar com 3 peças: jogo CONTINUA (voo).
PSQL(`UPDATE public.mesas_trilha
      SET phase = 'moving',
          board = ARRAY[1,1,1,1,0,0,0,0, 0,0,0,0,0,0,0,0, 2,2,2,0,0,0,0,0]::INTEGER[],
          hand_p1 = 0, hand_p2 = 0, turn = 2, pending_capture = TRUE,
          last_move_from = 22, last_move_to = 18, last_move_remove = NULL, seq_jogada = 0
      WHERE mesa_id = '${MESA}';`);
// J1 tem 4 peças (0,1,2,3). J2 captura 3 → J1 fica com 3 peças → NÃO finaliza.
let fin = jogada(J2, MESA, { from: 22, to: 18, remove: 3 });
ok(fin.ok && fin.mesa.status === "em_andamento", `J1 com 3 peças: jogo continua (${fin.mesa.status})`);
ok(fin.ok && fin.mesa.turn === 1, `J1 com 3 peças segue em voo (turno ${fin.mesa.turn})`);

// 3b) J2 captura mais uma → J1 fica com 2 peças → fim.
PSQL(`UPDATE public.mesas_trilha
      SET phase = 'moving',
          board = ARRAY[1,0,1,0,0,0,0,0, 0,0,0,0,0,0,0,0, 2,2,2,0,2,2,0,0]::INTEGER[],
          hand_p1 = 0, hand_p2 = 0, turn = 2, pending_capture = TRUE,
          last_move_from = 22, last_move_to = 18, last_move_remove = NULL, seq_jogada = 0
      WHERE mesa_id = '${MESA}';`);
// J1 tem 3 peças (0,2). J2 captura 2 → J1 fica com 2 → finaliza (annihilation).
fin = jogada(J2, MESA, { from: 22, to: 18, remove: 2 });
ok(fin.ok && fin.mesa.status === "finalizado", `mesa finaliza após J1 ficar com 2 peças (${fin.mesa.status})`);
ok(fin.ok && fin.mesa.vencedor_id === J2, `vencedor é J2 (${fin.mesa.vencedor_id === J2})`);
ok(fin.ok && fin.mesa.motivo_finalizacao === "annihilation", `motivo annihilation (${fin.mesa.motivo_finalizacao})`);


console.log("\n— Fase 4: bloqueio (sem movimentos) —");
// Nova mesa para teste de bloqueio. J1 move um último lance e o J2 (4+ peças)
// fica SEM movimentos legais → bloqueio. J2 tem 4 peças: 1,3,9,12 com TODOS os
// vizinhos ocupados por J1.
const MESA2 = ULTIMA(PSQL(COMO(J1, `SELECT public.criar_mesa_trilha('BLOQUEIO E2E', 'normal');`)));
PSQL_SEM_STOP(COMO(J2, `SELECT public.entrar_mesa_trilha('${MESA2}');`));
// J2 em 1,3,9,12 com TODOS os vizinhos ocupados por J1:
//  1 (0,2,9) 0=J1 2=J1 9=J2 → travado
//  3 (2,4,11) 2=J1 4=J1 11=J1 → travado
//  9 (8,10,1) 8=J1 10=J1 1=J2 → travado
//  12 (11,13) 11=J1 13=J1 → travado
// J1 tem 9 peças (0,2,4,8,10,11,13,16,23). J1 move 16→17 (anel interno,
// sem tocar em vizinhos de J2: não abre movimento novo para J2) → turno J2
// sem movimento → bloqueio.
PSQL(`UPDATE public.mesas_trilha
      SET phase = 'moving', hand_p1 = 0, hand_p2 = 0,
          board = ARRAY[1,2,1,2,1,0,0,0, 1,2,1,1,2,1,0,0, 1,0,0,0,0,0,0,1]::INTEGER[],
          turn = 1, pending_capture = FALSE, last_move_from = NULL, last_move_to = NULL, seq_jogada = 0
      WHERE mesa_id = '${MESA2}';`);
let bloc = jogada(J1, MESA2, { from: 16, to: 17, remove: null });
ok(bloc.ok && bloc.mesa.status === "finalizado" && bloc.mesa.motivo_finalizacao === "blockade",
  `bloqueio finaliza a mesa (${bloc.mesa.status}/${bloc.mesa.motivo_finalizacao})`);

// ===== 5) Reserva: não pode colocar com reserva zerada =====
console.log("\n— Fase 5: reserva (regra das 9 peças) —");
const MESA3 = ULTIMA(PSQL(COMO(J1, `SELECT public.criar_mesa_trilha('RESERVA E2E', 'normal');`)));
PSQL_SEM_STOP(COMO(J2, `SELECT public.entrar_mesa_trilha('${MESA3}');`));
PSQL(`UPDATE public.mesas_trilha
      SET hand_p1 = 0, board = ARRAY[1,1,1,1,1,1,1,1,1, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0]::INTEGER[],
          turn = 1, pending_capture = false, seq_jogada = 0, phase = 'placing'
      WHERE mesa_id = '${MESA3}';`);
let res = jogada(J1, MESA3, { from: null, to: 10, remove: null });
ok(!res.ok && /reserva/.test(res.error), "colocar com reserva zerada é rejeitado");

// ===== 6) Turno estrito: fora de turno é rejeitado =====
console.log("\n— Fase 6: turno estrito —");
const MESA4 = ULTIMA(PSQL(COMO(J1, `SELECT public.criar_mesa_trilha('TURNO E2E', 'normal');`)));
PSQL_SEM_STOP(COMO(J2, `SELECT public.entrar_mesa_trilha('${MESA4}');`));
// J1 é o turno 1; J2 tenta jogar → rejeitado.
let fora = jogada(J2, MESA4, { from: null, to: 0, remove: null });
ok(!fora.ok && /turno/.test(fora.error), "jogar fora do turno é rejeitado");

console.log(`\nResultado: ${pass} ✅ / ${fail} ❌`);
process.exit(fail ? 1 : 0);