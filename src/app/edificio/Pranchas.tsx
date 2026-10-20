// Aba Pranchas: planta de formas por grupo, prévia em SVG e saída em PDF, DXF R2000 e DWG R2018.
import { useEffect, useMemo, useRef, useState } from 'react';
import { calculoAtual, useBuilding } from './store';
import { montarConjuntoNoWorker, Obsoleto, type Conjunto } from './calculo';
import { useStore } from '../store';
import { Button, Check, download, Group, Hint, Select, TextField } from '../ui';
import { PRECISA_CALCULO, TIPOS_PRANCHA, tiposDe, type TipoSaida } from '../../core/sheets/conjunto';
import { SIGLAS } from '../../core/sheets/prancha';
import { nf } from '../../core/sheets/armacao';
import { zip } from '../../core/zip';
import { ARQUIVO_LOGO, base64Bytes, LIMITE_LOGO } from '../../core/sheets/logo';
import { memo } from '../design/tokens';
import { svgPrancha } from '../../core/sheets/svg';
import { escreverPdf } from '../../core/sheets/pdf';
import { escreverDxf } from '../../core/sheets/dxf';
import { desenhoDwg, VENDOR_DWG, type EscritorDwg } from '../../core/sheets/dwg';
import { ARMACAO_PADRAO, PRANCHA_PADRAO, type Carimbo, type ConfigArmacao, type Formato } from '../../core/building/types';

const CAMPOS: [keyof Carimbo, string][] = [
  ['empresa', 'Empresa / profissional'], ['obra', 'Obra'], ['cliente', 'Cliente'], ['local', 'Local'],
  ['responsavel', 'Responsável técnico'], ['registro', 'Registro profissional'], ['art', 'ART / RRT'], ['etapa', 'Etapa (ex.: projeto para execução)'],
  ['desenho', 'Desenho'], ['revisao', 'Revisão'], ['data', 'Data'],
];
const ROTULO_TIPO: Record<TipoSaida, string> = {
  formas: 'Formas', locacao: 'Locação e cargas', vigas: 'Armação de vigas', pilares: 'Armação de pilares', lajes: 'Armação de lajes', todas: 'Conjunto completo',
};
const FORMATOS = (['auto', 'A0', 'A1', 'A2', 'A3', 'A4'] as const).map((f) => ({ v: f, label: f === 'auto' ? 'automático' : f }));
/** Opções de escala (denominador); inclui o valor em uso, mesmo que fora da lista. */
const escalas = (base: number[], atual: number, auto?: string) => [...new Set([...base, atual])].sort((x, y) => x - y).map((e) => ({ v: e, label: e ? `1:${e}` : auto ?? 'automática' }));
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

/**
 * Imagem (qualquer formato que o navegador desenhe) → JPEG em base64 com fundo branco (cor do papel), até `limite`
 * caracteres: começa em 600 px na maior dimensão e qualidade 0,9, e reduz qualidade e tamanho até caber.
 */
async function imagemParaJpeg(f: File, limite: number): Promise<string | null> {
  const url = URL.createObjectURL(f);
  try {
    const img = new Image();
    await new Promise<void>((ok, falha) => { img.onload = () => ok(); img.onerror = () => falha(new Error('imagem')); img.src = url; });
    const w0 = img.naturalWidth || img.width || 300, h0 = img.naturalHeight || img.height || 150;
    for (let lado = 600, q = 0.9; lado >= 60; ) {
      const k = Math.min(1, lado / Math.max(w0, h0)), w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d'); if (!ctx) return null;
      ctx.fillStyle = memo('paper'); ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
      const d = cv.toDataURL('image/jpeg', q).split(',')[1] ?? '';
      if (d && d.length <= limite) return d;
      if (q > 0.55) q -= 0.15; else { lado = Math.round(lado * 0.75); q = 0.85; }
    }
    return null;
  } catch { return null; } finally { URL.revokeObjectURL(url); }
}

let escritor: Promise<EscritorDwg> | null = null;
/** Carrega o escritor de DWG de public/vendor (fora do HTML único). */
function carregarDwg(): Promise<EscritorDwg> {
  escritor ??= import(/* @vite-ignore */ new URL(VENDOR_DWG, document.baseURI).href)
    .then((m: { writeDwg2018: EscritorDwg }) => m.writeDwg2018)
    .catch((e) => { escritor = null; throw e; });
  return escritor;
}

