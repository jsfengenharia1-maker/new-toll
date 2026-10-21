// Lance do pilar (E1a): início (apoiado ou na fundação), seção, ponto fixo, ângulo, deslocamento e fck próprios do lance,
// e o apoio detectado do pilar que nasce acima da fundação. Aparece no grupo de vínculos para um pilar selecionado.
import { Button, Hint, NumField, OptNumField, Select } from '../ui';
import { geoLance, inicioDe, lancesDoPilar, type Ajuste, type BuildingModel, type Pilar } from '../../core/building/types';
import { fckDe } from '../../core/building/materiais';
import { useBuilding } from './store';
import { ApoioDoPilar } from './Revisao';

export const AJUSTES_LANCE: { v: Ajuste; label: string }[] = [
  { v: 'c', label: 'centro' }, { v: 'so', label: 'canto inf. esq.' }, { v: 's', label: 'face inferior' }, { v: 'se', label: 'canto inf. dir.' }, { v: 'l', label: 'face direita' },
  { v: 'ne', label: 'canto sup. dir.' }, { v: 'n', label: 'face superior' }, { v: 'no', label: 'canto sup. esq.' }, { v: 'o', label: 'face esquerda' },
];

const cm = (v: number) => +(v * 100).toFixed(2);

export function LanceDoPilar({ b, p, pavId, pavNome }: { b: BuildingModel; p: Pilar; pavId: string; pavNome: string }) {
  const { exec } = useBuilding();
  const lances = lancesDoPilar(b, p), primeiro = lances[0]?.id === pavId;
  const e = p.secoes?.find((s) => s.pavimento === pavId);
  const g = geoLance(p, pavId), s = g.secao;
  const fckProprio = p.fck?.find((f) => f.pavimento === pavId)?.fck;
  const lance = (params: Record<string, unknown>) => exec('pilar.secaoLance', { id: p.id, pavimento: pavId, ...params });
  return (
    <>
      <p className="small"><b>Lance de {pavNome}</b> — seção, ponto fixo e material próprios do lance</p>
      {p.nasce !== 'fundacao' && (
        <div className="row wrap">
          <Select label="Início do pilar" value={inicioDe(p)} options={[{ v: 'apoiado', label: 'apoiado (pilar, viga ou laje)' }, { v: 'fundacao', label: 'fundação (vínculo externo)' }]} onChange={(v) => exec('pilar.editar', { id: p.id, inicio: v })} />
        </div>
      )}
      <ApoioDoPilar id={p.id} />
      <div className="row wrap">
        {s.tipo === 'ret'
          ? <><NumField label="b (x local)" unit="cm" width={86} value={cm(s.b)} onChange={(v) => v > 0 && lance({ secao: { tipo: 'ret', b: v / 100, h: s.h } })} /><NumField label="h (y local)" unit="cm" width={86} value={cm(s.h)} onChange={(v) => v > 0 && lance({ secao: { tipo: 'ret', b: s.b, h: v / 100 } })} /></>
          : <NumField label="Diâmetro" unit="cm" width={100} value={cm(s.d)} onChange={(v) => v > 0 && lance({ secao: { tipo: 'circ', d: v / 100 } })} />}
        <OptNumField label={`fck (vazio = ${fckDe(b, 'pilar', pavId)})`} unit="MPa" width={130} value={fckProprio} onChange={(v) => lance({ fck: v ?? 0 })} />
      </div>
      {!primeiro && (
        <div className="row wrap">
          <Select label="Ponto fixo do lance" value={g.p.ajuste} options={AJUSTES_LANCE} onChange={(v) => lance({ ajuste: v })} />
          <NumField label="Ângulo" unit="°" width={90} value={g.p.angulo} onChange={(v) => lance({ angulo: v })} />
          <NumField label="Desloc. x" unit="cm" width={96} value={cm(e?.dx ?? 0)} onChange={(v) => lance({ dx: v / 100 })} />
          <NumField label="Desloc. y" unit="cm" width={96} value={cm(e?.dy ?? 0)} onChange={(v) => lance({ dy: v / 100 })} />
        </div>
      )}
      <div className="row wrap"><Button disabled={!e && fckProprio === undefined} onClick={() => lance({})}>Voltar ao pilar</Button></div>
      <Hint>{primeiro ? 'O primeiro lance usa o ponto fixo, o ângulo e a posição do pilar (edite o pilar).' : 'A parte do lance fora da projeção do lance de baixo liga-se a ele por trecho rígido horizontal (momento N·e).'}</Hint>
    </>
  );
}
