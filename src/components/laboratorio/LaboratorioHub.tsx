import { FlaskConical } from "lucide-react";
import { ProfissaoHub } from "@/components/campus/ProfissaoHub";
import { normalizarPesquisador } from "./pesquisadorEngine";
import type { CidadelaPerfil } from "@/lib/cidadela/profissoes";

type Props = {
  userId: string | null;
  perfil: CidadelaPerfil | null;
  onPerfilAtualizado: (p: CidadelaPerfil) => void;
  onVoltar: () => void;
};

/** Hub do Pesquisador com pipeline coleta → análise → publicação. */
export function LaboratorioHub(props: Props) {
  return (
    <ProfissaoHub
      {...props}
      profissao="pesquisador"
      chaveEstado="pesquisador"
      titulo="Laboratórios do Campus"
      subtitulo="Coleta, análise e publicação — ciência que muda a Cidadela"
      icone={<FlaskConical className="h-5 w-5" />}
      textoPortao="Você precisa assumir a profissão Pesquisador na seleção de identidade para operar aqui."
      normalizar={normalizarPesquisador}
    />
  );
}
