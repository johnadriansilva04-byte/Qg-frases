import { useState, useEffect } from "react";
import { Newspaper, ExternalLink, Clock } from "lucide-react";

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

export function NewsModule() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const allNews: NewsItem[] = [];

        for (const feedUrl of RSS_FEEDS) {
          try {
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

        const shuffled = allNews.sort(() => Math.random() - 0.5).slice(0, 5);
        setNews(shuffled);
      } catch (error) {
        console.error('Erro ao buscar notícias:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();

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
    <div className="mt-6 border-t border-border pt-6">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-5 h-5 text-primary" />
        <h3 className="font-display text-lg font-semibold">Notícias</h3>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : news.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma notícia disponível
        </p>
      ) : (
        <div className="space-y-3">
          {news.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-xl border border-border bg-surface/50 hover:border-primary/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <Newspaper className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">
                    {item.title}
                  </h4>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
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
                <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
