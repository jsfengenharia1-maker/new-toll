import { describe, expect, it } from 'vitest';
import { OPCOES_INFO } from '../building/opcoes';
import { ajudaDaFerramenta, ajudaDe, ajudasFaltantes, GRUPOS_AJUDA, IDS_ABAS, IDS_FERRAMENTAS, todasAjudas } from './catalogo';
import { guiaRapido, totalNoGuia } from './guia';
import { alternarAtalho, ATALHOS_CATALOGO, BARRA_PADRAO, CHAVE_BARRA, lerBarra, moverAtalho, normalizarBarra, restaurarBarra, salvarBarra, type ArmazenamentoSimples } from './atalhos';

const memoria = (): ArmazenamentoSimples & { d: Map<string, string> } => { const d = new Map<string, string>(); return { d, getItem: (k) => d.get(k) ?? null, setItem: (k, v) => void d.set(k, v), removeItem: (k) => void d.delete(k) }; };

describe('cobertura da ajuda', () => {
  it('todo grupo, aba, ferramenta e opção de OPCOES_INFO têm entrada (lista as que faltam)', () => {
    expect(ajudasFaltantes()).toEqual([]);
    for (const g of GRUPOS_AJUDA) expect(todasAjudas().some((a) => a.grupo === g.id), g.id).toBe(true);
    for (const o of OPCOES_INFO) { const a = ajudaDe(`opcao:${o.chave}`); expect(a?.texto, o.chave).toContain(o.descricao); expect(a!.texto).toContain(o.fonte); }
    expect(IDS_ABAS.length).toBe(8);
    expect(IDS_FERRAMENTAS.length).toBe(34);
  });
  it('ids únicos, textos e títulos preenchidos, "ver" aponta para ajudas que existem', () => {
    const todas = todasAjudas();
    expect(new Set(todas.map((a) => a.id)).size).toBe(todas.length);
    for (const a of todas) { expect(a.titulo.length, a.id).toBeGreaterThan(1); expect(a.texto.length, a.id).toBeGreaterThan(15); for (const v of a.ver ?? []) expect(ajudaDe(v), `${a.id} → ${v}`).toBeDefined(); }
  });
  it('perfil NBR aparece na ajuda da opção que difere', () => {
    expect(ajudaDe('opcao:engasteTopoUltimo')!.texto).toMatch(/perfil NBR 6118: 1/);
  });
  it('ajuda da ferramenta ativa leva passos e tecla', () => {
    const h = ajudaDaFerramenta('viga', ['Primeiro ponto.'], 'V');
    expect(h).toMatchObject({ titulo: 'Viga', passos: ['Primeiro ponto.'], tecla: 'V' });
  });
});

describe('guia rápido', () => {
  it('reúne abas, ferramentas, barras e opções, sem as janelas, e é gerado do catálogo', () => {
    const g = guiaRapido();
    expect(g.map((s) => s.grupo)).toEqual(['abas', 'ferramentas', 'barras', 'opcoes']);
    expect(g.find((s) => s.grupo === 'opcoes')!.itens.length).toBe(OPCOES_INFO.length);
    expect(totalNoGuia(g)).toBe(todasAjudas().filter((a) => a.grupo !== 'janelas').length);
  });
});

describe('barra de atalhos', () => {
  it('padrão válido; normalizar descarta ids desconhecidos e repetidos', () => {
    expect(normalizarBarra(BARRA_PADRAO)).toEqual(BARRA_PADRAO);
    expect(normalizarBarra(['pilar', 'xx', 'pilar', 'viga', 3])).toEqual(['pilar', 'viga']);
    expect(normalizarBarra('lixo')).toEqual(BARRA_PADRAO);
    expect(new Set(ATALHOS_CATALOGO.map((a) => a.id)).size).toBe(ATALHOS_CATALOGO.length);
  });
  it('põe, tira e reordena', () => {
    let l = alternarAtalho(BARRA_PADRAO, 'pilar');
    expect(l.at(-1)).toBe('pilar');
    l = alternarAtalho(l, 'desfazer');
    expect(l).not.toContain('desfazer');
    expect(moverAtalho(['a', 'b', 'c'].map(() => 'pilar'), 'pilar', 1)).toEqual(['pilar', 'pilar', 'pilar']);
    expect(moverAtalho(['pilar', 'viga', 'laje'], 'laje', -2)).toEqual(['laje', 'pilar', 'viga']);
    expect(moverAtalho(['pilar', 'viga'], 'viga', 5)).toEqual(['pilar', 'viga']);
  });
  it('persiste no armazenamento e volta ao padrão quando ele falha ou tem lixo', () => {
    const st = memoria();
    expect(lerBarra(st)).toEqual(BARRA_PADRAO);
    expect(salvarBarra(st, ['laje', 'viga'])).toBe(true);
    expect(st.d.has(CHAVE_BARRA)).toBe(true);
    expect(lerBarra(st)).toEqual(['laje', 'viga']);
    st.d.set(CHAVE_BARRA, '{lixo');
    expect(lerBarra(st)).toEqual(BARRA_PADRAO);
    salvarBarra(st, ['laje']);
    expect(restaurarBarra(st)).toEqual(BARRA_PADRAO);
    expect(lerBarra(st)).toEqual(BARRA_PADRAO);
    const quebrado: ArmazenamentoSimples = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    expect(lerBarra(quebrado)).toEqual(BARRA_PADRAO);
    expect(salvarBarra(quebrado, ['laje'])).toBe(false);
    expect(lerBarra(null)).toEqual(BARRA_PADRAO);
  });
});
