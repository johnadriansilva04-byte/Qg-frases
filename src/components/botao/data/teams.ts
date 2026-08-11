import { buscarTodosTimes, buscarTimePorId, type TimeDB } from "@/lib/times.functions";

export type Team = {
  id: string;
  name: string;
  short: string;
  city: string;
  /** cor principal do botão */
  primary: string;
  /** cor secundária (borda / detalhe) */
  secondary: string;
  /** força base 60-90, usada pela IA e sorteios */
  power: number;
};

// Times locais como fallback
export const TEAMS: Team[] = [
  { id: "fla", name: "Rubro-Negro Carioca", short: "RNC", city: "Rio de Janeiro", primary: "#c8102e", secondary: "#111111", power: 88 },
  { id: "pal", name: "Alviverde Paulista", short: "ALP", city: "São Paulo", primary: "#0b7a3b", secondary: "#f2f2f2", power: 87 },
  { id: "cor", name: "Alvinegro do Parque", short: "ADP", city: "São Paulo", primary: "#1a1a1a", secondary: "#ffffff", power: 84 },
  { id: "spf", name: "Tricolor do Morumbi", short: "TDM", city: "São Paulo", primary: "#e21c21", secondary: "#111111", power: 83 },
  { id: "gre", name: "Imortal Tricolor", short: "IMT", city: "Porto Alegre", primary: "#0d6bb0", secondary: "#111111", power: 84 },
  { id: "int", name: "Colorado Gaúcho", short: "COG", city: "Porto Alegre", primary: "#d10a11", secondary: "#ffffff", power: 82 },
  { id: "atl", name: "Galo Mineiro", short: "GAL", city: "Belo Horizonte", primary: "#181818", secondary: "#ededed", power: 85 },
  { id: "cru", name: "Raposa Celeste", short: "RAC", city: "Belo Horizonte", primary: "#1b3f95", secondary: "#ffffff", power: 80 },
  { id: "flu", name: "Tricolor das Laranjeiras", short: "TDL", city: "Rio de Janeiro", primary: "#7a1b3a", secondary: "#0d6b3f", power: 81 },
  { id: "vas", name: "Cruz-Maltino", short: "CRM", city: "Rio de Janeiro", primary: "#111111", secondary: "#ffffff", power: 76 },
  { id: "bot", name: "Estrela Solitária", short: "ESO", city: "Rio de Janeiro", primary: "#222222", secondary: "#f5f5f5", power: 79 },
  { id: "san", name: "Peixe da Vila", short: "PXV", city: "Santos", primary: "#f4f4f4", secondary: "#111111", power: 75 },
  { id: "bah", name: "Tricolor de Aço", short: "TDA", city: "Salvador", primary: "#1e64c8", secondary: "#e2231a", power: 77 },
  { id: "vit", name: "Leão da Barra", short: "LDB", city: "Salvador", primary: "#c8102e", secondary: "#111111", power: 72 },
  { id: "spo", name: "Leão da Ilha", short: "LDI", city: "Recife", primary: "#c8102e", secondary: "#111111", power: 71 },
  { id: "nau", name: "Timbu Alvirrubro", short: "TAR", city: "Recife", primary: "#e2231a", secondary: "#ffffff", power: 68 },
  { id: "for", name: "Leão do Pici", short: "LDP", city: "Fortaleza", primary: "#0b3f8f", secondary: "#e2231a", power: 78 },
  { id: "cea", name: "Vozão Alvinegro", short: "VOZ", city: "Fortaleza", primary: "#1a1a1a", secondary: "#ffffff", power: 73 },
  { id: "cap", name: "Furacão Paranaense", short: "FUR", city: "Curitiba", primary: "#c8102e", secondary: "#111111", power: 79 },
  { id: "cor2", name: "Coxa Alviverde", short: "COX", city: "Curitiba", primary: "#0b6b3a", secondary: "#ffffff", power: 70 },
  { id: "gua", name: "Bugre Campineiro", short: "BUG", city: "Campinas", primary: "#0b7a3b", secondary: "#ffffff", power: 66 },
  { id: "pon", name: "Macaca Alvinegra", short: "MAC", city: "Campinas", primary: "#1a1a1a", secondary: "#ffffff", power: 65 },
  { id: "goi", name: "Esmeraldino", short: "ESM", city: "Goiânia", primary: "#0a7d43", secondary: "#ffffff", power: 69 },
  { id: "cui", name: "Dourado do Centro-Oeste", short: "DOU", city: "Cuiabá", primary: "#0f9b4c", secondary: "#f7d117", power: 64 },
  { id: "ame", name: "Coelho Mineiro", short: "COE", city: "Belo Horizonte", primary: "#0b6b3a", secondary: "#e2231a", power: 67 },
  { id: "juv", name: "Jaconero Serrano", short: "JAC", city: "Caxias do Sul", primary: "#1a7a3f", secondary: "#111111", power: 63 },
  { id: "cri", name: "Tigre Catarinense", short: "TIG", city: "Criciúma", primary: "#f2c500", secondary: "#111111", power: 62 },
  { id: "ava", name: "Leão da Ilha Sul", short: "LIS", city: "Florianópolis", primary: "#0e5ba6", secondary: "#ffffff", power: 61 },
  { id: "rem", name: "Leão Azul do Norte", short: "LAZ", city: "Belém", primary: "#0b3f8f", secondary: "#ffffff", power: 60 },
  { id: "pay", name: "Papão da Curuzu", short: "PAP", city: "Belém", primary: "#1a1a1a", secondary: "#0b7a3b", power: 60 },
  { id: "sam", name: "Peixe do Nordeste", short: "PXN", city: "Aracaju", primary: "#c8102e", secondary: "#ffffff", power: 58 },
  { id: "abc", name: "Alvinegro Potiguar", short: "ALP2", city: "Natal", primary: "#111111", secondary: "#ffffff", power: 58 },
];

// Cache de times do banco de dados
let cachedTeams: Team[] | null = null;

async function loadTeamsFromDB(): Promise<Team[]> {
  if (cachedTeams) return cachedTeams;
  
  try {
    const timesDB = await buscarTodosTimes();
    cachedTeams = timesDB.map((t) => ({
      id: t.id,
      name: t.nome,
      short: t.abreviacao,
      city: t.pais,
      primary: t.cores[0] || '#000000',
      secondary: t.cores[1] || '#ffffff',
      power: 75, // Poder padrão, pode ser ajustado no futuro
    }));
    return cachedTeams;
  } catch (error) {
    console.error('Erro ao carregar times do banco:', error);
    return TEAMS;
  }
}

export async function getAllTeams(): Promise<Team[]> {
  return await loadTeamsFromDB();
}

export async function teamById(id: string): Promise<Team> {
  const teams = await loadTeamsFromDB();
  return teams.find((t) => t.id === id) ?? teams[0]!;
}

export function teamByIdSync(id: string): Team {
  return TEAMS.find((t) => t.id === id) ?? TEAMS[0]!;
}

export function createCustomTeam(
  id: string,
  name: string,
  short: string,
  primary: string,
  secondary: string,
  power: number = 75
): Team {
  return { id, name, short, city: "Personalizado", primary, secondary, power };
}
