// Ábacos da NBR 6123 como tabelas de pontos (frente N2a): Ca (baixa e alta turbulência) e fator de vizinhança.
// O programa não traz os pontos das figuras da norma: com a tabela vazia, vale o Ca informado (Vento e combinações).
import { useState } from 'react';
import { abacoCaPreenchido, abacoVizPreenchido, validarAbacos } from '../../core/building/abacosVento';
import { VENTO_PADRAO, type BuildingModel, type CurvaAbaco } from '../../core/building/types';
import { Button, Check, Group, Hint, Input, NumField, Select, Textarea } from '../ui';
import { useBuilding } from './store';

const fmt = (v: number, d = 3) => String(+v.toFixed(d)).replace('.', ',');

/** Linhas "x; y" (ou x e y separados por tab/espaço; vírgula decimal) → pontos; texto de erro se inválido. */
export function lerPontos(t: string): [number, number][] | string {
  const out: [number, number][] = [];
  for (const [i, l] of t.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).entries()) {
    const p = (l.includes(';') ? l.split(';') : l.split(/[\t ]+/)).map((s) => parseFloat(s.trim().replace(',', '.')));
    if (p.length !== 2 || p.some((v) => !Number.isFinite(v))) return `Linha ${i + 1}: use “x; y”.`;
    out.push([p[0], p[1]]);
  }
  return out;
}
const comoTexto = (p: [number, number][]) => p.map(([x, y]) => `${fmt(x)}; ${fmt(y)}`).join('\n');

function Tabela({ rotulo, curvas, aoSalvar, comParam }: { rotulo: string; curvas: CurvaAbaco[]; aoSalvar: (c: CurvaAbaco[]) => string | undefined; comParam: boolean }) {
  const [rascunho, setRascunho] = useState<{ param: string; pontos: string }[]>(curvas.map((c) => ({ param: fmt(c.param), pontos: comoTexto(c.pontos) })));
  const [erro, setErro] = useState('');
  const aplicar = () => {
    const out: CurvaAbaco[] = [];
    for (const [i, r] of rascunho.entries()) {
      const pts = lerPontos(r.pontos), param = comParam ? parseFloat(r.param.replace(',', '.')) : 1;
      if (typeof pts === 'string') { setErro(`${rotulo}, curva ${i + 1}: ${pts}`); return; }
      if (!Number.isFinite(param) || param <= 0) { setErro(`${rotulo}, curva ${i + 1}: h/l1 inválido.`); return; }
      if (pts.length) out.push({ param, pontos: pts });
    }
    setErro(aoSalvar(out) ?? '');
  };
  return (
    <details className="small">
      <summary>{rotulo} ({curvas.reduce((s, c) => s + c.pontos.length, 0)} ponto(s))</summary>
      {rascunho.map((r, i) => (
        <div key={i} className="row wrap">
          {comParam && <label className="field" style={{ width: 90 }}><span className="flabel">h/l1</span><span className="finput"><Input aria-label={`${rotulo}: h/l1 da curva ${i + 1}`} value={r.param} onChange={(e) => setRascunho(rascunho.map((x, k) => (k === i ? { ...x, param: e.target.value } : x)))} /></span></label>}
          <label className="field grow"><span className="flabel">{comParam ? 'Pontos (l1/l2; Ca), um por linha' : 'Pontos (d/l1; fator), um por linha'}</span>
            <Textarea aria-label={`${rotulo}: pontos da curva ${i + 1}`} rows={4} value={r.pontos} onChange={(e) => setRascunho(rascunho.map((x, k) => (k === i ? { ...x, pontos: e.target.value } : x)))} /></label>
          {comParam && rascunho.length > 1 && <Button variant="danger" aria-label={`${rotulo}: remover curva ${i + 1}`} onClick={() => setRascunho(rascunho.filter((_, k) => k !== i))}>×</Button>}
        </div>
      ))}
      <div className="row wrap">
        {comParam && <Button onClick={() => setRascunho([...rascunho, { param: '1', pontos: '' }])}>Adicionar curva</Button>}
        <Button variant="primary" onClick={aplicar}>{`Aplicar ${rotulo.toLowerCase()}`}</Button>
        {erro && <span className="hint bad">{erro}</span>}
      </div>
    </details>
  );
}

