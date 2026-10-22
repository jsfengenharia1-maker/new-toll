// N2g: card "Resistência ao fogo" da aba Dimensionamento: TRRF, TRF atingido e folga por elemento.
import { useState } from 'react';
import { Check, Hint, Pill } from '../ui';
import { abrirJanela, LinhaElemento } from './Revisao';
import { useBuilding } from './store';

const SITUACAO = { ok: { tone: 'ok', txt: 'atende', cls: '' }, review: { tone: 'warn', txt: 'revisar', cls: 'warn' }, fail: { tone: 'bad', txt: 'não atende', cls: 'bad' } } as const;

export function FogoCard({ onIr }: { onIr: (tipo: 'viga' | 'pilar' | 'laje', id: string, pavimento?: string) => void }) {
  const { dim } = useBuilding();
  const [so, setSo] = useState(false);
  const fogo = dim?.fogo;
  if (!fogo) return null;
  const linhas = so ? fogo.elementos.filter((e) => e.status !== 'ok') : fogo.elementos;
  const r = fogo.resumo;
  return (
    <div className="card" data-card-fogo>
      <h3>Resistência ao fogo</h3>
      <p className="small">{r.ok}/{r.total} atendem · {r.revisar} a revisar · {r.naoAtende} não atendem. TRRF: {fogo.grupos.map((g) => `${g.nome} ${g.trrf} min`).join(', ')}.</p>
      <div className="row wrap"><Check label="só o que não atende" checked={so} onChange={setSo} /></div>
      <table className="data quadro">
        <thead><tr><th>Elemento</th><th>Tipo</th><th>Pavimento</th><th>TRRF (min)</th><th>TRF (min)</th><th>Folga (min)</th><th>Método</th><th>Situação</th></tr></thead>
        <tbody>
          {linhas.map((e) => {
            const s = SITUACAO[e.status];
            const trf = e.metodo === 'analítico' ? String(e.trf) : e.trf > 0 ? `${e.limiteTabela ? '≥ ' : ''}${e.trf}` : '< 30';
            return (
              <LinhaElemento key={`${e.tipo}-${e.id}-${e.pavimento ?? ''}`} className={`click ${s.cls}`} title={e.mensagens.join(' ') || `${e.tabela}: exigido ${e.exigido}; adotado ${e.adotado}`} ir={() => onIr(e.tipo, e.id, e.pavimento)} abrir={() => abrirJanela({ tipo: e.tipo, id: e.id, pavimento: e.pavimento })}>
                <td className="tl">{e.nome}</td><td className="tl">{e.tipo}</td><td className="tl">{e.pavimento ?? '—'}</td><td className="num">{e.trrf}</td><td className="num">{trf}</td><td className="num">{e.folga}</td><td className="tl small">{e.metodo}</td><td><Pill tone={s.tone}>{s.txt}</Pill></td>
              </LinhaElemento>
            );
          })}
        </tbody>
      </table>
      <Hint>TRF = maior TRRF tabelado atendido (vigas e lajes, NBR 15200:2004 até 120 min) ou o TRF calculado pelo método analítico (pilares). Passe o mouse na linha para ver o exigido e o adotado; duplo clique abre a janela do elemento.</Hint>
    </div>
  );
}
