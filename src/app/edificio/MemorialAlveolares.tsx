// Memorial das lajes alveolares (frente E3e): quadro de propriedades das placas das fichas usadas (com a marca da ficha), por laje a
// ficha, a escolha da placa, flexão, comparação de serviço, cortante, negativos na capa, processo construtivo e flecha, lista de
// placas e aço dos negativos. As linhas vêm do núcleo (`placasNoMemorial`, `alveolaresNoMemorial`, `listaDePlacas`).
import type { ReactNode } from 'react';
import { fmt } from './Detalhamento';
import { placasNoMemorial } from '../../core/building/alveolares';
import { alveolaresNoMemorial, listaDePlacas } from '../../core/building/alveolaresDim';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import type { BuildingModel } from '../../core/building/types';

const sd = (ok: boolean | null) => (ok === null ? 'sem dado' : ok ? 'atende' : 'não atende');

export function MemorialAlveolares({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const placas = placasNoMemorial(b);
  const linhas = dim?.alveolares?.length ? alveolaresNoMemorial(dim.alveolares) : [];
  if (!placas.length && !linhas.length) return null;
  const lista = dim?.alveolares?.length ? listaDePlacas(dim.alveolares) : [];
  const aco = dim?.resumoAcoAlveolares ?? [];
  return (
    <>
      {h2('Lajes alveolares')}
      <div data-memorial-alveolares>
        <p>Placas alveolares protendidas pré-moldadas com capa estrutural moldada no local. Análise por grelha unidirecional na direção das placas, com a rigidez EI da ficha; esforços por metro de largura (envoltória ELU de todos os pavimentos do grupo). Os valores resistentes das placas (momentos, cortante, rigidez, negativos) são dados do fabricante, não verificados pelo programa; sem dado na ficha, a verificação correspondente não é feita e aparece como “sem dado”. A resistência ao fogo das alveolares não é verificada.</p>
        {placas.length > 0 && (
          <table data-quadro-placas-alveolares>
            <thead><tr><th>Ficha</th><th>Marca</th><th>Placa</th><th>h (cm)</th><th>Capa (cm)</th><th>Largura (cm)</th><th>Apoio mín / máx (cm)</th><th>Peso próprio (kN/m²)</th><th>Mu (kN·m/m)</th><th>Mfis (kN·m/m)</th><th>VRd (kN/m)</th><th>Negativos</th><th>Usada</th></tr></thead>
            <tbody>
              {placas.map((p) => (
                <tr key={`${p.fichaId}|${p.id}`}>
                  <td className="l">{p.ficha}</td><td className="l">{p.marca}</td><td className="l">{p.id}</td><td>{fmt(p.altura * 100, 0)}</td><td>{fmt(p.capa * 100, 0)}</td><td>{fmt(p.largura * 100, 0)}</td>
                  <td>{fmt(p.apoioMin * 100, 1)} / {fmt(p.apoioMax * 100, 1)}</td><td>{fmt(p.pp)}</td><td>{p.Mu === undefined ? '—' : fmt(p.Mu)}</td><td>{p.Mfis === undefined ? '—' : fmt(p.Mfis)}</td><td>{p.VRd === undefined ? '—' : fmt(p.VRd)}</td><td>{p.negativos}</td><td>{p.usada ? 'sim' : 'não'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {linhas.map((l) => (
          <div key={l.laje} className="avoid" data-memorial-alveolar={l.laje}>
            <h3>Laje {l.laje} · {l.ficha}{l.pavimentos.length > 1 ? ` · ${l.pavimentos.length} pavimentos` : ''}</h3>
            <p>Ficha: {l.ficha} ({l.marca}). Placa adotada {l.placa}{l.escolhida && l.escolhida !== l.placa ? `; a verificação sugere a placa ${l.escolhida}` : ''}. Processo construtivo: {l.processo}.</p>
            <p>
              Flexão positiva: Md {fmt(l.flexao.Md)} kN·m/m{l.flexao.Mu === null ? ' (sem Mu na ficha)' : `, Mu ${fmt(l.flexao.Mu)} kN·m/m`} — {sd(l.flexao.ok)}.
              {l.servico ? ` Serviço (protensão ${l.servico.nivel}, CAA ${l.servico.caa}, combinação ${l.servico.combinacao}): Ms ${fmt(l.servico.Ms)} kN·m/m${l.servico.Madm === null ? ' (sem momento admissível na ficha)' : `, Madm ${fmt(l.servico.Madm)} kN·m/m`} — ${sd(l.servico.ok)}.` : ' Serviço: sem momentos de serviço na ficha.'}
              {' '}Cortante: {l.cortante.map((c, i) => `${i === 0 ? 'início' : 'fim'} Vd ${fmt(c.Vd)} kN/m${c.VRd === null ? ' (sem VRd)' : `, VRd ${fmt(c.VRd)} kN/m`} — ${sd(c.VRd === null ? null : c.ok)}`).join('; ')}.
            </p>
            <p>Negativos na capa: {l.negativos.map((n, i) => `${i === 0 ? 'início' : 'fim'}: ${n ?? 'sem negativo de cálculo'}`).join('; ')}.{l.flecha ? ` Flecha: ${l.flecha}.` : ''}</p>
            {l.mensagens.length > 0 && <ul>{l.mensagens.map((m, i) => <li key={i}><i>{m}</i></li>)}</ul>}
          </div>
        ))}
        {lista.length > 0 && (
          <table data-lista-placas-alveolares>
            <thead><tr><th>Placa</th><th>Ficha</th><th>Largura (cm)</th><th>Comprimento (m)</th><th>Quantidade</th><th>Observação</th></tr></thead>
            <tbody>
              {lista.map((x, i) => <tr key={i}><td className="l">{x.placa}</td><td className="l">{x.ficha}</td><td>{fmt(x.largura * 100, 0)}</td><td>{fmt(x.comprimento)}</td><td>{x.quantidade}</td><td className="l">{[x.cortada ? 'borda cortada' : '', x.obliqua ? 'oblíqua' : ''].filter(Boolean).join('; ') || '—'}</td></tr>)}
            </tbody>
          </table>
        )}
        {aco.length > 0 && (
          <table data-aco-alveolares>
            <thead><tr><th>Aço</th><th>φ (mm)</th><th>Comprimento (m)</th><th>Peso (kg)</th><th>Peso com perdas (kg)</th></tr></thead>
            <tbody>{aco.map((a) => <tr key={a.phi}><td className="l">{a.aco}</td><td>{fmt(a.phi, a.phi % 1 ? 1 : 0)}</td><td>{fmt(a.comprimento)}</td><td>{fmt(a.peso)}</td><td>{fmt(a.pesoComPerdas)}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
