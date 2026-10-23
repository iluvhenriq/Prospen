// Tipos e listas de valores dos leads para as telas. As telas e os componentes
// não importam de "@/db/schema" direto (há um teste que garante isso); passam por aqui.
// Atenção: componentes de cliente ("use client") só devem importar TIPOS daqui,
// nunca valores, para o código do banco não ir parar no navegador.
export type {
  CorEtiqueta,
  Etiqueta,
  Importacao,
  Lead,
  Nota,
  OcorrenciaImportacao,
  OrigemLead,
} from "@/db/schema";
export { CORES_ETIQUETA, ORIGENS_LEAD } from "@/db/schema";
