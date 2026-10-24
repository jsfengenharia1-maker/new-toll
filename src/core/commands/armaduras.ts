// Armaduras editadas e bloqueadas (frente R2): o recálculo não redimensiona, só verifica (pilares: verificação
// completa; vigas: área de aço, estribos e flecha). O bloqueio deixa de valer quando muda o número de lances do
// pilar ou de vãos da viga. Lajes treliçadas (R6): armadura adicional e negativa das vigotas por nervura.
import { lancesDoPilar, type ArmaduraViga, type BuildingModel, type Pilar, type Viga } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { vaosDaViga } from '../building/vigas';
import { motivoTramo } from '../building/detalhamento';
import { agrupamentoDe, geometriaIdentica } from '../building/agrupamento';
import { ehModeloPortico, motivoCopia, perfilDaViga, type ModeloPortico } from '../building/copiaArmadura';
import { linhaLajes, tabelaDe } from '../building/tabelasArmadura';
import { telaPor } from '../building/telasSoldadas';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const BITOLA_L = [8, 10, 12.5, 16, 20, 25, 32], BITOLA_T = [5, 6.3, 8, 10, 12.5], BITOLA_VIGOTA = [6.3, 8, 10, 12.5];
const barras = (bitolas: number[]): JsonSchema => ({ type: 'object', additionalProperties: false, required: ['n', 'phi'], properties: { n: { type: 'integer', minimum: 1, maximum: 40 }, phi: { type: 'number', enum: bitolas } } });
const estriboPilar: JsonSchema = { type: 'object', additionalProperties: false, required: ['phi', 's'], properties: { phi: { type: 'number', enum: BITOLA_T }, s: { type: 'number', minimum: 0.03, maximum: 0.5, description: 'espaçamento (m)' } } };
const estribo: JsonSchema = { type: 'object', additionalProperties: false, required: ['phi', 's'], properties: { phi: { type: 'number', enum: BITOLA_T }, s: { type: 'number', minimum: 0.03, maximum: 0.5, description: 'espaçamento (m)' }, legs: { type: 'integer', enum: [2, 4, 6], description: 'ramos (padrão 2)' } } };

registrar<{ id: string; pavimento: string; phi: number; nb?: number; nh?: number; nbS?: number; nhD?: number; n?: number; estribo: { phi: number; s: number } }>({
  nome: 'pilar.armadura',
  descricao: 'Edita e bloqueia a armadura de um lance de pilar: bitola longitudinal `phi` (mm), barras por face ao longo de b (`nb`) e de h (`nh`), com os cantos, ou `n` barras no pilar circular, e o estribo { phi (mm), s (m) }. O recálculo verifica essa armadura (verificação completa) sem redimensioná-la.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'pavimento', 'phi', 'estribo'], properties: {
    id: { type: 'string' }, pavimento: { type: 'string', description: 'lance (pavimento do topo)' }, phi: { type: 'number', enum: BITOLA_L },
    nb: { type: 'integer', minimum: 2, maximum: 20 }, nh: { type: 'integer', minimum: 2, maximum: 20 }, n: { type: 'integer', minimum: 4, maximum: 40 }, estribo: estriboPilar,
    nbS: { type: 'integer', minimum: 2, maximum: 20, description: 'face superior (y+) com outro número de barras (arranjo não simétrico); padrão = nb' },
    nhD: { type: 'integer', minimum: 2, maximum: 20, description: 'face direita (x+) com outro número de barras; padrão = nh' },
  } },
  validar(b, p) {
    const pil = b.pilares.find((x) => x.id === p.id);
    if (!pil) return err('PILAR_INEXISTENTE', `Pilar ${p.id} não existe.`);
    if (!lancesDoPilar(b, pil).some((x) => x.id === p.pavimento)) return err('LANCE_INEXISTENTE', `${pil.nome} não tem lance em ${p.pavimento}.`, [p.id]);
    const circ = (pil.secoes?.find((x) => x.pavimento === p.pavimento)?.secao ?? pil.secao).tipo === 'circ';
    if (circ ? p.n === undefined : p.nb === undefined || p.nh === undefined) return err('ARRANJO', circ ? 'Pilar circular: informe n.' : 'Pilar retangular: informe nb e nh.', [p.id]);
    return [];
  },
  aplicar(d, p) {
    const q = d.pilares.find((x) => x.id === p.id)!;
    const lances = lancesDoPilar(d as BuildingModel, q as Pilar).length;
    q.armaduras = (q.armaduras ?? []).filter((x) => x.pavimento !== p.pavimento);
    q.armaduras.push({ pavimento: p.pavimento, phi: p.phi, ...(p.n !== undefined ? { n: p.n } : { nb: p.nb, nh: p.nh, ...(p.nbS !== undefined && p.nbS !== p.nb ? { nbS: p.nbS } : {}), ...(p.nhD !== undefined && p.nhD !== p.nh ? { nhD: p.nhD } : {}) }), estribo: { ...p.estribo }, lances });
    return `Armadura de ${q.nome} (lance ${p.pavimento}) editada e bloqueada.`;
  },
});

