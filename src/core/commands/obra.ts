// Comandos de organização da obra: dados gerais, norma, grupos, pavimentos e eixos.
import { base64Bytes, infoJpeg, LIMITE_LOGO } from '../sheets/logo';
import type { Draft } from 'immer';
import { ARMACAO_PADRAO, COBRIMENTOS, PRANCHA_PADRAO, USOS, VENTO_PADRAO, qDoUso, type AbacosVento, type BuildingModel, type Carimbo, type CategoriaUso, type CategoriaVento, type ControleExecucao, type CurvaAbaco, type ConfigArmacao, type ConfigPrancha, type Norma } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { abacoCaPreenchido, abacoVizPreenchido, validarAbacos } from '../building/abacosVento';
import { OPCOES_INFO, efeitoDaOpcao, padraoDe, perfilDe, type OpcoesCalculo, type PerfilOpcoes } from '../building/opcoes';
import { gamaCDoControle } from '../building/acoes';
import { GAMAS_PADRAO, POSICOES_ACO, type PosicaoAco } from '../building/materiais';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const TOL = 1e-3;
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const usoSchema: JsonSchema = { type: 'string', enum: USOS.map((u) => u.v), description: 'Categoria de uso (NBR 6120)' };
const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const pav = (b: BuildingModel, id: string) => b.pavimentos.find((p) => p.id === id);
const grp = (b: BuildingModel, id: string) => b.grupos.find((g) => g.id === id);
const cotaOcupada = (b: BuildingModel, cota: number, exceto?: string) => b.pavimentos.find((p) => p.id !== exceto && Math.abs(p.cota - cota) < TOL);
const fmt = (v: number) => String(+v.toFixed(3)).replace('.', ',');

/** "Tipo 3" → "Tipo 4"; "Térreo" → "Térreo 2". */
function proximoNome(nome: string, k: number) {
  const m = /^(.*?)(\d+)$/.exec(nome.trim());
  return m ? `${m[1]}${+m[2] + k}` : `${nome} ${k + 1}`;
}

// ---- obra e norma ----

registrar<{ nome?: string; cidade?: string; profundidadeFundacao?: number }>({
  nome: 'obra.definir',
  descricao: 'Altera os dados gerais da obra (nome, cidade, profundidade da fundação abaixo do pavimento mais baixo).',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, properties: {
    nome: { type: 'string', minLength: 1 }, cidade: { type: 'string' },
    profundidadeFundacao: { type: 'number', exclusiveMinimum: 0, maximum: 30, description: 'm' },
  } },
  aplicar(d, p) {
    if (p.nome !== undefined) d.obra.nome = p.nome.trim();
    if (p.cidade !== undefined) d.obra.cidade = p.cidade;
    if (p.profundidadeFundacao !== undefined) d.obra.profundidadeFundacao = p.profundidadeFundacao;
    return 'Dados da obra alterados.';
  },
});

const curvaSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['param', 'pontos'], properties: { param: { type: 'number', exclusiveMinimum: 0, description: 'h/l1 da curva' }, pontos: { type: 'array', items: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 }, description: '[[l1/l2, Ca], …] com l1/l2 crescente' } } };

