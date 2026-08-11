import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Newspaper, ChevronDown } from "lucide-react";

export function Sidebar() {
  return (
    <>
      {/* Botão no extremo esquerdo para ir para página de notícias */}
      <Link
        to="/noticias"
        className="fixed top-4 left-4 z-50 px-4 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 flex items-center gap-2"
        title="Ver notícias"
      >
        <Newspaper className="w-5 h-5" />
        <span className="font-medium">Notícias</span>
        <ChevronDown className="w-4 h-4" />
      </Link>
    </>
  );
}
