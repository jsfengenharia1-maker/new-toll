// Comandos dos consolos curtos (E2e; C6.54 a C6.57, C6.101): criar (viga até a face do pilar, tipo e geometria, clique na face),
// editar (geometria, aparelho, horizontal e armadura bloqueada), remover e redimensionar (solta a armadura bloqueada: o dimensionamento
// refaz com os esforços do último cálculo).
import type { Draft } from 'immer';
import { consoloPadrao, faceDoPilar, larguraDaFace, pontaDaViga, pontaToca } from '../building/consolos';
import type { ArmaduraConsolo, BuildingModel, Consolo } from '../building/types';
import { nivelEdicao } from './tabelas';
import { registrar } from './registry';
import type { JsonSchema } from './schema';
import { err, fmt } from './inclinadas';

const novoId = (d: Draft<BuildingModel>) => `cs_${(++d.seq).toString(36)}`;
const medida = (desc: string, max = 3): JsonSchema => ({ type: 'number', exclusiveMinimum: 0, maximum: max, description: desc });
const aparelhoSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['l', 'b'], properties: {
  l: medida('comprimento do aparelho de apoio ao longo da viga (m)', 1), b: medida('largura do aparelho, transversal à viga (m)', 1),
} };
const armaduraSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['tirante', 'horizontais', 'verticais'], properties: {
  tirante: { type: 'object', additionalProperties: false, required: ['n', 'phi'], properties: { n: { type: 'integer', minimum: 2, maximum: 20 }, phi: { type: 'number', enum: [10, 12.5, 16, 20, 25, 32] } } },
  horizontais: { type: 'object', additionalProperties: false, required: ['n', 'phi'], properties: { n: { type: 'integer', minimum: 1, maximum: 20, description: 'estribos horizontais fechados de costura (2 ramos cada)' }, phi: { type: 'number', enum: [6.3, 8, 10, 12.5] } } },
  verticais: { type: 'object', additionalProperties: false, required: ['phi', 's'], properties: { phi: { type: 'number', enum: [5, 6.3, 8, 10, 12.5] }, s: { type: 'number', minimum: 0.03, maximum: 0.5, description: 'espaçamento (m)' } } },
} };

const achar = (b: BuildingModel, id: string) => b.consolos?.find((c) => c.id === id);

interface ParamsCriar {
  viga: string; ponta: 'ini' | 'fim'; pilar: string; nome?: string; b?: number; h?: number; hp?: number; a?: number; c?: number; aparelho?: { l: number; b: number }; hd?: number; cobrimento?: number;
}

/** Geometria resultante (padrão + informado) e seus erros de coerência. */
function geometria(b: BuildingModel, p: ParamsCriar) {
  const v = b.vigas.find((x) => x.id === p.viga)!, pil = b.pilares.find((x) => x.id === p.pilar)!;
  const face = faceDoPilar(pil, pontaDaViga(v, p.ponta)), pad = consoloPadrao(v.secao.b, v.secao.h, pil, face);
  const g = { b: p.b ?? pad.b, h: p.h ?? pad.h, hp: p.hp ?? (p.h !== undefined ? p.h / 2 : pad.hp), a: p.a ?? pad.a, aparelho: p.aparelho ?? pad.aparelho, c: 0 };
  g.c = p.c ?? +(g.a + g.aparelho.l / 2 + 0.1).toFixed(3);
  return { face, ...g };
}