registrar<{ id: string; inf: { n: number; phi: number }; sup?: { n: number; phi: number }; estribo: { phi: number; s: number; legs?: number }; laterais?: { n: number; phi: number } }>({
  nome: 'viga.armadura',
  descricao: 'Edita e bloqueia a armadura de uma viga (todos os vãos e pavimentos do grupo): inferior e superior { n, phi (mm) }, estribo { phi (mm), s (m) } e barras laterais por face { n, phi }. O recálculo só verifica a área de aço, os estribos e a flecha.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'inf', 'estribo'], properties: {
    id: { type: 'string' }, inf: barras(BITOLA_L), sup: barras(BITOLA_L), estribo, laterais: barras(BITOLA_L),
  } },
  validar(b, p) { return b.vigas.some((x) => x.id === p.id) ? [] : err('VIGA_INEXISTENTE', `Viga ${p.id} não existe.`); },
  aplicar(d, p) {
    const v = d.vigas.find((x) => x.id === p.id)!;
    // pórticos agrupados: a mudança num vale para todos (R7f)
    const g = agrupamentoDe(d as BuildingModel, p.id);
    const alvo = (g ? g.vigas : [p.id]).map((id) => d.vigas.find((x) => x.id === id)).filter((x): x is typeof v => !!x);
    for (const w of alvo) w.armadura = { inf: { ...p.inf }, ...(p.sup ? { sup: { ...p.sup } } : {}), estribo: { ...p.estribo }, ...(p.laterais ? { laterais: { ...p.laterais } } : {}), vaos: vaosDaViga(d as BuildingModel, w) };
    return alvo.length > 1 ? `Armadura de ${v.nome} editada e bloqueada; vale para o agrupamento ${g!.nome} (${alvo.map((w) => w.nome).join(', ')}).` : `Armadura de ${v.nome} editada e bloqueada.`;
  },
});

registrar<{ ids: string[]; inf: { n: number; phi: number }; sup?: { n: number; phi: number } }>({
  nome: 'laje.armaduraVigotas',
  descricao: 'Edita e bloqueia a armadura das vigotas de lajes treliçadas, por nervura: positiva adicional ao banzo inferior da treliça `inf` { n (0 = sem adicional, até 2), phi (mm) } e, opcional, a negativa na capa sobre os apoios `sup` { n, phi }. O recálculo só verifica essa armadura (erro se insuficiente).',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'inf'], properties: {
    ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
    inf: { type: 'object', additionalProperties: false, required: ['n', 'phi'], properties: { n: { type: 'integer', minimum: 0, maximum: 2 }, phi: { type: 'number', enum: BITOLA_VIGOTA } } },
    sup: { type: 'object', additionalProperties: false, required: ['n', 'phi'], properties: { n: { type: 'integer', minimum: 1, maximum: 2 }, phi: { type: 'number', enum: BITOLA_VIGOTA } } },
  } },
  validar(b, p) {
    const sem = p.ids.filter((id) => !b.lajes.some((x) => x.id === id));
    if (sem.length) return err('LAJE_INEXISTENTE', `Laje ${sem.join(', ')} não existe.`);
    const mac = b.lajes.filter((x) => p.ids.includes(x.id) && x.tipo.tipo !== 'trelicada');
    return mac.length ? err('LAJE_NAO_TRELICADA', `${mac.map((x) => x.nome).join(', ')} não é treliçada.`, mac.map((x) => x.id)) : [];
  },
  aplicar(d, p) {
    for (const l of d.lajes) if (p.ids.includes(l.id)) l.armaduraVigotas = { inf: { ...p.inf }, ...(p.sup ? { sup: { ...p.sup } } : {}) };
    return `Armadura das vigotas de ${p.ids.length} laje(s) editada e bloqueada.`;
  },
});

