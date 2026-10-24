// Seção T, L ou plana das vigas de fundação (frente E, fatia E5k, C6.22): campos do editor, compartilhados pela viga
// sobre base elástica (BaseElasticaUI) e pela viga de equilíbrio/travamento (Fundacao). Toda alteração é comando
// (`vigaElastica.editar` / `vigaFundacao.editar` com `forma`).
import { geoSecaoVF, textoSecaoVF } from '../../core/building/secaoVF';
import type { FormaVF } from '../../core/building/types';
import type { FormaVFIn } from '../../core/commands/formaVF';
import { NumField, Select } from '../ui';

type TipoForma = FormaVFIn['tipo'];

const OPCOES: { v: TipoForma; label: string }[] = [
  { v: 'retangular', label: 'Retangular' }, { v: 'T', label: 'T (mesa dos dois lados)' }, { v: 'L', label: 'L (mesa de um lado)' }, { v: 'plana', label: 'Plana (retangular larga)' },
];

/**
 * Campos da forma da seção: tipo, largura e espessura da mesa (T e L) e a face da mesa. `bw` e `h` são a alma e a altura da
 * viga; `mesaPadrao` é a face da mesa quando a forma não diz (inferior sobre base elástica, superior no equilíbrio).
 */
export function CampoFormaVF({ forma, bw, h, mesaPadrao, soloContato, onChange }: {
  forma?: FormaVF; bw: number; h: number; mesaPadrao: 'inferior' | 'superior'; soloContato?: boolean; onChange: (f: FormaVFIn) => void;
}) {
  const tipo: TipoForma = forma?.tipo ?? 'retangular';
  const geo = geoSecaoVF(bw, h, forma, mesaPadrao);
  const comMesa = tipo === 'T' || tipo === 'L';
  const mesa = forma?.mesa ?? mesaPadrao;
  const trocar = (t: TipoForma) => {
    if (t === 'T' || t === 'L') onChange({ tipo: t, bf: +(forma?.bf ?? bw + (t === 'T' ? 0.6 : 0.3)).toFixed(3), hf: +(forma?.hf ?? Math.min(0.2, h / 2)).toFixed(3), mesa });
    else onChange({ tipo: t });
  };
  return (
    <div className="row wrap u-items-end" data-forma-vf={tipo}>
      <Select label="Seção" value={tipo} options={OPCOES} onChange={trocar} />
      {comMesa && (<>
        <NumField label="Mesa bf" unit="cm" width={96} value={+(geo.bf * 100).toFixed(2)} onChange={(x) => onChange({ tipo, bf: x / 100, hf: geo.hf, mesa })} />
        <NumField label="Mesa hf" unit="cm" width={96} value={+(geo.hf * 100).toFixed(2)} onChange={(x) => onChange({ tipo, bf: geo.bf, hf: x / 100, mesa })} />
        <Select label="Face da mesa" value={mesa} options={[{ v: 'inferior', label: 'Embaixo (T invertido)' }, { v: 'superior', label: 'Em cima' }] as { v: 'inferior' | 'superior'; label: string }[]} onChange={(m) => onChange({ tipo, bf: geo.bf, hf: geo.hf, mesa: m })} />
      </>)}
      {geo.erro ? <span className="hint bad small">{geo.erro}</span> : tipo !== 'retangular' && (
        <span className="muted small" data-forma-resumo>{textoSecaoVF(geo)}{soloContato ? `; contato com o solo ${Math.round(geo.contato * 100)} cm` : ''}</span>
      )}
    </div>
  );
}
