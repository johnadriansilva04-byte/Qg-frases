/**
 * Rede da Cidadela — feed social reativo.
 * Eventos reais do jogo (vitória, derrota, goleada, crise) viram posts com
 * comentários de NPCs reagindo conforme o relacionamento com o treinador.
 */

import type { CareerState } from "../types";
import { memoriaRpg } from "./rpgEngine";
import { personagem, relacaoInicial } from "./personagens";
import { faixaRelacao, type NpcId, type PostFeed } from "./types";

type ResultadoPartida = {
  tipo: "vitoria" | "empate" | "derrota" | "goleada_pro" | "goleada_contra";
  timeNome: string;
  adversarioNome: string;
  golsPro: number;
  golsContra: number;
  divisao: string;
};

const DIVISAO_TXT: Record<string, string> = {
  "serie-a": "Série A",
  "serie-b": "Série B",
  "serie-c": "Série C",
};

function textoPostOficial(r: ResultadoPartida, coach: string): string {
  const div = DIVISAO_TXT[r.divisao] ?? "Liga";
  switch (r.tipo) {
    case "goleada_pro":
      return `GOLEADA HISTÓRICA! ${r.timeNome} atropela o ${r.adversarioNome} por ${r.golsPro}x${r.golsContra} na ${div}. O trabalho de ${coach} começa a assustar a Cidadela.`;
    case "vitoria":
      return `${r.timeNome} vence o ${r.adversarioNome} por ${r.golsPro}x${r.golsContra} e segue firme na ${div}. ${coach} respira aliviado no banco.`;
    case "empate":
      return `Tudo igual: ${r.timeNome} e ${r.adversarioNome} ficam no ${r.golsPro}x${r.golsContra}. Ponto amargo para ${coach}.`;
    case "goleada_contra":
      return `PESADELO NA ${div.toUpperCase()}: ${r.timeNome} é massacrado por ${r.golsContra}x${r.golsPro} pelo ${r.adversarioNome}. A noite vai ser longa para ${coach}.`;
    case "derrota":
      return `${r.timeNome} perde para o ${r.adversarioNome} por ${r.golsContra}x${r.golsPro}. A pressão sobre ${coach} aumenta na ${div}.`;
  }
}

function comentarioNpc(npcId: NpcId, score: number, r: ResultadoPartida, coach: string): string | null {
  const faixa = faixaRelacao(score);
  const vitoria = r.tipo === "vitoria" || r.tipo === "goleada_pro";
  const derrota = r.tipo === "derrota" || r.tipo === "goleada_contra";

  if (npcId === "npc-braganca") {
    if (vitoria) return "Sorte de principiante. Espera até me enfrentar. 😏";
    if (derrota) return faixa === "inimigo" || faixa === "hostil" ? "EU AVISEI. O abismo tá logo ali, professor." : "Dia ruim. Acontece até com os bons.";
    return null;
  }
  if (npcId === "npc-torcedor") {
    if (r.tipo === "goleada_pro") return "É O MISTER! PINTA O MURO DE VERDE! 📣🔥";
    if (vitoria) return "VAMOOO! Hoje teve raça, professor! 📣";
    if (r.tipo === "goleada_contra") return "Tô sem palavras. Minha avó chorou. CHOROU, professor.";
    if (derrota) return faixa === "hostil" ? "FORA! Já deu, né?" : "Cabeça erguida, professor. A gente acredita.";
    return null;
  }
  if (npcId === "npc-valeria") {
    if (vitoria) return "Te vi no banco hoje. Orgulho de você. 💛";
    if (derrota) return "Não lê os comentários, amor. Me liga quando chegar. 💛";
    return null;
  }
  if (npcId === "npc-dario") {
    if (vitoria) return "Bons números, treinador. O mercado está de olho. 🕴️";
    if (derrota) return "Resultado é o único currículo que importa. Cuidado com a sequência.";
    return null;
  }
  if (npcId === "npc-corretor" && derrota) {
    return score < 0 ? "Noites difíceis pedem amigos discretos. Você sabe onde me achar. 🕶️" : null;
  }
  if (npcId === "npc-donacida" && vitoria) {
    return "Meu filho! Chorei de novo. Seu pai estaria tão orgulhoso. 👵❤️";
  }
  return null;
}

/** Gera um post da Rede após uma partida do usuário. */
export function gerarPostPartida(career: CareerState, r: ResultadoPartida): PostFeed {
  const mem = memoriaRpg(career);
  const coach = career.coach.nome;
  const npcsComentaristas: NpcId[] = ["npc-braganca", "npc-torcedor", "npc-valeria", "npc-dario", "npc-corretor", "npc-donacida"];

  const comentarios = npcsComentaristas
    .map((id) => {
      const score = mem.relacoes[id] ?? relacaoInicial(id);
      const texto = comentarioNpc(id, score, r, coach);
      if (!texto) return null;
      const p = personagem(id);
      return { autor: p.nome, avatar: p.avatar, texto };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .slice(0, 4);

  const vitoria = r.tipo === "vitoria" || r.tipo === "goleada_pro";
  return {
    id: `post-${Date.now()}`,
    autor: "Gazeta da Cidadela",
    avatar: "📰",
    selo: "noticia",
    texto: textoPostOficial(r, coach),
    curtidas: Math.floor(Math.random() * 300) + (vitoria ? 120 : 30),
    comentarios,
    rodada: career.rodadaAtual,
    timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

/** Post de reação social a um evento RPG (demissão, crise, escândalo). */
export function gerarPostEvento(career: CareerState, titulo: string, tom: string): PostFeed {
  const coach = career.coach.nome;
  const textos: Record<string, string> = {
    terror: `RUMOR SOMBRIO: algo estranho circula nos bastidores do clube de ${coach}. A Gazeta apura. "${titulo}"`,
    suspense: `BASTIDORES: "${titulo}" — fontes próximas ao clube de ${coach} evitam comentar. O silêncio diz muito.`,
    drama: `"${titulo}" — a história que move os corredores do clube de ${coach} nesta rodada.`,
  };
  return {
    id: `post-ev-${Date.now()}`,
    autor: "Fofoca da Arquibancada",
    avatar: "👤",
    selo: "rumor",
    texto: textos[tom] ?? textos["drama"]!,
    curtidas: Math.floor(Math.random() * 180) + 40,
    comentarios: [
      { autor: "Zé do Arquibanco", avatar: "📣", texto: "Isso é verdade ou é intriga da imprensa?!" },
    ],
    rodada: career.rodadaAtual,
    timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

/** Anexa post ao feed persistido (máx 25). */
export function anexarPost(career: CareerState, post: PostFeed): CareerState {
  return { ...career, feedCidadela: [post, ...(career.feedCidadela ?? [])].slice(0, 25) };
}
