import { useState } from "react";

type Props = {
  texto: string;
  onTextoCorrigido: (texto: string) => void;
  onClose: () => void;
};

export function CorretorTexto({ texto, onTextoCorrigido, onClose }: Props) {
  const [textoEditado, setTextoEditado] = useState(texto);

  const handleAplicar = () => {
    onTextoCorrigido(textoEditado);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Corretor de Texto</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>
        
        <textarea
          value={textoEditado}
          onChange={(e) => setTextoEditado(e.target.value)}
          className="flex-1 w-full p-4 rounded-xl border border-border bg-surface/50 text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          rows={8}
          placeholder="Edite o texto aqui..."
        />
        
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-border text-foreground hover:bg-surface/50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAplicar}
            className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            Aplicar Correção
          </button>
        </div>
      </div>
    </div>
  );
}
