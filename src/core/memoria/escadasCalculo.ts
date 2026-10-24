// Memória detalhada (MD fase 6): escadas, parte do cálculo (casca de cada lance, E4c). Cargas por trecho (G e Q), modelo, apoios,
// equilíbrio, reações e as reações como cargas lineares aplicadas à estrutura. A análise das escadas roda dentro de
// `analisarEdificio` (antes de a memória ser ligada); por isso o registro é feito a partir do `ResultadoEscadas` já calculado,
// com os mesmos números (nada é recalculado além das somas auxiliares, refeitas pelas mesmas fórmulas). A memória da armadura
// de cada lance (esforços por faixa, flexão, cortante, fissuração, flecha, barras) está em `escadasArmadura.ts`.
import { cargasDasEscadas, NU, type ResultadoEscadas, type ResultadoLance } from '../building/escadasCalculo';
import { gamas } from '../building/materiais';
import type { BuildingModel } from '../building/types';
import { fm, fp, type Registrador, type ValorMemoria } from './registrador';

type Chave = Omit<Parameters<Registrador['passo']>[0], 'elemento' | 'etapa' | 'topico'>;
const NBR = 'NBR 6118:2023';

/** Nome do elemento da memória: "Escada E1 · Lance 1". */
export const elementoLance = (l: { nome: string; lance: number }) => `Escada ${l.nome} · Lance ${l.lance}`;

type Pt = [number, number];
/** Área do polígono em planta (fórmula do laço). */
export function areaPoligono(c: Pt[]): number {
  let a = 0;
  for (let i = 0; i < c.length; i++) { const j = (i + 1) % c.length; a += c[i][0] * c[j][1] - c[j][0] * c[i][1]; }
  return Math.abs(a) / 2;
}
/** Comprimento 3D do lado a→b de um retângulo do lance (cantos em planta e cota). */
export const comprimento3D = (c: Pt[], z: number[], a: number, b: number) => Math.hypot(c[b][0] - c[a][0], c[b][1] - c[a][1], z[b] - z[a]);

/** Parcelas da carga total de um caso: trechos (q·A), faixas de degraus (q·A) e corrimão (w/2·Σℓ das duas bordas inclinadas). */
export function parcelasCarga(l: ResultadoLance): { caso: 'G' | 'Q'; chave: string; valor: number; entradas: Record<string, number> }[] {
  const d = l.descricao;
  if (!d) return [];
  const out: { caso: 'G' | 'Q'; chave: string; valor: number; entradas: Record<string, number> }[] = [];
  d.rets.forEach((r) => {
    const rot = `${r.tipo === 'lance' ? 'L' : 'P'}${r.trecho + 1}`, A = areaPoligono(r.c);
    const ent: Record<string, number> = { permanente: r.permanente, area: A };
    let G = r.permanente * A;
    r.faixas.forEach((f, k) => { const Af = areaPoligono(f.poligono); ent[`faixa${k + 1}_permanente`] = f.permanente; ent[`faixa${k + 1}_area`] = Af; G += f.permanente * Af; });
    out.push({ caso: 'G', chave: rot, valor: G, entradas: ent });
    out.push({ caso: 'Q', chave: rot, valor: r.sobrecarga * A, entradas: { sobrecarga: r.sobrecarga, area: A } });
    if (r.tipo === 'lance' && d.corrimao > 0) {
      const L1 = comprimento3D(r.c, r.z, 0, 1), L2 = comprimento3D(r.c, r.z, 3, 2);
      out.push({ caso: 'G', chave: `${rot} corrimão`, valor: (d.corrimao / 2) * L1 + (d.corrimao / 2) * L2, entradas: { corrimao: d.corrimao, L1, L2 } });
    }
  });
  return out;
}

/** Registra o cálculo de todos os lances (E4c) de uma obra. Só os elementos aceitos pelo filtro. */
export function registrarEscadasCalculo(mem: Registrador, b: BuildingModel, res: ResultadoEscadas): void {
  const gm = gamas(b);
  for (const l of res.lances) {
    const el = elementoLance(l);
    if (!mem.aceita(el)) continue;
    registrarLanceCalculo(mem, el, l, gm);
  }
  for (const c of cargasDasEscadas(res)) {
    const l = res.lances.find((x) => x.escada === c.escada!.escada && x.lance === c.escada!.lance);
    if (!l) continue;
    const el = elementoLance(l);
    if (!mem.aceita(el)) continue;
    const src = l.cargas.find((x) => x.apoio === c.escada!.apoio && x.caso === c.caso && x.grupo === c.grupo);
    if (!src) continue;
    mem.passo({ etapa: 'cargas', elemento: el, topico: 'Cargas aplicadas à estrutura', descricao: `Carga ${c.tipo === 'linha' ? 'linear' : 'de superfície'} do caso ${c.caso} no grupo ${c.grupo} (${src.rotulo}); instâncias iguais da escada valem o maior valor e a carga é gravada com 6 casas`, formula: 'q aplicada = arredondar(q do lance; 6 casas)', expressao: `q = ${fm(src.valor, 7)} → ${fm(c.valor, 7)} ${c.tipo === 'linha' ? 'kN/m' : 'kN/m²'}`, resultado: c.valor, unidade: c.tipo === 'linha' ? 'kN/m' : 'kN/m²', norma: 'Critério do programa', entradas: { valorLance: src.valor, grupo: c.grupo, caso: c.caso, apoio: c.escada!.apoio } });
  }
}

