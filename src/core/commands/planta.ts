// Comandos da planta: máscara (DXF de referência) e pilares.
import type { Draft } from 'immer';
import { dadosDoPilar } from '../building/pilarDados';
import { centroPilar, geoLance, inicioDe, lancesDoPilar, pavimentosOrdenados, type Ajuste, type BuildingModel, type CamadaGeo, type Mascara, type Pilar, type RegrasCamadas, type SecaoPilar, type VinculoBasePilar } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { pilaresSobrepostos, refsPilar } from '../building/pilares';
import { apoioDoPilar, nomeSobre } from '../building/transicao';
import { deslocamentoCentralizado } from '../building/lancamentoDxf';
import { atribuirTabela, nivelEdicao, tabelaInexistente } from './tabelas';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const ids: JsonSchema = { type: 'array', items: { type: 'string' }, minItems: 1 };
const fmt = (v: number) => String(+v.toFixed(3)).replace('.', ',');

// ---- máscara ----

const mascara = (b: BuildingModel, id: string) => b.mascaras.find((m) => m.id === id);
const PAPEIS_OK = ['pilar', 'pilarParede', 'vigaEixo', 'vigaFaces', 'contorno', 'abertura', 'eixo', 'pontoFixo', 'texto', 'parede', 'ignorar'];
/** Regras com papel desconhecido, camada inexistente ou parâmetro fora da faixa (null = ok). */
function regrasInvalidas(geo: Record<string, CamadaGeo>, r: RegrasCamadas): Diagnostico[] | null {
  if (!r || typeof r.papeis !== 'object') return err('REGRAS_INVALIDAS', 'Regras sem a tabela de papéis das camadas.');
  for (const [c, papel] of Object.entries(r.papeis)) {
    if (!PAPEIS_OK.includes(papel)) return err('PAPEL_INVALIDO', `Papel “${papel}” da camada “${c}” não existe.`);
    if (!geo[c]) return err('CAMADA_INEXISTENTE', `Camada “${c}” das regras não existe no gabarito.`);
  }
  for (const k of ['larguraViga', 'alturaViga', 'vigaFacesMin', 'vigaFacesMax', 'tolerancia', 'pilarMax', 'raioTexto', 'lajeH'] as const)
    if (!(typeof r[k] === 'number' && r[k] > 0)) return err('REGRAS_INVALIDAS', `Parâmetro “${k}” das regras deve ser positivo.`);
  return r.vigaFacesMin < r.vigaFacesMax ? null : err('REGRAS_INVALIDAS', 'vigaFacesMin deve ser menor que vigaFacesMax.');
}

registrar<{ grupo: string; nome: string; geo: Record<string, CamadaGeo>; escala: number; centralizar: boolean; grupos?: string[]; regras?: RegrasCamadas; arquivo?: { nome: string; tipo: 'dxf' | 'dwg' } }>({
  nome: 'mascara.importar',
  descricao: 'Importa um desenho de referência (geometria já lida do DXF ou do DWG, por camada) para a planta de um grupo de pavimentos. `escala` = metros por unidade do desenho; `centralizar` leva o canto inferior esquerdo à origem; `grupos` associa a vista a outros grupos; `regras` guarda os papéis das camadas para o lançamento automático; `arquivo` registra o nome e o formato de origem.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['grupo', 'nome', 'geo', 'escala'], properties: {
    grupo: { type: 'string' }, nome: { type: 'string', minLength: 1 },
    geo: { type: 'object', description: 'camada → {linhas: [x1,y1,x2,y2,...], arcos: [cx,cy,r,a0,a1,...], textos: [{x,y,h,rot,t}]}' },
    escala: { type: 'number', exclusiveMinimum: 0, description: 'm por unidade (mm: 0,001; cm: 0,01; m: 1)' },
    centralizar: { type: 'boolean', default: true },
    grupos: { type: 'array', items: { type: 'string' }, description: 'outros grupos em que a vista aparece' },
    regras: { type: 'object', description: 'RegrasCamadas (src/core/building/types.ts)' },
    arquivo: { type: 'object', additionalProperties: false, required: ['nome', 'tipo'], properties: { nome: { type: 'string' }, tipo: { type: 'string', enum: ['dxf', 'dwg'] } } },
  } },
  validar(b, p) {
    if (!b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    const sem = (p.grupos ?? []).filter((g) => !b.grupos.some((x) => x.id === g));
    if (sem.length) return err('GRUPO_INEXISTENTE', `Grupo ${sem.join(', ')} não existe.`);
    const rg = p.regras ? regrasInvalidas(p.geo, p.regras) : null;
    if (rg) return rg;
    const ruim = Object.entries(p.geo).find(([, c]) => !c || !Array.isArray(c.linhas) || !Array.isArray(c.arcos) || !Array.isArray(c.textos) || c.linhas.length % 4 || c.arcos.length % 5);
    if (ruim) return err('GEOMETRIA_INVALIDA', `Camada “${ruim[0]}” com geometria inválida.`);
    return Object.keys(p.geo).length ? [] : err('GEOMETRIA_VAZIA', 'O desenho não tem entidades lidas.');
  },
  aplicar(d, p) {
    const { dx, dy } = p.centralizar ? deslocamentoCentralizado(p.geo, p.escala) : { dx: 0, dy: 0 };
    const extras = [...new Set(p.grupos ?? [])].filter((g) => g !== p.grupo);
    d.mascaras.push({
      id: novoId(d, 'm'), nome: p.nome.trim(), grupo: p.grupo, escala: p.escala, rotacao: 0, dx, dy,
      camadas: Object.keys(p.geo).sort().map((nome) => ({ nome, visivel: true, capturavel: true })),
      geo: p.geo,
      ...(extras.length ? { grupos: extras } : {}), ...(p.regras ? { regras: p.regras } : {}), ...(p.arquivo ? { arquivo: p.arquivo } : {}),
      original: { escala: p.escala, rotacao: 0, dx, dy },
    });
    return `Máscara “${p.nome.trim()}” importada (${Object.keys(p.geo).length} camada(s)).`;
  },
});

