// Menu de lajes dos resultados (V6f, C12.15): a mesma tabela da aba Dimensionamento (momentos, armaduras, fissuração e flechas
// por laje e pavimento), reaproveitada na aba Isovalores. Um clique leva à laje na planta; o duplo clique abre a janela da
// laje (resultados, vista e edição da armadura).
import type { DimEdificio } from './calculo';
import { abrirJanela, LinhaElemento, ST_TXT } from './Revisao';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const cls = (st: string) => (st === 'fail' ? 'bad' : st === 'review' ? 'warn' : '');

export function TabelaLajes({ lajes, onIr }: { lajes: DimEdificio['lajes']; onIr: (tipo: 'laje', id: string, pavimento: string) => void }) {
  return (
    <table className="data quadro" data-tabela-lajes={lajes.length}>
      <thead><tr><th>Laje</th><th>Pavimento</th><th>Tipo</th><th>md+ (kN·m/m)</th><th>md− (kN·m/m)</th><th>As+ (cm²/m)</th><th>As− (cm²/m)</th><th>wk / lim. (mm)</th><th>Flecha / lim. (mm)</th><th>Flecha Q / lim. (mm)</th><th>Situação</th></tr></thead>
      <tbody>{lajes.map((x) => (
        <LinhaElemento key={`${x.laje}-${x.pavimento}`} className={`click ${cls(x.status)}`} title={x.mensagens.join(' ')} ir={() => onIr('laje', x.laje, x.pavimento)} abrir={() => abrirJanela({ tipo: 'laje', id: x.laje, pavimento: x.pavimento })}>
          <td className="tl">{x.nome}</td><td className="tl">{x.pavimento}</td><td className="tl">{x.tipo}</td><td className="num">{fmt(x.mPos[0], 1)} / {fmt(x.mPos[1], 1)}</td><td className="num">{fmt(x.mNeg[0], 1)} / {fmt(x.mNeg[1], 1)}</td><td className="num">{fmt(x.As.pos[0])} / {fmt(x.As.pos[1])}</td><td className="num">{fmt(x.As.neg[0])} / {fmt(x.As.neg[1])}</td>
          <td className={`num ${x.wk > x.wkLim + 1e-9 ? 'bad' : ''}`}>{fmt(x.wk, 2)} / {fmt(x.wkLim, 2)}</td><td className={`num ${x.flecha > x.limite + 1e-9 ? 'bad' : ''}`}>{fmt(x.flecha * 1000, 1)} / {fmt(x.limite * 1000, 1)}</td><td className={`num ${x.flechaQ > x.limiteQ + 1e-9 ? 'bad' : ''}`}>{fmt(x.flechaQ * 1000, 1)} / {fmt(x.limiteQ * 1000, 1)}</td><td>{ST_TXT[x.status]}</td>
        </LinhaElemento>))}</tbody>
    </table>
  );
}
