// Edição, uniformização e linhas de dobra da armadura das lajes maciças (frente R7e).
//  - laje.uniformizacao: zonas (linha ou retângulo) que igualam taxa e comprimento ao máximo das barras que passam por elas;
//  - laje.linhaDobra: linhas de dobra (negativo máximo, emenda preferencial da inferior, vão dos mínimos em % do vão);
//  - laje.barras: edição bloqueada das posições (n, φ, espaçamento, comprimento, ganchos), conjunto da tabela, agrupar,
//    desagrupar, emenda construtiva e refazer a armadura calculada;
//  - lajes.gerarArmadura: armadura só com a geometria (mínimos e base), sem os esforços, para edição manual;
//  - prancha.rotulo: posição dos rótulos das barras nas pranchas (dado de prancha, não muda o cálculo).
import { PRANCHA_PADRAO, type BuildingModel, type EdicaoBarraLaje, type Laje } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { linhaLajes, tabelaDe } from '../building/tabelasArmadura';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const BITOLA_LAJE = [5, 6.3, 8, 10, 12.5, 16];
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 };
const r4 = (x: number) => +x.toFixed(4);
const pt = (p: number[]): [number, number] => [r4(p[0]), r4(p[1])];

// ------------------------------------------------------------------ zonas de uniformização

interface ZonaP { acao: 'criar' | 'editar' | 'remover'; zona?: string; grupo?: string; forma?: 'linha' | 'retangulo'; pontos?: number[][]; largura?: number; face?: 'inf' | 'sup'; angulo?: number; qualquerDirecao?: boolean }
registrar<ZonaP>({
  nome: 'laje.uniformizacao',
  descricao: 'Cria, edita ou remove uma zona de uniformização da armadura das lajes maciças de um grupo (R7e): `forma` linha (dois pontos e `largura` total da faixa, m) ou retângulo (dois cantos opostos), `face` inf ou sup e, opcional, a `angulo` das barras (graus; `qualquerDirecao` limpa). As barras calculadas da face que passam pela zona recebem a maior taxa (φ e espaçamento de maior As/m) e o maior comprimento entre elas; vale em todo detalhamento, antes ou depois do cálculo. `zona` = id, para editar ou remover.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['acao'], properties: {
    acao: { type: 'string', enum: ['criar', 'editar', 'remover'] }, zona: { type: 'string' }, grupo: { type: 'string' },
    forma: { type: 'string', enum: ['linha', 'retangulo'] }, pontos: { type: 'array', items: ponto, minItems: 2, maxItems: 2 },
    largura: { type: 'number', minimum: 0.05, maximum: 20, description: 'largura total da faixa da linha (m); padrão 0,5' },
    face: { type: 'string', enum: ['inf', 'sup'] }, angulo: { type: 'number' }, qualquerDirecao: { type: 'boolean' },
  } },
  validar(b, p) {
    if (p.acao !== 'criar' && !(b.zonasLaje ?? []).some((z) => z.id === p.zona)) return err('ZONA_INEXISTENTE', `Zona de uniformização ${p.zona ?? '?'} não existe.`);
    if (p.acao === 'remover') return [];
    if (p.grupo !== undefined && !b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    if (p.acao === 'criar') for (const k of ['grupo', 'forma', 'pontos', 'face'] as const) if (p[k] === undefined) return err('ZONA_INCOMPLETA', `Informe ${k}.`);
    const z = (b.zonasLaje ?? []).find((x) => x.id === p.zona), pts = p.pontos ?? z?.pontos, forma = p.forma ?? z?.forma;
    if (pts && Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) < 0.05) return err('ZONA_VAZIA', 'Os dois pontos da zona coincidem.');
    if (pts && forma === 'retangulo' && (Math.abs(pts[1][0] - pts[0][0]) < 0.05 || Math.abs(pts[1][1] - pts[0][1]) < 0.05)) return err('ZONA_VAZIA', 'O retângulo da zona tem um lado nulo.');
    return [];
  },
  aplicar(d, p) {
    if (p.acao === 'remover') { d.zonasLaje = (d.zonasLaje ?? []).filter((z) => z.id !== p.zona); if (!d.zonasLaje.length) delete d.zonasLaje; return 'Zona de uniformização removida.'; }
    const velha = (d.zonasLaje ?? []).find((z) => z.id === p.zona);
    const forma = p.forma ?? velha?.forma ?? 'linha';
    const nova = {
      id: velha?.id ?? `zu_${(++d.seq).toString(36)}`, grupo: p.grupo ?? velha!.grupo, forma,
      pontos: (p.pontos ? [pt(p.pontos[0]), pt(p.pontos[1])] : velha!.pontos) as [[number, number], [number, number]],
      ...(forma === 'linha' ? { largura: r4(p.largura ?? velha?.largura ?? 0.5) } : {}), face: p.face ?? velha!.face,
      ...(p.qualquerDirecao ? {} : (p.angulo ?? velha?.angulo) !== undefined ? { angulo: p.angulo ?? velha!.angulo } : {}),
    };
    if (velha) { d.zonasLaje = d.zonasLaje!.map((z) => (z.id === velha.id ? nova : z)); return 'Zona de uniformização editada.'; }
    (d.zonasLaje ??= []).push(nova);
    return `Zona de uniformização criada (${forma === 'linha' ? 'linha' : 'retângulo'}, face ${nova.face === 'inf' ? 'inferior' : 'superior'}).`;
  },
});

