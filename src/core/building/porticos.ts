// Numeração de pórticos e de vigas (K1.4.69, L4): pórtico = vigas consecutivas alinhadas do grupo (cadeia por extremidades
// comuns e direção contínua), numerado como a renumeração de vigas: horizontais de cima para baixo, depois verticais e
// inclinadas da esquerda para a direita. As vigas do pórtico recebem números seguidos ao longo dele.
import type { BuildingModel, Viga } from './types';

type Pt = [number, number];
export interface Portico { numero: number; vigas: string[]; horizontal: boolean }
export interface ErroNumeracao { codigo: 'NUMERACAO_DUPLICADA' | 'NUMERACAO_FALHA' | 'NUMERACAO_FORA_DE_ORDEM' | 'NUMERACAO_NOME'; mensagem: string; vigas: string[] }

const TOL_PONTO = 0.15;
const COS_ALINHADO = Math.cos((5 * Math.PI) / 180);
const dir = (a: Pt, z: Pt): Pt => { const L = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1; return [(z[0] - a[0]) / L, (z[1] - a[1]) / L]; };
const perto = (a: Pt, z: Pt) => Math.hypot(a[0] - z[0], a[1] - z[1]) <= TOL_PONTO;

interface Ext { v: Viga; ponto: Pt; saida: Pt; fim: 0 | 1 }
const extremos = (v: Viga): [Ext, Ext] => {
  const p = v.pontos as Pt[], n = p.length;
  return [{ v, ponto: p[0], saida: dir(p[0], p[1]), fim: 0 }, { v, ponto: p[n - 1], saida: dir(p[n - 1], p[n - 2]), fim: 1 }];
};

/** Pórticos do grupo: cadeias de vigas alinhadas, ordenadas e orientadas (horizontal: da esquerda para a direita; as demais, de cima para baixo). */
export function porticosDoGrupo(b: BuildingModel, grupo: string): { portico: Portico; vigas: Viga[] }[] {
  const vs = b.vigas.filter((v) => v.grupo === grupo && v.pontos.length >= 2);
  const exts = vs.flatMap(extremos);
  // ligação: extremidades próximas com saídas opostas (direção contínua)
  const par = new Map<string, Ext>();
  const chave = (e: Ext) => `${e.v.id}:${e.fim}`;
  for (const a of exts) for (const z of exts) {
    if (a.v === z.v || chave(a) >= chave(z) || !perto(a.ponto, z.ponto)) continue;
    if (-(a.saida[0] * z.saida[0] + a.saida[1] * z.saida[1]) < COS_ALINHADO) continue;
    // só liga se for o único candidato alinhado de cada lado (nó em T não continua o pórtico)
    const cands = exts.filter((e) => e.v !== a.v && perto(a.ponto, e.ponto) && -(a.saida[0] * e.saida[0] + a.saida[1] * e.saida[1]) >= COS_ALINHADO);
    const outros = exts.filter((e) => e.v !== z.v && perto(z.ponto, e.ponto) && -(z.saida[0] * e.saida[0] + z.saida[1] * e.saida[1]) >= COS_ALINHADO);
    if (cands.length !== 1 || outros.length !== 1) continue;
    if (!par.has(chave(a)) && !par.has(chave(z))) { par.set(chave(a), z); par.set(chave(z), a); }
  }
  const vistos = new Set<string>(), cadeias: { v: Viga; inverso: boolean }[][] = [];
  for (const v of vs) {
    if (vistos.has(v.id)) continue;
    vistos.add(v.id);
    const cadeia: { v: Viga; inverso: boolean }[] = [{ v, inverso: false }];
    let cur = v, sai: 0 | 1 = 1;
    for (;;) {
      const o = par.get(`${cur.id}:${sai}`);
      if (!o || vistos.has(o.v.id)) break;
      vistos.add(o.v.id); cadeia.push({ v: o.v, inverso: o.fim === 1 }); cur = o.v; sai = o.fim === 1 ? 0 : 1;
    }
    cur = v; let ent: 0 | 1 = 0;
    for (;;) {
      const o = par.get(`${cur.id}:${ent}`);
      if (!o || vistos.has(o.v.id)) break;
      vistos.add(o.v.id); cadeia.unshift({ v: o.v, inverso: o.fim === 0 }); cur = o.v; ent = o.fim === 0 ? 1 : 0;
    }
    cadeias.push(cadeia);
  }
  const itens = cadeias.map((c) => {
    const pts = c.flatMap((x) => (x.v.pontos as Pt[]));
    const a = c[0].inverso ? c[0].v.pontos.at(-1)! : c[0].v.pontos[0], z = c.at(-1)!.inverso ? c.at(-1)!.v.pontos[0] : c.at(-1)!.v.pontos.at(-1)!;
    const horizontal = Math.abs(z[0] - a[0]) >= Math.abs(z[1] - a[1]);
    const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    // orienta: horizontal da esquerda para a direita; demais de cima para baixo
    const inverte = horizontal ? a[0] > z[0] : a[1] < z[1];
    const ordenadas = inverte ? [...c].reverse() : c;
    return { horizontal, mx, my, vigas: ordenadas.map((x) => x.v) };
  });
  const tol = 0.3;
  const H = itens.filter((x) => x.horizontal).sort((a, z) => (Math.abs(a.my - z.my) > tol ? z.my - a.my : a.mx - z.mx));
  const V = itens.filter((x) => !x.horizontal).sort((a, z) => (Math.abs(a.mx - z.mx) > tol ? a.mx - z.mx : z.my - a.my));
  return [...H, ...V].map((x, i) => ({ portico: { numero: i + 1, vigas: x.vigas.map((v) => v.id), horizontal: x.horizontal }, vigas: x.vigas }));
}

