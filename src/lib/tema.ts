// Tema da tela: escolha de cada pessoa, guardada só no navegador dela
// (localStorage). Não é dado da empresa nem vai para o servidor.

export const TEMAS = ["claro", "escuro", "sistema"] as const;
export type Tema = (typeof TEMAS)[number];

export const CHAVE_TEMA = "prospen-tema";

// Roda no <head>, antes de a página aparecer, para não piscar o tema errado.
// Marca <html data-tema="..."> com a escolha e <html data-escuro> quando a
// tela deve ficar escura. O padrão é o claro.
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem("${CHAVE_TEMA}");if(t!=="escuro"&&t!=="sistema")t="claro";var d=document.documentElement;d.dataset.tema=t;var e=t==="escuro"||(t==="sistema"&&matchMedia("(prefers-color-scheme: dark)").matches);if(e)d.setAttribute("data-escuro","");else d.removeAttribute("data-escuro");}catch(_){}})();`;
