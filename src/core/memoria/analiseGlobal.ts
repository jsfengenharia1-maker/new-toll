// Memória detalhada (MD fase 9): análise global do edifício em detalhe. Vento pela NBR 6123 (V0, S1, S2, S3, Vk, q, Ca,
// área de exposição e força por pavimento, zona e direção, torção da excentricidade), estabilidade global γz com M1,tot e
// ΔMtot,d por pavimento (rigidez reduzida usada), P-Δ por iteração (correção, deslocamento e convergência) e o desaprumo
// global. Os valores vêm dos intermediários que a análise já guarda (`ForcaPavimento.det`, `GamaZEdificio.det`,
// `segundaOrdem.combinacoes[].historico`): nada é recalculado aqui além das somas registradas.
import type { AnaliseEdificio } from '../building/analitico';
import { FR, S2_PARAM, classeVento } from '../building/vento';
import { VENTO_PADRAO, type BuildingModel } from '../building/types';
import { fm, type Registrador } from './registrador';

const GLOBAL = 'Edifício';
type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;

export function registrarAnaliseGlobal(reg: Registrador, b: BuildingModel, an: AnaliseEdificio) {
  if (!reg.aceita(GLOBAL)) return;
  registrarVento(reg, b, an);
  registrarGamaZ(reg, an);
  registrarPDelta(reg, an);
  registrarDesaprumo(reg, an);
}

