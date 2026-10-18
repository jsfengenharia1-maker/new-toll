// Seção de fundações do memorial: estacas + blocos de coroamento, sapatas e tubulões, com premissas e croquis.
import type { ComponentType, ReactNode } from 'react';
import { fmt } from './results';
import { KIND_LABEL, PILE_LABEL, SOIL_LABEL, STRUCT, normalizeFoundation, recommendedOption, type Boring, type FoundationData } from '../core/piles';
import { designSupport, type SupportDesign } from '../core/foundation';
import { isFooting } from '../core/footings';
import { isCaisson } from '../core/caissons';
import { svgCaisson, svgCap, svgFooting } from './foundationDrawing';
import { barTxt, phiTxt } from './FundacoesDetail';

const Fig = ({ svg, cap }: { svg: string; cap: string }) => (
  <figure><div dangerouslySetInnerHTML={{ __html: svg }} /><figcaption>{cap}</figcaption></figure>
);
const cm = (v: number) => fmt(v * 100, 0);
const cm2 = (v: number) => fmt(v * 1e4);
const TBC = () => <span className="warn">[a confirmar]</span>;
const Sit = ({ ok }: { ok: boolean }) => <span className={ok ? 'ok' : 'bad'}>{ok ? 'Atende' : 'Não atende'}</span>;

function BoringTable({ b }: { b: Boring }) {
  return (
    <>
      <h3>Sondagem {b.name}{b.water !== null ? ` · NA a ${fmt(b.water)} m` : ' · NA não encontrado'}{b.x !== undefined && b.y !== undefined ? ` · coordenadas (${fmt(b.x)}; ${fmt(b.y)}) m` : ''}</h3>
      <table>
        <thead><tr><th>Prof. (m)</th>{b.meters.map((_, i) => <th key={i}>{i + 1}</th>)}</tr></thead>
        <tbody><tr><td className="l">N_SPT</td>{b.meters.map((m, i) => <td key={i}>{m.N}</td>)}</tr></tbody>
      </table>
      <p className="small">{[...new Set(b.meters.map((m) => m.soil))].map((s) => `${SOIL_LABEL[s]}: metros ${b.meters.map((m, i) => (m.soil === s ? i + 1 : 0)).filter(Boolean).join(', ')}`).join(' · ')}{b.endImpenetrable ? ' · terminou em impenetrável' : ''}</p>
    </>
  );
}

function solutionText(ds: SupportDesign): ReactNode {
  if (ds.kind === 'estacas') {
    if (!ds.pile || !ds.cap) return <span className="bad">sem solução de estacas</span>;
    return `${PILE_LABEL[ds.pile.type]} Ø${Math.round(ds.pile.D * 100)} · ${ds.pile.n} × L ${ds.pile.L} m · bloco ${cm(ds.cap.lx)} × ${cm(ds.cap.ly)} × ${cm(ds.cap.h)} cm${ds.pileAdopted ? '' : ' (estaca recomendada)'}`;
  }
  if (ds.kind === 'sapata') return ds.footing && isFooting(ds.footing) ? `${cm(ds.footing.A)} × ${cm(ds.footing.B)} × ${cm(ds.footing.h)} cm (${ds.footing.kind === 'rigida' ? 'rígida' : 'flexível'})` : <span className="bad">{ds.footing?.messages[0]}</span>;
  return ds.caisson && isCaisson(ds.caisson) ? `fuste Ø${cm(ds.caisson.Df)} · base Ø${cm(ds.caisson.Db)} · H ${cm(ds.caisson.H)} cm · cota ${fmt(ds.caisson.depth, 1)} m` : <span className="bad">{ds.caisson?.messages[0]}</span>;
}
const okOf = (ds: SupportDesign) => (ds.kind === 'estacas' ? !!ds.cap?.ok : ds.kind === 'sapata' ? !!ds.footing?.ok : !!(ds.caisson && isCaisson(ds.caisson)));