registrar<ParamsCriar>({
  nome: 'consolo.criar',
  descricao: 'Lança um consolo curto que apoia a viga `viga` (ponta `ini` ou `fim`, que precisa tocar o pilar `pilar`) numa face do pilar (juntas de dilatação; não serve para apoiar pilares). Geometria em m: largura `b`, altura na face `h` e na ponta `hp`, distância `a` do centro do aparelho de apoio à face, balanço `c` e `aparelho` { l, b }; `hd` = força horizontal de cálculo no aparelho (kN; ausente = a mínima das opções). Sem a geometria, usa valores de partida. Modelo: apoio fixo no centro do aparelho (trecho rígido até ele), só a vertical chega ao pilar e a viga fica sem momento na face. Dimensiona pela NBR 6118 22.5 e NBR 9062 (bielas e tirantes, atrito-cisalhamento, balanço).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['viga', 'ponta', 'pilar'], properties: {
    viga: { type: 'string', description: 'id da viga apoiada' }, ponta: { type: 'string', enum: ['ini', 'fim'], description: 'ponta da viga que apoia no consolo' }, pilar: { type: 'string', description: 'id do pilar' },
    nome: { type: 'string', minLength: 1 }, b: medida('largura do consolo (m)'), h: medida('altura na face do pilar (m)'), hp: medida('altura na ponta do consolo (m; padrão h/2)'), a: medida('distância do centro do aparelho à face do pilar (m)', 2),
    c: medida('comprimento do balanço, da face à ponta (m)', 3), aparelho: aparelhoSchema, hd: { type: 'number', minimum: 0, maximum: 5000, description: 'força horizontal de cálculo no aparelho (kN)' },
    cobrimento: { type: 'number', minimum: 0, maximum: 10, description: 'cobrimento próprio (cm)' },
  } },
  validar(b, p) {
    const v = b.vigas.find((x) => x.id === p.viga), pil = b.pilares.find((x) => x.id === p.pilar);
    if (!v) return err('VIGA_INEXISTENTE', `Viga ${p.viga} não existe.`);
    if (!pil) return err('PILAR_INEXISTENTE', `Pilar ${p.pilar} não existe.`);
    if (!pontaToca(pontaDaViga(v, p.ponta), pil)) return err('CONSOLO_PONTA', `A ponta ${p.ponta === 'ini' ? 'inicial' : 'final'} da viga ${v.nome} não toca o pilar ${pil.nome}: leve a viga até a face.`, [v.id, pil.id]);
    if (b.consolos?.some((c) => c.viga === v.id && c.ponta === p.ponta)) return err('CONSOLO_DUPLICADO', `A ponta ${p.ponta === 'ini' ? 'inicial' : 'final'} da viga ${v.nome} já tem consolo.`, [v.id]);
    const g = geometria(b, p);
    if (g.b > larguraDaFace(pil, g.face) + 1e-9) return err('CONSOLO_LARGURA', `A largura do consolo (${fmt(g.b * 100, 0)} cm) passa da face do pilar ${pil.nome} (${fmt(larguraDaFace(pil, g.face) * 100, 0)} cm).`, [pil.id]);
    if (g.hp > g.h + 1e-9) return err('CONSOLO_GEOMETRIA', 'A altura na ponta não pode passar da altura na face.');
    if (g.aparelho.b > g.b + 1e-9) return err('CONSOLO_GEOMETRIA', `O aparelho (${fmt(g.aparelho.b * 100, 0)} cm) é mais largo que o consolo (${fmt(g.b * 100, 0)} cm).`);
    return [];
  },
  aplicar(d, p) {
    const lista = (d.consolos ??= []);
    const n = Math.max(0, ...lista.map((x) => { const m = /^C(\d+)$/.exec(x.nome); return m ? +m[1] : 0; })) + 1;
    const g = geometria(d as BuildingModel, p);
    const v = d.vigas.find((x) => x.id === p.viga)!, pil = d.pilares.find((x) => x.id === p.pilar)!;
    const c: Consolo = {
      id: novoId(d), nome: p.nome ?? `C${n}`, pilar: p.pilar, viga: p.viga, ponta: p.ponta, face: g.face, b: g.b, h: g.h, hp: g.hp, a: g.a, c: g.c, aparelho: { ...g.aparelho },
      ...(p.hd ? { hd: p.hd } : {}), ...(p.cobrimento ? { cobrimento: p.cobrimento } : {}),
    };
    lista.push(c);
    return `Consolo ${c.nome}: viga ${v.nome} no pilar ${pil.nome}, ${fmt(c.b * 100, 0)} × ${fmt(c.h * 100, 0)} cm, a = ${fmt(c.a * 100, 0)} cm.`;
  },
});

type ParamsEditar = { id: string; nome?: string; b?: number; h?: number; hp?: number; a?: number; c?: number; aparelho?: { l: number; b: number }; hd?: number; cobrimento?: number; armadura?: ArmaduraConsolo };