function registrarVento(reg: Registrador, b: BuildingModel, an: AnaliseEdificio) {
  const ven = an.vento;
  if (!ven || !ven.casos.length) return;
  const v = b.vento ?? VENTO_PADRAO, norma = 'NBR 6123:1988';
  const P = (topico: string, etapa: 'cargas' | 'analise', p: Chave) => reg.passo({ etapa, elemento: GLOBAL, topico, norma, ...p });
  const T1 = 'Vento – parâmetros';
  P(T1, 'cargas', { descricao: 'Velocidade básica do vento', formula: 'V0', expressao: `V0 = ${fm(v.v0)} m/s`, resultado: v.v0, unidade: 'm/s', aConfirmar: true, entradas: {}, observacao: 'Isopletas da NBR 6123 (Figura 1): valor informado pelo usuário; confirmar para a localidade.' });
  P(T1, 'cargas', { descricao: 'Fator topográfico', formula: 'S1', expressao: `S1 = ${fm(v.s1)}`, resultado: v.s1, unidade: '', entradas: {} });
  P(T1, 'cargas', { descricao: 'Fator estatístico', formula: 'S3', expressao: `S3 = ${fm(v.s3)}`, resultado: v.s3, unidade: '', entradas: {} });
  const k = ['A', 'B', 'C'].indexOf(ven.classe), par = S2_PARAM[v.categoria];
  P(T1, 'cargas', { descricao: `Categoria de rugosidade ${v.categoria} e classe ${ven.classe} da edificação (maior dimensão entre a altura ${fm(ven.altura)} m e as dimensões em planta: A até 20 m; B até 50 m; C acima)`, formula: 'classe = f(maior dimensão); S2 = b·Fr·(z/10)^p', expressao: `categoria ${v.categoria}: b = ${fm(par.b)}; Fr = ${fm(FR[k])}; p = ${fm(par.p[k])}`, resultado: ven.classe, unidade: '', norma: `${norma}, 5.3 (Tabela 1)`, aConfirmar: true, entradas: { b: par.b, Fr: FR[k], p: par.p[k], H: ven.altura, classeDaAltura: classeVento(ven.altura) }, observacao: 'Valores b, Fr e p da Tabela 1 a confirmar na norma; a classe depende também da maior dimensão em planta.' });
  const ca = ven.ca, viz = ven.viz;
  if (ca) P(T1, 'cargas', { descricao: `Coeficiente de arrasto${ca.auto ? ' (do ábaco digitado)' : ' (informado)'}`, formula: 'Ca,x; Ca,y', expressao: `Ca,x = ${fm(ca.x)}; Ca,y = ${fm(ca.y)}`, resultado: ca.x, unidade: '', norma: `${norma}, 6.3`, aConfirmar: true, entradas: { caX: ca.x, caY: ca.y } });
  if (viz) P(T1, 'cargas', { descricao: `Fator de vizinhança${viz.auto ? ' (do ábaco digitado)' : ' (informado)'}`, formula: 'fv,x; fv,y', expressao: `fv,x = ${fm(viz.x)}; fv,y = ${fm(viz.y)}`, resultado: viz.x, unidade: '', norma: `${norma}, 6.4`, aConfirmar: true, entradas: { vizX: viz.x, vizY: viz.y } });
  P(T1, 'cargas', { descricao: 'Excentricidade da força e platibanda', formula: 'e = a·b (item 6.6); platibanda somada à faixa do último pavimento', expressao: `e = ${fm(v.excentricidade)}·largura; platibanda = ${fm(v.platibanda ?? 0)} m`, resultado: v.excentricidade, unidade: '', norma: `${norma}, 6.6`, entradas: { excentricidade: v.excentricidade, platibanda: v.platibanda ?? 0 } });

  // S2, Vk e q dependem só da altura: registrados uma vez por pavimento (do primeiro caso)
  const base = ven.casos.find((c) => c.exc === 0) ?? ven.casos[0];
  const T2 = 'Vento – S2, Vk e pressão dinâmica por pavimento';
  const vistos = new Set<string>();
  for (const f of base.forcas) {
    if (vistos.has(f.pavimento)) continue;
    vistos.add(f.pavimento);
    const pv = f.pavimento;
    P(T2, 'cargas', { descricao: `${pv} (z = ${fm(f.z)} m): fator S2 (rugosidade, dimensões e altura)`, formula: 'S2 = b·Fr·(z/10)^p', expressao: `S2 = ${fm(par.b)}·${fm(FR[k])}·(${fm(f.z)}/10)^${fm(par.p[k])} = ${fm(f.s2)}`, resultado: f.s2, unidade: '', norma: `${norma}, 5.3 (Tabela 1)`, aConfirmar: true, entradas: { b: par.b, Fr: FR[k], z: f.z, p: par.p[k] } });
    P(T2, 'cargas', { descricao: `${pv}: velocidade característica`, formula: 'Vk = V0·S1·S2·S3', expressao: `Vk = ${fm(v.v0)}·${fm(v.s1)}·${fm(f.s2)}·${fm(v.s3)} = ${fm(f.vk)} m/s`, resultado: f.vk, unidade: 'm/s', norma: `${norma}, 4.2`, entradas: { V0: v.v0, S1: v.s1, S2: f.s2, S3: v.s3 } });
    P(T2, 'cargas', { descricao: `${pv}: pressão dinâmica`, formula: 'q = 0,613·Vk² (N/m²) → kN/m²', expressao: `q = 0,613·${fm(f.vk)}²/1000 = ${fm(f.q)} kN/m²`, resultado: f.q, unidade: 'kN/m²', norma: `${norma}, 4.2`, entradas: { Vk: f.vk } });
  }

  // força por pavimento e zona, por direção (exc = 0); torção das excentricidades
  for (const cv of ven.casos) {
    const T3 = `Vento – forças por pavimento (${cv.nome})`;
    const sinal = cv.direcao === 0 || cv.direcao === 90 ? 1 : -1, emX = cv.direcao === 0 || cv.direcao === 180;
    const vf = new Set<string>();
    for (const f of cv.forcas) {
      const d = f.det;
      if (!d) continue;
      const pv = `${f.pavimento}${d.nz > 1 ? ` · zona ${f.zona + 1}` : ''}`;
      if (cv.exc === 0) {
        if (!vf.has(f.pavimento)) {
          vf.add(f.pavimento);
          P(T3, 'cargas', { descricao: `${f.pavimento}: largura corrigida pela platibanda (fachada ${fm(d.larguraPav)} m; faixa de exposição h/2 = ${fm(d.hPav / 2)} m)`, formula: "b′ = b·(2a + h)/h (a > 0); senão b′ = b", expressao: `b′ = ${fm(d.larguraCorrigidaPav)} m`, resultado: d.larguraCorrigidaPav, unidade: 'm', entradas: { b: d.larguraPav, a: d.plat, h: d.hPav } });
          P(T3, 'cargas', { descricao: `${f.pavimento}: área de exposição`, formula: 'Ae = b′·h/2', expressao: `Ae = ${fm(d.larguraCorrigidaPav)}·${fm(d.hPav)}/2 = ${fm(d.larguraCorrigidaPav * d.hPav / 2)} m²`, resultado: d.larguraCorrigidaPav * d.hPav / 2, unidade: 'm²', entradas: { bCorr: d.larguraCorrigidaPav, h: d.hPav } });
          P(T3, 'cargas', { descricao: `${f.pavimento}: força de arrasto do pavimento (${cv.direcao}°)`, formula: 'F = Ca·fv·fsentido·q·Ae', expressao: `F = ${fm(d.ca)}·${fm(d.viz)}·${fm(d.sent)}·${fm(f.q)}·${fm(d.larguraCorrigidaPav * d.hPav / 2)} = ${fm(d.Fpav)} kN`, resultado: d.Fpav, unidade: 'kN', norma: 'NBR 6123:1988, 4.2 e 6.3', entradas: { Ca: d.ca, fv: d.viz, fsentido: d.sent, q: f.q, Ae: d.larguraCorrigidaPav * d.hPav / 2 } });
        }
        if (d.nz > 1) P(T3, 'cargas', { descricao: `${pv}: parcela da zona (repartição pela largura perpendicular ao vento)`, formula: 'Fi = F·bi/Σb; sentido do eixo', expressao: `F = ${fm(sinal)}·${fm(d.Fpav)}·${fm(d.bz)}/${fm(d.sb)} = ${fm(f.F)} kN`, resultado: f.F, unidade: 'kN', entradas: { sinal, F: d.Fpav, bi: d.bz, sb: d.sb, nz: d.nz } });
        else P(T3, 'cargas', { descricao: `${pv}: força aplicada ao diafragma (${cv.direcao}°), z = ${fm(f.z)} m`, formula: 'F (com o sentido do eixo)', expressao: `F = ${fm(sinal)}·${fm(d.Fpav)} = ${fm(f.F)} kN`, resultado: f.F, unidade: 'kN', entradas: { sinal, F: d.Fpav, nz: 1 } });
      } else {
        P(T3, 'cargas', { descricao: `${pv}: linha de ação com excentricidade ${cv.exc > 0 ? '+' : '−'}e e momento de torção em relação ao ponto de aplicação`, formula: emX ? 'linha = meio + exc·e·largura; Mz = −(linha − cy)·F' : 'linha = meio + exc·e·largura; Mz = (linha − cx)·F', expressao: `linha = ${fm(d.meio)} + ${fm(cv.exc)}·${fm(d.exc)}·${fm(d.largRef)} = ${fm(d.linha)} m; Mz = ${fm(f.Mz)} kN·m`, resultado: f.Mz, unidade: 'kN·m', norma: 'NBR 6123:1988, 6.6', entradas: { meio: d.meio, exc: cv.exc, e: d.exc, largura: d.largRef, c: emX ? d.cy : d.cx, F: f.F, emX: emX ? 1 : 0 } });
      }
    }
    if (cv.exc === 0) {
      const tot = cv.forcas.reduce((t, f) => t + f.F, 0), M = cv.forcas.reduce((t, f) => t + Math.abs(f.F) * f.z, 0);
      const ent: Record<string, number> = { M1: M };
      cv.forcas.forEach((f, i) => { ent[`F${i}`] = f.F; ent[`z${i}`] = f.z; });
      P(T3, 'cargas', { descricao: `Resultante e momento de tombamento na base do vento ${cv.direcao}°`, formula: 'ΣF; M1 = Σ|F|·z', expressao: `ΣF = ${fm(tot)} kN; M1 = ${cv.forcas.map((f) => `${fm(Math.abs(f.F))}·${fm(f.z)}`).join(' + ') || '0'} = ${fm(M)} kN·m`, resultado: M, unidade: 'kN·m', entradas: ent });
    }
  }
}

