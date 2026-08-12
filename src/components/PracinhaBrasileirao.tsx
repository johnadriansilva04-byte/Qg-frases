import { useState, useEffect } from "react";
import { Tv, Radio, PlayCircle, Clock, ChevronRight } from "lucide-react";

interface Canal {
  id: string;
  nome: string;
  canalYoutube: string;
  descricao: string;
  icone: React.ReactNode;
  status: "ao_vivo" | "offline";
}

const CANAIS: Canal[] = [
  {
    id: "cazetv",
    nome: "CazéTV",
    canalYoutube: "UCZ6yq8QqQqQqQqQqQqQqQqQ",
    descricao: "Transmissão oficial do Brasileirão",
    icone: <Tv className="w-5 h-5" />,
    status: "ao_vivo"
  },
  {
    id: "premiere",
    nome: "Premiere / GE",
    canalYoutube: "UCZ6yq8QqQqQqQqQqQqQqQqQ",
    descricao: "Narração oficial Premiere",
    icone: <Radio className="w-5 h-5" />,
    status: "ao_vivo"
  },
  {
    id: "narracao",
    nome: "Narração Ao Vivo",
    canalYoutube: "UCZ6yq8QqQqQqQqQqQqQqQqQ",
    descricao: "Narrção em tempo real",
    icone: <PlayCircle className="w-5 h-5" />,
    status: "ao_vivo"
  },
  {
    id: "posjogo",
    nome: "Pós-Jogo",
    canalYoutube: "UCZ6yq8QqQqQqQqQqQqQqQqQ",
    descricao: "Análise pós-jogo",
    icone: <Tv className="w-5 h-5" />,
    status: "offline"
  }
];

export function PracinhaBrasileirao() {
  const [canalAtivo, setCanalAtivo] = useState<Canal>(CANAIS[0]);
  const [carregando, setCarregando] = useState(false);

  const trocarCanal = (canal: Canal) => {
    setCarregando(true);
    setCanalAtivo(canal);
    setTimeout(() => setCarregando(false), 500);
  };

  return (
    <div className="mt-6 border-t border-border pt-6">
      <div className="flex items-center gap-2 mb-4">
        <Tv className="w-5 h-5 text-primary" />
        <h3 className="font-display text-lg font-semibold">Pracinha do Brasileirão</h3>
        <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse">
          🔴 AO VIVO
        </span>
      </div>

      {/* Área Principal da TV */}
      <div className="mb-4">
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <div className="absolute inset-0 bg-[#0b0f19] rounded-xl overflow-hidden border-2 border-border">
            {carregando && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0b0f19] z-10">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            )}
            <iframe
              key={canalAtivo.id}
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/live_stream?channel=${canalAtivo.canalYoutube}&autoplay=1`}
              title={canalAtivo.nome}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        {/* Placa de Informações */}
        <div className="mt-3 p-3 bg-[#0b0f19] rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {canalAtivo.icone}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground">
                {canalAtivo.nome}
              </h4>
              <p className="text-xs text-muted-foreground">
                {canalAtivo.descricao}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>AO VIVO</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Canais */}
      <div className="space-y-3">
        <p className="text-xs font-display tracking-[0.2em] text-muted-foreground uppercase">
          Canais Disponíveis
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CANAIS.map((canal) => (
            <button
              key={canal.id}
              onClick={() => trocarCanal(canal)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                canalAtivo.id === canal.id
                  ? 'bg-[#10b981]/10 border-[#10b981] shadow-lg shadow-[#10b981]/20'
                  : 'bg-surface/50 border-border hover:border-primary/50'
              }`}
            >
              <div className={`flex-shrink-0 ${
                canalAtivo.id === canal.id ? 'text-[#10b981]' : 'text-muted-foreground'
              }`}>
                {canal.icone}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h4 className={`text-sm font-semibold ${
                  canalAtivo.id === canal.id ? 'text-[#10b981]' : 'text-foreground'
                }`}>
                  {canal.nome}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {canal.descricao}
                </p>
              </div>
              <div className="flex-shrink-0">
                {canal.status === "ao_vivo" ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                    🔴
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">
                    OFF
                  </span>
                )}
              </div>
              <ChevronRight className={`w-4 h-4 flex-shrink-0 ${
                canalAtivo.id === canal.id ? 'text-[#10b981]' : 'text-muted-foreground'
              }`} />
            </button>
          ))}
        </div>
      </div>

      {/* Mensagem de Aviso */}
      <div className="mt-4 p-3 bg-[#0b0f19]/50 rounded-xl border border-border">
        <p className="text-xs text-muted-foreground text-center">
          💡 <span className="font-semibold">Dica:</span> Se o canal estiver offline, tente os outros canais da lista. As transmissões são automáticas quando há jogos ao vivo.
        </p>
      </div>
    </div>
  );
}
