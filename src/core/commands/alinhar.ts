// Alinhar (L9): leva a face, o eixo ou o centro de um pilar ou viga a uma referência (face de pilar ou viga, eixo de malha, linha do
// gabarito, borda de laje) por translação perpendicular a ela; com `travar`, guarda a restrição e o elemento passa a acompanhar a
// referência quando ela se move (`building/alinhamentos.ts`). O ponto fixo do pilar não muda.
import { criaCiclo, destravar, erroDoAlvo, translacaoDoAlinhamento, transladarAlvo, travar } from '../building/alinhamentos';
import { pilaresSobrepostos } from '../building/pilares';
import type { BuildingModel } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { distanciaAssinada, elementoDe, paralelas, resolverRef, type RefAlinh } from '../geom/referencias';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const cm = (v: number) => String(Math.round(v * 1000) / 10).replace('.', ',');

const refSchema: JsonSchema = { type: 'object', description: 'k = pilar {id, parte f0..f3|cx|cy} | viga {id, trecho, parte esq|eixo|dir} | eixo {id} | gabarito {mascara, camada, seg} | laje {id, aresta}', required: ['k'], properties: { k: { type: 'string', enum: ['pilar', 'viga', 'eixo', 'gabarito', 'laje'] }, id: { type: 'string' }, parte: { type: 'string' }, trecho: { type: 'integer', minimum: 0 }, mascara: { type: 'string' }, camada: { type: 'string' }, seg: { type: 'integer', minimum: 0 }, aresta: { type: 'integer', minimum: 0 } } };
const PARTES_PILAR = ['f0', 'f1', 'f2', 'f3', 'cx', 'cy'], PARTES_VIGA = ['esq', 'eixo', 'dir'];

/** Confere a forma do descritor (o schema genérico não discrimina por `k`). */
function formaRef(r: RefAlinh, papel: string): Diagnostico[] {
  const ruim = () => err('REF_INVALIDA', `${papel} inválido.`);
  switch (r.k) {
    case 'pilar': return typeof r.id === 'string' && PARTES_PILAR.includes(r.parte) ? [] : ruim();
    case 'viga': return typeof r.id === 'string' && Number.isInteger(r.trecho) && PARTES_VIGA.includes(r.parte) ? [] : ruim();
    case 'eixo': return typeof r.id === 'string' ? [] : ruim();
    case 'gabarito': return typeof r.mascara === 'string' && typeof r.camada === 'string' && Number.isInteger(r.seg) ? [] : ruim();
    case 'laje': return typeof r.id === 'string' && Number.isInteger(r.aresta) ? [] : ruim();
    default: return ruim();
  }
}

function validarPar(b: BuildingModel, ref: RefAlinh, alvo: RefAlinh, distancia: number): Diagnostico[] {
  const f = [...formaRef(ref, 'Referência'), ...formaRef(alvo, 'Elemento a alinhar')];
  if (f.length) return f;
  if (elementoDe(ref) === elementoDe(alvo)) return err('MESMO_ELEMENTO', 'A referência e o elemento a alinhar são o mesmo elemento.');
  const t = translacaoDoAlinhamento(b, ref, alvo, distancia);
  if ('erro' in t) return err('ALINHAMENTO_RECUSADO', t.erro, [elementoDe(alvo)]);
  if (alvo.k === 'pilar') {
    const q = b.pilares.find((x) => x.id === alvo.id)!;
    const sob = pilaresSobrepostos(b, { ...q, x: q.x + t.t[0], y: q.y + t.t[1] });
    if (sob.length) return err('PILAR_SOBREPOSTO', `${q.nome} ficaria sobre ${sob.map((x) => x.nome).join(', ')}.`, [q.id, ...sob.map((x) => x.id)]);
  }
  return [];
}

