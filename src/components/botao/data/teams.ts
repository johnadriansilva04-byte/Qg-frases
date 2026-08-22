import { buscarTodosTimes, type TimeDB } from "@/lib/times.functions";

export type TeamDivision = "serie-a" | "serie-b" | "serie-c";

export type Team = {
  id: string;
  name: string;
  short: string;
  city: string;
  primary: string;
  secondary: string;
  power: number;
  botoesNomes?: string[] | undefined;
  escudo?: string;
  divisaoInicial?: TeamDivision | undefined;
};

const t = (
  id: string,
  name: string,
  short: string,
  city: string,
  primary: string,
  secondary: string,
  power: number,
  divisaoInicial: TeamDivision,
  escudo = "",
): Team => ({ id, name, short, city, primary, secondary, power, divisaoInicial, escudo });

// Base ficcional de 60 clubes, deduplicada e ordenada por divisão inicial.
export const TEAMS: Team[] = [
t("fla", "Rubro-Negro do Rio (RJ)", "RNR", "Rio de Janeiro", "#c8102e", "#111111", 88, "serie-a", "🔴"),
  t("pal", "Alviverde Paulista (SP)", "ALP", "São Paulo", "#0b7a3b", "#f2f2f2", 87, "serie-a", "🐖"),
  t("atl", "Galo das Minas (MG)", "GAL", "Belo Horizonte", "#181818", "#ededed", 85, "serie-a", "🐔"),
  t("cor", "Alvinegro do Parque (SP)", "ADP", "São Paulo", "#1a1a1a", "#ffffff", 84, "serie-a", "⚪"),
  t("gre", "Imortal Gaúcho (RS)", "IMT", "Porto Alegre", "#0d6bb0", "#111111", 84, "serie-a", "🔵"),
  t("spf", "Tricolor do Morumbi (SP)", "TDM", "São Paulo", "#e21c21", "#111111", 83, "serie-a", "🔺"),
  t("intb", "Colorado Gaúcho (RS)", "COG", "Porto Alegre", "#d10a11", "#ffffff", 82, "serie-a", "🔴"),
  t("flu", "Tricolor das Laranjeiras (RJ)", "TDL", "Rio de Janeiro", "#7a1b3a", "#0d6b3f", 81, "serie-a", "🟢"),
  t("cru", "Raposa Celeste (MG)", "RAC", "Belo Horizonte", "#1b3f95", "#ffffff", 80, "serie-a", "🦊"),
  t("bot", "Estrela Carioca (RJ)", "ESO", "Rio de Janeiro", "#222222", "#f5f5f5", 79, "serie-a", "⭐"),
  t("cap", "Furacão Paranaense (PR)", "FUR", "Curitiba", "#c8102e", "#111111", 79, "serie-a", "🌪️"),
  t("for", "Leão do Pici (CE)", "LDP", "Fortaleza", "#0b3f8f", "#e2231a", 78, "serie-a", "🦁"),
  t("bah", "Tricolor de Aço (BA)", "TDA", "Salvador", "#1e64c8", "#e2231a", 77, "serie-a", "🟦"),
  t("vas", "Cruzmaltino do Rio (RJ)", "CRM", "Rio de Janeiro", "#111111", "#ffffff", 76, "serie-a", "✝️"),
  t("san", "Peixe da Vila (SP)", "PXV", "Santos", "#f4f4f4", "#111111", 75, "serie-a", "🐟"),
  t("cax", "Imperial Serrano (RS)", "IMP", "Caxias do Sul", "#1b3f95", "#f7d117", 74, "serie-a", "🏔️"),
  t("cea", "Vozão de Fortaleza (CE)", "VOZ", "Fortaleza", "#1a1a1a", "#ffffff", 73, "serie-a", "👴"),
  t("vit", "Leão da Barra (BA)", "LDB", "Salvador", "#c8102e", "#111111", 72, "serie-a", "🦁"),
  t("spo", "Leão da Ilha (PE)", "LDI", "Recife", "#c8102e", "#111111", 71, "serie-a", "🦁"),
  t("fig", "Figueira de Floripa (SC)", "FIG", "Florianópolis", "#111111", "#ffffff", 70, "serie-a", "🌳"),
  t("cha", "Verdão do Oeste (SC)", "VDO", "Chapecó", "#0b7a3b", "#f7d117", 70, "serie-b", "🟩"),
  t("bru", "Auriverde de Bauru (SP)", "AUR", "Bauru", "#0e5ba6", "#f2c500", 70, "serie-b", "🟡"),
  t("cor2", "Coxa Alviverde (PR)", "COX", "Curitiba", "#0b6b3a", "#ffffff", 69, "serie-b", "🟢"),
  t("goi", "Esmeraldino de Goiás (GO)", "ESM", "Goiânia", "#0a7d43", "#ffffff", 69, "serie-b", "💚"),
  t("nau", "Timbu Alvirrubro (PE)", "TAR", "Recife", "#e2231a", "#ffffff", 68, "serie-b", "⚓"),
  t("par", "Domínio Paraense (PA)", "DPR", "Belém", "#0b3f8f", "#ffffff", 67, "serie-b", "🦅"),
  t("vil", "Tigre Colorada (MG)", "TIC", "Nova Lima", "#e2231a", "#ffe500", 67, "serie-b", "🐯"),
  t("ame", "Coelho Mineiro (MG)", "COE", "Belo Horizonte", "#0b6b3a", "#e2231a", 67, "serie-b", "🐇"),
  t("lon", "Tubarão do Norte (PR)", "TUB", "Londrina", "#0e5ba6", "#ffffff", 66, "serie-b", "🦈"),
  t("gua", "Bugre Campineiro (SP)", "BUG", "Campinas", "#0b7a3b", "#ffffff", 66, "serie-b", "🐐"),
  t("itu", "Galo de Itu (SP)", "GIN", "Itu", "#e2231a", "#111111", 65, "serie-b", "🐔"),
  t("cui", "Dourado de Cuiabá (MT)", "DOU", "Cuiabá", "#0f9b4c", "#f7d117", 64, "serie-b", "🟨"),
  t("mir", "Leão Preto (SP)", "LEA", "Mogi Mirim", "#111111", "#f2c500", 64, "serie-b", "🦁"),
  t("juvbr", "Jaconero Serrano (RS)", "JAC", "Caxias do Sul", "#1a7a3f", "#111111", 63, "serie-b", "🟢"),
  t("cri", "Tigre Catarinense (SC)", "TIG", "Criciúma", "#f2c500", "#111111", 62, "serie-b", "🐯"),
  t("ava", "Leão da Ilha Sul (SC)", "LIS", "Florianópolis", "#0e5ba6", "#ffffff", 61, "serie-b", "🦁"),
  t("rem", "Leão Azul do Pará (PA)", "LAZ", "Belém", "#0b3f8f", "#ffffff", 60, "serie-b", "🦁"),
  t("pay", "Papão da Curuzu (PA)", "PAP", "Belém", "#1a1a1a", "#0b7a3b", 60, "serie-b", "🍫"),
  t("abc", "Alvinegro Potiguar (RN)", "ALP2", "Natal", "#111111", "#ffffff", 58, "serie-b", "⚫"),
  t("sam", "Azulino do Maranhão (MA)", "AZS", "São Luís", "#0e5ba6", "#ffffff", 58, "serie-b", "🔷"),
  t("pon", "Macaca Campineira (SP)", "MAC", "Campinas", "#1a1a1a", "#ffffff", 65, "serie-c", "🐒"),
  t("joi", "Jec de Joinville (SC)", "JEC", "Joinville", "#0b7a3b", "#ffffff", 62, "serie-c", "🐰"),
  t("fer", "Ferroviária de Araraquara (SP)", "MFE", "Araraquara", "#8b1a1a", "#ffffff", 61, "serie-c", "🚂"),
  t("nov", "Tigre do Vale (SP)", "TIV", "Novo Horizonte", "#f2c500", "#111111", 60, "serie-c", "🐯"),
  t("tup", "Azul Carvoeiro (SC)", "AZL", "Criciúma", "#0e5ba6", "#ffffff", 59, "serie-c", "🔵"),
  t("opo", "Fantasma de Ouro Preto (MG)", "FAN", "Ouro Preto", "#111111", "#ffffff", 58, "serie-c", "👻"),
  t("cal", "Calanga do Cariri (CE)", "CLD", "Juazeiro do Norte", "#0b7a3b", "#f7d117", 58, "serie-c", "🟢"),
  t("tom", "Gavião de Feira (BA)", "GAV", "Feira de Santana", "#e2231a", "#111111", 57, "serie-c", "🦅"),
  t("mot", "Moto de São Luís (MA)", "MRN", "São Luís", "#c8102e", "#111111", 57, "serie-c", "🏍️"),
  t("csa", "Azulão de Maceió (AL)", "AZM", "Maceió", "#0e5ba6", "#ffffff", 56, "serie-c", "🔵"),
  t("crb", "Galício de Pajuçara (AL)", "GPA", "Maceió", "#d10a11", "#ffffff", 56, "serie-c", "⚓"),
  t("ser", "Corno do Sertão (PE)", "CSR", "Petrolina", "#e2231a", "#111111", 55, "serie-c", "🐐"),
  t("cam", "Aymoré de Campo Grande (MS)", "AYS", "Campo Grande", "#0b3f8f", "#f7d117", 55, "serie-c", "🌵"),
  t("tre", "Trevo de Palmas (TO)", "TRP", "Palmas", "#0b7a3b", "#111111", 54, "serie-c", "🍀"),
  t("nor", "Nortuno do Amapá (AP)", "NAP", "Macapá", "#0e5ba6", "#f7d117", 54, "serie-c", "🧭"),
  t("asa", "Aurico de Arapiraca (AL)", "AUR2", "Arapiraca", "#f2c500", "#111111", 53, "serie-c", "🌵"),
  t("jacu", "Jacu do Norte (RN)", "JDN", "Natal", "#111111", "#ffffff", 52, "serie-c", "🐦"),
  t("riv", "Palomino de Aracaju (SE)", "PLI", "Aracaju", "#7a1b3a", "#0b3f8f", 52, "serie-c", "🐴"),
  t("alt", "Alta Colina (MG)", "ALC", "Poços de Caldas", "#0b6b3a", "#ffffff", 51, "serie-c", "⛰️"),
  t("botpb", "Beltrão Paraibano (PB)", "BTP", "João Pessoa", "#c8102e", "#111111", 51, "serie-c", "⭐"),
];

