import { X, HelpCircle } from "lucide-react";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
}

export function InfoModal({ isOpen, onClose, title, content }: InfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="size-5 text-primary" />
            <h2 className="font-display text-lg font-bold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 prose prose-sm prose-slate max-w-none text-muted-foreground">
          {content}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3 bg-surface/50">
          <button
            onClick={onClose}
            className="w-full btn-primary"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}

interface InfoButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function InfoButton({ onClick, label = "Saiba mais", className = "" }: InfoButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors ${className}`}
    >
      <HelpCircle className="size-4" />
      <span>{label}</span>
    </button>
  );
}
