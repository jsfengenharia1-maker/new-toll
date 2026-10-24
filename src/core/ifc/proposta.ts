// Proposta de lançamento a partir do IFC lido (L3, C1.22): pavimentos e grupos, pilares contínuos entre pavimentos, vigas,
// lajes (com aberturas) e paredes de concreto, mais o relatório de importação. Dados puros: o comando `ifc.importar`
// (src/core/commands/ifc.ts) aplica a proposta; reimportar não duplica (origem `ifc:<GlobalId>`).
import type { BuildingModel, CategoriaUso } from '../building/types';
import type { IfcLido, SecaoIfc } from './ler';
import { materiaisSugeridos, FCK_FAIXA, type AtribuicaoMaterial, type TipoElementoIfc } from './materiais';
import { fckDoTexto } from './ler';
import type { P2 } from './geom';

/** Tolerâncias [a confirmar]: posição e alinhamento (1 cm) e cota entre elemento e pavimento (15 cm). */
export const TOL_POSICAO = 0.01;
export const TOL_COTA = 0.15;

export interface PavimentoMapeado {
  /** Id (express) do IfcBuildingStorey. */
  storey: number;
  nome: string;
  /** Cota do topo da laje estrutural (m); a do piso do IfcBuildingStorey. */
  cota: number;
  uso: CategoriaUso;
  /** Nome do grupo: pavimentos com o mesmo nome formam um grupo (planta compartilhada). */
  grupo: string;
  incluir: boolean;
}
export interface MapeamentoIfc {
  obra: { nome: string; cidade?: string };
  pavimentos: PavimentoMapeado[];
  materiais: Record<TipoElementoIfc, AtribuicaoMaterial>;
  /** Leva os extremos das vigas ao centro do pilar quando caem dentro do pilar (padrão sim). */
  ajustarExtremos: boolean;
  /** Lança paredes de concreto (padrão sim). */
  paredes: boolean;
}

export interface GrupoIfc { chave: string; nome: string; uso: CategoriaUso }
export interface PavimentoIfcProposto { chave: string; nome: string; cota: number; grupo: string; uso: CategoriaUso }
export interface PilarIfc {
  origem: string; nomeIfc: string; x: number; y: number; angulo: number; secao: SecaoIfc;
  /** Seção própria dos lances que diferem da base (lance = pavimento do topo). */
  secoes: { pavimento: string; secao: SecaoIfc }[];
  nasce: string; morre: string; aproximado?: boolean;
}
export interface VigaIfcProposta { origem: string; nomeIfc: string; grupo: string; pontos: P2[]; secao: { b: number; h: number }; aproximado?: boolean }
export interface LajeIfcProposta { origem: string; nomeIfc: string; grupo: string; contorno: P2[]; furos: P2[][]; h: number; aproximado?: boolean }
export interface ParedeIfcProposta { origem: string; nomeIfc: string; pontos: P2[]; espessura: number; nasce: string; morre: string; aproximado?: boolean }
export interface AmbiguoIfc { origem?: string; codigo: string; mensagem: string }
export interface IgnoradoIfc { classe: string; motivo: string; quantidade: number }

export interface PropostaIfc {
  arquivo: string;
  esquema: string;
  /** Metros por unidade do arquivo. */
  unidade: number;
  obra: { nome: string; cidade?: string };
  grupos: GrupoIfc[];
  pavimentos: PavimentoIfcProposto[];
  pilares: PilarIfc[];
  vigas: VigaIfcProposta[];
  lajes: LajeIfcProposta[];
  paredes: ParedeIfcProposta[];
  materiais: Record<TipoElementoIfc, AtribuicaoMaterial>;
  /** Deslocamento aplicado às coordenadas do arquivo (m), quando elas são muito grandes (georreferenciadas). */
  deslocamento: [number, number];
  ambiguos: AmbiguoIfc[];
  ignorados: IgnoradoIfc[];
  avisos: string[];
  /** Contagem por classe IFC do arquivo. */
  classes: Record<string, number>;
  /** Origens já lançadas no modelo (não entram de novo). */
  jaLancados: string[];
  contagens: { pavimentos: number; grupos: number; pilares: number; vigas: number; lajes: number; paredes: number; extremosAjustados: number; ambiguos: number; ignorados: number; jaLancados: number };
}

