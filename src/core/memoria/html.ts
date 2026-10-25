// Corpo HTML imprimível da memória detalhada (MD fase 1): índice por etapa e por elemento e, para cada elemento, os
// passos por tópico (descrição, fórmula, expressão com valores, resultado, unidade, norma). Usa só as classes do papel
// (design/memorial.css, escopo .memo); quem embrulha no documento com o CSS é a interface (app/edificio/MemoriaDetalhada).
import { indiceMemoria, type MemoriaDetalhada } from './saida';
import { fm, type PassoMemoria } from './registrador';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ancora = (etapa: string, el: string) => `md-${etapa}-${el.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`;
const valor = (p: PassoMemoria) => (typeof p.resultado === 'number' ? fm(p.resultado, 6) : esc(p.resultado));

export function htmlMemoriaCorpo(mem: MemoriaDetalhada, o: { data?: string } = {}): string {
  const idx = indiceMemoria(mem);
  const out: string[] = [];
  out.push(`<div class="memo" data-memoria-detalhada><h1>Memória de cálculo detalhada · ${esc(mem.obra)}</h1>`);
  out.push(`<p class="sub">${mem.passos.length} passos registrados${o.data ? ` · ${esc(o.data)}` : ''}${mem.truncado ? ' · <span class="warn">lista truncada no limite de passos</span>' : ''}</p>`);
  out.push(`<p class="small">${esc(mem.escopo)} Os valores registrados são os números usados no cálculo (os arquivos JSON/CSV trazem todos os algarismos); a expressão mostra-os com 4 algarismos significativos. Unidades: kN, m, MPa, salvo indicação. Itens marcados "a confirmar" seguem a numeração da NBR 6118:2014 ou um critério ainda sem conferência normativa.</p>`);
  out.push('<h2>Índice</h2><ul>');
  for (const e of idx) out.push(`<li><a href="#${ancora(e.id, '')}">${esc(e.titulo)}</a>: ${e.elementos.map((el) => `<a href="#${ancora(e.id, el)}">${esc(el)}</a>`).join(', ')}</li>`);
  out.push('</ul>');
  // índice por elemento (todas as etapas de cada um)
  const porEl = new Map<string, string[]>();
  for (const e of idx) for (const el of e.elementos) { const l = porEl.get(el) ?? []; l.push(e.id); porEl.set(el, l); }
  out.push('<h3>Por elemento</h3><ul>');
  for (const [el, ets] of porEl) out.push(`<li>${esc(el)}: ${ets.map((id) => `<a href="#${ancora(id, el)}">${esc(idx.find((x) => x.id === id)!.titulo)}</a>`).join(' · ')}</li>`);
  out.push('</ul>');
  let n = 0;
  for (const e of idx) {
    out.push(`<h2 id="${ancora(e.id, '')}">${++n}. ${esc(e.titulo)}</h2>`);
    for (const el of e.elementos) {
      out.push(`<h3 id="${ancora(e.id, el)}">${esc(el)}</h3>`);
      const passos = mem.passos.filter((p) => p.etapa === e.id && p.elemento === el);
      const topicos = [...new Set(passos.map((p) => p.topico))];
      for (const t of topicos) {
        out.push(`<p><b>${esc(t)}</b></p><table><thead><tr><th class="l">Passo</th><th class="l">Descrição</th><th class="l">Fórmula e valores</th><th>Resultado</th><th class="l">Unid.</th><th class="l">Referência</th></tr></thead><tbody>`);
        for (const p of passos.filter((q) => q.topico === t)) {
          out.push(`<tr data-passo="${p.id}"><td class="l">${p.id}</td><td class="l">${esc(p.descricao)}${p.observacao ? `<br><span class="small">${esc(p.observacao)}</span>` : ''}</td><td class="l">${esc(p.formula)}<br>${esc(p.expressao)}</td><td>${valor(p)}</td><td class="l">${esc(p.unidade)}</td><td class="l">${esc(p.norma ?? '')}${p.aConfirmar ? ' <span class="warn">[a confirmar]</span>' : ''}</td></tr>`);
        }
        out.push('</tbody></table>');
      }
    }
  }
  out.push('</div>');
  return out.join('');
}
