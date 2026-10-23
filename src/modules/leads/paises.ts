// Países oferecidos no cadastro de leads, com o código de duas letras (ISO 3166-1)
// que o banco guarda. Para acrescentar um país, basta incluí-lo aqui.
export const PAISES: ReadonlyArray<{ codigo: string; nome: string }> = [
  { codigo: "BR", nome: "Brasil" },
  { codigo: "PT", nome: "Portugal" },
  { codigo: "US", nome: "Estados Unidos" },
  { codigo: "AR", nome: "Argentina" },
  { codigo: "CL", nome: "Chile" },
  { codigo: "CO", nome: "Colômbia" },
  { codigo: "MX", nome: "México" },
  { codigo: "PY", nome: "Paraguai" },
  { codigo: "UY", nome: "Uruguai" },
  { codigo: "ES", nome: "Espanha" },
  { codigo: "FR", nome: "França" },
  { codigo: "DE", nome: "Alemanha" },
  { codigo: "IT", nome: "Itália" },
  { codigo: "GB", nome: "Reino Unido" },
];

// Opções para a lista de países. Se o lead já tem um país que não está na lista
// (por exemplo, vindo de uma planilha), ele também aparece, para não ser trocado
// sem querer ao salvar.
export function opcoesDePais(atual?: string | null): ReadonlyArray<{ codigo: string; nome: string }> {
  if (!atual || PAISES.some((pais) => pais.codigo === atual)) return PAISES;
  return [...PAISES, { codigo: atual, nome: atual }];
}