registrar<{ ativo?: boolean; v0?: number; s1?: number; s3?: number; categoria?: CategoriaVento; caX?: number; caY?: number; excentricidade?: number;
  sentido?: Partial<{ xp: number; xn: number; yp: number; yn: number }>; vizinhanca?: number; platibanda?: number;
  caAuto?: 0 | 1 | 2; vizAuto?: boolean; vizDist?: number; abacos?: { caBaixa?: CurvaAbaco[]; caAlta?: CurvaAbaco[]; vizinhanca?: [number, number][] } }>({
  nome: 'vento.definir',
  descricao: 'Define o vento (NBR 6123): ativo, V0 (m/s), S1, S3, categoria de rugosidade (I a V), coeficientes de arrasto Ca nas direções X e Y, excentricidade relativa (0,075 = edificação comum), coeficiente por sentido (+X, −X, +Y, −Y; edifício abrigado por vizinho; 1 = padrão), fator de vizinhança (NBR 6123, 6.4) e altura da platibanda (m, somada à faixa do último pavimento). Gera 12 casos: 4 direções × (centrado, +e, −e). Ábacos (N2a): `abacos` guarda as tabelas de pontos digitadas das figuras da NBR 6123 (caBaixa e caAlta: curvas por h/l1 com pontos [l1/l2, Ca]; vizinhanca: pontos [d/l1, fator]; lista vazia limpa); `caAuto` 1 ou 2 usa o Ca do ábaco de baixa ou alta turbulência e `vizAuto` o fator de vizinhança do ábaco com a distância `vizDist` (m) ao vizinho — só com a tabela preenchida; o programa não traz os pontos das figuras (a confirmar com o usuário).',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, properties: {
    ativo: { type: 'boolean' }, v0: { type: 'number', minimum: 20, maximum: 60, description: 'm/s (isopletas)' },
    s1: { type: 'number', minimum: 0.5, maximum: 2 }, s3: { type: 'number', minimum: 0.5, maximum: 1.5 },
    categoria: { type: 'string', enum: ['I', 'II', 'III', 'IV', 'V'] },
    caX: { type: 'number', minimum: 0.3, maximum: 3 }, caY: { type: 'number', minimum: 0.3, maximum: 3 },
    excentricidade: { type: 'number', minimum: 0, maximum: 0.3 },
    sentido: { type: 'object', additionalProperties: false, properties: Object.fromEntries(['xp', 'xn', 'yp', 'yn'].map((k) => [k, { type: 'number', minimum: 0, maximum: 2 }])) },
    vizinhanca: { type: 'number', minimum: 1, maximum: 1.3 }, platibanda: { type: 'number', minimum: 0, maximum: 5 },
    caAuto: { type: 'integer', enum: [0, 1, 2], description: '0 = Ca informado; 1 = ábaco de baixa turbulência; 2 = alta turbulência' }, vizAuto: { type: 'boolean' }, vizDist: { type: 'number', exclusiveMinimum: 0, description: 'm' },
    abacos: { type: 'object', additionalProperties: false, properties: { caBaixa: { type: 'array', items: curvaSchema }, caAlta: { type: 'array', items: curvaSchema }, vizinhanca: { type: 'array', items: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 } } } },
  } },
  validar(b, p) {
    const merged: AbacosVento = { ...(b.vento?.abacos ?? {}), ...(p.abacos ?? {}) };
    const erros = p.abacos ? validarAbacos(merged) : [];
    if (erros.length) return err('ABACO_INVALIDO', erros[0]);
    const ca = p.caAuto ?? 0; // o modo já gravado volta ao informado se a tabela for esvaziada (aplicar)
    if (ca && !abacoCaPreenchido(merged, ca === 1 ? 1 : 2)) return err('ABACO_VAZIO', `A tabela do Ca (${ca === 1 ? 'baixa' : 'alta'} turbulência) está vazia: digite os pontos da figura da norma antes de usar o Ca automático.`);
    const va = p.vizAuto ?? false;
    if (va && !abacoVizPreenchido(merged)) return err('ABACO_VAZIO', 'A tabela do fator de vizinhança está vazia: digite os pontos antes de usar o fator automático.');
    return [];
  },
  aplicar(d, p) {
    d.vento ??= { ...VENTO_PADRAO };
    if (p.abacos) {
      const a = { ...(d.vento.abacos ?? {}) };
      for (const k of ['caBaixa', 'caAlta', 'vizinhanca'] as const) if (p.abacos[k] !== undefined) { if (p.abacos[k]!.length) (a as Record<string, unknown>)[k] = p.abacos[k]; else delete a[k]; }
      if (Object.keys(a).length) d.vento.abacos = a; else delete d.vento.abacos;
      // tabela esvaziada: o modo automático correspondente volta ao informado
      if (d.vento.caAuto && !abacoCaPreenchido(d.vento.abacos, d.vento.caAuto === 1 ? 1 : 2)) delete d.vento.caAuto;
      if (d.vento.vizAuto && !abacoVizPreenchido(d.vento.abacos)) delete d.vento.vizAuto;
    }
    if (p.caAuto !== undefined) { if (p.caAuto) d.vento.caAuto = p.caAuto; else delete d.vento.caAuto; }
    if (p.vizAuto !== undefined) { if (p.vizAuto) d.vento.vizAuto = true; else delete d.vento.vizAuto; }
    if (p.vizDist !== undefined) d.vento.vizDist = p.vizDist;
    for (const k of ['ativo', 'v0', 's1', 's3', 'categoria', 'caX', 'caY', 'excentricidade'] as const) if (p[k] !== undefined) (d.vento as Record<string, unknown>)[k] = p[k];
    if (p.sentido) { const s0 = { ...d.vento.sentido, ...p.sentido }; for (const k of ['xp', 'xn', 'yp', 'yn'] as const) if (s0[k] === 1) delete s0[k]; if (Object.keys(s0).length) d.vento.sentido = s0; else delete d.vento.sentido; }
    if (p.vizinhanca !== undefined) { if (p.vizinhanca === 1) delete d.vento.vizinhanca; else d.vento.vizinhanca = p.vizinhanca; }
    if (p.platibanda !== undefined) { if (!p.platibanda) delete d.vento.platibanda; else d.vento.platibanda = p.platibanda; }
    return 'Vento alterado.';
  },
});

const CAMPOS_CARIMBO = ['empresa', 'obra', 'cliente', 'local', 'responsavel', 'registro', 'art', 'etapa', 'desenho', 'revisao', 'data'] as const;