// ------------------------------------------------------------------ linhas de dobra

registrar<{ acao: 'criar' | 'editar' | 'remover'; linha?: string; grupo?: string; a?: number[]; z?: number[] }>({
  nome: 'laje.linhaDobra',
  descricao: 'Cria, edita ou remove uma linha de dobra das lajes maciças de um grupo (R7e): segmento de `a` a `z` (m, planta). A armadura inferior emendada por traspasse (acima da barra máxima) tem a emenda centrada na linha que cruza a barra e os negativos em porcentagem mínima do vão usam o vão até a linha seguinte. `linha` = id, para editar ou remover.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['acao'], properties: {
    acao: { type: 'string', enum: ['criar', 'editar', 'remover'] }, linha: { type: 'string' }, grupo: { type: 'string' }, a: ponto, z: ponto,
  } },
  validar(b, p) {
    if (p.acao !== 'criar' && !(b.linhasDobra ?? []).some((x) => x.id === p.linha)) return err('LINHA_INEXISTENTE', `Linha de dobra ${p.linha ?? '?'} não existe.`);
    if (p.acao === 'remover') return [];
    if (p.grupo !== undefined && !b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    if (p.acao === 'criar') for (const k of ['grupo', 'a', 'z'] as const) if (p[k] === undefined) return err('LINHA_INCOMPLETA', `Informe ${k}.`);
    const v = (b.linhasDobra ?? []).find((x) => x.id === p.linha), a = p.a ?? v?.a, z = p.z ?? v?.z;
    if (a && z && Math.hypot(z[0] - a[0], z[1] - a[1]) < 0.05) return err('LINHA_VAZIA', 'Os dois pontos da linha de dobra coincidem.');
    return [];
  },
  aplicar(d, p) {
    if (p.acao === 'remover') { d.linhasDobra = (d.linhasDobra ?? []).filter((x) => x.id !== p.linha); if (!d.linhasDobra.length) delete d.linhasDobra; return 'Linha de dobra removida.'; }
    const velha = (d.linhasDobra ?? []).find((x) => x.id === p.linha);
    const nova = { id: velha?.id ?? `ld_${(++d.seq).toString(36)}`, grupo: p.grupo ?? velha!.grupo, a: p.a ? pt(p.a) : velha!.a, z: p.z ? pt(p.z) : velha!.z };
    if (velha) { d.linhasDobra = d.linhasDobra!.map((x) => (x.id === velha.id ? nova : x)); return 'Linha de dobra editada.'; }
    (d.linhasDobra ??= []).push(nova);
    return 'Linha de dobra criada.';
  },
});

// ------------------------------------------------------------------ edição das posições

interface BarraP { pos: string; face: 'inf' | 'sup'; tipo: string; dir?: number; n?: number; phi?: number; s?: number; comprimento?: number; ganchos?: number[] }
interface BarrasP {
  id?: string; ids?: string[]; acao: 'editar' | 'conjunto' | 'agrupar' | 'desagrupar' | 'emendar' | 'reverter' | 'refazer';
  barras?: BarraP[]; conjunto?: { phi: number; s: number }; valores?: { phi?: number; s?: number; comprimento?: number }; em?: number;
}
const TIPOS = ['positiva', 'base', 'reforco', 'predefinida', 'negativa', 'negativa-borda', 'distribuicao', 'borda-livre', 'borda-livre-long', 'canto', 'furo'];
const sig = (x: BarraP) => `${x.face}|${x.tipo}|${x.dir ?? ''}`;
const barraSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['pos', 'face', 'tipo'], properties: {
  pos: { type: 'string', description: 'posição (N1, N2, …)' }, face: { type: 'string', enum: ['inf', 'sup'] }, tipo: { type: 'string', enum: TIPOS }, dir: { type: 'integer', enum: [0, 1] },
  n: { type: 'integer', minimum: 1, maximum: 400 }, phi: { type: 'number', enum: BITOLA_LAJE }, s: { type: 'number', minimum: 0.05, maximum: 0.33, description: 'espaçamento (m)' },
  comprimento: { type: 'number', minimum: 0.2, maximum: 30, description: 'comprimento total da barra, com ganchos (m)' },
  ganchos: { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 }, minItems: 2, maxItems: 2, description: 'perna ou gancho em cada ponta (m de barra desenvolvida)' },
} };

