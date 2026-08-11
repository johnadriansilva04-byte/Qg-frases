import { useState, useEffect } from "react";
import { Newspaper, TrendingUp, Clock, Sparkles, X, ChevronRight } from "lucide-react";
import { AdSlot } from "./AdSlot";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  time: string;
  category: string;
  isAd?: boolean;
}

const MOCK_NEWS: NewsItem[] = [
  {
    id: "1",
    title: "Novos jogos adicionados à Cidadela",
    summary: "Trilha e Futebol de Botão agora disponíveis para jogar online com amigos.",
    time: "2 min atrás",
    category: "Jogos",
  },
  {
    id: "2",
    title: "Biblioteca atualizada com novos livros",
    summary: "Confira as novas indicações de motivação e desenvolvimento pessoal.",
    time: "15 min atrás",
    category: "Livros",
  },
  {
    id: "3",
    title: "Gerador de frases melhorado",
    summary: "Agora com mais categorias e busca inteligente para encontrar a frase perfeita.",
    time: "1 hora atrás",
    category: "Atualizações",
  },
  {
    id: "4",
    title: "Dica do dia: Use cores únicas",
    summary: "No Futebol de Botão, escolha 3 cores diferentes para seu time personalizado.",
    time: "2 horas atrás",
    category: "Dicas",
  },
  {
    id: "5",
    title: "Recorde quebrado!",
    summary: "Jogador alcança 100 vitórias consecutivas no modo amistoso.",
    time: "3 horas atrás",
    category: "Jogos",
  },
  {
    id: "6",
    title: "Novo recurso de time personalizado",
    summary: "Crie seu próprio time com nome, número e cores únicas no cadastro.",
    time: "4 horas atrás",
    category: "Atualizações",
  },
  {
    id: "7",
    title: "Torneio expandido para 32 times",
    summary: "Agora com 8 grupos e fase de mata-mata completa com oitavas de final.",
    time: "5 horas atrás",
    category: "Jogos",
  },
  {
    id: "8",
    title: "Design cyberpunk implementado",
    summary: "Nova interface futurista na página principal da Cidadela do Pracinha.",
    time: "6 horas atrás",
    category: "Atualizações",
  },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [news, setNews] = useState<NewsItem[]>(MOCK_NEWS);

  // Simula atualização automática de notícias
  useEffect(() => {
    const interval = setInterval(() => {
      setNews(prev => {
        const shuffled = [...prev].sort(() => Math.random() - 0.5);
        return shuffled;
      });
    }, 30000); // Atualiza a cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Botão flutuante para abrir sidebar */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-110 group"
          title="Abrir notícias"
        >
          <Newspaper className="w-6 h-6" />
          <span className="absolute left-full ml-2 px-2 py-1 bg-background border border-border rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Notícias
          </span>
        </button>
      )}

      {/* Sidebar retrátil */}
      <div
        className={`fixed left-0 top-0 h-full bg-surface/50 border-r border-border z-50 transition-all duration-300 ease-in-out ${
          isOpen ? "w-80" : "w-0"
        }`}
      >
        {/* Conteúdo da sidebar */}
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-foreground">Notícias</h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lista de notícias */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {news.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-border bg-background/50 hover:border-primary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-1">
                    {item.category === "Jogos" && <TrendingUp className="w-4 h-4 text-purple-400" />}
                    {item.category === "Livros" && <Sparkles className="w-4 h-4 text-blue-400" />}
                    {item.category === "Atualizações" && <Newspaper className="w-4 h-4 text-green-400" />}
                    {item.category === "Dicas" && <Clock className="w-4 h-4 text-yellow-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {item.summary}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {item.category}
                      </span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Anúncios integrados */}
            <div className="my-4">
              <AdSlot rotulo="Anúncio Lateral" altura="min-h-[250px]" />
            </div>

            {/* Segundo bloco de anúncios */}
            <div className="my-4">
              <AdSlot rotulo="Anúncio Lateral 2" altura="min-h-[250px]" />
            </div>

            {/* Mais notícias */}
            {news.slice(0, 3).map((item) => (
              <div
                key={`${item.id}-repeat`}
                className="p-3 rounded-xl border border-border bg-background/50 hover:border-primary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-1">
                    <Newspaper className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {item.summary}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {item.category}
                      </span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground text-center">
              <p>Atualizado automaticamente</p>
              <p className="mt-1">© 2026 Cidadela do Pracinha</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay quando sidebar está aberta */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        />
      )}
    </>
  );
}