registrar<{ carimbo?: Partial<Carimbo>; formato?: ConfigPrancha['formato']; escala?: number; armacao?: Partial<ConfigArmacao>; logo?: { dados: string; nome?: string }; removerLogo?: boolean }>({
  nome: 'prancha.definir',
  calculo: false,
  descricao: `Define os dados do carimbo das pranchas (empresa, obra, cliente, local, responsável técnico, registro profissional, ART/RRT, etapa do projeto, desenho, revisão, data), o formato (A0–A4 ou auto) e a escala (denominador; 0 = automática) das formas, e as opções das pranchas de armação e locação ("armacao": formato, escalaVigas 75, escalaSecao 25, escalaPilares 40, escalaLajes e escalaLocacao 0 = a das formas, lajesSeparadas 1 = positivas e negativas em folhas separadas, quadroPilares 1) e o logo do carimbo ("logo": JPEG em base64, até ${Math.round(LIMITE_LOGO / 1024)} KB em base64; "removerLogo" o retira). Campos de texto vazios e valores iguais ao padrão voltam ao padrão.`,
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: {
    carimbo: { type: 'object', additionalProperties: false, properties: Object.fromEntries(CAMPOS_CARIMBO.map((k) => [k, { type: 'string', maxLength: 120 }])) },
    formato: { type: 'string', enum: ['auto', 'A0', 'A1', 'A2', 'A3', 'A4'] },
    escala: { type: 'number', enum: [0, 20, 25, 50, 75, 100, 125, 200, 250] },
    armacao: { type: 'object', additionalProperties: false, properties: {
      formato: { type: 'string', enum: ['auto', 'A0', 'A1', 'A2', 'A3', 'A4'] },
      escalaVigas: { type: 'number', enum: [20, 25, 50, 75, 100] }, escalaSecao: { type: 'number', enum: [10, 20, 25, 50] }, escalaPilares: { type: 'number', enum: [20, 25, 40, 50, 75, 100] },
      escalaLajes: { type: 'number', enum: [0, 50, 75, 100, 125, 200, 250] }, escalaLocacao: { type: 'number', enum: [0, 50, 75, 100, 125, 200, 250] }, escalaFundacao: { type: 'number', enum: [25, 50] },
      lajesSeparadas: { type: 'number', enum: [0, 1] }, quadroPilares: { type: 'number', enum: [0, 1] },
    } },
    logo: { type: 'object', additionalProperties: false, required: ['dados'], properties: { dados: { type: 'string', minLength: 8, description: 'JPEG em base64 (sem o prefixo data:)' }, nome: { type: 'string' } } },
    removerLogo: { type: 'boolean' },
  } },
  validar(_b, p) {
    if (!p.logo) return [];
    if (p.logo.dados.length > LIMITE_LOGO) return [{ codigo: 'LOGO_GRANDE', severidade: 'erro', elementos: [], mensagem: `Logo com ${Math.round(p.logo.dados.length / 1024)} KB em base64: o limite é ${Math.round(LIMITE_LOGO / 1024)} KB (reduza a imagem).` }];
    const bytes = base64Bytes(p.logo.dados), info = bytes && infoJpeg(bytes);
    return info ? [] : [{ codigo: 'LOGO_INVALIDO', severidade: 'erro', elementos: [], mensagem: 'O logo precisa ser uma imagem JPEG em base64.' }];
  },
  aplicar(d, p) {
    d.prancha ??= { ...PRANCHA_PADRAO, carimbo: {} };
    if (p.removerLogo) delete d.prancha.logo;
    if (p.logo) { const info = infoJpeg(base64Bytes(p.logo.dados)!)!; d.prancha.logo = { dados: p.logo.dados.replace(/\s+/g, ''), largura: info.w, altura: info.h, ...(p.logo.nome ? { nome: p.logo.nome } : {}) }; }
    if (p.armacao) {
      const a: Partial<ConfigArmacao> = { ...(d.prancha.armacao ?? {}) };
      for (const [k, v] of Object.entries(p.armacao) as [keyof ConfigArmacao, never][]) { if (v === undefined) continue; if (ARMACAO_PADRAO[k] === v) delete a[k]; else a[k] = v; }
      if (Object.keys(a).length) d.prancha.armacao = a; else delete d.prancha.armacao;
    }
    for (const k of CAMPOS_CARIMBO) {
      const v = p.carimbo?.[k];
      if (v === undefined) continue;
      if (v.trim()) d.prancha.carimbo[k] = v.trim(); else delete d.prancha.carimbo[k];
    }
    if (p.formato !== undefined) d.prancha.formato = p.formato;
    if (p.escala !== undefined) d.prancha.escala = p.escala;
    return 'Pranchas: dados alterados.';
  },
});

registrar<{ valores?: Partial<OpcoesCalculo>; padrao?: (keyof OpcoesCalculo)[] | boolean; perfil?: PerfilOpcoes }>({
  nome: 'opcoes.definir',
  descricao: `Define as opções de cálculo do edifício. Dois perfis de padrões: "sistema" (critério de mercado do programa de referência, padrão) e "nbr" (NBR 6118); "perfil" troca o perfil e mantém só os valores que diferem do novo padrão. ${OPCOES_INFO.map((o) => `${o.chave} = ${o.rotulo.toLowerCase()} (padrão ${o.padrao}${o.padraoNBR !== undefined ? `; NBR ${o.padraoNBR}` : ''}${o.unidade ? ` ${o.unidade}` : ''})`).join('; ')}. "padrao": true volta tudo ao padrão do perfil; uma lista de chaves volta só essas.`,
  risco: 'escrita',
  mcp: false,
  // só opções das fundações: não refaz a análise da estrutura; só opções de dimensionamento e detalhamento: não refaz a análise (rearmar)
  calculo: (p) => {
    if (p.perfil || p.padrao === true) return true;
    const chaves = [...Object.keys((p.valores as Record<string, unknown> | undefined) ?? {}), ...(Array.isArray(p.padrao) ? (p.padrao as string[]) : [])];
    if (!chaves.length) return true;
    const ef = chaves.map(efeitoDaOpcao);
    return ef.every((e) => e === 'detalhe') ? 'detalhe' : ef.every((e) => e === 'fundacao') ? 'fundacao' : true;
  },
  schema: { type: 'object', additionalProperties: false, properties: {
    valores: { type: 'object', additionalProperties: false, properties: Object.fromEntries(OPCOES_INFO.map((o) => [o.chave, { type: 'number', minimum: o.min, maximum: o.max, description: `${o.rotulo}${o.unidade ? ` (${o.unidade})` : ''}; padrão ${o.padrao}` }])) },
    padrao: { oneOf: [{ type: 'boolean' }, { type: 'array', items: { type: 'string', enum: OPCOES_INFO.map((o) => o.chave) } }] },
    perfil: { type: 'string', enum: ['sistema', 'nbr'], description: 'Perfil dos padrões: sistema (critério de mercado) ou nbr (NBR 6118)' },
  } },
  aplicar(d, p) {
    if (p.perfil) {
      if (p.perfil === 'nbr') d.perfilOpcoes = 'nbr'; else delete d.perfilOpcoes;
      for (const o of OPCOES_INFO) if (d.opcoes?.[o.chave] === padraoDe(o, p.perfil)) delete d.opcoes[o.chave];
    }
    const perfil = perfilDe(d);
    if (p.padrao === true) delete d.opcoes;
    else if (Array.isArray(p.padrao)) for (const k of p.padrao) delete d.opcoes?.[k];
    if (p.valores) {
      d.opcoes ??= {};
      for (const o of OPCOES_INFO) { const v = p.valores[o.chave]; if (v === undefined) continue; if (v === padraoDe(o, perfil)) delete d.opcoes[o.chave]; else d.opcoes[o.chave] = v; }
    }
    if (d.opcoes && !Object.keys(d.opcoes).length) delete d.opcoes;
    const n = Object.keys(d.opcoes ?? {}).length;
    const nome = perfil === 'nbr' ? 'padrão NBR 6118' : 'padrão do sistema';
    return n ? `Opções de cálculo (${nome}): ${n} diferente(s) do padrão.` : `Opções de cálculo no ${nome}.`;
  },
});

