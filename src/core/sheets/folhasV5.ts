// Folhas da V5: cargas especiais por caso e grupo (K1.11.62, a prancha de cargas que a E4e usa para as reações das
// escadas) e perspectiva axonométrica da estrutura 3D (K1.11.62, vista V1). Mesmos escritores das demais pranchas.
import type { AnaliseEdificio } from '../building/analitico';
import { combinacoesEdificio } from '../building/combinacoes';
import type { Dimensionamento } from '../building/dimensionamento';
import { classeDoCaso, legendaDeCargas } from '../resultados/cargasCaso';
import { bandas, encadear, extremos, faixaExibida, fmtIso, isolinhas, legenda, niveisAutomaticos, N_TOKENS_ISO } from '../resultados/bandas';
import { hipoteseDeCombinacao } from '../resultados/deformada';
import { campoDoPavimento, hipotesesDeLaje, infoGrandeza, pavimentosComMapa, type GrandezaIso } from '../resultados/isovalores';
import { contornoPilar, geometriaViga, lancesDoPilar, pavimentosDoGrupo, type BuildingModel, type Carga } from '../building/types';
import { eixosDaCamera, type V3 } from '../vista3d/camera';
import { construirCena } from '../vista3d/cena';
import { pontoInterno } from '../geom/faces';
import { areaArmacao, cfgArmacao, montarFolha, nf, plantaNaFolha, type BlocoTabela } from './armacao';
import { caixa, type Camada, type P, type Prancha, type Prim } from './prancha';
import type { OpcoesArmacao } from './armacaoVigas';
import { comEscadas, type ResultadoEscadas } from '../building/escadasCalculo';

/** Camada da carga: por natureza e, nos casos adicionais, a camada dos adicionais. */
export function camadaDaCarga(b: BuildingModel, caso: string): Camada {
  const c = classeDoCaso(b, caso);
  if (c.includes('adic')) return 'CARGA-ADIC';
  return ({ 'carga-caso-g': 'CARGA-G', 'carga-caso-q': 'CARGA-Q', 'carga-caso-w': 'CARGA-W', 'carga-caso-e': 'CARGA-E', 'carga-caso-h': 'CARGA-H' } as Record<string, Camada>)[c] ?? 'CARGA-Q';
}

const unidade = (c: Carga) => (c.tipo === 'ponto' ? 'kN' : c.tipo === 'linha' ? 'kN/m' : 'kN/m²');

/** Primitivas das cargas (ponto, linha e área), cada uma na camada da natureza do caso, com o valor e a unidade; `k` = m por mm do papel. */
export function primitivasCargas(b: BuildingModel, cargas: Carga[], k: number): Prim[] {
  const modelo: Prim[] = [];
  for (const c of cargas) {
    const cam = camadaDaCarga(b, c.caso), esc = c.escada ? b.escadas?.find((e) => e.id === c.escada!.escada)?.nome : undefined, txt = `${nf(c.valor, 2)} ${unidade(c)}${esc ? ` (${esc})` : ''}`;
    if (c.tipo === 'ponto') {
      const [x, y] = c.pontos[0];
      modelo.push({ t: 'circ', c: cam, centro: [x, y], r: 1.2 * k }, { t: 'pl', c: cam, pts: [[x - 1.2 * k, y], [x + 1.2 * k, y]] }, { t: 'pl', c: cam, pts: [[x, y - 1.2 * k], [x, y + 1.2 * k]] },
        { t: 'txt', c: cam, p: [x + 1.6 * k, y + 0.6 * k], h: 2 * k, s: txt });
    } else if (c.tipo === 'linha') {
      modelo.push({ t: 'pl', c: cam, pts: c.pontos });
      const i = Math.floor((c.pontos.length - 1) / 2), a = c.pontos[i], z = c.pontos[i + 1];
      let ang = (Math.atan2(z[1] - a[1], z[0] - a[0]) * 180) / Math.PI;
      if (ang > 90.01 || ang < -89.99) ang += ang > 0 ? -180 : 180;
      modelo.push({ t: 'txt', c: cam, p: [(a[0] + z[0]) / 2, (a[1] + z[1]) / 2 + 0.8 * k], h: 2 * k, s: txt, ang, ah: 'c' });
    } else {
      modelo.push({ t: 'pl', c: cam, pts: c.pontos, fechada: true });
      modelo.push({ t: 'txt', c: cam, p: pontoInterno(c.pontos), h: 2.2 * k, s: txt, ah: 'c', av: 'meio' });
    }
  }
  return modelo;
}