registrar<{ ids?: string[]; tipo?: 'viga' | 'pilar' | 'laje' | 'parede' | 'escada' }>({
  nome: 'armadura.desbloquear',
  descricao: 'Desbloqueia armaduras editadas (o recálculo volta a dimensioná-las): `ids` de pilares, vigas, lajes (treliçadas; vigotas editadas, E3b; placa fixada e negativos editados das alveolares, E3e; maciças com edição ou geradas sem cálculo, R7e), paredes e pilares-parede (malhas e emendas editadas, E1d; as aberturas da parede voltam à armadura calculada), ou todos de um `tipo`, ou todos sem parâmetros.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 }, tipo: { type: 'string', enum: ['viga', 'pilar', 'laje', 'parede', 'escada'] } } },
  validar(b, p) {
    const sem = (p.ids ?? []).filter((id) => !b.pilares.some((x) => x.id === id) && !b.escadas?.some((x) => x.id === id) && !b.vigas.some((x) => x.id === id) && !b.lajes.some((x) => x.id === id) && !b.paredes?.some((x) => x.id === id) && !b.pilaresParede?.some((x) => x.id === id));
    return sem.length ? err('ELEMENTO_INEXISTENTE', `Elemento ${sem.join(', ')} não existe.`) : [];
  },
  aplicar(d, p) {
    let n = 0;
    // pórticos agrupados: desbloquear um desbloqueia o agrupamento inteiro
    const ids = p.ids ? new Set(p.ids.flatMap((id) => agrupamentoDe(d as BuildingModel, id)?.vigas ?? [id])) : null;
    const alvo = (id: string, t: 'viga' | 'pilar' | 'laje' | 'parede' | 'escada') => (ids ? ids.has(id) : !p.tipo || p.tipo === t);
    for (const w of [...(d.paredes ?? []), ...(d.pilaresParede ?? [])]) if ((w.armaduras || w.emendas) && alvo(w.id, 'parede')) { n += (w.armaduras?.length ?? 0) + (w.emendas?.length ?? 0); delete w.armaduras; delete w.emendas; }
    for (const w of d.paredes ?? []) for (const a of w.aberturas ?? []) if (a.armadura && alvo(w.id, 'parede')) { n++; delete a.armadura; }
    for (const q of d.pilares) if (q.armaduras && alvo(q.id, 'pilar')) { n += q.armaduras.length; delete q.armaduras; }
    for (const v of d.vigas) if (v.armadura && alvo(v.id, 'viga')) { n++; delete v.armadura; }
    for (const l of d.lajes) if (l.armaduraVigotas && alvo(l.id, 'laje')) { n++; delete l.armaduraVigotas; }
    for (const l of d.lajes) if (l.edicaoVigotas?.length && alvo(l.id, 'laje')) { n += l.edicaoVigotas.length; delete l.edicaoVigotas; }
    for (const l of d.lajes) if (l.alveolar && (l.alveolar.negativos || l.alveolar.fixa) && alvo(l.id, 'laje')) { n += (l.alveolar.negativos ? 1 : 0) + (l.alveolar.fixa ? 1 : 0); delete l.alveolar.negativos; delete l.alveolar.fixa; if (!Object.keys(l.alveolar).length) delete l.alveolar; } // alveolar (E3e): placa fixada e negativos editados
    for (const l of d.lajes) if ((l.edicao || l.semCalculo) && alvo(l.id, 'laje')) { n++; delete l.edicao; delete l.semCalculo; }
    for (const e of d.escadas ?? []) if (e.armadura?.bloqueadas?.length && alvo(e.id, 'escada')) { n += e.armadura.bloqueadas.length; delete e.armadura.bloqueadas; if (!Object.keys(e.armadura).length) delete e.armadura; }
    return n ? `${n} armadura(s) desbloqueada(s).` : 'Nenhuma armadura bloqueada.';
  },
});

