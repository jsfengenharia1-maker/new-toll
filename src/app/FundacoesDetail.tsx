// Detalhes de bloco de coroamento, sapata e tubulão no módulo de fundações.
import type { CapResult } from '../core/caps';
import type { FootingResult } from '../core/footings';
import type { CaissonResult } from '../core/caissons';
import type { BarSet } from '../core/rebar';
import type { FoundationParams } from '../core/piles';
import { fmt } from './results';
import { svgCaisson, svgCap, svgFooting } from './foundationDrawing';
import { Note, Pill } from './ui';

export const Tbc = () => <Pill tone="warn" title="Premissa sem fonte normativa clara: confirme antes de usar.">a confirmar</Pill>;
export const phiTxt = (phi: number) => fmt(phi, 1).replace(',0', '');
export const barTxt = (b: BarSet | null | undefined, spaced = true) => (b ? `${b.n} φ${phiTxt(b.phi)}${spaced && b.n > 1 ? ` c/${fmt(b.spacing * 100, 0)}` : ''}` : '—');
const cm2 = (v: number) => fmt(v * 1e4);
const cm = (v: number) => fmt(v * 100, 0);
const Svg = ({ svg }: { svg: string }) => <div className="fsketch" dangerouslySetInnerHTML={{ __html: svg }} />;
const Ok = ({ ok }: { ok: boolean }) => <Pill tone={ok ? 'ok' : 'bad'}>{ok ? 'atende' : 'não atende'}</Pill>;

export function CapDetail({ cap, coords, D, ap, bp, p }: { cap: CapResult; coords: [number, number][]; D: number; ap: number; bp: number; p: FoundationParams }) {
  return (
    <div className="fcap">
      <h4>Bloco de coroamento — bielas e tirantes <Ok ok={cap.ok} /></h4>
      <Svg svg={svgCap(cap, coords, D, ap, bp)} />
      <div className="fgrid">
        <dl className="kv">
          <dt>Dimensões (lx × ly × h)</dt><dd>{cm(cap.lx)} × {cm(cap.ly)} × {cm(cap.h)} cm</dd>
          <dt>Pilar</dt><dd>{cm(ap)} × {cm(bp)} cm</dd>
          {cap.n > 1 ? (
            <>
              <dt>d / d′</dt><dd>{cm(cap.d)} / {cm(cap.dPrime)} cm</dd>
              <dt>d para θ entre {p.capThetaMin}° e {p.capThetaMax}°</dt><dd>{cm(cap.dMin)} a {cm(cap.dMax)} cm</dd>
              <dt>Ancoragem do pilar (φ{phiTxt(p.colPhi)})</dt><dd>lb = {cm(cap.lbCol)} cm</dd>
              <dt>Inclinação das bielas</dt><dd>{fmt(cap.thetaMin, 1)}° a {fmt(cap.thetaMax, 1)}°</dd>
              <dt>Nd = γf·Nk / Rd,máx / Nd,eq = n·Rd</dt><dd>{fmt(cap.Nd, 0)} / {fmt(cap.Rd, 0)} / {fmt(cap.NdEq, 0)} kN</dd>
              <dt>Biela junto ao pilar</dt><dd className={cap.strutCol > cap.sigmaLim ? 'bad' : ''}>{fmt(cap.strutCol, 1)} MPa</dd>
              <dt>Biela junto à estaca</dt><dd className={cap.strutPile > cap.sigmaLim ? 'bad' : ''}>{fmt(cap.strutPile, 1)} MPa</dd>
              <dt>Limite K·KR·fcd</dt><dd>{fmt(cap.K, 2)} × {fmt(cap.KR, 2)} × {fmt(cap.fcd, 1)} = {fmt(cap.sigmaLim, 1)} MPa <Tbc /></dd>
            </>
          ) : cap.single && (
            <>
              <dt>Lado a</dt><dd>{cm(cap.single.a)} cm (h = {fmt(p.cap1Ratio, 2)}·a ou lb + c) <Tbc /></dd>
              <dt>Tração Rst = 0,25·Nd·(a − ap)/a</dt><dd>{fmt(cap.single.Rst[0], 0)} / {fmt(cap.single.Rst[1], 0)} kN (x / y)</dd>
              <dt>Estribos horizontais (x / y)</dt><dd>{barTxt(cap.single.bars[0], false)} / {barTxt(cap.single.bars[1], false)} fechados</dd>
              <dt>Pressão do pilar / limite</dt><dd className={cap.single.colSigma > cap.single.colLim ? 'bad' : ''}>{fmt(cap.single.colSigma, 1)} / {fmt(cap.single.colLim, 1)} MPa</dd>
              <dt>Pressão na estaca / limite</dt><dd className={cap.single.pileSigma > cap.single.pileLim ? 'bad' : ''}>{fmt(cap.single.pileSigma, 1)} / {fmt(cap.single.pileLim, 1)} MPa</dd>
            </>
          )}
          <dt>Volume / peso real</dt><dd>{fmt(cap.volume, 2)} m³ / {fmt(cap.weight, 0)} kN{cap.WbAssumed !== undefined ? ` (adotado ${fmt(cap.WbAssumed, 0)} kN)` : ''}</dd>
        </dl>
        <div>
          {cap.ties.length > 0 && (
            <table className="data">
              <thead><tr><th className="l">Tirante</th><th>T (kN)</th><th>As (cm²)</th><th className="l">Barras (faixa {fmt(p.capBand, 1)}D)</th><th>Ancor. (cm)</th></tr></thead>
              <tbody>{cap.ties.map((t, i) => <tr key={i}><td className="l">E{t.a + 1}–E{t.b + 1} ({t.dir})</td><td>{fmt(t.T, 0)}</td><td>{cm2(t.As)}</td><td className="l">{t.bars ? `${t.bars.n} φ${phiTxt(t.bars.phi)} (${cm2(t.bars.As)} cm²)` : <span className="bad">não cabe</span>}</td><td className={t.lbNec > t.lbAvail ? 'bad' : ''}>{cm(t.lbNec)} / {cm(t.lbAvail)}</td></tr>)}</tbody>
            </table>
          )}
          <dl className="kv">
            {cap.mesh && <><dt>Malha inferior ({fmt(p.capDistRatio * 100, 0)}% da principal)</dt><dd>x: {barTxt(cap.mesh.x.bars)} · y: {barTxt(cap.mesh.y.bars)}</dd></>}
            {cap.top && <><dt>Armadura superior ({fmt(p.capDistRatio * 100, 0)}% do tirante)</dt><dd>{barTxt(cap.top.bars)}</dd></>}
            {cap.skin && <><dt>Armadura de pele por face ({fmt(p.capSkinRatio * 100, 2)}%) <Tbc /></dt><dd>{barTxt(cap.skin.bars)} ({cm2(cap.skin.AsFace)} cm²)</dd></>}
            {cap.stirrups && <><dt>Estribos verticais (ρw,mín) <Tbc /></dt><dd>φ{phiTxt(cap.stirrups.phi)} c/{cm(cap.stirrups.s)} · {cap.stirrups.legs} ramos</dd></>}
            {cap.n > 1 && <><dt>Suspensão (s &gt; {fmt(p.capSuspFactor, 1)}D)</dt><dd>{cap.susp.need ? <>As,tot = Nd/(1,5·n·fyd) = {cm2(cap.susp.AsTot)} cm² <Tbc /></> : 'não necessária'}</dd></>}
          </dl>
        </div>
      </div>
      {cap.messages.map((m, i) => <Note key={i}>{m}</Note>)}
    </div>
  );
}

