// Edição de linhas dos checklists (scripts/checklist.mjs) numa cópia temporária com fixture pequena.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executar } from './checklist.mjs';
import { recontar } from './recontar-checklists.mjs';

const USUARIO = 'checklist-manual-cypecad.md';
const CALCULO = 'checklist-manual-calculo-cypecad.md';
const PLANO = 'plano-frentes.md';
const HISTORICO = 'historico-fatias.md';

const L_C78 = '| C7.8 | Copiar dados de outro pano. | Parcial | L | laje.atribuir (tipo) |';
const L_C79 = '| C7.9 | Desenho de planta. | Feito | — | pronto |';
const L_C710 = '|C7.10|  Cópia   de armadura. | Falta|N| |';
const L_C81 = '| C8.1 | Pilar retangular. | Feito | — | ok |';

const MD_USUARIO = [
  '# Checklist do usuário (fixture)',
  '',
  '## Resumo por capítulo',
  '| Capítulo | Itens | Feito | Parcial | Falta | Fora |',
  '| --- | --- | --- | --- | --- | --- |',
  '| 7 Lajes | 0 | 0 | 0 | 0 | 0 |',
  '| 8 Pilares | 0 | 0 | 0 | 0 | 0 |',
  '| **Total** | **0** | **0** | **0** | **0** | **0** |',
  '',
  '## Pendências por frente',
  '| Frente | Parcial | Falta | Total |',
  '| --- | --- | --- | --- |',
  '| L Lajes | 0 | 0 | 0 |',
  '| N Normas | 0 | 0 | 0 |',
  '| **Total** | **0** | **0** | **0** |',
  '',
  '## 7. Lajes',
  '| Item | Descrição | Situação | Frente | Nota |',
  '| --- | --- | --- | --- | --- |',
  L_C78,
  L_C79,
  L_C710,
  '',
  '## 8. Pilares',
  '| Item | Descrição | Situação | Frente | Nota |',
  '| --- | --- | --- | --- | --- |',
  L_C81,
  '',
].join('\n');

const MD_CALCULO = [
  '# Checklist de cálculo (fixture)',
  '',
  '## Resumo por seção',
  '| Seção | Itens | Feito | Parcial | Falta | Fora |',
  '| --- | --- | --- | --- | --- | --- |',
  '| 8 Pilares | 0 | 0 | 0 | 0 | 0 |',
  '| **Total** | **0** | **0** | **0** | **0** | **0** |',
  '',
  '## Pendências por frente',
  '| Frente | Parcial | Falta | Total |',
  '| --- | --- | --- | --- |',
  '| L Lajes | 0 | 0 | 0 |',
  '| **Total** | **0** | **0** | **0** |',
  '',
  '## 8. Pilares',
  '| Item | Descrição | Situação | Frente | Nota |',
  '| --- | --- | --- | --- | --- |',
  '| C8.1 | Pilar no cálculo. | Feito | — | verificado |',
  '| K8.2 | Flambagem. | Parcial | L | falta P-Delta |',
  '',
].join('\n');

const MD_PLANO = [
  '# Plano (fixture)',
  '',
  '## Pendências por frente',
  '| Frente | Manual do usuário | Manual de cálculo | Total |',
  '| --- | --- | --- | --- |',
  '| L Lajes | 0 | 0 | 0 |',
  '| N Normas | 0 | 0 | 0 |',
  '| **Total** | **0** | **0** | **0** |',
  '',
].join('\n');

const HIST = '- 01/01/2026 — entrada antiga\n';

let dir: string;
const ler = (nome: string) => readFileSync(join(dir, nome), 'utf8');
const linha = (texto: string, prefixo: string) => texto.split('\n').find((l) => l.startsWith(prefixo));
/** Mapa id -> linha bruta dos itens (linhas de tabela cuja 1ª célula é um código). */
function itensBrutos(texto: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const l of texto.split('\n')) {
    const r = /^\|\s*([A-Z]\d[\w.-]*)\s*\|/.exec(l);
    if (r) m.set(r[1], l);
  }
  return m;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'checklist-'));
  writeFileSync(join(dir, USUARIO), MD_USUARIO);
  writeFileSync(join(dir, CALCULO), MD_CALCULO);
  writeFileSync(join(dir, PLANO), MD_PLANO);
  writeFileSync(join(dir, HISTORICO), HIST);
  recontar(dir); // normaliza os números dos resumos da fixture
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const run = (...args: string[]) => executar(args, dir);

describe('checklist get', () => {
  it('imprime a linha e o arquivo de um id', () => {
    const out = run('get', 'C7.8');
    expect(out).toBe(`[usuario] ${USUARIO}\n${L_C78}`);
  });

  it('imprime os dois arquivos quando o id existe nos dois', () => {
    const out = run('get', 'C8.1');
    expect(out).toContain(`[usuario] ${USUARIO}\n${L_C81}`);
    expect(out).toContain(`[calculo] ${CALCULO}\n| C8.1 | Pilar no cálculo. | Feito | — | verificado |`);
  });

  it('recusa id inexistente', () => {
    expect(() => run('get', 'C9.9')).toThrow(/não encontrado/);
  });
});