export function AbacosVentoGrupo({ b }: { b: BuildingModel }) {
  const { exec, analise } = useBuilding();
  const v = b.vento ?? VENTO_PADRAO, ab = v.abacos;
  const baixa = abacoCaPreenchido(ab, 1), alta = abacoCaPreenchido(ab, 2), viz = abacoVizPreenchido(ab);
  const opcoes = [{ v: 0, label: 'Informado (Ca em X e Y)' }, ...(baixa ? [{ v: 1, label: 'Ábaco: baixa turbulência' }] : []), ...(alta ? [{ v: 2, label: 'Ábaco: alta turbulência' }] : [])];
  const salvar = (k: 'caBaixa' | 'caAlta' | 'vizinhanca', val: unknown) => {
    const antes = { ...(ab ?? {}), [k]: val } as NonNullable<typeof ab>;
    const e = validarAbacos(antes);
    if (e.length) return e[0];
    const r = exec('vento.definir', { abacos: { [k]: val } });
    return r.ok ? undefined : r.erros[0]?.mensagem;
  };
  const caUsado = analise?.vento?.ca, vizUsado = analise?.vento?.viz;
  return (
    <Group title={`Ábacos de vento (NBR 6123)${v.caAuto || v.vizAuto ? ' (em uso)' : ''}`} open={false}>
      <div className="row wrap">
        <Select label="Coeficiente de arrasto Ca" value={v.caAuto ?? 0} options={opcoes} onChange={(x) => exec('vento.definir', { caAuto: x })} />
        <Check label="Fator de vizinhança pelo ábaco" checked={!!v.vizAuto} onChange={(x) => exec('vento.definir', { vizAuto: x })} />
        {viz && <NumField label="Distância ao vizinho" unit="m" width={140} value={v.vizDist ?? 0} onChange={(x) => exec('vento.definir', { vizDist: x })} />}
      </div>
      {(!baixa || !alta || !viz) && <Hint>Opção automática desativada onde a tabela está vazia: digite os pontos das figuras da NBR 6123 (dado ainda não fornecido; a confirmar) e ela passa a valer. Enquanto isso vale o Ca informado (padrão 1,3).</Hint>}
      {caUsado && <p className="small">Ca em uso: X {fmt(caUsado.x)}, Y {fmt(caUsado.y)} ({caUsado.auto ? 'do ábaco' : 'informado'}); fator de vizinhança X {fmt(vizUsado?.x ?? 1)}, Y {fmt(vizUsado?.y ?? 1)} ({vizUsado?.auto ? 'do ábaco' : 'informado'}).</p>}
      <Tabela key={`bx${JSON.stringify(ab?.caBaixa ?? [])}`} rotulo="Ca, baixa turbulência" comParam curvas={ab?.caBaixa ?? [{ param: 1, pontos: [] }]} aoSalvar={(c) => salvar('caBaixa', c)} />
      <Tabela key={`al${JSON.stringify(ab?.caAlta ?? [])}`} rotulo="Ca, alta turbulência" comParam curvas={ab?.caAlta ?? [{ param: 1, pontos: [] }]} aoSalvar={(c) => salvar('caAlta', c)} />
      <Tabela key={`vz${JSON.stringify(ab?.vizinhanca ?? [])}`} rotulo="Fator de vizinhança" comParam={false} curvas={ab?.vizinhanca ? [{ param: 1, pontos: ab.vizinhanca }] : [{ param: 1, pontos: [] }]} aoSalvar={(c) => salvar('vizinhanca', c[0]?.pontos ?? [])} />
      <Hint>Ca: curvas por h/l1 (altura / dimensão perpendicular ao vento) com pontos (l1/l2; Ca), l1 perpendicular e l2 paralela ao vento [a confirmar na figura]. Vizinhança: pontos (d/l1; fator) com d a distância ao edifício vizinho [a confirmar]. Interpolação linear nos pontos e entre curvas; fora da faixa vale o valor da ponta, com aviso na análise. Platibanda: largura corrigida b′ = b·(2a + h)/h na meia faixa do último pavimento (altura em “Vento e combinações”).</Hint>
    </Group>
  );
}
