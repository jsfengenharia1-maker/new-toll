// Comandos de grupos e referências (L4): copiar conteúdo entre grupos, unir pavimentos, mover textos de referência,
// tipos de texto visíveis, ponto fixo de vários pilares, cópia de dados entre panos e renumeração de pórticos.
import type { Ajuste, BuildingModel, TipoTexto } from '../building/types';
import { conteudoDoGrupo, copiarConteudoGrupo, resumoUniao, TIPOS_CONTEUDO, textoResumoCopia, type ModoCopia, type TipoConteudo } from '../building/gruposCopia';
import { CAMPOS_COPIA_LAJE, mudarPontoFixo } from '../building/pilarDados';
import { numeracaoPorticos, avaliarNumeracao } from '../building/porticos';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const grupoExiste = (b: BuildingModel, g: string) => b.grupos.some((x) => x.id === g);

// ---- copiar conteúdo de outro grupo (C3.25) ----

registrar<{ de: string; para: string; tipos: TipoConteudo[]; modo: ModoCopia }>({
  nome: 'grupo.copiarConteudo',
  descricao: 'Copia para o grupo `para` o conteúdo do grupo `de` (L4): pilares (lances correspondentes, com as cargas), vigas, lajes (com zonas de uniformização e linhas de dobra), cargas e paredes, nessa ordem, que preserva as referências. `tipos` escolhe o que copiar (padrão: todos); `modo` "somar" (padrão) ignora elementos coincidentes, "substituir" apaga antes o que o destino tem dos tipos escolhidos (pilares só os apoiados e contidos no grupo). Pavimentos correspondem pela ordem dentro de cada grupo. Um passo no histórico.',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['de', 'para'], properties: {
    de: { type: 'string', description: 'id do grupo de origem' }, para: { type: 'string', description: 'id do grupo de destino' },
    tipos: { type: 'array', items: { type: 'string', enum: TIPOS_CONTEUDO }, minItems: 1, default: TIPOS_CONTEUDO },
    modo: { type: 'string', enum: ['somar', 'substituir'], default: 'somar' },
  } },
  validar(b, p) {
    if (!grupoExiste(b, p.de)) return err('GRUPO_INEXISTENTE', `Grupo ${p.de} não existe.`);
    if (!grupoExiste(b, p.para)) return err('GRUPO_INEXISTENTE', `Grupo ${p.para} não existe.`);
    if (p.de === p.para) return err('GRUPO_IGUAL', 'Origem e destino são o mesmo grupo.');
    const c = conteudoDoGrupo(b, p.de);
    return p.tipos.some((t) => c[t]) ? [] : err('SEM_CONTEUDO', 'O grupo de origem não tem elementos dos tipos escolhidos.');
  },
  aplicar(d, p) { return textoResumoCopia(copiarConteudoGrupo(d, p.de, p.para, p.tipos, p.modo)); },
});

// ---- unir pavimentos num grupo (C3.22) ----

registrar<{ ids: string[]; grupo?: string }>({
  nome: 'pavimento.unir',
  descricao: 'Reúne pavimentos num só grupo (L4): o grupo `grupo` ou, sem ele, o do pavimento mais baixo da seleção. O grupo de origem que esvaziar é removido, com suas vigas, lajes, cargas e vistas exclusivas; a mensagem traz a contagem do que saiu.',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 }, grupo: { type: 'string' } } },
  validar(b, p) {
    const f = p.ids.filter((id) => !b.pavimentos.some((x) => x.id === id));
    if (f.length) return err('PAVIMENTO_INEXISTENTE', `Pavimento(s) inexistente(s): ${f.join(', ')}.`);
    if (p.grupo && !grupoExiste(b, p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    if (new Set(p.ids).size < 2 && !p.grupo) return err('SELECAO_CURTA', 'Escolha dois ou mais pavimentos (ou um grupo de destino).');
    const r = resumoUniao(b, p.ids, p.grupo);
    return r && r.movidos.length ? [] : err('SEM_MUDANCA', 'Os pavimentos já estão no mesmo grupo.');
  },
  aplicar(d, p) {
    const r = resumoUniao(d as BuildingModel, p.ids, p.grupo)!;
    for (const id of r.movidos) d.pavimentos.find((x) => x.id === id)!.grupo = r.grupo;
    const avisos: string[] = [];
    for (const g of r.gruposEsvaziados) {
      const c = g.conteudo;
      d.vigas = d.vigas.filter((v) => v.grupo !== g.id);
      d.lajes = d.lajes.filter((l) => l.grupo !== g.id);
      d.cargas = d.cargas.filter((x) => x.grupo !== g.id);
      if (d.zonasLaje) { d.zonasLaje = d.zonasLaje.filter((z) => z.grupo !== g.id); if (!d.zonasLaje.length) delete d.zonasLaje; }
      if (d.linhasDobra) { d.linhasDobra = d.linhasDobra.filter((z) => z.grupo !== g.id); if (!d.linhasDobra.length) delete d.linhasDobra; }
      for (const m of d.mascaras) if (m.grupo === g.id && m.grupos?.length) { m.grupo = m.grupos[0]; m.grupos = m.grupos.slice(1); }
      for (const m of d.mascaras) { if (m.grupos?.includes(g.id)) m.grupos = m.grupos.filter((x) => x !== g.id); if (m.grupos && !m.grupos.length) delete m.grupos; }
      d.mascaras = d.mascaras.filter((m) => m.grupo !== g.id);
      d.grupos = d.grupos.filter((x) => x.id !== g.id);
      avisos.push(`grupo “${g.nome}” removido (${c.vigas} viga(s), ${c.lajes} laje(s), ${c.cargas} carga(s))`);
    }
    d.pavimentos.sort((a, z) => a.cota - z.cota);
    return `${r.movidos.length} pavimento(s) no grupo “${d.grupos.find((x) => x.id === r.grupo)?.nome}”${avisos.length ? `; ${avisos.join('; ')}` : ''}.`;
  },
});

