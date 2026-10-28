import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import {
  Cartao,
  CartaoConteudo,
  CartaoDescricao,
  CartaoCabecalho,
  CartaoTitulo,
} from "@/components/ui/cartao";
import { Esqueleto, Spinner } from "@/components/ui/carregando";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Etiqueta } from "@/components/ui/etiqueta";

export const metadata: Metadata = {
  title: "Componentes",
  robots: { index: false, follow: false },
};

// Classes escritas por extenso para o Tailwind encontrá-las ao gerar o CSS.
const musgo = [
  { nome: "50", classe: "bg-musgo-50" },
  { nome: "100", classe: "bg-musgo-100" },
  { nome: "200", classe: "bg-musgo-200" },
  { nome: "300", classe: "bg-musgo-300" },
  { nome: "400", classe: "bg-musgo-400" },
  { nome: "500", classe: "bg-musgo-500" },
  { nome: "600", classe: "bg-musgo-600" },
  { nome: "700", classe: "bg-musgo-700" },
  { nome: "800", classe: "bg-musgo-800" },
  { nome: "900", classe: "bg-musgo-900" },
  { nome: "950", classe: "bg-musgo-950" },
];

const marcaTexto = [
  { nome: "claro", classe: "bg-marca-texto-claro" },
  { nome: "base", classe: "bg-marca-texto" },
  { nome: "borda", classe: "bg-marca-texto-borda" },
];

function Paleta({ titulo, cores }: { titulo: string; cores: typeof musgo }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{titulo}</p>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
        {cores.map((cor) => (
          <div key={cor.nome} className="flex flex-col items-center gap-1">
            <div
              className={`h-10 w-full rounded-md border border-borda ${cor.classe}`}
            />
            <span className="text-xs text-texto-suave">{cor.nome}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <Cartao>
      <CartaoCabecalho>
        <CartaoTitulo>{titulo}</CartaoTitulo>
        {descricao ? <CartaoDescricao>{descricao}</CartaoDescricao> : null}
      </CartaoCabecalho>
      <CartaoConteudo className="flex flex-col gap-4">{children}</CartaoConteudo>
    </Cartao>
  );
}

// Página de teste visual: só existe em desenvolvimento.
export default function PaginaComponentes() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-musgo-800">
          Componentes base
        </h1>
        <p className="text-texto-suave">
          Página de teste visual da PROSPEN. Só aparece em desenvolvimento e não
          vai para a versão publicada.
        </p>
      </header>

      <Secao
        titulo="Cores"
        descricao="Verde-musgo para estrutura, marca e ações. Marca-texto só para destaque, nunca para texto ou botão."
      >
        <Paleta titulo="Verde-musgo" cores={musgo} />
        <Paleta titulo="Marca-texto" cores={marcaTexto} />
      </Secao>

      <Secao titulo="Botões" descricao="Variantes, tamanhos e estados.">
        <div className="flex flex-wrap items-center gap-3">
          <Botao>Primário</Botao>
          <Botao variante="secundario">Secundário</Botao>
          <Botao variante="contorno">Contorno</Botao>
          <Botao variante="fantasma">Fantasma</Botao>
          <Botao variante="perigo">Excluir</Botao>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Botao tamanho="pequeno">Pequeno</Botao>
          <Botao tamanho="medio">Médio</Botao>
          <Botao tamanho="grande">Grande</Botao>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Botao carregando>Salvando</Botao>
          <Botao disabled>Desabilitado</Botao>
        </div>
      </Secao>

      <Secao titulo="Campos" descricao="Normal, com ajuda, com erro e desabilitado.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Nome da empresa" placeholder="Ex.: Barbearia Central" />
          <Campo
            rotulo="E-mail"
            type="email"
            placeholder="voce@empresa.com.br"
            ajuda="Usamos só para enviar o acesso."
          />
          <Campo
            rotulo="Telefone"
            defaultValue="123"
            erro="Informe o telefone com DDD."
          />
          <Campo rotulo="Cidade" defaultValue="São Paulo" disabled />
        </div>
      </Secao>

      <Secao titulo="Avisos" descricao="Informação, sucesso, atenção e erro.">
        <Alerta titulo="Informação">Sua busca roda em segundo plano.</Alerta>
        <Alerta variante="sucesso" titulo="Tudo certo">
          12 leads foram importados.
        </Alerta>
        <Alerta variante="aviso" titulo="Atenção">
          3 linhas da planilha foram ignoradas por falta de telefone.
        </Alerta>
        <Alerta variante="erro" titulo="Algo deu errado">
          Não foi possível salvar. Tente novamente.
        </Alerta>
      </Secao>

      <Secao titulo="Etiquetas">
        <div className="flex flex-wrap gap-2">
          <Etiqueta>Novo</Etiqueta>
          <Etiqueta variante="andamento">Em conversa</Etiqueta>
          <Etiqueta variante="aviso">Proposta</Etiqueta>
          <Etiqueta variante="musgo">Ganho</Etiqueta>
          <Etiqueta variante="erro">Perdido</Etiqueta>
          <Etiqueta variante="destaque">Prioridade alta</Etiqueta>
          <Etiqueta variante="roxo">Etiqueta roxa do usuário</Etiqueta>
        </div>
      </Secao>

      <Secao
        titulo="Carregando"
        descricao="Indicador de progresso e blocos que seguram o lugar do conteúdo."
      >
        <div className="flex items-center gap-3 text-sm text-texto-suave">
          <Spinner rotulo="Carregando" className="size-5 text-musgo-700" />
          Buscando empresas...
        </div>
        <div className="flex flex-col gap-2">
          <Esqueleto className="h-5 w-1/3" />
          <Esqueleto className="h-4 w-full" />
          <Esqueleto className="h-4 w-5/6" />
        </div>
      </Secao>

      <Secao
        titulo="Sem dados"
        descricao="Aparece quando uma lista ainda está vazia."
      >
        <EstadoVazio
          titulo="Nenhum lead ainda"
          descricao="Busque empresas ou importe uma planilha para começar a montar sua lista."
          acao={<Botao>Buscar empresas</Botao>}
        />
      </Secao>
    </main>
  );
}