describe('checklist set', () => {
  it('troca situação, frente e nota e recalcula o resumo; outras linhas ficam byte a byte', () => {
    const antes = itensBrutos(ler(USUARIO));
    run('set', 'C7.8', '--situacao', 'Feito', '--frente', '—', '--nota', 'Feito no app');
    const depois = ler(USUARIO);
    expect(linha(depois, '| C7.8 ')).toBe('| C7.8 | Copiar dados de outro pano. | Feito | — | Feito no app |');
    const agora = itensBrutos(depois);
    for (const [id, l] of antes) if (id !== 'C7.8') expect(agora.get(id), id).toBe(l);
    expect(linha(depois, '| 7 Lajes ')).toBe('| 7 Lajes | 3 | 2 | 0 | 1 | 0 |');
    expect(linha(depois, '| L Lajes ')).toBe('| L Lajes | 0 | 0 | 0 |');
    expect(depois.endsWith('\n')).toBe(true);
  });

  it('acrescenta à nota com " — "', () => {
    run('set', 'C7.9', '--acrescentar', 'nova info');
    expect(linha(ler(USUARIO), '| C7.9 ')).toBe('| C7.9 | Desenho de planta. | Feito | — | pronto — nova info |');
  });

  it('escapa "|" dentro do texto', () => {
    run('set', 'C7.9', '--nota', 'a | b');
    expect(linha(ler(USUARIO), '| C7.9 ')).toBe('| C7.9 | Desenho de planta. | Feito | — | a \\| b |');
    expect(run('get', 'C7.9')).toContain('| a \\| b |');
  });

  it('recusa Parcial com frente "—" e não grava nada', () => {
    const antes = ler(USUARIO);
    expect(() => run('set', 'C7.8', '--frente', '—')).toThrow(/exige frente dona/);
    expect(() => run('set', 'C7.8', '--situacao', 'Parcial', '--frente', '—')).toThrow(/exige frente dona/);
    expect(ler(USUARIO)).toBe(antes);
  });

  it('recusa Feito com frente de pendência', () => {
    expect(() => run('set', 'C7.8', '--situacao', 'Feito')).toThrow(/exige frente "—"/);
  });

  it('recusa situação inválida e alteração vazia', () => {
    expect(() => run('set', 'C7.8', '--situacao', 'Pronto')).toThrow(/inválida/);
    expect(() => run('set', 'C7.8')).toThrow(/nada a alterar/);
  });

  it('recusa id inexistente', () => {
    expect(() => run('set', 'C9.9', '--nota', 'x')).toThrow(/não encontrado/);
  });

  it('id nos dois arquivos exige --arquivo', () => {
    expect(() => run('set', 'C8.1', '--nota', 'x')).toThrow(/existe nos dois/);
    run('set', 'C8.1', '--arquivo', 'calculo', '--acrescentar', 'conferido');
    expect(linha(ler(CALCULO), '| C8.1 ')).toBe('| C8.1 | Pilar no cálculo. | Feito | — | verificado — conferido |');
    expect(linha(ler(USUARIO), '| C8.1 ')).toBe(L_C81);
  });
});

describe('checklist lote', () => {
  it('aplica várias alterações em sequência', () => {
    writeFileSync(join(dir, 'lote.json'), JSON.stringify([
      { id: 'C7.8', situacao: 'Feito', frente: '—', nota: 'a' },
      { id: 'C7.8', acrescentar: 'b' },
      { id: 'C8.1', arquivo: 'calculo', acrescentar: 'x' },
    ]));
    run('lote', join(dir, 'lote.json'));
    expect(linha(ler(USUARIO), '| C7.8 ')).toBe('| C7.8 | Copiar dados de outro pano. | Feito | — | a — b |');
    expect(linha(ler(CALCULO), '| C8.1 ')).toBe('| C8.1 | Pilar no cálculo. | Feito | — | verificado — x |');
  });

  it('é atômico: se um falhar, nenhum arquivo muda', () => {
    writeFileSync(join(dir, 'lote.json'), JSON.stringify([
      { id: 'C7.9', nota: 'mudou' },
      { id: 'C7.8', situacao: 'Falta', frente: '—' },
    ]));
    const usuario = ler(USUARIO), calculo = ler(CALCULO), plano = ler(PLANO);
    expect(() => run('lote', join(dir, 'lote.json'))).toThrow(/exige frente dona/);
    expect(ler(USUARIO)).toBe(usuario);
    expect(ler(CALCULO)).toBe(calculo);
    expect(ler(PLANO)).toBe(plano);
  });

  it('recusa lote que não é array', () => {
    writeFileSync(join(dir, 'lote.json'), '{"id":"C7.8"}');
    expect(() => run('lote', join(dir, 'lote.json'))).toThrow(/array/);
  });
});

describe('checklist historico', () => {
  it('acrescenta uma linha ao fim, sem mexer no que já existe', () => {
    run('historico', 'E9, teste da fixture');
    const h = ler(HISTORICO);
    expect(h.startsWith(HIST)).toBe(true);
    expect(h.slice(HIST.length)).toMatch(/^- \d{2}\/\d{2}\/\d{4} — E9, teste da fixture\n$/);
  });

  it('separa com quebra de linha quando o arquivo não termina em "\\n"', () => {
    writeFileSync(join(dir, HISTORICO), '- 01/01/2026 — sem quebra');
    run('historico', '- E9, outra');
    expect(ler(HISTORICO)).toMatch(/^- 01\/01\/2026 — sem quebra\n- \d{2}\/\d{2}\/\d{4} — E9, outra\n$/);
  });
});