// ---- referências: mover texto e tipos visíveis (C3.29, C3.30) ----

const elementoExiste = (b: BuildingModel, id: string) => [b.pilares, b.vigas, b.lajes, b.cargas, b.paredes ?? [], b.pilaresParede ?? []].some((xs) => (xs as { id: string }[]).some((x) => x.id === id));

registrar<{ id: string; dx?: number; dy?: number; rot?: number; restaurar?: boolean }>({
  nome: 'ref.mover',
  descricao: 'Move o texto de referência (nome) de um elemento na planta (L4): `dx`, `dy` em m em relação à posição automática e `rot` em graus; `restaurar` volta à posição automática. A interface calcula o deslocamento pelos dois cliques (texto e novo local). Só apresentação: não altera o cálculo.',
  risco: 'escrita',
  mcp: false,
  calculo: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string', description: 'id do pilar, viga, laje, carga, parede ou pilar-parede' },
    dx: { type: 'number' }, dy: { type: 'number' }, rot: { type: 'number', description: 'graus' }, restaurar: { type: 'boolean' },
  } },
  validar(b, p) {
    if (!elementoExiste(b, p.id)) return err('ELEMENTO_INEXISTENTE', `Elemento ${p.id} não existe.`);
    return p.restaurar || p.dx !== undefined || p.dy !== undefined || p.rot !== undefined ? [] : err('PARAMETRO_INVALIDO', 'Informe dx, dy ou rot (ou restaurar).');
  },
  aplicar(d, p) {
    const v = (d.vista ??= {});
    if (p.restaurar) {
      if (v.refs) { delete v.refs[p.id]; if (!Object.keys(v.refs).length) delete v.refs; }
      if (!Object.keys(v).length) delete d.vista;
      return 'Texto de referência na posição automática.';
    }
    const r = ((v.refs ??= {})[p.id] ??= { dx: 0, dy: 0 });
    if (p.dx !== undefined) r.dx = +p.dx.toFixed(4);
    if (p.dy !== undefined) r.dy = +p.dy.toFixed(4);
    if (p.rot !== undefined) { if (p.rot) r.rot = p.rot; else delete r.rot; }
    return 'Texto de referência movido.';
  },
});

export const TIPOS_TEXTO: TipoTexto[] = ['nomes', 'secoes', 'cotas', 'cargas', 'niveis'];

registrar<{ textos: TipoTexto[] }>({
  nome: 'vista.textos',
  descricao: 'Define de forma permanente na obra os tipos de texto de referência visíveis na planta (L4): nomes, seções, cotas, cargas e níveis. Todos os tipos = padrão. Só apresentação: não altera o cálculo.',
  risco: 'escrita',
  mcp: false,
  calculo: false,
  schema: { type: 'object', additionalProperties: false, required: ['textos'], properties: { textos: { type: 'array', items: { type: 'string', enum: TIPOS_TEXTO } } } },
  aplicar(d, p) {
    const v = (d.vista ??= {});
    if (TIPOS_TEXTO.every((t) => p.textos.includes(t))) delete v.textos; else v.textos = TIPOS_TEXTO.filter((t) => p.textos.includes(t));
    if (!Object.keys(v).length) delete d.vista;
    return p.textos.length ? `Textos visíveis: ${p.textos.join(', ')}.` : 'Nenhum texto de referência visível.';
  },
});

// ---- ponto fixo de vários pilares (C4.26) ----

