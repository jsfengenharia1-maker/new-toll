// Resistência ao fogo (frente N2g): ativação do estado-limite, TRRF por grupo, ocupação, revestimentos e dados por elemento.
// "remover" volta ao padrão o que o modelo guardava; só o que difere do padrão fica no arquivo.
import type { Draft } from 'immer';
import type { BuildingModel } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { divisoesOcupacao } from '../building/fogoTabelas';
import { estadoInfo } from '../building/acoes';
import type { FogoConfig, FogoElementoConfig, RevestimentoFogo } from '../building/fogo';
import { registrar } from './registry';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const CHAVES_ELEMENTO = ['trrf', 'revestimento', 'faces', 'muFi', 'compartimentadora', 'lisa'] as const;
type ElementoP = FogoElementoConfig;
type P = {
  ativo?: boolean; padrao?: boolean;
  trrf?: Record<string, number>; ocupacao?: string; altura?: number;
  revestimentos?: Record<string, RevestimentoFogo>; elementos?: Record<string, ElementoP>;
  remover?: { trrf?: string[]; revestimentos?: string[]; ocupacao?: boolean; altura?: boolean; elementos?: Record<string, string[]> };
};

const idsDeElementos = (b: BuildingModel) => new Set([...b.vigas.map((x) => x.id), ...b.pilares.map((x) => x.id), ...b.lajes.map((x) => x.id)]);
const num = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

function validarRevestimento(r: unknown): string | null {
  const x = r as Partial<RevestimentoFogo> | null;
  if (!x || typeof x !== 'object') return 'revestimento deve ser { material, espessura }';
  if (x.material !== 'cal' && x.material !== 'cimento' && x.material !== 'protetor') return 'material deve ser cal, cimento ou protetor';
  if (typeof x.espessura !== 'number' || !(x.espessura > 0) || x.espessura > 100) return 'espessura deve estar entre 0 e 100 mm';
  if (x.eficiencia !== undefined && (typeof x.eficiencia !== 'number' || !(x.eficiencia > 0) || x.eficiencia > 5)) return 'eficiência deve estar entre 0 e 5';
  return null;
}
function validarElemento(c: unknown): string | null {
  if (!c || typeof c !== 'object') return 'dados do elemento devem ser um objeto';
  for (const [k, v] of Object.entries(c)) {
    if (!(CHAVES_ELEMENTO as readonly string[]).includes(k)) return `parâmetro desconhecido: ${k}`;
    if (k === 'trrf' && !num(v, 15, 240)) return 'trrf deve estar entre 15 e 240 min';
    if (k === 'faces' && !(Number.isInteger(v) && num(v, 1, 4))) return 'faces deve ser inteiro de 1 a 4';
    if (k === 'muFi' && !num(v, 0.1, 1)) return 'muFi deve estar entre 0,1 e 1';
    if ((k === 'compartimentadora' || k === 'lisa') && typeof v !== 'boolean') return `${k} deve ser verdadeiro ou falso`;
    if (k === 'revestimento') { const e = validarRevestimento(v); if (e) return e; }
  }
  return null;
}

function limpar(d: Draft<BuildingModel>) {
  const f = d.fogo;
  if (!f) return;
  for (const k of ['trrf', 'revestimentos', 'elementos'] as const) if (f[k] && !Object.keys(f[k]!).length) delete f[k];
  if (!Object.keys(f).length) delete d.fogo;
}

