// Tipos das campanhas para as telas. As telas e os componentes não importam de
// "@/db/schema" direto (há um teste que garante isso); passam por aqui.
// Componentes de cliente ("use client") só devem importar TIPOS daqui.
export type { Campanha, SituacaoCampanha } from "@/db/schema";
export type { CampanhaComNumeros, NumerosCampanha } from "./repositorio";