type Elem = 'laje' | 'viga' | 'pilar' | 'fundacao';
registrar<{ fck?: Partial<Record<Elem, number>>; fckPilarPav?: { pavimento: string; fck: number }[]; aco?: Partial<Record<PosicaoAco, Norma['aco']>>; gamas?: Partial<{ c: number; s: number; g: number; q: number; h: number }>; cobFaces?: NonNullable<Norma['cobFaces']>; cobFundacao?: number; padrao?: boolean }>({
  nome: 'materiais.definir',
  descricao: 'Materiais e segurança por elemento (padrão: o da obra e a NBR 6118): fck por tipo (laje, viga, pilar, fundacao = sapatas e blocos, MPa) e dos pilares por lance (fckPilarPav; fck 0 volta ao do tipo), aço por posição (pilarLong, pilarEstribo, vigaPos, vigaNeg, vigaEstribo, lajeInf, lajeSup, fundacao), γc, γs, γg, γq, cobrimentos por face (vigaInf, vigaSup, vigaLat, lajeInf, lajeSup, cm; 0 volta ao do tipo) e cobrimento das fundações (cobFundacao, cm; 0 volta ao padrão de 5 cm). "padrao": true volta tudo ao padrão.',
  risco: 'escrita',
  // aço por posição (exceto fundação) e cobrimentos por face só mudam o dimensionamento e o detalhamento
  calculo: (p) => {
    const ks = Object.keys(p).filter((k) => p[k] !== undefined);
    if (ks.length && ks.every((k) => k === 'cobFaces' || (k === 'aco' && !Object.keys(p.aco as object).some((x) => x === 'fundacao')))) return 'detalhe';
    return ks.length && ks.every((k) => k === 'cobFundacao') ? 'fundacao' : true;
  },
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: {
    fck: { type: 'object', additionalProperties: false, properties: { laje: { type: 'number', minimum: 20, maximum: 90 }, viga: { type: 'number', minimum: 20, maximum: 90 }, pilar: { type: 'number', minimum: 20, maximum: 90 }, fundacao: { type: 'number', minimum: 20, maximum: 90 } } },
    fckPilarPav: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['pavimento', 'fck'], properties: { pavimento: { type: 'string' }, fck: { type: 'number', minimum: 0, maximum: 90 } } } },
    aco: { type: 'object', additionalProperties: false, properties: Object.fromEntries(POSICOES_ACO.map((x) => [x.k, { type: 'string', enum: ['CA-50', 'CA-60'], description: x.rotulo }])) },
    gamas: { type: 'object', additionalProperties: false, properties: { c: { type: 'number', minimum: 1, maximum: 2 }, s: { type: 'number', minimum: 1, maximum: 1.5 }, g: { type: 'number', minimum: 1, maximum: 2 }, q: { type: 'number', minimum: 1, maximum: 2 }, h: { type: 'number', minimum: 1, maximum: 2, description: 'empuxo de terra (caso H)' } } },
    cobFaces: { type: 'object', additionalProperties: false, properties: Object.fromEntries(['vigaInf', 'vigaSup', 'vigaLat', 'lajeInf', 'lajeSup'].map((k) => [k, { type: 'number', minimum: 0, maximum: 10 }])) },
    cobFundacao: { type: 'number', minimum: 0, maximum: 10, description: 'cobrimento de sapatas, blocos e tubulões (cm); 0 = padrão (5 cm)' },
    padrao: { type: 'boolean' },
  } },
  validar(b, p) {
    const sv = (p.fckPilarPav ?? []).filter((x) => !pav(b, x.pavimento)).map((x) => x.pavimento);
    if (sv.length) return err('PAVIMENTO_INEXISTENTE', `Pavimento ${sv.join(', ')} não existe.`);
    return (p.fckPilarPav ?? []).some((x) => x.fck && x.fck < 20) ? err('FCK_INVALIDO', 'fck do lance entre 20 e 90 MPa (0 volta ao do tipo).') : [];
  },
  aplicar(d, p) {
    const n = d.norma;
    if (p.padrao) { delete n.fckElem; delete n.fckPilarPav; delete n.acoPos; delete n.gamas; delete n.cobFaces; delete n.cobFundacao; }
    if (p.fck) { n.fckElem ??= {}; for (const k of ['laje', 'viga', 'pilar', 'fundacao'] as const) { const v = p.fck[k]; if (v === undefined) continue; if (v === n.fck) delete n.fckElem[k]; else n.fckElem[k] = v; } }
    for (const x of p.fckPilarPav ?? []) { n.fckPilarPav = (n.fckPilarPav ?? []).filter((y) => y.pavimento !== x.pavimento); if (x.fck) n.fckPilarPav.push({ ...x }); }
    if (p.aco) { n.acoPos ??= {}; for (const x of POSICOES_ACO) { const v = p.aco[x.k]; if (!v) continue; if (v === n.aco) delete n.acoPos[x.k]; else n.acoPos[x.k] = v; } }
    if (p.gamas) { n.gamas ??= {}; for (const k of ['c', 's', 'g', 'q', 'h'] as const) { const v = p.gamas[k]; if (v === undefined) continue; if (v === (k === 'c' ? gamaCDoControle(n.controle) : GAMAS_PADRAO[k])) delete n.gamas[k]; else n.gamas[k] = v; } }
    if (p.cobFaces) { n.cobFaces ??= {}; for (const [k, v] of Object.entries(p.cobFaces) as [keyof NonNullable<Norma['cobFaces']>, number][]) { if (!v) delete n.cobFaces[k]; else n.cobFaces[k] = v; } }
    if (p.cobFundacao !== undefined) { if (p.cobFundacao) n.cobFundacao = p.cobFundacao; else delete n.cobFundacao; }
    // valores antigos nas opções das fundações (antes dos materiais da fundação) deixam de valer
    const fp = d.fundacao?.params;
    if (fp && (p.padrao || p.fck?.fundacao !== undefined)) delete fp.fckFound;
    if (fp && (p.padrao || p.cobFundacao !== undefined)) delete fp.cover;
    if (fp && d.fundacao && !Object.keys(fp).length) delete d.fundacao.params;
    for (const k of ['fckElem', 'acoPos', 'gamas', 'cobFaces'] as const) if (n[k] && !Object.keys(n[k]!).length) delete n[k];
    if (n.fckPilarPav && !n.fckPilarPav.length) delete n.fckPilarPav;
    return 'Materiais e segurança alterados.';
  },
});

