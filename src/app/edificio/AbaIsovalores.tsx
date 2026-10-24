// Aba "Isovalores" (V4): mapas de deslocamentos, esforços e áreas de aço das lajes (e tensões do radier) em bandas de
// cor e isolinhas, com várias janelas lado a lado, limites mínimo e máximo, clique abrindo a janela da laje e saídas
// SVG, PNG, DXF e CSV. A matemática vem de src/core/resultados (funções puras).
import { useMemo, useState, type MouseEvent } from 'react';
import { calculoAtual, useBuilding } from './store';
import { abrirJanela, irParaElemento } from './Revisao';
import { TabelaLajes } from './TabelaLajes';
import { useEdifUI } from './uiStore';
import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';
import {
  bandas, csvCampo, dxfIsolinhas, encadear, enquadramento, extremos, faixaExibida, fmtIso, isolinhas, legenda, niveisAutomaticos,
  niveisDefinidos, nosParaRotulo, svgIsovalores, valoresLegenda, type Campo, type Limites,
} from '../../core/resultados/bandas';
import {
  areaAcimaDoLimite, areaPorMetro, BITOLAS_LIMITE_MM, campoDoPavimento, campoDoRadier, csvRadierHipoteses, elementoNoPonto, espacamentoParaArea, GRANDEZAS_ISO, hipotesesDeLaje,
  infoGrandeza, pavimentosComMapa, tabelaRadierPorHipotese,
} from '../../core/resultados/isovalores';
import { hipotesesDisponiveis } from '../../core/resultados/deformada';
import { Button, Check, download, Group, Hint, NumField, OptNumField, Select, TextField } from '../ui';
import { useIso, type JanelaIso } from './isovaloresStore';

const LARGURA = 640;

/** Cor computada de cada token `--iso-n` (para os arquivos exportados, que não têm folha de estilo). */
function coresDosTokens(): (t: number) => string {
  const cs = getComputedStyle(document.documentElement);
  return (t) => cs.getPropertyValue(`--iso-${t}`).trim() || 'currentColor';
}

function niveisDa(j: JanelaIso, campo: Campo, lim: Limites): number[] {
  const manual = j.niveisTexto.trim();
  if (manual) return niveisDefinidos(manual.split(/[;\s]+/).map((t) => parseFloat(t.replace(',', '.'))));
  const f = faixaExibida(campo, lim);
  return niveisAutomaticos(f.lo, f.hi, j.nNiveis);
}

export function AbaIsovalores({ b }: { b: BuildingModel }) {
  const an = useBuilding((s) => (calculoAtual(s) && !s.analise?.erro ? s.analise : null));
  const janelas = useIso((s) => s.janelas);
  const nova = useIso((s) => s.nova);
  if (!an) return <div className="card"><h3>Isovalores</h3><p className="hint">Calcule a estrutura (aba Dimensionamento) para ver os mapas de isovalores.</p></div>;
  return (
    <div className="isov-aba">
      <div className="row">
        <Button variant="primary" onClick={() => nova()}>Nova janela de isovalores</Button>
        <Hint>As janelas ficam lado a lado e mantêm a configuração até fechar o programa. Clique num ponto do mapa para abrir a janela da laje.</Hint>
      </div>
      <div className="isov-janelas" data-isov-janelas={janelas.length}>
        {janelas.map((j) => <JanelaIsovalores key={j.id} j={j} b={b} />)}
      </div>
      <RadierPorHipotese b={b} />
      <MenuLajes b={b} />
    </div>
  );
}