/** Uma prancha por grupo com cargas lançadas: planta fina da estrutura, cargas por caso (camada por natureza) e a tabela de casos. */
export function montarPranchasCargas(b0: BuildingModel, o: OpcoesArmacao & { escadas?: ResultadoEscadas } = {}): Prancha[] {
  // reações das escadas (E4e, C10.26): cargas lineares e de superfície derivadas do cálculo das escadas, nos casos G e Q do grupo que as recebe
  const b = o.escadas ? comEscadas(b0, o.escadas) : b0;
  const grupos = b.grupos.filter((g) => b.cargas.some((c) => c.grupo === g.id) && (!o.grupo || g.id === o.grupo || g.nome === o.grupo));
  const cfg = cfgArmacao(b);
  return grupos.map((g, ig) => {
    const cargas = b.cargas.filter((c) => c.grupo === g.id), pavs = pavimentosDoGrupo(b, g.id), ref = pavs[0];
    const pilares = b.pilares.filter((p) => ref && lancesDoPilar(b, p).some((x) => x.id === ref.id));
    const vigas = b.vigas.filter((v) => v.grupo === g.id), lajes = b.lajes.filter((l) => l.grupo === g.id);
    const geo: P[] = [...lajes.flatMap((l) => l.contorno), ...vigas.flatMap((v) => v.pontos), ...cargas.flatMap((c) => c.pontos), ...pilares.flatMap((p) => contornoPilar(p, p.secao))];
    const cx = caixa(geo.length ? geo : [[0, 0], [1, 1]]);
    const pl = plantaNaFolha(cx, b.prancha?.formato ?? 'auto', cfg.escalaLocacao || b.prancha?.escala || 0, 30);
    const k = pl.escala / 1000;
    const modelo: Prim[] = [];
    for (const l of lajes) modelo.push({ t: 'pl', c: 'LAJE', pts: l.contorno, fechada: true });
    for (const v of vigas) { const gv = geometriaViga(v); modelo.push({ t: 'pl', c: 'FORMA-FINA', pts: [...gv.esq, ...[...gv.dir].reverse()], fechada: true }); }
    for (const p of pilares) modelo.push({ t: 'pl', c: 'PILAR', pts: contornoPilar(p, p.secao), fechada: true });
    modelo.push(...primitivasCargas(b, cargas, k));
    const leg = legendaDeCargas(b, g.id);
    const tabela: BlocoTabela = {
      titulo: `CARGAS POR CASO — ${g.nome.toUpperCase()}`,
      cols: [{ w: 22, rot: 'CASO' }, { w: 16, rot: 'NATUREZA' }, { w: 16, rot: 'CARGAS' }, { w: 30, rot: 'CAMADA' }, { w: 30, rot: 'TOTAL (kN)' }],
      linhas: leg.map((e) => [e.nome, e.natureza, String(e.n), camadaDaCarga(b, e.caso), nf(cargas.filter((c) => c.caso === e.caso && c.tipo === 'ponto').reduce((t, c) => t + c.valor, 0))]),
    };
    // reações das escadas por apoio (E4e): carga transmitida em G e Q ao grupo, em kN/m (linhas) ou kN/m² (degraus iniciais)
    const dasEscadas = cargas.filter((c) => c.escada);
    const tEsc: BlocoTabela[] = dasEscadas.length ? [{
      titulo: 'REAÇÕES DAS ESCADAS NO GRUPO', cols: [{ w: 24, rot: 'ESCADA' }, { w: 18, rot: 'LANCE' }, { w: 56, rot: 'APOIO' }, { w: 22, rot: 'CASO' }, { w: 40, rot: 'CARGA' }],
      linhas: dasEscadas.map((c) => [b.escadas?.find((e) => e.id === c.escada!.escada)?.nome ?? c.escada!.escada, String(c.escada!.lance), c.escada!.apoio, b.casos?.find((x) => x.id === c.caso)?.nome ?? c.caso, `${nf(c.valor, 2)} ${unidade(c)}`]),
    }] : [];
    return montarFolha({
      b, formato: pl.formato, tipo: 'cargas', titulo: `Cargas — ${g.nome}`, conteudo: `CARGAS POR CASO — ${g.nome.toUpperCase()}`, escala: `1:${pl.escala}`, escalaNum: pl.escala, carimbo: o.carimbo, numero: ig + 1,
      desenho: [], tabelas: [tabela, ...tEsc], legenda: `ESCALA 1:${pl.escala} · cargas em kN, kN/m e kN/m² · total só das concentradas`, avisos: pl.avisos, modelo, janela: pl.janela, elementos: leg.map((e) => e.nome),
    } as Parameters<typeof montarFolha>[0]);
  });
}