registrar<{ id: string; de: [number, number][]; para: [number, number][]; escalar: boolean }>({
  nome: 'mascara.alinhar',
  descricao: 'Alinha a máscara por dois pares de pontos: os pontos `de` (posição atual no mundo) vão para `para`. Gira e desloca; com `escalar`, também ajusta a escala.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'de', 'para'], properties: {
    id: { type: 'string' }, de: { type: 'array', items: ponto, minItems: 2, maxItems: 2 }, para: { type: 'array', items: ponto, minItems: 2, maxItems: 2 },
    escalar: { type: 'boolean', default: false },
  } },
  validar(b, p) {
    if (!mascara(b, p.id)) return err('MASCARA_INEXISTENTE', `Máscara ${p.id} não existe.`);
    const L = (q: [number, number][]) => Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]);
    return L(p.de) < 1e-6 || L(p.para) < 1e-6 ? err('PONTOS_COINCIDENTES', 'Os dois pontos de cada par devem ser distintos.') : [];
  },
  aplicar(d, p) {
    const m = d.mascaras.find((x) => x.id === p.id)!;
    const [a1, a2] = p.de, [b1, b2] = p.para;
    const phi = Math.atan2(b2[1] - b1[1], b2[0] - b1[0]) - Math.atan2(a2[1] - a1[1], a2[0] - a1[0]);
    const k = p.escalar ? Math.hypot(b2[0] - b1[0], b2[1] - b1[1]) / Math.hypot(a2[0] - a1[0], a2[1] - a1[1]) : 1;
    const c = Math.cos(phi), s = Math.sin(phi), ux = m.dx - a1[0], uy = m.dy - a1[1];
    m.dx = k * (c * ux - s * uy) + b1[0];
    m.dy = k * (s * ux + c * uy) + b1[1];
    m.rotacao = +(m.rotacao + (phi * 180) / Math.PI).toFixed(9);
    m.escala *= k;
    return `Máscara “${m.nome}” alinhada${p.escalar ? ` (escala × ${fmt(k)})` : ''}.`;
  },
});

registrar<{ id: string; nome?: string; escala?: number; rotacao?: number; dx?: number; dy?: number; grupos?: string[]; visivel?: boolean }>({
  nome: 'mascara.editar',
  descricao: 'Altera nome, escala (m por unidade), rotação (graus), deslocamento (m), grupos em que a vista aparece (o primeiro é o principal) ou se está ligada na planta (`visivel`).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, escala: { type: 'number', exclusiveMinimum: 0 },
    rotacao: { type: 'number' }, dx: { type: 'number' }, dy: { type: 'number' },
    grupos: { type: 'array', items: { type: 'string' }, minItems: 1, description: 'todos os grupos da vista; o primeiro é o principal' },
    visivel: { type: 'boolean', description: 'vista ligada (padrão) ou desligada na planta' },
  } },
  validar(b, p) {
    if (!mascara(b, p.id)) return err('MASCARA_INEXISTENTE', `Máscara ${p.id} não existe.`);
    const sem = (p.grupos ?? []).filter((g) => !b.grupos.some((x) => x.id === g));
    return sem.length ? err('GRUPO_INEXISTENTE', `Grupo ${sem.join(', ')} não existe.`) : [];
  },
  aplicar(d, p) {
    const m = d.mascaras.find((x) => x.id === p.id)!;
    for (const k of ['nome', 'escala', 'rotacao', 'dx', 'dy'] as const) if (p[k] !== undefined) (m as Record<string, unknown>)[k] = k === 'nome' ? String(p[k]).trim() : p[k];
    if (p.grupos) { const l = [...new Set(p.grupos)]; m.grupo = l[0]; if (l.length > 1) m.grupos = l.slice(1); else delete m.grupos; }
    if (p.visivel !== undefined) { if (p.visivel) delete m.visivel; else m.visivel = false; }
    return `Máscara “${m.nome}” alterada.`;
  },
});

registrar<{ id: string; camadas: string[]; visivel?: boolean; capturavel?: boolean; apelido?: string; cor?: string; espessura?: number; textos?: boolean }>({
  nome: 'mascara.camadas',
  descricao: 'Liga/desliga a visibilidade e a captura de camadas da máscara; também o apelido (vazio remove), a cor (vazio volta à automática), a espessura de linha (px; 0 volta à automática) e a exibição só dos textos da camada.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'camadas'], properties: {
    id: { type: 'string' }, camadas: ids, visivel: { type: 'boolean' }, capturavel: { type: 'boolean' },
    apelido: { type: 'string' }, cor: { type: 'string' }, espessura: { type: 'number', minimum: 0, maximum: 20 }, textos: { type: 'boolean' },
  } },
  validar(b, p) {
    const m = mascara(b, p.id);
    if (!m) return err('MASCARA_INEXISTENTE', `Máscara ${p.id} não existe.`);
    const falta = p.camadas.filter((c) => !m.camadas.some((x) => x.nome === c));
    return falta.length ? err('CAMADA_INEXISTENTE', `Camada(s) inexistente(s): ${falta.join(', ')}.`) : [];
  },
  aplicar(d, p) {
    const m = d.mascaras.find((x) => x.id === p.id)!;
    for (const c of m.camadas) if (p.camadas.includes(c.nome)) {
      if (p.visivel !== undefined) c.visivel = p.visivel;
      if (p.capturavel !== undefined) c.capturavel = p.capturavel;
      if (p.apelido !== undefined) { if (p.apelido.trim()) c.apelido = p.apelido.trim(); else delete c.apelido; }
      if (p.cor !== undefined) { if (p.cor.trim()) c.cor = p.cor.trim(); else delete c.cor; }
      if (p.espessura !== undefined) { if (p.espessura > 0) c.espessura = p.espessura; else delete c.espessura; }
      if (p.textos !== undefined) { if (p.textos) delete c.textos; else c.textos = false; }
    }
    return `${p.camadas.length} camada(s) alterada(s).`;
  },
});

registrar<{ id: string }>({
  nome: 'mascara.remover',
  descricao: 'Remove a máscara.',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' } } },
  validar: (b, p) => (mascara(b, p.id) ? [] : err('MASCARA_INEXISTENTE', `Máscara ${p.id} não existe.`)),
  aplicar(d, p) { d.mascaras = d.mascaras.filter((m) => m.id !== p.id); return 'Máscara removida.'; },
});

