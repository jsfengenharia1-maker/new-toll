// Seletor único de tipo de pano e pano a definir (frente E3f, C7.1, C7.15, C7.16): troca o tipo dos panos selecionados entre vigotas,
// alveolar, nervurada bidirecional e maciça, ou os transforma em pano a definir (espessura, desnível e plano; o cálculo recusa
// panos a definir). O radier lança a placa sobre base elástica (`radier.criar`) com o contorno do pano; a laje mista (aço) aparece indisponível, com a nota. Comandos: `laje.atribuir` e `laje.aDefinir`.
import { useState } from 'react';
import { fichasAlveolaresDisponiveis } from '../../core/building/alveolares';
import { formasDisponiveis } from '../../core/building/nervuradas';
import { TIPOS_PANO } from '../../core/building/planos';
import type { BuildingModel, Laje, TipoLaje } from '../../core/building/types';
import { Button, Group, Hint, Modal, NumField, Select } from '../ui';
import { useStore } from '../store';
import { usePlanta } from './plantaStore';
import { useBuilding } from './store';

type TipoPanoId = (typeof TIPOS_PANO)[number]['id'];
const idDoTipo = (l: Laje): TipoPanoId => (l.definir ? 'definir' : l.tipo.tipo === 'macica' ? 'macica' : l.tipo.tipo === 'nervurada' ? 'nervurada' : l.tipo.tipo === 'alveolar' ? 'alveolar' : 'vigotas');

/** Tipo de laje inicial ao escolher o tipo de pano: o do lançamento (grupo "Lajes") se for do mesmo tipo; senão um padrão do tipo. */
function tipoPadrao(b: BuildingModel, id: TipoPanoId, tl: TipoLaje, espessura: number): TipoLaje {
  if (id === 'macica') return tl.tipo === 'macica' ? tl : { tipo: 'macica', h: espessura };
  if (id === 'nervurada') return tl.tipo === 'nervurada' ? tl : { tipo: 'nervurada', forma: formasDisponiveis(b)[0]?.id ?? 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 };
  if (id === 'alveolar') {
    if (tl.tipo === 'alveolar') return tl;
    const f = fichasAlveolaresDisponiveis(b)[0]?.ficha;
    return { tipo: 'alveolar', ficha: f?.id ?? 'ex:alveolar', placa: f?.placas[0]?.id ?? '' };
  }
  return tl.tipo === 'vigotas' || tl.tipo === 'trelicada' || tl.tipo === 'moldada' ? tl : { tipo: 'vigotas', ficha: 'cat:trelicadas', serie: 'H12' };
}

