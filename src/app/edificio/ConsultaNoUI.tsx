// Tabela da consulta de um nó (V3/V6d): deslocamentos por caso e combinação e taxa de armadura da laje. Usada na aba
// Deslocamentos e no painel da vista 3D (clique no nó).
import type { ConsultaNo } from '../../core/resultados/consultas';

const mm = (v: number, d = 2) => (v * 1000).toFixed(d).replace('.', ',');
const num = (v: number, d = 2) => v.toFixed(d).replace('.', ',');

export function TabelaConsultaNo({ consulta }: { consulta: ConsultaNo }) {
  return (
    <div className="tablewrap" data-consulta-no={consulta.no}>
      <p className="hint">Nó {consulta.no} da malha em ({num(consulta.pos[0])}; {num(consulta.pos[1])}; {num(consulta.pos[2])}) m, a {num(consulta.distancia)} m do ponto pedido.</p>
      <table className="data quadro">
        <thead><tr><th>Caso ou combinação</th><th>ux (mm)</th><th>uy (mm)</th><th>uz (mm)</th><th>rx (mrad)</th><th>ry (mrad)</th><th>rz (mrad)</th></tr></thead>
        <tbody>
          {[...consulta.casos.map((c) => ({ ...c, tipo: 'Caso' })), ...consulta.combinacoes.map((c) => ({ ...c, tipo: c.tipo }))].map((c, i) => (
            <tr key={`${c.nome}-${i}`}>
              <td className="tl">{c.tipo === 'Caso' ? `Caso ${c.nome}` : `${c.tipo} · ${c.nome}`}</td>
              {c.u.map((v, k) => <td key={k} className="num">{mm(v)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {consulta.armadura && <p className="hint">Laje {consulta.armadura.nome}: As necessária positiva {num(consulta.armadura.pos[0])} / {num(consulta.armadura.pos[1])} cm²/m e negativa {num(consulta.armadura.neg[0])} / {num(consulta.armadura.neg[1])} cm²/m (direções 0 / 1 da malha).</p>}
    </div>
  );
}