registrar<{ fck?: number; aco?: Norma['aco']; caa?: Norma['caa']; cobrimento?: Norma['cobrimento']; psiQ?: [number, number, number]; psiUso?: Norma['psiUso']; controle?: ControleExecucao }>({
  nome: 'norma.definir',
  descricao: 'Define fck, aço, classe de agressividade ambiental, cobrimentos, ψ da carga de uso e o nível de controle de execução (NBR 6118): normal (γc 1,4), desfavoravel (γc × 1,1) ou premoldado (γc 1,3, NBR 9062); o controle fixa o γc padrão, que segue editável em materiais.definir. Ao mudar a CAA sem informar cobrimentos, aplica os da Tabela 7.2.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, properties: {
    fck: { type: 'number', minimum: 20, maximum: 90, description: 'MPa' },
    aco: { type: 'string', enum: ['CA-50', 'CA-60'] },
    caa: { type: 'string', enum: ['I', 'II', 'III', 'IV'] },
    cobrimento: { type: 'object', additionalProperties: false, required: ['laje', 'viga', 'pilar'], properties: {
      laje: { type: 'number', minimum: 1 }, viga: { type: 'number', minimum: 1 }, pilar: { type: 'number', minimum: 1 },
    }, description: 'cm' },
    controle: { type: 'string', enum: ['normal', 'desfavoravel', 'premoldado'], description: 'Controle de execução: fixa o γc padrão (1,4 / 1,54 / 1,3)' },
    psiQ: { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 }, minItems: 3, maxItems: 3, description: 'ψ0, ψ1, ψ2 da carga de uso (residencial 0,5/0,4/0,3; escritórios 0,7/0,6/0,4)' },
    psiUso: { type: 'object', additionalProperties: false, properties: {
      B: { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 }, minItems: 3, maxItems: 3 },
      C: { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 }, minItems: 3, maxItems: 3 },
    }, description: 'ψ0, ψ1, ψ2 das classes de uso com caso próprio: B escritórios (padrão 0,7/0,6/0,4), C garagens (0,8/0,7/0,6)' },
  } },
  aplicar(d, p) {
    if (p.controle) { if (p.controle === 'normal') delete d.norma.controle; else d.norma.controle = p.controle; }
    if (p.psiQ) d.norma.psiQ = [...p.psiQ];
    if (p.psiUso) d.norma.psiUso = { ...d.norma.psiUso, ...p.psiUso };
    if (p.fck !== undefined) d.norma.fck = p.fck;
    if (p.aco) d.norma.aco = p.aco;
    if (p.caa) { d.norma.caa = p.caa; if (!p.cobrimento) d.norma.cobrimento = { ...COBRIMENTOS[p.caa] }; }
    if (p.cobrimento) d.norma.cobrimento = { ...p.cobrimento };
    return 'Parâmetros de norma alterados.';
  },
});

// ---- grupos ----