registrar<{ de?: string; modelo?: ModeloPortico; para: string[] }>({
  nome: 'viga.copiarArmadura',
  descricao: 'Copia a armadura bloqueada (e o detalhe editado, com os comprimentos) de uma viga `de`, ou de um `modelo` de pórtico da biblioteca, para outras vigas, do mesmo grupo ou de grupos diferentes. Condições: mesmo número de vãos, vãos correspondentes com diferença menor que 25 cm e desníveis coincidentes; se alguma viga de destino não atende, nada é copiado e a mensagem diz o motivo de cada uma. O recálculo verifica cada viga (não há aviso de armadura menor que a necessária: ela é reprovada).',
  risco: 'escrita',
  mcp: false,
  calculo: 'detalhe',
  schema: { type: 'object', additionalProperties: false, required: ['para'], properties: {
    de: { type: 'string' }, para: { type: 'array', items: { type: 'string' }, minItems: 1 },
    modelo: { type: 'object', description: 'modelo de pórtico guardado na biblioteca (armadura, detalhe e perfil de vãos); em vez de `de`' },
  } },
  validar(b, p) {
    if (!!p.de === !!p.modelo) return err('ORIGEM', 'Informe a viga de origem (`de`) ou um `modelo` de pórtico (um só).');
    const sem = p.para.filter((id) => !b.vigas.some((x) => x.id === id));
    if (sem.length) return err('VIGA_INEXISTENTE', `Viga ${sem.join(', ')} não existe.`);
    let perfil: { vaos: number[]; nivel: number };
    if (p.modelo) {
      if (!ehModeloPortico(p.modelo)) return err('MODELO_INVALIDO', 'O modelo de pórtico não tem a forma esperada (versão 1, vãos, armadura e estribo).');
      perfil = p.modelo;
    } else {
      const o = b.vigas.find((x) => x.id === p.de);
      if (!o) return err('VIGA_INEXISTENTE', `Viga ${p.de} não existe.`);
      if (!o.armadura) return err('SEM_ARMADURA', `${o.nome} não tem armadura bloqueada para copiar.`, [p.de!]);
      perfil = perfilDaViga(b, o);
    }
    const alvos = p.para.filter((id) => id !== p.de).map((id) => b.vigas.find((x) => x.id === id)!);
    const motivos = alvos.flatMap((v) => { const m = motivoCopia(b, perfil, v); return m ? [`${v.nome}: ${m}`] : []; });
    return motivos.length ? err('COPIA_RECUSADA', `Não é possível copiar a armadura — ${motivos.join('; ')}.`, alvos.map((v) => v.id)) : [];
  },
  aplicar(d, p) {
    const b = d as BuildingModel;
    const o = p.de ? d.vigas.find((x) => x.id === p.de)! : null;
    const arm = p.modelo ? p.modelo.armadura : o!.armadura!;
    const det = p.modelo ? p.modelo.detalhe : o!.detalhe && o!.detalhe.vaos === vaosDaViga(b, o as Viga) ? (({ vaos: _v, ...r }) => r)(o!.detalhe) : undefined;
    const alvos = p.para.filter((id) => id !== p.de);
    for (const id of alvos) {
      const v = d.vigas.find((x) => x.id === id)!, vaos = vaosDaViga(b, v as Viga);
      const { vaos: _a, ...resto } = arm as ArmaduraViga;
      v.armadura = { ...JSON.parse(JSON.stringify(resto)), vaos };
      if (det) v.detalhe = { ...JSON.parse(JSON.stringify(det)), vaos }; else delete v.detalhe;
    }
    return `Armadura${det ? ' e detalhe' : ''} de ${o ? o.nome : `“${p.modelo!.nome}”`} copiada para ${alvos.length} viga(s).`;
  },
});

registrar<{ id: string; barras?: { pos: string; s0?: number; s1?: number; ganchos?: [boolean, boolean]; perna?: number }[]; zonas?: { zona: number; phi?: number; s?: number; ramos?: number; u?: boolean }[]; fatorEmenda?: number; remover?: boolean }>({
  nome: 'viga.detalhe',
  descricao: 'Edita o detalhamento de uma viga (R7b): por posição de barra (N1, N2, …) os extremos `s0`/`s1` ao longo do traçado (m), os `ganchos` de 90° nas pontas e a `perna` reta (× φ); por zona de estribos (índice 0, 1, …) bitola `phi`, espaçamento `s` (m) e `ramos`; e o `fatorEmenda` do comprimento de traspasse. O recálculo aplica as edições e verifica a cobertura da armadura necessária, os estribos e a barra máxima (DETALHE_INSUF); vale enquanto o número de vãos não muda. `remover: true` volta ao detalhamento calculado.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' },
    barras: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['pos'], properties: {
      pos: { type: 'string' }, s0: { type: 'number' }, s1: { type: 'number' },
      ganchos: { type: 'array', items: { type: 'boolean' }, minItems: 2, maxItems: 2 }, perna: { type: 'number', minimum: 8, maximum: 20 },
    } } },
    zonas: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['zona'], properties: {
      zona: { type: 'integer', minimum: 0, maximum: 60 }, phi: { type: 'number', enum: BITOLA_T }, s: { type: 'number', minimum: 0.03, maximum: 0.5 }, ramos: { type: 'integer', enum: [2, 4, 6] }, u: { type: 'boolean', description: 'estribo em U (aberto no topo) nesta zona' },
    } } },
    fatorEmenda: { type: 'number', minimum: 0.5, maximum: 2 },
    remover: { type: 'boolean' },
  } },
  validar(b, p) {
    const v = b.vigas.find((x) => x.id === p.id);
    if (!v) return err('VIGA_INEXISTENTE', `Viga ${p.id} não existe.`);
    if (p.remover) return [];
    if (!p.barras?.length && !p.zonas?.length && p.fatorEmenda === undefined) return err('SEM_EDICAO', 'Informe barras, zonas ou fatorEmenda.', [p.id]);
    for (const e of p.barras ?? []) if (!/^N[0-9]+$/.test(e.pos)) return err('POSICAO_INVALIDA', `Posição ${e.pos} inválida (use N1, N2, …).`, [p.id]);
    for (const e of p.barras ?? []) if (e.s0 !== undefined && e.s1 !== undefined && e.s1 <= e.s0) return err('BARRA_INVERTIDA', `Posição ${e.pos}: s1 deve ser maior que s0.`, [p.id]);
    return [];
  },
  aplicar(d, p) {
    const v = d.vigas.find((x) => x.id === p.id)!;
    // pórticos agrupados: a mudança vale para os membros de geometria idêntica (as posições N1, N2… coincidem) (R7f)
    const g = agrupamentoDe(d as BuildingModel, p.id);
    const alvo = (g ? g.vigas : [p.id]).map((id) => d.vigas.find((x) => x.id === id)).filter((w): w is typeof v => !!w && (w.id === v.id || geometriaIdentica(d as BuildingModel, v as Viga, w as Viga)));
    for (const w of alvo) {
      if (p.remover) { delete w.detalhe; continue; }
      const antes = w.detalhe && w.detalhe.vaos === vaosDaViga(d as BuildingModel, w) ? w.detalhe : undefined;
      const barras = [...(antes?.barras ?? []).filter((x) => !p.barras?.some((y) => y.pos === x.pos)), ...(p.barras ?? []).map((x) => ({ ...x, ...(x.ganchos ? { ganchos: [x.ganchos[0], x.ganchos[1]] as [boolean, boolean] } : {}) }))];
      const zonas = [...(antes?.zonas ?? []).filter((x) => !p.zonas?.some((y) => y.zona === x.zona)), ...(p.zonas ?? [])];
      const fator = p.fatorEmenda ?? antes?.fatorEmenda;
      w.detalhe = { vaos: vaosDaViga(d as BuildingModel, w), ...(barras.length ? { barras } : {}), ...(zonas.length ? { zonas } : {}), ...(fator !== undefined ? { fatorEmenda: fator } : {}) };
    }
    const ext = alvo.length > 1 ? ` Vale para o agrupamento ${g!.nome} (${alvo.map((w) => w.nome).join(', ')}).` : '';
    return p.remover ? `Detalhamento de ${v.nome} volta ao calculado.${ext}` : `Detalhamento de ${v.nome} editado.${ext}`;
  },
});

