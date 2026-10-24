// Opções de cálculo próprias de um elemento (V7f, K1.4.1): na janela da viga, da laje e do pilar, cada opção da lista
// fechada (as que só atuam no dimensionamento) mostra o valor em uso; alterar grava a opção só no elemento
// (`viga.editar`, `laje.editar` ou `pilar.editar` com `opcoes`) e "Usar a da obra" a remove. Faixas e rótulos vêm de OPCOES_INFO.
import { OPCOES_INFO, OPCOES_POR_LAJE, OPCOES_POR_PILAR, OPCOES_POR_VIGA, opcoesEmUso, perfilDe, type OpcoesCalculo } from '../../core/building/opcoes';
import { Button, Group, Hint, NumField, Pill } from '../ui';
import { useBuilding } from './store';

export type TipoOpcoesElemento = 'viga' | 'laje' | 'pilar';

const LISTA: Record<TipoOpcoesElemento, readonly (keyof OpcoesCalculo)[]> = { viga: OPCOES_POR_VIGA, laje: OPCOES_POR_LAJE, pilar: OPCOES_POR_PILAR };
const COMANDO: Record<TipoOpcoesElemento, string> = { viga: 'viga.editar', laje: 'laje.editar', pilar: 'pilar.editar' };
const ROTULO: Record<TipoOpcoesElemento, string> = { viga: 'da viga', laje: 'da laje', pilar: 'do pilar' };

export function OpcoesDoElemento({ tipo, id }: { tipo: TipoOpcoesElemento; id: string }) {
  const b = useBuilding((s) => s.sessao.modelo), exec = useBuilding((s) => s.exec);
  const el = (tipo === 'viga' ? b.vigas : tipo === 'laje' ? b.lajes : b.pilares).find((x) => x.id === id);
  if (!el) return null;
  const proprias = (el.opcoes ?? {}) as Partial<Record<keyof OpcoesCalculo, number>>, obra = opcoesEmUso(b.opcoes, perfilDe(b));
  const grava = (novas: Partial<Record<keyof OpcoesCalculo, number>>) => exec(COMANDO[tipo], { id, opcoes: novas });
  const n = Object.keys(proprias).length;
  return (
    <div data-opcoes-elemento={`${tipo}:${id}`} data-opcoes-proprias={n}>
      <Group title={`Opções de cálculo ${ROTULO[tipo]}${n ? ` (${n} própria${n > 1 ? 's' : ''})` : ''}`} open={n > 0}>
        <Hint>Sobrepõem as opções da obra só {tipo === 'pilar' ? 'neste pilar' : tipo === 'laje' ? 'nesta laje' : 'nesta viga'}; só mudam o dimensionamento (a estrutura não é reanalisada). O memorial detalhado registra as opções próprias.</Hint>
        {LISTA[tipo].map((k) => {
          const info = OPCOES_INFO.find((x) => x.chave === k)!, propria = proprias[k] !== undefined;
          return (
            <div key={k} className="row" data-opcao-propria={k}>
              <NumField label={`${info.rotulo} (${el.nome})`} value={proprias[k] ?? obra[k]} unit={info.unidade} onChange={(v) => { void grava({ ...proprias, [k]: v }); }} />
              {propria ? <Pill>própria · obra: {String(obra[k]).replace('.', ',')}</Pill> : <Pill>da obra</Pill>}
              {propria && <Button variant="mini" onClick={() => { const { [k]: _, ...resto } = proprias; void grava(resto); }}>{`Usar a da obra: ${info.rotulo} (${el.nome})`}</Button>}
            </div>
          );
        })}
        {n > 0 && <div className="row"><Button variant="mini" onClick={() => { void grava({}); }}>{`Remover todas as opções próprias ${ROTULO[tipo]} ${el.nome}`}</Button></div>}
        <Hint>{`Faixa: ${LISTA[tipo].map((k) => { const i = OPCOES_INFO.find((x) => x.chave === k)!; return `${i.rotulo} ${String(i.min).replace('.', ',')} a ${String(i.max).replace('.', ',')}`; }).join('; ')}.`}</Hint>
      </Group>
    </div>
  );
}