registrar<{ nome: string; uso: CategoriaUso; gRev: number; q?: number }>({
  nome: 'grupo.criar',
  descricao: 'Cria um grupo de pavimentos iguais (planta compartilhada), com uso, revestimento e carga variável.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['nome'], properties: {
    nome: { type: 'string', minLength: 1 }, uso: { ...usoSchema, default: 'residencial' },
    gRev: { type: 'number', minimum: 0, default: 1.0, description: 'Revestimento e piso (kN/m²)' },
    q: { type: 'number', minimum: 0, description: 'Carga variável (kN/m²); padrão pelo uso' },
  } },
  aplicar(d, p) {
    d.grupos.push({ id: novoId(d, 'g'), nome: p.nome.trim(), uso: p.uso, gRev: p.gRev, q: p.q ?? qDoUso(p.uso) });
    return `Grupo “${p.nome.trim()}” criado.`;
  },
});

registrar<{ id: string; nome?: string; uso?: CategoriaUso; gRev?: number; q?: number }>({
  nome: 'grupo.editar',
  descricao: 'Altera nome, uso, revestimento ou carga variável de um grupo. Ao mudar o uso sem informar q, aplica a carga padrão do uso.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, uso: usoSchema,
    gRev: { type: 'number', minimum: 0 }, q: { type: 'number', minimum: 0 },
  } },
  validar: (b, p) => (grp(b, p.id) ? [] : err('GRUPO_INEXISTENTE', `Grupo ${p.id} não existe.`)),
  aplicar(d, p) {
    const g = d.grupos.find((x) => x.id === p.id)!;
    if (p.nome !== undefined) g.nome = p.nome.trim();
    if (p.uso) { g.uso = p.uso; if (p.q === undefined) g.q = qDoUso(p.uso); }
    if (p.gRev !== undefined) g.gRev = p.gRev;
    if (p.q !== undefined) g.q = p.q;
    return `Grupo “${g.nome}” alterado.`;
  },
});

registrar<{ id: string }>({
  nome: 'grupo.remover',
  descricao: 'Remove um grupo sem pavimentos.',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' } } },
  validar(b, p) {
    if (!grp(b, p.id)) return err('GRUPO_INEXISTENTE', `Grupo ${p.id} não existe.`);
    const n = b.pavimentos.filter((x) => x.grupo === p.id).length;
    return n ? err('GRUPO_EM_USO', `O grupo tem ${n} pavimento(s); mova-os antes de remover.`, [p.id]) : [];
  },
  aplicar(d, p) { d.grupos = d.grupos.filter((g) => g.id !== p.id); return 'Grupo removido.'; },
});

registrar<{ pavimento: string }>({
  nome: 'grupo.desvincular',
  descricao: 'Cria um grupo próprio para o pavimento, copiando uso e cargas do grupo atual (a planta passa a ser independente).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['pavimento'], properties: { pavimento: { type: 'string' } } },
  validar(b, p) {
    const x = pav(b, p.pavimento);
    if (!x) return err('PAVIMENTO_INEXISTENTE', `Pavimento ${p.pavimento} não existe.`);
    return b.pavimentos.filter((y) => y.grupo === x.grupo).length < 2 ? err('GRUPO_UNICO', `${x.nome} já é o único pavimento do grupo.`, [x.id]) : [];
  },
  aplicar(d, p) {
    const x = d.pavimentos.find((y) => y.id === p.pavimento)!;
    const g = d.grupos.find((y) => y.id === x.grupo)!;
    const id = novoId(d, 'g');
    d.grupos.push({ ...g, id, nome: x.nome });
    x.grupo = id;
    return `${x.nome} desvinculado de “${g.nome}”.`;
  },
});

// ---- pavimentos ----

registrar<{ nome: string; cota: number; grupo?: string; uso: CategoriaUso }>({
  nome: 'pavimento.criar',
  descricao: 'Cria um pavimento na cota do topo da laje estrutural. Sem grupo informado, cria um grupo próprio com o mesmo nome.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['nome', 'cota'], properties: {
    nome: { type: 'string', minLength: 1 }, cota: { type: 'number', description: 'Topo da laje estrutural (m)' },
    grupo: { type: 'string', description: 'Id de um grupo existente' }, uso: { ...usoSchema, default: 'residencial' },
  } },
  validar(b, p) {
    if (p.grupo && !grp(b, p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    const o = cotaOcupada(b, p.cota);
    return o ? err('COTA_OCUPADA', `${o.nome} já está na cota ${fmt(p.cota)} m.`, [o.id]) : [];
  },
  aplicar(d, p) {
    let g = p.grupo;
    if (!g) { g = novoId(d, 'g'); d.grupos.push({ id: g, nome: p.nome.trim(), uso: p.uso, gRev: 1.0, q: qDoUso(p.uso) }); }
    d.pavimentos.push({ id: novoId(d, 'pav'), nome: p.nome.trim(), cota: p.cota, grupo: g });
    d.pavimentos.sort((a, z) => a.cota - z.cota);
    return `Pavimento “${p.nome.trim()}” criado na cota ${fmt(p.cota)} m.`;
  },
});

