import { describe, expect, it } from 'vitest';
import { Sessao } from '../commands';
import { comandosArranques, importarArranques, lerTabela, parseNumero, sugerirMapeamento, UNIDADES_PADRAO, type Mapeamento } from './importarArranques';
import { edificioVazio } from './types';

const TXT = 'Pilar;Caso;N;Hx;Hy;Mx;My;bx;by\nP1;G;500,5;0;0;0;0;30;40\nP1;Q;100;0;0;0;0;30;40\nP2;Vento1;-20;15;0;0;30;25;25\n';
const MAP: Mapeamento = { pilar: 0, caso: 1, N: 2, Hx: 3, Hy: 4, Mx: 5, My: 6, bx: 7, by: 8 };
const AVISO_POS = 'Posição dos arranques não informada: lançados em linha, 5 m entre eixos; ajuste na planta.';

describe('parseNumero', () => {
  it('aceita milhar e decimal nos dois sentidos', () => {
    expect(parseNumero('1.234,5')).toBe(1234.5);
    expect(parseNumero('1,234.5')).toBe(1234.5);
    expect(parseNumero('12,5')).toBe(12.5);
    expect(parseNumero('-3.2')).toBe(-3.2);
    expect(parseNumero('abc')).toBeNaN();
  });
});

describe('lerTabela', () => {
  it('detecta o separador', () => {
    const t = lerTabela(TXT);
    expect(t.separador).toBe('pontoVirgula');
    expect(t.linhas.length).toBe(4);
    expect(t.linhas.every((l) => l.length === 9)).toBe(true);
    expect(lerTabela('a,b,c\n1,2,3\n4,5,6\n1,2,3\n1,2,3').separador).toBe('virgula');
    expect(lerTabela('a\tb\n1\t2').separador).toBe('tab');
    expect(lerTabela('Pilar Caso N\nP1 G 500').separador).toBe('colunas');
    expect(lerTabela('P1  G  500', { separador: 'colunas', larguras: [4, 3, 3] }).linhas[0]).toEqual(['P1', 'G', '500']);
  });
});

describe('sugerirMapeamento', () => {
  it('reconhece os títulos usuais', () => {
    expect(sugerirMapeamento(['Pilar', 'Hipótese', 'N', 'Hx', 'Hy', 'Mx', 'My', 'bx', 'by'])).toEqual({ pilar: 0, caso: 1, N: 2, Hx: 3, Hy: 4, Mx: 5, My: 6, bx: 7, by: 8 });
  });
});

describe('importarArranques', () => {
  it('lê arranques, cargas, hipóteses e dimensões', () => {
    const r = importarArranques(TXT, MAP, UNIDADES_PADRAO);
    expect(r.erros).toEqual([]);
    expect(r.arranques.length).toBe(2);
    const [p1, p2] = r.arranques;
    expect(p1.bx).toBeCloseTo(0.3);
    expect(p1.by).toBeCloseTo(0.4);
    expect(p1.cargas.map((c) => c.N)).toEqual([500.5, 100]);
    expect(p2.bx).toBeCloseTo(0.25);
    expect(p2.by).toBeCloseTo(0.25);
    expect(p2.cargas).toEqual([{ caso: 'Vento1', N: -20, Hx: 15, Hy: 0, Mx: 0, My: 30 }]);
    expect(r.hipoteses).toEqual([{ nome: 'G', natureza: 'G' }, { nome: 'Q', natureza: 'Q' }, { nome: 'Vento1', natureza: 'W' }]);
    expect(r.avisos).toContain(AVISO_POS);
  });

  it('converte unidades e inverte o sinal de N quando a tração é positiva', () => {
    const tf = importarArranques('P;C;10\nP1;G;10', { pilar: 0, caso: 1, N: 2 }, { ...UNIDADES_PADRAO, forca: 'tf' });
    expect(tf.arranques[0].cargas[0].N).toBeCloseTo(98.0665);
    const inv = importarArranques('P;C;10\nP1;G;10', { pilar: 0, caso: 1, N: 2 }, { ...UNIDADES_PADRAO, compressaoPositiva: false });
    expect(inv.arranques[0].cargas[0].N).toBe(-10);
    const mom = importarArranques('P;C;N;M\nP1;G;0;10', { pilar: 0, caso: 1, N: 2, My: 3 }, { ...UNIDADES_PADRAO, momento: 'tf·m' });
    expect(mom.arranques[0].cargas[0].My).toBeCloseTo(98.0665);
  });

  it('avisa linhas inválidas e recusa mapeamento sem N', () => {
    const r = importarArranques('Pilar;Caso;N\nP1;G;500\nP3;G;abc\n;G;10\nP4;G;0', { pilar: 0, caso: 1, N: 2 });
    expect(r.avisos).toContain('Linha 3: número inválido, ignorada.');
    expect(r.avisos).toContain('Linha 4: pilar ou caso vazio, ignorada.');
    expect(r.avisos).toContain('Linha 5: todos os esforços nulos, ignorada.');
    const sem = importarArranques(TXT, { pilar: 0, caso: 1 });
    expect(sem.erros).toEqual(['Mapeie as colunas Pilar, Caso e N.']);
    expect(sem.arranques).toEqual([]);
  });

  it('avisa a base não informada (30 × 30 cm)', () => {
    const r = importarArranques('P;C;N\nP1;G;10', { pilar: 0, caso: 1, N: 2 });
    expect(r.arranques[0].bx).toBe(0.3);
    expect(r.avisos).toContain('Pilar P1: dimensões da base não informadas, usado 30 × 30 cm [a confirmar].');
  });
});

describe('comandosArranques', () => {
  it('gera uma obra só de arranques que aplica sem erro', () => {
    const r = importarArranques(TXT, MAP, UNIDADES_PADRAO);
    const cmds = comandosArranques(r, 'Obra X');
    const s = new Sessao(edificioVazio());
    for (const c of cmds) expect(s.executar(c.nome, c.params, 'sistema').ok, c.nome).toBe(true);
    expect(s.modelo.pilares.length).toBe(2);
    expect(s.modelo.pilares.every((p) => p.nasce === 'fundacao' && p.morre === 'fundacao')).toBe(true);
    expect(s.modelo.cargasPilar?.length).toBe(3);
    expect(s.modelo.casos?.length).toBe(1);
    expect(s.modelo.obra.nome).toBe('Obra X');
    expect(s.modelo.obra.origem).toBe('texto');
  });
  it('sem erros de importação, devolve a lista; com erro, devolve vazia', () => {
    expect(comandosArranques(importarArranques(TXT, {}), 'X')).toEqual([]);
  });
});