registrar<BarrasP>({
  nome: 'laje.barras',
  descricao: 'Edita as posições de armadura de uma laje maciça (R7e), bloqueando-as (o recálculo verifica a armadura exigida, ARM_BLOQ, e desconsidera a edição se a numeração mudar). `editar`: n, φ, espaçamento `s` (m), comprimento total e `ganchos` por posição (`barras`: pos, face, tipo, dir); posições agrupadas editam juntas. `conjunto`: φ e s de uma linha da tabela de armadura da laje. `agrupar`: junta posições (com `valores` iguais, p.ex. os máximos). `desagrupar`: desfaz o grupo da posição. `emendar`: corta a posição em `em` (m a partir do início), com o traspasse construtivo das opções, sem recalcular. `reverter`: volta as posições ao calculado. `refazer` (`ids`): descarta a edição e a geração sem cálculo das lajes e refaz a armadura com os esforços; zonas de uniformização e linhas de dobra ficam.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['acao'], properties: {
    id: { type: 'string' }, ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
    acao: { type: 'string', enum: ['editar', 'conjunto', 'agrupar', 'desagrupar', 'emendar', 'reverter', 'refazer'] },
    barras: { type: 'array', items: barraSchema, minItems: 1 },
    conjunto: { type: 'object', additionalProperties: false, required: ['phi', 's'], properties: { phi: { type: 'number', enum: BITOLA_LAJE }, s: { type: 'number', minimum: 0.05, maximum: 0.33 } } },
    valores: { type: 'object', additionalProperties: false, properties: { phi: { type: 'number', enum: BITOLA_LAJE }, s: { type: 'number', minimum: 0.05, maximum: 0.33 }, comprimento: { type: 'number', minimum: 0.2, maximum: 30 } } },
    em: { type: 'number', minimum: 0.1, maximum: 30 },
  } },
  validar(b, p) {
    if (p.acao === 'refazer') {
      const sem = (p.ids ?? (p.id ? [p.id] : [])).filter((id) => !b.lajes.some((x) => x.id === id));
      return !p.ids?.length && !p.id ? err('LAJE_INEXISTENTE', 'Informe ids.') : sem.length ? err('LAJE_INEXISTENTE', `Laje ${sem.join(', ')} não existe.`) : [];
    }
    const l = b.lajes.find((x) => x.id === p.id);
    if (!l) return err('LAJE_INEXISTENTE', `Laje ${p.id ?? '?'} não existe.`);
    if (l.tipo.tipo !== 'macica') return err('LAJE_NAO_MACICA', `${l.nome} não é maciça.`, [l.id]);
    if (!p.barras?.length) return err('SEM_EDICAO', 'Informe barras.', [l.id]);
    for (const x of p.barras) if (!/^N[0-9]+$/.test(x.pos)) return err('POSICAO_INVALIDA', `Posição ${x.pos} inválida (use N1, N2, …).`, [l.id]);
    if (p.acao === 'editar' && p.barras.some((x) => x.n === undefined && x.phi === undefined && x.s === undefined && x.comprimento === undefined && x.ganchos === undefined)) return err('SEM_EDICAO', 'Informe ao menos um de n, phi, s, comprimento ou ganchos por posição.', [l.id]);
    if (p.acao === 'conjunto') {
      if (!p.conjunto) return err('SEM_CONJUNTO', 'Informe o conjunto { phi, s }.', [l.id]);
      const lin = linhaLajes(tabelaDe(b, 'lajes', l.tabela), l.tipo.h);
      if (!lin.bitolas.includes(p.conjunto.phi)) return err('FORA_TABELA_LAJE', `${l.nome}: φ${p.conjunto.phi} não está na tabela de armadura da laje.`, [l.id]);
      if (lin.sMin && p.conjunto.s * 100 < lin.sMin - 1e-9) return err('FORA_TABELA_LAJE', `${l.nome}: espaçamento abaixo do mínimo da tabela (${lin.sMin} cm).`, [l.id]);
      if (lin.sMax && p.conjunto.s * 100 > lin.sMax + 1e-9) return err('FORA_TABELA_LAJE', `${l.nome}: espaçamento acima do máximo da tabela (${lin.sMax} cm).`, [l.id]);
    }
    if (p.acao === 'agrupar' && new Set(p.barras.map((x) => x.pos)).size < 2) return err('GRUPO_PEQUENO', 'Um grupo precisa de ao menos duas posições.', [l.id]);
    if (p.acao === 'emendar' && (p.barras.length !== 1 || p.em === undefined)) return err('SEM_EMENDA', 'Emendar: uma posição e o ponto `em`.', [l.id]);
    return [];
  },
  aplicar(d, p) {
    if (p.acao === 'refazer') {
      let n = 0;
      for (const l of d.lajes) if ((p.ids ?? [p.id!]).includes(l.id) && (l.edicao || l.semCalculo)) { delete l.edicao; delete l.semCalculo; n++; }
      return n ? `Armadura de ${n} laje(s) refeita com os esforços da análise.` : 'Nada a refazer.';
    }
    const l = d.lajes.find((x) => x.id === p.id)! as Laje;
    const ed = (l.edicao ??= { barras: [] });
    const grupoDe = (pos: string, assinatura: string) => (ed.grupos ?? []).find((g) => g.some((m) => m.pos === pos && m.assinatura === assinatura));
    const gravar = (x: { pos: string; assinatura: string }, v: Partial<EdicaoBarraLaje>) => {
      const i = ed.barras.findIndex((e) => e.pos === x.pos);
      const novo: EdicaoBarraLaje = { ...(i >= 0 && ed.barras[i].assinatura === x.assinatura ? ed.barras[i] : {}), pos: x.pos, assinatura: x.assinatura, ...v };
      if (v.ganchos) novo.ganchos = [v.ganchos[0], v.ganchos[1]];
      if (i >= 0) ed.barras[i] = novo; else ed.barras.push(novo);
    };
    const itens = (p.barras ?? []).map((x) => ({ pos: x.pos, assinatura: sig(x) }));
    if (p.acao === 'editar' || p.acao === 'conjunto') {
      for (const x of p.barras!) {
        const v: Partial<EdicaoBarraLaje> = p.acao === 'conjunto' ? { phi: p.conjunto!.phi, s: p.conjunto!.s } : { ...(x.n !== undefined ? { n: x.n } : {}), ...(x.phi !== undefined ? { phi: x.phi } : {}), ...(x.s !== undefined ? { s: x.s } : {}), ...(x.comprimento !== undefined ? { comprimento: x.comprimento } : {}), ...(x.ganchos ? { ganchos: [x.ganchos[0], x.ganchos[1]] as [number, number] } : {}) };
        gravar({ pos: x.pos, assinatura: sig(x) }, v);
        // posições agrupadas editam juntas (menos o número de barras, que depende da faixa de cada uma)
        const g = grupoDe(x.pos, sig(x));
        if (g) { const { n: _n, ...comum } = v; for (const m of g) if (m.pos !== x.pos) gravar(m, comum); }
      }
      if (!ed.barras.length) delete l.edicao;
      return `${p.barras!.length} posição(ões) de ${l.nome} editada(s) e bloqueada(s).`;
    }
    if (p.acao === 'agrupar') {
      const novo = itens.filter((m, i) => itens.findIndex((o) => o.pos === m.pos) === i);
      ed.grupos = [...(ed.grupos ?? []).map((g) => g.filter((m) => !novo.some((o) => o.pos === m.pos))).filter((g) => g.length > 1), novo];
      if (p.valores) for (const m of novo) gravar(m, { ...(p.valores.phi !== undefined ? { phi: p.valores.phi } : {}), ...(p.valores.s !== undefined ? { s: p.valores.s } : {}), ...(p.valores.comprimento !== undefined ? { comprimento: p.valores.comprimento } : {}) });
      return `${novo.length} posições de ${l.nome} agrupadas.`;
    }
    if (p.acao === 'desagrupar') {
      ed.grupos = (ed.grupos ?? []).filter((g) => !itens.some((m) => g.some((o) => o.pos === m.pos && o.assinatura === m.assinatura)));
      if (!ed.grupos.length) delete ed.grupos;
      if (!ed.barras.length && !ed.grupos) delete l.edicao;
      return `Grupo desfeito em ${l.nome}.`;
    }
    if (p.acao === 'emendar') { gravar(itens[0], { emenda: { em: r4(p.em!) } }); return `Emenda construtiva em ${itens[0].pos} de ${l.nome}.`; }
    // reverter
    ed.barras = ed.barras.filter((e) => !itens.some((m) => m.pos === e.pos));
    ed.grupos = (ed.grupos ?? []).map((g) => g.filter((m) => !itens.some((o) => o.pos === m.pos))).filter((g) => g.length > 1);
    if (!ed.grupos.length) delete ed.grupos;
    if (!ed.barras.length && !ed.grupos) delete l.edicao;
    return `${itens.length} posição(ões) de ${l.nome} voltam ao calculado.`;
  },
});

