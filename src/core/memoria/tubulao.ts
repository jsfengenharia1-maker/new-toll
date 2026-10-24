// Memória detalhada (MD fase 5b): tubulão a céu aberto (caissons.ts). Chamada por `registrarFundacoes` só com a memória ligada, depois do
// cálculo, com os parâmetros guardados em `dadosDoProjeto`. Fuste (concreto simples), cota de apoio (tentativas e critério do menor
// volume), σadm pelo SPT, base alargada (Db, cone a 60°, rodapé), peso, tensões na base e altura da base.
import { caissonShaft, vol, type CaissonInput, type CaissonResult, type CaissonTry, type designCaisson } from '../caissons';
import { dadosDoProjeto, type SupportDesign } from '../foundation';
import { sptSigma } from '../footings';
import type { FoundationParams } from '../piles';
import { fm, type Registrador } from './registrador';

type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;
const NBR6122 = 'NBR 6122:2019';

/** Entrada que o núcleo monta para o tubulão (a mesma de `designSupport`). */
export function entradaTubulao(d: SupportDesign): CaissonInput {
  const ld = d.load;
  return { Nk: ld.Nk, NkMin: ld.NkMin, Mx: ld.Mx, My: ld.My, Hx: ld.Hx, Hy: ld.Hy, boring: d.boring, ...(ld.fixed ? { fixed: { Db: ld.fixed.A, ...(ld.fixed.Df ? { Df: ld.fixed.Df } : {}) } } : {}) };
}

export function registrarTubulao(mem: Registrador, el: string, d: SupportDesign): void {
  const data = dadosDoProjeto.get(d), r = d.caisson;
  if (!data || !r) return;
  cadeiaTubulao(mem, el, entradaTubulao(d), data.params, r);
}

