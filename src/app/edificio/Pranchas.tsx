// Aba Pranchas: planta de formas por grupo, prévia em SVG e saída em PDF, DXF R2000 e DWG R2018.
import { useMemo, useState } from 'react';
import { useBuilding } from './store';
import { useStore } from '../store';
import { download, Hint, Select, TextField } from '../ui';
import { montarPranchas } from '../../core/sheets/prancha';
import { svgPrancha } from '../../core/sheets/svg';
import { escreverPdf } from '../../core/sheets/pdf';
import { escreverDxf } from '../../core/sheets/dxf';
import { desenhoDwg, VENDOR_DWG, type EscritorDwg } from '../../core/sheets/dwg';
import { PRANCHA_PADRAO, type Carimbo, type Formato } from '../../core/building/types';

const CAMPOS: [keyof Carimbo, string][] = [
  ['empresa', 'Empresa / profissional'], ['obra', 'Obra'], ['cliente', 'Cliente'], ['local', 'Local'],
  ['responsavel', 'Responsável técnico'], ['registro', 'Registro profissional'], ['desenho', 'Desenho'], ['revisao', 'Revisão'], ['data', 'Data'],
];
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

let escritor: Promise<EscritorDwg> | null = null;
/** Carrega o escritor de DWG de public/vendor (fora do HTML único). */
function carregarDwg(): Promise<EscritorDwg> {
  escritor ??= import(/* @vite-ignore */ new URL(VENDOR_DWG, document.baseURI).href)
    .then((m: { writeDwg2018: EscritorDwg }) => m.writeDwg2018)
    .catch((e) => { escritor = null; throw e; });
  return escritor;
}

export function Pranchas() {
  const { sessao, exec, dim, revAnalise } = useBuilding();
  const msg = (m: string) => useStore.getState().set({ message: m });
  const b = sessao.modelo;
  const cfg = { ...PRANCHA_PADRAO, ...(b.prancha ?? {}) };
  // armaduras do último dimensionamento, se o modelo não mudou depois dele
  const armaduras = useMemo(() => {
    if (!dim || revAnalise !== sessao.rev) return undefined;
    const idPav = new Map(b.pavimentos.map((p) => [p.nome, p.id]));
    return Object.fromEntries(dim.pilares.map((p) => [`${p.pilar}|${idPav.get(p.pavimento)}`, p.armadura]));
  }, [dim, revAnalise, sessao.rev, b.pavimentos]);
  const prs = useMemo(() => montarPranchas(b, { armaduras }), [b, armaduras]);
  const [sel, setSel] = useState(0);
  const pr = prs[Math.min(sel, prs.length - 1)];
  const svg = useMemo(() => (pr ? svgPrancha(pr) : ''), [pr]);
  const base = slug(b.obra.nome || 'edificio');
  const salvar = async (nome: string, dados: Uint8Array, tipo: string) => {
    const r = await download(nome, dados, tipo);
    msg(r === 'declined' ? 'Download cancelado.' : `${nome} gerado.`);
  };
  const dwg = async () => {
    if (!pr) return;
    let w: EscritorDwg;
    try { w = await carregarDwg(); } catch { msg('DWG indisponível neste ambiente (o escritor fica em vendor/, fora do arquivo único). Use o DXF: o AutoCAD abre e salva como DWG.'); return; }
    const r = w(desenhoDwg(pr));
    if (r.skipped.length) { msg(`DWG: não gravado: ${r.skipped.join(', ')}`); return; }
    await salvar(`${base}-${slug(pr.titulo)}.dwg`, r.data, 'application/acad');
  };

  return (
    <>
      <div className="card">
        <h3>Pranchas</h3>
        {!prs.length ? <Hint>Lance vigas ou lajes em algum grupo para gerar a planta de formas.</Hint> : (
          <>
            <div className="row wrap">
              <Select label="Prancha" value={String(Math.min(sel, prs.length - 1))} options={prs.map((p, i) => ({ v: String(i), label: `${String(i + 1).padStart(2, '0')} · ${p.titulo}` }))} onChange={(v) => setSel(+v)} />
              <Select label="Formato" value={cfg.formato} options={(['auto', 'A0', 'A1', 'A2', 'A3', 'A4'] as const).map((f) => ({ v: f, label: f === 'auto' ? 'automático' : f }))} onChange={(f) => exec('prancha.definir', { formato: f as Formato | 'auto' })} />
              <Select label="Escala" value={String(cfg.escala)} options={[0, 20, 25, 50, 75, 100, 125, 200, 250].map((e) => ({ v: String(e), label: e ? `1:${e}` : 'automática' }))} onChange={(e) => exec('prancha.definir', { escala: +e })} />
            </div>
            <div className="row wrap">
              <button type="button" className="btn primary" onClick={() => salvar(`${base}-pranchas.pdf`, escreverPdf(prs, { titulo: `${b.obra.nome} — pranchas`, autor: cfg.carimbo.responsavel }), 'application/pdf')}>PDF (todas)</button>
              <button type="button" className="btn" onClick={() => pr && salvar(`${base}-${slug(pr.titulo)}.dxf`, escreverDxf(pr), 'application/dxf')}>DXF R2000</button>
              <button type="button" className="btn" onClick={dwg}>DWG R2018</button>
            </div>
            <p className="small">{pr.formato} · 1:{pr.escala} · {prs.length} prancha(s){armaduras ? ' · armaduras do último dimensionamento no quadro' : ' · quadro sem armaduras (calcule e dimensione)'}</p>
            {pr.avisos.map((a, i) => <p key={i} className="hint bad">{a}</p>)}
            <Hint>PDF vetorial em escala exata, com uma camada por tipo de elemento. DXF e DWG: planta em metros no modelo e a folha num layout com janela na escala; uma prancha por arquivo. Fora do navegador comum (artifact), DXF e DWG chegam dentro de um .zip.</Hint>
          </>
        )}
      </div>
      {pr && <div className="card prancha-prev" data-formato={pr.formato} data-escala={pr.escala} dangerouslySetInnerHTML={{ __html: svg }} />}
      <div className="card">
        <h3>Carimbo</h3>
        <div className="carimbo-campos">
          {CAMPOS.map(([k, rot]) => (
            <TextField key={k} label={rot} value={cfg.carimbo[k] ?? ''} onChange={(v) => exec('prancha.definir', { carimbo: { [k]: v } })} />
          ))}
        </div>
        <Hint>Dados do carimbo ficam no arquivo de trabalho. Campos vazios: obra e local vêm dos dados da obra; revisão R00.</Hint>
      </div>
    </>
  );
}