export function Pranchas() {
  const { sessao, exec, dim, analise, revAnalise, idCalculo } = useBuilding();
  const msg = (m: string) => useStore.getState().set({ message: m });
  const b = sessao.modelo;
  const cfg = { ...PRANCHA_PADRAO, ...(b.prancha ?? {}) };
  const arm: ConfigArmacao = { ...ARMACAO_PADRAO, ...(cfg.armacao ?? {}) };
  const [tipo, setTipo] = useState<TipoSaida>('formas');
  const [grupo, setGrupo] = useState('');
  // cálculo válido = feito na revisão de cálculo atual (mudar só dados de prancha, como carimbo e escalas, não o invalida)
  const atual = !!dim && calculoAtual({ analise, revAnalise, sessao });
  const precisa = tiposDe(tipo).some((t) => PRECISA_CALCULO.includes(t));
  const porGrupo = tipo === 'todas' || tipo === 'formas' || tipo === 'vigas' || tipo === 'lajes';
  const [hoje] = useState(() => new Date().toLocaleDateString('pt-BR'));
  // o conjunto é montado no worker do cálculo (que guarda a análise); respostas de pedidos antigos são descartadas
  const calc = atual ? idCalculo : null;
  const pedido = useMemo(
    () => ({ b, calc, tipos: tipo, grupo: porGrupo && grupo ? grupo : undefined, data: b.prancha?.carimbo.data || hoje }),
    [b, calc, tipo, grupo, porGrupo, hoje],
  );
  const [res, setRes] = useState<{ pedido: typeof pedido; cj?: Conjunto; erro?: string } | null>(null);
  useEffect(() => {
    let vivo = true;
    montarConjuntoNoWorker(pedido.b, pedido.calc, { tipos: pedido.tipos, grupo: pedido.grupo, carimbo: { data: pedido.data } })
      .then((cj) => { if (vivo) setRes({ pedido, cj }); })
      .catch((e: Error) => { if (vivo && !(e instanceof Obsoleto)) setRes({ pedido, erro: e.message }); });
    return () => { vivo = false; };
  }, [pedido]);
  const carregando = res?.pedido !== pedido;
  // durante a montagem, continua mostrando a resposta anterior se for do mesmo tipo e grupo (edição do carimbo, escalas)
  const visivel = res && (!carregando || (res.pedido.tipos === pedido.tipos && res.pedido.grupo === pedido.grupo)) ? res : null;
  const prs = useMemo(() => visivel?.cj?.pranchas ?? [], [visivel]);
  const avisos = visivel?.cj?.avisos ?? [];
  const [sel, setSel] = useState(0);
  const i = Math.min(sel, Math.max(0, prs.length - 1));
  const pr = prs[i];
  const svg = useMemo(() => (pr ? svgPrancha(pr) : ''), [pr]);
  const base = slug(b.obra.nome || 'edificio');
  const nome = (p: (typeof prs)[number], k: number) => `${base}-${SIGLAS[p.tipo ?? 'formas']}-${String(k + 1).padStart(2, '0')}`;
  const pa = (patch: Partial<ConfigArmacao>) => exec('prancha.definir', { armacao: patch });
  const salvar = async (arquivo: string, dados: Uint8Array, mime: string) => {
    const r = await download(arquivo, dados, mime);
    msg(r === 'declined' ? 'Download cancelado.' : `${arquivo} gerado.`);
  };
  const escritorDwg = async (): Promise<EscritorDwg | null> => {
    try { return await carregarDwg(); } catch { msg('DWG indisponível neste ambiente (o escritor fica em vendor/, fora do arquivo único). Use o DXF: o AutoCAD abre e salva como DWG.'); return null; }
  };
  const dwgDe = (w: EscritorDwg, p: (typeof prs)[number]) => w(desenhoDwg(p, ARQUIVO_LOGO));
  // o DXF e o DWG só referenciam imagens externas: com logo, o arquivo da imagem vai junto (zip)
  const logoArq = () => { const d = cfg.logo ? base64Bytes(cfg.logo.dados) : null; return d ? [{ nome: ARQUIVO_LOGO, dados: d }] : []; };
  const comLogo = async (arquivo: string, dados: Uint8Array, mime: string) => {
    const l = logoArq();
    if (!l.length) return salvar(arquivo, dados, mime);
    await salvar(arquivo.replace(/\.(dxf|dwg)$/, '.zip'), zip([{ nome: arquivo, dados }, ...l]), 'application/zip');
  };
  const dwg = async () => {
    if (!pr) return;
    const w = await escritorDwg(); if (!w) return;
    const r = dwgDe(w, pr);
    if (r.skipped.length) { msg(`DWG: não gravado: ${r.skipped.join(', ')}`); return; }
    await comLogo(`${nome(pr, i)}.dwg`, r.data, 'application/acad');
  };
  const zipDxf = () => salvar(`${base}-${tipo === 'todas' ? 'conjunto' : tipo}-dxf.zip`, zip([...prs.map((p, k) => ({ nome: `${nome(p, k)}.dxf`, dados: escreverDxf(p, { arquivoLogo: ARQUIVO_LOGO }) })), ...logoArq()]), 'application/zip');
  const zipDwg = async () => {
    const w = await escritorDwg(); if (!w) return;
    const arq: { nome: string; dados: Uint8Array }[] = [];
    for (const [k, p] of prs.entries()) { const r = dwgDe(w, p); if (r.skipped.length) { msg(`DWG da folha ${k + 1}: não gravado: ${r.skipped.join(', ')}`); return; } arq.push({ nome: `${nome(p, k)}.dwg`, dados: r.data }); }
    await salvar(`${base}-${tipo === 'todas' ? 'conjunto' : tipo}-dwg.zip`, zip([...arq, ...logoArq()]), 'application/zip');
  };
  const refLogo = useRef<HTMLInputElement>(null);
  const carregarLogo = async (f: File) => {
    const r = await imagemParaJpeg(f, LIMITE_LOGO);
    if (!r) { msg(`${f.name}: não foi possível ler a imagem.`); return; }
    if (exec('prancha.definir', { logo: { dados: r, nome: f.name } }).ok) msg(`Logo ${f.name} aplicado ao carimbo.`);
  };
  const pdfInfo = { titulo: `${b.obra.nome} — pranchas`, autor: cfg.carimbo.responsavel };
  const fmt = (v: number) => nf(v, 2);

  return (
    <>
      <div className="card">
        <h3>Pranchas</h3>
        <div className="row wrap">
          <Select label="Tipo de prancha" value={tipo} options={TIPOS_PRANCHA.map((t) => ({ v: t, label: ROTULO_TIPO[t] }))} onChange={(t) => { setTipo(t); setSel(0); }} />
          {porGrupo && (
            <Select label="Grupo / pavimento" value={grupo} options={[{ v: '', label: 'todos os grupos' }, ...b.grupos.map((g) => ({ v: g.id, label: g.nome }))]} onChange={(g) => { setGrupo(g); setSel(0); }} />
          )}
          {(tipo === 'formas' || tipo === 'todas') && (
            <>
              <Select label="Formato" value={cfg.formato} options={FORMATOS} onChange={(f) => exec('prancha.definir', { formato: f as Formato | 'auto' })} />
              <Select label="Escala" value={cfg.escala} options={escalas([0, 20, 25, 50, 75, 100, 125, 200, 250], cfg.escala)} onChange={(e) => exec('prancha.definir', { escala: e })} />
            </>
          )}
        </div>
        {precisa && !dim && <Hint><span data-aviso-calculo="sem">As pranchas de armação e a tabela de cargas da locação exigem o cálculo. Calcule e dimensione o edifício na aba Dimensionamento.</span></Hint>}
        {precisa && dim && !atual && <p className="hint bad" data-aviso-calculo="desatualizado">O dimensionamento é de uma revisão anterior do modelo. Recalcule na aba Dimensionamento para gerar as pranchas de armação e a locação com cargas.</p>}
        {!precisa && tipo === 'locacao' && !atual && <Hint>Sem cálculo atualizado, a locação sai sem a tabela de cargas.</Hint>}
        {!precisa && tipo === 'formas' && !atual && <Hint>Quadro de pilares sem armaduras (calcule e dimensione).</Hint>}
        {avisos.map((a, k) => <p key={k} className="hint bad">{a}</p>)}
        {visivel?.erro && <p className="hint bad">Pranchas: {visivel.erro}</p>}
        {carregando && <Hint><span data-pranchas-carregando>Montando as pranchas…</span></Hint>}
        {!visivel ? null : !prs.length ? <Hint>{precisa && !atual ? 'Nenhuma folha: falta o cálculo.' : 'Lance vigas ou lajes em algum grupo para gerar as pranchas.'}</Hint> : (
          <>
            <table className="design data" data-lista-folhas={prs.length}>
              <thead><tr><th className="tl">Folha</th><th className="tl">Sigla</th><th className="tl">Título</th><th>Formato</th><th>Escala</th></tr></thead>
              <tbody>
                {prs.map((p, k) => (
                  <tr key={k} className={k === i ? 'on' : ''} onClick={() => setSel(k)} data-folha-item={k + 1}>
                    <td className="tl">{String(k + 1).padStart(2, '0')}/{String(prs.length).padStart(2, '0')}</td>
                    <td className="tl">{SIGLAS[p.tipo ?? 'formas']}</td>
                    <td className="tl">{p.titulo}</td><td className="num">{p.formato}</td><td className="num">1:{p.escala}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="row wrap">
              <Button disabled={i <= 0} onClick={() => setSel(i - 1)}>Folha anterior</Button>
              <Button disabled={i >= prs.length - 1} onClick={() => setSel(i + 1)}>Próxima folha</Button>
            </div>
            <div className="row wrap">
              <Button variant="primary" onClick={() => salvar(`${nome(pr, i)}.pdf`, escreverPdf([pr], pdfInfo), 'application/pdf')}>PDF da folha</Button>
              <Button onClick={() => salvar(`${base}-${tipo === 'todas' ? 'conjunto' : tipo === 'formas' ? 'pranchas' : tipo}.pdf`, escreverPdf(prs, pdfInfo), 'application/pdf')}>PDF (todas)</Button>
              <Button onClick={() => comLogo(`${nome(pr, i)}.dxf`, escreverDxf(pr, { arquivoLogo: ARQUIVO_LOGO }), 'application/dxf')}>DXF R2000</Button>
              <Button onClick={dwg}>DWG R2018</Button>
              {prs.length > 1 && <Button onClick={zipDxf}>DXF (zip de todas)</Button>}
              {prs.length > 1 && <Button onClick={zipDwg}>DWG (zip de todas)</Button>}
            </div>
            <p className="small">Folha {i + 1} de {prs.length} · {pr.formato} · 1:{pr.escala}{pr.elementos?.length ? ` · ${pr.elementos.length} elemento(s)` : ''}</p>
            {pr.aco && (
              <div data-aco-folha data-aco-peso={pr.aco.peso} data-aco-peso-perdas={pr.aco.pesoComPerdas}>
                <table className="design data">
                  <thead><tr><th className="tl">Dados desta folha</th><th>Valor</th></tr></thead>
                  <tbody>
                    <tr><td className="tl">Aço (kg)</td><td className="num">{fmt(pr.aco.peso)}</td></tr>
                    <tr><td className="tl">Aço com perdas de {nf(pr.aco.perdas, 0)} % (kg)</td><td className="num">{fmt(pr.aco.pesoComPerdas)}</td></tr>
                    <tr><td className="tl">Concreto (m³)</td><td className="num">{fmt(pr.aco.concreto)}</td></tr>
                    <tr><td className="tl">Forma (m²)</td><td className="num">{fmt(pr.aco.forma)}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
            {pr.avisos.map((a, k) => <p key={k} className="hint bad">{a}</p>)}
            <Hint>PDF vetorial em escala exata, com uma camada por tipo de elemento. DXF e DWG: planta em metros no modelo e a folha num layout com janela na escala; um arquivo por folha (nome com a sigla e o número da folha). Fora do navegador comum (artifact), DXF e DWG chegam dentro de um .zip.</Hint>
          </>
        )}
      </div>
      {pr && <div className="card prancha-prev" data-estado={carregando ? 'carregando' : 'pronto'} data-formato={pr.formato} data-escala={pr.escala} data-tipo={pr.tipo ?? 'formas'} data-folha={i + 1} data-total={prs.length} dangerouslySetInnerHTML={{ __html: svg }} />}
      <Group title="Opções de armação e locação" open={false}>
        <div className="row wrap">
          <Select label="Folha de armação" value={arm.formato} options={FORMATOS} onChange={(f) => pa({ formato: f })} />
          <Select label="Escala das vigas" value={arm.escalaVigas} options={escalas([25, 50, 75, 100], arm.escalaVigas)} onChange={(e) => pa({ escalaVigas: e })} />
          <Select label="Escala das seções" value={arm.escalaSecao} options={escalas([10, 20, 25, 50], arm.escalaSecao)} onChange={(e) => pa({ escalaSecao: e })} />
          <Select label="Escala dos pilares" value={arm.escalaPilares} options={escalas([25, 40, 50, 75, 100, 125], arm.escalaPilares)} onChange={(e) => pa({ escalaPilares: e })} />
          <Select label="Escala das lajes" value={arm.escalaLajes} options={escalas([50, 75, 100, 125, 200, 250], arm.escalaLajes, 'a das formas')} onChange={(e) => pa({ escalaLajes: e })} />
          <Select label="Escala da locação" value={arm.escalaLocacao} options={escalas([50, 75, 100, 125, 200, 250], arm.escalaLocacao, 'a das formas')} onChange={(e) => pa({ escalaLocacao: e })} />
        </div>
        <Check label="Lajes: positivas e negativas em folhas separadas" checked={arm.lajesSeparadas === 1} onChange={(v) => pa({ lajesSeparadas: v ? 1 : 0 })} />
        <Check label="Quadro de pilares no fim das pranchas de pilares" checked={arm.quadroPilares === 1} onChange={(v) => pa({ quadroPilares: v ? 1 : 0 })} />
        <Hint>
          Padrões: folha automática (A1; A0 quando um elemento não cabe), vigas 1:{ARMACAO_PADRAO.escalaVigas}, seções 1:{ARMACAO_PADRAO.escalaSecao}, pilares 1:{ARMACAO_PADRAO.escalaPilares} (sobem para 1:50, 1:75… quando não cabem na altura), lajes e locação na escala das formas (automática a partir de 1:75), lajes em folhas separadas e quadro de pilares ligado. Escalas, formato e siglas (SFN, SCF, SCV, SCP) seguem as folhas de referência. A confirmar (premissa pranchas-armacao): a sigla das lajes (SCL), as penas em mm e a representação das lajes. As perdas do aço vêm das opções de cálculo.
        </Hint>
      </Group>
      <div className="card">
        <h3>Carimbo</h3>
        <div className="carimbo-campos">
          {CAMPOS.map(([k, rot]) => (
            <TextField key={k} label={rot} value={cfg.carimbo[k] ?? ''} onChange={(v) => exec('prancha.definir', { carimbo: { [k]: v } })} />
          ))}
        </div>
        <div className="row wrap u-mt-6" data-logo={cfg.logo ? `${cfg.logo.largura}x${cfg.logo.altura}` : ''}>
          <Button onClick={() => refLogo.current?.click()}>{cfg.logo ? 'Trocar logo…' : 'Logo do carimbo…'}</Button>
          <input ref={refLogo} type="file" accept="image/*" hidden aria-label="Imagem do logo" onChange={(e) => { const f = e.target.files?.[0]; if (f) void carregarLogo(f); e.target.value = ''; }} />
          {cfg.logo && <span className="small">{cfg.logo.nome ?? 'logo'} · {cfg.logo.largura} × {cfg.logo.altura} px · {Math.round(cfg.logo.dados.length / 1024)} KB</span>}
          {cfg.logo && <Button variant="danger" onClick={() => exec('prancha.definir', { removerLogo: true })}>Remover logo</Button>}
        </div>
        <Hint>Dados do carimbo ficam no arquivo de trabalho. Campos vazios: obra e local vêm dos dados da obra (grupo Obra), revisão R00 e data de hoje. Escala, conteúdo e número da prancha são automáticos. O logo (PNG, JPEG ou SVG) é convertido para JPEG com fundo branco e reduzido até caber no limite de {Math.round(LIMITE_LOGO / 1024)} KB; no DXF e no DWG ele vai como imagem externa ({ARQUIVO_LOGO}, no mesmo .zip).</Hint>
      </div>
    </>
  );
}