function Corpo({ b, ls }: { b: BuildingModel; ls: Laje[] }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const l0 = ls[0], ids = ls.map((l) => l.id);
  const [escolha, setEscolha] = useState<TipoPanoId>(idDoTipo(l0));
  const [dica, setDica] = useState('');
  const [espRadier, setEspRadier] = useState(0.3);
  const [espessura, setEspessura] = useState(l0.espessuraDefinir ?? 0.1);
  const [nivel, setNivel] = useState(l0.nivel ?? 0);
  const [plano, setPlano] = useState(l0.plano ?? '');
  const planos = (b.planos ?? []).filter((p) => p.grupo === l0.grupo);
  const aviso = (r: { ok: boolean; erros: { mensagem: string }[] }) => { if (!r.ok) useStore.getState().set({ message: r.erros[0]?.mensagem ?? 'Recusado.' }); };
  const escolher = (id: TipoPanoId) => {
    const t = TIPOS_PANO.find((x) => x.id === id)!;
    if (!t.disponivel) { setDica(`${t.rotulo}: ${t.nota ?? 'indisponível'}.`); return; }
    setDica(''); setEscolha(id);
    if (id !== 'definir' && id !== 'radier') aviso(exec('laje.atribuir', { ids, tipo: tipoPadrao(b, id, pl.tipoLaje, espessura) }));
  };
  return (
    <div data-tipo-pano>
      <p className="small"><b>{ls.length > 1 ? `${ls.length} panos` : l0.nome}</b></p>
      <div className="row wrap">
        <Select label="Tipo de pano" value={escolha} options={TIPOS_PANO.map((t) => ({ v: t.id, label: t.disponivel ? t.rotulo : `${t.rotulo} (indisponível)` }))} onChange={escolher} />
      </div>
      {dica && <Hint>{dica}</Hint>}
      {escolha === 'radier' && (
        <div className="row wrap" data-pano-radier>
          <NumField label="Espessura do radier" unit="m" width={120} value={espRadier} onChange={(v) => v >= 0.1 && v <= 3 && setEspRadier(v)} />
          <Button variant="primary" onClick={() => aviso(exec('radier.criar', { contorno: l0.contorno, ...(l0.furos?.length ? { furos: l0.furos } : {}), h: espRadier }))}>Lançar o radier com o contorno do pano</Button>
        </div>
      )}
      {escolha === 'definir' && (
        <div className="row wrap" data-pano-a-definir>
          <NumField label="Espessura do pano a definir" unit="m" width={120} value={espessura} onChange={(v) => v >= 0.05 && v <= 1.5 && setEspessura(v)} />
          <NumField label="Desnível do pano a definir" unit="m" width={120} value={nivel} onChange={(v) => v >= -10 && v <= 10 && setNivel(v)} />
          <Select label="Plano do pano a definir" value={plano} options={[{ v: '', label: 'Horizontal' }, ...planos.map((p) => ({ v: p.id, label: p.nome }))]} onChange={setPlano} />
          <Button variant="primary" onClick={() => aviso(exec('laje.aDefinir', { ids, espessura, nivel, ...(plano ? { plano } : {}) }))}>Aplicar</Button>
        </div>
      )}
      <Hint>Pano a definir (?): a espessura passa às vigas chatas do contorno; o cálculo recusa panos a definir (erro DEFINIR_PANO) até atribuir o tipo da laje. Radier: lança, no nível de fundação, a placa sobre base elástica com o contorno do pano (o pano do pavimento não muda); laje mista (aço) fica fora do escopo.</Hint>
    </div>
  );
}

/** Grupo "Tipo de pano" da doca Propriedades: aparece com panos selecionados. */
export function TipoPanoGrupo({ b }: { b: BuildingModel }) {
  const pl = usePlanta();
  const sel = b.lajes.filter((l) => pl.selecao.has(l.id));
  if (!sel.length) return null;
  return (
    <div data-grupo-tipo-pano>
      <Group title={`Tipo de pano (${sel.length})`} open={false}>
        <Corpo key={sel.map((l) => l.id).join(',')} b={b} ls={sel} />
      </Group>
    </div>
  );
}

/** Aberturas de pano (panos apagados, L7) selecionadas na planta: transformá-las em pano a definir (C7.15). */
function AberturaCorpo({ ids }: { ids: string[] }) {
  const { exec } = useBuilding();
  return (
    <div data-abertura-pano>
      <p className="small"><b>{ids.length > 1 ? `${ids.length} aberturas de pano` : 'Abertura de pano'}</b></p>
      <Button variant="primary" onClick={() => exec('laje.restaurarPano', { ids })}>Transformar em pano a definir</Button>
      <Hint>A abertura (região fechada por vigas sem laje) volta como pano a definir (?); depois o seletor Tipo de pano atribui vigotas, alveolar, nervurada ou maciça.</Hint>
    </div>
  );
}

/** Grupo "Abertura de pano" da doca Propriedades: aparece com aberturas de pano selecionadas. */
export function AberturaPanoGrupo({ b }: { b: BuildingModel }) {
  const pl = usePlanta();
  const ids = (b.panosVazios ?? []).filter((v) => pl.selecao.has(v.id)).map((v) => v.id);
  if (!ids.length) return null;
  return (
    <div data-grupo-abertura-pano>
      <Group title={`Abertura de pano (${ids.length})`} open>
        <AberturaCorpo key={ids.join(',')} ids={ids} />
      </Group>
    </div>
  );
}

/** O mesmo seletor numa janela, para as lajes indicadas (atalho da janela "Antes de calcular"). */
export function JanelaTipoPano({ b, ids, onClose }: { b: BuildingModel; ids: string[]; onClose: () => void }) {
  const ls = b.lajes.filter((l) => ids.includes(l.id));
  if (!ls.length) return null;
  return (
    <Modal titulo="Tipo das lajes" onClose={onClose}>
      <Corpo key={ids.join(',')} b={b} ls={ls} />
    </Modal>
  );
}