registrar<{ id: string; nome?: string; cota?: number; grupo?: string; alfaFlambagem?: number }>({
  nome: 'pavimento.editar',
  descricao: 'Altera nome, cota, grupo ou α de flambagem dos lances de pilar que chegam ao pavimento (multiplica o de cada pilar; 1 = padrão).',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, cota: { type: 'number' }, grupo: { type: 'string' },
    alfaFlambagem: { type: 'number', minimum: 0.1, maximum: 10 },
  } },
  validar(b, p) {
    if (!pav(b, p.id)) return err('PAVIMENTO_INEXISTENTE', `Pavimento ${p.id} não existe.`);
    if (p.grupo && !grp(b, p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    const o = p.cota !== undefined ? cotaOcupada(b, p.cota, p.id) : undefined;
    return o ? err('COTA_OCUPADA', `${o.nome} já está na cota ${fmt(p.cota!)} m.`, [o.id]) : [];
  },
  aplicar(d, p) {
    const x = d.pavimentos.find((y) => y.id === p.id)!;
    if (p.nome !== undefined) x.nome = p.nome.trim();
    if (p.cota !== undefined) x.cota = p.cota;
    if (p.grupo) x.grupo = p.grupo;
    if (p.alfaFlambagem !== undefined) { if (p.alfaFlambagem === 1) delete x.alfaFlambagem; else x.alfaFlambagem = p.alfaFlambagem; }
    d.pavimentos.sort((a, z) => a.cota - z.cota);
    return `Pavimento “${x.nome}” alterado.`;
  },
});

registrar<{ id: string }>({
  nome: 'pavimento.remover',
  descricao: 'Remove um pavimento. O grupo que ficar sem pavimentos também é removido (com suas máscaras); pilares que nasciam ou morriam nele passam ao pavimento de baixo.',
  risco: 'destrutivo',
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' } } },
  validar: (b, p) => (pav(b, p.id) ? [] : err('PAVIMENTO_INEXISTENTE', `Pavimento ${p.id} não existe.`)),
  aplicar(d, p) {
    const ps = [...d.pavimentos].sort((a, z) => a.cota - z.cota);
    const i = ps.findIndex((y) => y.id === p.id);
    const x = ps[i], abaixo = i > 0 ? ps[i - 1].id : 'fundacao';
    d.pavimentos = d.pavimentos.filter((y) => y.id !== p.id);
    if (!d.pavimentos.some((y) => y.grupo === x.grupo)) {
      d.grupos = d.grupos.filter((g) => g.id !== x.grupo);
      d.mascaras = d.mascaras.filter((m) => m.grupo !== x.grupo);
    }
    // pilares: quem nascia no pavimento passa a nascer no de baixo; quem morria nele morre no de baixo (ou some)
    const removidos: string[] = [];
    d.pilares = d.pilares.filter((q) => {
      if (q.nasce === p.id) q.nasce = abaixo;
      if (q.morre === p.id) {
        if (abaixo === 'fundacao' || abaixo === q.nasce) { removidos.push(q.nome); return false; }
        q.morre = abaixo;
      }
      if (q.secoes) { q.secoes = q.secoes.filter((s) => s.pavimento !== p.id); if (!q.secoes.length) delete q.secoes; }
      if (q.fck) { q.fck = q.fck.filter((f) => f.pavimento !== p.id); if (!q.fck.length) delete q.fck; }
      // pilar que nascia sobre o pavimento removido e passa a nascer no de baixo perde o início próprio se virar pilar da fundação
      if (q.inicio && q.nasce === 'fundacao') delete q.inicio;
      return true;
    });
    return `Pavimento “${x.nome}” removido${removidos.length ? `; pilares sem lance removidos: ${removidos.join(', ')}` : ''}.`;
  },
});

registrar<{ id: string; vezes: number; peDireito?: number }>({
  nome: 'pavimento.repetir',
  descricao: 'Insere cópias do pavimento logo acima dele, no mesmo grupo (pavimento-tipo). Os pavimentos de cima sobem o necessário.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['id', 'vezes'], properties: {
    id: { type: 'string' }, vezes: { type: 'integer', minimum: 1, maximum: 60 },
    peDireito: { type: 'number', exclusiveMinimum: 0, description: 'm; padrão: o pé-direito do pavimento' },
  } },
  validar(b, p) {
    const x = pav(b, p.id);
    if (!x) return err('PAVIMENTO_INEXISTENTE', `Pavimento ${p.id} não existe.`);
    const ps = [...b.pavimentos].sort((a, z) => a.cota - z.cota);
    const i = ps.findIndex((y) => y.id === p.id);
    const h = p.peDireito ?? (i > 0 ? x.cota - ps[i - 1].cota : 0);
    return h > 0 ? [] : err('PE_DIREITO_INDEFINIDO', `Informe o pé-direito: ${x.nome} é o pavimento mais baixo.`, [x.id]);
  },
  aplicar(d, p) {
    const ps = [...d.pavimentos].sort((a, z) => a.cota - z.cota);
    const i = ps.findIndex((y) => y.id === p.id);
    const x = ps[i];
    const h = p.peDireito ?? x.cota - ps[i - 1].cota;
    const sobe = p.vezes * h;
    for (const y of ps.slice(i + 1)) y.cota = +(y.cota + sobe).toFixed(6);
    for (let k = 1; k <= p.vezes; k++) d.pavimentos.push({ id: novoId(d, 'pav'), nome: proximoNome(x.nome, k), cota: +(x.cota + k * h).toFixed(6), grupo: x.grupo });
    d.pavimentos.sort((a, z) => a.cota - z.cota);
    return `${p.vezes} cópia(s) de “${x.nome}” inseridas (pé-direito ${fmt(h)} m).`;
  },
});

// ---- eixos ----

