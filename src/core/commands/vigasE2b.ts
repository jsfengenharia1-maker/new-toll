// Comandos da E2b: poliviga (compor e decompor), viga comum a dois grupos (criar e desfazer) e ajuste a planos inclinados.
import type { Draft } from 'immer';
import { ajustarAoPlano, comprimentoDesenvolvido, decomporPoligonal, ehCurva, planoPor3Pontos, type PlanoInclinado } from '../building/curvas';
import { comprimentoPolilinha, type BuildingModel, type Viga } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { planoPor } from '../building/planos';
import { proximaViga } from '../building/vigas';
import { registrar } from './registry';
import type { JsonSchema } from './schema';
import { dividirCurva, unirPoligonais } from './vigas';

type P = [number, number];
const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const novoId = (d: Draft<BuildingModel>) => `v_${(++d.seq).toString(36)}`;
const viga = (b: BuildingModel, id: string) => b.vigas.find((v) => v.id === id);
const fmt = (v: number) => String(+v.toFixed(2)).replace('.', ',');
const ponto3: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: '[x, y, cota] em m' };

/** A armadura bloqueada e o detalhe editado saem quando a geometria da viga muda (o recálculo gera outra). */
function soltarArmadura(v: { armadura?: unknown; detalhe?: unknown }): string {
  const tinha = !!v.armadura || !!v.detalhe;
  delete v.armadura; delete v.detalhe;
  return tinha ? ' A armadura bloqueada saiu: a geometria mudou e o recálculo gera uma nova.' : '';
}

// ---------------------------------------------------------------- poliviga

registrar<{ ids: string[] }>({
  nome: 'viga.compor',
  descricao: 'Compõe a poliviga: reúne vigas encadeadas (retas e curvas, mesmo grupo, seção e alinhamento) numa só viga, com os trechos curvos preservados. Uma viga e um tramo de armadura. Fica o nome e o id da primeira.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 2 } } },
  validar(b, p) {
    const vs = p.ids.map((id) => viga(b, id));
    if (vs.some((v) => !v)) return err('VIGA_INEXISTENTE', 'Viga inexistente.');
    const l = vs as Viga[], v0 = l[0];
    if (new Set(p.ids).size !== p.ids.length) return err('VIGAS_REPETIDAS', 'Há vigas repetidas na lista.');
    if (l.some((v) => v.comum || v.comumDe)) return err('VIGA_COMUM_UNIR', 'Desfaça a viga comum antes de compor.', l.map((v) => v.id));
    if (l.some((v) => v.grupo !== v0.grupo || v.secao.b !== v0.secao.b || v.secao.h !== v0.secao.h || v.alinhamento !== v0.alinhamento)) return err('VIGAS_DIFERENTES', 'Só compõe vigas do mesmo grupo, seção e alinhamento.', l.map((v) => v.id));
    return encadear(l) ? [] : err('VIGAS_SEM_PONTA_COMUM', 'As vigas não formam uma cadeia contínua (cada uma precisa tocar a seguinte numa extremidade).', l.map((v) => v.id));
  },
  aplicar(d, p) {
    const l = p.ids.map((id) => d.vigas.find((x) => x.id === id)!);
    const c = encadear(l as Viga[])!;
    const v = d.vigas.find((x) => x.id === p.ids[0])!;
    v.pontos = c.pontos;
    if (c.arcos.length) v.arcos = c.arcos; else delete v.arcos;
    const aviso = soltarArmadura(v);
    const sai = new Set(p.ids.slice(1));
    d.vigas = d.vigas.filter((x) => !sai.has(x.id));
    return `${p.ids.length} vigas compostas em ${v.nome}.${aviso}`;
  },
});

/** Encadeia vigas pelas pontas comuns (a primeira fixa o sentido), com os trechos curvos; null se não formam cadeia. */
function encadear(vs: Pick<Viga, 'pontos' | 'arcos'>[]): { pontos: P[]; arcos: { ini: number; fim: number }[] } | null {
  let acc: { pontos: P[]; arcos: { ini: number; fim: number }[] } = { pontos: vs[0].pontos as P[], arcos: vs[0].arcos ?? [] };
  const resto = vs.slice(1);
  while (resto.length) {
    const i = resto.findIndex((w) => unirPoligonais(acc, w));
    if (i < 0) return null;
    acc = unirPoligonais(acc, resto[i])!;
    resto.splice(i, 1);
  }
  return acc;
}