registrar<{ id: string; espera?: number; passagens?: { pavimento: string; emenda?: number; ancoragem?: number }[]; remover?: boolean }>({
  nome: 'pilar.detalhe',
  descricao: 'Edita os comprimentos do detalhamento de um pilar (R7c): `espera` na fundação (m, abaixo da base) e, por passagem de lance (`pavimento` do topo do lance de baixo), o traspasse `emenda` acima do topo e, nos arranques, a `ancoragem` das barras novas abaixo do topo (m). Verificado a cada recálculo (traspasse mínimo das opções, ancoragem mínima de 0,3·lb) e desconsiderado quando muda o número de lances do pilar. Com `remover`, volta ao calculado.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' },
    espera: { type: 'number', minimum: 0.1, maximum: 3, description: 'espera na fundação (m)' },
    passagens: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['pavimento'], properties: {
      pavimento: { type: 'string', description: 'lance de baixo da passagem (pavimento do seu topo)' },
      emenda: { type: 'number', minimum: 0.1, maximum: 3, description: 'traspasse acima do topo (m)' },
      ancoragem: { type: 'number', minimum: 0.1, maximum: 3, description: 'ancoragem das barras novas abaixo do topo, no arranque (m)' },
    } } },
    remover: { type: 'boolean' },
  } },
  validar(b, p) {
    const pil = b.pilares.find((x) => x.id === p.id);
    if (!pil) return err('PILAR_INEXISTENTE', `Pilar ${p.id} não existe.`);
    if (p.remover) return [];
    if (p.espera === undefined && !p.passagens?.length) return err('SEM_EDICAO', 'Informe espera ou passagens.', [p.id]);
    const ls = lancesDoPilar(b, pil);
    for (const e of p.passagens ?? []) {
      const i = ls.findIndex((x) => x.id === e.pavimento);
      if (i < 0) return err('LANCE_INEXISTENTE', `${pil.nome} não tem lance em ${e.pavimento}.`, [p.id]);
      if (i === ls.length - 1) return err('SEM_PASSAGEM', `${pil.nome}: o último lance não tem passagem para o de cima (use o topo no detalhamento calculado).`, [p.id]);
      if (e.emenda === undefined && e.ancoragem === undefined) return err('SEM_EDICAO', `Passagem ${e.pavimento}: informe emenda ou ancoragem.`, [p.id]);
    }
    return [];
  },
  aplicar(d, p) {
    const q = d.pilares.find((x) => x.id === p.id)!;
    if (p.remover) { delete q.detalhe; return `Detalhamento de ${q.nome} volta ao calculado.`; }
    const lances = lancesDoPilar(d as BuildingModel, q as Pilar).length;
    const antes = q.detalhe && q.detalhe.lances === lances ? q.detalhe : undefined;
    const passagens = [...(antes?.passagens ?? []).filter((x) => !p.passagens?.some((y) => y.pavimento === x.pavimento)), ...(p.passagens ?? []).map((y) => {
      const o = (antes?.passagens ?? []).find((x) => x.pavimento === y.pavimento);
      return { pavimento: y.pavimento, ...(y.emenda ?? o?.emenda) !== undefined ? { emenda: y.emenda ?? o?.emenda } : {}, ...(y.ancoragem ?? o?.ancoragem) !== undefined ? { ancoragem: y.ancoragem ?? o?.ancoragem } : {} };
    })];
    const espera = p.espera ?? antes?.espera;
    q.detalhe = { lances, ...(espera !== undefined ? { espera } : {}), ...(passagens.length ? { passagens } : {}) };
    return `Detalhamento de ${q.nome} editado.`;
  },
});