registrar<{ id: string; grupos: string[]; nome?: string }>({
  nome: 'mascara.copiar',
  descricao: 'Copia a vista (camadas, escala e origem) para outros grupos de pavimentos: uma vista nova e independente para cada grupo informado, com a mesma geometria, configuração de camadas e regras.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'grupos'], properties: {
    id: { type: 'string' }, grupos: { type: 'array', items: { type: 'string' }, minItems: 1 }, nome: { type: 'string', minLength: 1, description: 'padrão: nome da vista + nome do grupo' },
  } },
  validar(b, p) {
    if (!mascara(b, p.id)) return err('MASCARA_INEXISTENTE', `Máscara ${p.id} não existe.`);
    const sem = p.grupos.filter((g) => !b.grupos.some((x) => x.id === g));
    return sem.length ? err('GRUPO_INEXISTENTE', `Grupo ${sem.join(', ')} não existe.`) : [];
  },
  aplicar(d, p) {
    const m = d.mascaras.find((x) => x.id === p.id)!;
    const copia = JSON.parse(JSON.stringify({ ...m, geo: undefined })) as Mascara;
    for (const g of [...new Set(p.grupos)]) {
      const nome = p.nome?.trim() ? (p.grupos.length > 1 ? `${p.nome.trim()} (${d.grupos.find((x) => x.id === g)?.nome ?? g})` : p.nome.trim()) : `${m.nome} (${d.grupos.find((x) => x.id === g)?.nome ?? g})`;
      const { grupos: _g, ...resto } = copia;
      d.mascaras.push({ ...resto, id: novoId(d, 'm'), nome, grupo: g, geo: m.geo });
    }
    return `Vista “${m.nome}” copiada para ${new Set(p.grupos).size} grupo(s).`;
  },
});

registrar<{ id: string; regras: RegrasCamadas }>({
  nome: 'mascara.regras',
  descricao: 'Define as regras do lançamento por camada do gabarito: papel de cada camada (pilar, pilarParede, vigaEixo, vigaFaces, contorno, abertura, eixo, pontoFixo, texto, parede, ignorar) e os parâmetros (largura e altura das vigas, afastamento das faces, tolerância, maior pilar, raio dos textos, espessura das lajes).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'regras'], properties: { id: { type: 'string' }, regras: { type: 'object', description: 'RegrasCamadas (src/core/building/types.ts)' } } },
  validar(b, p) {
    const m = mascara(b, p.id);
    return m ? regrasInvalidas(m.geo, p.regras) ?? [] : err('MASCARA_INEXISTENTE', `Máscara ${p.id} não existe.`);
  },
  aplicar(d, p) { const m = d.mascaras.find((x) => x.id === p.id)!; m.regras = p.regras; return `Regras de lançamento da máscara “${m.nome}” definidas.`; },
});

registrar<{ id: string }>({
  nome: 'mascara.origemOriginal',
  descricao: 'Volta escala, rotação e deslocamento da máscara aos da importação, desfazendo todas as mudanças de origem (alinhar, girar, deslocar).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' } } },
  validar(b, p) {
    const m = mascara(b, p.id);
    if (!m) return err('MASCARA_INEXISTENTE', `Máscara ${p.id} não existe.`);
    return m.original ? [] : err('SEM_ORIGEM_ORIGINAL', 'A máscara não guardou a origem da importação (arquivo antigo).');
  },
  aplicar(d, p) { const m = d.mascaras.find((x) => x.id === p.id)!; Object.assign(m, m.original); return `Máscara “${m.nome}” voltou à origem da importação.`; },
});

registrar<{ id: string; configuracao: { versao: 1; camadas: { nome: string; visivel: boolean; capturavel: boolean; cor?: string; apelido?: string; espessura?: number; textos?: boolean }[]; regras?: RegrasCamadas } }>({
  nome: 'mascara.configurar',
  descricao: 'Aplica à máscara uma configuração de camadas salva em arquivo (.json): visibilidade, captura, cor, apelido, espessura e textos por camada, e as regras de lançamento. Camadas que o gabarito não tem são ignoradas.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'configuracao'], properties: { id: { type: 'string' }, configuracao: { type: 'object', description: 'ConfiguracaoCamadas (lancamentoDxf.ts)' } } },
  validar(b, p) {
    const m = mascara(b, p.id);
    if (!m) return err('MASCARA_INEXISTENTE', `Máscara ${p.id} não existe.`);
    const c = p.configuracao;
    if (!c || c.versao !== 1 || !Array.isArray(c.camadas)) return err('CONFIGURACAO_INVALIDA', 'Configuração de camadas inválida (versão 1 esperada).');
    if (c.regras) {
      const r = { ...c.regras, papeis: Object.fromEntries(Object.entries(c.regras.papeis ?? {}).filter(([n]) => m.geo[n])) };
      return regrasInvalidas(m.geo, r) ?? [];
    }
    return [];
  },
  aplicar(d, p) {
    const m = d.mascaras.find((x) => x.id === p.id)!;
    let n = 0;
    for (const e of p.configuracao.camadas) {
      const c = m.camadas.find((x) => x.nome === e.nome);
      if (!c) continue;
      c.visivel = e.visivel; c.capturavel = e.capturavel;
      for (const k of ['cor', 'apelido', 'espessura'] as const) { if (e[k] !== undefined) (c as Record<string, unknown>)[k] = e[k]; else delete c[k]; }
      if (e.textos === false) c.textos = false; else delete c.textos;
      n++;
    }
    if (p.configuracao.regras) m.regras = { ...p.configuracao.regras, papeis: Object.fromEntries(Object.entries(p.configuracao.regras.papeis).filter(([nome]) => m.geo[nome])) };
    return `Configuração aplicada a ${n} camada(s) da máscara “${m.nome}”.`;
  },
});

// ---- pilares ----

const secaoSchema: JsonSchema = { oneOf: [
  { type: 'object', additionalProperties: false, required: ['tipo', 'b', 'h'], properties: { tipo: { const: 'ret' }, b: { type: 'number', exclusiveMinimum: 0, maximum: 5, description: 'm (local x)' }, h: { type: 'number', exclusiveMinimum: 0, maximum: 5, description: 'm (local y)' } } },
  { type: 'object', additionalProperties: false, required: ['tipo', 'd'], properties: { tipo: { const: 'circ' }, d: { type: 'number', exclusiveMinimum: 0, maximum: 5, description: 'diâmetro (m)' } } },
], description: 'Seção: {tipo: "ret", b, h} ou {tipo: "circ", d}, em m' };
const ajusteSchema: JsonSchema = { type: 'string', enum: ['c', 'n', 's', 'l', 'o', 'ne', 'no', 'se', 'so'], description: 'Ponto fixo: centro, faces (n, s, l, o) ou cantos' };

type PilarIn = { x?: number; y?: number; secao?: SecaoPilar; copiarDe?: string; incluirCargas?: boolean; ajuste?: Ajuste; angulo?: number; nasce?: string; morre?: string; nome?: string; inicio?: 'fundacao' | 'apoiado'; sobre?: { pilar: string; dx?: number; dy?: number } };

const proximoNumero = (b: BuildingModel) => Math.max(0, ...b.pilares.map((p) => { const m = /^P(\d+)$/.exec(p.nome); return m ? +m[1] : 0; })) + 1;

const sobreSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['pilar'], properties: {
  pilar: { type: 'string', description: 'pilar de baixo (o novo nasce no pavimento em que ele morre)' },
  dx: { type: 'number', description: 'm, em x, a partir do ponto fixo do pilar de baixo (padrão 0)' }, dy: { type: 'number', description: 'm, em y' },
}, description: 'Pilar que nasce sobre outro: x, y relativos ao ponto fixo do pilar de baixo no último lance; nasce, ponto fixo e ângulo herdados dele quando omitidos' };

/** Pilar resolvido a partir dos parâmetros (posição relativa ao pilar de baixo, nascimento herdado), ou o erro. */
function resolverPilar(b: BuildingModel, p: PilarIn): { novo: Pilar } | { erro: Diagnostico[] } {
  let baixo: Pilar | undefined;
  const fonte = p.copiarDe ? b.pilares.find((q) => q.id === p.copiarDe) : undefined;
  if (p.copiarDe && !fonte) return { erro: err('PILAR_INEXISTENTE', `Pilar ${p.copiarDe} não existe.`) };
  const dados = fonte ? dadosDoPilar(fonte) : {};
  const secao = p.secao ?? dados.secao;
  if (!secao) return { erro: err('SECAO', 'Informe a seção ou o pilar de que copiar os dados (`copiarDe`).') };
  if (p.sobre) {
    baixo = b.pilares.find((q) => q.id === p.sobre!.pilar);
    if (!baixo) return { erro: err('PILAR_INEXISTENTE', `Pilar ${p.sobre.pilar} não existe.`) };
  } else if (p.x === undefined || p.y === undefined) return { erro: err('POSICAO', 'Informe x e y, ou `sobre` (pilar de baixo).') };
  const ref = baixo ? geoLance(baixo, lancesDoPilar(b, baixo).at(-1)?.id ?? '').p : undefined;
  const nasce = p.nasce ?? baixo?.morre ?? dados.nasce ?? 'fundacao';
  const morre = p.morre ?? dados.morre ?? pavimentosOrdenados(b).at(-1)?.id ?? '';
  const x = p.x ?? ref!.x + (p.sobre!.dx ?? 0), y = p.y ?? ref!.y + (p.sobre!.dy ?? 0);
  const novo: Pilar = { id: '?', nome: '?', x, y, angulo: p.angulo ?? baixo?.angulo ?? dados.angulo ?? 0, ajuste: p.ajuste ?? baixo?.ajuste ?? dados.ajuste ?? 'c', nasce, morre, secao, ...(p.inicio ? { inicio: p.inicio } : {}) };
  if (fonte) {
    // dados por lance só valem nos lances do pilar novo; cobrimento e tabela vêm como estão
    const ls = new Set(lancesDoPilar(b, novo).map((l) => l.id));
    for (const k of ['secoes', 'fck', 'engastes', 'flambagem', 'apoiosIntermediarios'] as const) {
      const v = (dados[k] as { pavimento: string }[] | undefined)?.filter((e) => ls.has(e.pavimento));
      if (v?.length) (novo as unknown as Record<string, unknown>)[k] = v;
    }
    if (dados.cobrimento !== undefined) novo.cobrimento = dados.cobrimento;
    if (dados.tabela !== undefined) novo.tabela = dados.tabela;
  }
  if (novo.inicio === 'apoiado' && nasce === 'fundacao') return { erro: err('PILAR_INICIO', 'Pilar que nasce na fundação não pode ser apoiado em outro elemento.') };
  if (novo.inicio && inicioDe({ nasce, inicio: undefined }) === novo.inicio) delete novo.inicio; // igual ao padrão: não grava
  return { novo };
}

registrar<PilarIn>({
  nome: 'pilar.inserir',
  descricao: 'Insere um pilar no ponto (x, y) do ponto fixo, com seção, ângulo e os pavimentos em que nasce (padrão: fundação) e morre (padrão: o mais alto). Arranque (pilar de altura zero, só para levar cargas à fundação): nasce e morre "fundacao"; vale mesmo sem pavimentos. Pilar que nasce sobre outro pilar, viga ou laje (transição): nasce no pavimento do elemento de apoio; `sobre` dá x, y relativos ao pilar de baixo e herda dele nascimento, ponto fixo e ângulo; o nome automático é o do pilar de baixo mais uma letra (P5a). `inicio` "fundacao" num pavimento acima da fundação dá vínculo externo (sem apoio embaixo).',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, properties: {
    x: { type: 'number' }, y: { type: 'number' }, secao: secaoSchema,
    copiarDe: { type: 'string', description: 'id de um pilar existente de que copiar seção, ângulo, ponto fixo, nascimento, morte, seções por lance, engastes, flambagem, fck, travamentos, cobrimento e tabela (L4); o que for informado junto prevalece' },
    incluirCargas: { type: 'boolean', description: 'com copiarDe: leva também as cargas do pilar de origem (horizontais e do topo) nos lances do novo' }, ajuste: { ...ajusteSchema, description: 'Ponto fixo: centro (padrão), faces (n, s, l, o) ou cantos; herdado do pilar de baixo com `sobre`' },
    angulo: { type: 'number', description: 'graus, anti-horário (padrão 0)' },
    nasce: { type: 'string', description: '"fundacao" (padrão) ou id do pavimento' },
    morre: { type: 'string', description: 'id do pavimento mais alto; padrão: o mais alto da obra; "fundacao" (com nasce "fundacao") = arranque' },
    nome: { type: 'string', minLength: 1, description: 'padrão: próximo P<n> (ou o do pilar de baixo + letra)' },
    inicio: { type: 'string', enum: ['fundacao', 'apoiado'], description: 'início do pilar que nasce acima da fundação: apoiado (padrão, sem vínculo externo) ou fundacao (vínculo externo)' },
    sobre: sobreSchema,
  } },
  validar(b, p) {
    const r = resolverPilar(b, p);
    if ('erro' in r) return r.erro;
    const ref = refsPilar(b, r.novo.nasce, r.novo.morre);
    if (ref.length) return ref;
    const sob = pilaresSobrepostos(b, r.novo);
    return sob.length ? err('PILAR_SOBREPOSTO', `A seção se sobrepõe a ${sob.map((q) => q.nome).join(', ')}.`, sob.map((q) => q.id)) : [];
  },
  aplicar(d, p) {
    const { novo } = resolverPilar(d as BuildingModel, p) as { novo: Pilar };
    const ap = inicioDe(novo) === 'apoiado' && novo.nasce !== 'fundacao' ? apoioDoPilar(d as BuildingModel, novo) : null;
    const baixo = ap?.tipo === 'pilar' ? (d as BuildingModel).pilares.find((q) => q.id === ap.principal) : undefined;
    const nome = p.nome?.trim() || (baixo ? nomeSobre(d as BuildingModel, baixo) : `P${proximoNumero(d as BuildingModel)}`);
    const id = novoId(d, 'p');
    d.pilares.push({ ...novo, id, nome, secao: { ...novo.secao } });
    if (p.incluirCargas && p.copiarDe) {
      const ls = new Set(lancesDoPilar(d as BuildingModel, novo).map((l) => l.id));
      for (const c of (d.cargasPilar ?? []).filter((x) => x.pilar === p.copiarDe && ls.has(x.pavimento))) (d.cargasPilar ??= []).push({ ...JSON.parse(JSON.stringify(c)), id: novoId(d, 'cp'), pilar: id });
    }
    return `${nome} inserido em (${fmt(novo.x)}; ${fmt(novo.y)}).`;
  },
});

