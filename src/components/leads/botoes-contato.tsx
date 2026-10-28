import { variantes } from "@/components/ui/botao";
import { cn } from "@/lib/cn";
import { ptBR } from "@/lib/i18n/pt-BR";
import { telefoneParaContato } from "@/modules/leads/normalizacao";

function Icone({ d }: { d: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0">
      <path d={d} />
    </svg>
  );
}

const CAMINHOS = {
  whatsapp: "M4.2 15.8 5 13A6.5 6.5 0 1 1 7.4 15.3zM7.6 7.4c.3 2.3 2.1 4.4 4.8 5.1l1-1.2-1.6-.9-.7.7c-.9-.4-1.7-1.2-2.1-2.1l.7-.7-.9-1.6z",
  ligar: "M6.2 3.5 8 7.2 6.6 8.4a8.5 8.5 0 0 0 5 5l1.2-1.4 3.7 1.8-.6 2.5c-6.6.4-12.6-5.6-12.2-12.2z",
  email: "M3 5.5h14v9H3zM3.4 6l6.6 5 6.6-5",
} as const;

// Contatar em um clique: WhatsApp (só celular), ligar e e-mail. Cada botão só
// aparece quando o dado existe e é válido. O WhatsApp abre em outra aba.
// "compacto": só os ícones (cartões do funil e linhas da busca), com o nome no
// rótulo para leitores de tela.
export function BotoesContato({
  nome,
  telefone,
  email,
  pais = "BR",
  compacto = false,
  className,
}: {
  nome: string;
  telefone: string | null;
  email: string | null;
  pais?: string;
  compacto?: boolean;
  className?: string;
}) {
  const t = ptBR.contato;
  const contato = telefoneParaContato(telefone, pais);
  const botoes: { href: string; rotulo: string; completo: string; icone: string; externo: boolean }[] = [];
  if (contato?.whatsapp) {
    botoes.push({ href: contato.whatsapp, rotulo: t.whatsapp, completo: t.whatsappDe(nome), icone: CAMINHOS.whatsapp, externo: true });
  }
  if (contato) {
    botoes.push({ href: contato.ligar, rotulo: t.ligar, completo: t.ligarPara(nome), icone: CAMINHOS.ligar, externo: false });
  }
  if (email) {
    botoes.push({ href: `mailto:${email}`, rotulo: t.email, completo: t.emailPara(nome), icone: CAMINHOS.email, externo: false });
  }

  if (botoes.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {botoes.map((botao) => (
        <a
          key={botao.rotulo}
          href={botao.href}
          aria-label={botao.completo}
          title={compacto ? botao.completo : undefined}
          {...(botao.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={cn(variantes({ variante: "contorno", tamanho: "pequeno" }), compacto && "size-8 px-0")}
        >
          <Icone d={botao.icone} />
          {compacto ? null : botao.rotulo}
        </a>
      ))}
    </div>
  );
}
