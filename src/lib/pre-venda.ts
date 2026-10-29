// Modo pré-venda (decisão de 24/10/2026): com MODO_PRE_VENDA=1, o site
// publicado mostra só a página de apresentação com o pré-cadastro e as
// páginas legais. O app (cadastro, entrada, painel) fica fechado e manda para
// a página inicial. Assim dá para publicar a pré-venda sem abrir o produto.
// A página inicial é gerada no build: mude a variável ANTES de rodar o build.

export function emPreVenda(origem: Record<string, string | undefined> = process.env): boolean {
  return origem.MODO_PRE_VENDA === "1";
}

// Versão estática da página inicial (29/10/2026), publicada sem servidor no
// Cloudflare Pages por `npm run pagina:exportar`. Vale só junto com o modo
// pré-venda: sai tudo que precisa de servidor (pré-cadastro, formulário de
// remoção) e entra o que funciona no navegador (reserva por Pix, e-mail).
export function paginaEstatica(origem: Record<string, string | undefined> = process.env): boolean {
  return emPreVenda(origem) && origem.PAGINA_ESTATICA === "1";
}

// Caminhos do app que ficam fechados na pré-venda.
const FECHADOS = [
  "/painel",
  "/cadastrar",
  "/entrar",
  "/criar-organizacao",
  "/convite",
  "/confirmar-email",
  "/esqueci-senha",
  "/nova-senha",
  "/api/auth",
];

export function fechadoNaPreVenda(caminho: string): boolean {
  return FECHADOS.some((prefixo) => caminho === prefixo || caminho.startsWith(`${prefixo}/`));
}