function registrarGamaZ(reg: Registrador, an: AnaliseEdificio) {
  const ven = an.vento;
  if (!ven) return;
  const norma = 'NBR 6118:2023, 15.5.3 e 15.7.2';
  const P = (topico: string, p: Chave) => reg.passo({ etapa: 'analise', elemento: GLOBAL, topico, norma, ...p });
  const TR = 'Estabilidade global (γz) – rigidez reduzida';
  for (const r of ven.rigidez ?? []) {
    const kk = r.kEciMin === r.kEciMax ? fm(r.kEciMin) : `${fm(r.kEciMin)} a ${fm(r.kEciMax)}`;
    P(TR, { descricao: `Barras de ${r.tipo} (${r.barras}): rigidez à flexão reduzida`, formula: '(EI)sec = fator·Eci·Ic; E e G da barra × Eci/Ecs', expressao: `fator = ${fm(r.fator)}; Eci/Ecs = ${kk}`, resultado: r.fator, unidade: '', norma: 'NBR 6118:2023, 15.7.3', aConfirmar: r.tipo !== 'pilar' && r.tipo !== 'viga', entradas: { fator: r.fator, kEciMin: r.kEciMin, kEciMax: r.kEciMax, barras: r.barras }, observacao: r.tipo === 'laje' ? 'Lajes do modelo integrado: 0,3·Eci·Ic (a confirmar).' : undefined });
  }
  for (const gz of ven.gamaZ) {
    const d = gz.det;
    const T = `Estabilidade global (γz) – vento a ${gz.direcao}°`;
    if (!d) continue;
    // M1,tot (momento de tombamento do vento na base)
    const cv = ven.casos.find((c) => c.nome === d.caso);
    const porPav = new Map<string, number[]>();
    for (const f of cv?.forcas ?? []) (porPav.get(f.pavimento) ?? porPav.set(f.pavimento, []).get(f.pavimento)!).push(Math.abs(f.F) * f.z);
    let somaM = 0;
    for (const [pv, ms] of porPav) {
      const m = ms.reduce((t, x) => t + x, 0);
      somaM += m;
      const ent: Record<string, number> = {};
      (cv?.forcas ?? []).filter((f) => f.pavimento === pv).forEach((f, i) => { ent[`F${i}`] = f.F; ent[`z${i}`] = f.z; });
      P(T, { descricao: `${pv}: contribuição ao momento de tombamento`, formula: 'M1,pav = Σ |F|·z', expressao: `M1,${pv} = ${fm(m)} kN·m`, resultado: m, unidade: 'kN·m', entradas: ent });
    }
    P(T, { descricao: 'Momento de tombamento característico do vento na base (1ª ordem)', formula: 'M1,tot,k = Σ M1,pav', expressao: `M1,k = ${fm(somaM)} kN·m`, resultado: d.M1, unidade: 'kN·m', entradas: { soma: somaM }, observacao: 'Forças características do vento (sem γf); os valores de cálculo vêm a seguir.' });
    // 15.5.3: M1,tot,d e ΔMtot,d de cálculo, da mesma combinação (γf do vento coerente com as verticais)
    const fV = d.gq, fU = d.gq * d.psiW;
    P(T, { descricao: 'M1,tot,d com o vento como ação variável principal', formula: 'M1,tot,d = γq·M1,tot,k', expressao: `M1,tot,d = ${fm(fV)}·${fm(d.M1)} = ${fm(d.M1dV)} kN·m`, resultado: d.M1dV, unidade: 'kN·m', entradas: { fW: fV, M1: d.M1 }, observacao: 'NBR 6118:2023, 15.5.3: valor de cálculo (γf do vento da combinação).' });
    P(T, { descricao: 'M1,tot,d com o uso (sobrecarga) como ação variável principal (vento acompanhante)', formula: 'M1,tot,d = γq·ψ0,w·M1,tot,k', expressao: `M1,tot,d = ${fm(d.gq)}·${fm(d.psiW)}·${fm(d.M1)} = ${fm(d.M1dU)} kN·m`, resultado: d.M1dU, unidade: 'kN·m', entradas: { fW: fU, M1: d.M1 }, observacao: 'Vento acompanhante com ψ0 = 0,6.' });
    // ΔMtot,d com o vento principal e com o uso principal
    for (const pav of d.pavimentos) {
      const aV = (d.gg * pav.G + d.gq * pav.Qpsi) * fV * pav.d, aU = (d.gg * pav.G + d.gq * pav.Q) * fU * pav.d;
      P(T, { descricao: `${pav.pavimento} (cota ${fm(pav.z)} m): deslocamento horizontal do vento característico d = ${fm(pav.d * 1000)} mm (média dos nós dos pilares ponderada pelas reações verticais, rigidez reduzida) e parcela de ΔM`, formula: 'ΔM,pav = (γg·G + γq·Σψ0·Q)·fW·d (vento principal, fW = γq); (γg·G + γq·Q)·fW·d (uso principal, fW = γq·ψ0,w)', expressao: `ΔM,vento = (${fm(d.gg)}·${fm(pav.G)} + ${fm(d.gq)}·${fm(pav.Qpsi)})·${fm(fV)}·${fm(pav.d)} = ${fm(aV)} kN·m; ΔM,uso = (${fm(d.gg)}·${fm(pav.G)} + ${fm(d.gq)}·${fm(pav.Q)})·${fm(fU)}·${fm(pav.d)} = ${fm(aU)} kN·m`, resultado: aV, unidade: 'kN·m', entradas: { gg: d.gg, gq: d.gq, G: pav.G, Q: pav.Q, Qpsi: pav.Qpsi, d: pav.d, fWV: fV, fWU: fU, aUso: aU }, observacao: 'Verticais e deslocamento do vento ponderados pelos mesmos γf da combinação (o deslocamento de 1ª ordem é linear no vento): ΔMtot,d e M1,tot,d de cálculo (15.5.3).' });
    }
    const sumV = d.pavimentos.reduce((t, p) => t + (d.gg * p.G + d.gq * p.Qpsi) * fV * p.d, 0), sumU = d.pavimentos.reduce((t, p) => t + (d.gg * p.G + d.gq * p.Q) * fU * p.d, 0);
    P(T, { descricao: 'Acréscimo de momento ΔMtot,d com o vento como ação variável principal', formula: 'ΔMtot,d = Σ ΔM,pav', expressao: `ΔM = ${fm(d.dV)} kN·m`, resultado: d.dV, unidade: 'kN·m', entradas: { soma: sumV } });
    P(T, { descricao: 'Acréscimo de momento ΔMtot,d com o uso (sobrecarga) como ação variável principal', formula: 'ΔMtot,d = Σ ΔM,pav', expressao: `ΔM = ${fm(d.dU)} kN·m`, resultado: d.dU, unidade: 'kN·m', entradas: { soma: sumU } });
    P(T, { descricao: 'γz com o vento principal', formula: 'γz = 1/(1 − ΔMtot,d/M1,tot,d)', expressao: `γz = 1/(1 − ${fm(d.dV)}/${fm(d.M1dV)}) = ${fm(gz.ventoPrincipal)}`, resultado: gz.ventoPrincipal, unidade: '', entradas: { M1: d.M1dV, dM: d.dV } });
    P(T, { descricao: 'γz com o uso principal', formula: 'γz = 1/(1 − ΔMtot,d/M1,tot,d)', expressao: `γz = 1/(1 − ${fm(d.dU)}/${fm(d.M1dU)}) = ${fm(gz.usoPrincipal)}`, resultado: gz.usoPrincipal, unidade: '', entradas: { M1: d.M1dU, dM: d.dU } });
    P(T, { descricao: `γz da direção e ampliação do vento nas combinações ELU${gz.max > 1.1 ? ' (nós móveis: 0,95·γz)' : ' (nós fixos: sem ampliação)'}`, formula: 'γz = máx(γz,vento; γz,uso); amp = 0,95·γz se γz > 1,1', expressao: `γz = máx(${fm(gz.ventoPrincipal)}; ${fm(gz.usoPrincipal)}) = ${fm(gz.max)}; ampliação = ${fm(gz.ampliacao)}`, resultado: gz.max, unidade: '', entradas: { ventoPrincipal: gz.ventoPrincipal, usoPrincipal: gz.usoPrincipal, ampliacao: gz.ampliacao, limite: 1.1 } });
  }
}

