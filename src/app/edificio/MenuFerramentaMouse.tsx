// Menu das ferramentas Diagonal e Ábaco da planta (E5b): pavimento da ponta final e seção da diagonal (C6.42); forma e altura do ábaco (K1.9.97).
import { pavimentoAcima } from '../../core/building/ferramentasMouse';
import { pavimentosOrdenados } from '../../core/building/types';
import { Hint, NumField, Select, Seg } from '../ui';
import { grupoDaPlanta, usePlanta } from './plantaStore';
import { useBuilding } from './store';

export function MenuFerramentaMouse() {
  const pl = usePlanta();
  const b = useBuilding((s) => s.sessao.modelo);
  const grupo = grupoDaPlanta(b, pl.pavimento);
  if (pl.ferramenta === 'abaco') {
    const a = pl.abacoDef;
    return (
      <div className="escada-menu" data-abaco-menu>
        <Seg small value={a.forma} onChange={(v) => pl.set({ abacoDef: { ...a, forma: v } })} options={[{ v: 'ret', label: 'Retângulo' }, { v: 'poli', label: 'Polígono' }]} />
        <NumField label="Altura do ábaco (0 = a do pano)" unit="cm" width={170} value={a.h} onChange={(v) => v >= 0 && pl.set({ abacoDef: { ...a, h: v } })} />
        <Hint>{grupo ? `Grupo atual: ${grupo.nome}. ` : ''}A zona cresce até os eixos das nervuras (caixotes inteiros).</Hint>
      </div>
    );
  }
  const d = pl.diagonalDef, ps = pavimentosOrdenados(b);
  const atual = ps.find((p) => p.id === pl.pavimento) ?? ps[Math.min(1, ps.length - 1)];
  const acima = atual ? pavimentoAcima(b, atual.id) : null;
  return (
    <div className="escada-menu" data-diagonal-menu>
      <Select label="Pavimento da ponta final" value={d.pavFim} onChange={(v) => pl.set({ diagonalDef: { ...d, pavFim: v } })}
        options={[{ v: '', label: `o de cima${acima ? ` (${ps.find((p) => p.id === acima)?.nome ?? ''})` : ' (nenhum)'}` }, ...ps.filter((p) => p.id !== atual?.id).map((p) => ({ v: p.id, label: p.nome }))]} />
      <NumField label="Largura da diagonal" unit="cm" width={130} value={Math.round(d.b * 1000) / 10} onChange={(v) => v > 0 && pl.set({ diagonalDef: { ...d, b: v / 100 } })} />
      <NumField label="Altura da diagonal" unit="cm" width={130} value={Math.round(d.h * 1000) / 10} onChange={(v) => v > 0 && pl.set({ diagonalDef: { ...d, h: v / 100 } })} />
      <Hint>Cada ponta deve tocar um pilar ou o eixo de uma viga do pavimento respectivo.</Hint>
    </div>
  );
}