registrar<{ ids: string[]; remover?: boolean }>({
  nome: 'viga.tramo',
  descricao: 'Cria (ou, com `remover`, desfaz) um tramo predefinido: vigas consecutivas e alinhadas do mesmo grupo cuja armadura inferior passante corre sem emenda nem gancho no apoio comum, enquanto o comprimento total não passa da barra máxima (R7b). `ids` na ordem do alinhamento.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 2 }, remover: { type: 'boolean' } } },
  validar(b, p) {
    if (p.remover) return (b.tramos ?? []).some((t) => t.length === p.ids.length && t.every((x, i) => x === p.ids[i])) ? [] : err('TRAMO_INEXISTENTE', 'Esse tramo não existe.');
    const motivo = motivoTramo(b, p.ids);
    if (motivo) return err('TRAMO_INVALIDO', motivo, p.ids);
    const outro = p.ids.find((id) => (b.tramos ?? []).some((t) => t.includes(id)));
    return outro ? err('TRAMO_EXISTENTE', `A viga ${b.vigas.find((x) => x.id === outro)?.nome ?? outro} já está em um tramo.`, [outro]) : [];
  },
  aplicar(d, p) {
    if (p.remover) { d.tramos = (d.tramos ?? []).filter((t) => !(t.length === p.ids.length && t.every((x, i) => x === p.ids[i]))); if (!d.tramos.length) delete d.tramos; return 'Tramo desfeito.'; }
    d.tramos = [...(d.tramos ?? []), [...p.ids]];
    return `Tramo predefinido criado com ${p.ids.length} vigas.`;
  },
});

const BITOLA_LAJE = [5, 6.3, 8, 10, 12.5, 16];
interface FaceBaseP { tela?: string; giro?: boolean; barras?: { dir: 0 | 1; phi: number; s: number }[] }
const faceBase: JsonSchema = { type: 'object', additionalProperties: false, properties: {
  tela: { type: 'string', description: 'designação da tela soldada (NBR 7481, tabela nbr7481.telas-q da biblioteca de normas)' },
  giro: { type: 'boolean', description: 'tela com os fios principais na direção 1 da laje' },
  barras: { type: 'array', minItems: 1, maxItems: 2, items: { type: 'object', additionalProperties: false, required: ['dir', 'phi', 's'], properties: { dir: { type: 'integer', enum: [0, 1] }, phi: { type: 'number', enum: BITOLA_LAJE }, s: { type: 'number', minimum: 5, maximum: 33, description: 'espaçamento (cm)' } } } },
} };

