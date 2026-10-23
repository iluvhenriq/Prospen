// Tipos do que as ações de leads devolvem para as telas. Ficam fora de acoes.ts
// porque um arquivo de ações do servidor só pode exportar funções.
import type { ResumoImportacao } from "./importacao";
import type { OcorrenciaImportacao } from "@/db/schema/importacoes";

export type EstadoAcao = {
  mensagem?: string;
  sucesso?: boolean;
  erros?: Partial<Record<string, string>>;
  valores?: Partial<Record<string, string>>;
  // Preenchido quando o contato já existe, para a tela oferecer o link.
  duplicado?: { id: string; nome: string };
};

// O que a tela de importação precisa mostrar. Nunca inclui o conteúdo das linhas
// da planilha: só contagens, títulos de coluna e os motivos dos problemas.
export type ResumoAnalise = {
  nomeArquivo: string;
  totalLinhas: number;
  aImportar: number;
  duplicadas: number;
  rejeitadas: number;
  ocorrencias: OcorrenciaImportacao[];
  ocorrenciasOmitidas: number;
  colunas: {
    nome: string | null;
    empresa: string | null;
    email: string | null;
    telefone: string | null;
    nomeVemDaEmpresa: boolean;
    ignoradas: string[];
  };
  avisos: string[];
};

export type EstadoImportacao = {
  erro?: string;
  analise?: ResumoAnalise;
  resultado?: ResumoImportacao;
};
