import { Link } from "@tanstack/react-router";

export function Sidebar() {
  return (
    <aside className="w-64 bg-surface/50 border-r border-border p-4 hidden md:block">
      <nav className="space-y-2">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/10 transition-colors"
          activeProps={{ className: "bg-primary/10 text-primary font-semibold" }}
        >
          🎲 Gerador de Frases
        </Link>
        <Link
          to="/corretor"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/10 transition-colors"
          activeProps={{ className: "bg-primary/10 text-primary font-semibold" }}
        >
          ✏️ Corretor de Texto
        </Link>
        <Link
          to="/biblioteca"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/10 transition-colors"
          activeProps={{ className: "bg-primary/10 text-primary font-semibold" }}
        >
          📚 Biblioteca
        </Link>
      </nav>
    </aside>
  );
}