function registrarLanceCalculo(mem: Registrador, el: string, l: ResultadoLance, gm: { g: number; q: number }) {
  const C = (p: Chave & { topico: string }) => mem.passo({ etapa: 'cargas', elemento: el, ...p });
  const A = (p: Chave & { topico: string }) => mem.passo({ etapa: 'analise', elemento: el, ...p });
  const E = (p: Chave & { topico: string }) => mem.passo({ etapa: 'esforcos', elemento: el, ...p });
  if (l.erro) { A({ topico: 'Modelo do lance', descricao: 'O cálculo do lance falhou; não há resultados', formula: '—', expressao: l.erro, resultado: l.erro, unidade: '', entradas: {} }); return; }
  // ---- modelo
  A({ topico: 'Modelo do lance', descricao: `Lance ${l.lance} da escada ${l.nome}${l.pavimento ? ` (${l.pavimento}${l.pavimentoTopo ? ` → ${l.pavimentoTopo}` : ''})` : ''}: casca espessa de 6 nós por triângulo (um modelo independente por lance, só os casos G e Q), espessura da laje, concreto de Ecs das lajes`, formula: 'K·u = F (casca espessa, E = Ecs, ν = 0,2)', expressao: `h = ${fm(l.espessura)} m; E = ${fm(l.E)} kN/m²; ν = ${fm(NU)}; malha ${fm(l.malha)} m → ${l.nos} nós, ${l.elementos} elementos, ${l.gdl} gdl`, resultado: l.gdl, unidade: 'gdl', norma: `${NBR}, 8.2.8 e 14.7`, entradas: { h: l.espessura, E: l.E, nu: NU, malha: l.malha, nos: l.nos, elementos: l.elementos, gdl: l.gdl } });
  // ---- cargas por trecho
  const parc = parcelasCarga(l);
  for (const p of parc) {
    const ehCorr = p.chave.endsWith('corrimão'), q = p.caso === 'G' ? 'permanente' : 'sobrecarga';
    if (ehCorr) {
      C({ topico: 'Cargas do lance', descricao: `Corrimão no trecho ${p.chave.split(' ')[0]}: metade da carga linear em cada borda lateral inclinada`, formula: 'G = (w/2)·ℓ1 + (w/2)·ℓ2', expressao: `G = ${fm(p.entradas.corrimao / 2)}·${fm(p.entradas.L1)} + ${fm(p.entradas.corrimao / 2)}·${fm(p.entradas.L2)} = ${fm(p.valor)} kN`, resultado: p.valor, unidade: 'kN', norma: 'NBR 6120:2019', entradas: p.entradas });
    } else if (p.caso === 'G') {
      const fx = Object.keys(p.entradas).filter((k) => k.endsWith('_area')).map((k) => k.slice(0, -5));
      C({ topico: 'Cargas do lance', descricao: `Carga permanente do trecho ${p.chave} (peso próprio, degraus, revestimento e demais permanentes por m² de projeção horizontal)${fx.length ? ' e faixas de degraus do patamar' : ''}`, formula: fx.length ? 'G = g·A + Σ gf·Af' : 'G = g·A', expressao: `G = ${fm(p.entradas.permanente)}·${fm(p.entradas.area)}${fx.map((f) => ` + ${fm(p.entradas[`${f}_permanente`])}·${fm(p.entradas[`${f}_area`])}`).join('')} = ${fm(p.valor)} kN`, resultado: p.valor, unidade: 'kN', norma: 'NBR 6120:2019', entradas: p.entradas });
    } else {
      C({ topico: 'Cargas do lance', descricao: `Sobrecarga de uso do trecho ${p.chave}`, formula: 'Q = q·A', expressao: `Q = ${fm(p.entradas[q])}·${fm(p.entradas.area)} = ${fm(p.valor)} kN`, resultado: p.valor, unidade: 'kN', norma: 'NBR 6120:2019, Tabela 10', entradas: p.entradas });
    }
  }
  for (const cn of ['G', 'Q'] as const) {
    const ps = parc.filter((p) => p.caso === cn), ent: Record<string, ValorMemoria> = {};
    ps.forEach((p, k) => { ent[`parcela${k + 1}`] = p.valor; });
    C({ topico: 'Cargas do lance', descricao: `Carga vertical total do caso ${cn} aplicada ao lance (forças nodais consistentes)`, formula: `${cn} = Σ parcelas`, expressao: `${cn} = ${ps.map((p) => fp(p.valor)).join(' + ') || '0'} = ${fm(l.carga[cn])} kN`, resultado: l.carga[cn], unidade: 'kN', entradas: ent });
  }
  // ---- apoios
  for (const ap of l.apoios) {
    if (ap.rigido) A({ topico: 'Apoios', descricao: `${ap.rotulo}: apoio vertical rígido (restrição exata do gdl vertical${ap.id === 'inf' ? ' e da translação na direção do primeiro trecho' : ''}); comprimento ${fm(ap.comprimento)} m`, formula: 'u_z = 0 na borda', expressao: `ℓ = ${fm(ap.comprimento)} m`, resultado: ap.comprimento, unidade: 'm', norma: 'Critério do programa (a confirmar)', aConfirmar: true, entradas: { comprimento: ap.comprimento } });
    else if (ap.kLinha !== undefined && ap.modulo !== undefined && ap.largura !== undefined && ap.altura !== undefined) A({ topico: 'Apoios', descricao: `${ap.rotulo}: apoio elástico vertical contínuo (parede ou tirante entre a borda do patamar e o piso)`, formula: "k′ = E·largura / altura", expressao: `k′ = ${fm(ap.modulo)}·${fm(ap.largura)} / ${fm(ap.altura)} = ${fm(ap.kLinha)} kN/m por m`, resultado: ap.kLinha, unidade: 'kN/m/m', norma: 'Critério do programa (a confirmar)', aConfirmar: true, entradas: { E: ap.modulo, largura: ap.largura, altura: ap.altura, comprimento: ap.comprimento } });
  }
  // ---- equilíbrio, deslocamentos e reações
  for (const cn of ['G', 'Q'] as const) {
    const soma = l.apoios.reduce((t, a) => t + a.reacao[cn], 0);
    A({ topico: 'Equilíbrio e deslocamentos', descricao: `Equilíbrio vertical do caso ${cn}: soma das reações dos apoios contra a carga aplicada`, formula: 'erro = ΣR / carga − 1', expressao: `erro = ${fm(soma)} / ${fm(l.carga[cn])} − 1 = ${fm(l.equilibrio[cn], 3)}`, resultado: l.equilibrio[cn], unidade: '', entradas: { somaReacoes: soma, carga: l.carga[cn] } });
    A({ topico: 'Equilíbrio e deslocamentos', descricao: `Maior deslocamento vertical para baixo do caso ${cn} (resultado do cálculo por casca)`, formula: 'máx(−u_z)', expressao: `u = ${fm(l.deslocamento[cn] * 1000)} mm`, resultado: l.deslocamento[cn], unidade: 'm', entradas: {} });
  }
  for (const ap of l.apoios) for (const cn of ['G', 'Q'] as const) {
    A({ topico: 'Reações dos apoios', descricao: `Reação vertical total de ${ap.rotulo}, caso ${cn} (positiva = a escada empurra o apoio para baixo); resultante horizontal ${fm(ap.horizontal[cn])} kN (não transmitida)`, formula: ap.rigido ? 'R = Σ reações nodais do apoio' : 'R = Σ k′·peso do nó·(−u_z)', expressao: `R = ${fm(ap.reacao[cn])} kN`, resultado: ap.reacao[cn], unidade: 'kN', entradas: { horizontal: ap.horizontal[cn] } });
  }
  // ---- envoltória dos momentos
  const mo = l.momentos;
  E({ topico: 'Envoltória dos momentos do lance', descricao: 'Momentos de cálculo extremos dos elementos de casca (eixos locais; x no sentido da subida): γg·G + γq·Q e γg·G, sem Wood-Armer', formula: 'Mx,y = máx/mín(γg·Gm + γq·máx(0; Qm); γg·Gm + γq·mín(0; Qm))', expressao: `Mx: ${fm(mo.MxPos)} / ${fm(mo.MxNeg)}; My: ${fm(mo.MyPos)} / ${fm(mo.MyNeg)}; |Mxy|máx = ${fm(mo.Mxy)} kN·m/m; Qmáx = ${fm(mo.Qmax)} kN/m`, resultado: mo.MxPos, unidade: 'kN·m/m', norma: 'NBR 8681:2003, 5.1.3', entradas: { gg: gm.g, gq: gm.q, MxPos: mo.MxPos, MxNeg: mo.MxNeg, MyPos: mo.MyPos, MyNeg: mo.MyNeg, Mxy: mo.Mxy, Qmax: mo.Qmax } });
  // ---- reações como cargas lineares
  for (const ap of l.apoios) for (const cn of ['G', 'Q'] as const) {
    const q = ap.porMetro[cn], pp = cn === 'G' ? ap.pesoProprio : 0;
    C({ topico: 'Reações como cargas lineares', descricao: `${ap.rotulo}, caso ${cn}: reação por metro da borda${cn === 'G' && pp ? ' mais o peso próprio da parede ou do tirante' : ''}${ap.grupo ? `; aplicada ao grupo ${ap.grupo}` : ''}`, formula: cn === 'G' ? 'q = R/ℓ + pp' : 'q = R/ℓ', expressao: `q = ${fm(ap.reacao[cn])} / ${fm(ap.comprimento)}${cn === 'G' ? ` + ${fm(pp)}` : ''} = ${fm(q)} kN/m`, resultado: q, unidade: 'kN/m', norma: 'Critério do programa (a confirmar)', aConfirmar: true, entradas: { R: ap.reacao[cn], comprimento: ap.comprimento, pesoProprio: pp } });
  }
}