function registrarPDelta(reg: Registrador, an: AnaliseEdificio) {
  const so = an.segundaOrdem;
  if (!so) return;
  const P = (topico: string, p: Chave) => reg.passo({ etapa: 'analise', elemento: GLOBAL, topico, norma: 'NBR 6118:2023, 15.7.3 (P-Δ)', aConfirmar: true, ...p });
  P('2ª ordem global (P-Δ) – método', { descricao: 'Iteração de ponto fixo: u ← u1 + K⁻¹·(−KG(N)·u), N ← N1 + N(u − u1), rigidez reduzida (as mesmas do γz); sem a ampliação 0,95·γz', formula: 'K·u = P − KG(N)·u', expressao: `${so.combinacoes.length} combinações ELU; critério Δu,máx ≤ 1e-5·|u|máx; máximo 50 iterações`, resultado: so.iteracoesMax, unidade: 'iterações', entradas: { tol: 1e-5, maxIter: 50, combinacoes: so.combinacoes.length } });
  for (const c of so.combinacoes) {
    const T = `2ª ordem global (P-Δ) – ${c.nome}`;
    c.historico?.forEach((h) => {
      P(T, { descricao: `Iteração ${h.iteracao}: maior correção, maior deslocamento e maior deslocamento horizontal`, formula: 'Δu = máx |u(k) − u(k−1)|; convergiu se Δu ≤ tol·|u|máx', expressao: `Δu = ${fm(h.du)}; |u|máx = ${fm(h.um)}; Δu/|u|máx = ${fm(h.um ? h.du / h.um : 0)} ${h.um && h.du <= 1e-5 * Math.max(h.um, 1e-12) ? '≤' : '>'} 1e-5; uh = ${fm(h.uh * 1000)} mm`, resultado: h.du, unidade: 'm', entradas: { iteracao: h.iteracao, du: h.du, um: h.um, uh: h.uh, tol: 1e-5 } });
    });
    P(T, { descricao: `Resultado: ${c.convergiu ? `convergiu em ${c.iteracoes} iterações` : `não convergiu${c.erro ? ` (${c.erro})` : ''}`}; amplificação dos deslocamentos horizontais`, formula: 'amplificação = uh(2ª ordem) / uh(1ª ordem)', expressao: `amplificação = ${fm((c.historico?.at(-1)?.uh ?? 0) * 1000)} / ${fm((c.uh1 ?? 0) * 1000)} = ${fm(c.amplificacao)}`, resultado: c.amplificacao, unidade: '', entradas: { uh2: c.historico?.at(-1)?.uh ?? 0, uh1: c.uh1 ?? 0, iteracoes: c.iteracoes, convergiu: c.convergiu ? 1 : 0 } });
  }
}

function registrarDesaprumo(reg: Registrador, an: AnaliseEdificio) {
  reg.passo({ etapa: 'analise', elemento: GLOBAL, topico: 'Desaprumo global (11.3.3.4.1)', descricao: 'Imperfeição geométrica global (θa) nas combinações ELU', formula: 'θ1 = 1/(100·√H), 1/300 ≤ θ1 ≤ 1/200; θa = θ1·√((1 + 1/n)/2); regra dos 30% do vento', expressao: 'não aplicado no módulo Edifícios', resultado: 'não aplicado', unidade: '', norma: 'NBR 6118:2023, 11.3.3.4.1', aConfirmar: true, entradas: { segundaOrdem: an.opcoes.segundaOrdem }, observacao: 'O módulo Edifícios considera a imperfeição local do lance de pilar (excentricidade acidental, 11.3.3.4.2/.3) e não o desaprumo global; a verificação do desaprumo global com a regra dos 30% do vento está implementada no módulo Pórtico 2D (memória do módulo, tópico "Desaprumo global"). Decisão do usuário pendente para o Edifício.' });
}