registrar<{ nome: string; p1: [number, number]; p2: [number, number] }>({
  nome: 'eixo.criar',
  descricao: 'Cria um eixo de referência pela reta p1–p2 (m).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['nome', 'p1', 'p2'], properties: { nome: { type: 'string', minLength: 1 }, p1: ponto, p2: ponto } },
  validar: (_b, p) => (Math.hypot(p.p2[0] - p.p1[0], p.p2[1] - p.p1[1]) < TOL ? err('EIXO_DEGENERADO', 'Os dois pontos do eixo coincidem.') : []),
  aplicar(d, p) { d.eixos.push({ id: novoId(d, 'e'), nome: p.nome.trim(), p1: [...p.p1], p2: [...p.p2] }); return `Eixo ${p.nome.trim()} criado.`; },
});

registrar<{ id: string; nome?: string; p1?: [number, number]; p2?: [number, number] }>({
  nome: 'eixo.editar',
  descricao: 'Altera o nome ou os pontos de um eixo.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, p1: ponto, p2: ponto } },
  validar(b, p) {
    const e = b.eixos.find((x) => x.id === p.id);
    if (!e) return err('EIXO_INEXISTENTE', `Eixo ${p.id} não existe.`);
    const a = p.p1 ?? e.p1, z = p.p2 ?? e.p2;
    return Math.hypot(z[0] - a[0], z[1] - a[1]) < TOL ? err('EIXO_DEGENERADO', 'Os dois pontos do eixo coincidem.', [e.id]) : [];
  },
  aplicar(d, p) {
    const e = d.eixos.find((x) => x.id === p.id)!;
    if (p.nome !== undefined) e.nome = p.nome.trim();
    if (p.p1) e.p1 = [...p.p1];
    if (p.p2) e.p2 = [...p.p2];
    return `Eixo ${e.nome} alterado.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'eixo.remover',
  descricao: 'Remove eixos de referência.',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } } },
  validar(b, p) {
    const falta = p.ids.filter((id) => !b.eixos.some((e) => e.id === id));
    return falta.length ? err('EIXO_INEXISTENTE', `Eixo(s) inexistente(s): ${falta.join(', ')}.`) : [];
  },
  aplicar(d, p) { const s = new Set(p.ids); d.eixos = d.eixos.filter((e) => !s.has(e.id)); return `${p.ids.length} eixo(s) removido(s).`; },
});

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const letra = (i: number) => (i < 26 ? LETRAS[i] : LETRAS[Math.floor(i / 26) - 1] + LETRAS[i % 26]);

registrar<{ origem: [number, number]; dx: number[]; dy: number[]; angulo: number; substituir: boolean; balanco: number }>({
  nome: 'eixo.malha',
  descricao: 'Cria uma malha de eixos: verticais numerados (1, 2, 3...) com os espaçamentos dx e horizontais com letras (A, B, C...) com os espaçamentos dy, a partir da origem e girada de `angulo` graus.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, properties: {
    origem: { ...ponto, default: [0, 0] },
    dx: { type: 'array', items: { type: 'number', exclusiveMinimum: 0 }, default: [], description: 'Espaçamentos entre eixos verticais (m)' },
    dy: { type: 'array', items: { type: 'number', exclusiveMinimum: 0 }, default: [], description: 'Espaçamentos entre eixos horizontais (m)' },
    angulo: { type: 'number', default: 0, description: 'graus, anti-horário' },
    substituir: { type: 'boolean', default: false, description: 'Apaga os eixos existentes antes' },
    balanco: { type: 'number', minimum: 0, default: 1, description: 'Prolongamento dos eixos além da malha (m)' },
  } },
  validar: (_b, p) => (p.dx.length + p.dy.length === 0 ? err('MALHA_VAZIA', 'Informe ao menos um espaçamento em dx ou dy.') : []),
  aplicar(d, p) {
    if (p.substituir) d.eixos = [];
    const xs = [0], ys = [0];
    for (const v of p.dx) xs.push(xs[xs.length - 1] + v);
    for (const v of p.dy) ys.push(ys[ys.length - 1] + v);
    const a = (p.angulo * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const T = (u: number, v: number): [number, number] => [+(p.origem[0] + u * c - v * s).toFixed(6), +(p.origem[1] + u * s + v * c).toFixed(6)];
    const e = p.balanco, x0 = -e, x1 = xs[xs.length - 1] + e, y0 = -e, y1 = ys[ys.length - 1] + e;
    if (p.dx.length) xs.forEach((u, i) => d.eixos.push({ id: novoId(d, 'e'), nome: String(i + 1), p1: T(u, y0), p2: T(u, y1) }));
    if (p.dy.length) ys.forEach((v, i) => d.eixos.push({ id: novoId(d, 'e'), nome: letra(i), p1: T(x0, v), p2: T(x1, v) }));
    return `Malha com ${p.dx.length ? xs.length : 0} eixo(s) vertical(is) e ${p.dy.length ? ys.length : 0} horizontal(is).`;
  },
});

/** Sequência de comandos do edifício padrão (Térreo, 3 tipos, cobertura), usada em "Novo edifício". */
export function comandosEdificioPadrao(): { nome: string; params: Record<string, unknown> }[] {
  return [
    { nome: 'obra.definir', params: { nome: 'Edifício residencial' } },
    { nome: 'pavimento.criar', params: { nome: 'Térreo', cota: 0, uso: 'comum' } },
    { nome: 'grupo.criar', params: { nome: 'Tipo', uso: 'residencial' } },
    { nome: 'pavimento.criar', params: { nome: 'Tipo 1', cota: 3, grupo: 'g_3' } },
    { nome: 'pavimento.repetir', params: { id: 'pav_4', vezes: 2 } },
    { nome: 'pavimento.criar', params: { nome: 'Cobertura', cota: 12, uso: 'cobertura' } },
  ];
}
