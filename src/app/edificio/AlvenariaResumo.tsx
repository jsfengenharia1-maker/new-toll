// Cartão "Alvenaria estrutural" da aba Dimensionamento e memorial da alvenaria (frente E1e).
// As tabelas do memorial vêm de core/building/memorialAlvenaria.ts; o cartão lê dim.alvenaria.
import type { ReactNode } from 'react';
import { Hint, Pill } from '../ui';
import { memorialAlvenaria } from '../../core/building/memorialAlvenaria';
import { linhasDesligamentos, linhasVigasMuro } from '../../core/building/alvenariaLista';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import type { BuildingModel } from '../../core/building/types';
import { useBuilding } from './store';

export function CartaoAlvenaria() {
  const dim = useBuilding((s) => s.dim);
  const al = dim?.alvenaria;
  if (!al) return null;
  const desl = linhasDesligamentos(al);
  const vigas = linhasVigasMuro(al);
  return (
    <div className="card" data-alv-cartao>
      <h4>Alvenaria estrutural</h4>
      {al.resumoBlocos.length === 0 ? (
        <p className="muted">Só há paredes de alvenaria genérica: sem contagem de blocos.</p>
      ) : (
        <table className="data quadro" data-alv-resumo-blocos>
          <thead><tr><th className="tl">Bloco</th><th className="num">Inteiros</th><th className="num">Meios blocos</th><th className="num">Peças de canto</th><th className="num">Canaletas</th><th className="num">Total</th><th className="num">Área líquida (m²)</th></tr></thead>
          <tbody>
            {al.resumoBlocos.map((r) => (
              <tr key={r.bloco}>
                <td className="tl">{r.nome}</td><td className="num">{r.inteiros}</td><td className="num">{r.meios}</td><td className="num">{r.cantos}</td>
                <td className="num">{r.canaletas}</td><td className="num">{r.total}</td><td className="num">{r.area.toFixed(2).replace('.', ',')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {al.desligamentos.length > 0 && (
        <>
          <h4>Pilares em contato com muros de alvenaria</h4>
          <table className="data quadro" data-alv-cartao-desligamentos>
            <thead><tr><th className="tl">Muro</th><th className="tl">Pilar</th><th className="tl">Pavimento</th><th className="tl">Laje junto ao pilar</th><th className="tl">Desligado do muro</th></tr></thead>
            <tbody>
              {al.desligamentos.map((d, i) => {
                const linha = desl[i];
                return (
                  <tr key={i}>
                    <td className="tl">{d.nomeParede}</td><td className="tl">{linha.pilar}</td><td className="tl">{linha.pavimento}</td><td className="tl">{linha.laje}</td>
                    <td className="tl"><Pill tone={d.desligado ? 'ok' : 'warn'}>{linha.desligado}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Hint>O desligamento muro-pilar só vale com lajes de vigotas; com laje maciça, lance o muro como elemento (MURO_PILAR_MACICA).</Hint>
        </>
      )}
      {al.vigasMuro.length > 0 && (
        <>
          <h4>Vigas sobre muros de alvenaria</h4>
          <table className="data quadro" data-alv-cartao-vigas>
            <thead><tr><th className="tl">Viga</th><th className="tl">Muro</th><th className="tl">Papel</th><th className="tl">Seção</th><th className="tl">Armadura</th><th className="tl">Situação</th></tr></thead>
            <tbody>
              {al.vigasMuro.map((v, i) => {
                const linha = vigas[i];
                return (
                  <tr key={i}>
                    <td className="tl">{linha.viga}</td><td className="tl">{v.nomeParede}</td><td className="tl">{linha.papel}</td><td className="tl">{linha.secao}</td><td className="tl">{linha.armadura}</td>
                    <td className="tl"><Pill tone={v.status === 'ok' ? 'ok' : 'bad'}>{linha.situacao}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export function MemorialAlvenaria({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const ts = dim ? memorialAlvenaria(b, dim) : [];
  if (!ts.length) return null;
  return (
    <>
      {h2('Alvenaria estrutural e blocos de concreto')}
      {ts.map((t) => (
        <div className="avoid" key={t.id} data-memorial-alvenaria={t.id}>
          <h3>{t.titulo}</h3>
          <table>
            <thead><tr>{t.colunas.map((c, i) => <th key={i} className="l">{c}</th>)}</tr></thead>
            <tbody>{t.linhas.map((l, i) => <tr key={i}>{l.map((c, k) => <td key={k} className="l">{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ))}
      <p>Premissas e1e-* (materiais, verificação por pano, alvenaria armada, verga, modulação, desligamento muro-pilar e vigas sobre muros) a confirmar com o texto da NBR 16868; ver a seção de premissas e docs/pendencias-usuario.md.</p>
    </>
  );
}
