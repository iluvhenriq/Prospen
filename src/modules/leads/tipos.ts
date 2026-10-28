// Tipos e listas de valores dos leads para as telas. As telas e os componentes
// não importam de "@/db/schema" direto (há um teste que garante isso); passam por aqui.
// Atenção: componentes de cliente ("use client") só devem importar TIPOS daqui,
// nunca valores, para o código do banco não ir parar no navegador.
export type {
  CanalContato,
  Contato,
  ResultadoContato,
  CorEtiqueta,
  EtapaFunil,
  Etiqueta,
  Importacao,
  Lead,
  MotivoPerda,
  Nota,
  OcorrenciaImportacao,
  OrigemLead,
} from "@/db/schema";
export { CANAIS_CONTATO, CORES_ETIQUETA, ETAPAS_FUNIL, MOTIVOS_PERDA, ORIGENS_LEAD, RESULTADOS_CONTATO } from "@/db/schema";
