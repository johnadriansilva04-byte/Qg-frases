import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Newspaper, ExternalLink, Clock } from "lucide-react";
import { AdSlot } from "@/components/AdSlot";

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

export const Route = createFileRoute("/noticias")({
  head: () => ({
    meta: [
      { title: "Notícias | Cidadela do Pracinha" },
      {
        name: "description",
        content: "Notícias em tempo real do Brasil e do mundo.",
      },
      { property: "og:title", content: "Notícias | Cidadela do Pracinha" },
      {
        property: "og:description",
        content: "Notícias em tempo real do Brasil e do mundo.",
      },
      { property: "og:url", content: "https://pracinha.online/noticias" },
      { property: "og:image", content: "https://pracinha.online/artes/cidadela-icon-og.jpeg" },
    ],
  }),
  component: Noticias,
});

function Noticias() {
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/50 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-foreground">Notícias</h1>
          </div>

        </div>
      </div>

      {/* Conteúdo das notícias */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
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
                className="block p-4 rounded-xl border border-border bg-surface/50 hover:border-primary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <Newspaper className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground mb-2 line-clamp-2">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                  <ExternalLink className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </a>

              {/* AdSense entre cada notícia */}
              <div className="my-4">
                <AdSlot rotulo={`Anúncio ${index + 1}`} altura="min-h-[100px]" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-4 py-6 border-t border-border mt-8">
        <div className="text-xs text-muted-foreground text-center">
          <p>Notícias em tempo real</p>
          <p className="mt-1">© 2026 Cidadela do Pracinha</p>
        </div>
      </div>
    </div>
  );
}