/** Perspectiva axonométrica (projeção ortográfica) dos contornos da estrutura 3D, ajustada à área da folha A3. */
export function montarPranchaPerspectiva(b: BuildingModel, o: OpcoesArmacao & { azimute?: number; elevacao?: number } = {}): Prancha | null {
  const cena = construirCena(b);
  if (!cena.objetos.length) return null;
  const az = ((o.azimute ?? -55) * Math.PI) / 180, el = ((o.elevacao ?? 28) * Math.PI) / 180;
  const { direita, cima } = eixosDaCamera({ alvo: [0, 0, 0], dist: 1, azimute: az, elevacao: el, fov: 45, projecao: 'isometrica' });
  const dot = (a: V3, p: number[], i: number) => a[0] * p[i] + a[1] * p[i + 1] + a[2] * p[i + 2];
  const CAM: Record<string, Camada> = { pilar: 'PILAR', viga: 'VIGA', laje: 'LAJE', fundacao: 'FUNDACAO', parede: 'PILAR', escada: 'VIGA' };
  const segs: { c: Camada; a: P; z: P }[] = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const ob of cena.objetos) for (let i = 0; i + 5 < ob.linhas.length; i += 6) {
    const a: P = [dot(direita, ob.linhas, i), dot(cima, ob.linhas, i)], z: P = [dot(direita, ob.linhas, i + 3), dot(cima, ob.linhas, i + 3)];
    for (const q of [a, z]) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    segs.push({ c: CAM[ob.tipo] ?? 'FORMA-FINA', a, z });
  }
  const area = areaArmacao('A3'), w = area.x1 - area.x0, h = area.y1 - area.y0;
  const f = Math.min(w / Math.max(x1 - x0, 1e-6), h / Math.max(y1 - y0, 1e-6)) * 0.95;
  const ox = area.x0 + (w - (x1 - x0) * f) / 2 - x0 * f, oy = area.y0 + (h - (y1 - y0) * f) / 2 - y0 * f;
  const desenho: Prim[] = segs.map((s) => ({ t: 'pl', c: s.c, pts: [[ox + s.a[0] * f, oy + s.a[1] * f], [ox + s.z[0] * f, oy + s.z[1] * f]] }));
  return montarFolha({
    b, formato: 'A3', tipo: 'perspectiva', titulo: 'Perspectiva axonométrica', conteudo: 'PERSPECTIVA AXONOMÉTRICA DA ESTRUTURA', escala: 'S/E', escalaNum: 100, carimbo: o.carimbo,
    desenho, tabelas: [], legenda: `AXONOMETRIA ORTOGRÁFICA · azimute ${o.azimute ?? -55}° · elevação ${o.elevacao ?? 28}° · sem escala`, avisos: cena.avisos, elementos: [`${cena.contagens.total} elementos`],
  } as Parameters<typeof montarFolha>[0]);
}

/** Cinza de impressão (PDF e SVG) de cada token de cor dos isovalores: do claro (menor valor) ao escuro (maior). */
export const cinzaDoToken = (t: number) => +(0.95 - (0.6 * t) / (N_TOKENS_ISO - 1)).toFixed(3);

/**
 * Folha "Resultados" (V6f, C12.4, SCR a confirmar): um mapa de isovalores por pavimento com laje calculada — bandas de cor
 * (camadas ISO-0 a ISO-10; cinzas no PDF e no SVG), isolinhas, contornos da estrutura, extremos e a legenda das faixas.
 * Padrão: deslocamento vertical na combinação quase permanente; `grandeza` e `hipotese` (id) escolhem outro mapa.
 */
