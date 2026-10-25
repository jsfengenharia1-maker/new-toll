// Memória de cálculo detalhada (frente MD): registro completo, passo a passo, das contas do último cálculo
// (core/memoria), para conferência fora do programa. Não substitui o memorial de entrega; mesmo papel (memorial.css).
import { useEffect, useMemo, useState } from 'react';
import { calculoAtual, useBuilding } from './store';
import { useStore } from '../store';
import { APP_PRINT_CSS, MEMO_CSS, memoPrintCss, printHtmlDoc } from '../Memorial';
import { memo } from '../design/tokens';
import { Button, Select, Spacer, download } from '../ui';
import { csvMemoria, memoriaDetalhada, type MemoriaDetalhada } from '../../core/memoria/edificio';
import { htmlMemoriaCorpo } from '../../core/memoria/html';
import { jsonTabelas, tabelasAnalise, zipDados } from '../../core/memoria/dadosAnalise';
import { modeloExportavel, scriptOpenSees } from '../../core/memoria/opensees';
import { combinacoesEdificio } from '../../core/building/combinacoes';

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

export function MemoriaDetalhadaUI({ onClose }: { onClose: () => void }) {
  const estado = useBuilding();
  const { sessao, analise } = estado;
  const st = useStore();
  const b = sessao.modelo;
  const [mem, setMem] = useState<MemoriaDetalhada | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');
  const [today] = useState(() => new Date().toLocaleDateString('pt-BR'));
  // gera depois da primeira pintura (o dimensionamento é refeito com o registrador ligado)
  useEffect(() => {
    if (!analise || analise.erro) return;
    const t = setTimeout(() => { try { setMem(memoriaDetalhada(b, { an: analise }).memoria); } catch (e) { setErro(String((e as Error).message ?? e)); } }, 30);
    return () => clearTimeout(t);
  }, [b, analise]);
  const vista = useMemo(() => (mem && filtro ? { ...mem, passos: mem.passos.filter((p) => p.elemento === filtro || p.elemento === 'Edifício') } : mem), [mem, filtro]);
  const corpo = useMemo(() => (vista ? htmlMemoriaCorpo(vista, { data: today }) : ''), [vista, today]);
  const nome = b.obra.nome || 'Edifício';
  const printCss = memoPrintCss({ title: `Memória detalhada · ${nome}`, obra: b.obra.nome, rev: 'R00', date: today });
  const doc = () => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Memória de cálculo detalhada · ${nome.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title><style>body{margin:0;background:${memo('paper')}}${MEMO_CSS}${printCss}</style></head><body>${corpo}</body></html>`;
  const aviso = (r: string, ok: string) => st.set({ message: r === 'declined' ? 'Exportação cancelada.' : ok });
  const base = `memoria-detalhada-${slug(nome)}`;
  const baixarHtml = async () => aviso(await download(`${base}.html`, doc(), 'text/html'), 'Memória detalhada exportada em HTML.');
  const baixarJson = async () => { if (mem) aviso(await download(`${base}.json`, JSON.stringify(mem), 'application/json'), 'Memória detalhada exportada em JSON.'); };
  const baixarDados = async () => {
    if (!mem || !analise) return;
    const ts = tabelasAnalise(b, analise, combinacoesEdificio(b, analise));
    const os = scriptOpenSees(modeloExportavel(b, analise));
    const z = zipDados(ts, [
      { nome: 'memoria/memoria.csv', texto: csvMemoria(mem) }, { nome: 'memoria/memoria.json', texto: JSON.stringify(mem) },
      { nome: 'analise/analise.json', texto: jsonTabelas(ts, { obra: nome }) }, { nome: 'opensees/portico.py', texto: os.script },
      { nome: 'LEIA-ME.txt', texto: `Memória de cálculo detalhada e dados da análise (${nome}, ${today}).\nanalise/*.csv: separador ";" e ponto decimal, unidades kN, m, rad (materiais em MPa).\nopensees/portico.py: python3 -m pip install openseespy && python3 portico.py (grava resultados_opensees.json).\n${os.avisos.length ? `Avisos da exportação OpenSees:\n- ${os.avisos.join('\n- ')}\n` : ''}` },
    ]);
    aviso(await download(`${base}.zip`, z, 'application/zip'), 'Dados da análise, memória e script OpenSees exportados (ZIP).');
  };
  const velha = !!analise && !calculoAtual(estado);
  return (
    <div className="memo-overlay" role="dialog" aria-label="Memória de cálculo detalhada">
      <style>{MEMO_CSS + printCss + APP_PRINT_CSS}</style>
      <div className="memo-bar">
        <b>Memória de cálculo detalhada</b>
        <span className="muted">{!analise ? 'Calcule a estrutura para gerar a memória.' : velha ? 'O modelo mudou depois do cálculo: calcule de novo.' : mem ? `${mem.passos.length} passos · ${Math.round(mem.ms)} ms` : erro ? `Falhou: ${erro}` : 'Gerando…'}</span>
        <Spacer />
        {mem && <Select label="Elemento" value={filtro} options={[{ v: '', label: 'Todos' }, ...mem.elementos.filter((e) => e !== 'Edifício').map((e) => ({ v: e, label: e }))]} onChange={setFiltro} />}
        <Button variant="primary" disabled={!mem} onClick={() => { printHtmlDoc(doc()); st.set({ message: 'Impressão da memória: escolha “Salvar como PDF”.' }); }}>Imprimir / PDF</Button>
        <Button disabled={!mem} onClick={baixarHtml}>Exportar HTML</Button>
        <Button disabled={!mem} onClick={baixarJson}>Exportar JSON</Button>
        <Button disabled={!mem} onClick={baixarDados} title="CSV/JSON de nós, barras, seções, materiais, apoios, cargas, combinações, deslocamentos, reações, esforços e cascas (esforços por caso e por combinação); memória em CSV; script OpenSees do pórtico">Dados da análise e OpenSees (ZIP)</Button>
        <Button onClick={onClose}>Fechar</Button>
      </div>
      <div />
      <div className="memo-scroll" data-memoria-scroll>
        {corpo ? <div dangerouslySetInnerHTML={{ __html: corpo }} /> : <div className="memo"><p>{!analise ? 'Sem cálculo.' : erro ?? 'Gerando a memória detalhada…'}</p></div>}
      </div>
    </div>
  );
}
