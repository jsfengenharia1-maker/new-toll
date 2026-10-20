// Monta o CSS embutido no SVG exportado a partir das regras de desenho, com tokens resolvidos.
const PREFIXES = ['.bgfill', '.grid', '.axis', '.member', '.node', '.hinge', '.support', '.lbl', '.load', '.loadline', '.diag', '.deformed', '.react', '.il', '.secmark', '.tip', '.cotas', '.dimline', '.localaxis', 'svg.mono', '.train'];

export function svgExportCss(): string {
  const cs = getComputedStyle(document.documentElement);
  const out: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const r of Array.from(rules)) {
      if (r instanceof CSSStyleRule && PREFIXES.some((p) => r.selectorText.split(',').some((s) => s.trim().startsWith(p)))) out.push(r.cssText);
    }
  }
  return out.join('\n').replace(/var\((--[\w-]+)\)/g, (_, name: string) => cs.getPropertyValue(name).trim() || 'currentColor');
}
