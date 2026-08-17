import { teamByIdSync } from "../data/teams";
import type { Fixture, Tournament } from "../types";
import type { Coach, Headline } from "./types";

let uid = 0;
const nextId = () => `hl-${Date.now()}-${uid++}`;

const T_GERAL = [
  "{H} e {A} empatam em partida truncada",
  "{W} atropela {L} em virada dramática",
  "{W} vence com autoridade fora de casa",
  "Zebra! {W} derrota {L} de virada",
  "Clássico regional: {H} {gH} x {gA} {A}",
  "Torcida em festa: {W} avança confiante",
  "{L} decepciona torcida em derrota amarga",
];

const T_USER_VIT = [
  "{coach} lidera {T} rumo à glória: {gH} x {gA}",
  "{T} vence com autoridade e cresce no torneio",
  "Vitória convincente: {T} dita o ritmo",
  "{coach} comemora: {T} vence de {gH} a {gA}",
];

const T_USER_DER = [
  "{coach} promete reação após tropeço do {T}",
  "{T} tropeça e liga alerta na torcida",
  "Derrota amarga: {T} precisa se reerguer",
];

const T_USER_EMP = [
  "{T} empata e desperdiça chance de disparar",
  "{coach} fica insatisfeito com empate morno do {T}",
];

const T_COLETIVA = [
  "Antes da rodada, {coach} garante: 'A gente vai buscar a vitória'",
  "{coach} evita polêmica: 'Respeito o adversário, mas jogamos pra vencer'",
  "'Confio no meu grupo', diz {coach} em entrevista",
  "{coach} projeta jogo duro: 'Nada será fácil'",
];

const T_POLEMICA = [
  "Comentaristas divergem sobre o esquema tático do {T}",
  "Polêmica: torcida cobra mais garra do {T}",
  "Análise: {T} precisa ajustar a marcação",
  "Imprensa aponta: {T} oscila demais entre casa e fora",
  "Crítica do dia: {coach} é questionado por escalação conservadora",
  "Ex-jogador dispara: '{T} joga com medo de perder'",
];

const T_LIDER = [
  "{T} assume o ponteiro: 'a pressa agora é nossa'",
  "Líder isolado! {T} abre vantagem na tabela",
  "Com {coach} no comando, {T} dispara na liderança",
];

const T_REBAIXA = [
  "{T} entra na zona de rebaixamento e acende o alerta",
  "Crise: {T} acumula jogos sem vencer e cochicha demissão",
  "Torcida do {T} pede cabeça após mais um revés",
];

const T_MATA = [
  "Mata-mata começa: {T} encara jogo duro nas {stage}",
  "{coach} garante: 'mata-mata é outra história, vamos pra cima'",
  "Eliminação ronda o {T} após tropeço nas {stage}",
  "Classificação dramática! {T} avança nas {stage}",
];

const T_SUBORNO = [
  "Imprensa investiga reunião suspeita envolvendo comissão do {T}",
  "Boato: estranho é visto no estacionamento após jogo do {T}",
  "Coluna do dia: 'algo cheira mal no futebol de botão'",
  "Diretoria do {T} nega qualquer irregularidade",
];

const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]!;

function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_m, k) => String(vars[k] ?? ""));
}