function JanelaIsovalores({ j, b }: { j: JanelaIso; b: BuildingModel }) {
  const an = useBuilding((s) => (calculoAtual(s) && !s.analise?.erro ? s.analise : null))!;
  const dim = useBuilding((s) => s.dim);
  const mudar = useIso((s) => s.mudar), fechar = useIso((s) => s.fechar);
  const n = j.id, info = infoGrandeza(j.grandeza), doRadier = info.grupo === 'radier';
  const pavs = useMemo(() => pavimentosComMapa(b, an), [b, an]);
  const radiers = dim?.radiers ?? [];
  const hipsLaje = useMemo(() => hipotesesDeLaje(b, an), [b, an]);
  const hipsRadier = useMemo(() => (doRadier ? hipotesesDisponiveis(b, an) : []), [b, an, doRadier]);
  const hips = doRadier ? hipsRadier : hipsLaje;
  const alvo = doRadier ? (radiers.find((r) => r.id === j.alvo)?.id ?? radiers[0]?.id ?? '') : (pavs.find((p) => p.id === j.alvo)?.id ?? pavs[0]?.id ?? '');
  const hip = hips.find((h) => h.id === j.hipotese) ?? hips[0];
  const lim: Limites = { ...(j.min !== undefined ? { min: j.min } : {}), ...(j.max !== undefined ? { max: j.max } : {}) };

  const res = useMemo(() => {
    if (!alvo) return { campo: null as Campo | null, avisos: [doRadier ? 'Nenhum radier calculado.' : 'Sem pavimento com laje calculada.'] };
    return doRadier
      ? campoDoRadier(b, dim, alvo, j.grandeza as 'rSigmaMax' | 'rSigmaMin' | 'rW' | 'rSigma' | 'rWh', { an, hipotese: info.porHipotese ? hip : undefined })
      : campoDoPavimento(b, an, dim, { pavimento: alvo, grandeza: j.grandeza, hipotese: info.porHipotese ? hip : undefined });
  }, [b, an, dim, alvo, j.grandeza, hip, doRadier, info.porHipotese]);
  const campo = res.campo;
  const niveis = useMemo(() => (campo ? niveisDa(j, campo, lim) : []), [campo, j.niveisTexto, j.nNiveis, j.min, j.max]); // eslint-disable-line react-hooks/exhaustive-deps
  const E = useMemo(() => (campo ? enquadramento(campo, LARGURA) : null), [campo]);
  const bs = useMemo(() => (campo ? bandas(campo, niveis, lim) : []), [campo, niveis, j.min, j.max]); // eslint-disable-line react-hooks/exhaustive-deps
  const linhas = useMemo(() => (campo && j.isolinhas ? isolinhas(campo, niveis, lim).flatMap((il) => encadear(il.segmentos)) : []), [campo, niveis, j.isolinhas, j.min, j.max]); // eslint-disable-line react-hooks/exhaustive-deps
  const leg = useMemo(() => (campo ? legenda(campo, niveis, lim) : null), [campo, niveis, j.min, j.max]); // eslint-disable-line react-hooks/exhaustive-deps
  const ex = campo ? extremos(campo, lim) : null, exTotal = campo ? extremos(campo) : null;
  // limite por diâmetro (C12.13): bitola e espaçamento viram o limite mínimo, e o mapa mostra onde a armadura não basta
  const [phi, setPhi] = useState(10), [esp, setEsp] = useState(20);
  const asBitola = areaPorMetro(phi, esp);
  const sigAdm = doRadier ? dim?.radiers?.find((r) => r.id === alvo)?.sigmaAdm ?? null : null;
  const acima = campo && j.min !== undefined ? areaAcimaDoLimite(campo, j.min) : null;

  function abrirNoPonto(pos: readonly number[]) {
    if (!campo || doRadier) return;
    const id = elementoNoPonto(campo, pos[0], pos[1]);
    const pav = pavimentosOrdenados(b).find((p) => p.id === alvo);
    if (id && pav) abrirJanela({ tipo: 'laje', id, pavimento: pav.nome });
  }
  function clicar(e: MouseEvent<SVGSVGElement>) {
    if (!campo || !E || doRadier) return;
    const svg = e.currentTarget, pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const id = elementoNoPonto(campo, E.xm(q.x), E.ym(q.y));
    const pav = pavimentosOrdenados(b).find((p) => p.id === alvo);
    if (id && pav) abrirJanela({ tipo: 'laje', id, pavimento: pav.nome });
  }

  const nome = `mapa-isovalores-${n}-${j.grandeza}`;
  const svgTexto = (largura = LARGURA) => svgIsovalores(campo!, { niveis, limites: lim, cor: coresDosTokens(), comIsolinhas: j.isolinhas, comValores: j.valores, largura });
  async function baixarPng() {
    if (!campo) return;
    const url = URL.createObjectURL(new Blob([svgTexto(1280)], { type: 'image/svg+xml' }));
    const img = new Image();
    await new Promise<void>((ok, erro) => { img.onload = () => ok(); img.onerror = () => erro(new Error('imagem')); img.src = url; });
    const cv = document.createElement('canvas');
    cv.width = 1280; cv.height = Math.round((1280 * (img.naturalHeight || 1)) / (img.naturalWidth || 1));
    const g = cv.getContext('2d');
    if (g) { g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--v3d-claro-fundo').trim() || 'transparent'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height); }
    URL.revokeObjectURL(url);
    const blob: Blob | null = await new Promise((ok) => cv.toBlob(ok, 'image/png'));
    if (blob) await download(`${nome}.png`, new Uint8Array(await blob.arrayBuffer()), 'image/png');
  }

  const dados = campo && leg ? JSON.stringify({
    grandeza: j.grandeza, unidade: campo.unidade, bandas: bs.length, niveis: niveis.length, isolinhas: linhas.length,
    min: ex?.min ? +ex.min.valor.toFixed(4) : null, max: ex?.max ? +ex.max.valor.toFixed(4) : null,
    minPos: ex?.min ? ex.min.pos.map((v) => +v.toFixed(3)) : null, maxPos: ex?.max ? ex.max.pos.map((v) => +v.toFixed(3)) : null,
  }) : undefined;

  return (
    <Group title={`Janela ${n}`} aside={<Button variant="mini" onClick={() => fechar(n)}>{`Fechar janela ${n}`}</Button>}>
      <div className="isov-janela" data-isov-janela={n} data-iso={dados}>
        <div className="row isov-barra">
          <Select label={`Grandeza (janela ${n})`} value={j.grandeza} options={GRANDEZAS_ISO.map((g) => ({ v: g.id, label: `${g.rotulo} [${g.unidade}]` }))} onChange={(v) => mudar(n, { grandeza: v })} />
          {info.porHipotese && <Select label={`Hipótese (janela ${n})`} value={hip?.id ?? ''} options={hips.map((h) => ({ v: h.id, label: h.tipo === 'caso' ? `Caso ${h.nome}` : h.nome }))} onChange={(v) => mudar(n, { hipotese: v })} />}
          {doRadier
            ? <Select label={`Radier (janela ${n})`} value={alvo} options={radiers.map((r) => ({ v: r.id, label: r.nome }))} onChange={(v) => mudar(n, { alvo: v })} />
            : <Select label={`Pavimento (janela ${n})`} value={alvo} options={pavs.map((p) => ({ v: p.id, label: p.nome }))} onChange={(v) => mudar(n, { alvo: v })} />}
        </div>
        <div className="row isov-barra">
          <OptNumField label={`Limite mínimo (janela ${n})`} unit={info.unidade} value={j.min} onChange={(v) => mudar(n, { min: v })} />
          <OptNumField label={`Limite máximo (janela ${n})`} unit={info.unidade} value={j.max} onChange={(v) => mudar(n, { max: v })} />
          <NumField label={`Número de níveis (janela ${n})`} value={j.nNiveis} onChange={(v) => mudar(n, { nNiveis: Math.max(2, Math.min(40, Math.round(v))) })} />
          <TextField label={`Níveis definidos (janela ${n})`} value={j.niveisTexto} placeholder="vazio = automáticos (1-2-5)" onChange={(v) => mudar(n, { niveisTexto: v })} />
        </div>
        {(info.grupo === 'armadura' || (doRadier && sigAdm !== null)) && (
          <div className="row isov-barra" data-isov-limite-diametro>
            {info.grupo === 'armadura' && (
              <>
                <Select label={`Bitola do limite (janela ${n})`} value={phi} options={BITOLAS_LIMITE_MM.map((v) => ({ v, label: `φ ${String(v).replace('.', ',')} mm` }))} onChange={setPhi} />
                <NumField label={`Espaçamento do limite (janela ${n})`} unit="cm" value={esp} min={5} onChange={setEsp} />
                <Button onClick={() => mudar(n, { min: +asBitola.toFixed(4) })}>{`Usar φ ${String(phi).replace('.', ',')} c/${String(esp).replace('.', ',')} = ${fmtIso(asBitola, 2)} cm²/m como limite mínimo (janela ${n})`}</Button>
              </>
            )}
            {doRadier && sigAdm !== null && <Button onClick={() => mudar(n, { min: sigAdm })}>{`Usar a σadm do radier (${fmtIso(sigAdm, 1)} kPa) como limite mínimo (janela ${n})`}</Button>}
          </div>
        )}
        {info.grupo === 'armadura' && exTotal?.max && (
          <p className="hint small" data-iso-bitola-max={espacamentoParaArea(phi, exTotal.max.valor) ?? 'nao'}>
            {espacamentoParaArea(phi, exTotal.max.valor) !== null
              ? `φ ${String(phi).replace('.', ',')} mm a cada ${String(espacamentoParaArea(phi, exTotal.max.valor)).replace('.', ',')} cm (no máximo) cobre a maior taxa do mapa (${fmtIso(exTotal.max.valor, 2)} cm²/m).`
              : `φ ${String(phi).replace('.', ',')} mm não cobre a maior taxa do mapa (${fmtIso(exTotal.max.valor, 2)} cm²/m) nem a cada 5 cm: use bitola maior.`}
          </p>
        )}
        {acima && (
          <p className="hint small" data-iso-acima={acima.fracao.toFixed(4)}>
            Região com valor a partir do limite mínimo: {fmtIso(acima.area, 2)} m² de {fmtIso(acima.total, 2)} m² ({fmtIso(acima.fracao * 100, 1)} %).
          </p>
        )}
        <div className="row isov-barra">
          <Check label={`Isolinhas (janela ${n})`} checked={j.isolinhas} onChange={(v) => mudar(n, { isolinhas: v })} />
          <Check label={`Valores (janela ${n})`} checked={j.valores} onChange={(v) => mudar(n, { valores: v })} />
        </div>
        {res.avisos.map((a) => <p key={a} className="hint">{a}</p>)}
        {campo && E && leg && (
          <>
            <svg className="iso-svg isov-mapa" role="img" aria-label={`Mapa de isovalores (janela ${n})`} viewBox={`0 0 ${E.W} ${E.H.toFixed(1)}`} onClick={clicar}>
              {bs.flatMap((bd) => bd.poligonos.map((p, i) => (
                <polygon key={`${bd.indice}-${i}`} className={`iso-banda iso-${bd.token}`} points={p.map((q) => `${E.X(q[0]).toFixed(1)},${E.Y(q[1]).toFixed(1)}`).join(' ')} />
              )))}
              {linhas.map((l, i) => <polyline key={i} className="iso-linha" points={l.map((q) => `${E.X(q[0]).toFixed(1)},${E.Y(q[1]).toFixed(1)}`).join(' ')} />)}
              {(campo.contornos ?? []).map((c, i) => <polygon key={`c${i}`} className="iso-contorno" points={c.map((q) => `${E.X(q[0]).toFixed(1)},${E.Y(q[1]).toFixed(1)}`).join(' ')} />)}
              {j.valores && nosParaRotulo(campo, Math.max(0.5, (E.x1 - E.x0) / 10), 40).map((i) => (
                <text key={i} className="iso-valor" x={E.X(campo.nos[i][0])} y={E.Y(campo.nos[i][1])} textAnchor="middle">{fmtIso(campo.valores[i], 2)}</text>
              ))}
              {ex?.max && <circle className="iso-ext iso-ext-max" cx={E.X(ex.max.pos[0])} cy={E.Y(ex.max.pos[1])} r={4} />}
              {ex?.min && <circle className="iso-ext iso-ext-min" cx={E.X(ex.min.pos[0])} cy={E.Y(ex.min.pos[1])} r={4} />}
            </svg>
            <div className="iso-leg" role="img" aria-label={`Legenda do mapa (janela ${n})`}>
              {leg.itens.map((it, k) => <span key={k} className={`iso-cel iso-${it.token}`} title={`${it.rotulo} ${campo.unidade}`} />)}
            </div>
            <div className="iso-leg-txt" data-iso-legenda>
              {valoresLegenda(leg.itens).map((t, k) => <span key={k}>{fmtIso(t, 3)}</span>)}
              <span>{campo.unidade}</span>
            </div>
            <p className="hint small" data-iso-extremos>
              {campo.rotulo}. Mínimo {ex?.min ? `${fmtIso(ex.min.valor, 3)} ${campo.unidade} em (${fmtIso(ex.min.pos[0])}; ${fmtIso(ex.min.pos[1])}) m` : '—'}; máximo {ex?.max ? `${fmtIso(ex.max.valor, 3)} ${campo.unidade} em (${fmtIso(ex.max.pos[0])}; ${fmtIso(ex.max.pos[1])}) m` : '—'}.
              {' '}Faixa de {leg.itens[0] ? fmtIso(leg.itens[0].de, 3) : '—'} a {leg.itens.at(-1) ? fmtIso(leg.itens.at(-1)!.ate, 3) : '—'} {campo.unidade} em {leg.itens.length} bandas.
            </p>
            <div className="row wrap">
              {!doRadier && ex?.max && <Button onClick={() => abrirNoPonto(ex.max!.pos)}>{`Abrir a laje do valor máximo (janela ${n})`}</Button>}
              {!doRadier && ex?.min && <Button onClick={() => abrirNoPonto(ex.min!.pos)}>{`Abrir a laje do valor mínimo (janela ${n})`}</Button>}
              <Button onClick={() => { void download(`${nome}.svg`, svgTexto(), 'image/svg+xml'); }}>{`Baixar SVG (janela ${n})`}</Button>
              <Button onClick={() => { void baixarPng(); }}>{`Baixar PNG (janela ${n})`}</Button>
              <Button onClick={() => { void download(`${nome}.dxf`, dxfIsolinhas(campo, niveis, lim), 'application/dxf'); }}>{`Baixar DXF das isolinhas (janela ${n})`}</Button>
              <Button onClick={() => { void download(`${nome}.csv`, csvCampo(campo), 'text/csv'); }}>{`Baixar CSV x, y, valor (janela ${n})`}</Button>
            </div>
          </>
        )}
      </div>
    </Group>
  );
}


/** Menu de lajes igual ao da aba Dimensionamento (C12.15): um clique leva à laje na planta e o duplo clique abre a janela da laje. */
function MenuLajes({ b }: { b: BuildingModel }) {
  const lajes = useBuilding((s) => s.dim?.lajes);
  if (!lajes?.length) return <p className="hint">Calcule e dimensione a obra (aba Dimensionamento) para ver o menu de lajes.</p>;
  return (
    <div className="card" data-menu-lajes>
      <h3>Lajes</h3>
      <TabelaLajes lajes={lajes} onIr={(tipo, id, pav) => { irParaElemento(b, tipo, id, pav); useEdifUI.getState().set({ aba: 'planta' }); }} />
      <Hint>Mesma tabela da aba Dimensionamento: clique para ir à laje na planta; duplo clique abre a janela da laje (resultados, vista e edição da armadura).</Hint>
    </div>
  );
}

/** Radier e vigas sobre base elástica por hipótese (V7e, C12.11): tensões extremas, recalque e levantamento de cada caso e combinação. */
function RadierPorHipotese({ b }: { b: BuildingModel }) {
  const an = useBuilding((s) => (calculoAtual(s) && !s.analise?.erro ? s.analise : null));
  const dim = useBuilding((s) => s.dim);
  const ids = (dim?.radiers ?? []).map((r) => ({ id: r.id, nome: r.nome }));
  const tabelas = useMemo(() => (an ? ids.map((r) => ({ ...r, linhas: tabelaRadierPorHipotese(b, an, r.id) })) : []), [b, an, dim?.radiers]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!tabelas.length) return null;
  return (
    <div className="card" data-radier-hipoteses={tabelas.length}>
      <h3>Radier por hipótese</h3>
      {tabelas.map((t) => (
        <div key={t.id}>
          <div className="row wrap"><strong>{t.nome}</strong>
            <Button onClick={() => { void download(`radier-${t.nome}-hipoteses.csv`, csvRadierHipoteses(t.linhas), 'text/csv'); }}>{`Baixar CSV (${t.nome})`}</Button></div>
          <div className="tablewrap">
            <table className="data quadro">
              <thead><tr><th>Hipótese</th><th>σ máx. (kPa)</th><th>σ mín. (kPa)</th><th>Recalque (mm)</th><th>Levantamento (mm)</th><th>Situação</th></tr></thead>
              <tbody>
                {t.linhas.map((l) => (
                  <tr key={l.id} className={l.invalida ? 'bad' : undefined} data-radier-hipotese={l.id}>
                    <td className="tl">{l.tipo === 'caso' ? `Caso ${l.hipotese}` : l.hipotese}</td>
                    <td className="num">{fmtIso(l.sigmaMax, 1)}</td><td className="num">{fmtIso(l.sigmaMin, 1)}</td>
                    <td className="num">{fmtIso(l.recalque, 2)}</td><td className="num">{fmtIso(l.levantamento, 2)}</td>
                    <td className="tl">{l.invalida ? 'inválida: levantamento' : l.levantamento > 0 ? 'levantamento no caso' : 'ok'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <Hint>Tensão no terreno σ = k·(−uz) e deslocamento vertical de cada nó do radier, por caso e por combinação. Combinação com levantamento é inválida: o solo não traciona (a análise é linear, sem iteração).</Hint>
    </div>
  );
}