export const DIVISIONS: TeamDivision[] = ["serie-a", "serie-b", "serie-c"];

let cachedTeams: Team[] | null = null;
let cachedTeamsSyncData: Team[] = TEAMS;

function mapDbTeam(tdb: TimeDB): Team {
  const local = TEAMS.find((x) => x.id === tdb.id);
  return {
    id: tdb.id,
    name: tdb.nome,
    short: tdb.abreviacao || local?.short || tdb.nome.slice(0, 3).toUpperCase(),
    city: tdb.pais || local?.city || "Internacional",
    primary: tdb.cores[0] || local?.primary || "#000000",
    secondary: tdb.cores[1] || local?.secondary || "#ffffff",
    power: tdb.forca ?? local?.power ?? 70,
    escudo: local?.escudo || "",
    divisaoInicial: tdb.divisao ?? local?.divisaoInicial,
  };
}

async function loadTeamsFromDB(): Promise<Team[]> {
  if (cachedTeams) return cachedTeams;
  try {
    const timesDB = await buscarTodosTimes();
    const merged = new Map<string, Team>();
    for (const team of TEAMS) merged.set(team.id, team);
    for (const row of timesDB) {
      if (row.is_personalizado) continue;
      merged.set(row.id, mapDbTeam(row));
    }
    cachedTeams = Array.from(merged.values());
    cachedTeamsSyncData = cachedTeams;
    return cachedTeams;
  } catch (error) {
    console.error("Erro ao carregar times do banco:", error);
    cachedTeams = TEAMS;
    cachedTeamsSyncData = TEAMS;
    return TEAMS;
  }
}

