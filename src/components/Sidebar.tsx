import { useState, useEffect } from "react";
import { Newspaper, X, ExternalLink, Clock } from "lucide-react";
import { AdSlot } from "./AdSlot";

interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
}

const RSS_FEEDS = [
  'https://g1.globo.com/rss/g1/',
  'https://rss.uol.com.br/feed/noticias.xml',
  'https://feeds.folha.uol.com.br/rss/news.xml',
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca notícias reais via RSS
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const allNews: NewsItem[] = [];

        for (const feedUrl of RSS_FEEDS) {
          try {
            // Usa rss2json API para converter RSS para JSON e evitar CORS
            const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`);
            const data = await response.json();

            if (data.status === 'ok' && data.items) {
              const items = data.items.slice(0, 5).map((item: any, index: number) => ({
                id: `${feedUrl}-${index}`,
                title: item.title,
                description: item.description?.replace(/<[^>]*>/g, '').substring(0, 150) || '',
                link: item.link,
                pubDate: item.pubDate,
                source: data.feed?.title || 'Notícias',
              }));
              allNews.push(...items);
            }
          } catch (error) {
            console.error('Erro ao buscar feed:', feedUrl, error);
          }
        }

        // Embaralha e limita a 10 notícias
        const shuffled = allNews.sort(() => Math.random() - 0.5).slice(0, 10);
        setNews(shuffled);
      } catch (error) {
        console.error('Erro ao buscar notícias:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();

    // Atualiza a cada 5 minutos
    const interval = setInterval(fetchNews, 300000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);

      if (diff < 60) return `${diff} min atrás`;
      if (diff < 1440) return `${Math.floor(diff / 60)}h atrás`;
      return `${Math.floor(diff / 1440)}d atrás`;
    } catch {
      return '';
    }
  };

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
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-sm text-muted-foreground">Carregando notícias...</p>
              </div>
            ) : news.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Nenhuma notícia disponível</p>
              </div>
            ) : (
              news.map((item, index) => (
                <div key={item.id}>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-xl border border-border bg-background/50 hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-1">
                        <Newspaper className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {item.source}
                          </span>
                          {item.pubDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(item.pubDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </a>

                  {/* AdSense entre cada notícia */}
                  <div className="my-3">
                    <AdSlot rotulo={`Anúncio ${index + 1}`} altura="min-h-[100px]" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground text-center">
              <p>Notícias em tempo real</p>
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