export function cadeiaTubulao(mem: Registrador, el: string, inp: CaissonInput, p: FoundationParams, r: ReturnType<typeof designCaisson>): void {
  const E = (etapa: 'cargas' | 'esforcos' | 'dimensionamento' | 'detalhamento', topico: string, q: Chave) => mem.passo({ etapa, elemento: el, topico, ...q });
  let t = 'Fuste';
  if (!('Db' in r) || !r.ok) {
    E('detalhamento', 'Situação', { descricao: 'Tubulão NÃO atende', formula: 'verificações', expressao: r.messages.join(' ') || 'sem mensagens', resultado: 'não atende', unidade: '', entradas: { tentativas: JSON.stringify(r.tries.map((q) => [q.depth, q.ok ? 1 : 0, q.reasons.join('; ')])) } });
    return;
  }
  const res = r as CaissonResult;
  const gf = p.gammaF, lim = (0.85 * p.tbFck) / p.tbGc;
  E('dimensionamento', t, { descricao: 'Tensão limite do concreto simples do fuste', formula: 'σ,lim = 0,85·fck/γc', expressao: `σ,lim = 0,85·${fm(p.tbFck)}/${fm(p.tbGc)} = ${fm(lim)} MPa`, resultado: lim, unidade: 'MPa', norma: `${NBR6122}; fuste C25 com γc = 1,6 (a confirmar)`, aConfirmar: true, entradas: { fck: p.tbFck, gc: p.tbGc, lim } });
  const Af = (gf * inp.Nk) / 1000 / lim, Dc = Math.sqrt((4 * Af) / Math.PI), Df = res.Df;
  E('dimensionamento', t, { descricao: inp.fixed?.Df ? 'Diâmetro do fuste imposto (só verificado)' : 'Área e diâmetro do fuste (múltiplo de 5 cm, no mínimo o diâmetro mínimo)', formula: 'Af = γf·Nk/σ,lim; Df = máx(Df,mín; ceil05(√(4·Af/π)))', expressao: `Af = ${fm(gf)}·${fm(inp.Nk)}/1000/${fm(lim)} = ${fm(Af)} m²; √(4Af/π) = ${fm(Dc)} m → Df = ${fm(Df)} m`, resultado: Df, unidade: 'm', norma: `${NBR6122}; fuste ≥ 70 cm (a confirmar)`, aConfirmar: true, entradas: { gammaF: gf, Nk: inp.Nk, lim, Af, Dcalc: Dc, DfMin: p.tbDfMin, Df, imposto: inp.fixed?.Df ? 1 : 0 } });
  const sh = caissonShaft(inp.Nk, p);
  E('dimensionamento', t, { descricao: 'Tensão de cálculo no fuste adotado', formula: 'σ = γf·Nk/(π·Df²/4) ≤ σ,lim', expressao: `σ = ${fm(gf)}·${fm(inp.Nk)}/1000/(π·${fm(Df)}²/4) = ${fm(res.sigmaFuste)} MPa ${res.sigmaFuste <= lim + 1e-9 ? '≤' : '>'} ${fm(lim)} MPa`, resultado: res.sigmaFuste, unidade: 'MPa', norma: NBR6122, entradas: { gammaF: gf, Nk: inp.Nk, Df, sigma: res.sigmaFuste, lim: res.sigmaFusteLim, sigmaCalcAuto: sh.sigma } });

  t = 'Cota de apoio';
  const tries = res.tries;
  E('dimensionamento', t, { descricao: res.depthMode === 'informada' ? `Cota de apoio informada: ${fm(p.tbDepth)} m` : `Cota automática: tenta cada metro de ${fm(Math.max(Math.ceil(p.tbMinDepth), Math.ceil(p.cutoff + 1)))} m até o menor entre o fim da sondagem e o nível d'água; fica a de menor volume (desempate: a mais rasa)`, formula: 'cota = argmin(volume) entre as tentativas que atendem', expressao: tries.map((q) => `${q.depth} m: ${q.ok ? `Db = ${fm(q.Db)} m, V = ${fm(q.volume)} m³` : `não atende (${q.reasons.join('; ')})`}`).join(' | '), resultado: res.depth, unidade: 'm', norma: `${NBR6122}; cota pelo menor volume entre ${fm(p.tbMinDepth)} m e o NA (a confirmar)`, aConfirmar: true, entradas: { adotada: res.depth, cutoff: p.cutoff, tbMinDepth: p.tbMinDepth, modo: res.depthMode, tentativas: JSON.stringify(tries.map((q: CaissonTry) => [q.depth, q.ok ? 1 : 0, q.ok ? q.volume : null, q.reasons.join('; ')])) } });

  t = 'Tensão admissível do solo';
  const Db = res.Db, L = res.depth - p.cutoff;
  if (p.tbSigmaMode === 'informada') {
    E('dimensionamento', t, { descricao: 'σadm informada (tubulão ou terreno)', formula: 'σadm = valor informado', expressao: `σadm = ${fm(res.sigmaAdm)} kPa`, resultado: res.sigmaAdm, unidade: 'kPa', norma: NBR6122, entradas: { origem: 'informada', sigma: res.sigmaAdm } });
  } else {
    const bulbo = p.ftBulb * Db, z0 = res.depth;
    const sel = (inp.boring?.meters ?? []).map((m, i) => [i + 1, m.N] as [number, number]).filter(([z]) => z > z0 + 1e-9 && z <= z0 + Math.max(1, bulbo) + 1e-9);
    const sg = inp.boring ? sptSigma(inp.boring, z0, bulbo, p.tbSptDiv, p.tbNmaxEst) : null;
    E('dimensionamento', t, { descricao: `Camadas do SPT abaixo da base (cota ${fm(z0)} m) no bulbo de tensões (bulbo = ${fm(p.ftBulb)}·Db)`, formula: 'N̄ = média dos NSPT por metro do bulbo', expressao: `NSPT = ${sel.map(([z, n]) => `${z} m: ${fm(n)}`).join('; ')} → N̄ = ${fm(sg?.Nbar ?? 0)}`, resultado: sg?.Nbar ?? 0, unidade: '', norma: NBR6122, aConfirmar: true, entradas: { profundidade: z0, fatorBulbo: p.ftBulb, Db, leituras: JSON.stringify(sel), Nbar: sg?.Nbar ?? 0 } });
    E('dimensionamento', t, { descricao: 'N̄ limitado e σadm estimada pelo SPT', formula: 'σadm = mín(N̄; Nmáx)/div · 1000', expressao: `σadm = mín(${fm(sg?.Nbar ?? 0)}; ${fm(p.tbNmaxEst)})/${fm(p.tbSptDiv)}·1000 = ${fm(res.sigmaAdm)} kPa`, resultado: res.sigmaAdm, unidade: 'kPa', norma: `${NBR6122}; estimativa empírica N̄/${p.tbSptDiv} MPa (a confirmar)`, aConfirmar: true, entradas: { Nbar: sg?.Nbar ?? 0, Nmax: p.tbNmaxEst, div: p.tbSptDiv, sigma: res.sigmaAdm } });
  }

  t = 'Base alargada';
  const alarga = Db > Df + 1e-9;
  const Hcone = alarga ? 0.866 * (Db - Df) : 0, rodape = alarga ? p.tbRodape : 0;
  E('dimensionamento', t, { descricao: `Base: ${inp.fixed ? 'diâmetro imposto' : 'o menor diâmetro (passos de 5 cm, a partir do fuste) com σ média ≤ σadm e σ máx ≤ fator·σadm'}; cone a 60° e rodapé`, formula: 'Hcone = 0,866·(Db − Df); H = Hcone + rodapé', expressao: `Db = ${fm(Db)} m; Df = ${fm(Df)} m → Hcone = ${fm(Hcone)} m; rodapé = ${fm(rodape)} m; H = ${fm(Hcone + rodape)} m`, resultado: Hcone + rodape, unidade: 'm', norma: `${NBR6122}; α = 60° (a confirmar)`, aConfirmar: true, entradas: { Db, Df, Hcone, rodape, H: res.H, tbRodape: p.tbRodape, tbDbMax: p.tbDbMax, alarga: alarga ? 1 : 0 } });
  const V = vol(Df, Db, L, Hcone, rodape);
  E('detalhamento', t, { descricao: `Volume de concreto do fuste (L = cota − arrasamento = ${fm(L)} m) e da base`, formula: 'V = π·Df²/4·(L − Hcone − rodapé) + π·Hcone/12·(Db² + Db·Df + Df²) + π·Db²/4·rodapé', expressao: `V = ${fm(V)} m³`, resultado: V, unidade: 'm³', norma: NBR6122, entradas: { Df, Db, L, Hcone, rodape, V, volume: res.volume } });
  const W = p.tbWeight ? 25 * V : 0, Ab = (Math.PI * Db * Db) / 4, Nbase = inp.Nk + W, M = Math.hypot(inp.Mx, inp.My), Wb = (Math.PI * Db ** 3) / 32;
  E('dimensionamento', t, { descricao: `Peso próprio${p.tbWeight ? ' (25·V)' : ' desprezado (opção desligada)'} somado à carga na base e momento resultante`, formula: 'Nbase = Nk + W; M = √(Mx² + My²)', expressao: `W = ${fm(W)} kN; Nbase = ${fm(inp.Nk)} + ${fm(W)} = ${fm(Nbase)} kN; M = ${fm(M)} kN·m`, resultado: Nbase, unidade: 'kN', norma: NBR6122, aConfirmar: true, entradas: { Nk: inp.Nk, W, Nbase, Mx: inp.Mx, My: inp.My, M, tbWeight: p.tbWeight ? 1 : 0 } });
  const sMed = Nbase / Ab, sMax = Nbase / Ab + M / Wb;
  E('dimensionamento', t, { descricao: 'Tensões na base circular (distribuição linear, momento resultante em uma direção)', formula: 'σmédia = Nbase/Ab; σmáx = Nbase/Ab + M/(π·Db³/32)', expressao: `σmédia = ${fm(Nbase)}/${fm(Ab)} = ${fm(sMed)} kPa ${sMed <= res.sigmaAdm + 1e-9 ? '≤' : '>'} σadm = ${fm(res.sigmaAdm)} kPa; σmáx = ${fm(sMed)} + ${fm(M)}/${fm(Wb)} = ${fm(sMax)} kPa ${sMax <= p.ftEdgeFactor * res.sigmaAdm + 1e-6 ? '≤' : '>'} ${fm(p.ftEdgeFactor)}·σadm`, resultado: sMax, unidade: 'kPa', norma: NBR6122, entradas: { Nbase, Ab, M, Wb, sigmaMedia: sMed, sigmaMax: sMax, sigmaAdm: res.sigmaAdm, edge: p.ftEdgeFactor, Db, resBaseMax: res.sigmaBaseMax } });
  E('dimensionamento', t, { descricao: `Altura da base ≤ ${fm(p.tbHmax)} m e profundidade maior que a altura da base`, formula: 'H ≤ Hmáx; L > H', expressao: `H = ${fm(res.H)} m ${res.H <= p.tbHmax + 1e-9 ? '≤' : '>'} ${fm(p.tbHmax)} m; L = ${fm(L)} m`, resultado: res.H, unidade: 'm', norma: `${NBR6122}; H ≤ 1,8 m (a confirmar)`, aConfirmar: true, entradas: { H: res.H, Hmax: p.tbHmax, L } });
  if (Math.hypot(inp.Hx ?? 0, inp.Hy ?? 0) > 0) E('detalhamento', t, { descricao: 'Carga horizontal não verificada (empuxo passivo do fuste não calculado); armadura de ligação no topo não calculada', formula: '—', expressao: res.messages.join(' '), resultado: 'não verificada', unidade: '', norma: NBR6122, aConfirmar: true, entradas: { Hx: inp.Hx ?? 0, Hy: inp.Hy ?? 0 } });
  E('detalhamento', 'Situação', { descricao: 'Tubulão atende às verificações', formula: 'verificações', expressao: res.messages.join(' ') || 'sem mensagens', resultado: 'atende', unidade: '', entradas: {} });
}