// ------------------------------------------------------------------ geração sem cálculo

registrar<{ ids?: string[] }>({
  nome: 'lajes.gerarArmadura',
  descricao: 'Gera a armadura das lajes maciças só com a geometria (R7e): mínimos e armadura base, sem os esforços da análise, para edição manual. Apaga a edição e as armaduras predefinidas existentes das lajes (`ids`, ou todas as maciças da obra) e as marca como geradas sem cálculo. A edição seguinte é verificada contra os mínimos; `laje.barras` com `refazer` volta ao cálculo.',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } } },
  validar(b, p) {
    const sem = (p.ids ?? []).filter((id) => !b.lajes.some((x) => x.id === id));
    if (sem.length) return err('LAJE_INEXISTENTE', `Laje ${sem.join(', ')} não existe.`);
    const nm = b.lajes.filter((x) => p.ids?.includes(x.id) && x.tipo.tipo !== 'macica');
    if (nm.length) return err('LAJE_NAO_MACICA', `${nm.map((x) => x.nome).join(', ')} não é maciça.`, nm.map((x) => x.id));
    return !p.ids && !b.lajes.some((x) => x.tipo.tipo === 'macica') ? err('SEM_LAJES', 'A obra não tem lajes maciças.') : [];
  },
  aplicar(d, p) {
    let n = 0;
    for (const l of d.lajes) {
      if (l.tipo.tipo !== 'macica' || (p.ids && !p.ids.includes(l.id))) continue;
      delete l.edicao; delete l.predefinidas; l.semCalculo = true; n++;
    }
    return `Armadura de ${n} laje(s) gerada só com a geometria (mínimos e base); edição existente apagada.`;
  },
});

