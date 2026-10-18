import { useStore } from '../store';
import { Check, Group, Hint, NumField, Select } from '../ui';
import { useDesign, fmt } from '../results';
import { CAA_TABLE } from '../../core/concrete';
import { nextId } from '../../core/edit';
import { defaultDesign, type DesignSettings } from '../../core/types';
import type { MemberDesign } from '../../core/design';
import { saveCharacteristics } from '../Library';

const STATUS: Record<MemberDesign['status'], { label: string; cls: string }> = {
  ok: { label: 'Atende', cls: 'ok' },
  fail: { label: 'Não atende', cls: 'bad' },
  review: { label: 'Revisar', cls: 'warn' },
  na: { label: '—', cls: 'na' },
};

export function DimensionarPanel() {
  const st = useStore();
  const rep = useDesign();
  const ds = { ...defaultDesign(), ...(st.model.design ?? {}) };
  const upd = (p: Partial<DesignSettings>) => st.commit((m) => { m.design = { ...defaultDesign(), ...(m.design ?? {}), ...p }; });
  const selId = st.selMembers.size === 1 ? [...st.selMembers][0] : null;
  const sel = rep.members.find((m) => m.id === selId);
  const fails = rep.members.filter((m) => m.status === 'fail').length;
  const reviews = rep.members.filter((m) => m.status === 'review').length;

  if (st.model.members.length === 0) return <div className="panel-body"><Hint>Crie a estrutura para dimensionar.</Hint></div>;
  const unstable = rep.members.length === 0;
  if (unstable) return <div className="panel-body"><div className="verdict bad"><b>Modelo instável</b><span>Corrija apoios e rótulas antes de dimensionar.</span></div>{rep.warnings.map((w, i) => <div key={i} className="note">{w}</div>)}</div>;

  return (
    <div className="panel-body">
      <div className={`verdict ${rep.ok && !reviews ? 'ok' : rep.ok ? 'warn' : 'bad'}`}>
        <b>{rep.ok ? (reviews ? 'Atende, com itens a revisar' : 'Estrutura atende') : `${fails} barra(s) não atendem`}</b>
        <span>{rep.members.filter((m) => m.status !== 'na').length} barras verificadas · γz {rep.gammaZ.cls === 'none' ? '— (sem ações horizontais)' : fmt(rep.gammaZ.max, 3)}</span>
      </div>
      {rep.warnings.map((w, i) => <div key={i} className="note">{w}</div>)}
      <div className="gbody" style={{ paddingTop: 10 }}>
        <button type="button" className="btn primary" onClick={() => st.set({ memorialOpen: true })}>Abrir memorial de cálculo</button>
        <div className="row">
          <button type="button" className="btn" onClick={async () => { try { const r = await saveCharacteristics(st.model, rep); st.set({ message: r.mode === 'cloud' ? 'Características salvas na sua conta. Use em Fundações ou na Biblioteca.' : 'Características salvas neste navegador.' }); } catch (e) { st.set({ message: (e as Error).message }); } }}>Salvar características</button>
          <button type="button" className="btn ghost" onClick={() => st.set({ module: 'fundacoes' })}>Dimensionar fundações →</button>
        </div>
      </div>

      <Group title="Barras" aside={<span className="muted">clique para detalhar</span>}>
        <div className="tablewrap">
          <table className="design">
            <thead><tr><th>Barra</th><th>Tipo</th><th>Seção</th><th>Uso</th><th>Situação</th></tr></thead>
            <tbody>
              {rep.members.map((m) => (
                <tr key={m.id} className={m.id === selId ? 'on' : ''} onClick={() => st.select([], [m.id])}>
                  <td>{m.id}</td>
                  <td className="tl">{m.role === 'column' ? 'Pilar' : m.role === 'beam' ? 'Viga' : '—'}{m.materialKind === 'steel' ? ' (aço)' : ''}</td>
                  <td className="tl">{m.sectionName}</td>
                  <td><UseBar v={m.util} na={m.status === 'na'} /></td>
                  <td><span className={`pill ${STATUS[m.status].cls}`}>{STATUS[m.status].label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Group>

      {sel && <MemberDetail m={sel} />}

      <Group title="Cargas na fundação">
        <div className="tablewrap">
          <table className="data">
            <thead>
              <tr><th>Apoio</th><th>N máx (k)</th><th>N mín (k)</th><th>|H| máx (k)</th><th>|M| máx (k)</th><th>Nd máx</th></tr>
            </thead>
            <tbody>
              {rep.foundation.map((f) => (
                <tr key={f.nodeId}>
                  <td>{f.nodeId}</td>
                  <td>{fmt(f.charMax[1])}</td>
                  <td className={f.charMin[1] < 0 ? 'neg' : ''}>{fmt(f.charMin[1])}</td>
                  <td>{fmt(Math.max(Math.abs(f.charMax[0]), Math.abs(f.charMin[0])))}</td>
                  <td>{fmt(Math.max(Math.abs(f.charMax[2]), Math.abs(f.charMin[2])))}</td>
                  <td>{fmt(f.designMax[1])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Hint>Valores em kN e kN·m. (k) = característico, envoltória das combinações raras, para a verificação geotécnica (NBR 6122). Nd = cálculo (ELU), para o dimensionamento do elemento de fundação. N mín negativo indica arrancamento.</Hint>
      </Group>

      <Group title="Estabilidade global" aside={<span className="muted">γz {rep.gammaZ.cls === "none" ? "—" : fmt(rep.gammaZ.max, 3)}</span>} open={false}>
        {rep.gammaZ.rows.length === 0 ? <Hint>Nenhuma combinação ELU com ações horizontais.</Hint> : (
          <div className="tablewrap">
            <table className="data">
              <thead><tr><th>Combinação</th><th>M1 (kN·m)</th><th>ΔM (kN·m)</th><th>γz</th></tr></thead>
              <tbody>{rep.gammaZ.rows.map((r) => <tr key={r.combo}><td className="tl">{r.combo}</td><td>{fmt(r.M1)}</td><td>{fmt(r.dM)}</td><td>{fmt(r.gz, 3)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
        <Hint>Rigidez reduzida: 0,4EI nas vigas e 0,8EI nos pilares (NBR 6118, 15.7.3). γz ≤ 1,10: nós fixos; até 1,30: vento majorado por 0,95γz. O γz é definido para edifícios de 4 ou mais pavimentos; em estruturas baixas use-o como indicador.</Hint>
      </Group>

      <Group title="Premissas" open={false}>
        <Select label="Classe de agressividade ambiental" value={ds.caa} options={([1, 2, 3, 4] as const).map((k) => ({ v: k, label: `CAA ${CAA_TABLE[k].label}` }))} onChange={(v) => upd({ caa: v, coverBeam: undefined, coverColumn: undefined })} />
        <div className="row">
          <NumField label="Cobrimento vigas" unit="cm" value={(ds.coverBeam ?? CAA_TABLE[ds.caa].cover) * 100} onChange={(v) => upd({ coverBeam: v / 100 })} />
          <NumField label="Cobrimento pilares" unit="cm" value={(ds.coverColumn ?? CAA_TABLE[ds.caa].cover) * 100} onChange={(v) => upd({ coverColumn: v / 100 })} />
        </div>
        <div className="row">
          <NumField label="γc" value={ds.gammaC} onChange={(v) => upd({ gammaC: v })} />
          <NumField label="γs" value={ds.gammaS} onChange={(v) => upd({ gammaS: v })} />
          <NumField label="γa1 (aço)" value={ds.gammaA1} onChange={(v) => upd({ gammaA1: v })} />
        </div>
        <div className="row">
          <Select label="Armadura longitudinal" value={ds.fyk} options={[{ v: 500, label: 'CA-50' }, { v: 600, label: 'CA-60' }, { v: 250, label: 'CA-25' }]} onChange={(v) => upd({ fyk: v })} />
          <Select label="Agregado (dmáx)" value={ds.dmax} options={[{ v: 0.0095, label: 'Brita 0 · 9,5 mm' }, { v: 0.019, label: 'Brita 1 · 19 mm' }, { v: 0.025, label: 'Brita 2 · 25 mm' }]} onChange={(v) => upd({ dmax: v })} />
        </div>
        <Hint>Cobrimentos nominais da Tabela 7.2 (Δc = 10 mm). Ao trocar a CAA, os cobrimentos voltam ao valor da tabela.</Hint>
        <div className="row">
          <Select label="Efeitos globais de 2ª ordem" value={ds.secondOrder ?? 'gammaZ'} options={[{ v: 'gammaZ', label: 'γz (vento × 0,95·γz)' }, { v: 'pdelta', label: 'Análise P-Δ (matriz geométrica)' }]} onChange={(v) => upd({ secondOrder: v })} />
        </div>
        <Check label="Desaprumo global nas combinações ELU (11.3.3.4.1)" checked={ds.imperfection !== false} onChange={(v) => upd({ imperfection: v })} />
        {ds.imperfection !== false && rep.imperfection && (
          <div className="row">
            <NumField label="Prumadas de pilares (n)" value={ds.imperfectionColumns ?? rep.imperfection.nAuto} onChange={(v) => upd({ imperfectionColumns: Math.max(1, Math.round(v)) })} />
            <span className="muted small">θa = 1/{Math.round(1 / rep.imperfection.thetaA)} · H = {fmt(rep.imperfection.H)} m</span>
          </div>
        )}
        <div className="row">
          <Select label="Rigidez do γz (15.7.3)" value={ds.gammaZModulus ?? 'Eci'} options={[{ v: 'Eci', label: '0,4/0,8 · Eci·Ic (norma)' }, { v: 'Ecs', label: '0,4/0,8 · Ecs·Ic (a favor da segurança)' }]} onChange={(v) => upd({ gammaZModulus: v })} />
        </div>
        <div className="row">
          <NumField label="Idade do carregamento t0" unit="meses" value={ds.t0Months ?? 1} onChange={(v) => upd({ t0Months: Math.max(0, v) })} />
        </div>
        <Check label="Vigas suportam alvenaria (flecha após a parede ≤ ℓ/500 e 10 mm)" checked={!!ds.masonry} onChange={(v) => upd({ masonry: v })} />
        <Hint>P-Δ: rigidez reduzida (0,4/0,8·E·Ic), iteração da matriz geométrica até convergir; não soma o 0,95·γz ao vento. Desaprumo: só vento se 30% dele supera o desaprumo; só desaprumo se o vento é menor que 30% do desaprumo; senão ambos.</Hint>
        <Hint>t0 define Δξ da flecha diferida (17.3.2.1.2). Com alvenaria, a parcela após a parede é tomada como a flecha diferida αf·f0 — critério simplificado, a confirmar.</Hint>
      </Group>
    </div>
  );
}

function UseBar({ v, na }: { v: number; na: boolean }) {
  if (na) return <span className="muted">—</span>;
  const pct = Math.min(v, 1.5) / 1.5;
  const cls = v > 1 ? 'bad' : v > 0.9 ? 'warn' : 'ok';
  return <span className="usebar" title={`Taxa de utilização ${(v * 100).toFixed(0)}%`}><span className={cls} style={{ width: `${pct * 100}%` }} /><em>{v > 9.99 ? '>999%' : `${(v * 100).toFixed(0)}%`}</em></span>;
}

function KV({ rows }: { rows: [string, string][] }) {
  return <dl className="kv">{rows.map(([k, v]) => [<dt key={k + 't'}>{k}</dt>, <dd key={k + 'd'}>{v}</dd>])}</dl>;
}

function MemberDetail({ m }: { m: MemberDesign }) {
  const st = useStore();
  const applySuggestion = () => {
    if (!m.suggestSection) return;
    const { b, h } = m.suggestSection;
    st.commit((md) => {
      let sec = md.sections.find((s) => s.shape.kind === 'rect' && Math.abs(s.shape.b - b) < 1e-9 && Math.abs(s.shape.h - h) < 1e-9);
      if (!sec) { sec = { id: nextId(md.sections), name: `Ret ${Math.round(b * 100)}x${Math.round(h * 100)}`, shape: { kind: 'rect', b, h } }; md.sections.push(sec); }
      md.members.find((x) => x.id === m.id)!.section = sec.id;
    }, `Barra ${m.id} com ${Math.round(b * 100)}×${Math.round(h * 100)} cm. Análise refeita.`);
  };
  const cd = m.column, bd = m.beam, sd = m.steel;
  return (
    <Group title={`Barra ${m.id} · ${m.role === 'column' ? 'pilar' : 'viga'} · ${m.sectionName}`}>
      <div className={`pill big ${STATUS[m.status].cls}`}>{STATUS[m.status].label} · uso {m.util > 9.99 ? '>999' : (m.util * 100).toFixed(0)}%</div>
      {m.summary && <p className="detail-sum">{m.summary}</p>}
      {cd && cd.check && (
        <>
          <h4>Esforços e capacidade</h4>
          <KV rows={[
            ['Nd máximo', `${fmt(m.NdMax ?? 0)} kN`],
            ['NRd (compressão centrada)', `${fmt(cd.NRc)} kN`],
            ['Combinação determinante', cd.check.combo],
            ['ν = Nd/(Ac·fcd)', fmt(cd.check.nu, 3)],
          ]} />
          <h4>No plano do pórtico (h)</h4>
          <KV rows={[
            ['λ / λ1', `${fmt(cd.check.lambdaX, 1)} / ${fmt(cd.check.lambda1X, 1)}`],
            ['αb', fmt(cd.check.alphaB, 2)],
            ['M1d,A / M1d,mín', `${fmt(cd.check.M1dA)} / ${fmt(cd.check.M1dMinX)} kN·m`],
            ['M2d (curvatura aproximada)', `${fmt(cd.check.M2dX)} kN·m`],
            ['Md,tot / MRd', `${fmt(cd.check.MdTotX)} / ${fmt(cd.check.MRxx)} kN·m`],
          ]} />
          <h4>Fora do plano (b) · flexão oblíqua</h4>
          <KV rows={[
            ['λ', fmt(cd.check.lambdaY, 1)],
            ['M1d,mín + M2d', `${fmt(cd.check.M1dMinY)} + ${fmt(cd.check.M2dY)} kN·m`],
            ['MRd fora do plano', `${fmt(cd.check.MRyy)} kN·m`],
            ['(Mx/MRx)^1,2 + (My/MRy)^1,2', fmt(cd.check.interaction, 3)],
          ]} />
          <h4>Armadura</h4>
          <KV rows={[
            ['Longitudinal', cd.layout ? `${cd.layout.n} φ${cd.layout.phi} mm = ${fmt(cd.layout.As * 1e4)} cm²` : '—'],
            ['ρ / As,mín', `${fmt(cd.rho * 100)}% / ${fmt(cd.AsMin * 1e4)} cm²`],
            ['Estribos', cd.stirrup ? `φ${cd.stirrup.phi} c/${Math.round(cd.stirrup.s * 100)} cm` : '—'],
          ]} />
          {m.columnShear && (
            <>
              <h4>Cortante no plano (modelo I)</h4>
              <KV rows={[
                ['VSd / VRd2', `${fmt(Math.abs(m.columnShear.Vsd))} / ${fmt(m.columnShear.VRd2)} kN`],
                ['Vc', `${fmt(m.columnShear.Vc)} kN`],
                ['Asw/s calc · adotado', `${fmt(m.columnShear.aswS * 1e4)} · ${fmt(m.columnShear.provided * 1e4)} cm²/m`],
              ]} />
            </>
          )}
        </>
      )}
      {bd && (
        <>
          <h4>Flexão</h4>
          <KV rows={[
            ['Md+ / As (calc · mín)', `${fmt(bd.pos.Md)} kN·m / ${fmt(bd.pos.As * 1e4)} · ${fmt(bd.pos.AsMin * 1e4)} cm²`],
            ['Inferior adotada', bd.pos.bars ? `${bd.pos.bars.n} φ${bd.pos.bars.phi} = ${fmt(bd.pos.bars.As * 1e4)} cm²` : '—'],
            ['Md− / As (calc · mín)', `${fmt(-bd.neg.Md)} kN·m / ${fmt(bd.neg.As * 1e4)} · ${fmt(bd.neg.AsMin * 1e4)} cm²`],
            ['Superior adotada', bd.neg.bars ? `${bd.neg.bars.n} φ${bd.neg.bars.phi} = ${fmt(bd.neg.bars.As * 1e4)} cm²` : '2 φ10 construtiva'],
            ['x/d (máx.)', fmt(Math.max(bd.pos.xd, bd.neg.xd), 3)],
          ]} />
          <h4>Cisalhamento (modelo I)</h4>
          <KV rows={[
            ['VSd / VRd2', `${fmt(bd.shear.Vsd)} / ${fmt(bd.shear.VRd2)} kN`],
            ['Vc', `${fmt(bd.shear.Vc)} kN`],
            ['Asw/s (calc · mín)', `${fmt(bd.shear.aswS * 1e4)} · ${fmt(bd.shear.aswMin * 1e4)} cm²/m`],
            ['Estribos', bd.shear.stirrup ? `φ${bd.shear.stirrup.phi} c/${Math.round(bd.shear.stirrup.s * 100)} cm (2 ramos)` : '—'],
          ]} />
        </>
      )}
      {sd && sd.check && (
        <>
          <h4>NBR 8800</h4>
          <KV rows={[
            ['Q / χ / λ0', `${fmt(sd.Q, 3)} / ${fmt(sd.chi, 3)} / ${fmt(sd.lambda0, 3)}`],
            ['KL/r', fmt(sd.slenderness, 0)],
            ['NSd / NRd', `${fmt(sd.check.NSd)} / ${fmt(sd.check.NRd)} kN`],
            ['MSd (B1 = ' + fmt(sd.check.B1, 2) + ') / MRd (Cb = ' + fmt(sd.check.Cb, 2) + ')', `${fmt(sd.check.MSd)} / ${fmt(sd.check.MRd)} kN·m`],
            ['VSd / VRd', `${fmt(sd.check.VSd)} / ${fmt(sd.check.VRd)} kN`],
            ['Interação N + M', fmt(sd.check.interaction, 3)],
          ]} />
          {sd.limits.map((l) => <Hint key={l}>{l}</Hint>)}
        </>
      )}
      {m.deflection && (
        <>
          <h4>Flecha (ELS)</h4>
          <KV rows={[
            ['Elástica (análise)', `${fmt(m.deflection.fEl * 1000)} mm`],
            ...(m.deflection.alphaF !== undefined ? [['Total com Branson e fluência (αf ' + fmt(m.deflection.alphaF, 2) + ')', `${fmt(m.deflection.f * 1000)} mm`] as [string, string]] : []),
            ['Limite', `${fmt(m.deflection.limit * 1000)} mm (L/${m.deflection.cantilever ? 125 : 250})`],
          ]} />
        </>
      )}
      {m.messages.map((t, i) => <div key={i} className="note">{t}</div>)}
      {m.suggestion && (
        <div className="suggest">
          <span>{m.suggestion}</span>
          {m.suggestSection && <button type="button" className="btn primary" onClick={applySuggestion}>Aplicar seção</button>}
        </div>
      )}
    </Group>
  );
}