registrar<{ id: string } & Partial<Omit<PilarIn, 'nome' | 'sobre'>> & { nome?: string; cobrimento?: number; tabela?: string }>({
  nome: 'pilar.editar',
  descricao: 'Altera nome, posição do ponto fixo, seção (de todos os lances sem seção própria), ponto fixo, ângulo, nascimento, morte, início (apoiado em outro elemento ou na fundação, com vínculo externo) ou cobrimento próprio (cm) de um pilar.',
  risco: 'escrita',
  calculo: (p) => nivelEdicao(p, ['tabela', 'cobrimento'], 'secao'),
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, x: { type: 'number' }, y: { type: 'number' }, secao: secaoSchema,
    ajuste: ajusteSchema, angulo: { type: 'number' }, nasce: { type: 'string' }, morre: { type: 'string' },
    inicio: { type: 'string', enum: ['fundacao', 'apoiado'], description: 'apoiado: nasce sobre pilar, viga ou laje, sem vínculo externo; fundacao: vínculo externo no pavimento em que nasce' },
    cobrimento: { type: 'number', minimum: 0, maximum: 10, description: 'cm; 0 volta ao da obra' },
    tabela: { type: 'string', description: 'id da tabela de armadura dos pilares (R7a); "padrao" ou vazio volta à padrão da obra' },
  } },
  validar(b, p) {
    const q = b.pilares.find((x) => x.id === p.id);
    if (!q) return err('PILAR_INEXISTENTE', `Pilar ${p.id} não existe.`);
    const tab = tabelaInexistente(b, [['pilares', p.tabela]]);
    if (tab.length) return tab;
    const n: Pilar = { ...q, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) } as Pilar;
    const r = refsPilar(b, n.nasce, n.morre);
    if (r.length) return r;
    if (n.inicio === 'apoiado' && n.nasce === 'fundacao') return err('PILAR_INICIO', 'Pilar que nasce na fundação não pode ser apoiado em outro elemento.', [q.id]);
    const sob = pilaresSobrepostos(b, n);
    return sob.length ? err('PILAR_SOBREPOSTO', `A seção se sobrepõe a ${sob.map((x) => x.nome).join(', ')}.`, sob.map((x) => x.id)) : [];
  },
  aplicar(d, p) {
    const q = d.pilares.find((x) => x.id === p.id)!;
    for (const k of ['nome', 'x', 'y', 'ajuste', 'angulo', 'nasce', 'morre'] as const) if (p[k] !== undefined) (q as Record<string, unknown>)[k] = k === 'nome' ? String(p[k]).trim() : p[k];
    let aviso = '';
    if (p.secao) {
      // lances sem seção própria passam à seção nova: a armadura bloqueada deles sai e o recálculo gera a nova (K1.11.27)
      const propria = new Set((q.secoes ?? []).map((x) => x.pavimento));
      const mudou = JSON.stringify(q.secao) !== JSON.stringify(p.secao);
      if (mudou && q.armaduras?.length) {
        const ficam = q.armaduras.filter((x) => propria.has(x.pavimento));
        if (ficam.length !== q.armaduras.length) { aviso = ' A armadura bloqueada dos lances com a seção geral saiu: a seção mudou e o recálculo gera uma nova.'; if (ficam.length) q.armaduras = ficam; else delete q.armaduras; }
      }
      q.secao = { ...p.secao };
    }
    if (p.inicio !== undefined) { if (p.inicio === inicioDe({ nasce: q.nasce })) delete q.inicio; else q.inicio = p.inicio; }
    if (q.nasce === 'fundacao') delete q.inicio;
    if (p.cobrimento !== undefined) { if (p.cobrimento) q.cobrimento = p.cobrimento; else delete q.cobrimento; }
    atribuirTabela(q, 'tabela', p.tabela);
    return `${q.nome} alterado.${aviso}`;
  },
});

registrar<{ ids: string[]; pavimentos?: string[]; au?: number; av?: number }>({
  nome: 'pilar.flambagem',
  descricao: 'Define o α de flambagem dos lances de pilares por direção (au: deslocamento ao longo de b; av: ao longo de h): ℓe = mín(ℓ0 + h; ℓ) × α do pavimento × α do lance (NBR 6118, 15.6). Pilar destravado por vários pavimentos: α > 1. Sem `pavimentos`, vale para todos os lances; 1 volta ao padrão.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: {
    ids: { type: 'array', items: { type: 'string' }, minItems: 1 }, pavimentos: { type: 'array', items: { type: 'string' }, minItems: 1 },
    au: { type: 'number', minimum: 0.1, maximum: 10 }, av: { type: 'number', minimum: 0.1, maximum: 10 },
  } },
  validar(b, p) {
    const sp = p.ids.filter((id) => !b.pilares.some((x) => x.id === id)), sv = (p.pavimentos ?? []).filter((id) => !b.pavimentos.some((x) => x.id === id));
    if (sp.length) return err('PILAR_INEXISTENTE', `Pilar ${sp.join(', ')} não existe.`);
    if (sv.length) return err('PAVIMENTO_INEXISTENTE', `Pavimento ${sv.join(', ')} não existe.`);
    return p.au === undefined && p.av === undefined ? err('SEM_VALOR', 'Informe au e/ou av.') : [];
  },
  aplicar(d, p) {
    let n = 0;
    for (const id of p.ids) {
      const q = d.pilares.find((x) => x.id === id)!;
      for (const pav of lancesDoPilar(d as BuildingModel, q as Pilar).map((x) => x.id).filter((x) => !p.pavimentos || p.pavimentos.includes(x))) {
        q.flambagem ??= [];
        let e = q.flambagem.find((x) => x.pavimento === pav);
        if (!e) { e = { pavimento: pav }; q.flambagem.push(e); }
        for (const k of ['au', 'av'] as const) if (p[k] !== undefined) { if (p[k] === 1) delete e[k]; else e[k] = p[k]; }
        n++;
      }
      q.flambagem = q.flambagem?.filter((e) => e.au !== undefined || e.av !== undefined);
      if (!q.flambagem?.length) delete q.flambagem;
    }
    return `Flambagem de ${n} lance(s) de pilar alterada.`;
  },
});