registrar<{ id: string }>({
  nome: 'viga.decompor',
  descricao: 'Decompõe a poliviga: cada trecho curvo e cada sequência de trechos retos viram uma viga própria (a primeira fica com o id e o nome da original).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' } } },
  validar(b, p) {
    const v = viga(b, p.id);
    if (!v) return err('VIGA_INEXISTENTE', `Viga ${p.id} não existe.`);
    if (v.comum || v.comumDe) return err('VIGA_COMUM_UNIR', 'Desfaça a viga comum antes de decompor.', [v.id]);
    return decomporPoligonal(v).length < 2 ? err('VIGA_SEM_TRECHOS', `${v.nome} é um trecho só (reto ou curvo): nada a decompor.`, [v.id]) : [];
  },
  aplicar(d, p) {
    const v = d.vigas.find((x) => x.id === p.id)!;
    const partes = decomporPoligonal(v as Viga);
    const orig = JSON.parse(JSON.stringify(v)) as Viga;
    const aviso = soltarArmadura(v);
    v.pontos = partes[0].pontos;
    if (partes[0].arcos.length) v.arcos = partes[0].arcos; else delete v.arcos;
    delete v.vinculoFim; delete v.engasteFim;
    const nomes: string[] = [];
    partes.slice(1).forEach((parte, k) => {
      const nova: Viga = { ...JSON.parse(JSON.stringify(orig)), id: novoId(d), nome: `V${proximaViga(d as BuildingModel, orig.grupo)}`, pontos: parte.pontos };
      delete nova.arcos; delete nova.armadura; delete nova.detalhe; delete nova.vinculoIni; delete nova.engasteIni;
      if (parte.arcos.length) nova.arcos = parte.arcos;
      if (k < partes.length - 2) { delete nova.vinculoFim; delete nova.engasteFim; }
      d.vigas.push(nova);
      nomes.push(nova.nome);
    });
    return `${orig.nome} decomposta em ${partes.length} vigas (${[v.nome, ...nomes].join(', ')}).${aviso}`;
  },
});

// ---------------------------------------------------------------- viga comum a dois grupos

registrar<{ id: string; grupo: string; de?: number; ate?: number }>({
  nome: 'viga.comum',
  descricao: 'Torna a viga comum a dois grupos: lançada neste grupo (origem), é criada e mantida igual no grupo associado. É uma barra só no pórtico e recebe as lajes dos dois grupos; armadura e envoltórias ficam na origem. `de` e `ate` (m, ao longo da viga) limitam a parte comum: a viga é dividida e só a parte indicada vira comum (cada parte pode ser comum a um grupo diferente).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'grupo'], properties: {
    id: { type: 'string' }, grupo: { type: 'string', description: 'grupo associado' },
    de: { type: 'number', minimum: 0, description: 'início da parte comum (m)' }, ate: { type: 'number', exclusiveMinimum: 0, description: 'fim da parte comum (m)' },
  } },
  validar(b, p) {
    const v = viga(b, p.id);
    if (!v) return err('VIGA_INEXISTENTE', `Viga ${p.id} não existe.`);
    if (v.comumDe) return err('VIGA_COMUM_ASSOCIADA', `${v.nome} já é a viga associada de uma viga comum.`, [v.id]);
    if (v.comum) return err('VIGA_JA_COMUM', `${v.nome} já é comum ao grupo ${b.grupos.find((g) => g.id === v.comum!.grupo)?.nome ?? v.comum.grupo}: desfaça antes.`, [v.id]);
    if (!b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    if (p.grupo === v.grupo) return err('GRUPO_IGUAL', 'O grupo associado precisa ser outro.');
    if (v.estrutural === false) return err('VIGA_NAO_ESTRUTURAL', `${v.nome} é não estrutural: não pode ser comum.`, [v.id]);
    const L = comprimentoPolilinha(v.pontos), de = p.de ?? 0, ate = p.ate ?? L;
    if (ate > L + 1e-6 || de >= ate - 0.01) return err('TRECHO_INVALIDO', `A parte comum precisa estar entre 0 e ${fmt(L)} m, com pelo menos 1 cm.`, [v.id]);
    return [];
  },
  aplicar(d, p) {
    const v = d.vigas.find((x) => x.id === p.id)! as Viga;
    const L = comprimentoPolilinha(v.pontos as P[]), de = p.de ?? 0, ate = Math.min(p.ate ?? L, L);
    let alvo = v;
    const partes: string[] = [];
    if (ate < L - 0.005) { dividirCurva(d, v, ate); partes.push(d.vigas[d.vigas.length - 1].nome); }
    if (de > 0.005) {
      dividirCurva(d, v, de);
      alvo = d.vigas[d.vigas.length - 1] as Viga; // a parte do meio (o trecho final, se houve, foi criado antes)
      partes.unshift(alvo.nome);
    }
    alvo.comum = { grupo: p.grupo };
    const g = d.grupos.find((x) => x.id === p.grupo)?.nome ?? p.grupo;
    return `${alvo.nome} agora é comum ao grupo ${g} (${fmt(comprimentoDesenvolvido(alvo))} m)${partes.length ? `; a viga foi dividida (${partes.join(', ')})` : ''}.`;
  },
});