registrar<{ ids: string[]; ajuste: Ajuste; mantemPosicao: boolean }>({
  nome: 'pilar.pontoFixo',
  descricao: 'Muda o ponto fixo de vários pilares (L4). Com `mantemPosicao` (padrão), x e y (e os deslocamentos dos lances com geometria própria) são recalculados e o contorno não se move; sem, só troca o ponto fixo e o pilar se desloca.',
  risco: 'escrita',
  mcp: false,
  calculo: (p) => (p.mantemPosicao === false ? true : 'secao'),
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'ajuste'], properties: {
    ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
    ajuste: { type: 'string', enum: ['c', 'n', 's', 'l', 'o', 'ne', 'no', 'se', 'so'] },
    mantemPosicao: { type: 'boolean', default: true },
  } },
  validar(b, p) { const f = p.ids.filter((id) => !b.pilares.some((x) => x.id === id)); return f.length ? err('PILAR_INEXISTENTE', `Pilar(es) inexistente(s): ${f.join(', ')}.`) : []; },
  aplicar(d, p) {
    for (const q of d.pilares) if (p.ids.includes(q.id)) mudarPontoFixo(q as never, p.ajuste, p.mantemPosicao);
    return `Ponto fixo de ${p.ids.length} pilar(es) alterado${p.mantemPosicao ? ' (contorno mantido)' : ''}.`;
  },
});

// ---- copiar dados de outro pano (C7.8) ----

registrar<{ de: string; para: string[]; campos: string[] }>({
  nome: 'laje.copiarDados',
  descricao: `Copia de outro pano (inclusive de outro grupo) os campos escolhidos para as lajes \`para\` (L4). Campos: ${Object.keys(CAMPOS_COPIA_LAJE).join(', ')}. O plano de inclinação (\`plano\`, E3f) avisa quando os panos têm inclinações diferentes. Avisos na mensagem quando um campo não pôde ser copiado.`,
  risco: 'escrita',
  mcp: false,
  calculo: (p) => (Array.isArray(p.campos) && p.campos.every((c) => c === 'tabela' || c === 'cobrimento' || c === 'armaduraBase') ? 'detalhe' : true),
  schema: { type: 'object', additionalProperties: false, required: ['de', 'para', 'campos'], properties: {
    de: { type: 'string', description: 'id da laje de origem' },
    para: { type: 'array', items: { type: 'string' }, minItems: 1 },
    campos: { type: 'array', items: { type: 'string', enum: Object.keys(CAMPOS_COPIA_LAJE) }, minItems: 1 },
  } },
  validar(b, p) {
    if (!b.lajes.some((l) => l.id === p.de)) return err('LAJE_INEXISTENTE', `Laje ${p.de} não existe.`);
    const f = p.para.filter((id) => !b.lajes.some((l) => l.id === id));
    if (f.length) return err('LAJE_INEXISTENTE', `Laje(s) inexistente(s): ${f.join(', ')}.`);
    return p.para.includes(p.de) ? err('LAJE_IGUAL', 'A laje de origem não pode estar entre as de destino.') : [];
  },
  aplicar(d, p) {
    const o = JSON.parse(JSON.stringify(d.lajes.find((l) => l.id === p.de)!));
    const avisos: string[] = [];
    for (const l of d.lajes) {
      if (!p.para.includes(l.id)) continue;
      for (const c of p.campos) {
        const a = CAMPOS_COPIA_LAJE[c].alerta?.(o, l as never); if (a) avisos.push(a);
        const m = CAMPOS_COPIA_LAJE[c].copiar(o, l as never); if (m) avisos.push(m);
      }
    }
    return `Dados de ${o.nome} copiados para ${p.para.length} laje(s) (${p.campos.join(', ')}).${avisos.length ? ` ${avisos.join(' ')}` : ''}`;
  },
});

// ---- numeração de pórticos e vigas (K1.4.69) ----

registrar<{ grupo: string }>({
  nome: 'portico.renumerar',
  descricao: 'Numera os pórticos do grupo (vigas consecutivas alinhadas: horizontais de cima para baixo, depois verticais e inclinadas da esquerda para a direita) e as vigas, em sequência ao longo de cada pórtico (L4). Os agrupamentos de pórticos com nome G<n> são renomeados pela ordem de suas vigas. A mensagem traz a avaliação de erros da numeração anterior.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['grupo'], properties: { grupo: { type: 'string' } } },
  validar: (b, p) => (grupoExiste(b, p.grupo) ? [] : err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`)),
  aplicar(d, p) {
    const antes = avaliarNumeracao(d as BuildingModel, p.grupo);
    const { porticos, nomes } = numeracaoPorticos(d as BuildingModel, p.grupo);
    for (const v of d.vigas) { const n = nomes.get(v.id); if (n) v.nome = n; }
    if (d.agrupamentos?.length) {
      const num = (id: string) => Number((nomes.get(id) ?? 'V9999').slice(1));
      const ord = d.agrupamentos.filter((g) => /^G\d+$/.test(g.nome) && g.vigas.some((id) => nomes.has(id))).sort((a, z) => Math.min(...a.vigas.map(num)) - Math.min(...z.vigas.map(num)));
      ord.forEach((g, i) => { g.nome = `G${i + 1}`; });
    }
    return `${porticos.length} pórtico(s) e ${nomes.size} viga(s) numerados.${antes.length ? ` Antes: ${antes.map((e) => e.mensagem).join(' ')}` : ' A numeração anterior não tinha erros.'}`;
  },
});
