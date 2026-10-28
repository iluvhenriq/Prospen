import { Botao, BotaoLink } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Selecao } from "@/components/ui/campo-texto";
import { ptBR } from "@/lib/i18n/pt-BR";
import type { ParametrosBusca } from "@/modules/base-cnpj/parametros";

// Filtros da busca. Formulário comum de navegação (GET): funciona sem
// JavaScript e deixa o endereço compartilhável. A lista de cidades só aparece
// depois de buscar com o estado, porque depende dele.
export function FiltrosBusca({
  parametros,
  estados,
  municipios,
}: {
  parametros: ParametrosBusca;
  estados: { uf: string }[];
  municipios: { codigo: string; nome: string }[];
}) {
  const t = ptBR.busca.filtros;
  return (
    <form
      method="get"
      action="/painel/busca"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1.3fr)_auto] lg:items-end"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="busca-uf" className="text-sm font-medium text-texto">
          {t.estado}
        </label>
        <Selecao id="busca-uf" name="uf" defaultValue={parametros.uf ?? ""}>
          <option value="" disabled>
            {t.escolhaEstado}
          </option>
          {estados.map((estado) => (
            <option key={estado.uf} value={estado.uf}>
              {estado.uf}
            </option>
          ))}
        </Selecao>
      </div>
      <div className="flex flex-col gap-1.5">
        {municipios.length > 0 ? (
          <label htmlFor="busca-cidade" className="text-sm font-medium text-texto">
            {t.cidade}
          </label>
        ) : (
          <span className="text-sm font-medium text-texto">{t.cidade}</span>
        )}
        {municipios.length > 0 ? (
          <Selecao id="busca-cidade" name="cidade" defaultValue={parametros.municipio ?? ""}>
            <option value="">{t.todasCidades}</option>
            {municipios.map((municipio) => (
              <option key={municipio.codigo} value={municipio.codigo}>
                {municipio.nome}
              </option>
            ))}
          </Selecao>
        ) : (
          <p id="busca-cidade" className="flex min-h-10 items-center text-sm text-texto-suave">
            {t.cidadeDepoisDoEstado}
          </p>
        )}
      </div>
      <Campo
        rotulo={t.atividade}
        name="atividade"
        type="search"
        placeholder={t.atividadePlaceholder}
        defaultValue={parametros.atividade}
        maxLength={80}
        className="sm:col-span-2 lg:col-span-1"
      />
      <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
        <Botao type="submit">{t.buscar}</Botao>
        <BotaoLink href="/painel/busca" variante="fantasma">
          {t.limpar}
        </BotaoLink>
      </div>
      <Campo
        rotulo={t.cnpj}
        name="cnpj"
        inputMode="text"
        placeholder={t.cnpjPlaceholder}
        ajuda={t.cnpjAjuda}
        defaultValue={parametros.cnpjDigitado}
        maxLength={20}
        className="sm:col-span-2 lg:col-span-2"
      />
      <div className="flex flex-col gap-0.5 sm:col-span-2 lg:col-span-2 lg:self-start lg:pt-7">
        <label className="flex items-center gap-2 text-sm font-medium text-texto">
          <input
            type="checkbox"
            name="mei"
            value="1"
            defaultChecked={parametros.incluirMei}
            className="size-4 accent-musgo-700"
          />
          {t.incluirMei}
        </label>
        <p className="text-xs text-texto-suave">{t.incluirMeiAjuda}</p>
      </div>
    </form>
  );
}