registrar<{ ref: RefAlinh; alvo: RefAlinh; distancia?: number; travar?: boolean }>({
  nome: 'editar.alinhar',
  descricao: 'Alinha um pilar (face f0–f3 ou eixo pelo centro cx/cy) ou uma viga (face esq/dir ou eixo de um trecho) a uma referência (face/centro de pilar, face/eixo de viga, eixo da malha, linha do gabarito ou borda de laje) por translação perpendicular a ela, até coincidir (ou ficar a `distancia` m à esquerda da referência). Recusa o elemento não paralelo à referência. Com `travar`, o elemento passa a acompanhar a referência quando ela se mover. O ponto fixo do pilar não muda.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ref', 'alvo'], properties: { ref: refSchema, alvo: refSchema, distancia: { type: 'number', minimum: -50, maximum: 50, default: 0, description: 'distância desejada (m), positiva à esquerda da referência' }, travar: { type: 'boolean', default: false } } },
  validar(b, p) {
    const e = validarPar(b, p.ref, p.alvo, p.distancia ?? 0);
    if (e.length) return e;
    if (p.travar && criaCiclo(b.restricoes ?? [], p.ref, p.alvo)) return err('TRAVA_CICLICA', 'A referência já acompanha este elemento: a trava formaria um ciclo.');
    return [];
  },
  aplicar(d, p) {
    const dist = p.distancia ?? 0;
    const t = translacaoDoAlinhamento(d as unknown as BuildingModel, p.ref, p.alvo, dist) as { t: [number, number] };
    transladarAlvo(d, p.alvo, t.t);
    if (p.travar) travar(d, p.ref, p.alvo, dist);
    const m = Math.hypot(t.t[0], t.t[1]);
    return `${m < 1e-9 ? 'Já estava alinhado' : `Alinhado (deslocamento de ${cm(m)} cm)`}${p.travar ? ' e travado' : ''}.`;
  },
});

registrar<{ ref?: RefAlinh; alvo: RefAlinh; distancia?: number; remover?: boolean }>({
  nome: 'restricao.alinhamento',
  descricao: 'Trava (cadeado) o alinhamento de um pilar ou viga à referência, na distância dada (m, à esquerda da referência; padrão: a atual): quando a referência se mover por qualquer comando, o elemento travado acompanha. Com `remover`, destrava o elemento. Não move nada por si.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['alvo'], properties: { ref: refSchema, alvo: refSchema, distancia: { type: 'number', minimum: -50, maximum: 50 }, remover: { type: 'boolean', default: false } } },
  validar(b, p) {
    const f = formaRef(p.alvo, 'Elemento');
    if (f.length) return f;
    if (p.remover) return (b.restricoes ?? []).some((r) => JSON.stringify(r.alvo) === JSON.stringify(p.alvo)) ? [] : err('SEM_TRAVA', 'O elemento não está travado.');
    if (!p.ref) return err('REF_INVALIDA', 'Informe a referência.');
    const fr = formaRef(p.ref, 'Referência');
    if (fr.length) return fr;
    if (elementoDe(p.ref) === elementoDe(p.alvo)) return err('MESMO_ELEMENTO', 'A referência e o elemento são o mesmo elemento.');
    const e = erroDoAlvo(b, p.alvo);
    if (e) return err('ALINHAMENTO_RECUSADO', e);
    const r = resolverRef(b, p.ref), a = resolverRef(b, p.alvo);
    if (!r || !a) return err('REF_INVALIDA', 'Referência ou elemento inexistente.');
    if (!paralelas(r, a)) return err('ALINHAMENTO_RECUSADO', 'O elemento não é paralelo à referência: trava recusada.');
    if (criaCiclo(b.restricoes ?? [], p.ref, p.alvo)) return err('TRAVA_CICLICA', 'A referência já acompanha este elemento: a trava formaria um ciclo.');
    return [];
  },
  aplicar(d, p) {
    if (p.remover) { destravar(d, { alvo: p.alvo }); return 'Alinhamento destravado.'; }
    const m = d as unknown as BuildingModel;
    const dist = p.distancia ?? distanciaAssinada(resolverRef(m, p.ref!)!, resolverRef(m, p.alvo)!.p);
    travar(d, p.ref!, p.alvo, dist);
    return 'Alinhamento travado.';
  },
});