interface BaseNervuraP { dir: 0 | 1; inf?: { n: number; phi: number }; sup?: { n: number; phi: number }; considerar?: boolean; remover?: boolean }
registrar<{ ids: string[]; inf?: FaceBaseP; sup?: FaceBaseP; detalhada?: boolean; detalhadaPadrao?: boolean; remover?: ('inf' | 'sup')[]; nervuras?: BaseNervuraP[] }>({
  nome: 'laje.armaduraBase',
  descricao: 'Define a armadura base de lajes maciças (R7d), por pano ou seleção: face `inf` e/ou `sup` com tela soldada (`tela` pela designação da NBR 7481, `giro` troca a direção dos fios principais) ou `barras` por direção da malha (`dir` 0 = maior aresta, `phi` mm da tabela da laje, `s` cm). A base é sempre colaborante: o reforço é a armadura necessária menos a base. `detalhada` (desenhada e medida) sobrepõe a opção lajeBaseDetalhada; `detalhadaPadrao` volta a opção; `remover` apaga faces. Nervuradas bidirecionais (E3c): `inf`/`sup` são a malha da mesa e das zonas maciças e `nervuras` traz as barras corridas de cada direção (`inf`, `sup`, `considerar` para entrar no dimensionamento, `remover`); `detalhada` desenha e mede a base das nervuras.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: {
    ids: { type: 'array', items: { type: 'string' }, minItems: 1 }, inf: faceBase, sup: faceBase, detalhada: { type: 'boolean' }, detalhadaPadrao: { type: 'boolean' },
    remover: { type: 'array', items: { type: 'string', enum: ['inf', 'sup'] } },
    nervuras: { type: 'array', minItems: 1, maxItems: 2, description: 'nervuradas bidirecionais (E3c): barras corridas nas nervuras de cada direção (0 = a da laje, 1 = transversal); `considerar` as inclui no dimensionamento (padrão: não); `remover` apaga a configuração da direção', items: { type: 'object', additionalProperties: false, required: ['dir'], properties: {
      dir: { type: 'integer', enum: [0, 1] }, inf: { type: 'object', additionalProperties: false, required: ['n', 'phi'], properties: { n: { type: 'integer', minimum: 1, maximum: 6 }, phi: { type: 'number', enum: [6.3, 8, 10, 12.5, 16, 20, 25] } } },
      sup: { type: 'object', additionalProperties: false, required: ['n', 'phi'], properties: { n: { type: 'integer', minimum: 1, maximum: 6 }, phi: { type: 'number', enum: [6.3, 8, 10, 12.5, 16, 20, 25] } } },
      considerar: { type: 'boolean' }, remover: { type: 'boolean' },
    } } },
  } },
  validar(b, p) {
    const sem = p.ids.filter((id) => !b.lajes.some((x) => x.id === id));
    if (sem.length) return err('LAJE_INEXISTENTE', `Laje ${sem.join(', ')} não existe.`);
    const nm = b.lajes.filter((x) => p.ids.includes(x.id) && x.tipo.tipo !== 'macica' && x.tipo.tipo !== 'nervurada');
    if (nm.length) return err('LAJE_NAO_MACICA', `${nm.map((x) => x.nome).join(', ')} não é maciça nem nervurada bidirecional (a base vale para essas lajes).`, nm.map((x) => x.id));
    const sn = b.lajes.filter((x) => p.ids.includes(x.id) && x.tipo.tipo !== 'nervurada');
    if (p.nervuras?.length && sn.length) return err('LAJE_NAO_NERVURADA', `${sn.map((x) => x.nome).join(', ')} não é nervurada bidirecional (a base nas nervuras vale só para elas).`, sn.map((x) => x.id));
    if (!p.inf && !p.sup && p.detalhada === undefined && !p.detalhadaPadrao && !p.remover?.length && !p.nervuras?.length) return err('SEM_EDICAO', 'Informe inf, sup, nervuras, detalhada ou remover.');
    if (p.nervuras?.some((x) => !x.remover && !x.inf && !x.sup && x.considerar === undefined)) return err('SEM_EDICAO', 'Cada direção de nervuras pede inf, sup, considerar ou remover.');
    for (const [nome, f] of [['inf', p.inf], ['sup', p.sup]] as const) {
      if (!f) continue;
      if (!!f.tela === !!f.barras) return err('BASE_FACE', `Base ${nome}: informe a tela ou as barras (uma só).`);
      if (f.tela && !telaPor(f.tela, b)) return err('TELA_INEXISTENTE', `Base ${nome}: tela ${f.tela} não está no catálogo da obra.`);
      if (f.barras) {
        if (new Set(f.barras.map((x) => x.dir)).size !== f.barras.length) return err('BASE_FACE', `Base ${nome}: direção repetida.`);
        for (const l of b.lajes.filter((x) => p.ids.includes(x.id))) {
          const lin = linhaLajes(tabelaDe(b, 'lajes', l.tabela), l.tipo.tipo === 'macica' ? l.tipo.h : 0.12);
          const fora = f.barras.find((x) => !lin.bitolas.includes(x.phi));
          if (fora) return err('FORA_TABELA_BASE', `${l.nome}: φ${fora.phi} não está na tabela de armadura da laje.`, [l.id]);
        }
      }
    }
    return [];
  },
  aplicar(d, p) {
    const conv = (f: FaceBaseP) => f.tela ? { tela: f.tela, ...(f.giro ? { giro: true } : {}) } : { barras: [0, 1].map((k) => { const x = f.barras!.find((y) => y.dir === k); return x ? { phi: x.phi, s: x.s } : null; }) as [{ phi: number; s: number } | null, { phi: number; s: number } | null] };
    for (const l of d.lajes) {
      if (!p.ids.includes(l.id)) continue;
      if (l.tipo.tipo === 'nervurada') {
        // nervurada bidirecional (E3c): malha da mesa e das zonas maciças + barras corridas nas nervuras
        const bn = { ...(l.baseNervurada ?? {}) }, mesa = { ...(bn.mesa ?? {}) };
        if (p.inf) mesa.inf = conv(p.inf);
        if (p.sup) mesa.sup = conv(p.sup);
        for (const f of p.remover ?? []) delete mesa[f];
        if (mesa.inf || mesa.sup) bn.mesa = mesa; else delete bn.mesa;
        if (p.nervuras) {
          const nv: [Record<string, unknown> | null, Record<string, unknown> | null] = [bn.nervuras?.[0] ? { ...bn.nervuras[0] } : null, bn.nervuras?.[1] ? { ...bn.nervuras[1] } : null];
          for (const x of p.nervuras) {
            if (x.remover) { nv[x.dir] = null; continue; }
            const atual = { ...(nv[x.dir] ?? {}) };
            if (x.inf) atual.inf = { ...x.inf };
            if (x.sup) atual.sup = { ...x.sup };
            if (x.considerar !== undefined) { if (x.considerar) atual.considerar = true; else delete atual.considerar; }
            nv[x.dir] = Object.keys(atual).length ? atual : null;
          }
          if (nv[0] || nv[1]) bn.nervuras = nv as NonNullable<typeof bn.nervuras>; else delete bn.nervuras;
        }
        if (p.detalhada !== undefined) bn.detalhada = p.detalhada;
        if (p.detalhadaPadrao) delete bn.detalhada;
        if (bn.mesa || bn.nervuras || bn.detalhada !== undefined) l.baseNervurada = bn; else delete l.baseNervurada;
        continue;
      }
      const base = { ...(l.base ?? {}) };
      if (p.inf) base.inf = conv(p.inf);
      if (p.sup) base.sup = conv(p.sup);
      for (const f of p.remover ?? []) delete base[f];
      if (p.detalhada !== undefined) base.detalhada = p.detalhada;
      if (p.detalhadaPadrao) delete base.detalhada;
      if (base.inf || base.sup || base.detalhada !== undefined) l.base = base; else delete l.base;
    }
    return `Armadura base de ${p.ids.length} laje(s) editada.`;
  },
});