registrar<{ ids: string[]; pavimentos?: string[]; topo?: number; base?: number }>({
  nome: 'pilar.engaste',
  descricao: 'Define os coeficientes de engaste dos lances de pilares (0 = rótula, 1 = engaste) no topo e/ou na base. O lance é o que chega ao pavimento indicado; sem `pavimentos`, vale para todos os lances. No topo do último lance multiplica o engaste das opções de cálculo.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: {
    ids: { type: 'array', items: { type: 'string' }, minItems: 1 }, pavimentos: { type: 'array', items: { type: 'string' }, minItems: 1 },
    topo: { type: 'number', minimum: 0, maximum: 1 }, base: { type: 'number', minimum: 0, maximum: 1 },
  } },
  validar(b, p) {
    const sp = p.ids.filter((id) => !b.pilares.some((x) => x.id === id)), sv = (p.pavimentos ?? []).filter((id) => !b.pavimentos.some((x) => x.id === id));
    if (sp.length) return err('PILAR_INEXISTENTE', `Pilar ${sp.join(', ')} não existe.`);
    if (sv.length) return err('PAVIMENTO_INEXISTENTE', `Pavimento ${sv.join(', ')} não existe.`);
    return p.topo === undefined && p.base === undefined ? err('SEM_VALOR', 'Informe topo e/ou base.') : [];
  },
  aplicar(d, p) {
    let n = 0;
    for (const id of p.ids) {
      const q = d.pilares.find((x) => x.id === id)!;
      const lances = lancesDoPilar(d as BuildingModel, q as Pilar).map((x) => x.id).filter((x) => !p.pavimentos || p.pavimentos.includes(x));
      for (const pav of lances) {
        q.engastes ??= [];
        let e = q.engastes.find((x) => x.pavimento === pav);
        if (!e) { e = { pavimento: pav }; q.engastes.push(e); }
        for (const k of ['topo', 'base'] as const) if (p[k] !== undefined) { if (p[k] === 1) delete e[k]; else e[k] = p[k]; }
        n++;
      }
      q.engastes = q.engastes?.filter((e) => e.topo !== undefined || e.base !== undefined);
      if (!q.engastes?.length) delete q.engastes;
    }
    return `Engaste de ${n} lance(s) de pilar alterado.`;
  },
});

registrar<{ ids: string[]; base?: VinculoBasePilar; cotaBase?: number; cotaFundacao?: boolean; apoio?: { pavimento: string; altura: number; direcao?: 'u' | 'v' } }>({
  nome: 'pilar.vinculo',
  calculo: true, // entra na análise (molas, cota da base, cargas no modelo de cálculo)
  descricao: 'Vínculo externo e desnível dos pilares (N2c). `base`: engaste (padrão), rotula (giros de flexão livres) ou molas com kx, ky, kz (kN/m) e krx, kry, krz (kN·m/rad) em eixos globais (gdl ausente = preso, 0 = livre). `cotaBase`: cota própria do pé (m; só pilares que nascem na fundação); `cotaFundacao: true` volta à cota da fundação. `apoio`: travamento intermediário no lance que chega ao `pavimento`, a `altura` m da base (0 remove), numa direção (u ao longo de b, v ao longo de h) ou nas duas.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: {
    ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
    base: { type: 'object', additionalProperties: false, required: ['tipo'], properties: {
      tipo: { type: 'string', enum: ['engaste', 'rotula', 'molas'] },
      kx: { type: 'number', minimum: 0 }, ky: { type: 'number', minimum: 0 }, kz: { type: 'number', minimum: 0 }, krx: { type: 'number', minimum: 0 }, kry: { type: 'number', minimum: 0 }, krz: { type: 'number', minimum: 0 },
    } },
    cotaBase: { type: 'number' }, cotaFundacao: { type: 'boolean' },
    apoio: { type: 'object', additionalProperties: false, required: ['pavimento', 'altura'], properties: { pavimento: { type: 'string' }, altura: { type: 'number', minimum: 0 }, direcao: { type: 'string', enum: ['u', 'v'] } } },
  } },
  validar(b, p) {
    const sp = p.ids.filter((id) => !b.pilares.some((x) => x.id === id));
    if (sp.length) return err('PILAR_INEXISTENTE', `Pilar ${sp.join(', ')} não existe.`);
    if (p.base === undefined && p.cotaBase === undefined && !p.cotaFundacao && !p.apoio) return err('SEM_VALOR', 'Informe base, cotaBase e/ou apoio.');
    const qs = p.ids.map((id) => b.pilares.find((x) => x.id === id)!);
    if (((p.base && p.base.tipo !== 'engaste') || p.cotaBase !== undefined) && qs.some((q) => q.nasce !== 'fundacao')) return err('PILAR_SEM_BASE', 'Vínculo externo e cota da base valem só para pilares que nascem na fundação.');
    if (p.cotaBase !== undefined) {
      const ps = pavimentosOrdenados(b);
      if (ps.length && p.cotaBase >= ps[0].cota) return err('COTA_INVALIDA', `A cota da base deve ficar abaixo do primeiro pavimento (${ps[0].cota} m).`);
    }
    if (p.base?.tipo === 'molas' && ![p.base.kx, p.base.ky, p.base.kz, p.base.krx, p.base.kry, p.base.krz].some((k) => k !== undefined)) return err('SEM_VALOR', 'Molas: informe a rigidez de ao menos um gdl (os ausentes ficam presos).');
    if (p.apoio) {
      const ap = p.apoio, falta = qs.filter((q) => !lancesDoPilar(b, q).some((x) => x.id === ap.pavimento));
      if (falta.length) return err('LANCE_INEXISTENTE', `${falta.map((q) => q.nome).join(', ')} sem lance chegando a ${ap.pavimento}.`);
    }
    return [];
  },
  aplicar(d, p) {
    for (const id of p.ids) {
      const q = d.pilares.find((x) => x.id === id)!;
      if (p.base) { if (p.base.tipo === 'engaste') delete q.vinculoBase; else q.vinculoBase = p.base.tipo === 'rotula' ? { tipo: 'rotula' } : { ...p.base }; }
      if (p.cotaFundacao) delete q.cotaBase; else if (p.cotaBase !== undefined) q.cotaBase = p.cotaBase;
      if (p.apoio) {
        const ap = p.apoio;
        q.apoiosIntermediarios = (q.apoiosIntermediarios ?? []).filter((x) => x.pavimento !== ap.pavimento);
        if (ap.altura > 0) q.apoiosIntermediarios.push({ pavimento: ap.pavimento, altura: ap.altura, ...(ap.direcao ? { direcao: ap.direcao } : {}) });
        if (!q.apoiosIntermediarios.length) delete q.apoiosIntermediarios;
      }
    }
    return `Vínculo de ${p.ids.length} pilar(es) alterado.`;
  },
});