/** Nomes que a renumeração dá: V1, V2… ao longo dos pórticos, na ordem dos pórticos. */
export function numeracaoPorticos(b: BuildingModel, grupo: string): { porticos: Portico[]; nomes: Map<string, string> } {
  const ps = porticosDoGrupo(b, grupo);
  const nomes = new Map<string, string>();
  let n = 1;
  for (const p of ps) for (const v of p.vigas) nomes.set(v.id, `V${n++}`);
  return { porticos: ps.map((p) => p.portico), nomes };
}

/** Avaliação de erros da numeração do grupo: nomes repetidos, números faltando, fora do padrão e vigas de um pórtico fora de sequência. */
export function avaliarNumeracao(b: BuildingModel, grupo: string): ErroNumeracao[] {
  const vs = b.vigas.filter((v) => v.grupo === grupo);
  const erros: ErroNumeracao[] = [];
  const por = new Map<string, Viga[]>();
  for (const v of vs) por.set(v.nome, [...(por.get(v.nome) ?? []), v]);
  for (const [nome, xs] of por) if (xs.length > 1) erros.push({ codigo: 'NUMERACAO_DUPLICADA', mensagem: `Nome ${nome} repetido em ${xs.length} vigas.`, vigas: xs.map((v) => v.id) });
  const fora = vs.filter((v) => !/^V\d+$/.test(v.nome));
  if (fora.length) erros.push({ codigo: 'NUMERACAO_NOME', mensagem: `Vigas fora do padrão V<número>: ${fora.map((v) => v.nome).join(', ')}.`, vigas: fora.map((v) => v.id) });
  const nums = vs.map((v) => /^V(\d+)$/.exec(v.nome)).filter((m): m is RegExpExecArray => !!m).map((m) => +m[1]).sort((a, z) => a - z);
  const falta: number[] = [];
  for (let i = 1; i <= (nums.at(-1) ?? 0); i++) if (!nums.includes(i)) falta.push(i);
  if (falta.length) erros.push({ codigo: 'NUMERACAO_FALHA', mensagem: `Números sem viga: ${falta.map((n) => `V${n}`).join(', ')}.`, vigas: [] });
  const { nomes } = numeracaoPorticos(b, grupo);
  const desordem = vs.filter((v) => nomes.get(v.id) !== v.nome);
  if (desordem.length && !falta.length && !fora.length) erros.push({ codigo: 'NUMERACAO_FORA_DE_ORDEM', mensagem: `${desordem.length} viga(s) fora da ordem dos pórticos (use portico.renumerar).`, vigas: desordem.map((v) => v.id) });
  return erros;
}