interface PredP { face: 'inf' | 'sup'; a: [number, number]; angulo: number; comprimento: number; phi: number; s: number; n: number }
registrar<{ id: string; acao: 'criar' | 'editar' | 'remover'; predefinida?: string } & Partial<PredP>>({
  nome: 'laje.armaduraPredefinida',
  descricao: 'Cria, edita ou remove uma armadura predefinida de uma laje maciça (R7d): barra representativa de `a` (m, planta) na direção `angulo` (graus) com `comprimento` (m), `n` barras φ `phi` (mm) espaçadas de `s` (m) à esquerda da representativa, na `face` inf ou sup. É medida como lançada e descontada do reforço calculado na faixa n × s. `predefinida` = id, para editar ou remover.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'acao'], properties: {
    id: { type: 'string' }, acao: { type: 'string', enum: ['criar', 'editar', 'remover'] }, predefinida: { type: 'string' },
    face: { type: 'string', enum: ['inf', 'sup'] }, a: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 }, angulo: { type: 'number' },
    comprimento: { type: 'number', minimum: 0.2, maximum: 30 }, phi: { type: 'number', enum: BITOLA_LAJE }, s: { type: 'number', minimum: 0.05, maximum: 0.33 }, n: { type: 'integer', minimum: 1, maximum: 200 },
  } },
  validar(b, p) {
    const l = b.lajes.find((x) => x.id === p.id);
    if (!l) return err('LAJE_INEXISTENTE', `Laje ${p.id} não existe.`);
    if (l.tipo.tipo !== 'macica') return err('LAJE_NAO_MACICA', `${l.nome} não é maciça.`, [l.id]);
    if (p.acao !== 'criar' && !(l.predefinidas ?? []).some((x) => x.id === p.predefinida)) return err('PREDEFINIDA_INEXISTENTE', `Predefinida ${p.predefinida ?? '?'} não existe em ${l.nome}.`, [l.id]);
    if (p.acao === 'criar') for (const k of ['face', 'a', 'angulo', 'comprimento', 'phi', 's', 'n'] as const) if (p[k] === undefined) return err('PREDEFINIDA_INCOMPLETA', `Informe ${k}.`, [l.id]);
    return [];
  },
  aplicar(d, p) {
    const l = d.lajes.find((x) => x.id === p.id)!;
    if (p.acao === 'remover') { l.predefinidas = (l.predefinidas ?? []).filter((x) => x.id !== p.predefinida); if (!l.predefinidas.length) delete l.predefinidas; return `Predefinida removida de ${l.nome}.`; }
    const r4 = (x: number) => +x.toFixed(4);
    const novo = (o?: PredP & { id: string }) => ({ id: o?.id ?? `pd_${(++d.seq).toString(36)}`, face: p.face ?? o!.face, a: (p.a ? [r4(p.a[0]), r4(p.a[1])] : o!.a) as [number, number], angulo: p.angulo ?? o!.angulo, comprimento: r4(p.comprimento ?? o!.comprimento), phi: p.phi ?? o!.phi, s: r4(p.s ?? o!.s), n: p.n ?? o!.n });
    if (p.acao === 'criar') { (l.predefinidas ??= []).push(novo()); return `Predefinida criada em ${l.nome}.`; }
    l.predefinidas = (l.predefinidas ?? []).map((x) => (x.id === p.predefinida ? novo(x) : x));
    return `Predefinida editada em ${l.nome}.`;
  },
});