export function FootingDetail({ r, ap, bp, p }: { r: FootingResult; ap: number; bp: number; p: FoundationParams }) {
  return (
    <>
      <Svg svg={svgFooting(r, ap, bp)} />
      <div className="fgrid">
        <div>
          <h4>Solo</h4>
          <dl className="kv">
            <dt>σadm</dt><dd>{fmt(r.sigmaAdm, 0)} kPa · {r.sigmaSrc}{p.ftSigmaMode === 'spt' && <> <Tbc /></>}</dd>
            {r.spt && <><dt>N̄ (metros {r.spt.from} a {r.spt.to})</dt><dd>{fmt(r.spt.Nbar, 1)}{r.spt.Nused < r.spt.Nbar ? ` → ${fmt(r.spt.Nused, 0)}` : ''}</dd></>}
            <dt>Cota de apoio</dt><dd>{fmt(p.ftDepth, 2)} m</dd>
            <dt>Peso próprio usado (≥ {fmt(p.ftPP, 0)}% de Nk)</dt><dd>{fmt(r.W, 0)} kN <Tbc /></dd>
            <dt>Conferência: concreto / solo sobre a sapata</dt><dd>{fmt(r.Wconc, 0)} / {fmt(r.Wsoil, 0)} kN</dd>
          </dl>
          <table className="data">
            <thead><tr><th className="l">Caso (k)</th><th>N</th><th>ex / ey (m)</th><th>σmáx / σmín</th><th>Comprimida</th></tr></thead>
            <tbody>{r.cases.map((c) => <tr key={c.label}><td className="l">{c.label}</td><td>{fmt(c.N, 0)}</td><td>{fmt(c.ex, 3)} / {fmt(c.ey, 3)}</td><td>{fmt(c.sigmaMax, 0)} / {fmt(c.sigmaMin, 0)}</td><td>{fmt(c.compressed * 100, 0)}%</td></tr>)}</tbody>
          </table>
        </div>
        <div>
          <h4>Estrutural</h4>
          <dl className="kv">
            <dt>A × B × h (h0)</dt><dd>{cm(r.A)} × {cm(r.B)} × {cm(r.h)} ({cm(r.h0)}) cm</dd>
            <dt>Tipo</dt><dd>{r.kind === 'rigida' ? 'rígida' : 'flexível'} · h rígida ≥ {cm(r.hRigid)} cm</dd>
            <dt>d / lb pilar</dt><dd>{cm(r.d)} / {cm(r.lbCol)} cm</dd>
            <dt>σd máx / mín (ELU)</dt><dd>{fmt(r.sigmaD.max, 0)} / {fmt(r.sigmaD.min, 0)} kPa</dd>
            <dt>Flexão</dt><dd>{r.method === 'ceb70' ? 'CEB-70 (seção a 0,15·ap)' : 'bielas (Lebelle)'}</dd>
          </dl>
          <table className="data">
            <thead><tr><th className="l">Dir.</th><th>{r.method === 'ceb70' ? 'Md (kN·m)' : 'T (kN)'}</th><th>As calc / mín</th><th className="l">Barras</th></tr></thead>
            <tbody>{(['x', 'y'] as const).map((k) => { const d = r.flex[k]; return <tr key={k}><td className="l">{k === 'x' ? 'A (barras // A)' : 'B (barras // B)'}</td><td>{fmt(r.method === 'ceb70' ? d.Md : d.T, 0)}</td><td>{cm2(d.As)} / {cm2(d.AsMin)}</td><td className="l">{barTxt(d.bars)}</td></tr>; })}</tbody>
          </table>
          <dl className="kv">
            <dt>Contorno C: τSd / τRd2</dt><dd className={r.punch.tauSd0 > r.punch.tauRd2 ? 'bad' : ''}>{fmt(r.punch.tauSd0, 2)} / {fmt(r.punch.tauRd2, 2)} MPa</dd>
            <dt>Punção em C′ (2d)</dt><dd>{r.punch.applies ? <span className={r.punch.tauSd1! > r.punch.tauRd1! ? 'bad' : ''}>{fmt(r.punch.tauSd1!, 2)} / {fmt(r.punch.tauRd1!, 2)} MPa{r.kind === 'rigida' ? ' (informativo)' : ''}</span> : 'C′ fora da sapata'}</dd>
            <dt>Volume de concreto</dt><dd>{fmt(r.volume, 2)} m³</dd>
          </dl>
        </div>
      </div>
      {[...r.methodNotes, ...r.messages].map((m, i) => <Note key={i}>{m}</Note>)}
    </>
  );
}

