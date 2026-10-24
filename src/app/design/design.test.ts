// Guarda do design system: toda aparência da interface vem de design/global.css (tokens e componentes),
// do papel em design/memorial.css, e as peças reutilizáveis de app/ui. Ver docs/design-system.md.
import { describe, expect, it } from 'vitest';
import { lerTokens, memo } from './tokens';

const codigo = import.meta.glob(['/src/**/*.ts', '/src/**/*.tsx', '!/src/**/*.test.ts', '!/src/**/*.test.tsx', '!/src/core/**', '!/src/cli/**'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const estilos = import.meta.glob(['/src/**/*.css'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const GLOBAL = estilos['/src/app/design/global.css'];
const MEMORIAL = estilos['/src/app/design/memorial.css'];
const DESIGN = '/src/app/design/';

/** Textos literais de uma expressão de className: aspas simples (fora de comparações) e trechos de template; `prefixo-${x}` vira prefixo. */
function literais(expr: string): { textos: string[]; prefixos: string[] } {
  const textos: string[] = [], prefixos: string[] = [];
  const pilha: ('tpl' | number)[] = [];
  let seg = '';
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i], topo = pilha[pilha.length - 1];
    if (topo === 'tpl') {
      if (c === '`') { textos.push(seg); seg = ''; pilha.pop(); }
      else if (c === '$' && expr[i + 1] === '{') {
        const m = /([a-zA-Z_][\w-]*)$/.exec(seg);
        if (m) { prefixos.push(m[1]); seg = seg.slice(0, -m[1].length); }
        textos.push(seg); seg = ''; pilha.push(0); i++;
      } else seg += c;
    } else if (c === "'") {
      const fim = expr.indexOf("'", i + 1);
      const comparacao = /[=!]==\s*$/.test(expr.slice(0, i)) || /^\s*[=!]==/.test(expr.slice(fim + 1));
      if (!comparacao) textos.push(expr.slice(i + 1, fim));
      i = fim;
    } else if (c === '`') pilha.push('tpl');
    else if (typeof topo === 'number') { if (c === '{') pilha[pilha.length - 1] = topo + 1; else if (c === '}') { if (topo === 0) pilha.pop(); else pilha[pilha.length - 1] = topo - 1; } }
  }
  return { textos, prefixos };
}

const semComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

describe('design system', () => {
  it('folhas de estilo só em src/app/design', () => {
    expect(Object.keys(estilos).filter((f) => !f.startsWith(DESIGN))).toEqual([]);
    expect(GLOBAL).toBeTruthy();
    expect(MEMORIAL).toBeTruthy();
  });

  it('CSS importado só pelo main.tsx (global.css) e por design/tokens.ts', () => {
    const fora = Object.entries(codigo).filter(([f, s]) => /import [^;]*\.css(\?raw)?['"]|import ['"][^'"]*\.css['"]/.test(s)
      && f !== '/src/main.tsx' && !f.startsWith(DESIGN));
    expect(fora.map(([f]) => f)).toEqual([]);
    expect(codigo['/src/main.tsx']).toContain("import './app/design/global.css';");
  });

  it('nenhuma cor literal no código da interface (usar tokens)', () => {
    const cor = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|\b(rgba?|hsla?)\(/;
    const achados: string[] = [];
    for (const [f, s] of Object.entries(codigo)) {
      if (f.startsWith(DESIGN)) continue;
      semComentarios(s).split('\n').forEach((l, i) => { if (cor.test(l)) achados.push(`${f}:${i + 1}: ${l.trim().slice(0, 100)}`); });
    }
    expect(achados).toEqual([]);
  });

  it('estilo inline só para valores calculados em tempo de execução', () => {
    const PERMITIDAS = new Set(['width', 'height', 'left', 'top', 'right', 'bottom', 'cursor', 'transform', 'fontSize']);
    const achados: string[] = [];
    for (const [f, s] of Object.entries(codigo)) {
      if (f.startsWith(DESIGN) || !f.endsWith('.tsx')) continue;
      for (const m of s.matchAll(/\bstyle=\{/g)) {
        let i = m.index! + m[0].length, nivel = 1;
        while (i < s.length && nivel > 0) { if (s[i] === '{') nivel++; else if (s[i] === '}') nivel--; i++; }
        const expr = s.slice(m.index! + m[0].length, i - 1);
        for (const k of expr.matchAll(/[{,]\s*(\w+)\s*(?=[:,}])/g)) if (!PERMITIDAS.has(k[1])) achados.push(`${f}: ${k[1]}`);
      }
    }
    expect(achados).toEqual([]);
  });

  it('toda classe usada em className existe no design system', () => {
    const definidas = new Set([...semComentarios(GLOBAL + MEMORIAL).matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1]));
    const faltam = new Map<string, string>();
    const anota = (txt: string, f: string) => {
      for (const c of txt.split(/\s+/)) if (/^[a-zA-Z_][\w-]*$/.test(c) && !definidas.has(c)) faltam.set(c, f);
    };
    for (const [f, s] of Object.entries(codigo)) {
      if (!f.endsWith('.tsx')) continue;
      for (const m of s.matchAll(/className="([^"]*)"/g)) anota(m[1], f);
      for (const m of s.matchAll(/className=\{/g)) {
        let i = m.index! + m[0].length, nivel = 1;
        while (i < s.length && nivel > 0) { if (s[i] === '{') nivel++; else if (s[i] === '}') nivel--; i++; }
        const { textos, prefixos } = literais(s.slice(m.index! + m[0].length, i - 1));
        for (const t of textos) anota(t, f);
        for (const p of prefixos) if (![...definidas].some((c) => c.startsWith(p))) faltam.set(`${p}…`, f);
      }
    }
    // classes montadas por componentes da biblioteca a partir de props (variant, tone)
    for (const c of ['primary', 'ghost', 'danger', 'ok', 'warn', 'bad', 'na', 'big', 'on', 'compact']) if (!definidas.has(c)) faltam.set(c, 'ui');
    expect([...faltam].map(([c, f]) => `${c} (${f})`)).toEqual([]);
  });

  it('regras anti "cara de IA": sem color-mix, sem caixa alta, sem transition: all', () => {
    const g = semComentarios(GLOBAL);
    expect(g).not.toMatch(/color-mix\(/);
    expect(g).not.toMatch(/text-transform:\s*uppercase/);
    expect(g).not.toMatch(/transition:\s*all\b/);
    expect(g).not.toMatch(/letter-spacing:\s*0?\.\d+(em|px)/);
    // o memorial (papel) também não usa color-mix
    expect(semComentarios(MEMORIAL)).not.toMatch(/color-mix\(/);
    // nenhuma regra fora de memorial.css usa caixa alta (a verificação acima cobre global.css; impressao-app.css é o outro)
    for (const [f, s] of Object.entries(estilos)) if (f !== DESIGN + 'memorial.css') expect(s, f).not.toMatch(/text-transform:\s*uppercase/);
  });

  it('todo token está definido no :root puro, antes dos blocos de tema', () => {
    const g = semComentarios(GLOBAL);
    const primeiroTema = g.search(/@media \(prefers-color-scheme|:root\[data-theme/);
    expect(primeiroTema).toBeGreaterThan(0);
    const puros = [...g.matchAll(/(^|\n):root \{/g)];
    expect(puros.length).toBeGreaterThan(0);
    for (const m of puros) expect(m.index!, 'bloco :root puro depois dos temas').toBeLessThan(primeiroTema);
    const definidos = new Set([...g.slice(0, primeiroTema).matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
    const nosTemas = new Set([...g.slice(primeiroTema, g.indexOf('* { box-sizing')).matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
    expect([...nosTemas].filter((t) => !definidos.has(t))).toEqual([]);
    // todo var(--x) usado tem definição
    const usados = new Set([...g.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
    const dinamicos = new Set(['--dg', '--c', '--grupo', '--vig', '--det-tela', '--v3d-fundo', '--v3d-pilar', '--v3d-viga', '--v3d-laje', '--v3d-parede', '--v3d-escada', '--v3d-fundacao', '--v3d-pendente', '--v3d-linha', '--v3d-selecao', '--v3d-destaque']);
    expect([...usados].filter((t) => !definidos.has(t) && !dinamicos.has(t))).toEqual([]);
  });

  it('tokens do papel lidos do memorial.css', () => {
    expect(memo('ink')).toMatch(/^#/);
    expect(() => memo('inexistente')).toThrow();
    expect(lerTokens(':root { --a: 1px; /* x */ --b-c: red; }')).toEqual({ a: '1px', 'b-c': 'red' });
  });

  it('paleta da planta completa nos três temas', () => {
    const t = lerTokens(GLOBAL);
    for (const tema of ['escuro', 'claro', 'pb']) {
      const chaves = Object.keys(t).filter((k) => k.startsWith(`pl-${tema}-`));
      expect(chaves.length, tema).toBe(22);
    }
  });

  it('controles só pela biblioteca ui (button, select, textarea e input fora de ui; file hidden fica cru)', () => {
    const achados: string[] = [];
    Object.entries(codigo).filter(([f]) => f.startsWith('/src/app/') && f.endsWith('.tsx') && !f.startsWith('/src/app/ui/')).forEach(([f, s]) => {
      semComentarios(s).split('\n').forEach((l, i) => {
        if (/<(button|select|textarea)[\s>]/.test(l)) achados.push(`${f}:${i + 1}: ${l.trim().slice(0, 100)}`);
        for (const m of l.matchAll(/<input[\s>][^]*?(\/>|>)/g)) if (!(/type="file"/.test(m[0]) && /\bhidden\b/.test(m[0]))) achados.push(`${f}:${i + 1}: ${l.trim().slice(0, 100)}`);
      });
    });
    expect(achados).toEqual([]);
  });
  it('layout BIMCraft: token da faixa e classes dos componentes novos definidos', () => {
    const g = semComentarios(GLOBAL);
    expect(g).toMatch(/--h-ribbon:\s*56px/);
    for (const c of ['ribbon-wrap', 'rtabs-wrap', 'rtabs', 'rtab', 'ribbon', 'rgrp', 'rbtn', 'rl', 'dock', 'dock-grip', 'dock-toggle', 'pal', 'phead', 'pbody', 'tree', 'tn', 'vtabs', 'modtabs', 'work', 'typecard', 'cfg'])
      expect(g, `.${c}`).toMatch(new RegExp(`\\.${c}[\\s,.{:\\[]`));
  });

  it('faixa de comandos: nenhum botão da ui/Ribbon sem rótulo textual', () => {
    const r = codigo['/src/app/ui/Ribbon.tsx'];
    expect(r).toContain('<span className="rbl">{label}</span>');
  });

  it('docas: largura sempre em px (porcentagem numa coluna auto do grid zera o desenho)', () => {
    const d = codigo['/src/app/ui/Dock.tsx'];
    expect(d).toMatch(/const largura = `\$\{w\}px`/);
    expect(d).not.toMatch(/min\(\$\{w\}px, 100%\)/);
  });
});