registrar<P>({
  nome: 'fogo.definir',
  descricao: 'Resistência ao fogo (NBR 15200, estado-limite "incendio"): "ativo" liga a verificação (desligada por padrão); "trrf" = TRRF em minutos por id de grupo de pavimentos ({ "g_1": 60 }); "ocupacao" = divisão (ex. "A-2") para sugerir o TRRF pela altura (NBR 14432/IT, a confirmar) e "altura" (m); "revestimentos" por id de grupo e "elementos" por id de viga, pilar ou laje ({ trrf, revestimento, faces e muFi (pilares), compartimentadora e lisa (lajes) }). Revestimento = { material: cal | cimento | protetor, espessura (mm), eficiencia (só protetor) }. "remover" volta ao padrão: { trrf: [grupos], revestimentos: [grupos], ocupacao: true, altura: true, elementos: { id: [chaves] } }. "padrao": true apaga todos os dados de incêndio.',
  risco: 'escrita',
  mcp: false,
  calculo: 'detalhe',
  schema: { type: 'object', additionalProperties: false, properties: {
    ativo: { type: 'boolean' }, padrao: { type: 'boolean' },
    trrf: { type: 'object' }, ocupacao: { type: 'string', minLength: 1 }, altura: { type: 'number', minimum: 0 },
    revestimentos: { type: 'object' }, elementos: { type: 'object' },
    remover: { type: 'object', additionalProperties: false, properties: {
      trrf: { type: 'array', items: { type: 'string' } }, revestimentos: { type: 'array', items: { type: 'string' } },
      ocupacao: { type: 'boolean' }, altura: { type: 'boolean' }, elementos: { type: 'object' },
    } },
  } },
  validar(b, p) {
    const grupos = new Set(b.grupos.map((g) => g.id)), ids = idsDeElementos(b);
    for (const [g, v] of Object.entries(p.trrf ?? {})) { if (!grupos.has(g)) return err('GRUPO_INEXISTENTE', `Grupo ${g} não existe.`, [g]); if (!num(v, 15, 240)) return err('TRRF_INVALIDO', `TRRF do grupo ${g} deve estar entre 15 e 240 min.`, [g]); }
    for (const [g, v] of Object.entries(p.revestimentos ?? {})) { if (!grupos.has(g)) return err('GRUPO_INEXISTENTE', `Grupo ${g} não existe.`, [g]); const e = validarRevestimento(v); if (e) return err('REVESTIMENTO_INVALIDO', `Revestimento do grupo ${g}: ${e}.`, [g]); }
    for (const [id, c] of Object.entries(p.elementos ?? {})) { if (!ids.has(id)) return err('ELEMENTO_INEXISTENTE', `Elemento ${id} não existe (use o id de uma viga, pilar ou laje).`, [id]); const e = validarElemento(c); if (e) return err('FOGO_ELEMENTO_INVALIDO', `Elemento ${id}: ${e}.`, [id]); }
    for (const g of [...(p.remover?.trrf ?? []), ...(p.remover?.revestimentos ?? [])]) if (!grupos.has(g)) return err('GRUPO_INEXISTENTE', `Grupo ${g} não existe.`, [g]);
    for (const id of Object.keys(p.remover?.elementos ?? {})) if (!ids.has(id)) return err('ELEMENTO_INEXISTENTE', `Elemento ${id} não existe.`, [id]);
    if (p.ocupacao !== undefined && !divisoesOcupacao(b).some((x) => x.divisao.toUpperCase() === p.ocupacao!.trim().toUpperCase())) return err('OCUPACAO_DESCONHECIDA', `Divisão de ocupação "${p.ocupacao}" fora da tabela (ex.: A-2, B-1, C-2, D-1, E-1, F-8, G-1, H-3, I-2, J-3).`);
    return [];
  },
  aplicar(d, p) {
    if (p.padrao) {
      delete d.fogo;
      if (d.estados?.incendio) { delete d.estados.incendio.ativo; if (!Object.keys(d.estados.incendio).length) delete d.estados.incendio; if (!Object.keys(d.estados).length) delete d.estados; }
    }
    if (p.ativo !== undefined) {
      const atual = { ...(d.estados?.incendio ?? {}) };
      if (p.ativo === estadoInfo('incendio').ativo) delete atual.ativo; else atual.ativo = p.ativo;
      d.estados ??= {};
      if (Object.keys(atual).length) d.estados.incendio = atual; else delete d.estados.incendio;
      if (!Object.keys(d.estados).length) delete d.estados;
    }
    const f: Draft<FogoConfig> = (d.fogo ??= {});
    for (const [g, v] of Object.entries(p.trrf ?? {})) { f.trrf ??= {}; f.trrf[g] = v; }
    for (const [g, v] of Object.entries(p.revestimentos ?? {})) { f.revestimentos ??= {}; f.revestimentos[g] = { material: v.material, espessura: v.espessura, ...(v.eficiencia ? { eficiencia: v.eficiencia } : {}) }; }
    if (p.ocupacao !== undefined) f.ocupacao = p.ocupacao.trim().toUpperCase().replace(' ABERTA', ' aberta');
    if (p.altura !== undefined) f.altura = p.altura;
    for (const [id, c] of Object.entries(p.elementos ?? {})) f.elementos = { ...(f.elementos ?? {}), [id]: { ...(f.elementos?.[id] ?? {}), ...c } };
    const r = p.remover;
    if (r) {
      for (const g of r.trrf ?? []) delete f.trrf?.[g];
      for (const g of r.revestimentos ?? []) delete f.revestimentos?.[g];
      if (r.ocupacao) delete f.ocupacao;
      if (r.altura) delete f.altura;
      for (const [id, ks] of Object.entries(r.elementos ?? {})) {
        const atual: Record<string, unknown> = { ...(f.elementos?.[id] ?? {}) };
        for (const k of ks.length ? ks : Object.keys(atual)) delete atual[k];
        if (Object.keys(atual).length) f.elementos = { ...(f.elementos ?? {}), [id]: atual as ElementoP }; else delete f.elementos?.[id];
      }
    }
    limpar(d);
    const so = Object.keys(p).length === 1;
    return p.padrao && so ? 'Dados de incêndio voltaram ao padrão.' : p.ativo !== undefined && so ? `Verificação de resistência ao fogo ${p.ativo ? 'ligada' : 'desligada'}.` : 'Dados de resistência ao fogo alterados.';
  },
});