// ------------------------------------------------------------------ rótulos nas pranchas

registrar<{ chave: string; dx?: number; dy?: number; remover?: boolean }>({
  nome: 'prancha.rotulo',
  descricao: 'Reposiciona o rótulo de uma barra de laje nas pranchas de armação (R7e): `chave` = "idDaLaje|N1", `dx` e `dy` o deslocamento no papel (mm, +x à direita, +y para cima). `remover` volta ao lugar automático. Só dado de apresentação: não refaz o cálculo.',
  risco: 'escrita',
  mcp: false,
  calculo: false,
  schema: { type: 'object', additionalProperties: false, required: ['chave'], properties: {
    chave: { type: 'string' }, dx: { type: 'number', minimum: -300, maximum: 300 }, dy: { type: 'number', minimum: -300, maximum: 300 }, remover: { type: 'boolean' },
  } },
  validar(b: BuildingModel, p) {
    const m = /^(.+)\|(N[0-9]+)$/.exec(p.chave);
    if (!m || !b.lajes.some((l) => l.id === m[1])) return err('ROTULO_INVALIDO', 'A chave deve ser "idDaLaje|Nk" de uma laje existente.');
    return p.remover || p.dx !== undefined || p.dy !== undefined ? [] : err('SEM_EDICAO', 'Informe dx, dy ou remover.');
  },
  aplicar(d, p) {
    d.prancha ??= { ...PRANCHA_PADRAO, carimbo: {} };
    if (p.remover) { if (d.prancha.rotulos) { delete d.prancha.rotulos[p.chave]; if (!Object.keys(d.prancha.rotulos).length) delete d.prancha.rotulos; } return 'Rótulo volta ao lugar automático.'; }
    const o = d.prancha.rotulos?.[p.chave] ?? [0, 0];
    (d.prancha.rotulos ??= {})[p.chave] = [r4(p.dx ?? o[0]), r4(p.dy ?? o[1])];
    return 'Rótulo reposicionado.';
  },
});
