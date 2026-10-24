// Fundação do pilar-parede (FU7d): lança a sapata, o bloco sobre estacas ou o tubulão sob o pilar-parede (retângulo
// envolvente, reações da base no centroide), mostra o resultado e a iteração de B das molas da base com a sapata calculada.
import { useState } from 'react';
import { Button, Hint, Pill, Select } from '../ui';
import { TIPO_FUNDACAO_LABEL } from '../../core/building/fundacao';
import { referenciaDoPP } from '../../core/building/fundacaoPilarParede';
import type { TipoFundacao } from '../../core/building/types';
import { useBuilding } from './store';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const cm = (v: number) => fmt(v * 100, 0);

/** Seção da janela do pilar-parede: fundação própria e iteração de B das molas. */
export function FundacaoPilarParede({ id }: { id: string }) {
  const { exec } = useBuilding();
  const b = useBuilding((s) => s.sessao.modelo), dim = useBuilding((s) => s.dim), an = useBuilding((s) => s.analise);
  const [tipo, setTipo] = useState<TipoFundacao>('sapata');
  const pp = b.pilaresParede?.find((q) => q.id === id);
  if (!pp || pp.nasce !== 'fundacao') return null;
  const ref = referenciaDoPP(b, pp), el = b.fundacao?.elementos.find((e) => e.pilares.includes(id));
  const r = el ? dim?.fundacoes?.find((f) => f.id === el.id) : undefined;
  const sem = b.fundacao?.terreno.estacas.length === 0;
  const it = an?.baseIterada, dimsIt = it?.dims[id];
  return (
    <div data-fund-pp={id}>
      <h4>Fundação do pilar-parede</h4>
      {ref && <p className="small">Retângulo envolvente {cm(ref.ap)} × {cm(ref.bp)} cm centrado no centroide dos lados ({fmt(ref.c[0])} ; {fmt(ref.c[1])} m), no ângulo do pilar-parede. As reações da base (N, V, M no centroide) são as cargas do elemento.</p>}
      {!el && (
        <div className="row wrap">
          <Select label="Tipo" value={tipo} options={(['sapata', 'bloco', 'tubulao'] as const).map((t) => ({ v: t, label: TIPO_FUNDACAO_LABEL[t] }))} onChange={(v) => setTipo(v as TipoFundacao)} />
          <Button variant="primary" data-fund-pp-lancar disabled={tipo === 'bloco' && !!sem} onClick={() => exec('fundacao.criar', { pilar: id, tipo, posicao: 'centrada' })}>Lançar fundação</Button>
        </div>
      )}
      {!el && tipo === 'bloco' && sem && <Hint>Cadastre um tipo de estaca no terreno (módulo Fundações) para lançar o bloco.</Hint>}
      {el && (
        <table className="data quadro" data-fund-pp-resultado>
          <thead><tr><th>Elemento</th><th>Tipo</th><th>Resultado</th><th>Situação</th><th /></tr></thead>
          <tbody>
            <tr>
              <td className="tl"><b>{el.nome}</b></td><td className="tl">{TIPO_FUNDACAO_LABEL[el.tipo]}</td>
              <td className="tl">{r ? r.resumo : 'calcule o edifício'}</td>
              <td className="tl">{r ? <Pill tone={r.status === 'ok' ? 'ok' : 'bad'}>{r.status === 'ok' ? 'atende' : 'não atende'}</Pill> : '—'}</td>
              <td><Button variant="danger" onClick={() => exec('fundacao.remover', { ids: [el.id] })}>Remover</Button></td>
            </tr>
          </tbody>
        </table>
      )}
      {r?.mensagens.map((m, i) => <p key={i} className="hint bad">{m}</p>)}
      {el?.tipo === 'sapata' && pp.vinculoBase !== 'molas' && (
        <div className="row wrap">
          <Button data-fund-pp-molas onClick={() => exec('pilarParede.editar', { id, vinculoBase: 'molas' })}>Base sobre molas (B iterado com a sapata)</Button>
          <Hint>Com a base sobre molas de Winkler, a largura B das molas passa a ser a da sapata calculada (reanálise até convergir).</Hint>
        </div>
      )}
      {it && dimsIt && (
        <div data-fund-pp-iteracao>
          <p className="small">
            Iteração de B das molas: <Pill tone={it.convergiu ? 'ok' : 'bad'}>{it.convergiu ? 'convergiu' : 'sem convergência'}</Pill> em {it.iteracoes} análise(s) (máx. {it.maximo}; tolerância {cm(it.tolerancia)} cm).
            Sapata usada nas molas: {cm(dimsIt.A)} × {cm(dimsIt.B)} cm.
          </p>
          <table className="data quadro">
            <thead><tr><th>Análise</th><th>A × B usadas (cm)</th><th>A × B calculadas (cm)</th><th>Variação (cm)</th></tr></thead>
            <tbody>
              {it.passos.filter((p) => p.pilarParede === id).map((p) => (
                <tr key={p.iteracao}>
                  <td className="num">{p.iteracao}</td>
                  <td className="tl">{p.usadas ? `${cm(p.usadas.A)} × ${cm(p.usadas.B)}` : 'espessura + 2 × balanço'}</td>
                  <td className="tl">{cm(p.calculadas.A)} × {cm(p.calculadas.B)}</td>
                  <td className="num">{Number.isFinite(p.variacao) ? cm(p.variacao) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
