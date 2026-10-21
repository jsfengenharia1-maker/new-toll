// Detalhes de bloco de coroamento, sapata e tubulão no módulo de fundações.
import type { CapResult } from '../core/caps';
import type { FootingResult } from '../core/footings';
import type { CaissonResult } from '../core/caissons';
import type { BarSet } from '../core/rebar';
import { useMemo } from 'react';
import { PILE_LABEL, capacityCurve, recommendedOption, type FLoad, type FoundationData, type FoundationParams, type PileSolution } from '../core/piles';
import { capCols, capFor, type SupportDesign } from '../core/foundation';
import { fmt } from './results';
import { svgCaisson, svgCap, svgFooting } from './foundationDrawing';
import { Button, Hint, Note, Pill } from './ui';

export const Tbc = () => <Pill tone="warn" title="Premissa sem fonte normativa clara: confirme antes de usar.">a confirmar</Pill>;
export const phiTxt = (phi: number) => fmt(phi, 1).replace(',0', '');
export const barTxt = (b: BarSet | null | undefined, spaced = true) => (b ? `${b.n} φ${phiTxt(b.phi)}${spaced && b.n > 1 ? ` c/${fmt(b.spacing * 100, 0)}` : ''}` : '—');
const cm2 = (v: number) => fmt(v * 1e4);
const cm = (v: number) => fmt(v * 100, 0);
const Svg = ({ svg }: { svg: string }) => <div className="fsketch" dangerouslySetInnerHTML={{ __html: svg }} />;
const Ok = ({ ok }: { ok: boolean }) => <Pill tone={ok ? 'ok' : 'bad'}>{ok ? 'atende' : 'não atende'}</Pill>;

