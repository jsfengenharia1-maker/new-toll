// Memória de cálculo detalhada do pórtico plano (frente MD, fase 8): registro passo a passo das contas do dimensionamento
// (core/memoria/portico), para conferência fora do programa; exportação em HTML, JSON, CSV e ZIP (dados da análise e script OpenSees).
// Não substitui o memorial de entrega; mesmo papel (memorial.css).
import { useEffect, useMemo, useState } from 'react';
import { useStore } from './store';
import { useAnalysis } from './results';
import { APP_PRINT_CSS, MEMO_CSS, memoPrintCss, printHtmlDoc } from './Memorial';
import { memo } from './design/tokens';
import { Button, Select, Spacer, download } from './ui';
import { csvMemoria, type MemoriaDetalhada } from '../core/memoria/saida';
import { memoriaPortico } from '../core/memoria/portico';
import { htmlMemoriaCorpo } from '../core/memoria/html';
import { jsonTabelas, zipDados } from '../core/memoria/dadosAnalise';
import { tabelasPortico } from '../core/memoria/dadosPortico';
import { scriptOpenSeesPortico } from '../core/memoria/openseesPortico';
import type { DesignReport } from '../core/design';

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

export function MemoriaDetalhadaPortico({ onClose }: { onClose: () => void }) {
  const st = useStore();
  const a = useAnalysis();
  const model = st.model;
  const [res, setRes] = useState<{ mem: MemoriaDetalhada; rep: DesignReport } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');
  const [today] = useState(() => new Date().toLocaleDateString('pt-BR'));
  // gera depois da primeira pintura (o dimensionamento é refeito com o registrador ligado)
  useEffect(() => {
    if (a.prep.error) return;
    const t = setTimeout(() => { try { const r = memoriaPortico(model, a); setRes({ mem: r.memoria, rep: r.rep }); } catch (e) { setErro(String((e as Error).message ?? e)); } }, 30);
    return () => clearTimeout(t);
  }, [model, a]);
  const mem = res?.mem ?? null;
  const vista = useMemo(() => (mem && filtro ? { ...mem, passos: mem.passos.filter((p) => p.elemento === filtro || p.elemento === 'Pórtico') } : mem), [mem, filtro]);
  const corpo = useMemo(() => (vista ? htmlMemoriaCorpo(vista, { data: today }) : ''), [vista, today]);
  const nome = model.project?.obra || model.name;
  const printCss = memoPrintCss({ title: `Memória detalhada · ${nome}`, obra: model.project?.obra, rev: model.project?.revisao || 'R00', date: today });
  const doc = () => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Memória de cálculo detalhada · ${nome.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title><style>body{margin:0;background:${memo('paper')}}${MEMO_CSS}${printCss}</style></head><body>${corpo}</body></html>`;
  const aviso = (r: string, ok: string) => st.set({ message: r === 'declined' ? 'Exportação cancelada.' : ok });
  const base = `memoria-detalhada-${slug(nome)}`;
  const baixarHtml = async () => aviso(await download(`${base}.html`, doc(), 'text/html'), 'Memória detalhada exportada em HTML.');
  const baixarJson = async () => { if (mem) aviso(await download(`${base}.json`, JSON.stringify(mem), 'application/json'), 'Memória detalhada exportada em JSON.'); };
  const baixarCsv = async () => { if (mem) aviso(await download(`${base}.csv`, csvMemoria(mem), 'text/csv'), 'Memória detalhada exportada em CSV.'); };
  const baixarDados = async () => {
    if (!res) return;
    const ts = tabelasPortico(model, a, res.rep);
    const os = scriptOpenSeesPortico(model, a);
    const z = zipDados(ts, [
      { nome: 'memoria/memoria.csv', texto: csvMemoria(res.mem) }, { nome: 'memoria/memoria.json', texto: JSON.stringify(res.mem) },
      { nome: 'analise/analise.json', texto: jsonTabelas(ts, { obra: nome }) }, { nome: 'opensees/portico2d.py', texto: os.script },
      { nome: 'LEIA-ME.txt', texto: `Memória de cálculo detalhada e dados da análise do pórtico plano (${nome}, ${today}).\nanalise/*.csv: separador ";" e ponto decimal, unidades kN, m, rad (materiais em MPa).\nopensees/portico2d.py: python3 -m pip install openseespy && python3 portico2d.py (grava resultados_opensees.json).\n${os.avisos.length ? `Avisos da exportação OpenSees:\n- ${os.avisos.join('\n- ')}\n` : ''}` },
    ]);
    aviso(await download(`${base}.zip`, z, 'application/zip'), 'Dados da análise, memória e script OpenSees exportados (ZIP).');
  };
  return (
    <div className="memo-overlay" role="dialog" aria-label="Memória de cálculo detalhada do pórtico">
      <style>{MEMO_CSS + printCss + APP_PRINT_CSS}</style>
      <div className="memo-bar">
        <b>Memória de cálculo detalhada</b>
        <span className="muted">{a.prep.error ? 'Modelo instável: sem memória.' : mem ? `${mem.passos.length} passos · ${Math.round(mem.ms)} ms` : erro ? `Falhou: ${erro}` : 'Gerando…'}</span>
        <Spacer />
        {mem && <Select label="Elemento" value={filtro} options={[{ v: '', label: 'Todos' }, ...mem.elementos.filter((e) => e !== 'Pórtico').map((e) => ({ v: e, label: e }))]} onChange={setFiltro} />}
        <Button variant="primary" disabled={!mem} onClick={() => { printHtmlDoc(doc()); st.set({ message: 'Impressão da memória: escolha “Salvar como PDF”.' }); }}>Imprimir / PDF</Button>
        <Button disabled={!mem} onClick={baixarHtml}>Exportar HTML</Button>
        <Button disabled={!mem} onClick={baixarJson}>Exportar JSON</Button>
        <Button disabled={!mem} onClick={baixarCsv}>Exportar CSV</Button>
        <Button disabled={!mem} onClick={baixarDados} title="CSV/JSON de nós, barras, seções, materiais, casos, cargas, combinações, deslocamentos, reações e esforços (por caso e por combinação); memória em CSV e JSON; script OpenSees do pórtico plano">Dados da análise e OpenSees (ZIP)</Button>
        <Button onClick={onClose}>Fechar</Button>
      </div>
      <div />
      <div className="memo-scroll" data-memoria-scroll>
        {corpo ? <div dangerouslySetInnerHTML={{ __html: corpo }} /> : <div className="memo"><p>{a.prep.error ? 'Sem cálculo.' : erro ?? 'Gerando a memória detalhada…'}</p></div>}
      </div>
    </div>
  );
}
