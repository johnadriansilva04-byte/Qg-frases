import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function Sidebar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: "/", icon: "🎲", label: "Gerador de Frases" },
    { to: "/corretor", icon: "✏️", label: "Corretor de Texto" },
    { to: "/narrador", icon: "📖", label: "Narrador de Histórias" },
    { to: "/cidadela", icon: "🏰", label: "Cidadela de Jogos" },
    { to: "/biblioteca", icon: "📚", label: "Biblioteca" },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-16 left-4 z-50 p-2 rounded-lg bg-primary text-primary-foreground shadow-lg"
      >
        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-64 bg-surface border-r border-border z-40 transform transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="space-y-2 p-4 pt-16">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/10 transition-colors"
              activeProps={{ className: "bg-primary/10 text-primary font-semibold" }}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-surface/50 border-r border-border p-4 hidden md:block">
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/10 transition-colors"
              activeProps={{ className: "bg-primary/10 text-primary font-semibold" }}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
