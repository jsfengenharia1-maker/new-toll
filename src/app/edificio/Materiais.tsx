// Grupo "Materiais e segurança" da barra lateral (frente N1b): fck por tipo e por lance, aço por posição,
// coeficientes de ponderação e cobrimentos por face. Padrão = obra / NBR 6118.
import { acoDe, COBRIMENTO_FUNDACAO, cobrimentoFundacao, cobrimentoLaje, cobrimentoViga, fckDe, gamas, GAMAS_PADRAO, POSICOES_ACO } from '../../core/building/materiais';
import { pavimentosOrdenados, type BuildingModel, type Norma } from '../../core/building/types';
import { Button, Group, Hint, NumField, Select } from '../ui';
import { MateriaisBiblioteca } from './MateriaisBiblioteca';
import { useBuilding } from './store';

const ACOS: { v: Norma['aco']; label: string }[] = [{ v: 'CA-50', label: 'CA-50' }, { v: 'CA-60', label: 'CA-60' }];
const cm = (m: number) => +(m * 100).toFixed(2);
const ROTULO_FCK = { laje: 'lajes', viga: 'vigas', pilar: 'pilares', fundacao: 'fundações' } as const;

export function MateriaisGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const n = b.norma, g = gamas(b), cv = cobrimentoViga(b), cl = cobrimentoLaje(b);
  const def = (p: Record<string, unknown>) => exec('materiais.definir', p);
  const alterado = !!(n.fckElem || n.fckPilarPav || n.acoPos || n.gamas || n.cobFaces || n.cobFundacao);
  return (
    <Group title={`Materiais e segurança${alterado ? ' (alterados)' : ''}`} open={false}>
      <div className="row wrap">
        {(['laje', 'viga', 'pilar', 'fundacao'] as const).map((t) => (
          <NumField key={t} label={`fck ${ROTULO_FCK[t]}`} unit="MPa" width={100} value={fckDe(b, t)} onChange={(v) => def({ fck: { [t]: v } })} />
        ))}
      </div>
      <div className="row wrap">
        {pavimentosOrdenados(b).map((p) => (
          <NumField key={p.id} label={`fck pilares até ${p.nome}`} unit="MPa" width={130} value={fckDe(b, 'pilar', p.id)}
            onChange={(v) => def({ fckPilarPav: [{ pavimento: p.id, fck: v === fckDe(b, 'pilar') ? 0 : v }] })} />
        ))}
      </div>
      <div className="row wrap aco-pos">
        {POSICOES_ACO.map((x) => <Select key={x.k} label={x.rotulo} value={acoDe(b, x.k).aco} options={ACOS} onChange={(v) => def({ aco: { [x.k]: v } })} />)}
      </div>
      <div className="row wrap">
        <NumField label="γc" width={70} value={g.c} onChange={(v) => def({ gamas: { c: v } })} />
        <NumField label="γs" width={70} value={g.s} onChange={(v) => def({ gamas: { s: v } })} />
        <NumField label="γg (permanentes)" width={110} value={g.g} onChange={(v) => def({ gamas: { g: v } })} />
        <NumField label="γq (variáveis)" width={110} value={g.q} onChange={(v) => def({ gamas: { q: v } })} />
      </div>
      <div className="row wrap">
        <NumField label="Cobr. viga inferior" unit="cm" width={110} value={cm(cv.inf)} onChange={(v) => def({ cobFaces: { vigaInf: v === n.cobrimento.viga ? 0 : v } })} />
        <NumField label="Cobr. viga superior" unit="cm" width={110} value={cm(cv.sup)} onChange={(v) => def({ cobFaces: { vigaSup: v === n.cobrimento.viga ? 0 : v } })} />
        <NumField label="Cobr. viga lateral" unit="cm" width={110} value={cm(cv.lat)} onChange={(v) => def({ cobFaces: { vigaLat: v === n.cobrimento.viga ? 0 : v } })} />
        <NumField label="Cobr. laje inferior" unit="cm" width={110} value={cm(cl.inf)} onChange={(v) => def({ cobFaces: { lajeInf: v === n.cobrimento.laje ? 0 : v } })} />
        <NumField label="Cobr. laje superior" unit="cm" width={110} value={cm(cl.sup)} onChange={(v) => def({ cobFaces: { lajeSup: v === n.cobrimento.laje ? 0 : v } })} />
        <NumField label="Cobr. fundações" unit="cm" width={110} value={cm(cobrimentoFundacao(b))} onChange={(v) => def({ cobFundacao: v === cm(COBRIMENTO_FUNDACAO) ? 0 : v })} />
      </div>
      <MateriaisBiblioteca b={b} />
      <div className="row wrap u-mt-6"><Button disabled={!alterado} onClick={() => def({ padrao: true })}>Voltar ao padrão</Button></div>
      <Hint>Padrão: fck e aço da obra em todos os elementos; γc {GAMAS_PADRAO.c}, γs {GAMAS_PADRAO.s}, γg e γq {GAMAS_PADRAO.g} (NBR 6118, Tabelas 11.1 e 12.1); cobrimentos da CAA em todas as faces (Tabela 7.2). Fundações: fck de sapatas e blocos e aço próprios, padrão os da obra (fuste do tubulão nas opções das fundações); cobrimento padrão {cm(COBRIMENTO_FUNDACAO)} cm. Estribos com fywd ≤ 435 MPa em qualquer aço.</Hint>
    </Group>
  );
}