export async function preloadTeams(): Promise<void> {
  await loadTeamsFromDB();
}

export function cachedTeamsSync(): Team[] {
  return cachedTeamsSyncData;
}

export async function getAllTeams(): Promise<Team[]> {
  return await loadTeamsFromDB();
}

export async function teamById(id: string): Promise<Team> {
  const teams = await loadTeamsFromDB();
  return teams.find((team) => team.id === id) ?? TEAMS.find((team) => team.id === id) ?? TEAMS[0]!;
}

export function teamByIdSync(id: string): Team {
  const fromDb = cachedTeamsSyncData.find((team) => team.id === id);
  if (fromDb) return fromDb;
  return TEAMS.find((team) => team.id === id) ?? TEAMS[0]!;
}

export function timesDaDivisao(divisao: TeamDivision): Team[] {
  const base = cachedTeamsSyncData.filter((team) => team.divisaoInicial === divisao);
  return base.length > 0 ? base : TEAMS.filter((team) => team.divisaoInicial === divisao);
}

export function createCustomTeam(
  id: string,
  name: string,
  short: string,
  primary: string,
  secondary: string,
  power = 75,
  botoesNomes?: string[],
  divisaoInicial: TeamDivision = "serie-c",
): Team {
  return { id, name, short, city: "Personalizado", primary, secondary, power, botoesNomes, divisaoInicial };
}