registrar<{ id: string }>({
  nome: 'viga.comumDesfazer',
  descricao: 'Desfaz a viga comum (a partir da origem ou da viga associada): voltam as duas vigas originais, cada uma no seu grupo, independentes.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' } } },
  validar(b, p) {
    const v = viga(b, p.id);
    if (!v) return err('VIGA_INEXISTENTE', `Viga ${p.id} não existe.`);
    return v.comum || v.comumDe ? [] : err('VIGA_NAO_COMUM', `${v.nome} não é uma viga comum.`, [v.id]);
  },
  aplicar(d, p) {
    const v = d.vigas.find((x) => x.id === p.id)!;
    const o = v.comumDe ? d.vigas.find((x) => x.id === v.comumDe)! : v;
    const w = d.vigas.find((x) => x.comumDe === o.id);
    delete o.comum;
    if (w) delete w.comumDe;
    return `Viga comum desfeita: ${o.nome}${w ? ` e ${w.nome}` : ''} voltam a ser vigas independentes.`;
  },
});

// ---------------------------------------------------------------- ajuste a planos inclinados (C6.58)

const planoSchema: JsonSchema = { type: 'object', additionalProperties: false, properties: {
  plano: { type: 'string', description: 'id de um plano da obra (E3f)' },
  pontos: { type: 'array', items: ponto3, minItems: 3, maxItems: 3, description: 'três pontos cotados [x, y, z] do plano' },
  a: { type: 'number', description: 'inclinação em x (m/m)' }, b: { type: 'number', description: 'inclinação em y (m/m)' }, c: { type: 'number', description: 'cota em x = y = 0 (m)' },
} };
type PlanoParam = { plano?: string; pontos?: [number, number, number][]; a?: number; b?: number; c?: number };
let planosObra: BuildingModel['planos'];
const planoDe = (q: PlanoParam): PlanoInclinado | null => (q.plano ? planoPor({ planos: planosObra }, q.plano)?.coef ?? null : q.pontos ? planoPor3Pontos(q.pontos) : q.a !== undefined && q.b !== undefined ? { a: q.a, b: q.b, c: q.c ?? 0 } : null);

registrar<{ id: string; modo: 'interseccao' | 'maximaDeclividade'; planos: PlanoParam[] }>({
  nome: 'viga.ajustarPlano',
  descricao: 'Ajusta a viga à interseção de dois planos inclinados (cada ponto vai à projeção da linha de interseção) ou à linha de máxima declividade do plano. Planos por três pontos cotados [x, y, z], por z = a·x + b·y + c (cotas informadas) ou pelo id de um plano da obra (`plano`, E3f).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'modo', 'planos'], properties: {
    id: { type: 'string' }, modo: { type: 'string', enum: ['interseccao', 'maximaDeclividade'] }, planos: { type: 'array', items: planoSchema, minItems: 1, maxItems: 2 },
  } },
  validar(b, p) {
    const v = viga(b, p.id);
    if (!v) return err('VIGA_INEXISTENTE', `Viga ${p.id} não existe.`);
    if (v.comumDe) return err('VIGA_COMUM_ASSOCIADA', `${v.nome} é a viga associada de uma viga comum: ajuste a origem.`, [v.id]);
    if (ehCurva(v)) return err('VIGA_CURVA_PLANO', 'O ajuste a planos inclinados vale para vigas retas e poligonais (a curva por arco não é refeita).', [v.id]);
    planosObra = b.planos;
    const planos = p.planos.map(planoDe);
    if (planos.some((q) => !q)) return err('PLANO_INVALIDO', 'Cada plano precisa de três pontos cotados não alinhados em planta, ou de a e b.');
    if (p.modo === 'interseccao' && planos.length < 2) return err('PLANO_INVALIDO', 'A interseção pede dois planos.');
    return ajustarAoPlano(v.pontos as P[], p.modo, planos as PlanoInclinado[]) ? [] : err('PLANOS_PARALELOS', p.modo === 'interseccao' ? 'Os dois planos são paralelos: não há linha de interseção.' : 'O plano é horizontal: não há linha de máxima declividade.', [v.id]);
  },
  aplicar(d, p) {
    const v = d.vigas.find((x) => x.id === p.id)!;
    planosObra = d.planos as BuildingModel['planos'];
    const novos = ajustarAoPlano(v.pontos as P[], p.modo, p.planos.map(planoDe) as PlanoInclinado[])!;
    const desloc = Math.max(...novos.map((q, i) => Math.hypot(q[0] - v.pontos[i][0], q[1] - v.pontos[i][1])));
    v.pontos = novos;
    const aviso = soltarArmadura(v);
    return `${v.nome} ajustada ${p.modo === 'interseccao' ? 'à interseção dos planos' : 'à linha de máxima declividade'} (maior deslocamento ${fmt(desloc * 100)} cm).${aviso}`;
  },
});