export function montarPranchasResultados(
  b: BuildingModel, an: AnaliseEdificio | null, dim: Dimensionamento | null, o: OpcoesArmacao & { grandeza?: GrandezaIso; hipotese?: string } = {},
): Prancha[] {
  if (!an) return [];
  const grandeza = o.grandeza ?? 'uz', info = infoGrandeza(grandeza);
  if (info.grupo === 'radier') return [];
  const qp = combinacoesEdificio(b, an).find((c) => c.tipo === 'QP'), hips = hipotesesDeLaje(b, an);
  const hip = info.porHipotese ? (o.hipotese ? hips.find((h) => h.id === o.hipotese) : qp ? hipoteseDeCombinacao(qp) : hips[0]) : undefined;
  const cfg = cfgArmacao(b), out: Prancha[] = [];
  for (const pv of pavimentosComMapa(b, an)) {
    const pav = b.pavimentos.find((p) => p.id === pv.id), g = b.grupos.find((x) => x.id === pav?.grupo);
    if (!pav || !g || (o.grupo && g.id !== o.grupo && g.nome !== o.grupo)) continue;
    const r = campoDoPavimento(b, an, dim, { pavimento: pv.id, grandeza, hipotese: hip });
    if (!r.campo) continue;
    const campo = r.campo, rotuloCampo = r.campo.rotulo ?? r.campo.grandeza, f = faixaExibida(campo), niveis = niveisAutomaticos(f.lo, f.hi, 10);
    const pilares = b.pilares.filter((p) => lancesDoPilar(b, p).some((x) => x.id === pav.id));
    const vigas = b.vigas.filter((v) => v.grupo === g.id), lajes = b.lajes.filter((l) => l.grupo === g.id);
    const geo: P[] = [...lajes.flatMap((l) => l.contorno), ...vigas.flatMap((v) => v.pontos), ...pilares.flatMap((p) => contornoPilar(p, p.secao))];
    const cx = caixa(geo.length ? geo : campo.nos.length ? campo.nos : [[0, 0], [1, 1]]);
    const pl = plantaNaFolha(cx, b.prancha?.formato ?? 'auto', cfg.escalaLocacao || b.prancha?.escala || 0, 30);
    const k = pl.escala / 1000, modelo: Prim[] = [];
    for (const bd of bandas(campo, niveis)) for (const pts of bd.poligonos) modelo.push({ t: 'hach', c: `ISO-${bd.token}` as Camada, pts, g: cinzaDoToken(bd.token) });
    for (const il of isolinhas(campo, niveis)) for (const pts of encadear(il.segmentos)) modelo.push({ t: 'pl', c: 'ISOLINHAS', pts });
    for (const l of lajes) modelo.push({ t: 'pl', c: 'LAJE', pts: l.contorno, fechada: true });
    for (const v of vigas) { const gv = geometriaViga(v); modelo.push({ t: 'pl', c: 'FORMA-FINA', pts: [...gv.esq, ...[...gv.dir].reverse()], fechada: true }); }
    for (const p of pilares) modelo.push({ t: 'pl', c: 'PILAR', pts: contornoPilar(p, p.secao), fechada: true });
    const ex = extremos(campo);
    for (const [rot, e] of [['máx.', ex.max], ['mín.', ex.min]] as const) if (e) modelo.push({ t: 'txt', c: 'TEXTO', p: [e.pos[0] + 1.5 * k, e.pos[1] + 1.5 * k], h: 2.2 * k, s: `${rot} ${fmtIso(e.valor, 2)} ${campo.unidade}` });
    const leg = legenda(campo, niveis);
    const tabela: BlocoTabela = {
      titulo: `LEGENDA — ${rotuloCampo.toUpperCase()}`,
      cols: [{ w: 30, rot: `FAIXA (${campo.unidade})` }, { w: 28, rot: 'CAMADA' }, { w: 20, rot: 'CINZA' }],
      linhas: leg.itens.map((it) => [it.rotulo, `ISO-${it.token}`, nf(cinzaDoToken(it.token), 2)]),
    };
    out.push(montarFolha({
      b, formato: pl.formato, tipo: 'resultados', titulo: `Resultados — ${pav.nome}`, conteudo: rotuloCampo.toUpperCase(), escala: `1:${pl.escala}`, escalaNum: pl.escala, carimbo: o.carimbo, numero: out.length + 1,
      desenho: [], tabelas: [tabela], legenda: `ESCALA 1:${pl.escala} · ${rotuloCampo} · máx. ${ex.max ? fmtIso(ex.max.valor, 2) : '—'} e mín. ${ex.min ? fmtIso(ex.min.valor, 2) : '—'} ${campo.unidade}`,
      avisos: [...pl.avisos, ...r.avisos], modelo, janela: pl.janela, elementos: [campo.grandeza],
    } as Parameters<typeof montarFolha>[0]));
  }
  return out;
}
