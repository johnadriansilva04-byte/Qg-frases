import { teamByIdSync } from "../data/teams";
import type { Fixture, Tournament } from "../types";
import type { Coach, Headline } from "./types";

let uid = 0;
const nextId = () => `hl-${Date.now()}-${uid++}`;

// Nomes de treinadores fictícios para cada time
const TREINADORES: Record<string, string> = {
  "fla": "Jorge Jesus",
  "flu": "Fernando Diniz",
  "vas": "Rafael Paiva",
  "bot": "Bruno Lage",
  "saopaulo": "Hernán Crespo",
  "pal": "Abel Ferreira",
  "cor": "Vanderlei Luxemburgo",
  "santos": "Fábio Carille",
  "gre": "Renato Gaúcho",
  "int": "Diego Aguirre",
  "cru": "Luiz Felipe Scolari",
  "atl": "Cuca",
  "bah": "Roger Machado",
  "for": "Juan Pablo Vojvoda",
  "cear": "Enderson Moreira",
  "fort": "Vojvoda",
  "goi": "Rogério Ceni",
  "cui": "Marcelo Cabo",
  "ava": "Geninho",
  "sport": "Oliveira",
  "juv": "Mazzarri",
  "mil": "Pioli",
  "intmil": "Inzaghi",
  "nap": "Spalletti",
  "rom": "Mourinho",
  "laz": "Sarri",
  "inter": "Simone",
  "ata": "Simeone",
  "bar": "Xavi",
  "real": "Ancelotti",
  "val": "Gattuso",
  "sev": "Lopetegui",
  "bet": "Pellegrini",
  "vil": "Emery",
  "soc": "Iraola",
  "ath": "Simeone",
  "esp": "Mendilibar",
  "ray": "Iraola",
  "get": "Quique",
  "mal": "Pellicer",
  "cad": "Alcaraz",
  "alm": "Pellegrini",
  "elc": "Míchel",
  "lev": "Pacheta",
  "valc": "Rubén Baraja",
  "gij": "Coudet",
  "vll": "Pacheta",
  "osa": "Arrasate",
  "mai": "Míchel",
  "bil": "Valverde",
  "rea": "Iraola",
  "cel": "Coudet",
  "vilr": "Pellegrini",
  "spo": "Rubén Baraja",
  "gir": "Gennaro Gattuso",
  "sas": "Roberto De Zerbi",
  "ver": "Gasperini",
  "tor": "Juric",
  "lag": "Lucas",
  "udin": "Gotti",
  "lec": "Baroni",
  "mon": "Stankovic",
  "bolog": "Mihajlovic",
  "cre": "Baroni",
  "gen": "Gilardino",
  "samp": "Stankovic",
  "emp": "Paolo Zanetti",
  "sal": "D'Aversa",
  "ven": "Zanetti",
  "bre": "Italiano",
  "fio": "Italiano",
  "romaa": "Mourinho",
  "lazio": "Sarri",
  "napoli": "Spalletti",
  "juve": "Allegri",
  "milan": "Pioli",
  "intermil": "Inzaghi",
  "atm": "Simeone",
  "barca": "Xavi",
  "realm": "Ancelotti",
  "sevil": "Lopetegui",
  "villar": "Emery",
  "reals": "Ancelotti",
  "atlb": "Simeone",
  "barcb": "Xavi",
  "realmc": "Ancelotti",
  "juveb": "Allegri",
  "milanb": "Pioli",
  "intermilb": "Inzaghi",
  "napolib": "Spalletti",
  "romab": "Mourinho",
  "laziob": "Sarri",
  "atmb": "Simeone",
  "sevilb": "Lopetegui",
  "villarb": "Emery",
  "realsb": "Ancelotti",
};

const T_GERAL = [
  "{H} e {A} empatam em partida truncada",
  "{W} atropela {L} em virada dramática",
  "{W} vence com autoridade fora de casa",
  "Zebra! {W} derrota {L} de virada",
  "Clássico regional: {H} {gH} x {gA} {A}",
  "Torcida em festa: {W} avança confiante",
  "{L} decepciona torcida em derrota amarga",
  "{coachW} comemora vitória do {W}",
  "{coachL} lamenta derrota do {L}",
  "Show de {coachW}: {W} domina",
  "{coachL} cobra postura após derrota",
  "Tática de {coachW} funciona perfeitamente",
  "{coachL} promete reação imediata",
  "{W} faz festa, torcida aplaude {coachW}",
  "{L} tropeça, {coachL} assume responsabilidade",
  "{coachW}: 'Melhor jogo da temporada'",
  "{coachL}: 'Precisamos melhorar muito'",
  "Vitória histórica do {W}, diz {coachW}",
  "Derrota dura: {coachL} pede calma",
  "{W} humilha, {coachW} emocionado",
  "{L} afundado, {coachL} sob pressão",
];

const T_USER_VIT = [
  "{coach} lidera {T} rumo à glória: {gH} x {gA}",
  "{T} vence com autoridade e cresce no torneio",
  "Vitória convincente: {T} dita o ritmo",
  "{coach} comemora: {T} vence de {gH} a {gA}",
  "{coach}: 'Time respondeu muito bem'",
  "{T} domina, {coach} projeta título",
  "Jogo de {coach} funciona: {T} vence",
  "{coach} aplaude ofensiva do {T}",
  "{T} faz show, {coach} em êxtase",
  "Vitória importante, diz {coach}",
];

const T_USER_DER = [
  "{coach} promete reação após tropeço do {T}",
  "{T} tropeça e liga alerta na torcida",
  "Derrota amarga: {T} precisa se reerguer",
  "{coach} lamenta derrota do {T}",
  "{coach} cobra postura após derrota",
  "{coach} admite: 'Precisamos melhorar'",
  "{T} decepciona, {coach} revisa tática",
  "Crisis no {T}: {coach} pede união",
  "{coach} pede calma após derrota",
  "{T} sofre, {coach} assume responsabilidade",
];

