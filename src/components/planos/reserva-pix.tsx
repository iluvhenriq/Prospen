"use client";

import qrcode from "qrcode-generator";
import { useRef, useState } from "react";
import { Botao, variantes } from "@/components/ui/botao";
import { ptBR } from "@/lib/i18n/pt-BR";
import { VENDAS } from "@/lib/vendas";
import { codigoPix } from "@/modules/planos/pix";

// "Reservar no Pix" de um plano, na página inicial do modo pré-venda
// (29/10/2026). Abre uma janela com o QR e o copia e cola já com o valor do
// plano; o comprovante vai por e-mail. Tudo no navegador: funciona também na
// versão estática da página, sem servidor.
export function ReservaPix({ plano, precoCentavos, preco }: { plano: string; precoCentavos: number; preco: string }) {
  const t = ptBR.preVenda.reserva.dialogo;
  const janela = useRef<HTMLDialogElement>(null);
  const [pix, setPix] = useState<{ codigo: string; svg: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  function abrir() {
    if (!pix) {
      const codigo = codigoPix({
        chave: VENDAS.chavePix,
        nome: VENDAS.nomePix,
        cidade: VENDAS.cidadePix,
        valorCentavos: precoCentavos,
        identificador: "FUNDADOR",
      });
      const qr = qrcode(0, "M");
      qr.addData(codigo);
      qr.make();
      setPix({ codigo, svg: qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true }) });
    }
    janela.current?.showModal();
  }

  async function copiar() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sem permissão de área de transferência: o campo fica selecionado para copiar à mão.
      document.getElementById(`pix-${plano}`)?.focus();
    }
  }

  const email = `mailto:${VENDAS.emailComprovante}?subject=${encodeURIComponent(t.assunto(plano))}&body=${encodeURIComponent(t.corpo(plano))}`;

  return (
    <>
      <Botao tamanho="grande" className="w-full" onClick={abrir}>
        {ptBR.preVenda.reserva.botao}
      </Botao>
      <dialog
        ref={janela}
        aria-labelledby={`pix-titulo-${plano}`}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-[3px] bg-papel p-6 text-texto shadow-[0_24px_60px_-12px_rgb(0_0_0/0.6)] backdrop:bg-mesa/80 sm:p-8"
      >
        <h3 id={`pix-titulo-${plano}`} className="border-b-2 border-texto pb-3 text-2xl font-extrabold tracking-[-0.02em] text-musgo-900">
          {t.titulo(plano)}
        </h3>
        <p className="mt-3 text-sm text-texto-suave">{t.valor(preco)}</p>
        {pix ? (
          <>
            <div
              role="img"
              aria-label={t.qr(plano)}
              className="mx-auto my-5 size-56 bg-white [&_svg]:size-full"
              dangerouslySetInnerHTML={{ __html: pix.svg }}
            />
            <label htmlFor={`pix-${plano}`} className="text-sm font-semibold">
              {t.codigo}
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id={`pix-${plano}`}
                readOnly
                value={pix.codigo}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-controle border border-borda-campo bg-white px-3 text-sm text-texto"
              />
              <Botao variante="secundario" onClick={copiar} aria-live="polite">
                {copiado ? t.copiado : t.copiar}
              </Botao>
            </div>
          </>
        ) : null}
        <p className="mt-5 text-sm text-texto-suave">{t.depois(VENDAS.emailComprovante)}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={email} className={variantes({ tamanho: "grande" })}>
            {t.mandar}
          </a>
          <Botao variante="contorno" tamanho="grande" onClick={() => janela.current?.close()}>
            {t.fechar}
          </Botao>
        </div>
      </dialog>
    </>
  );
}
