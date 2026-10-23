// Memorial: gabaritos (DXF/DWG) usados no lançamento, com unidade, escala, grupos, papéis das camadas e regras (L2).
import { PAPEIS } from '../../core/building/lancamentoDxf';
import { gruposDaMascara, type BuildingModel } from '../../core/building/types';

const fmt = (v: number, d = 3) => String(+v.toFixed(d)).replace('.', ',');
const UNIDADE: Record<string, string> = { '1': 'm', '0.01': 'cm', '0.001': 'mm' };

export function MemorialGabaritos({ b }: { b: BuildingModel }) {
  if (!b.mascaras.length) return null;
  const lancados = [...b.pilares, ...b.vigas, ...b.eixos, ...b.lajes].filter((x) => x.origemLancamento).length;
  const rotulo = (p: string) => PAPEIS.find((x) => x.papel === p)?.rotulo ?? p;
  return (
    <div data-memorial-gabaritos>
      <h3>Gabaritos (DXF/DWG) e lançamento por camada</h3>
      <table>
        <thead><tr><th className="l">Gabarito</th><th className="l">Arquivo</th><th>Unidade</th><th>Escala (m/un)</th><th className="l">Grupos</th><th className="l">Papéis das camadas</th></tr></thead>
        <tbody>
          {b.mascaras.map((m) => (
            <tr key={m.id}>
              <td className="l">{m.nome}{m.visivel === false ? ' (desligada)' : ''}</td>
              <td className="l">{m.arquivo ? `${m.arquivo.nome} (${m.arquivo.tipo.toUpperCase()})` : '—'}</td>
              <td>{UNIDADE[String(m.escala)] ?? '—'}</td>
              <td>{fmt(m.escala, 6)}</td>
              <td className="l">{gruposDaMascara(m).map((g) => b.grupos.find((x) => x.id === g)?.nome ?? g).join(', ')}</td>
              <td className="l">{m.regras ? Object.entries(m.regras.papeis).filter(([, p]) => p !== 'ignorar').map(([c, p]) => `${m.camadas.find((x) => x.nome === c)?.apelido ?? c}: ${rotulo(p).toLowerCase()}`).join('; ') || '—' : 'sem regras de lançamento'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Unidade pela variável $INSUNITS do arquivo ou, na falta dela, estimada pelo tamanho do desenho (editável). {lancados} elemento(s) lançado(s) a partir de gabarito guardam a origem
        (arquivo e geometria), então reimportar não duplica. Regras de lançamento (a confirmar): viga por eixo {b.mascaras.find((m) => m.regras)?.regras ? `${fmt(b.mascaras.find((m) => m.regras)!.regras!.larguraViga * 100, 1)} × ${fmt(b.mascaras.find((m) => m.regras)!.regras!.alturaViga * 100, 1)} cm` : '—'};
        tolerância de 1 cm; pilares e vigas lançados entram no primeiro grupo do gabarito.
      </p>
    </div>
  );
}
