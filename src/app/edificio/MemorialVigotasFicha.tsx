// Memorial das vigotas por ficha e moldadas no local (frente E3b): vigotas por tipo da série, classe de agressividade e nível
// de protensão, momentos de serviço comparados com o da ficha, redistribuição, vigotas à parte, erros e avisos, e o
// quantitativo (vigotas por tipo e armaduras das moldadas). Os dados vêm do núcleo (`vigotasNoMemorial`, `quantitativoVigotas`).
import type { ReactNode } from 'react';
import { fmt } from './Detalhamento';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import { vigotasNoMemorial } from '../../core/building/vigotasRelatorio';

export function MemorialVigotasFicha({ dim, h2 }: { dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const linhas = vigotasNoMemorial(dim?.vigotas ?? []);
  if (!linhas.length) return null;
  const qv = (dim?.quantitativoVigotas ?? []).filter((x) => x.familia !== 'trelicada'), qm = dim?.quantitativoMoldadas ?? [];
  return (
    <>
      {h2('Vigotas por ficha e moldadas no local')}
      <div data-memorial-vigotas-ficha>
        <p>Cada vigota real recebe os esforços do alinhamento da grelha mais próximo (envoltória ELU de todos os pavimentos do grupo), com momentos mínimos por tipo de vão e igualação ponto a ponto da discretização (passo de 0,25 m) [a confirmar]. O tipo da série é o de menor momento último que cobre o momento positivo; os dados de ficha são do fabricante e não são verificados pelo programa.</p>
        {linhas.map((l) => (
          <div key={l.laje} className="avoid" data-memorial-vigotas-laje={l.laje}>
            <h3>Laje {l.nome} · {l.ficha} {l.serie} ({l.familia}) · {l.vigotas} vigotas{l.pavimentos > 1 ? ` · ${l.pavimentos} pavimentos` : ''}</h3>
            <p>Tipos: {l.tipos.map((t) => `${t.tipo} × ${t.vigotas}`).join(', ')}.{l.protensao ? ` Classe de agressividade ${l.protensao.caa}: protensão ${l.protensao.nivel}, combinação ${l.protensao.combinacao} (NBR 6118, Tabela 13.4) [a confirmar].` : ''}{l.redistribuicao.length ? ` Redistribuição dos negativos: ${l.redistribuicao.map((r) => `grupo ${r.grupo} (δ = ${fmt(r.delta)})`).join(', ')}.` : ''}</p>
            {l.servico.length > 0 && (
              <table>
                <thead><tr><th>Grupo</th><th>Tipo</th><th>Mserv (kN·m)</th><th>Admissível da ficha (kN·m)</th><th>Situação</th></tr></thead>
                <tbody>{l.servico.map((s) => <tr key={s.grupo}><td className="l">G{s.grupo}</td><td className="l">{s.tipo}</td><td>{fmt(s.Mserv)}</td><td>{s.Madm === null ? '—' : fmt(s.Madm)}</td><td className="l">{s.ok ? 'atende' : 'NÃO ATENDE'}</td></tr>)}</tbody>
              </table>
            )}
            {l.especiais.length > 0 && <p>Vigotas à parte: {l.especiais.map((e) => `${e.vigota} (${e.motivo})`).join(', ')}.</p>}
            {l.erros.length > 0 && <ul>{l.erros.map((m, i) => <li key={i}>{m}</li>)}</ul>}
            {l.avisos.length > 0 && <ul>{l.avisos.map((m, i) => <li key={i}><i>{m}</i></li>)}</ul>}
          </div>
        ))}
        {qv.length > 0 && (
          <table data-memorial-quantitativo-vigotas>
            <caption>Quantitativo das vigotas por tipo (com perdas)</caption>
            <thead><tr><th>Tipo</th><th>Vigotas</th><th>Comprimento (m)</th><th>Com perdas (m)</th></tr></thead>
            <tbody>{qv.map((q) => <tr key={`${q.familia}|${q.tipo}`}><td className="l">{q.tipo}</td><td>{q.vigotas}</td><td>{fmt(q.comprimento)}</td><td>{fmt(q.comprimentoComPerdas)}</td></tr>)}</tbody>
          </table>
        )}
        {qm.length > 0 && (
          <table data-memorial-quantitativo-moldadas>
            <caption>Armaduras das nervuras moldadas no local</caption>
            <thead><tr><th>Armadura</th><th>Aço</th><th>φ (mm)</th><th>Comprimento (m)</th><th>Peso (kg)</th><th>Com perdas (kg)</th></tr></thead>
            <tbody>{qm.map((q) => <tr key={`${q.posicao}|${q.aco}|${q.phi}`}><td className="l">{q.posicao}</td><td className="l">{q.aco}</td><td>{fmt(q.phi, 1)}</td><td>{fmt(q.comprimento)}</td><td>{fmt(q.peso)}</td><td>{fmt(q.pesoComPerdas)}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
