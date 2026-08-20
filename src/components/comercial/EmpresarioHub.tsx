import { Briefcase } from "lucide-react";
import { ProfissaoHub } from "@/components/campus/ProfissaoHub";
import { normalizarEmpresario } from "./empresarioEngine";
import type { CidadelaPerfil } from "@/lib/cidadela/profissoes";

type Props = {
  userId: string | null;
  perfil: CidadelaPerfil | null;
  onPerfilAtualizado: (p: CidadelaPerfil) => void;
  onVoltar: () => void;
};

/** Hub do Empresário no Setor Comercial. */
export function EmpresarioHub(props: Props) {
  return (
    <ProfissaoHub
      {...props}
      profissao="empresario"
      chaveEstado="empresario"
      titulo="Setor Comercial"
      subtitulo="Seu escritório do empresariado na Cidadela"
      icone={<Briefcase className="h-5 w-5" />}
      textoPortao="Você precisa assumir a profissão Empresário na seleção de identidade para operar aqui."
      normalizar={normalizarEmpresario}
    />
  );
}