registrar<{ id: string; pavimento: string; secao?: SecaoPilar; ajuste?: Ajuste; angulo?: number; dx?: number; dy?: number; fck?: number }>({
  nome: 'pilar.secaoLance',
  descricao: 'Define a seção, o ponto fixo, o ângulo, o deslocamento (dx, dy em m, no mundo) e o fck de um lance do pilar (o lance que chega ao pavimento indicado). A parte do lance fora da projeção do de baixo liga-se a ele por trecho rígido. Só informado = alterado; sem nenhum campo, o lance volta à seção e à geometria do pilar. `fck` 0 volta ao dos materiais. O primeiro lance usa a geometria do pilar (edite o pilar).',
  risco: 'escrita',
  // seção e fck do lance: rigidez (rearmar com esforços guardados); ponto fixo, ângulo e deslocamento mudam a geometria do modelo (E1a): análise plena
  calculo: (p) => (['ajuste', 'angulo', 'dx', 'dy'].some((k) => p[k] !== undefined) ? true : 'secao'),
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'pavimento'], properties: {
    id: { type: 'string' }, pavimento: { type: 'string' }, secao: secaoSchema, ajuste: ajusteSchema,
    angulo: { type: 'number', description: 'graus; padrão: o do pilar' },
    dx: { type: 'number', description: 'm, deslocamento do ponto fixo em x' }, dy: { type: 'number', description: 'm, em y' },
    fck: { type: 'number', minimum: 0, maximum: 90, description: 'MPa; 0 volta ao dos materiais' },
  } },
  validar(b, p) {
    const q = b.pilares.find((x) => x.id === p.id);
    if (!q) return err('PILAR_INEXISTENTE', `Pilar ${p.id} não existe.`);
    const ls = lancesDoPilar(b, q);
    if (!ls.some((x) => x.id === p.pavimento)) return err('LANCE_INEXISTENTE', `${q.nome} não tem lance chegando a ${p.pavimento}.`, [q.id]);
    const geom = p.ajuste !== undefined || p.angulo !== undefined || !!p.dx || !!p.dy;
    if (geom && ls[0].id === p.pavimento) return err('LANCE_BASE', `O primeiro lance de ${q.nome} usa o ponto fixo, o ângulo e a posição do pilar: edite o pilar.`, [q.id]);
    if (p.fck !== undefined && p.fck !== 0 && p.fck < 20) return err('FCK_INVALIDO', 'fck do lance entre 20 e 90 MPa (0 volta ao dos materiais).', [q.id]);
    const n: Pilar = { ...q, secoes: [...(q.secoes ?? []).filter((s) => s.pavimento !== p.pavimento), ...(p.secao || geom ? [{ pavimento: p.pavimento, secao: p.secao ?? q.secoes?.find((s) => s.pavimento === p.pavimento)?.secao ?? q.secao, ajuste: p.ajuste, angulo: p.angulo, dx: p.dx, dy: p.dy }] : [])] };
    const sob = pilaresSobrepostos(b, n);
    return sob.length ? err('PILAR_SOBREPOSTO', `O lance ficaria sobre ${sob.map((x) => x.nome).join(', ')}.`, [q.id, ...sob.map((x) => x.id)]) : [];
  },
  aplicar(d, p) {
    const q = d.pilares.find((x) => x.id === p.id)!;
    const atual = q.secoes?.find((s) => s.pavimento === p.pavimento);
    const antes = atual?.secao ?? q.secao;
    const geom = p.ajuste !== undefined || p.angulo !== undefined || p.dx !== undefined || p.dy !== undefined;
    const tudo = !p.secao && !geom && p.fck === undefined;
    if (p.fck !== undefined || tudo) {
      q.fck = (q.fck ?? []).filter((f) => f.pavimento !== p.pavimento);
      if (p.fck) q.fck.push({ pavimento: p.pavimento, fck: p.fck });
      if (!q.fck.length) delete q.fck;
    }
    if (p.secao || geom || tudo) {
      q.secoes = (q.secoes ?? []).filter((s) => s.pavimento !== p.pavimento);
      if (!tudo) {
        const e: NonNullable<Pilar['secoes']>[number] = { pavimento: p.pavimento, secao: { ...(p.secao ?? atual?.secao ?? q.secao) } };
        const aj = p.ajuste ?? atual?.ajuste, an = p.angulo ?? atual?.angulo, dx = p.dx ?? atual?.dx, dy = p.dy ?? atual?.dy;
        if (aj !== undefined && aj !== q.ajuste) e.ajuste = aj;
        if (an !== undefined && an !== q.angulo) e.angulo = an;
        if (dx) e.dx = dx;
        if (dy) e.dy = dy;
        q.secoes.push(e);
      }
      if (!q.secoes.length) delete q.secoes;
    }
    // armadura bloqueada do lance sai quando a seção muda (K1.11.27); o recálculo gera a nova
    const depois = p.secao ?? atual?.secao ?? q.secao;
    let aviso = '';
    if (JSON.stringify(antes) !== JSON.stringify(tudo ? q.secao : depois) && q.armaduras?.some((x) => x.pavimento === p.pavimento)) {
      q.armaduras = q.armaduras.filter((x) => x.pavimento !== p.pavimento);
      if (!q.armaduras.length) delete q.armaduras;
      aviso = ' A armadura bloqueada do lance saiu: a seção mudou e o recálculo gera uma nova.';
    }
    return `Lance de ${q.nome} alterado.${aviso}`;
  },
});