const igual = (a: number, b: number, t = TOL_POSICAO) => Math.abs(a - b) <= t;
const mm = (v: number) => Math.round(v * 1000) / 1000;
const cm = (v: number) => Math.round(v * 100);
const dist = (a: P2, b: P2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Uso sugerido pelo nome do pavimento [a confirmar]; editável na revisão. */
export function usoPeloNome(nome: string): CategoriaUso {
  if (/cobert|telhad|roof|[áa]tico|barrilete|casa de m[aá]quinas/i.test(nome)) return 'cobertura';
  if (/garag|estacion|subsolo|parking/i.test(nome)) return 'garagem';
  if (/escrit[óo]rio|comercial|office/i.test(nome)) return 'escritorio';
  return 'residencial';
}

function assinatura(l: IfcLido, storey: number): string {
  const v = l.vigas.filter((x) => x.pavimento === storey).map((x) => `V${x.pontos.map((p) => `${cm(p[0])},${cm(p[1])}`).join(';')}|${cm(x.b)}|${cm(x.h)}`);
  const s = l.lajes.filter((x) => x.pavimento === storey).map((x) => `L${x.contorno.map((p) => `${cm(p[0])},${cm(p[1])}`).join(';')}|${x.furos.map((f) => f.map((p) => `${cm(p[0])},${cm(p[1])}`).join(';')).sort().join('/')}|${cm(x.espessura)}`);
  return [...v, ...s].sort().join('#');
}

/** Sugere grupos: pavimentos de vigas e lajes idênticas (mesma geometria em planta) formam um grupo "Tipo". Devolve storey → nome. */
export function agruparPavimentos(l: IfcLido): Map<number, string> {
  const por = new Map<string, number[]>();
  for (const p of l.pavimentos) {
    const a = assinatura(l, p.id);
    if (a) por.set(a, [...(por.get(a) ?? []), p.id]);
  }
  const nome = new Map<number, string>();
  let n = 0;
  const unicos = [...por.values()].filter((x) => x.length > 1).length;
  for (const ids of por.values()) {
    if (ids.length < 2) continue;
    n++;
    for (const id of ids) nome.set(id, unicos > 1 ? `Tipo ${n}` : 'Tipo');
  }
  for (const p of l.pavimentos) if (!nome.has(p.id)) nome.set(p.id, p.nome);
  return nome;
}

/** Mapeamento inicial: tudo incluído, grupos sugeridos, uso pelo nome, materiais mais usados. */
export function mapeamentoPadrao(l: IfcLido): MapeamentoIfc {
  const g = agruparPavimentos(l);
  return {
    obra: { nome: l.projeto || l.edificio || 'Obra importada de IFC' },
    pavimentos: l.pavimentos.map((p) => ({ storey: p.id, nome: p.nome, cota: p.cota, uso: usoPeloNome(p.nome), grupo: g.get(p.id) ?? p.nome, incluir: true })),
    materiais: materiaisSugeridos(l),
    ajustarExtremos: true,
    paredes: true,
  };
}

const ehConcreto = (materiais: string[], l: IfcLido) => materiais.some((n) => /concret|concr\b|conc\./i.test(n) || fckDoTexto(n) !== undefined || l.materiais.some((m) => m.nome === n && m.fck !== undefined));
const mesmaSecao = (a: SecaoIfc, b: SecaoIfc) => (a.tipo === 'circ' ? b.tipo === 'circ' && igual(a.d, b.d, 0.002) : b.tipo === 'ret' && igual(a.b, b.b, 0.002) && igual(a.h, b.h, 0.002));
const arred = (s: SecaoIfc): SecaoIfc => (s.tipo === 'circ' ? { tipo: 'circ', d: mm(s.d) } : { tipo: 'ret', b: mm(s.b), h: mm(s.h) });

/** Encadeia itens contíguos (o seguinte começa onde o anterior termina). */
function encadear<T extends { z0: number; z1: number }>(itens: T[], mesmo: (a: T, b: T) => boolean): T[][] {
  const cadeias: T[][] = [];
  for (const c of [...itens].sort((a, b) => a.z0 - b.z0)) {
    const alvo = cadeias.find((ch) => { const u = ch[ch.length - 1]; return mesmo(u, c) && Math.abs(u.z1 - c.z0) <= TOL_COTA; });
    if (alvo) alvo.push(c); else cadeias.push([c]);
  }
  return cadeias;
}

export function propostaIfc(l: IfcLido, m: MapeamentoIfc, arquivo = 'arquivo.ifc', modelo?: Pick<BuildingModel, 'pilares' | 'vigas' | 'lajes'> & { paredes?: { origemLancamento?: string }[] }): PropostaIfc {
  const ambiguos: AmbiguoIfc[] = [], avisos: string[] = [];
  const ignorados = new Map<string, IgnoradoIfc>();
  const ignora = (classe: string, motivo: string) => { const k = `${classe}|${motivo}`; const x = ignorados.get(k) ?? { classe, motivo, quantidade: 0 }; x.quantidade++; ignorados.set(k, x); };

  const inclM = m.pavimentos.filter((p) => p.incluir && l.pavimentos.some((q) => q.id === p.storey)).sort((a, b) => a.cota - b.cota || a.storey - b.storey);
  const chavePav = (s: number) => `s${s}`;
  const porStorey = new Map(inclM.map((p) => [p.storey, p]));
  const grupos: GrupoIfc[] = [];
  for (const p of inclM) if (!grupos.some((g) => g.nome === p.grupo)) grupos.push({ chave: `g${grupos.length + 1}`, nome: p.grupo, uso: p.uso });
  const chaveGrupo = (nome: string) => grupos.find((g) => g.nome === nome)!.chave;
  const pavimentos: PavimentoIfcProposto[] = inclM.map((p) => ({ chave: chavePav(p.storey), nome: p.nome, cota: p.cota, grupo: chaveGrupo(p.grupo), uso: p.uso }));
  if (!pavimentos.length) avisos.push('Nenhum pavimento incluído.');
  const cotas = pavimentos.map((p) => p.cota);
  for (let i = 1; i < cotas.length; i++) if (igual(cotas[i], cotas[i - 1], 0.005)) ambiguos.push({ codigo: 'COTA_REPETIDA', mensagem: `Os pavimentos “${pavimentos[i - 1].nome}” e “${pavimentos[i].nome}” estão na mesma cota (${cotas[i].toFixed(2)} m); só o primeiro é criado.` });

  // pavimento (chave) nas cotas ±TOL_COTA
  const pavEm = (z: number) => pavimentos.find((p) => Math.abs(p.cota - z) <= TOL_COTA);
  const pavAte = (z: number) => [...pavimentos].reverse().find((p) => p.cota <= z + TOL_COTA);

  // ---- pilares ----
  const cols = l.colunas.filter((c) => c.pavimento !== null && porStorey.has(c.pavimento));
  for (const c of l.colunas) if (c.pavimento === null || !porStorey.has(c.pavimento)) ignora('IFCCOLUMN', 'pavimento não incluído');
  const cadeiasP = encadear(cols, (a, b) => dist([a.x, a.y], [b.x, b.y]) <= TOL_POSICAO && a.secao.tipo === b.secao.tipo && (a.secao.tipo === 'circ' || Math.abs((((a.angulo - b.angulo) % 180) + 270) % 180 - 90) <= 0.5));
  const pilares: PilarIfc[] = [];
  const lance = (c: { z0: number; z1: number }) => pavimentos.filter((p) => p.cota > c.z0 + TOL_COTA && p.cota <= c.z1 + TOL_COTA);
  for (const ch of cadeiasP) {
    const a = ch[0], z0 = a.z0, z1 = ch[ch.length - 1].z1;
    const nasce = pavimentos.length && z0 <= pavimentos[0].cota + TOL_COTA ? 'fundacao' : (pavEm(z0) ?? pavAte(z0))?.chave;
    const morre = pavAte(z1)?.chave;
    const idxN = nasce === 'fundacao' ? -1 : pavimentos.findIndex((p) => p.chave === nasce), idxM = pavimentos.findIndex((p) => p.chave === morre);
    if (!nasce || !morre || idxM <= idxN) { for (let i = 0; i < ch.length; i++) ignora('IFCCOLUMN', 'não alcança nenhum lance entre os pavimentos incluídos'); continue; }
    if (nasce !== 'fundacao' && !pavEm(z0)) ambiguos.push({ origem: `ifc:${a.globalId}`, codigo: 'IFC_COTA_AJUSTADA', mensagem: `Pilar ${a.nome}: a base (${z0.toFixed(2)} m) não coincide com um pavimento; nasce no pavimento imediatamente abaixo.` });
    // seção por lance (pavimento do topo)
    const porLance: { pavimento: string; secao: SecaoIfc }[] = [];
    for (const c of ch) for (const p of lance(c)) if (pavimentos.indexOf(p) <= idxM && !porLance.some((x) => x.pavimento === p.chave)) porLance.push({ pavimento: p.chave, secao: arred(c.secao) });
    const base = porLance[0]?.secao ?? arred(a.secao);
    pilares.push({
      origem: `ifc:${a.globalId}`, nomeIfc: a.nome, x: mm(a.x), y: mm(a.y), angulo: a.secao.tipo === 'circ' ? 0 : a.angulo, secao: base,
      secoes: porLance.filter((x) => !mesmaSecao(x.secao, base)), nasce, morre, ...(ch.some((c) => c.aproximado) ? { aproximado: true } : {}),
    });
  }
  pilares.sort((p, q) => p.y - q.y || p.x - q.x);

  // ---- grupos: representante e comparação ----
  const representante = new Map<string, number>();
  for (const p of inclM) if (!representante.has(p.grupo)) representante.set(p.grupo, p.storey);
  const assin = new Map(inclM.map((p) => [p.storey, assinatura(l, p.storey)]));
  const noRepresentante = (storey: number) => { const p = porStorey.get(storey)!; return representante.get(p.grupo) === storey; };
  for (const p of inclM) {
    const rep = representante.get(p.grupo)!;
    if (rep !== p.storey && assin.get(p.storey) !== assin.get(rep)) {
      ambiguos.push({ codigo: 'GRUPO_DIFERENTE', mensagem: `O pavimento “${p.nome}” tem vigas ou lajes diferentes das de “${porStorey.get(rep)!.nome}” (mesmo grupo “${p.grupo}”); seus elementos de planta não foram lançados. Separe-o em outro grupo.` });
    }
  }

  // ---- vigas ----
  const vigas: VigaIfcProposta[] = [];
  const chaveViga = new Set<string>();
  let ajustados = 0;
  const lanceDoPilar = (pl: PilarIfc, cota: number) => {
    const ci = pl.nasce === 'fundacao' ? -Infinity : pavimentos.find((p) => p.chave === pl.nasce)!.cota;
    const cf = pavimentos.find((p) => p.chave === pl.morre)!.cota;
    return cota > ci + 1e-9 && cota <= cf + 1e-9;
  };
  for (const v of l.vigas) {
    const p = v.pavimento === null ? undefined : porStorey.get(v.pavimento);
    if (!p) { ignora('IFCBEAM', 'pavimento não incluído'); continue; }
    if (!noRepresentante(v.pavimento!)) { if (assin.get(v.pavimento!) === assin.get(representante.get(p.grupo)!)) continue; ignora('IFCBEAM', 'pavimento de planta diferente do grupo'); continue; }
    let pts = v.pontos.map((q) => [mm(q[0]), mm(q[1])] as P2);
    if (pts.length < 2 || pts.every((q, i) => i === 0 || dist(q, pts[0]) < TOL_POSICAO)) { ignora('IFCBEAM', 'comprimento nulo'); continue; }
    if (m.ajustarExtremos) {
      const alvo = pilares.filter((pl) => lanceDoPilar(pl, p.cota));
      const ajusta = (q: P2): P2 => {
        let melhor: PilarIfc | null = null, dm = Infinity;
        for (const pl of alvo) {
          const raio = pl.secao.tipo === 'circ' ? pl.secao.d / 2 : Math.hypot(pl.secao.b, pl.secao.h) / 2;
          const d = dist(q, [pl.x, pl.y]);
          if (d <= raio + TOL_POSICAO && d < dm) { melhor = pl; dm = d; }
        }
        if (melhor && dm > 0.001) { ajustados++; return [melhor.x, melhor.y]; }
        return q;
      };
      pts = [ajusta(pts[0]), ...pts.slice(1, -1), ajusta(pts[pts.length - 1])];
    }
    const k = pts.map((q) => `${cm(q[0])},${cm(q[1])}`).join(';') + `|${p.grupo}`;
    const kr = pts.map((q) => `${cm(q[0])},${cm(q[1])}`).reverse().join(';') + `|${p.grupo}`;
    if (chaveViga.has(k) || chaveViga.has(kr)) { ignora('IFCBEAM', 'viga duplicada (mesmo eixo)'); continue; }
    chaveViga.add(k);
    vigas.push({ origem: `ifc:${v.globalId}`, nomeIfc: v.nome, grupo: chaveGrupo(p.grupo), pontos: pts, secao: { b: mm(v.b), h: mm(v.h) }, ...(v.aproximado ? { aproximado: true } : {}) });
  }

  // ---- lajes ----
  const lajes: LajeIfcProposta[] = [];
  for (const s of l.lajes) {
    const p = s.pavimento === null ? undefined : porStorey.get(s.pavimento);
    if (!p) { ignora('IFCSLAB', 'pavimento não incluído'); continue; }
    if (!noRepresentante(s.pavimento!)) { if (assin.get(s.pavimento!) !== assin.get(representante.get(p.grupo)!)) ignora('IFCSLAB', 'pavimento de planta diferente do grupo'); continue; }
    if (s.predefinido === 'BASESLAB') { ignora('IFCSLAB', 'laje de fundo (radier): fundação'); continue; }
    if (s.predefinido === 'LANDING') { ignora('IFCSLAB', 'patamar de escada: escadas (E4)'); continue; }
    if (s.espessura < 0.05 || s.espessura > 1) ambiguos.push({ origem: `ifc:${s.globalId}`, codigo: 'IFC_ESPESSURA_ATIPICA', mensagem: `Laje ${s.nome}: espessura de ${(s.espessura * 100).toFixed(1)} cm.` });
    lajes.push({
      origem: `ifc:${s.globalId}`, nomeIfc: s.nome, grupo: chaveGrupo(p.grupo), contorno: s.contorno.map((q) => [mm(q[0]), mm(q[1])] as P2),
      furos: s.furos.map((f) => f.map((q) => [mm(q[0]), mm(q[1])] as P2)), h: mm(s.espessura), ...(s.aproximado ? { aproximado: true } : {}),
    });
  }

  // ---- paredes ----
  const paredes: ParedeIfcProposta[] = [];
  const pw = l.paredes.filter((w) => w.pavimento !== null && porStorey.has(w.pavimento));
  for (const w of l.paredes) if (w.pavimento === null || !porStorey.has(w.pavimento)) ignora(w.classe, 'pavimento não incluído');
  for (const ch of encadear(pw.filter((w) => m.paredes && ehConcreto(w.materiais, l)), (a, b) => a.pontos.length === b.pontos.length && a.pontos.every((q, i) => dist(q, b.pontos[i]) <= TOL_POSICAO))) {
    const a = ch[0], z0 = a.z0, z1 = ch[ch.length - 1].z1;
    const nasce = pavimentos.length && z0 <= pavimentos[0].cota + TOL_COTA ? 'fundacao' : (pavEm(z0) ?? pavAte(z0))?.chave;
    const morre = pavAte(z1)?.chave;
    const idxN = nasce === 'fundacao' ? -1 : pavimentos.findIndex((p) => p.chave === nasce), idxM = pavimentos.findIndex((p) => p.chave === morre);
    if (!nasce || !morre || idxM <= idxN) { ignora('IFCWALL', 'não alcança nenhum lance entre os pavimentos incluídos'); continue; }
    paredes.push({ origem: `ifc:${a.globalId}`, nomeIfc: a.nome, pontos: a.pontos.map((q) => [mm(q[0]), mm(q[1])] as P2), espessura: mm(a.espessura), nasce, morre, ...(a.aproximado ? { aproximado: true } : {}) });
  }
  for (const w of pw) if (!m.paredes || !ehConcreto(w.materiais, l)) ignora(w.classe, m.paredes ? 'parede que não é de concreto (alvenaria: lançar pela alvenaria)' : 'paredes desligadas na importação');

  // ---- classes que só entram no relatório ----
  const motivos: Record<string, string> = {
    IFCMEMBER: 'IfcMember ignorado', IFCSTAIRFLIGHT: 'escadas: lançar pelas escadas (E4)', IFCSTAIR: 'escadas: lançar pelas escadas (E4)', IFCRAMPFLIGHT: 'rampas: não importadas',
    IFCFOOTING: 'fundação: lançar pelo módulo de fundações', IFCPILE: 'fundação: lançar pelo módulo de fundações', IFCPLATE: 'IfcPlate ignorado', IFCROOF: 'cobertura: não importada', IFCCURTAINWALL: 'fachada: não importada',
  };
  for (const [c, q] of Object.entries(l.classes)) if (motivos[c]) { const k = `${c}|${motivos[c]}`; ignorados.set(k, { classe: c, motivo: motivos[c], quantidade: q }); }
  for (const a of l.avisos) avisos.push(a.mensagem);

  // ---- materiais ----
  const materiais = { ...m.materiais } as Record<TipoElementoIfc, AtribuicaoMaterial>;
  for (const t of Object.keys(materiais) as TipoElementoIfc[]) {
    const f = materiais[t]?.fck;
    if (f !== undefined && (f < FCK_FAIXA[0] || f > FCK_FAIXA[1])) {
      ambiguos.push({ codigo: 'IFC_FCK_FORA_DA_FAIXA', mensagem: `fck ${f} MPa dos ${t}s fora de ${FCK_FAIXA[0]} a ${FCK_FAIXA[1]} MPa; vale o da obra.` });
      const { fck: _fck, ...resto } = materiais[t]; void _fck;
      materiais[t] = resto;
    }
  }

  // ---- deslocamento (coordenadas georreferenciadas) ----
  const xs: number[] = [], ys: number[] = [];
  for (const p of pilares) { xs.push(p.x); ys.push(p.y); }
  for (const v of vigas) for (const q of v.pontos) { xs.push(q[0]); ys.push(q[1]); }
  for (const s of lajes) for (const q of s.contorno) { xs.push(q[0]); ys.push(q[1]); }
  for (const w of paredes) for (const q of w.pontos) { xs.push(q[0]); ys.push(q[1]); }
  const mx = xs.length ? Math.min(...xs) : 0, my = ys.length ? Math.min(...ys) : 0;
  const dx = Math.abs(mx) > 1000 ? -Math.round(mx) : 0, dy = Math.abs(my) > 1000 ? -Math.round(my) : 0;
  if (dx || dy) {
    const mv = (q: P2): P2 => [mm(q[0] + dx), mm(q[1] + dy)];
    for (const p of pilares) { p.x = mm(p.x + dx); p.y = mm(p.y + dy); }
    for (const v of vigas) v.pontos = v.pontos.map(mv);
    for (const s of lajes) { s.contorno = s.contorno.map(mv); s.furos = s.furos.map((f) => f.map(mv)); }
    for (const w of paredes) w.pontos = w.pontos.map(mv);
    avisos.push(`Coordenadas do arquivo deslocadas de (${dx}; ${dy}) m para perto da origem.`);
  }

  const origens = [...pilares, ...vigas, ...lajes, ...paredes].map((x) => x.origem);
  const existentes = new Set(modelo ? [...modelo.pilares, ...modelo.vigas, ...modelo.lajes, ...(modelo.paredes ?? [])].map((x) => /^ifc:[^:]+/.exec(x.origemLancamento ?? '')?.[0]).filter(Boolean) as string[] : []); // lajes por pano: `ifc:<GlobalId>:<hash>`
  const jaLancados = origens.filter((o) => existentes.has(o));
  const ign = [...ignorados.values()];
  return {
    arquivo, esquema: l.esquema, unidade: l.unidade, obra: { ...m.obra }, grupos, pavimentos, pilares, vigas, lajes, paredes, materiais,
    deslocamento: [dx, dy], ambiguos, ignorados: ign, avisos, classes: { ...l.classes }, jaLancados,
    contagens: { pavimentos: pavimentos.length, grupos: grupos.length, pilares: pilares.length, vigas: vigas.length, lajes: lajes.length, paredes: paredes.length, extremosAjustados: ajustados, ambiguos: ambiguos.length, ignorados: ign.reduce((s, x) => s + x.quantidade, 0), jaLancados: jaLancados.length },
  };
}
