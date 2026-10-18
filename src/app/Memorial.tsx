import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useStore } from './store';
import { useAnalysis, getDesign, fmt, isSemi, linkText } from './results';
import { comboResult, deltaXi, type MemberDesign } from '../core/design';
import { caseGroup } from '../core/edit';
import { CAA_TABLE, concrete } from '../core/concrete';
import { PROFILE_NOTE } from '../core/profiles';
import { sectionProps } from '../core/section';
import { defaultProject, type Load, type ProjectInfo, type SectionShape } from '../core/types';
import { svgDeformed, svgDesign, svgDiagram, svgGeometry, svgLoads, svgReactions } from './drawing';
import { download } from './ui';
import { PILE_LABEL, SOIL_LABEL, STRUCT, defaultFoundationParams, recommendedOption, solveSupport } from '../core/piles';
import type { CaseResult } from '../core/solver';
import { logActivity } from './history';



const MEMO_CSS = `
.memo{font:12.5px/1.55 'IBM Plex Sans','Segoe UI',Arial,sans-serif;color:#1b2530;background:#fff;max-width:820px;margin:0 auto;padding:40px 48px 64px}
.memo h1{font-size:22px;margin:0 0 4px;letter-spacing:.01em}
.memo h2{font-size:15px;margin:30px 0 8px;padding-bottom:4px;border-bottom:2px solid #0e6a72;color:#0e3f45;break-after:avoid}
.memo h3{font-size:13px;margin:18px 0 6px;color:#26323e;break-after:avoid}
.memo p{margin:6px 0}
.memo .sub{color:#5b6876;margin:0}
.memo table{border-collapse:collapse;width:100%;margin:8px 0 12px;font-size:11.5px;break-inside:auto}
.memo th,.memo td{border:1px solid #d3d9df;padding:3px 6px;text-align:right;vertical-align:top;white-space:normal}
.memo th{background:#eef2f5;font-weight:600;color:#33404c}
.memo td.l,.memo th.l{text-align:left}
.memo td{font-family:'IBM Plex Mono',Consolas,monospace;font-variant-numeric:tabular-nums}
.memo td.l{font-family:inherit}
.memo .id{display:grid;grid-template-columns:150px 1fr;gap:2px 12px;border:1px solid #d3d9df;padding:10px 12px;margin:14px 0}
.memo .id dt{color:#5b6876}.memo .id dd{margin:0;font-weight:500}
.memo figure{margin:10px 0 14px;break-inside:avoid}
.memo figcaption{font-size:11px;color:#5b6876;margin-top:2px}
.memo .ok{color:#2a7a46;font-weight:600}.memo .bad{color:#b42318;font-weight:600}.memo .warn{color:#b7791f;font-weight:600}
.memo .verdict{border:1px solid #d3d9df;border-left:4px solid #2a7a46;padding:8px 12px;margin:10px 0;background:#f6faf7}
.memo .verdict.fail{border-left-color:#b42318;background:#fdf5f4}
.memo .formula{font-family:'IBM Plex Mono',Consolas,monospace;font-size:11.5px;background:#f5f7f9;border:1px solid #e3e8ec;padding:6px 10px;margin:6px 0;white-space:pre-wrap}
.memo ul{margin:6px 0;padding-left:20px}
.memo .sign{margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:32px}
.memo .sign div{border-top:1px solid #1b2530;padding-top:4px;text-align:center;font-size:11.5px}
.memo .small{font-size:11px;color:#5b6876}
`;

/** Texto seguro dentro de uma string CSS (content: "..."), inclusive dentro de <style>. */
const cssStr = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/</g, '\\3c ').replace(/[\r\n]+/g, ' ')}"`;

/**
 * Impressão / PDF: folha A4, cabeçalho e rodapé nas margens da página (@page) com o nome do
 * projeto e a paginação, quebra de página antes das seções principais (h2.pb) e sem quebra
 * dentro de figuras, tabelas, fórmulas e quadros.
 */
function memoPrintCss(p: { title: string; obra?: string; rev?: string; date?: string }) {
  const box = 'font:8.5pt \'IBM Plex Sans\',\'Segoe UI\',Arial,sans-serif;color:#5b6876';
  return `
@page{size:A4;margin:20mm 15mm 18mm 20mm;
@top-left{content:${cssStr(`Memorial de cálculo · ${p.title}`)};${box};vertical-align:bottom;padding-bottom:3mm}
@top-right{content:${cssStr(p.obra ?? '')};${box};vertical-align:bottom;padding-bottom:3mm}
@bottom-left{content:${cssStr([p.rev, p.date].filter(Boolean).join(' · '))};${box};vertical-align:top;padding-top:3mm}
@bottom-right{content:"Página " counter(page) " de " counter(pages);${box};vertical-align:top;padding-top:3mm}}
@media print{
html,body{background:#fff!important}
.memo{max-width:none;margin:0;padding:0;font-size:10pt;box-shadow:none!important}
.memo *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.memo h1{margin-top:0}
.memo h2{margin-top:18px}
.memo h2.pb{break-before:page;margin-top:0}
.memo h2,.memo h3{break-after:avoid;page-break-after:avoid}
.memo figure,.memo table,.memo .formula,.memo .verdict,.memo .id,.memo .sign,.memo ul{break-inside:avoid;page-break-inside:avoid}
.memo tr,.memo td,.memo th{break-inside:avoid;page-break-inside:avoid}
.memo thead{display:table-header-group}
.memo figure svg{max-height:125mm;width:auto;max-width:100%}
.memo p{orphans:3;widows:3}
}`;
}

/** Na janela do app (Ctrl+P com o memorial aberto), imprime só o memorial. */
const APP_PRINT_CSS = `@media print{
html,body,#root{height:auto!important;overflow:visible!important;background:#fff!important}
.app{display:block!important;height:auto!important}
.app>:not(.memo-overlay){display:none!important}
.memo-overlay{position:static!important;display:block!important;background:#fff!important}
.memo-bar,.memo-form{display:none!important}
.memo-scroll{overflow:visible!important;padding:0!important}
}`;

const STATUS_TXT: Record<MemberDesign['status'], [string, string]> = { ok: ['Atende', 'ok'], fail: ['Não atende', 'bad'], review: ['Revisar', 'warn'], na: ['Não verificada', ''] };

