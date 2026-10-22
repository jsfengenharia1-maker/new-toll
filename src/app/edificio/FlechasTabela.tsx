// N2f: tabela de flechas por tipo (total, ativa, variável, instantânea) nas janelas da viga e da laje.
import { linhasFlechas, type FlechasElemento } from '../../core/building/flechas';
import { KV, Pill } from '../ui';

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');

export function TabelaFlechas({ f }: { f: FlechasElemento }) {
  const i = f.instantaneas;
  const e = f.etapas;
  return (
    <>
      <table className="data" data-flechas>
        <thead>
          <tr><th>Flecha</th><th>Valor (mm)</th><th>Limite</th><th>Limite (mm)</th><th>Situação</th></tr>
        </thead>
        <tbody>
          {linhasFlechas(f).map((l) => (
            <tr key={l.tipo}>
              <td className="tl">{l.rotulo}</td>
              <td className="num">{fmt(l.mm, 1)}</td>
              <td>{l.texto}</td>
              <td className="num">{l.limiteMm === null ? '—' : fmt(l.limiteMm, 1)}</td>
              <td><Pill tone={l.ok ? 'ok' : 'bad'}>{l.ok ? 'atende' : 'não atende'}</Pill></td>
            </tr>
          ))}
        </tbody>
      </table>
      <KV rows={[
        ['Método', f.metodo === 'etapas' ? 'etapas de carga (NBR 6118, 17.3.2.1.2)' : f.metodo === 'fator' ? 'fator único 1 + αf' : 'fatores simplificados × elástica'],
        ['Instantâneas pp / alvenaria / revestimento / Q (mm)', `${fmt(i.pp * 1000, 1)} / ${fmt(i.alvenaria * 1000, 1)} / ${fmt(i.revestimento * 1000, 1)} / ${fmt(i.q * 1000, 1)}`],
        ...(e ? [
          ['ξ médio / λ', `${fmt(e.xiMedio)} / ${fmt(e.lambda)}`] as [string, string],
          ['αg / αq (ativa)', `${fmt(e.alfaG)} / ${fmt(e.alfaQ)}`] as [string, string],
          ['Paredes aos (dias)', String(e.tParedes)] as [string, string],
        ] : []),
        ['ρ′', `${fmt(f.rho * 100, 2)} %`],
        ...(f.fissuracao ? [['Fissuração (δ fissurada / elástica)', fmt(f.fissuracao)] as [string, string]] : []),
      ]} />
    </>
  );
}