export function FoundationMemorial({ foundation, H2 }: { foundation: FoundationData; H2: ComponentType<{ children: ReactNode }> }) {
  const fd = normalizeFoundation(JSON.parse(JSON.stringify(foundation)));
  const pp = fd.params;
  const designs = fd.loads.map((ld) => designSupport(ld, fd));
  const has = (k: SupportDesign['kind']) => designs.some((d) => d.kind === k);
  const piles = designs.filter((d) => d.kind === 'estacas');
  const footings = designs.filter((d) => d.kind === 'sapata');
  const caissons = designs.filter((d) => d.kind === 'tubulao');
  const sptFooting = footings.length > 0 && pp.ftSigmaMode === 'spt';
  const sptCaisson = caissons.length > 0 && pp.tbSigmaMode === 'spt';

  return (
    <>
      <H2>Fundações</H2>
      <p>Tipo de fundação escolhido por apoio: {designs.map((d) => `${d.load.label} — ${KIND_LABEL[d.kind].toLowerCase()}`).join('; ')}. Cargas características no topo da fundação (envoltória das combinações raras), pilar a × b com a na direção x (plano do pórtico). Concreto de blocos e sapatas C{pp.fckFound}, γc = {fmt(pp.gammaC, 2)}, aço fyk = {pp.fyk} MPa, γs = {fmt(pp.gammaS, 2)}, γf = {fmt(pp.gammaF, 1)}, cobrimento {cm(pp.cover)} cm. Ancoragem das barras do pilar (φ{phiTxt(pp.colPhi)}) por lb = (φ/4)·fyd/fbd ≥ 25φ, fbd = 2,25·fctd (NBR 6118 9.4.2.4, boa aderência, sem gancho).</p>
      {fd.borings!.map((b) => <BoringTable key={b.id} b={b} />)}
      {fd.borings!.length > 1 && <p className="small">Furo de cada apoio: o escolhido; sem escolha, o mais próximo quando apoio e furos têm coordenadas; senão o primeiro furo.</p>}

      <h3>Resumo por apoio</h3>
      <table>
        <thead><tr><th className="l">Apoio</th><th>Nk / Nk,mín / Gk (kN)</th><th>Mx / My (kN·m)</th><th>Pilar (cm)</th><th className="l">Furo</th><th className="l">Fundação</th><th className="l">Solução</th><th className="l">Sit.</th></tr></thead>
        <tbody>{designs.map((d) => (
          <tr key={d.load.id}>
            <td className="l">{d.load.label}</td><td>{fmt(d.load.Nk, 0)} / {fmt(d.load.NkMin, 0)} / {d.load.NkPerm !== undefined ? fmt(d.load.NkPerm, 0) : '—'}</td><td>{fmt(d.load.Mx, 1)} / {fmt(d.load.My, 1)}</td><td>{cm(d.ap)} × {cm(d.bp)}</td>
            <td className="l">{d.boring.name} ({d.boringChoice})</td><td className="l">{KIND_LABEL[d.kind]}</td><td className="l">{solutionText(d)}</td><td className="l"><Sit ok={okOf(d)} /></td>
          </tr>
        ))}</tbody>
      </table>

      {piles.length > 0 && (
        <>
          <h3>Estacas</h3>
          <p>Capacidade geotécnica pelo método de Décourt-Quaresma (1978), com coeficientes α e β de Décourt (1996), somada metro a metro. Padm = mín[(Rp + Rl)/2 ; Rp/4 + Rl/1,3]. Em estacas escavadas e hélice contínua, Rp ≤ Rl; na escavada, Padm ≤ 1,25·Rl. Estrutural pela NBR 6122:2019, Tabela 4 (CAA {pp.caa}): hélice C{STRUCT.helice[pp.caa].fck} (γc {fmt(STRUCT.helice[pp.caa].gc, 1)}), escavada C{STRUCT.escavada[pp.caa].fck} (γc {fmt(STRUCT.escavada[pp.caa].gc, 1)}), γf = {fmt(pp.gammaF, 1)}, As,mín = 0,4%. Pré-moldadas: carga estrutural de catálogo. Carga horizontal pelo método de Miche (Mmáx = 0,79·H·T; T = (EI/nh)^(1/5)). Bloco rígido com espaçamento {fmt(pp.spacingInSitu, 1)}φ (moldadas) e {fmt(pp.spacingPrecast, 1)}φ (pré-moldadas); peso do bloco = {pp.blockWeightPct}% de N.</p>
          <p>Esforço normal mínimo de cálculo por estaca (flexo-compressão com N mínimo e tração): Nd,mín = γf,fav·(Gk + Wb)/n − γf·[(Gk − Nk,mín)/n + ΔN], com γf,fav = {fmt(pp.gammaFfav, 1)} na parcela permanente favorável e γf = {fmt(pp.gammaF, 1)} no alívio variável (Gk − Nk,mín) e no binário ΔN do momento (NBR 6118, Tabela 11.1). Tração de cálculo Td = máx(0; −Nd,mín). Gk é a soma dos casos permanentes; quando não informada, adota-se Gk = Nk (toda a diferença Nk − Nk,mín tratada como variável que alivia, a favor da segurança){piles.some((d) => d.load.NkPerm === undefined) ? `: apoios sem Gk informada — ${piles.filter((d) => d.load.NkPerm === undefined).map((d) => d.load.label).join(', ')}` : ''}.</p>
          <p className="small">Limites: escavada até o nível d'água ou N ≥ {pp.augerStopN}; hélice até {pp.hcMaxDepth} m; pré-moldada até N ≥ {pp.precastStopN} (estimativa da nega, a confirmar na cravação). Cota de arrasamento a {fmt(pp.cutoff)} m.</p>
          <table>
            <thead><tr><th className="l">Apoio</th><th className="l">Tipo</th><th>Estacas</th><th>Ø (cm)</th><th>L (m)</th><th>Padm (kN)</th><th>N/estaca (kN)</th><th>Nd,mín (kN)</th><th className="l">Armadura</th></tr></thead>
            <tbody>
              {piles.flatMap((d) => d.piles!.byType.map((t, i) => {
                const s = t.recommended;
                const o = s ? recommendedOption(s.struct.options) : null;
                return (
                  <tr key={`${d.load.id}-${t.type}`}>
                    <td className="l">{i === 0 ? d.load.label : ''}</td>
                    <td className="l">{PILE_LABEL[t.type]}{s && d.pile === s ? ' (adotada)' : ''}</td>
                    {s ? <><td>{s.n}</td><td>{Math.round(s.D * 100)}</td><td>{s.L}</td><td>{fmt(s.cap.Padm, 0)}</td><td>{fmt(s.loads.Nmax, 0)}</td><td>{fmt(s.loads.NdMin, 0)}</td>
                      <td className="l">{s.struct.kind === 'catalogo' ? 'de fábrica' : `${o ? `${o.n} φ${phiTxt(o.phi)} (As ${fmt(o.As * 1e4)} cm²)` : '—'} em ${fmt(s.struct.armedLength, 1)} m · espiral φ${pp.stirrupPhi} c/${Math.round(pp.stirrupS * 100)}${o?.notes.length ? ` · ${o.notes.join('; ')}` : ''}`}</td></>
                      : <td colSpan={7} className="l bad">sem solução dentro dos limites</td>}
                  </tr>
                );
              }))}
            </tbody>
          </table>
          <p className="small">A solução recomendada de cada tipo minimiza o volume de concreto das estacas, o bloco estimado e o aço (convertido pela equivalência de {pp.steelPerM3} kg/m³). O bloco de coroamento é dimensionado para a estaca adotada (ou, sem escolha, para a recomendada do primeiro tipo).</p>

          <h3>Blocos de coroamento — bielas e tirantes</h3>
          <div className="formula">{`Bloco rígido: bielas com inclinação θ entre ${pp.capThetaMin}° e ${pp.capThetaMax}° (tg θ = d/ℓ, ℓ = distância horizontal entre o centro da estaca e o ponto de partida da biela no pilar).
Ponto de partida: centróide da parte da seção do pilar voltada para a estaca (ap/4 com 2 estacas; ap/4 e bp/4 com 4).
d ≥ máx(ℓmáx·tg ${pp.capThetaMin}°; lb do pilar); h = d + d′, d′ ≥ máx(${cm(pp.capDprime)} cm; 0,886·D/5); h em múltiplos de 5 cm.
Reação de cálculo por estaca Ri = γf·(Nk/n ± My·xi/Σx² ± Mx·yi/Σy²); tirantes e bielas com a mais carregada em todas (Nd,eq = n·Rd).
Força horizontal de cada biela Hi = Rd·ℓi/d; tirantes sobre as estacas por equilíbrio dos nós (2 estacas: T = Rd·(e/2 − ap/4)/d).
Bielas: σ,pilar = Nd,eq/(Ap·sen²θ) e σ,estaca = Rd/(Ae·sen²θ) ≤ K·KR·fcd, K = ${fmt(pp.capK2, 2)} / ${fmt(pp.capK3, 2)} / ${fmt(pp.capK4, 2)} / ${fmt(pp.capK5, 2)} / ${fmt(pp.capK6, 2)} (2 a 6 estacas), KR = ${fmt(pp.capKR, 2)}.
As,tirante = T/fyd, concentrada em faixa de ${fmt(pp.capBand, 1)}·D sobre as estacas, ancorada com gancho a partir da face interna da estaca.
Malha inferior (3 ou mais estacas): ${fmt(pp.capDistRatio * 100, 0)}% da armadura principal em cada direção. Bloco de 2 estacas: armadura superior ${fmt(pp.capDistRatio * 100, 0)}% do tirante, pele ${fmt(pp.capSkinRatio * 100, 2)}%·b·h por face e estribos verticais com ρw,mín = 0,2·fctm/fywk.
Suspensão quando s > ${fmt(pp.capSuspFactor, 1)}·D: As,susp,total = Nd/(1,5·n·fyd).
Bloco sobre 1 estaca: lado a = D + 2·borda, h ≥ máx(${fmt(pp.cap1Ratio, 2)}·a; lb + c); tração Rst = 0,25·Nd·(a − ap)/a em cada direção, em estribos horizontais.`}</div>
          {piles.map((d) => d.pile && d.cap && (
            <div key={d.load.id}>
              <h3>Bloco {d.load.label}: {d.pile.n} estaca{d.pile.n > 1 ? 's' : ''} Ø{Math.round(d.pile.D * 100)} — <Sit ok={d.cap.ok} /></h3>
              <Fig svg={svgCap(d.cap, d.pile.loads.coords, d.pile.D, d.ap, d.bp)} cap={`Figura — bloco ${d.load.label}: planta com tirantes sobre as estacas e corte com bielas.`} />
              <table>
                <tbody>
                  <tr><td className="l">Dimensões lx × ly × h</td><td>{cm(d.cap.lx)} × {cm(d.cap.ly)} × {cm(d.cap.h)} cm</td><td className="l">Pilar</td><td>{cm(d.ap)} × {cm(d.bp)} cm</td></tr>
                  {d.cap.n > 1 ? (
                    <>
                      <tr><td className="l">d / d′</td><td>{cm(d.cap.d)} / {cm(d.cap.dPrime)} cm</td><td className="l">d para {pp.capThetaMin}°–{pp.capThetaMax}° / lb pilar</td><td>{cm(d.cap.dMin)}–{cm(d.cap.dMax)} / {cm(d.cap.lbCol)} cm</td></tr>
                      <tr><td className="l">θ das bielas</td><td>{fmt(d.cap.thetaMin, 1)}° a {fmt(d.cap.thetaMax, 1)}°</td><td className="l">Nd / Rd / Nd,eq</td><td>{fmt(d.cap.Nd, 0)} / {fmt(d.cap.Rd, 0)} / {fmt(d.cap.NdEq, 0)} kN</td></tr>
                      <tr><td className="l">Biela junto ao pilar</td><td className={d.cap.strutCol > d.cap.sigmaLim ? 'bad' : ''}>{fmt(d.cap.strutCol, 1)} MPa</td><td className="l">Biela junto à estaca</td><td className={d.cap.strutPile > d.cap.sigmaLim ? 'bad' : ''}>{fmt(d.cap.strutPile, 1)} MPa</td></tr>
                      <tr><td className="l">Limite K·KR·fcd</td><td>{fmt(d.cap.sigmaLim, 1)} MPa</td><td className="l">Suspensão</td><td>{d.cap.susp.need ? `${cm2(d.cap.susp.AsTot)} cm² (total)` : 'não necessária'}</td></tr>
                      {d.cap.mesh && <tr><td className="l">Malha inferior x / y</td><td colSpan={3} className="l">{barTxt(d.cap.mesh.x.bars)} / {barTxt(d.cap.mesh.y.bars)}</td></tr>}
                      {d.cap.top && <tr><td className="l">Armadura superior / pele por face</td><td colSpan={3} className="l">{barTxt(d.cap.top.bars)} / {barTxt(d.cap.skin?.bars)} ({cm2(d.cap.skin?.AsFace ?? 0)} cm²)</td></tr>}
                      {d.cap.stirrups && <tr><td className="l">Estribos verticais</td><td colSpan={3} className="l">φ{phiTxt(d.cap.stirrups.phi)} c/{cm(d.cap.stirrups.s)} · {d.cap.stirrups.legs} ramos</td></tr>}
                    </>
                  ) : d.cap.single && (
                    <>
                      <tr><td className="l">Rst x / y</td><td>{fmt(d.cap.single.Rst[0], 0)} / {fmt(d.cap.single.Rst[1], 0)} kN</td><td className="l">Estribos horizontais x / y</td><td>{barTxt(d.cap.single.bars[0], false)} / {barTxt(d.cap.single.bars[1], false)}</td></tr>
                      <tr><td className="l">Pressão pilar / limite</td><td>{fmt(d.cap.single.colSigma, 1)} / {fmt(d.cap.single.colLim, 1)} MPa</td><td className="l">Pressão estaca / limite</td><td>{fmt(d.cap.single.pileSigma, 1)} / {fmt(d.cap.single.pileLim, 1)} MPa</td></tr>
                    </>
                  )}
                  <tr><td className="l">Volume / peso real</td><td>{fmt(d.cap.volume, 2)} m³ / {fmt(d.cap.weight, 0)} kN</td><td className="l">Peso adotado nas estacas</td><td>{d.cap.WbAssumed !== undefined ? `${fmt(d.cap.WbAssumed, 0)} kN` : '—'}</td></tr>
                </tbody>
              </table>
              {d.cap.ties.length > 0 && (
                <table>
                  <thead><tr><th className="l">Tirante</th><th>T (kN)</th><th>As,calc (cm²)</th><th className="l">Barras</th><th>Ancoragem nec. / disp. (cm)</th></tr></thead>
                  <tbody>{d.cap.ties.map((t, i) => <tr key={i}><td className="l">E{t.a + 1}–E{t.b + 1} ({t.dir})</td><td>{fmt(t.T, 0)}</td><td>{cm2(t.As)}</td><td className="l">{t.bars ? `${t.bars.n} φ${phiTxt(t.bars.phi)} (${cm2(t.bars.As)} cm²)` : 'não cabe na faixa'}</td><td>{cm(t.lbNec)} / {cm(t.lbAvail)}</td></tr>)}</tbody>
                </table>
              )}
              {d.cap.messages.length > 0 && <ul>{d.cap.messages.map((m, i) => <li key={i}>{m}</li>)}</ul>}
            </div>
          ))}
        </>
      )}

      {footings.length > 0 && (
        <>
          <h3>Sapatas isoladas</h3>
          <div className="formula">{`σadm: ${pp.ftSigmaMode === 'informada' ? `informada = ${fmt(pp.ftSigmaAdm, 0)} kPa` : `estimada pelo SPT, σadm ≈ N̄/${fmt(pp.ftSptDiv, 0)} MPa, N̄ = média do SPT da cota de apoio (${fmt(pp.ftDepth, 2)} m) até ${fmt(pp.ftBulb, 1)}× o menor lado abaixo, limitado a N̄ = ${fmt(pp.ftNmaxEst, 0)}`}.
Peso próprio somado a Nk = máx(${fmt(pp.ftPP, 0)}% de Nk; peso do concreto da sapata com 25 kN/m³), recalculado até convergir; o solo sobre a sapata (γsolo = ${fmt(pp.gammaSoil, 0)} kN/m³) é só informado, por considerar σadm líquida.
Planta: A (direção x, momento My) × B (direção y, momento Mx), múltiplos de 5 cm, lado ≥ 60 cm, A/B ≤ ${fmt(pp.ftMaxRatio, 1)}; menor área e balanços iguais quando possível.
Base sem tração: distribuição plana; dentro do núcleo central σ = N/(A·B)·(1 ± 6ex/A ± 6ey/B); fora dele, equilíbrio com a área comprimida.
Verificações nos casos (Nk + pp; Nk,mín + pp) com os momentos máximos: σmáx ≤ ${fmt(pp.ftEdgeFactor, 2)}·σadm, N/(A·B) ≤ σadm e área comprimida ≥ ${fmt(pp.ftMinCompressed * 100, 0)}%.
Rígida: h ≥ (a − ap)/3 (NBR 6118 22.6.1) e h ≥ lb + c; h0 ≥ máx(h/3; ${cm(pp.ftH0Min)} cm). Flexível: h pela punção.
Flexão ${pp.ftMethod === 'ceb70' ? 'CEB-70: momento das tensões de cálculo (Nd = γf·Nk, sem peso próprio) além da seção a 0,15·ap dentro da face do pilar, d ≤ 1,5·c' : 'pelo método das bielas (Lebelle): T = Nd,eq·(a − ap)/(8d), Nd,eq = σd,máx·A·B'}; As ≥ ${fmt(pp.ftRhoMin * 100, 2)}%·b·h; barras com espaçamento entre 10 e 20 cm.
Punção (NBR 6118 19.5): contorno C, τSd = Nd/(u0·d) ≤ τRd2 = 0,27·(1 − fck/250)·fcd; contorno C′ a 2d (flexível), τSd = Fsd,red/(u·d) + K·Md/(Wp·d) ≤ τRd1 = 0,13·(1 + √(20/d))·(100·ρ·fck)^(1/3), com Fsd,red descontada a reação média do solo dentro de C′.`}</div>
          {footings.map((d) => {
            const r = d.footing!;
            if (!isFooting(r)) return <p key={d.load.id} className="bad">Sapata {d.load.label}: {r.messages.join(' ')}</p>;
            return (
              <div key={d.load.id}>
                <h3>Sapata {d.load.label}: {cm(r.A)} × {cm(r.B)} × {cm(r.h)} cm — <Sit ok={r.ok} /></h3>
                <Fig svg={svgFooting(r, d.ap, d.bp)} cap={`Figura — sapata ${d.load.label}: planta e corte na direção A com as tensões no solo (Nk máx).`} />
                <table>
                  <tbody>
                    <tr><td className="l">σadm</td><td>{fmt(r.sigmaAdm, 0)} kPa</td><td className="l">Origem</td><td className="l">{r.sigmaSrc}{r.spt ? ` · N̄ = ${fmt(r.spt.Nbar, 1)} (metros ${r.spt.from} a ${r.spt.to})` : ''}</td></tr>
                    <tr><td className="l">Peso usado / concreto / solo sobre a sapata</td><td>{fmt(r.W, 0)} / {fmt(r.Wconc, 0)} / {fmt(r.Wsoil, 0)} kN</td><td className="l">Pilar</td><td>{cm(d.ap)} × {cm(d.bp)} cm</td></tr>
                    {r.cases.map((c) => <tr key={c.label}><td className="l">{c.label}: N / ex / ey</td><td>{fmt(c.N, 0)} kN / {fmt(c.ex, 3)} / {fmt(c.ey, 3)} m</td><td className="l">σmáx / σmín / comprimida</td><td>{fmt(c.sigmaMax, 0)} / {fmt(c.sigmaMin, 0)} kPa / {fmt(c.compressed * 100, 0)}%</td></tr>)}
                    <tr><td className="l">Tipo / h rígida mín.</td><td>{r.kind === 'rigida' ? 'rígida' : 'flexível'} / {cm(r.hRigid)} cm</td><td className="l">h / h0 / d / lb pilar</td><td>{cm(r.h)} / {cm(r.h0)} / {cm(r.d)} / {cm(r.lbCol)} cm</td></tr>
                    {(['x', 'y'] as const).map((k) => <tr key={k}><td className="l">Flexão {k === 'x' ? 'na direção A' : 'na direção B'}</td><td>{r.method === 'ceb70' ? `Md = ${fmt(r.flex[k].Md, 0)} kN·m` : `T = ${fmt(r.flex[k].T, 0)} kN`}</td><td className="l">As calc / mín · barras</td><td className="l">{cm2(r.flex[k].As)} / {cm2(r.flex[k].AsMin)} cm² · {barTxt(r.flex[k].bars)}</td></tr>)}
                    <tr><td className="l">Contorno C: τSd / τRd2</td><td>{fmt(r.punch.tauSd0, 2)} / {fmt(r.punch.tauRd2, 2)} MPa</td><td className="l">Contorno C′: τSd / τRd1</td><td>{r.punch.applies ? `${fmt(r.punch.tauSd1!, 2)} / ${fmt(r.punch.tauRd1!, 2)} MPa${r.kind === 'rigida' ? ' (informativo)' : ''}` : 'fora da sapata'}</td></tr>
                    <tr><td className="l">Volume de concreto</td><td>{fmt(r.volume, 2)} m³</td><td className="l">σd máx / mín (ELU)</td><td>{fmt(r.sigmaD.max, 0)} / {fmt(r.sigmaD.min, 0)} kPa</td></tr>
                  </tbody>
                </table>
                {[...r.methodNotes, ...r.messages].length > 0 && <ul>{[...r.methodNotes, ...r.messages].map((m, i) => <li key={i}>{m}</li>)}</ul>}
              </div>
            );
          })}
        </>
      )}

      {caissons.length > 0 && (
        <>
          <h3>Tubulões a céu aberto</h3>
          <div className="formula">{`Fuste de concreto simples: γf·Nk/Af ≤ 0,85·fck/γc (C${pp.tbFck}, γc = ${fmt(pp.tbGc, 2)}), diâmetro ≥ ${cm(pp.tbDfMin)} cm, em múltiplos de 5 cm.
σadm na base: ${pp.tbSigmaMode === 'informada' ? `informada = ${fmt(pp.tbSigmaAdm, 0)} kPa` : `estimada pelo SPT, σadm ≈ N̄/${fmt(pp.tbSptDiv, 0)} MPa, N̄ = média do SPT abaixo da base até ${fmt(pp.ftBulb, 1)}·Db, limitado a ${fmt(pp.tbNmaxEst, 0)}`}.
Base: Ab = (Nk${pp.tbWeight ? ' + peso próprio do tubulão' : ''})/σadm, com σmáx = N/Ab + M/(π·Db³/32) ≤ ${fmt(pp.ftEdgeFactor, 2)}·σadm (sem contribuição lateral do solo).
Altura da base H = 0,866·(Db − Df) (paredes a 60°) + rodapé de ${cm(pp.tbRodape)} cm; H ≤ ${cm(pp.tbHmax)} cm; Db ≤ ${cm(pp.tbDbMax)} cm.
Céu aberto: base acima do nível d'água. Cota ${pp.tbDepth > 0 ? `informada = ${fmt(pp.tbDepth, 2)} m` : `automática: a de menor volume de concreto entre ${fmt(pp.tbMinDepth, 1)} m e o nível d'água`}.`}</div>
          {caissons.map((d) => {
            const r = d.caisson!;
            if (!isCaisson(r)) return <p key={d.load.id} className="bad">Tubulão {d.load.label}: {r.messages.join(' ')}</p>;
            return (
              <div key={d.load.id}>
                <h3>Tubulão {d.load.label}: fuste Ø{cm(r.Df)} · base Ø{cm(r.Db)} — <Sit ok={true} /></h3>
                <Fig svg={svgCaisson(r, d.boring.water, pp.cutoff)} cap={`Figura — tubulão ${d.load.label}: elevação com base alargada.`} />
                <table>
                  <tbody>
                    <tr><td className="l">Cota da base ({r.depthMode})</td><td>{fmt(r.depth, 2)} m</td><td className="l">σadm</td><td className="l">{fmt(r.sigmaAdm, 0)} kPa · {r.sigmaSrc}{r.spt ? ` · N̄ = ${fmt(r.spt.Nbar, 1)} (metros ${r.spt.from} a ${r.spt.to})` : ''}</td></tr>
                    <tr><td className="l">σ fuste / limite</td><td>{fmt(r.sigmaFuste, 2)} / {fmt(r.sigmaFusteLim, 2)} MPa</td><td className="l">Db / H / rodapé</td><td>{cm(r.Db)} / {cm(r.H)} / {cm(r.rodape)} cm</td></tr>
                    <tr><td className="l">N na base / peso</td><td>{fmt(r.Nbase, 0)} / {fmt(r.W, 0)} kN</td><td className="l">σ máx na base</td><td>{fmt(r.sigmaBaseMax, 0)} kPa</td></tr>
                    <tr><td className="l">Volume de concreto</td><td>{fmt(r.volume, 2)} m³</td><td className="l">Furo</td><td className="l">{d.boring.name}</td></tr>
                  </tbody>
                </table>
                {r.messages.length > 0 && <ul>{r.messages.map((m, i) => <li key={i}>{m}</li>)}</ul>}
              </div>
            );
          })}
        </>
      )}

      <h3>Premissas a confirmar (fundações)</h3>
      <ul>
        {has('estacas') && <li>Limites de tensão nas bielas dos blocos K·KR·fcd de Blévot (K = 1,4 / 1,75 / 2,1 para 2 / 3 / 4 estacas; 5 e 6 por extensão; KR = {fmt(pp.capKR, 2)}): qual referência adotar (Blévot, Fusco ou NBR 6118 22.7) <TBC />.</li>}
        {has('estacas') && <li>Faixa da armadura principal de {fmt(pp.capBand, 1)}·D, malha de {fmt(pp.capDistRatio * 100, 0)}%, suspensão Nd/(1,5·n·fyd) para s &gt; {fmt(pp.capSuspFactor, 1)}D, pele {fmt(pp.capSkinRatio * 100, 2)}% e estribos ρw,mín no bloco de 2 estacas, d′ mínimo de {cm(pp.capDprime)} cm, bloco de 1 estaca (h = {fmt(pp.cap1Ratio, 2)}·a; Rst = 0,25·Nd·(a − ap)/a) <TBC />.</li>}
        {has('estacas') && <li>Tirantes e bielas com a estaca mais carregada em todas (Nd,eq = n·Rd); peso do bloco não passa pelas bielas <TBC />.</li>}
        {sptFooting && <li>σadm de sapatas estimada pelo SPT (N̄/{fmt(pp.ftSptDiv, 0)} MPa, bulbo {fmt(pp.ftBulb, 1)}× o menor lado, N̄ ≤ {fmt(pp.ftNmaxEst, 0)}): regra empírica, sem substituir a avaliação geotécnica <TBC />.</li>}
        {sptCaisson && <li>σadm de tubulões estimada pelo SPT (N̄/{fmt(pp.tbSptDiv, 0)} MPa, N̄ ≤ {fmt(pp.tbNmaxEst, 0)}) <TBC />.</li>}
        {footings.length > 0 && <li>Sapatas: área comprimida mínima de {fmt(pp.ftMinCompressed * 100, 0)}% (item da NBR 6122), σmáx ≤ {fmt(pp.ftEdgeFactor, 2)}·σadm, peso próprio mínimo de {fmt(pp.ftPP, 0)}% de Nk e σadm tratada como líquida (solo sobre a sapata não somado), h0 ≥ máx(h/3; {cm(pp.ftH0Min)} cm), ρmín = {fmt(pp.ftRhoMin * 100, 2)}% e γsolo = {fmt(pp.gammaSoil, 0)} kN/m³ <TBC />.</li>}
        {caissons.length > 0 && <li>Tubulões: concreto do fuste C{pp.tbFck} com γc = {fmt(pp.tbGc, 2)}, fuste mínimo {cm(pp.tbDfMin)} cm, H da base ≤ {cm(pp.tbHmax)} cm, base ≤ {cm(pp.tbDbMax)} cm e peso próprio {pp.tbWeight ? 'somado' : 'desprezado'} na base <TBC />.</li>}
        {(has('estacas') || footings.length > 0) && <li>Bitola das barras do pilar φ{phiTxt(pp.colPhi)} (define lb e a altura mínima de blocos e sapatas){fd.loads.some((l) => l.ap === undefined || l.bp === undefined) ? ` e pilar padrão ${cm(pp.colA)} × ${cm(pp.colB)} cm nos apoios sem seção informada` : ''} <TBC />.</li>}
        <li>Números de item da NBR 6118 citados seguem a numeração de 2014 <TBC />.</li>
      </ul>
      <p className="small">Não fazem parte deste memorial: detalhamento final das armaduras (comprimentos, dobras e emendas), cisalhamento das sapatas fora da punção, armadura de topo do tubulão, recalques e efeito de grupo.</p>
    </>
  );
}