function shapeTxt(s: SectionShape) {
  const cm = (v: number) => fmt(v * 100, 1).replace(',0', '');
  switch (s.kind) {
    case 'rect': return `Retangular ${cm(s.b)} × ${cm(s.h)} cm`;
    case 'tee': return `T bf ${cm(s.bf)} · hf ${cm(s.tf)} · bw ${cm(s.bw)} · h ${cm(s.h)} cm`;
    case 'ishape': return `I bf ${cm(s.bf)} · tf ${cm(s.tf)} · tw ${cm(s.tw)} · h ${cm(s.h)} cm`;
    case 'box': return `Caixão ${cm(s.b)} × ${cm(s.h)} · t ${cm(s.t)} cm`;
    case 'circle': return `Circular Ø ${cm(s.d)} cm`;
    case 'tube': return `Tubo Ø ${cm(s.d)} · t ${cm(s.t)} cm`;
    case 'polygon': return `Poligonal (${s.pts.length} vértices: ${s.pts.map((p) => `${cm(p[0])};${cm(p[1])}`).join(' · ')} cm)`;
    case 'generic': return `Genérica A ${fmt(s.A * 1e4)} cm² · I ${fmt(s.I * 1e8, 0)} cm⁴`;
  }
}

function loadTxt(l: Load) {
  switch (l.kind) {
    case 'nodal': return `Nó ${l.node}: Fx = ${fmt(l.fx)} kN; Fy = ${fmt(l.fy)} kN; Mz = ${fmt(l.mz)} kN·m`;
    case 'dist': return `Barra ${l.member}: qx ${fmt(l.qxi)}→${fmt(l.qxj)}; qy ${fmt(l.qyi)}→${fmt(l.qyj)} kN/m (${l.system === 'global' ? 'global' : l.system === 'local' ? 'local' : 'global projetada'})`;
    case 'thermal': return `Barra ${l.member}: ΔT fibra superior ${fmt(l.tTop, 1)} °C; inferior ${fmt(l.tBot, 1)} °C`;
    case 'endMoment': return `Barra ${l.member}: momentos de extremidade ${fmt(l.mi)} / ${fmt(l.mj)} kN·m`;
    case 'presc': return `Nó ${l.node}: recalque dx ${fmt((l.dx ?? 0) * 1000)} mm; dy ${fmt((l.dy ?? 0) * 1000)} mm; θ ${fmt(l.rz ?? 0, 4)} rad`;
    case 'selfWeight': return `Peso próprio das barras × ${fmt(l.factor)} (γ do material × área da seção)`;
  }
}

const Fig = ({ svg, cap }: { svg: string; cap: string }) => (
  <figure><div dangerouslySetInnerHTML={{ __html: svg }} /><figcaption>{cap}</figcaption></figure>
);