registrar<ParamsEditar>({
  nome: 'consolo.editar',
  descricao: 'Altera nome, geometria (b, h, hp, a, c em m), aparelho { l, b }, força horizontal `hd` (kN; 0 volta à mínima das opções), cobrimento (cm; 0 volta ao dos pilares) e a armadura { tirante { n, phi }, horizontais { n, phi }, verticais { phi, s } } de um consolo; informar a armadura a bloqueia (o recálculo só a verifica; `consolo.redimensionar` solta). Alterar a geometria solta a armadura bloqueada.',
  risco: 'escrita',
  // só a distância a muda o trecho rígido do pórtico; o resto é só dimensionamento
  calculo: (p) => nivelEdicao(p, ['nome', 'b', 'h', 'hp', 'c', 'aparelho', 'hd', 'cobrimento', 'armadura']),
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, b: medida('largura do consolo (m)'), h: medida('altura na face (m)'), hp: medida('altura na ponta (m)'), a: medida('distância do centro do aparelho à face (m)', 2),
    c: medida('balanço (m)'), aparelho: aparelhoSchema, hd: { type: 'number', minimum: 0, maximum: 5000 }, cobrimento: { type: 'number', minimum: 0, maximum: 10 }, armadura: armaduraSchema,
  } },
  validar(b, p) {
    const c = achar(b, p.id);
    if (!c) return err('CONSOLO_INEXISTENTE', `Consolo ${p.id} não existe.`);
    const pil = b.pilares.find((x) => x.id === c.pilar), g = { b: p.b ?? c.b, h: p.h ?? c.h, hp: p.hp ?? c.hp, ap: p.aparelho ?? c.aparelho };
    if (pil && g.b > larguraDaFace(pil, c.face) + 1e-9) return err('CONSOLO_LARGURA', `A largura do consolo (${fmt(g.b * 100, 0)} cm) passa da face do pilar ${pil.nome} (${fmt(larguraDaFace(pil, c.face) * 100, 0)} cm).`, [pil.id]);
    if (g.hp > g.h + 1e-9) return err('CONSOLO_GEOMETRIA', 'A altura na ponta não pode passar da altura na face.');
    if (g.ap.b > g.b + 1e-9) return err('CONSOLO_GEOMETRIA', `O aparelho (${fmt(g.ap.b * 100, 0)} cm) é mais largo que o consolo (${fmt(g.b * 100, 0)} cm).`);
    return [];
  },
  aplicar(d, p) {
    const c = d.consolos!.find((x) => x.id === p.id)!;
    let solta = false;
    if (p.nome !== undefined) c.nome = p.nome;
    for (const k of ['b', 'h', 'hp', 'a', 'c'] as const) if (p[k] !== undefined && p[k] !== c[k]) { c[k] = p[k]!; solta = true; }
    if (p.aparelho && (p.aparelho.l !== c.aparelho.l || p.aparelho.b !== c.aparelho.b)) { c.aparelho = { ...p.aparelho }; solta = true; }
    if (p.hd !== undefined) { if (p.hd) c.hd = p.hd; else delete c.hd; solta = true; }
    if (p.cobrimento !== undefined) { if (p.cobrimento) c.cobrimento = p.cobrimento; else delete c.cobrimento; solta = true; }
    if (p.armadura) { c.armadura = { tirante: { ...p.armadura.tirante }, horizontais: { ...p.armadura.horizontais }, verticais: { ...p.armadura.verticais } }; return `Armadura do consolo ${c.nome} editada e bloqueada.`; }
    const tinha = solta && !!c.armadura;
    if (solta) delete c.armadura;
    return `Consolo ${c.nome} editado.${tinha ? ' A armadura bloqueada saiu: a geometria ou os esforços mudaram e o recálculo gera outra.' : ''}`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'consolo.remover',
  descricao: 'Remove consolos; a viga volta a ligar-se ao pilar como as demais.',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } } },
  validar(b, p) {
    const falta = p.ids.find((id) => !achar(b, id));
    return falta ? err('CONSOLO_INEXISTENTE', `Consolo ${falta} não existe.`) : [];
  },
  aplicar(d, p) {
    const nomes = d.consolos!.filter((c) => p.ids.includes(c.id)).map((c) => c.nome);
    d.consolos = d.consolos!.filter((c) => !p.ids.includes(c.id));
    if (!d.consolos.length) delete d.consolos;
    return `Removido${nomes.length > 1 ? 's' : ''}: ${nomes.join(', ')}.`;
  },
});

registrar<{ ids?: string[] }>({
  nome: 'consolo.redimensionar',
  descricao: 'Redimensiona os consolos (todos, ou os de `ids`) com os esforços do último cálculo: solta a armadura bloqueada, e o dimensionamento escolhe outra.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } } },
  validar(b, p) {
    if (!b.consolos?.length) return err('SEM_CONSOLOS', 'A obra não tem consolos.');
    const falta = (p.ids ?? []).find((id) => !achar(b, id));
    return falta ? err('CONSOLO_INEXISTENTE', `Consolo ${falta} não existe.`) : [];
  },
  aplicar(d, p) {
    let n = 0;
    for (const c of d.consolos!) if ((!p.ids || p.ids.includes(c.id)) && c.armadura) { delete c.armadura; n++; }
    return n ? `${n} consolo(s) liberado(s) para redimensionar com os esforços do último cálculo.` : 'Nenhum consolo tinha armadura bloqueada: o dimensionamento já é automático.';
  },
});