export function CapDetail({ cap, coords, D, ap, bp, p, cols }: { cap: CapResult; coords: [number, number][]; D: number; ap: number; bp: number; p: FoundationParams; cols?: { label: string; x: number; y: number; ap: number; bp: number }[] }) {
  return (
    <div className="fcap">
      <h4>Bloco de coroamento — bielas e tirantes <Ok ok={cap.ok} /></h4>
      <Svg svg={svgCap(cap, coords, D, ap, bp, cols)} />
      <div className="fgrid">
        <dl className="kv">
          <dt>Dimensões (lx × ly × h)</dt><dd>{cm(cap.lx)} × {cm(cap.ly)} × {cm(cap.h)} cm</dd>
          <dt>{cols && cols.length > 1 ? `Pilares (${cols.length})` : 'Pilar'}</dt><dd>{cols && cols.length > 1 ? cols.map((c) => `${c.label} ${cm(c.ap)} × ${cm(c.bp)}`).join(' · ') + ' cm' : `${cm(ap)} × ${cm(bp)} cm`}</dd>
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
          {cap.multi && (
            <table className="data" data-bielas-por-pilar>
              <thead><tr><th className="l">Pilar</th><th>Nd (kN)</th><th>Nd,eq (kN)</th><th>σ biela (MPa)</th><th>θ mín (°)</th><th /></tr></thead>
              <tbody>{cap.multi.cols.map((q) => <tr key={q.label}><td className="l">{q.label}</td><td>{fmt(q.Nd, 0)}</td><td>{fmt(q.NdEq, 0)}</td><td className={q.sigma > cap.sigmaLim ? 'bad' : ''}>{fmt(q.sigma, 1)}</td><td>{fmt(q.thetaMin, 1)}</td><td><Ok ok={q.ok} /></td></tr>)}</tbody>
            </table>
          )}
          {cap.multi && <p className="hint">Bielas de cada pilar às estacas por ajuste bi-proporcional ao inverso do quadrado da distância; tirantes pelo equilíbrio dos nós (resíduo {fmt(cap.multi.residuo, 0)} kN). Extensão de Blévot: <Tbc />.</p>}
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
            <tbody>{(['x', 'y'] as const).flatMap((k) => {
              const d = r.flex[k], nome = k === 'x' ? 'A (barras // A)' : 'B (barras // B)';
              const linhas = [<tr key={k}><td className="l">{nome}</td><td>{fmt(r.method === 'ceb70' ? d.Md : d.T, 0)}</td><td>{r.simples ? '—' : `${cm2(d.As)} / ${cm2(d.AsMin)}`}</td><td className="l">{r.simples ? (d.sigmaT !== undefined ? `concreto simples: σt ${fmt(d.sigmaT, 2)} / fctd ${fmt(d.fctd ?? 0, 2)} MPa` : 'concreto simples') : barTxt(d.bars)}{d.imposed ? ` (imposta φ${phiTxt(d.imposed.phi)} c/${cm(d.imposed.s)}${d.imposed.ok ? '' : ': não atende'})` : ''}</td></tr>];
              if (d.top) linhas.push(<tr key={`${k}-top`} data-malha-superior={k}><td className="l">{k === 'x' ? 'A, negativo entre pilares' : 'B, negativo entre pilares'}</td><td>{fmt(d.top.Md, 0)}</td><td>{d.top.needed ? `${cm2(d.top.As)} / ${cm2(d.top.AsMin)}` : '—'}</td><td className="l">{d.top.needed ? (d.top.bars ? `malha superior ${barTxt(d.top.bars)}` : <span className="bad">malha superior não cabe</span>) : `sem malha superior (σt ${fmt(d.top.sigmaT, 2)} ≤ fctd ${fmt(d.top.fctd, 2)} MPa)`}</td></tr>);
              return linhas;
            })}</tbody>
          </table>
          {r.grupo && (
            <>
              <h4>Sapata de vários pilares / aparada <Tbc /></h4>
              <dl className="kv" data-grupo-sapata>
                <dt>Maior vão entre pilares / h</dt><dd>{fmt(r.grupo.vao, 2)} m / {fmt(r.grupo.vaoAltura, 2)} × h</dd>
                <dt>Maior balanço / h</dt><dd>{fmt(r.grupo.balanco, 2)} m / {fmt(r.grupo.balancoAltura, 2)} × h</dd>
                <dt>Resultante (em relação ao centro da base)</dt><dd>{fmt(r.grupo.resultante[0], 3)} ; {fmt(r.grupo.resultante[1], 3)} m</dd>
                {r.grupo.limitesIgnorados.length > 0 && <><dt>Limites ignorados</dt><dd>{r.grupo.limitesIgnorados.length} (ver mensagens)</dd></>}
              </dl>
              <table className="data">
                <thead><tr><th className="l">Pilar</th><th>Nd (kN)</th><th>τSd (MPa)</th><th>τRd2 (MPa)</th></tr></thead>
                <tbody>{r.grupo.pilares.map((q) => <tr key={q.label}><td className="l">{q.label}</td><td>{fmt(q.Nd, 0)}</td><td className={q.tauSd0 > q.tauRd2 ? 'bad' : ''}>{fmt(q.tauSd0, 2)}</td><td>{fmt(q.tauRd2, 2)}</td></tr>)}</tbody>
              </table>
            </>
          )}
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

export function SolutionDetail({ s, ds, f, setLoad }: { s: PileSolution; ds: SupportDesign; f: FoundationData; setLoad?: (id: number, fn: (l: FLoad) => void, msg?: string) => void }) {
  const st = s.struct, c = s.cap, pl = s.loads;
  const curve = useMemo(() => capacityCurve(s.type, s.D, ds.boring, f.params), [s, f, ds.boring]);
  const cap = useMemo(() => capFor(s, ds.load, f), [s, ds.load, f]);
  const isAdopted = ds.pile === s && ds.pileAdopted;
  return (
    <div className="fdetail">
      <h3>{ds.load.label} · {PILE_LABEL[s.type]} · Ø{Math.round(s.D * 100)} cm · {s.n} estaca{s.n > 1 ? 's' : ''} · L = {s.L} m</h3>
      <div className="row wrap u-mb-8 u-items-center">
        {!setLoad ? null : isAdopted ? <Pill tone="ok">adotada para o bloco e o memorial</Pill> : <Button onClick={() => setLoad(ds.load.id, (l) => { l.pile = { type: s.type, D: Math.round(s.D * 100) }; }, `${ds.load.label}: estaca adotada.`)}>Adotar esta estaca</Button>}
        {setLoad && ds.load.pile && <Button variant="ghost" onClick={() => setLoad(ds.load.id, (l) => { delete l.pile; }, `${ds.load.label}: volta à estaca recomendada.`)}>Voltar à recomendada</Button>}
        <span className="muted">Furo {ds.boring.name}</span>
      </div>
      <div className="fgrid">
        <div>
          <h4>Capacidade geotécnica (Décourt-Quaresma)</h4>
          <dl className="kv">
            <dt>Np / Nl</dt><dd>{fmt(c.Np, 1)} / {fmt(c.Nl, 1)}</dd>
            <dt>Rp (ponta{s.type !== 'premoldada' ? ', ≤ Rl' : ''})</dt><dd>{fmt(c.RpUsed, 0)} kN{c.RpUsed < c.Rp ? ` (de ${fmt(c.Rp, 0)})` : ''}</dd>
            <dt>Rl (fuste)</dt><dd>{fmt(c.Rl, 0)} kN</dd>
            <dt>Padm</dt><dd>{fmt(c.Padm, 0)} kN ({c.governs === 'global' ? '(Rp+Rl)/2' : c.governs === 'parcial' ? 'Rp/4 + Rl/1,3' : '1,25·Rl'})</dd>
            <dt>Tração admissível</dt><dd>{fmt(c.Tadm, 0)} kN</dd>
            <dt>Limite de profundidade</dt><dd>{s.Lmax} m · {s.LmaxReason}</dd>
          </dl>
          <h4>Cargas por estaca (bloco rígido)</h4>
          <dl className="kv">
            <dt>N máx / N mín (k)</dt><dd>{fmt(pl.Nmax, 0)} / {fmt(pl.Nmin, 0)} kN</dd>
            <dt>Nd,mín = {fmt(f.params.gammaFfav, 1)}·(Gk+Wb)/n − {fmt(f.params.gammaF, 1)}·[(Gk−Nk,mín)/n + ΔN]</dt><dd>{fmt(pl.NdMin, 0)} kN{pl.NdMin < 0 ? ` → Td = ${fmt(-pl.NdMin, 0)} kN` : ''}</dd>
            <dt>Gk (permanente)</dt><dd>{fmt(pl.Gk, 0)} kN · {pl.GkSource}</dd>
            <dt>H por estaca</dt><dd>{fmt(pl.H, 1)} kN</dd>
            {pl.M0 > 0 && <><dt>Momento no topo</dt><dd>{fmt(pl.M0, 1)} kN·m</dd></>}
            <dt>Espaçamento</dt><dd>{fmt(pl.s, 2)} m</dd>
          </dl>
        </div>
        <div>
          <h4>Estrutural (NBR 6122)</h4>
          {st.kind === 'catalogo' ? (
            <dl className="kv">
              <dt>Carga estrutural (catálogo)</dt><dd>{st.Pcat ? `${st.Pcat} kN` : '—'}</dd>
              <dt>Tração (catálogo)</dt><dd>{st.Tcat ? `${st.Tcat} kN` : '—'}</dd>
              <dt>Miche: T / Mk</dt><dd>{fmt(st.T, 2)} m / {fmt(st.Mk, 1)} kN·m</dd>
              <dt>nh</dt><dd>{fmt(st.nh, 2)} MN/m³ · {st.nhLabel}</dd>
            </dl>
          ) : (
            <>
              <dl className="kv">
                <dt>Concreto</dt><dd>C{st.fck} · γc {fmt(st.gc!, 1)}</dd>
                <dt>σ = Nd/Ac</dt><dd>{fmt(st.sigma!, 2)} MPa (limite {st.sigmaLim} MPa)</dd>
                <dt>Miche: T / Mk / Md</dt><dd>{fmt(st.T, 2)} m / {fmt(st.Mk, 1)} / {fmt(st.Md, 1)} kN·m</dd>
                <dt>nh</dt><dd>{fmt(st.nh, 2)} MN/m³ · {st.nhLabel}</dd>
                <dt>As mín / compr. / tração</dt><dd>{fmt(st.AsMin * 1e4)} / {fmt(st.AsComp * 1e4)} / {fmt(st.AsTension * 1e4)} cm²</dd>
                <dt>Comprimento armado</dt><dd>{fmt(st.armedLength, 1)} m · {st.armedReason}</dd>
                <dt>Estribo</dt><dd>espiral φ{f.params.stirrupPhi} c/{Math.round(f.params.stirrupS * 100)}</dd>
              </dl>
              <h4>Armadura longitudinal por bitola</h4>
              <table className="data">
                <thead><tr><th>φ (mm)</th><th>Barras</th><th>As (cm²)</th><th>Espaç. (cm)</th><th className="l">Observação</th></tr></thead>
                <tbody>{st.options.map((o) => <tr key={o.phi} className={recommendedOption(st.options) === o ? 'rec' : ''}><td>{phiTxt(o.phi)}{recommendedOption(st.options) === o ? ' ★' : ''}</td><td>{o.n}</td><td>{fmt(o.As * 1e4)}</td><td>{fmt(o.spacing * 100, 1)}</td><td className="l">{o.notes.join('; ') || 'ok'}</td></tr>)}</tbody>
              </table>
              <Hint>★ sugerida: menor área de aço com φ ≥ 10 mm. A lista para na primeira bitola que resolve com o mínimo de 3 barras; bitolas maiores só acrescentariam aço.</Hint>
            </>
          )}
          {st.messages.map((m, i) => <Note key={i}>{m}</Note>)}
          <h4>Capacidade × profundidade</h4>
          <CapChart curve={curve} s={s} />
        </div>
      </div>
      <CapDetail cap={cap} coords={pl.coords} D={s.D} ap={ds.ap} bp={ds.bp} p={f.params} cols={capCols(ds.load)} />
    </div>
  );
}

function CapChart({ curve, s }: { curve: { L: number; Padm: number; Rp: number; Rl: number }[]; s: PileSolution }) {
  if (!curve.length) return null;
  const W = 320, H = 200, l = 40, r = 10, t = 10, bt = 26;
  const maxP = Math.max(...curve.map((c) => c.Padm), s.loads.Nmax) * 1.1;
  const maxL = curve[curve.length - 1].L;
  const X = (v: number) => l + (v / maxP) * (W - l - r);
  const Y = (z: number) => t + (z / maxL) * (H - t - bt);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((q) => q * maxP);
  return (
    <svg className="capchart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Capacidade admissível por profundidade">
      {ticks.map((v) => <g key={v}><line x1={X(v)} x2={X(v)} y1={t} y2={H - bt} className="gl" /><text x={X(v)} y={H - bt + 12} className="axl" textAnchor="middle">{fmt(v, 0)}</text></g>)}
      {[0, Math.round(maxL / 2), maxL].map((z) => <text key={z} x={l - 4} y={Y(z) + 3} className="axl" textAnchor="end">{z} m</text>)}
      <text x={(l + W) / 2} y={H - 2} className="axl" textAnchor="middle">Padm (kN) por estaca</text>
      <line x1={X(s.loads.Nmax)} x2={X(s.loads.Nmax)} y1={t} y2={H - bt} className="nline" />
      <line x1={l} x2={W - r} y1={Y(s.Lmax)} y2={Y(s.Lmax)} className="lmax" />
      <polyline points={curve.map((c) => `${X(c.Padm)},${Y(c.L)}`).join(' ')} className="pcurve" />
      <circle cx={X(s.cap.Padm)} cy={Y(s.L)} r={4} className="pdot" />
    </svg>
  );
}