registrar<{ ids: string[]; dx: number; dy: number }>({
  nome: 'pilar.mover',
  descricao: 'Desloca pilares de (dx, dy) metros.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'dx', 'dy'], properties: { ids, dx: { type: 'number' }, dy: { type: 'number' } } },
  validar(b, p) {
    const falta = p.ids.filter((id) => !b.pilares.some((x) => x.id === id));
    if (falta.length) return err('PILAR_INEXISTENTE', `Pilar(es) inexistente(s): ${falta.join(', ')}.`);
    const mov = new Set(p.ids);
    for (const id of p.ids) {
      const q = b.pilares.find((x) => x.id === id)!;
      const sob = pilaresSobrepostos(b, { ...q, x: q.x + p.dx, y: q.y + p.dy }, mov);
      if (sob.length) return err('PILAR_SOBREPOSTO', `${q.nome} ficaria sobre ${sob.map((x) => x.nome).join(', ')}.`, [q.id, ...sob.map((x) => x.id)]);
    }
    return [];
  },
  aplicar(d, p) {
    for (const q of d.pilares) if (p.ids.includes(q.id)) { q.x = +(q.x + p.dx).toFixed(9); q.y = +(q.y + p.dy).toFixed(9); }
    return `${p.ids.length} pilar(es) movido(s).`;
  },
});

registrar<{ ids: string[]; dx: number; dy: number; vezes: number; incluirCargas?: boolean }>({
  nome: 'pilar.copiar',
  descricao: 'Copia pilares com deslocamento (dx, dy), repetido `vezes` (cópias em série). As cópias recebem os próximos números. Com `incluirCargas`, cada cópia leva as cargas do pilar de origem (horizontais e do topo).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'dx', 'dy'], properties: { ids, dx: { type: 'number' }, dy: { type: 'number' }, vezes: { type: 'integer', minimum: 1, maximum: 100, default: 1 }, incluirCargas: { type: 'boolean', description: 'leva as cargas do pilar de origem às cópias' } } },
  validar(b, p) {
    const falta = p.ids.filter((id) => !b.pilares.some((x) => x.id === id));
    if (falta.length) return err('PILAR_INEXISTENTE', `Pilar(es) inexistente(s): ${falta.join(', ')}.`);
    if (Math.hypot(p.dx, p.dy) < 1e-6) return err('DESLOCAMENTO_NULO', 'Informe um deslocamento.');
    const copias: Pilar[] = [];
    for (let k = 1; k <= p.vezes; k++) for (const id of p.ids) { const q = b.pilares.find((x) => x.id === id)!; copias.push({ ...q, id: `${id}#${k}`, x: q.x + k * p.dx, y: q.y + k * p.dy }); }
    const tmp = { ...b, pilares: [...b.pilares, ...copias] };
    for (const c of copias) { const sob = pilaresSobrepostos(tmp, c); if (sob.length) return err('PILAR_SOBREPOSTO', `Uma cópia ficaria sobre ${sob.map((x) => x.nome.replace(/#.*/, '')).join(', ')}.`); }
    return [];
  },
  aplicar(d, p) {
    let n = proximoNumero(d as BuildingModel);
    const orig = p.ids.map((id) => d.pilares.find((x) => x.id === id)!).map((q) => JSON.parse(JSON.stringify(q)) as Pilar);
    const cargas = JSON.parse(JSON.stringify(d.cargasPilar ?? [])) as NonNullable<typeof d.cargasPilar>;
    for (let k = 1; k <= p.vezes; k++) for (const q of orig) {
      const id = novoId(d, 'p');
      d.pilares.push({ ...q, id, nome: `P${n++}`, x: +(q.x + k * p.dx).toFixed(9), y: +(q.y + k * p.dy).toFixed(9) });
      if (p.incluirCargas) for (const c of cargas.filter((x) => x.pilar === q.id)) (d.cargasPilar ??= []).push({ ...c, id: novoId(d, 'cp'), pilar: id });
    }
    return `${p.ids.length * p.vezes} cópia(s) criada(s).`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'pilar.remover',
  descricao: 'Remove pilares (e os elementos de fundação lançados sob eles).',
  risco: 'destrutivo',
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids } },
  validar(b, p) {
    const falta = p.ids.filter((id) => !b.pilares.some((x) => x.id === id));
    return falta.length ? err('PILAR_INEXISTENTE', `Pilar(es) inexistente(s): ${falta.join(', ')}.`) : [];
  },
  aplicar(d, p) {
    const s = new Set(p.ids);
    d.pilares = d.pilares.filter((q) => !s.has(q.id));
    if (d.consolos?.some((c) => s.has(c.pilar))) { d.consolos = d.consolos.filter((c) => !s.has(c.pilar)); if (!d.consolos.length) delete d.consolos; } // consolos nos pilares removidos (E2e)
    // elementos de fundação dos pilares removidos saem junto
    // (elemento de vários pilares: só o pilar sai; o elemento some quando não resta nenhum)
    if (d.fundacao?.elementos.some((e) => e.pilares.some((x) => s.has(x)))) {
      const sai = new Set(d.fundacao.elementos.filter((e) => e.pilares.every((x) => s.has(x))).map((e) => e.id));
      for (const e of d.fundacao.elementos) if (!sai.has(e.id) && e.pilares.some((x) => s.has(x))) { e.pilares = e.pilares.filter((x) => !s.has(x)); delete e.impostas; }
      d.fundacao.elementos = d.fundacao.elementos.filter((e) => !sai.has(e.id));
      for (const e of d.fundacao.elementos) if (e.igualA && sai.has(e.igualA)) delete e.igualA;
      for (const id of sai) s.add(id);
    }
    // vigas de fundação com ponta no pilar ou no elemento removido
    if (d.fundacao?.vigas?.some((v) => s.has(v.ini) || s.has(v.fim))) { d.fundacao.vigas = d.fundacao.vigas.filter((v) => !s.has(v.ini) && !s.has(v.fim)); if (!d.fundacao.vigas.length) delete d.fundacao.vigas; }
    return `${p.ids.length} pilar(es) removido(s).`;
  },
});

registrar<{ tolerancia: number }>({
  nome: 'pilar.renumerar',
  descricao: 'Renumera os pilares P1, P2... da esquerda para a direita e de cima para baixo (linhas agrupadas pela tolerância em y, m). Os ids não mudam.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: { tolerancia: { type: 'number', minimum: 0, default: 0.3 } } },
  aplicar(d, p) {
    const cs = d.pilares.map((q) => ({ q, c: centroPilar(q, q.secao) })).sort((a, z) => z.c[1] - a.c[1]);
    const linhas: (typeof cs)[] = [];
    for (const it of cs) { const l = linhas.at(-1); if (l && Math.abs(l[0].c[1] - it.c[1]) <= p.tolerancia) l.push(it); else linhas.push([it]); }
    let n = 1;
    for (const l of linhas) for (const it of l.sort((a, z) => a.c[0] - z.c[0])) it.q.nome = `P${n++}`;
    return `${d.pilares.length} pilar(es) renumerado(s).`;
  },
});

