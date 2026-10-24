// Referências, dados de pilar e de pano, e numeração de pórticos (L4: C3.29, C3.30, C4.26, C4.28, C4.30, C7.8, K1.4.69).
// Grupo "Referências e dados" da barra lateral; a lógica está nos comandos `ref.mover`, `vista.textos`, `pilar.pontoFixo`,
// `pilar.inserir` (copiarDe), `laje.copiarDados` e `portico.renumerar`.
import { useState } from 'react';
import { Button, Check, Group, Hint, Note, Select } from '../ui';
import { pavimentosOrdenados, type Ajuste, type BuildingModel } from '../../core/building/types';
import { avaliarNumeracao } from '../../core/building/porticos';
import { CAMPOS_COPIA_LAJE } from '../../core/building/pilarDados';
import { ROTULO_TEXTO, TIPOS_TEXTO_TODOS, textosVisiveis } from '../../core/building/vistaObra';
import { useBuilding } from './store';
import { usePlanta } from './plantaStore';

const AJUSTES: { v: Ajuste; label: string }[] = [
  { v: 'c', label: 'centro' }, { v: 'so', label: 'canto inf. esq.' }, { v: 's', label: 'face inferior' }, { v: 'se', label: 'canto inf. dir.' }, { v: 'l', label: 'face direita' },
  { v: 'ne', label: 'canto sup. dir.' }, { v: 'n', label: 'face superior' }, { v: 'no', label: 'canto sup. esq.' }, { v: 'o', label: 'face esquerda' },
];

export function DadosL4Grupo({ b, onPlanta }: { b: BuildingModel; onPlanta?: () => void }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const ps = pavimentosOrdenados(b);
  const grupo = ps.find((p) => p.id === pl.pavimento)?.grupo ?? ps[Math.min(1, ps.length - 1)]?.grupo ?? '';
  const [ajuste, setAjuste] = useState<Ajuste>('c');
  const [manter, setManter] = useState(true);
  const [origem, setOrigem] = useState('');
  const [campos, setCampos] = useState<string[]>(['tipo']);
  const pilaresSel = b.pilares.filter((p) => pl.selecao.has(p.id)).map((p) => p.id);
  const lajesSel = b.lajes.filter((l) => pl.selecao.has(l.id)).map((l) => l.id);
  const lajeOrigem = b.lajes.find((l) => l.id === origem) ?? b.lajes[0];
  const vis = textosVisiveis(b);
  const nRefs = Object.keys(b.vista?.refs ?? {}).length;
  const pegado = b.pilares.find((p) => p.id === pl.contaGotas.pilar);
  const erros = grupo ? avaliarNumeracao(b, grupo) : [];
  const alternaTexto = (t: (typeof TIPOS_TEXTO_TODOS)[number], on: boolean) => exec('vista.textos', { textos: TIPOS_TEXTO_TODOS.filter((x) => (x === t ? on : vis.includes(x))) });
  return (
    <Group title="Referências e dados" open={false}>
      <h4>Textos de referência na planta</h4>
      <div className="row wrap" data-textos-visiveis>
        {TIPOS_TEXTO_TODOS.map((t) => <Check key={t} label={`Mostrar texto: ${ROTULO_TEXTO[t].toLowerCase()}`} checked={vis.includes(t)} onChange={(v) => alternaTexto(t, v)} />)}
      </div>
      <div className="row wrap">
        <Button onClick={() => { pl.set({ ferramenta: 'moverRef' }); onPlanta?.(); }}>Mover texto de referência</Button>
        <Button disabled={!nRefs} onClick={() => exec('lote', { comandos: Object.keys(b.vista?.refs ?? {}).map((id) => ({ nome: 'ref.mover', params: { id, restaurar: true } })) })}>Restaurar posições dos textos</Button>
      </div>
      <Hint>{nRefs ? `${nRefs} texto(s) fora da posição automática.` : 'Dois cliques: o texto e o novo local. A escolha dos tipos de texto fica gravada na obra.'}</Hint>

      <h4>Pilares</h4>
      <div className="row wrap">
        <Button onClick={() => { pl.set({ ferramenta: 'contaGotas' }); onPlanta?.(); }}>Conta-gotas de pilar</Button>
        <Check label="Levar as cargas do pilar copiado" checked={pl.contaGotas.cargas} onChange={(v) => pl.set({ contaGotas: { ...pl.contaGotas, cargas: v } })} />
      </div>
      <Hint>{pegado ? `Dados de ${pegado.nome} pegos: cada clique em lugar livre insere um pilar com a seção, o ponto fixo, os lances, os engastes, a flambagem e o cobrimento dele.` : 'Pegue os dados de um pilar existente e insira novos com eles.'}</Hint>
      <div className="row wrap">
        <Select label="Novo ponto fixo" value={ajuste} options={AJUSTES} onChange={setAjuste} />
        <Check label="Manter o contorno dos pilares" checked={manter} onChange={setManter} />
        <Button disabled={!pilaresSel.length} onClick={() => exec('pilar.pontoFixo', { ids: pilaresSel, ajuste, mantemPosicao: manter })}>Aplicar o ponto fixo aos pilares selecionados</Button>
      </div>

      <h4>Panos (lajes)</h4>
      {b.lajes.length === 0 ? <Hint>Sem lajes lançadas.</Hint> : (
        <>
          <Select label="Pano de origem dos dados" value={lajeOrigem?.id ?? ''} options={b.lajes.map((l) => ({ v: l.id, label: `${l.nome} (${b.grupos.find((g) => g.id === l.grupo)?.nome ?? l.grupo})` }))} onChange={setOrigem} />
          <div className="row wrap">
            {Object.entries(CAMPOS_COPIA_LAJE).map(([k, c]) => <Check key={k} label={`Copiar dado: ${c.rotulo.toLowerCase()}`} checked={campos.includes(k)} onChange={(v) => setCampos(v ? [...campos, k] : campos.filter((x) => x !== k))} />)}
          </div>
          <Button disabled={!lajesSel.filter((id) => id !== lajeOrigem?.id).length || !campos.length} onClick={() => exec('laje.copiarDados', { de: lajeOrigem.id, para: lajesSel.filter((id) => id !== lajeOrigem.id), campos })}>Copiar os dados para as lajes selecionadas</Button>
          {campos.includes('plano') && (() => {
            const alertas = lajesSel.filter((id) => id !== lajeOrigem.id).flatMap((id) => { const z = b.lajes.find((x) => x.id === id); const t = z ? CAMPOS_COPIA_LAJE.plano.alerta?.(lajeOrigem, z) : null; return t ? [t] : []; });
            return alertas.length > 0 ? <Note data-alerta-plano-copia><b>Atenção: troca de plano.</b> {alertas.map((t, i) => <div key={i}>{t}</div>)}</Note> : null;
          })()}
          <Hint>Copie tipo, direção, desnível, plano de inclinação, engastes, cobrimento, tabela e armadura base entre panos do mesmo grupo (o plano de outro grupo não é copiado).</Hint>
        </>
      )}

      <h4>Numeração de pórticos e vigas</h4>
      <Button disabled={!grupo} onClick={() => exec('portico.renumerar', { grupo })}>Renumerar pórticos e vigas do grupo</Button>
      {erros.length === 0 ? <Hint>Numeração do grupo sem erros.</Hint> : erros.map((e) => <Note key={e.codigo} tone="bad">{e.mensagem}</Note>)}
    </Group>
  );
}
