import { describe, expect, it } from "vitest";
import { lerListagem } from "@/integrations/receita-cnpj/fonte";

// Trecho real (encurtado) da resposta do repositório da Receita em 23/10/2026.
const LISTAGEM_RAIZ = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:"><d:response><d:href>/public.php/webdav/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response><d:response><d:href>/public.php/webdav/2026-09/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response><d:response><d:href>/public.php/webdav/2026-10/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response><d:response><d:href>/public.php/webdav/cnpj.tar.gz</d:href><d:propstat><d:prop><d:getcontentlength>63954782749</d:getcontentlength><d:resourcetype/></d:prop></d:propstat></d:response></d:multistatus>`;

const LISTAGEM_MES = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:"><d:response><d:href>/public.php/webdav/2026-10/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response><d:response><d:href>/public.php/webdav/2026-10/Estabelecimentos1.zip</d:href><d:propstat><d:prop><d:getcontentlength>341835776</d:getcontentlength><d:resourcetype/></d:prop></d:propstat></d:response><d:response><d:href>/public.php/webdav/2026-10/Munic%C3%ADpios%20teste.zip</d:href><d:propstat><d:prop><d:getcontentlength>12</d:getcontentlength><d:resourcetype/></d:prop></d:propstat></d:response></d:multistatus>`;

describe("listagem do repositório da Receita", () => {
  it("lê pastas e arquivos da raiz, sem a própria raiz", () => {
    expect(lerListagem(LISTAGEM_RAIZ)).toEqual([
      { nome: "2026-09", pasta: true, tamanho: null },
      { nome: "2026-10", pasta: true, tamanho: null },
      { nome: "cnpj.tar.gz", pasta: false, tamanho: 63954782749 },
    ]);
  });

  it("lê os arquivos de um mês com tamanho e nome decodificado", () => {
    const itens = lerListagem(LISTAGEM_MES);
    expect(itens).toContainEqual({ nome: "Estabelecimentos1.zip", pasta: false, tamanho: 341835776 });
    expect(itens).toContainEqual({ nome: "Municípios teste.zip", pasta: false, tamanho: 12 });
    expect(itens).toContainEqual({ nome: "2026-10", pasta: true, tamanho: null });
  });
});