const T_USER_EMP = [
  "{T} empata e desperdiça chance de disparar",
  "{coach} fica insatisfeito com empate morno do {T}",
  "{T} segura empate, {coach} analisa jogo",
  "Jogo truncado: {coach} avalia {T}",
  "{T} escapa de derrota, {coach} aliviado",
  "{coach} pede evolução após empate",
  "{T} faz seu jogo, {coach} critica arbitragem",
  "Empate frustra {coach}",
];

const T_COLETIVA = [
  "Antes da rodada, {coach} garante: 'A gente vai buscar a vitória'",
  "{coach} evita polêmica: 'Respeito o adversário, mas jogamos pra vencer'",
  "'Confio no meu grupo', diz {coach} em entrevista",
  "{coach} projeta jogo duro: 'Nada será fácil'",
  "{coach}: 'Treinamos muito para isso'",
  "{coach} elogia preparação física",
  "{coach} cobra intensidade nos treinos",
  "{coach} projeta tática agressiva",
  "{coach} foca em organização defensiva",
  "{coach} promete jogo ofensivo",
];

const T_POLEMICA = [
  "Comentaristas divergem sobre o esquema tático do {T}",
  "Polêmica: torcida cobra mais garra do {T}",
  "Análise: {T} precisa ajustar a marcação",
  "Imprensa aponta: {T} oscila demais entre casa e fora",
  "Crítica do dia: {coach} é questionado por escalação conservadora",
  "Ex-jogador dispara: '{T} joga com medo de perder'",
  "{coach} rebate críticas: 'Sabemos o que fazemos'",
  "Torcida do {T} cobra mudança na tática",
  "Especialistas questionam {coach}",
  "{T} sob pressão, {coach} responde",
];

const T_LIDER = [
  "{T} assume o ponteiro: 'a pressa agora é nossa'",
  "Líder isolado! {T} abre vantagem na tabela",
  "Com {coach} no comando, {T} dispara na liderança",
  "{coach} comemora liderança do {T}",
  "{T} no topo, {coach} projeta título",
  "{coach}: 'Liderança é gratificante'",
  "{T} domina, {coach} confiante",
];

const T_REBAIXA = [
  "{T} entra na zona de rebaixamento e acende o alerta",
  "Crise: {T} acumula jogos sem vencer e cochicha demissão",
  "Torcida do {T} pede cabeça após mais um revés",
  "{coach} admite: 'Luta difícil pela sobrevivência'",
  "{T} afundado, {coach} sob fogo",
  "SOS {T}: {coach} cobra reação imediata",
  "{coach} pede união para escapar do rebaixamento",
];

const T_MATA = [
  "Mata-mata começa: {T} encara jogo duro nas {stage}",
  "{coach} garante: 'mata-mata é outra história, vamos pra cima'",
  "Eliminação ronda o {T} após tropeço nas {stage}",
  "Classificação dramática! {T} avança nas {stage}",
  "{coach}: 'Mata-mata exige concentração total'",
  "{T} focado, diz {coach}",
];

const T_SUBORNO = [
  "Imprensa investiga reunião suspeita envolvendo comissão do {T}",
  "Boato: estranho é visto no estacionamento após jogo do {T}",
  "Coluna do dia: 'algo cheira mal no futebol de botão'",
  "Diretoria do {T} nega qualquer irregularidade",
  "Rumor: envelope misterioso circula no {T}",
  "{T} envolvido em polêmica de suborno",
];

const T_GOLEADA = [
  "GOLEADA! {W} destrói adversário",
  "{coachW}: 'Melhor jogo da temporada'",
  "{W} faz show, {coachW} aplaude time",
  "Festival de gols: {W} domina",
  "{coachW} elogia ofensiva do {W}",
  "{W} humilha, {coachW} comemora",
  "Massacre! {W} goleia, {coachL} em choque",
];

const T_ZEBRA = [
  "ZEBRA! {W} surpreende e vence",
  "{coachW} comemora vitória histórica do {W}",
  "{W} faz milagre, {coachW} emocionado",
  "Sensação! {W} vence, {coachW} em êxtase",
  "{W} choca o futebol, {coachW} herói",
  "Vitória inacreditável do {W}, diz {coachW}",
  "Imprevisível! {W} vence, {coachL} perplexo",
];

const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]!;

function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_m, k) => String(vars[k] ?? ""));
}

function getTreinador(teamId: string): string {
  const team = teamByIdSync(teamId);
  return TREINADORES[team?.short?.toLowerCase() || ""] || "Treinador";
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
    const diff = Math.abs(f.result.homeGoals - f.result.awayGoals);
    
    // Escolher template baseado no resultado
    let template;
    if (diff >= 4) {
      template = pick(T_GOLEADA);
    } else if (diff >= 3) {
      template = pick(T_ZEBRA);
    } else {
      template = pick(T_GERAL);
    }

    const coachW = winId ? getTreinador(winId) : "";
    const coachL = winId ? getTreinador(winId === f.homeId ? f.awayId : f.homeId) : "";

    news.push({
      id: nextId(),
      manchete: fill(template, {
        H: h.short,
        A: a.short,
        W,
        L,
        gH: f.result.homeGoals,
        gA: f.result.awayGoals,
        coachW,
        coachL,
      }),
      tag: diff >= 3 ? "zebra" : "geral",
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
      manchete: fill(pick(T_POLEMICA), { T: userTeamName, coach: coach.apelido || coach.nome || "Treinador" }),
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