/** Gera manchetes para a rodada recém-encerrada. */
export function gerarManchetesDaRodada(
  tour: Tournament,
  userTeamName: string,
  coach: Coach,
  rodadaTexto: string,
  fixturesJogados: Fixture[],
  fixtureDoUsuario: Fixture | undefined,
  contexto?: { subornoAtivo?: boolean; posicaoUsuario?: number; totalTimes?: number },
): Headline[] {
  const news: Headline[] = [];
  const rodadaNum = tour.groupFixtures.filter((f) => f.played).length;
  const faseMata = tour.phase === "mata-mata";

  // 1. manchete principal do usuário
  if (fixtureDoUsuario?.result) {
    const r = fixtureDoUsuario.result;
    const isHome = fixtureDoUsuario.homeId === tour.userTeamId;
    const gf = isHome ? r.homeGoals : r.awayGoals;
    const ga = isHome ? r.awayGoals : r.homeGoals;
    let template: string;
    const tag: Headline["tag"] = "seu-time";
    if (gf > ga) template = pick(T_USER_VIT);
    else if (gf < ga) template = pick(T_USER_DER);
    else template = pick(T_USER_EMP);
    news.push({
      id: nextId(),
      manchete: fill(template, {
        coach: coach.apelido || coach.nome || "Treinador",
        T: userTeamName,
        gH: gf,
        gA: ga,
      }),
      subtitulo: `${rodadaTexto} · ${userTeamName} ${gf} x ${ga}`,
      tag,
      rodada: rodadaNum,
    });
  }

  // 2. algumas manchetes gerais (2 outros jogos)
  const outros = fixturesJogados.filter((f) => f.id !== fixtureDoUsuario?.id).slice(0, 2);
  outros.forEach((f) => {
    if (!f.result) return;
    const h = teamByIdSync(f.homeId);
    const a = teamByIdSync(f.awayId);
    const winId =
      f.result.homeGoals > f.result.awayGoals
        ? f.homeId
        : f.result.awayGoals > f.result.homeGoals
          ? f.awayId
          : null;
    const W = winId ? teamByIdSync(winId).short : "";
    const L = winId ? teamByIdSync(winId === f.homeId ? f.awayId : f.homeId).short : "";
    const template = pick(T_GERAL);
    news.push({
      id: nextId(),
      manchete: fill(template, {
        H: h.short,
        A: a.short,
        W,
        L,
        gH: f.result.homeGoals,
        gA: f.result.awayGoals,
      }),
      tag: "geral",
      rodada: rodadaNum,
    });
  });

  // 3. narrativa de classificação (pontos corridos / grupos)
  const pos = contexto?.posicaoUsuario;
  const total = contexto?.totalTimes ?? 0;
  if (typeof pos === "number" && total > 0) {
    if (pos === 1) {
      news.push({
        id: nextId(),
        manchete: fill(pick(T_LIDER), {
          T: userTeamName,
          coach: coach.apelido || coach.nome || "Treinador",
        }),
        subtitulo: `Classificação · ${userTeamName} é o líder`,
        tag: "seu-time",
        rodada: rodadaNum,
      });
    } else if (pos >= total - 1) {
      news.push({
        id: nextId(),
        manchete: fill(pick(T_REBAIXA), { T: userTeamName }),
        subtitulo: `Classificação · ${userTeamName} é o ${pos}º`,
        tag: "polemica",
        rodada: rodadaNum,
      });
    }
  }

  // 4. narrativa de mata-mata
  if (faseMata && fixtureDoUsuario) {
    const stage = fixtureDoUsuario.stage;
    news.push({
      id: nextId(),
      manchete: fill(pick(T_MATA), {
        T: userTeamName,
        coach: coach.apelido || coach.nome || "Treinador",
        stage,
      }),
      subtitulo: `${stage} · ${userTeamName}`,
      tag: "seu-time",
      rodada: rodadaNum,
    });
  }

  // 5. narrativa paralela de suborno (boatos) enquanto o enredo está ativo
  if (contexto?.subornoAtivo && Math.random() < 0.5) {
    news.push({
      id: nextId(),
      manchete: fill(pick(T_SUBORNO), { T: userTeamName }),
      subtitulo: "Rumores · imprensa fareja polêmica",
      tag: "polemica",
      rodada: rodadaNum,
    });
  }

  // 6. eventual polêmica ou coletiva
  if (Math.random() < 0.4) {
    news.push({
      id: nextId(),
      manchete: fill(pick(T_POLEMICA), { T: userTeamName }),
      tag: "polemica",
      rodada: rodadaNum,
    });
  }

  return news;
}

export function manchetesDeEstreia(coachNome: string, timeName: string): Headline[] {
  return [
    {
      id: nextId(),
      manchete: fill(pick(T_COLETIVA), { coach: coachNome, T: timeName }),
      subtitulo: `Coletiva de imprensa · Estreia de ${coachNome}`,
      tag: "coletiva",
      rodada: 0,
    },
    {
      id: nextId(),
      manchete: `${coachNome} assume o comando do ${timeName} para a nova temporada`,
      subtitulo: "Torcida aguarda ansiosa pelo início do torneio",
      tag: "seu-time",
      rodada: 0,
    },
  ];
}