export function CaissonDetail({ r, water, p }: { r: CaissonResult; water: number | null; p: FoundationParams }) {
  return (
    <div className="fgrid">
      <Svg svg={svgCaisson(r, water, p.cutoff)} />
      <div>
        <dl className="kv">
          <dt>Cota da base ({r.depthMode})</dt><dd>{fmt(r.depth, 2)} m</dd>
          <dt>Fuste Df</dt><dd>{cm(r.Df)} cm (mín. {cm(p.tbDfMin)} cm)</dd>
          <dt>σ fuste = γf·N/Af / limite 0,85·fck/γc</dt><dd>{fmt(r.sigmaFuste, 2)} / {fmt(r.sigmaFusteLim, 2)} MPa <Tbc /></dd>
          <dt>Base Db / H / rodapé</dt><dd>{cm(r.Db)} / {cm(r.H)} / {cm(r.rodape)} cm</dd>
          <dt>σadm na base</dt><dd>{fmt(r.sigmaAdm, 0)} kPa · {r.sigmaSrc}{p.tbSigmaMode === 'spt' && <> <Tbc /></>}</dd>
          {r.spt && <><dt>N̄ (metros {r.spt.from} a {r.spt.to})</dt><dd>{fmt(r.spt.Nbar, 1)}{r.spt.Nused < r.spt.Nbar ? ` → ${fmt(r.spt.Nused, 0)}` : ''}</dd></>}
          <dt>N na base (com peso {p.tbWeight ? 'incluído' : 'desprezado'})</dt><dd>{fmt(r.Nbase, 0)} kN (peso {fmt(r.W, 0)} kN)</dd>
          <dt>σ máx na base</dt><dd>{fmt(r.sigmaBaseMax, 0)} kPa</dd>
          <dt>Volume</dt><dd>{fmt(r.volume, 2)} m³</dd>
        </dl>
        {r.tries.length > 1 && (
          <details>
            <summary>Cotas avaliadas</summary>
            <table className="data">
              <thead><tr><th>Cota (m)</th><th>Db (cm)</th><th>σadm</th><th>Volume (m³)</th><th className="l">Situação</th></tr></thead>
              <tbody>{r.tries.map((t) => <tr key={t.depth} className={t.depth === r.depth ? 'rec' : ''}><td>{t.depth}</td><td>{Number.isFinite(t.Db) ? cm(t.Db) : '—'}</td><td>{Number.isFinite(t.sigmaAdm) ? fmt(t.sigmaAdm, 0) : '—'}</td><td>{Number.isFinite(t.volume) ? fmt(t.volume, 2) : '—'}</td><td className="l">{t.ok ? (t.depth === r.depth ? 'adotada (menor volume)' : 'ok') : t.reasons.join('; ')}</td></tr>)}</tbody>
            </table>
          </details>
        )}
        {r.messages.map((m, i) => <Note key={i}>{m}</Note>)}
      </div>
    </div>
  );
}
