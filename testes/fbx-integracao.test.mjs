/* Guardas estruturais da partida 3D (disputa de cobranças) — travam as
 * causas-raiz reais:
 * 1. spawn síncrono antes do preload (engine deve fazer upgrade pós-preload);
 * 2. Object3D.clone() quebra SkinnedMesh (obrigatório SkeletonUtils.clone);
 * 3. normalização no root é destruída pelo engine (obrigatório wrapper);
 * 4. materiais/geom compartilhados com o cache (dispose/clonar com ownership);
 * 5. Match3D determinístico (sem Math.random — elenco estável no F5);
 * 6. ESCOPO: o motor é SÓ disputa de cobranças — futebol em tempo real
 *    (corrida/passe/carrinho/IA de linha) foi removido do fluxo;
 * 7. swipe é o único controle da cobrança; adversário determinístico;
 * 8. arquivos FBX existem em public e FBX_PATHS apontam para eles.
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => readFileSync(join(root, p), "utf8");

let pass = 0;
const ok = (cond, msg) => {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exitCode = 1;
    throw new Error(msg);
  }
  pass++;
  console.log(`✅ ${msg}`);
};

const cache = src("src/engine/playerModelCache.ts");
const engine = src("src/engine/MatchEngine.ts");
const view = src("src/components/match3d/Match3DView.tsx");
const match3d = src("src/components/botao/career/Match3D.tsx");
const input = src("src/engine/input.ts");

// 1. Race spawn×preload: upgrade pós-preload obrigatório
ok(/upgradeRigsToFBX/.test(engine), "MatchEngine tem upgradeRigsToFBX (rede pós-preload)");
ok(/await playerModelCache\.loadModel[\s\S]{0,300}upgradeRigsToFBX\(\)/.test(engine), "preload chama upgradeRigsToFBX ao concluir");
ok(/playerModelCache\s*\n?\s*\.loadModel/.test(view), "Match3DView inicia preload já na intro");
ok(/Promise\.race\(\[[\s\S]{0,200}modelosPromiseRef/.test(view), "startMatch aguarda preload com timeout antes de criar o engine");

// 2. Clone de SkinnedMesh
ok(/SkeletonUtils/.test(cache) && /skeletonClone\(cached\.baseModel\)/.test(cache), "cloneRig usa SkeletonUtils.clone (não Object3D.clone)");
ok(!/cached\.baseModel\.clone\(/.test(cache), "baseModel.clone(true) proibido (quebra skinning)");

// 3. Wrapper de normalização
ok(/const wrapper = new THREE\.Group\(\)[\s\S]{0,120}wrapper\.add\(inner\)/.test(cache), "cloneRig embrulha o clone num wrapper (normalização protegida)");
ok(/mixer = new THREE\.AnimationMixer\(inner\)/.test(cache), "mixer amarrado no inner (skeleton), não no wrapper");

// 4. Animações dos DOIS atores (cobrador + goleiro): clips reais + idle sem T-pose
ok(/LoopOnce/.test(engine) && /clampWhenFinished = true/.test(engine), "mergulho do goleiro é one-shot com clamp no frame final");
ok(/fadeOut\(0\.15\)/.test(engine) && /fadeIn\(0\.15\)/.test(engine), "transições de animação com cross-fade");
ok(/action\.paused = true/.test(engine) && /0\.253/.test(engine), "idle congela no frame ereto medido (nunca T-pose nem corrida lenta)");

// 5. Ownership de recursos (cache compartilhado)
ok(/userData\["ownMaterial"\] = true/.test(cache), "materiais tingidos marcados como próprios");
ok(/userData\["ownGeometry"\] = true/.test(cache), "marker marcado como geometria própria");
ok(/uncacheRoot/.test(engine), "dispose desregistra mixers do FBX");
ok(/\.clone\(\);\s*\n\s*material\.color\.copy\(target\)/.test(cache), "applyTeamColors clona material antes de tingir (times não se contaminam)");

// 6. Match3D determinístico
ok(!/Math\.random/.test(match3d), "Match3D não usa Math.random (elenco estável no F5)");
ok(/team\.power/.test(match3d), "elenco 3D deriva do power real do clube");

// 7. ESCOPO: disputa de cobranças — futebol em tempo real REMOVIDO do fluxo
ok(!/rotation\.y = Math\.PI/.test(cache), "rotation.y=π proibido no modelo (Ch38 olha +Z nativamente)");
ok(!/updateControlled|updateKeeper|startSlide|aggressiveTackle|checkOffside|doPass\(|doShot\(/.test(engine), "mecânicas de futebol em tempo real removidas do motor");
ok(/só existem DOIS/.test(engine) && /this\.players\.push\(this\.taker, this\.keeper\)/.test(engine), "só 2 atores em campo: cobrador + goleiro");
ok(/TOTAL_COBRANCAS = 15/.test(src("src/engine/cobrancas.ts")), "15 cobranças por lado");
ok(/attachSwipe\(canvas\)/.test(engine), "swipe é o controle da cobrança (dedo e mouse)");
ok(/if \(this\.phase !== "aim" \|\| this\.finished\) return/.test(engine), "cobrança só na fase aim (nunca duplicada)");
ok(/resolverCobrancaAdversaria\(setup\.matchId, i \+ 1/.test(engine), "adversário determinístico pré-computado (F5 não transforma cobrança)");
ok(!/Math\.random/.test(src("src/engine/cobrancas.ts")), "núcleo das cobranças sem Math.random solto");
ok(/resolverDesempate/.test(src("src/engine/cobrancas.ts")), "placeholder do desempate (morte súbita futura) existe");
ok(/shotIndex\+\+;/.test(engine) && /this\.shotIndex >= TOTAL_COBRANCAS/.test(engine), "contador avança 1 a 1 até 15 e encerra");
ok(/camera\.position\.set\(bolaX \+ 7\.5/.test(engine), "câmera atrás da bola, voltada para o gol");
ok(/aimLine/.test(engine), "dica discreta de trajetória durante o arraste");

// 8. Arquivos FBX reais em public
for (const f of ["Ch38_nonPBR.fbx", "Fast Run.fbx", "Goalkeeper Diving Save.fbx", "Soccer Trip.fbx"]) {
  const p = join(root, "public", f);
  ok(existsSync(p) && statSync(p).size > 100_000, `public/${f} existe e não está vazio`);
}
ok(/BASE_MODEL: "\/Ch38_nonPBR\.fbx"/.test(cache), "FBX_PATHS.BASE_MODEL aponta para /Ch38_nonPBR.fbx");
ok(/run: "\/Fast Run\.fbx"/.test(cache), "FBX_PATHS.ANIMATIONS.run correto");

console.log(`\n${pass} guardas estruturais da integração 3D/FBX OK`);