export function Memorial({ onClose }: { onClose: () => void }) {
  const st = useStore();
  const a = useAnalysis();
  const model = st.model;
  const proj: ProjectInfo = { ...defaultProject(), ...(model.project ?? {}) };
  const docRef = useRef<HTMLDivElement>(null);
  const rep = useMemo(() => getDesign(a), [a]);
  const setProj = (k: keyof ProjectInfo, v: string) => st.commit((m) => { m.project = { ...defaultProject(), ...(m.project ?? {}), [k]: v }; });

  const [today] = useState(() => new Date().toLocaleDateString('pt-BR'));
  const err = a.prep.error;

  const eluRes = useMemo(() => rep.eluResults.filter(Boolean) as CaseResult[], [rep]);
  const qpRes = useMemo(() => rep.qp.map((cb) => comboResult(a, cb.factors)).filter(Boolean) as CaseResult[], [a, rep]);

  const printCss = memoPrintCss({ title: model.name, obra: proj.obra, rev: proj.revisao || 'R00', date: today });
  const memoHtml = () => {
    const body = docRef.current?.outerHTML ?? '';
    const title = `Memorial de cálculo · ${model.name}`.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;background:#fff}${MEMO_CSS}${printCss}</style></head><body>${body}</body></html>`;
  };

  /** Abre a impressão do navegador só com o memorial (iframe oculto); daí se salva em PDF. */
  const printMemo = () => {
    const html = memoHtml();
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true');
    f.title = 'Impressão do memorial';
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    const cleanup = () => setTimeout(() => f.remove(), 1500);
    f.onload = () => {
      const w = f.contentWindow;
      try {
        if (!w) throw new Error('sem janela');
        w.addEventListener('afterprint', cleanup);
        w.focus();
        w.print();
      } catch {
        f.remove();
        window.print();
      }
      cleanup();
    };
    f.srcdoc = html;
    document.body.appendChild(f);
    logActivity('Memorial de cálculo enviado para impressão/PDF', model.name);
    st.set({ message: 'Impressão do memorial: escolha “Salvar como PDF” como destino para gerar o arquivo (A4, com cabeçalho e paginação).' });
  };

  const exportHtml = async () => {
    const html = memoHtml();
    const r = await download(`memorial-${model.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.html`, html, 'text/html');
    if (r !== 'declined') logActivity('Memorial de cálculo exportado', model.name);
    st.set({ message: r === 'declined' ? 'Exportação cancelada.' : 'Memorial exportado em HTML. Abra no navegador e imprima em PDF se precisar.' });
  };

  const columns = rep.members.filter((m) => m.column);
  const beams = rep.members.filter((m) => m.beam);
  const steels = rep.members.filter((m) => m.steel);
  const fails = rep.members.filter((m) => m.status === 'fail');
  const reviews = rep.members.filter((m) => m.status === 'review');
  const concMats = model.materials.filter((m) => (m.kind ?? 'concrete') === 'concrete' && model.members.some((x) => x.material === m.id));
  const steelMats = model.materials.filter((m) => m.kind === 'steel' && model.members.some((x) => x.material === m.id));
  const caa = CAA_TABLE[rep.settings.caa];
  let sec = 0;
  // brk: seção principal que começa em página nova na impressão
  const h2 = (children: ReactNode, brk = false) => <h2 className={brk ? 'pb' : undefined}>{++sec}. {children}</h2>;

  return (
    <div className="memo-overlay" role="dialog" aria-label="Memorial de cálculo">
      <style>{MEMO_CSS + printCss + APP_PRINT_CSS}</style>
      <div className="memo-bar">
        <b>Memorial de cálculo</b>
        <span className="muted">Gerado a partir do modelo atual. Edite a identificação abaixo.</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn primary" onClick={printMemo} title="Abre a impressão do navegador só com o memorial (A4, cabeçalho e paginação). Escolha “Salvar como PDF”.">Imprimir / PDF</button>
        <button type="button" className="btn" onClick={exportHtml}>Exportar HTML</button>
        <button type="button" className="btn" onClick={onClose}>Fechar</button>
      </div>
      <div className="memo-form">
        {(['obra', 'cliente', 'local', 'responsavel', 'registro', 'revisao'] as (keyof ProjectInfo)[]).map((k) => (
          <label key={k} className="field" htmlFor={`proj-${k}`}>
            <span className="flabel">{{ obra: 'Obra', cliente: 'Cliente', local: 'Local', responsavel: 'Responsável técnico', registro: 'Registro profissional', revisao: 'Revisão' }[k]}</span>
            <span className="finput"><input id={`proj-${k}`} defaultValue={proj[k]} onBlur={(e) => e.target.value !== proj[k] && setProj(k, e.target.value)} /></span>
          </label>
        ))}
      </div>
      <div className="memo-scroll">
        <div className="memo" ref={docRef}>
          <h1>Memorial de cálculo estrutural</h1>
          <p className="sub">{model.name} · análise linear de pórtico plano e verificação de elementos</p>
          <dl className="id">
            <dt>Obra</dt><dd>{proj.obra || '—'}</dd>
            <dt>Cliente</dt><dd>{proj.cliente || '—'}</dd>
            <dt>Local</dt><dd>{proj.local || '—'}</dd>
            <dt>Responsável técnico</dt><dd>{proj.responsavel || '—'}{proj.registro ? ` · ${proj.registro}` : ''}</dd>
            <dt>Revisão / data</dt><dd>{proj.revisao || 'R00'} · {today}</dd>
          </dl>

          <div className={`verdict${rep.ok ? '' : ' fail'}`}>
            <b className={rep.ok ? 'ok' : 'bad'}>{err ? 'Modelo instável: análise não realizada.' : rep.ok ? (reviews.length ? 'A estrutura atende às verificações, com itens a revisar.' : 'A estrutura atende às verificações realizadas.') : `${fails.length} barra(s) não atendem às verificações.`}</b>
            {!err && <div className="small">{rep.members.filter((m) => m.status !== 'na').length} barras verificadas · γz {rep.gammaZ.cls === 'none' ? 'não aplicável' : fmt(rep.gammaZ.max, 3)}</div>}
          </div>

          {h2(<>Objeto e escopo</>)}
          <p>Este memorial apresenta o modelo, as ações, as combinações, os resultados da análise e a verificação das barras do pórtico plano “{model.name}”. A análise é elástica linear pelo método da rigidez direta (elementos de barra {model.options.shearDeformation ? 'com deformação por cisalhamento, Timoshenko' : 'de Euler-Bernoulli'}{model.options.axialDeformation ? '' : ', com deformação axial desprezada'}). Os efeitos globais de 2ª ordem são avaliados pelo coeficiente γz e os locais pelo método do pilar-padrão.</p>

          {h2(<>Normas de referência</>)}
          <ul>
            <li>ABNT NBR 6118:2023 — Projeto de estruturas de concreto</li>
            <li>ABNT NBR 8681:2003 — Ações e segurança nas estruturas</li>
            <li>ABNT NBR 6120:2019 — Ações para o cálculo de estruturas de edificações</li>
            <li>ABNT NBR 6123:2023 — Forças devidas ao vento em edificações</li>
            {steelMats.length > 0 && <li>ABNT NBR 8800:2008 — Projeto de estruturas de aço e mistas de aço e concreto</li>}
            <li>ABNT NBR 6122:2022 — Projeto e execução de fundações (cargas de referência)</li>
          </ul>

          {h2(<>Materiais e durabilidade</>)}
          <table>
            <thead><tr><th className="l">Material</th><th className="l">Tipo</th><th>Resistência</th><th>E (GPa)</th><th>ν</th><th>γ (kN/m³)</th><th>α (/°C)</th></tr></thead>
            <tbody>{model.materials.map((m) => <tr key={m.id}><td className="l">{m.name}</td><td className="l">{m.kind === 'steel' ? 'Aço estrutural' : m.kind === 'other' ? 'Outro' : 'Concreto armado'}</td><td>{m.kind === 'steel' ? `fy ${m.fy ?? 345} MPa` : m.fck ? `fck ${m.fck} MPa` : '—'}</td><td>{fmt(m.E / 1e6)}</td><td>{fmt(m.nu)}</td><td>{fmt(m.gamma, 1)}</td><td>{m.alpha.toExponential(1).replace('.', ',')}</td></tr>)}</tbody>
          </table>
          {concMats.length > 0 && (
            <>
              <table>
                <thead><tr><th className="l">Concreto</th><th>fcd</th><th>σcd</th><th>fctm</th><th>fctk,inf</th><th>Eci</th><th>Ecs</th></tr></thead>
                <tbody>{concMats.map((m) => { const c = concrete(m.fck ?? 30, rep.settings.gammaC); return <tr key={m.id}><td className="l">C{m.fck ?? 30}</td><td>{fmt(c.fcd)}</td><td>{fmt(c.sigmaCd)}</td><td>{fmt(c.fctm)}</td><td>{fmt(c.fctkInf)}</td><td>{fmt(c.Eci, 0)}</td><td>{fmt(c.Ecs, 0)}</td></tr>; })}</tbody>
              </table>
              <p className="small">Valores em MPa. σcd = αc·ηc·fcd (NBR 6118:2023). Agregado de granito/gnaisse (αE = 1,0).</p>
              <p>Classe de agressividade ambiental <b>CAA {['', 'I', 'II', 'III', 'IV'][rep.settings.caa]}</b> ({caa.label}); concreto mínimo C{caa.fckMin}. Cobrimentos nominais: vigas {fmt((rep.settings.coverBeam ?? caa.cover) * 100, 1)} cm, pilares {fmt((rep.settings.coverColumn ?? caa.cover) * 100, 1)} cm. Armadura CA-{rep.settings.fyk / 10} (fyd = {fmt(rep.settings.fyk / rep.settings.gammaS)} MPa, Es = 210 GPa). γc = {fmt(rep.settings.gammaC)}; γs = {fmt(rep.settings.gammaS)}.</p>
            </>
          )}
          {steelMats.length > 0 && <p>Aço estrutural: E = 200 GPa, G = 77 GPa, γa1 = {fmt(rep.settings.gammaA1)}.</p>}

          {h2(<>Modelo estrutural</>, true)}
          <Fig svg={svgGeometry(model)} cap="Figura — geometria, apoios, rótulas e numeração." />
          {model.members.some((x) => isSemi(x.hingeI, x.springI) || isSemi(x.hingeJ, x.springJ)) && <p>Ligações semirrígidas (círculos cheios na figura): mola rotacional linear-elástica entre a extremidade da barra e o nó, de rigidez k (kN·m/rad) informada por barra. A flexibilidade 1/k entra na matriz de flexibilidade do elemento como rotação concentrada na extremidade; k → 0 reproduz a rótula e k → ∞ a ligação rígida. Os valores adotados estão na tabela de barras.</p>}
          <h3>Seções transversais</h3>
          <table>
            <thead><tr><th className="l">Seção</th><th className="l">Forma</th><th>A (cm²)</th><th>I (cm⁴)</th><th>Barras</th></tr></thead>
            <tbody>{model.sections.filter((s) => model.members.some((m) => m.section === s.id)).map((s) => { const p = sectionProps(s.shape); return <tr key={s.id}><td className="l">{s.name}</td><td className="l">{shapeTxt(s.shape)}</td><td>{fmt(p.A * 1e4)}</td><td>{fmt(p.I * 1e8, 0)}</td><td>{model.members.filter((m) => m.section === s.id).map((m) => m.id).join(', ')}</td></tr>; })}</tbody>
          </table>
          {model.sections.some((s) => s.catalog && model.members.some((m) => m.section === s.id)) && <p className="small">Perfis de catálogo ({model.sections.filter((s) => s.catalog && model.members.some((m) => m.section === s.id)).map((s) => s.catalog).join(', ')}): dimensões nominais d, bf, tw, tf (tubos: diâmetro/lados e espessura). {PROFILE_NOTE}</p>}
          <h3>Barras</h3>
          <table>
            <thead><tr><th>Barra</th><th>Nós</th><th>L (m)</th><th className="l">Seção</th><th className="l">Material</th><th className="l">Função</th><th>le plano / fora (m)</th><th className="l">Ligações</th></tr></thead>
            <tbody>{rep.members.map((d) => { const mm = model.members.find((x) => x.id === d.id)!; return <tr key={d.id}><td>{d.id}</td><td>{mm.ni}–{mm.nj}</td><td>{fmt(d.L)}</td><td className="l">{d.sectionName}</td><td className="l">{d.materialName}</td><td className="l">{d.role === 'column' ? 'Pilar' : d.role === 'beam' ? 'Viga' : '—'}</td><td>{fmt(d.leIn)} / {fmt(d.leOut)}</td><td className="l">{linkText(mm)}</td></tr>; })}</tbody>
          </table>
          <h3>Vínculos</h3>
          <table>
            <thead><tr><th>Nó</th><th>x (m)</th><th>y (m)</th><th className="l">Restrições</th></tr></thead>
            <tbody>{model.nodes.filter((n) => n.support).map((n) => { const s = n.support!; const t = (r: string, k?: number, u = 'kN/m') => r === 'fixed' ? 'fixo' : r === 'spring' ? `mola ${fmt(k ?? 0, 0)} ${u}` : 'livre'; return <tr key={n.id}><td>{n.id}</td><td>{fmt(n.x)}</td><td>{fmt(n.y)}</td><td className="l">X {t(s.ux, s.kx)} · Y {t(s.uy, s.ky)} · θ {t(s.rz, s.kr, 'kN·m/rad')}{s.angle ? ` · inclinação ${fmt(s.angle, 1)}°` : ''}</td></tr>; })}</tbody>
          </table>

          {h2(<>Ações</>, true)}
          {model.cases.map((c) => (
            <div key={c.id}>
              <h3>{c.name} — ação {c.nature === 'Q' ? 'variável' : c.nature === 'W' ? 'de vento' : 'permanente'}{c.nature && c.nature !== 'G' ? ` (ψ0 ${fmt(c.psi0 ?? (c.nature === 'W' ? 0.6 : 0.5), 1)} · ψ1 ${fmt(c.psi1 ?? (c.nature === 'W' ? 0.3 : 0.4), 1)} · ψ2 ${fmt(c.psi2 ?? (c.nature === 'W' ? 0 : 0.3), 1)}${caseGroup(c) ? ` · grupo excludente “${caseGroup(c)}”` : ''})` : ''}</h3>
              <Fig svg={svgLoads(model, c.id, c.name)} cap={`Figura — carregamento “${c.name}”.`} />
              <ul>{model.loads.filter((l) => l.caseId === c.id).map((l) => <li key={l.id}>{loadTxt(l)}</li>)}</ul>
            </div>
          ))}
          <h3>Combinações</h3>
          <table>
            <thead><tr><th className="l">Combinação</th><th className="l">Tipo</th>{model.cases.map((c) => <th key={c.id}>{c.name}</th>)}</tr></thead>
            <tbody>
              {[...rep.elu, ...rep.qp, ...rep.rare].map((cb, i) => (
                <tr key={i}><td className="l">{cb.name}{cb.auto ? ' *' : ''}{cb.windAmp ? ` (vento × ${fmt(cb.windAmp, 3)})` : ''}</td><td className="l">{cb.kind === 'ELU' ? 'ELU' : cb.kind === 'QP' ? 'ELS quase perm.' : cb.kind === 'RARA' ? 'Rara' : 'ELS frequente'}</td>{model.cases.map((c) => <td key={c.id}>{cb.factors[c.id] ? fmt(cb.factors[c.id], 3) : '—'}</td>)}</tr>
              ))}
            </tbody>
          </table>
          <p className="small">* gerada automaticamente pelo programa a partir da natureza e dos fatores ψ de cada caso (NBR 8681). ELU normais: γg = 1,4 (desfavorável) ou 1,0 (favorável), γq = 1,4, demais variáveis reduzidas por ψ0, com no máximo um caso de cada grupo excludente e também a principal sozinha (acompanhantes favoráveis = 0). Raras: Σ Fg,k + Fq1,k + Σ ψ1·Fqj,k, com o mesmo critério de grupos.</p>

          {!err && (
            <>
              {h2(<>Estabilidade global</>)}
              {rep.imperfection ? <p>Imperfeição geométrica global (desaprumo, NBR 6118, 11.3.3.4.1): θ1 = 1/(100·√H) com 1/300 ≤ θ1 ≤ 1/200; H = {fmt(rep.imperfection.H)} m → θ1 = 1/{Math.round(1 / rep.imperfection.theta1)}; θa = θ1·√((1 + 1/n)/2) com n = {rep.imperfection.n} prumadas → θa = 1/{Math.round(1 / rep.imperfection.thetaA)}. Aplicado como forças horizontais θa·V nos nós (V = carga vertical da combinação). Com vento: só vento quando 30% dele supera o desaprumo; só desaprumo quando o vento é menor que 30% do desaprumo; nos demais casos, ambos no mesmo sentido (comparação pelo momento de tombamento na base). Sem vento: desaprumo nos dois sentidos.</p> : <p>Desaprumo global não considerado (opção do projetista).</p>}
              {rep.secondOrder.mode === 'pdelta' && (
                <>
                  <p>Efeitos globais de 2ª ordem por análise P-Δ: matriz de rigidez geométrica consistente das barras com a força normal da iteração anterior, rigidez reduzida 0,4·{rep.settings.gammaZModulus === 'Ecs' ? 'Ecs' : 'Eci'}·Ic (vigas) e 0,8·{rep.settings.gammaZModulus === 'Ecs' ? 'Ecs' : 'Eci'}·Ic (pilares), até a variação dos deslocamentos ser menor que 10⁻⁴ (máx. 30 iterações). Os esforços de dimensionamento são os desta análise; a parcela local P-δ fica com o pilar-padrão. Não se aplica o 0,95·γz ao vento.</p>
                  <table>
                    <thead><tr><th className="l">Combinação</th><th>Amplificação δh</th><th>Iterações</th><th className="l">Situação</th></tr></thead>
                    <tbody>{rep.secondOrder.rows.map((r) => <tr key={r.combo}><td className="l">{r.combo}</td><td>{Number.isFinite(r.amplification) ? fmt(r.amplification, 3) : '∞'}</td><td>{r.iterations}</td><td className="l">{r.converged ? 'convergiu' : r.error ?? 'não convergiu'}</td></tr>)}</tbody>
                  </table>
                </>
              )}
              {rep.gammaZ.rows.length === 0 ? <p>Não há combinações ELU com ações horizontais; γz não se aplica.</p> : (
                <>
                  <p>γz = 1 / (1 − ΔMtot,d / M1,tot,d), com ΔMtot,d obtido com rigidez reduzida (0,4·{(rep.settings.gammaZModulus ?? 'Eci') === 'Eci' ? 'Eci' : 'Ecs'}·Ic nas vigas e 0,8·{(rep.settings.gammaZModulus ?? 'Eci') === 'Eci' ? 'Eci' : 'Ecs'}·Ic nos pilares; NBR 6118, 15.7.3{(rep.settings.gammaZModulus ?? 'Eci') === 'Ecs' ? '; Ecs no lugar de Eci por opção do projetista, a favor da segurança' : ''}).</p>
                  <table>
                    <thead><tr><th className="l">Combinação</th><th>M1,tot,d (kN·m)</th><th>ΔMtot,d (kN·m)</th><th>γz</th></tr></thead>
                    <tbody>{rep.gammaZ.rows.map((r) => <tr key={r.combo}><td className="l">{r.combo}</td><td>{fmt(r.M1)}</td><td>{fmt(r.dM)}</td><td>{fmt(r.gz, 3)}</td></tr>)}</tbody>
                  </table>
                  <p>γz máximo = <b>{fmt(rep.gammaZ.max, 3)}</b>: {rep.gammaZ.cls === 'fixed' ? 'estrutura de nós fixos (γz ≤ 1,10); efeitos globais de 2ª ordem desprezáveis.' : rep.gammaZ.cls === 'mobile' ? 'estrutura de nós móveis (1,10 < γz ≤ 1,30); as ações de vento foram majoradas por 0,95·γz nas combinações ELU usadas no dimensionamento.' : 'γz > 1,30: a estrutura é excessivamente deslocável; é necessária análise de 2ª ordem refinada.'} <span className="small">O γz é definido na NBR 6118 para edificações de 4 ou mais pavimentos; para estruturas baixas o valor é indicativo. Em combinações em que a ação horizontal é só o desaprumo, a deriva lateral das cargas verticais em estruturas assimétricas distorce o γz; nesses casos a análise P-Δ é mais representativa.</span>{rep.secondOrder.mode === 'pdelta' ? ' Valores apenas informativos: o dimensionamento usa a análise P-Δ.' : ''}</p>
                </>
              )}

              {h2(<>Resultados da análise</>, true)}
              {eluRes.length > 0 && (
                <>
                  <Fig svg={svgDiagram(model, a, eluRes, 'N', 'Envoltória ELU — esforço normal N (kN), tração positiva')} cap="Figura — envoltória de esforço normal nas combinações ELU." />
                  <Fig svg={svgDiagram(model, a, eluRes, 'V', 'Envoltória ELU — esforço cortante V (kN)')} cap="Figura — envoltória de esforço cortante nas combinações ELU." />
                  <Fig svg={svgDiagram(model, a, eluRes, 'M', 'Envoltória ELU — momento fletor M (kN·m), desenhado no lado tracionado')} cap="Figura — envoltória de momento fletor nas combinações ELU." />
                </>
              )}
              {qpRes[0] && <Fig svg={svgDeformed(model, a, qpRes[0], `Deformada elástica — ${rep.qp[0].name}`)} cap="Figura — configuração deformada na combinação quase permanente (sem fluência e sem fissuração)." />}
              {model.cases.map((c) => a.cases.get(c.id)).filter(Boolean).slice(0, 1).map((r, i) => <Fig key={i} svg={svgReactions(model, r!, `Reações — ${model.cases[0].name} (kN, kN·m)`)} cap="Figura — reações de apoio do primeiro caso de carga." />)}

              {h2(<>Dimensionamento e verificações</>, true)}
              <Fig svg={svgDesign(model, rep)} cap="Figura — taxa de utilização (maior razão solicitação/resistência entre as verificações de cada barra)." />
              <table>
                <thead><tr><th>Barra</th><th className="l">Função</th><th className="l">Seção</th><th className="l">Resultado</th><th>Uso</th><th className="l">Situação</th></tr></thead>
                <tbody>{rep.members.map((d) => <tr key={d.id}><td>{d.id}</td><td className="l">{d.role === 'column' ? 'Pilar' : d.role === 'beam' ? 'Viga' : '—'}</td><td className="l">{d.sectionName}</td><td className="l">{d.summary}</td><td>{d.status === 'na' ? '—' : d.util > 9.99 ? '>999%' : `${(d.util * 100).toFixed(0)}%`}</td><td className={`l ${STATUS_TXT[d.status][1]}`}>{STATUS_TXT[d.status][0]}</td></tr>)}</tbody>
              </table>

              {beams.length > 0 && (
                <>
                  <h3>Vigas de concreto armado</h3>
                  <div className="formula">{`Flexão: domínios 2/3, x/d ≤ ${rep.conc.size && [...rep.conc.values()][0].xLimRatio === 0.35 ? '0,35' : '0,45'}; bloco retangular 0,8x com σcd. As,mín por Md,mín = 0,8·W0·fctk,sup (≥ 0,15%·Ac).
Cisalhamento (modelo I, θ = 45°): VRd2 = 0,27·αv2·fcd·bw·d; Vc = 0,6·fctd·bw·d (Vc = 0 com a seção toda tracionada, 17.4.2.2); Asw/s = (VSd − Vc)/(0,9·d·fywd) ≥ 0,2·fctm/fywk·bw.
Fissuração (ELS-W, 17.3.3.2): combinação frequente, σs no estádio II com αe = 15, wk = mín[φ/(12,5η1)·σs/Es·3σs/fctm ; φ/(12,5η1)·σs/Es·(4/ρr + 45)], η1 = 2,25, Acr = bw·mín(h − d + 7,5φ, h/2) (a confirmar); limite wk ≤ ${rep.settings.caa === 1 ? '0,4' : rep.settings.caa === 4 ? '0,2' : '0,3'} mm (Tab. 13.4).
Flecha: combinação quase permanente, inércia de Branson Ie = (Mr/Ma)³·Ic + [1 − (Mr/Ma)³]·III, fluência αf = Δξ/(1 + 50ρ'), ρ' = armadura de compressão no vão, Δξ = ξ(∞) − ξ(t0) = ${fmt(deltaXi(rep.settings.t0Months ?? 1), 2)} (t0 = ${fmt(rep.settings.t0Months ?? 1, 1)} mês); limite L/250 (balanço L/125)${rep.settings.masonry ? '; vigas com alvenaria: parcela após a parede, tomada como αf·f0 (critério simplificado, a confirmar), ≤ ℓ/500 e ≤ 10 mm (Tab. 13.3)' : ''}.`}</div>
                  <table>
                    <thead><tr><th>Barra</th><th>Md+</th><th>As+ calc/mín</th><th className="l">Inferior</th><th>Md−</th><th>As− calc/mín</th><th className="l">Superior</th><th>VSd / VRd2</th><th className="l">Estribos</th><th>Flecha / lim (mm)</th><th>wk inf / sup (mm)</th><th className="l">Sit.</th></tr></thead>
                    <tbody>{beams.map((d) => { const b = d.beam!; return (
                      <tr key={d.id}><td>{d.id}</td><td>{fmt(b.pos.Md)}</td><td>{fmt(b.pos.As * 1e4)} / {fmt(b.pos.AsMin * 1e4)}</td><td className="l">{b.pos.bars ? `${b.pos.bars.n} φ${b.pos.bars.phi}` : '—'}</td><td>{fmt(-b.neg.Md)}</td><td>{fmt(b.neg.As * 1e4)} / {fmt(b.neg.AsMin * 1e4)}</td><td className="l">{b.neg.bars ? `${b.neg.bars.n} φ${b.neg.bars.phi}` : '2 φ10'}</td><td>{fmt(b.shear.Vsd)} / {fmt(b.shear.VRd2)}</td><td className="l">{b.shear.stirrup ? `φ${b.shear.stirrup.phi} c/${Math.round(b.shear.stirrup.s * 100)}` : '—'}</td><td>{d.deflection ? `${fmt(d.deflection.f * 1000)} / ${fmt(d.deflection.limit * 1000, 1)}` : '—'}</td><td>{b.crack ? `${fmt(b.crack.pos.wk, 2)} / ${fmt(b.crack.neg.wk, 2)}` : '—'}</td><td className={`l ${STATUS_TXT[d.status][1]}`}>{STATUS_TXT[d.status][0]}</td></tr>
                    ); })}</tbody>
                  </table>
                  <p className="small">Md em kN·m, As em cm², V em kN. Armadura positiva na face y− da barra (inferior para barras orientadas da esquerda para a direita).</p>
                </>
              )}

              {columns.length > 0 && (
                <>
                  <h3>Pilares de concreto armado</h3>
                  <div className="formula">{`Momento mínimo: M1d,mín = Nd·(0,015 + 0,03·h) em cada direção (11.3.3.4.3).
Esbeltez: λ = 3,46·le/h; λ1 = (25 + 12,5·e1/h)/αb, 35 ≤ λ1 ≤ 90; αb = 0,60 + 0,40·MB/MA ≥ 0,40 (biapoiado, sem carga transversal); αb = 0,80 + 0,20·MC/MA, 0,85 ≤ αb ≤ 1,0 (balanço) (15.8.2).
2ª ordem local (pilar-padrão com curvatura aproximada, λ ≤ 90): Md,tot = αb·M1d,A + Nd·le²/10·(1/r) ≥ M1d,A;
  1/r = 0,005 / [h·(ν + 0,5)] ≤ 0,005/h; ν = Nd/(Ac·fcd), com Nd sem γn; γn (b < 19 cm) majora os esforços finais (13.2.3).
Situação 1 (plano do pórtico): Md,tot,x ≤ MRd,xx(Nd).
Situação 2 (flexão oblíqua): (Mx/MRd,xx)^1,2 + (Md,tot,y/MRd,yy)^1,2 ≤ 1, com Md,tot,y = M1d,mín,y + M2d,y (17.2.5).
MRd por compatibilidade de deformações (parábola-retângulo). As,mín = 0,15·Nd/fyd ≥ 0,4%·Ac; As,máx adotado 4%·Ac (8% na emenda).
140 < λ ≤ 200: esforços finais × γn1 = 1 + 0,01·(λ − 140)/1,4 (15.8.1).
Cortante no plano: modelo I com bw = b e d = h − c − φt − φl/2; os estribos são reduzidos quando Asw/s calculado supera o construtivo.
Seções circulares e poligonais (ex.: em L): ELU por fibras (parábola-retângulo, aço elastoplástico) com linha neutra inclinada; S2 compara o momento resultante com a capacidade na mesma direção (sem α = 1,2); λ = le/i com i em torno dos eixos centroidais; circular com no mínimo 6 barras; cortante em seção circular com bw = D e d = 0,8·D (a confirmar).
Estribos: φt ≥ 5 mm e φl/4; s ≤ 20 cm, menor dimensão e 12φl (CA-50).`}</div>
                  <table>
                    <thead><tr><th>Barra</th><th>b×h</th><th>Nd</th><th>NRd</th><th>λx/λ1</th><th>Md,tot,x / MRd</th><th>λy</th><th>Md,tot,y / MRd</th><th>Interação</th><th className="l">Armadura</th><th>ρ</th><th className="l">Estribos</th><th className="l">Sit.</th></tr></thead>
                    <tbody>{columns.map((d) => { const c = d.column!, k = c.check; const sh = model.sections.find((s) => s.name === d.sectionName)?.shape; return (
                      <tr key={d.id}><td>{d.id}</td><td>{sh && sh.kind === 'rect' ? `${Math.round(sh.b * 100)}×${Math.round(sh.h * 100)}` : '—'}</td><td>{fmt(d.NdMax ?? 0)}</td><td>{fmt(c.NRc)}</td><td>{k ? `${fmt(k.lambdaX, 0)}/${fmt(k.lambda1X, 0)}` : '—'}</td><td>{k ? `${fmt(k.MdTotX)} / ${fmt(k.MRxx)}` : '—'}</td><td>{k ? fmt(k.lambdaY, 0) : '—'}</td><td>{k ? `${fmt(k.MdTotY)} / ${fmt(k.MRyy)}` : '—'}</td><td>{k ? fmt(k.interaction, 2) : '—'}</td><td className="l">{c.layout ? `${c.layout.n} φ${c.layout.phi}` : '—'}</td><td>{fmt(c.rho * 100)}%</td><td className="l">{c.stirrup ? `φ${c.stirrup.phi} c/${Math.round(c.stirrup.s * 100)}` : '—'}</td><td className={`l ${STATUS_TXT[d.status][1]}`}>{STATUS_TXT[d.status][0]}</td></tr>
                    ); })}</tbody>
                  </table>
                  <p className="small">N em kN; M em kN·m. Nd = maior compressão de cálculo na barra; NRd = compressão centrada resistente com a armadura adotada.</p>
                </>
              )}

              {steels.length > 0 && (
                <>
                  <h3>Barras de aço</h3>
                  <div className="formula">{`Compressão: Nc,Rd = χ·Q·Ag·fy/γa1; χ = 0,658^(λ0²) (λ0 ≤ 1,5) ou 0,877/λ0²; λ0 = √(Q·Ag·fy/Ne), Ne = mín(flexão x, flexão y, torção).
Flexão: MRd = mín(FLT, FLM, FLA)/γa1 ≤ 1,5·W·fy/γa1 (Anexo G), Cb pelos momentos nos quartos do vão.
Interação: NSd/NRd ≥ 0,2 → NSd/NRd + 8/9·MSd/MRd ≤ 1; caso contrário NSd/(2NRd) + MSd/MRd ≤ 1. MSd amplificado por B1.`}</div>
                  <table>
                    <thead><tr><th>Barra</th><th className="l">Perfil</th><th>KL/r</th><th>χ</th><th>NSd / NRd</th><th>MSd / MRd</th><th>VSd / VRd</th><th>Interação</th><th>Flecha / lim (mm)</th><th className="l">Sit.</th></tr></thead>
                    <tbody>{steels.map((d) => { const s = d.steel!, k = s.check; return (
                      <tr key={d.id}><td>{d.id}</td><td className="l">{d.sectionName}</td><td>{fmt(s.slenderness, 0)}</td><td>{fmt(s.chi, 3)}</td><td>{k ? `${fmt(k.NSd)} / ${fmt(k.NRd)}` : '—'}</td><td>{k ? `${fmt(k.MSd)} / ${fmt(k.MRd)}` : '—'}</td><td>{k ? `${fmt(k.VSd)} / ${fmt(k.VRd)}` : '—'}</td><td>{k ? fmt(k.interaction, 2) : '—'}</td><td>{d.deflection ? `${fmt(d.deflection.f * 1000)} / ${fmt(d.deflection.limit * 1000, 1)}` : '—'}</td><td className={`l ${STATUS_TXT[d.status][1]}`}>{STATUS_TXT[d.status][0]}</td></tr>
                    ); })}</tbody>
                  </table>
                </>
              )}

              {h2(<>Cargas na fundação</>)}
              <p>Valores característicos (por caso e envoltória das combinações raras) para a verificação geotécnica, e valores de cálculo (envoltória ELU) para o dimensionamento estrutural dos elementos de fundação. Convenção: R positiva no sentido dos eixos globais; N &gt; 0 compressão na fundação.</p>
              <table>
                <thead><tr><th>Apoio</th><th className="l">Caso / envoltória</th><th>Rx (kN)</th><th>Ry = N (kN)</th><th>Mz (kN·m)</th></tr></thead>
                <tbody>
                  {rep.foundation.flatMap((f) => [
                    ...f.perCase.map((pc) => <tr key={`${f.nodeId}-${pc.caseId}`}><td>{f.nodeId}</td><td className="l">{pc.name} (k)</td><td>{fmt(pc.R[0])}</td><td>{fmt(pc.R[1])}</td><td>{fmt(pc.R[2])}</td></tr>),
                    <tr key={`${f.nodeId}-cmax`}><td>{f.nodeId}</td><td className="l"><b>Envoltória característica — máx.</b></td><td>{fmt(f.charMax[0])}</td><td><b>{fmt(f.charMax[1])}</b></td><td>{fmt(f.charMax[2])}</td></tr>,
                    <tr key={`${f.nodeId}-cmin`}><td>{f.nodeId}</td><td className="l">Envoltória característica — mín.</td><td>{fmt(f.charMin[0])}</td><td className={f.charMin[1] < 0 ? 'bad' : ''}>{fmt(f.charMin[1])}</td><td>{fmt(f.charMin[2])}</td></tr>,
                    <tr key={`${f.nodeId}-dmax`}><td>{f.nodeId}</td><td className="l">Cálculo (ELU) — máx.</td><td>{fmt(f.designMax[0])}</td><td>{fmt(f.designMax[1])}</td><td>{fmt(f.designMax[2])}</td></tr>,
                  ])}
                </tbody>
              </table>
            </>
          )}

          {model.foundation && (() => {
            const fd = { ...model.foundation, params: { ...defaultFoundationParams(), ...model.foundation.params } };
            const sols = fd.loads.map((ld) => solveSupport(ld, fd));
            const pp = fd.params;
            return (
              <>
                {h2(<>Fundações profundas</>, true)}
                <p>Capacidade geotécnica pelo método de Décourt-Quaresma (1978), com coeficientes α e β de Décourt (1996), somada metro a metro. Padm = mín[(Rp + Rl)/2 ; Rp/4 + Rl/1,3]. Em estacas escavadas e hélice contínua, Rp ≤ Rl; na escavada, Padm ≤ 1,25·Rl. Estrutural pela NBR 6122:2019, Tabela 4 (CAA {pp.caa}): hélice C{STRUCT.helice[pp.caa].fck} (γc {fmt(STRUCT.helice[pp.caa].gc, 1)}), escavada C{STRUCT.escavada[pp.caa].fck} (γc {fmt(STRUCT.escavada[pp.caa].gc, 1)}), γf = 1,4, As,mín = 0,4%. Pré-moldadas: carga estrutural de catálogo. Carga horizontal pelo método de Miche (Mmáx = 0,79·H·T; T = (EI/nh)^(1/5)). Bloco rígido com espaçamento {fmt(pp.spacingInSitu, 1)}φ (moldadas) e {fmt(pp.spacingPrecast, 1)}φ (pré-moldadas); peso do bloco = {pp.blockWeightPct}% de N.</p>
                <p className="small">Limites: escavada até o nível d'água ou N ≥ {pp.augerStopN}; hélice até {pp.hcMaxDepth} m; pré-moldada até N ≥ {pp.precastStopN} (estimativa da nega, a confirmar na cravação). Cota de arrasamento a {fmt(pp.cutoff)} m.</p>
                <h3>Sondagem {fd.boring.name}{fd.boring.water !== null ? ` · NA a ${fmt(fd.boring.water)} m` : ' · NA não encontrado'}</h3>
                <table>
                  <thead><tr><th>Prof. (m)</th>{fd.boring.meters.map((_, i) => <th key={i}>{i + 1}</th>)}</tr></thead>
                  <tbody><tr><td className="l">N_SPT</td>{fd.boring.meters.map((m, i) => <td key={i}>{m.N}</td>)}</tr></tbody>
                </table>
                <p className="small">{[...new Set(fd.boring.meters.map((m) => m.soil))].map((s) => `${SOIL_LABEL[s]}: metros ${fd.boring.meters.map((m, i) => (m.soil === s ? i + 1 : 0)).filter(Boolean).join(', ')}`).join(' · ')}</p>
                <h3>Soluções por apoio</h3>
                <table>
                  <thead><tr><th className="l">Apoio</th><th>Nk / Nk,mín (kN)</th><th className="l">Tipo</th><th>Estacas</th><th>Ø (cm)</th><th>L (m)</th><th>Padm (kN)</th><th>N/estaca (kN)</th><th className="l">Armadura</th></tr></thead>
                  <tbody>
                    {sols.flatMap((r) => r.byType.map((t, i) => {
                      const s = t.recommended;
                      const o = s ? recommendedOption(s.struct.options) : null;
                      return (
                        <tr key={`${r.load.id}-${t.type}`}>
                          <td className="l">{i === 0 ? r.load.label : ''}</td><td>{i === 0 ? `${fmt(r.load.Nk, 0)} / ${fmt(r.load.NkMin, 0)}` : ''}</td>
                          <td className="l">{PILE_LABEL[t.type]}</td>
                          {s ? <><td>{s.n}</td><td>{Math.round(s.D * 100)}</td><td>{s.L}</td><td>{fmt(s.cap.Padm, 0)}</td><td>{fmt(s.loads.Nmax, 0)}</td>
                            <td className="l">{s.struct.kind === 'catalogo' ? 'de fábrica' : `${o ? `${o.n} φ${fmt(o.phi, 1).replace(',0', '')} (As ${fmt(o.As * 1e4)} cm²)` : '—'} em ${fmt(s.struct.armedLength, 1)} m · espiral φ${pp.stirrupPhi} c/${Math.round(pp.stirrupS * 100)}${o?.notes.length ? ` · ${o.notes.join('; ')}` : ''}`}</td></>
                            : <td colSpan={6} className="l bad">sem solução dentro dos limites</td>}
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
                <p className="small">A solução de cada tipo minimiza o volume de concreto das estacas, o bloco estimado e o aço (convertido pela equivalência de {pp.steelPerM3} kg/m³). O dimensionamento do bloco de coroamento não faz parte deste memorial.</p>
              </>
            );
          })()}

          {h2(<>Conclusão</>)}
          {err ? <p className="bad">{err}</p> : (
            <>
              <p className={rep.ok ? 'ok' : 'bad'}>{rep.ok ? 'Todas as barras verificadas atendem aos estados-limite considerados.' : 'Há barras que não atendem. Ajustes indicados:'}</p>
              {(fails.length > 0 || reviews.length > 0) && <ul>{[...fails, ...reviews].map((d) => <li key={d.id}>Barra {d.id} ({d.sectionName}): {d.messages.join(' ')} {d.suggestion ?? ''}</li>)}</ul>}
              {rep.warnings.length > 0 && <ul>{rep.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
            </>
          )}
          <h3>Limitações</h3>
          <ul>
            <li>Modelo plano: efeitos fora do plano considerados apenas por momentos mínimos e pela esbeltez com o comprimento de travamento informado.</li>
            <li>Ligações, lajes, ancoragens, emendas, abertura de fissuras e detalhamento final não fazem parte deste memorial.</li>
            <li>Os esforços na fundação não incluem o peso dos elementos de fundação nem do solo sobre eles.</li>
            <li>Alterações de seção sugeridas exigem nova análise, pois mudam rigidez e peso próprio.</li>
          </ul>
          <div className="sign">
            <div>{proj.responsavel || 'Responsável técnico'}<br />{proj.registro || 'Registro profissional'}</div>
            <div>ART nº ____________________<br />{proj.local || 'Local'}, {today}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
