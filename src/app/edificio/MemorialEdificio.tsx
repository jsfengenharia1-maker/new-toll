// Memorial de cálculo do edifício: identificação, materiais, geometria, ações, modelo, estabilidade,
// dimensionamento, cargas na fundação, quantitativos e premissas. Mesmo CSS e impressão do memorial do pórtico.
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useBuilding } from './store';
import { useStore } from '../store';
import { APP_PRINT_CSS, MEMO_CSS, memoPrintCss, printHtmlDoc } from '../Memorial';
import { memo } from '../design/tokens';
import { OPCOES_INFO, opcoesAlteradas, opcoesEmUso, padraoDe, perfilDe, vinculosAlterados } from '../../core/building/opcoes';
import { acoDe, cobrimentoLaje, cobrimentoViga, fckDe, gamas } from '../../core/building/materiais';
import { Button, download, Spacer } from '../ui';
import { resumoAnalise } from '../../core/building/resumo';
import { deltaXi } from '../../core/design';
import { PREMISSAS, TAXAS } from '../../core/building/premissas';

import { cotaFundacao, pavimentosOrdenados, peDireito, USOS, VENTO_PADRAO } from '../../core/building/types';
import { svgPlantaGrupo } from './desenhoMemorial';
import { casosDaObra } from '../../core/building/types';
import { combinacoesEdificio } from '../../core/building/combinacoes';
import { naturezaTexto, psiDoCaso } from './Casos';
import { useRevisao } from './revisao';
import { arranjoPilarTxt, arranjoVigaTxt } from './Armadura';
import { FACE_BARRA, linhasBarras, linhasEstribos, perdasDoResumo, TIPO_BARRA } from './Detalhamento';

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const ST = { ok: 'ok', fail: 'NÃO ATENDE', review: 'revisar' } as const;

export function MemorialEdificio({ onClose }: { onClose: () => void }) {
  const { sessao, analise, dim, revAnalise } = useBuilding();
  const st = useStore();
  const b = sessao.modelo;
  const docRef = useRef<HTMLDivElement>(null);
  const [today] = useState(() => new Date().toLocaleDateString('pt-BR'));
  const r = useMemo(() => (analise ? resumoAnalise(b, analise) : null), [b, analise]);
  const velha = !!analise && revAnalise !== sessao.rev;
  const perfil = perfilDe(b);
  const opc = analise?.opcoes ?? opcoesEmUso(b.opcoes, perfil);
  const vinculos = useMemo(() => vinculosAlterados(b), [b]);
  const ps = pavimentosOrdenados(b);
  const v = b.vento ?? VENTO_PADRAO;
  const psi = b.norma.psiQ ?? [0.5, 0.4, 0.3];
  const falhas = new Set([...(dim?.vigas ?? []).filter((x) => x.status !== 'ok').map((x) => x.viga), ...(dim?.pilares ?? []).filter((x) => x.status === 'fail').map((x) => x.pilar)]);
  const bloqueadasMemo = [
    ...(dim?.vigas ?? []).filter((x) => x.bloqueada).map((x) => ({ elemento: `Viga ${x.nome}`, lance: 'todos os vãos', arranjo: arranjoVigaTxt(x), status: x.status === 'ok' ? 'atende' : 'NÃO ATENDE', msgs: x.mensagens.filter((m) => /^(Armadura bloqueada|Flecha|Abertura)/.test(m)).join(' ') || '—' })),
    ...(dim?.pilares ?? []).filter((x) => x.bloqueada).map((x) => ({ elemento: `Pilar ${x.nome}`, lance: x.pavimento, arranjo: arranjoPilarTxt(x), status: x.status === 'fail' ? 'NÃO ATENDE' : x.status === 'review' ? 'revisar' : 'atende', msgs: x.mensagens.filter((m) => m.startsWith('Armadura bloqueada')).join(' ') || '—' })),
  ];
  const sent = v.sentido ?? {};
  const sentAlt = ([['xp', '+X'], ['xn', '−X'], ['yp', '+Y'], ['yn', '−Y']] as const).filter(([k]) => (sent[k] ?? 1) !== 1).map(([k, t]) => `${t} ${fmt(sent[k]!)}`);
  const ventoExtra = `${sentAlt.length ? `; coeficiente por sentido: ${sentAlt.join(', ')} (demais 1,00)` : '; coeficiente por sentido 1,00 nos quatro sentidos'}; fator de vizinhança ${fmt(v.vizinhanca ?? 1)}; platibanda ${fmt(v.platibanda ?? 0)} m (somada à faixa do último pavimento)`;
  const zonasTxt = r?.zonas.some((z) => z.zonas > 1) ? ` Pavimentos com várias zonas: ${r.zonas.filter((z) => z.zonas > 1).map((z) => `${z.pavimento} (${z.zonas} zonas, ${z.diafragmas} com diafragma, ${z.pilaresSoltos} pilar(es) solto(s))`).join('; ')}; o vento é repartido entre elas pela largura (Bi = bi/Σb·B).` : '';
  const rev = useRevisao();
  const desloc = analise?.vento?.deslocamentos ?? [];
  const nomePav = (id: string) => b.pavimentos.find((p) => p.id === id)?.nome ?? id;
  const nome = b.obra.nome || 'Edifício';
  const casos = casosDaObra(b);
  const nomeCaso = (id: string) => casos.find((c) => c.id === id)?.nome ?? id;
  const cps = b.cargasPilar ?? [];
  const combs = useMemo(() => (analise ? combinacoesEdificio(b, analise) : []), [b, analise]);
  const porTipo = (t: string) => combs.filter((c) => c.tipo === t).length;
  const excepcionais = combs.filter((c) => c.nome.startsWith('ELU excepcional'));

  const printCss = memoPrintCss({ title: nome, obra: b.obra.nome, rev: 'R00', date: today });
  const html = () => {
    const title = `Memorial de cálculo · ${nome}`.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;background:${memo('paper')}}${MEMO_CSS}${printCss}</style></head><body>${docRef.current?.outerHTML ?? ''}</body></html>`;
  };
  const exportar = async () => {
    const res = await download(`memorial-edificio-${nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.html`, html(), 'text/html');
    st.set({ message: res === 'declined' ? 'Exportação cancelada.' : 'Memorial do edifício exportado em HTML.' });
  };

  let sec = 0;
  const h2 = (c: ReactNode, brk = false) => <h2 className={brk ? 'pb' : undefined}>{++sec}. {c}</h2>;
  const totQ = dim?.quantitativos.reduce((t, q) => ({ c: t.c + q.concreto.lajes + q.concreto.vigas + q.concreto.pilares, f: t.f + q.forma.lajes + q.forma.vigas + q.forma.pilares, a: t.a + q.aco }), { c: 0, f: 0, a: 0 });

  return (
    <div className="memo-overlay" role="dialog" aria-label="Memorial do edifício">
      <style>{MEMO_CSS + printCss + APP_PRINT_CSS}</style>
      <div className="memo-bar">
        <b>Memorial do edifício</b>
        <span className="muted">{!analise ? 'Sem cálculo: só geometria e premissas.' : velha ? 'O modelo mudou depois do cálculo: calcule de novo.' : 'Gerado a partir do último cálculo.'}</span>
        <Spacer />
        <Button variant="primary" onClick={() => { printHtmlDoc(html()); st.set({ message: 'Impressão do memorial: escolha “Salvar como PDF”.' }); }}>Imprimir / PDF</Button>
        <Button onClick={exportar}>Exportar HTML</Button>
        <Button onClick={onClose}>Fechar</Button>
      </div>
      <div />
      <div className="memo-scroll">
        <div className="memo" ref={docRef}>
          <h1>Memorial de cálculo estrutural</h1>
          <p className="sub">{nome} · edifício em concreto armado: grelha de lajes e vigas por pavimento e pórtico espacial</p>
          <dl className="id">
            <dt>Obra</dt><dd>{b.obra.nome || '—'}</dd>
            <dt>Local</dt><dd>{b.obra.cidade || '—'}</dd>
            <dt>Data</dt><dd>{today}</dd>
          </dl>
          {velha && <p className="warn">Atenção: o modelo foi alterado depois do cálculo; os resultados abaixo podem estar desatualizados.</p>}

          {h2('Normas e materiais')}
          <p>NBR 6118 (concreto), NBR 6120 (ações), NBR 6123 (vento), NBR 8681 (combinações). Concreto C{b.norma.fck}, aço {b.norma.aco}, classe de agressividade {b.norma.caa}; cobrimentos: lajes {fmt(b.norma.cobrimento.laje, 1)} cm, vigas {fmt(b.norma.cobrimento.viga, 1)} cm, pilares {fmt(b.norma.cobrimento.pilar, 1)} cm. ψ da carga de uso: {psi.map((x) => fmt(x, 1)).join(' / ')}.</p>
          <h3>Materiais por elemento e coeficientes de ponderação</h3>
          <table>
            <thead><tr><th className="l">Elemento</th><th>fck (MPa)</th><th className="l">Aço</th><th className="l">Cobrimentos (cm)</th></tr></thead>
            <tbody>
              <tr><td className="l">Lajes</td><td>{fckDe(b, 'laje')}</td><td className="l">inferior {acoDe(b, 'lajeInf').aco}; superior {acoDe(b, 'lajeSup').aco}</td><td className="l">inferior {fmt(cobrimentoLaje(b).inf * 100, 1)}; superior {fmt(cobrimentoLaje(b).sup * 100, 1)}</td></tr>
              <tr><td className="l">Vigas</td><td>{fckDe(b, 'viga')}</td><td className="l">positiva {acoDe(b, 'vigaPos').aco}; negativa {acoDe(b, 'vigaNeg').aco}; estribos {acoDe(b, 'vigaEstribo').aco}</td><td className="l">inferior {fmt(cobrimentoViga(b).inf * 100, 1)}; superior {fmt(cobrimentoViga(b).sup * 100, 1)}; lateral {fmt(cobrimentoViga(b).lat * 100, 1)}</td></tr>
              <tr><td className="l">Pilares</td><td>{fckDe(b, 'pilar')}{b.norma.fckPilarPav?.length ? ` (lances: ${b.norma.fckPilarPav.map((x) => `${b.pavimentos.find((p) => p.id === x.pavimento)?.nome ?? x.pavimento} ${x.fck}`).join('; ')})` : ''}</td><td className="l">longitudinal {acoDe(b, 'pilarLong').aco}; estribos {acoDe(b, 'pilarEstribo').aco}</td><td className="l">{fmt(b.norma.cobrimento.pilar, 1)}</td></tr>
            </tbody>
          </table>
          <p>γc = {fmt(gamas(b).c)}; γs = {fmt(gamas(b).s)}; γg = {fmt(gamas(b).g)} (favorável 1,0); γq = {fmt(gamas(b).q)}. Elementos com cobrimento próprio: {[...b.pilares, ...b.vigas, ...b.lajes].filter((x) => x.cobrimento).map((x) => `${x.nome} ${fmt(x.cobrimento!, 1)} cm`).join('; ') || 'nenhum'}. Comprimento de flambagem dos pilares: ℓe = mín(ℓ0 + h; ℓ) × α (NBR 6118, 15.6){[...b.pavimentos.filter((p) => p.alfaFlambagem).map((p) => `${p.nome}: α ${fmt(p.alfaFlambagem!)}`), ...b.pilares.flatMap((p) => (p.flambagem ?? []).map((f) => `${p.nome} até ${b.pavimentos.find((x) => x.id === f.pavimento)?.nome ?? f.pavimento}: α ${fmt(f.au ?? 1)} (b) / ${fmt(f.av ?? 1)} (h)`))].map((t, i) => (i ? '; ' : ' — ') + t).join('')}.</p>

          {h2('Geometria')}
          <table>
            <thead><tr><th>Pavimento</th><th>Cota (m)</th><th>Pé-direito (m)</th><th>Grupo</th></tr></thead>
            <tbody>{[...ps].reverse().map((p) => <tr key={p.id}><td className="l">{p.nome}</td><td>{fmt(p.cota)}</td><td>{fmt(peDireito(b, p.id))}</td><td className="l">{b.grupos.find((g) => g.id === p.grupo)?.nome ?? '—'}</td></tr>)}</tbody>
          </table>
          <p>Fundação na cota {fmt(cotaFundacao(b))} m. {b.pilares.length} pilares, {b.vigas.length} vigas e {b.lajes.length} lajes lançadas.</p>
          {b.grupos.map((g) => { const svg = svgPlantaGrupo(b, g.id, falhas); return svg ? <figure key={g.id}><div dangerouslySetInnerHTML={{ __html: svg }} /><figcaption>Planta de fôrma esquemática — {g.nome}{falhas.size ? ' (em vermelho: elementos que não atendem)' : ''}</figcaption></figure> : null; })}

          {h2('Ações')}
          <table>
            <thead><tr><th>Grupo</th><th>Uso</th><th>Revestimento (kN/m²)</th><th>Variável (kN/m²)</th></tr></thead>
            <tbody>{b.grupos.map((g) => <tr key={g.id}><td className="l">{g.nome}</td><td className="l">{USOS.find((u) => u.v === g.uso)?.label ?? g.uso}</td><td>{fmt(g.gRev)}</td><td>{fmt(g.q)}</td></tr>)}</tbody>
          </table>
          <p>Peso próprio com γ = 25 kN/m³. {b.cargas.length} carga(s) adicional(is) lançada(s) (pontuais, lineares, por área e alvenarias).{r && !r.erro ? ` Totais: G = ${fmt(r.totais.G, 1)} kN; Q = ${fmt(r.totais.Q, 1)} kN.` : ''}</p>
          <h3>Casos de carga</h3>
          <table>
            <thead><tr><th className="l">Caso</th><th className="l">Natureza</th><th className="l">Grupo (incompatíveis)</th><th className="l">Simultâneo com</th><th>ψ0</th><th>ψ1</th><th>ψ2</th></tr></thead>
            <tbody>{casos.map((c) => { const ps0 = c.id === 'Q' ? c.psi ?? null : psiDoCaso(b, c); return <tr key={c.id}><td className="l">{c.nome}</td><td className="l">{naturezaTexto(c.natureza)}</td><td className="l">{c.grupo ?? '—'}</td><td className="l">{c.simultaneo ? nomeCaso(c.simultaneo) : '—'}</td>{[0, 1, 2].map((i) => <td key={i}>{ps0 ? fmt(ps0[i], 2) : '—'}</td>)}</tr>; })}</tbody>
          </table>
          {cps.length > 0 && (<>
            <h3>Cargas nos pilares</h3>
            <table>
              <thead><tr><th className="l">Pilar</th><th className="l">Lance</th><th className="l">Caso</th><th>Altura (m)</th><th>N (kN)</th><th>Hx (kN)</th><th>Hy (kN)</th><th>Mx (kN·m)</th><th>My (kN·m)</th></tr></thead>
              <tbody>{cps.map((c) => <tr key={c.id}><td className="l">{b.pilares.find((p) => p.id === c.pilar)?.nome ?? c.pilar}</td><td className="l">{b.pavimentos.find((p) => p.id === c.pavimento)?.nome ?? c.pavimento}</td><td className="l">{nomeCaso(c.caso)}</td><td>{c.altura === undefined ? 'topo' : fmt(c.altura)}</td><td>{fmt(c.N, 1)}</td><td>{fmt(c.Hx, 1)}</td><td>{fmt(c.Hy, 1)}</td><td>{fmt(c.Mx, 1)}</td><td>{fmt(c.My, 1)}</td></tr>)}</tbody>
            </table>
            <p>Eixos globais; N &gt; 0 = compressão.</p>
          </>)}
          {analise && !analise.erro && (
            <p>Combinações geradas: {combs.length} ({porTipo('ELU')} ELU, {porTipo('RARA')} raras, {porTipo('FREQ')} frequentes, {porTipo('QP')} quase permanentes).{excepcionais.length ? ` Excepcionais: ${excepcionais.map((c) => c.nome.replace('ELU excepcional ', '')).join('; ')}.` : ''} A lista completa, com os fatores por caso, pode ser exportada em CSV na aba Análise.</p>
          )}
          <p>Vento: {v.ativo ? `V0 = ${fmt(v.v0, 0)} m/s, S1 = ${fmt(v.s1)}, S3 = ${fmt(v.s3)}, categoria ${v.categoria}, Ca = ${fmt(v.caX)} (X) / ${fmt(v.caY)} (Y), excentricidade ${fmt(v.excentricidade, 3)} × largura${ventoExtra}${r?.vento ? `, classe ${r.vento.classe} (altura ${fmt(r.vento.altura, 1)} m)` : ''}.` : 'não considerado.'}</p>

          {h2('Modelo de análise')}
          <p>Análise linear. Grelha de lajes e vigas por pavimento (malha {fmt(opc.malha)} m) e pórtico espacial com diafragma rígido por pavimento (zonas do pavimento ligadas por vigas são diafragmas independentes, cada uma com seu mestre; pilar isolado, sem diafragma; vigas fora do diafragma não o integram); as forças das lajes nas vigas entram no pórtico como cargas concentradas. Pilares engastados na fundação.{opc.zonasIndependentes ? '' : ' Zonas independentes desligadas: um diafragma por pavimento.'}{zonasTxt}{r && !r.erro ? ` ${r.gdl} graus de liberdade; ${r.combinacoes} combinações. Equilíbrio (reações − cargas): G ${fmt(r.equilibrio.G, 3)} kN, Q ${fmt(r.equilibrio.Q, 3)} kN.` : ''}</p>
          <h3>Opções de cálculo</h3>
          <p>Perfil dos padrões: <b>{perfil === 'nbr' ? 'padrão NBR 6118' : 'padrão do sistema (critério de mercado; NBR 6118 onde ele não fixa valor)'}</b>. As colunas mostram o padrão dos dois perfis; os valores que diferem estão destacados.</p>
          <table>
            <thead><tr><th className="l">Opção</th><th>Em uso</th><th>Padrão do sistema</th><th>Padrão NBR 6118</th><th className="l">Fonte</th></tr></thead>
            <tbody>{OPCOES_INFO.map((o) => { const sim = (v: number) => (o.booleana ? (v ? 'sim' : 'não') : fmt(v)), nbr = padraoDe(o, 'nbr'), alt = opc[o.chave] !== padraoDe(o, perfil), dif = nbr !== o.padrao; return <tr key={o.chave}><td className="l">{o.rotulo}{o.unidade ? ` (${o.unidade})` : ''}</td><td className={alt ? 'warn' : undefined}>{sim(opc[o.chave])}</td><td className={dif ? 'warn' : undefined}>{sim(o.padrao)}</td><td className={dif ? 'warn' : undefined}>{sim(nbr)}</td><td className="l">{o.fonte}{o.aConfirmar ? '; a confirmar' : ''}{dif && o.fonteNBR ? `. NBR: ${o.fonteNBR}` : ''}</td></tr>; })}</tbody>
          </table>
          {vinculos.length > 0 && <><h3>Vínculos e engastes alterados por elemento</h3><ul>{vinculos.map((t, i) => <li key={i}>{t}</li>)}</ul></>}
          {opcoesAlteradas(b.opcoes, perfil).length > 0 && <p className="warn">Opções diferentes do padrão do perfil: {opcoesAlteradas(b.opcoes, perfil).map((o) => o.rotulo.toLowerCase()).join('; ')}.</p>}
          {r?.erro && <p className="warn">{r.erro}</p>}
          {r && r.avisos.length > 0 && <ul>{r.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>}

          {r?.vento && (<>
            {h2('Estabilidade global')}
            <table>
              <thead><tr><th>Direção</th><th>γz</th><th>Vento nas ELU ×</th></tr></thead>
              <tbody>{r.vento.gamaZ.map((g) => <tr key={g.direcao}><td>{g.direcao}°</td><td>{fmt(g.gamaZ, 3)}</td><td>{fmt(g.ampliacaoVento, 3)}</td></tr>)}</tbody>
            </table>
            <p>γz com rigidez reduzida (vigas 0,4·Eci·Ic; pilares 0,8·Eci·Ic). Entre 1,1 e 1,3, o vento das ELU é majorado por 0,95·γz.</p>
            {desloc.length > 0 && (<>
              <h3>Deslocamentos laterais do vento</h3>
              <table>
                <thead><tr><th>Direção</th><th>Topo u (mm)</th><th>Limite H/{fmt(opc.limiteDeslocTopo, 0)} (mm)</th><th>Maior entre pavimentos (mm)</th><th>Limite hi/{fmt(opc.limiteDeslocPavimento, 0)} (mm)</th><th>Situação</th></tr></thead>
                <tbody>{desloc.map((d) => { const m = d.pavimentos.reduce((a, p) => (p.drift / p.limDrift > a.drift / a.limDrift ? p : a), d.pavimentos[0]); return <tr key={d.direcao}><td>{d.direcao}°</td><td>{fmt(d.topo * 1000, 1)}</td><td>{fmt(d.limTopo * 1000, 1)}</td><td>{m ? `${fmt(m.drift * 1000, 1)} (${nomePav(m.pavimento)})` : '—'}</td><td>{m ? fmt(m.limDrift * 1000, 1) : '—'}</td><td>{d.ok ? 'ok' : 'NÃO ATENDE'}</td></tr>; })}</tbody>
              </table>
              <p>Combinação frequente do vento com ψ1 = 0,3 (NBR 6118, Tabela 13.3): topo ≤ H/{fmt(opc.limiteDeslocTopo, 0)} e deslocamento entre pavimentos ≤ hi/{fmt(opc.limiteDeslocPavimento, 0)} (limites editáveis nas opções de cálculo). Maior razão deslocamento/limite entre os pavimentos; tabela completa na aba Análise.</p>
            </>)}
          </>)}

          {dim && (<>
            {h2('Dimensionamento das vigas', true)}
            <table>
              <thead><tr><th>Viga</th><th>b×h (cm)</th><th>M+ (kN·m)</th><th>M− (kN·m)</th><th>V (kN)</th><th>Inferior</th><th>Superior</th><th>Estribo</th><th>Td (kN·m)</th><th>δ</th><th>wk inf / sup / lim. (mm)</th><th>Flecha / lim. (mm)</th><th>Flecha Q / lim. (mm)</th><th>Laterais (torção)</th><th>aℓ (cm)</th><th>Situação</th></tr></thead>
              <tbody>{dim.vigas.map((x) => <tr key={x.viga}><td className="l">{x.nome}</td><td>{Math.round(x.b * 100)}×{Math.round(x.h * 100)}</td><td>{fmt(x.Mpos, 1)}</td><td>{fmt(x.Mneg, 1)}</td><td>{fmt(x.V, 1)}</td><td>{x.barrasInf}</td><td>{x.barrasSup}</td><td>{x.estribo}</td><td>{fmt(x.T, 1)}</td><td>{x.delta < 1 ? fmt(x.delta, 2) : '—'}</td><td className={Math.max(x.wk[0], x.wk[1]) > x.wkLim + 1e-9 ? 'bad' : undefined}>{fmt(x.wk[0], 2)} / {fmt(x.wk[1], 2)} / {fmt(x.wkLim, 2)}</td><td className={x.flecha > x.limite + 1e-9 ? 'bad' : undefined}>{fmt(x.flecha * 1000, 1)} / {fmt(x.limite * 1000, 1)}</td><td className={x.flechaQ > x.limiteQ + 1e-9 ? 'bad' : undefined}>{fmt(x.flechaQ * 1000, 1)} / {fmt(x.limiteQ * 1000, 1)}</td><td>{x.barrasLaterais}</td><td>{fmt(x.al * 100, 1)}</td><td>{ST[x.status]}</td></tr>)}</tbody>
            </table>
            <p><b>Redistribuição</b> (NBR 6118, 14.6.4.3): {opc.redistribuicao > 0 ? `${fmt(opc.redistribuicao, 0)} %` : 'desligada'}. Reduz o momento negativo das cargas verticais nos apoios internos de vigas contínuas por δ = 1 − r/100, com δ ≥ 0,75 em nós fixos, δ ≥ 0,90 em nós móveis (γz &gt; 1,1) e δ ≥ 0,44 + 1,25·x/d; só as cargas verticais; o positivo aumenta por equilíbrio, aplicado linearmente ao longo do vão. A coluna δ mostra o valor efetivo (— sem redistribuição).</p>
            <p><b>Momentos mínimos</b>: {opc.momentoMinPositivo > 0 || opc.momentoMinNegativo > 0 ? `positivo ≥ p·ℓ²/${opc.momentoMinPositivo || '—'} e negativo nos apoios ≥ p·ℓ²/${opc.momentoMinNegativo || '—'}` : 'desligados'}, com a carga equivalente p = (V1 + V2)/ℓ dos cortantes das cargas verticais nas pontas do vão, aplicados antes da redistribuição (o negativo mínimo nos apoios internos também é multiplicado por δ); critério do programa de referência (recomendados p·ℓ²/20 e p·ℓ²/32).</p>
            <p><b>Cortante junto ao pilar</b> (17.4.1.2.1): {opc.cortanteApoio ? `a partir da face do pilar${opc.cortanteDistancia ? ` mais ${fmt(opc.cortanteDistancia, 0)} % de d` : ''}` : 'maior valor em toda a parte flexível'}. Decalagem do diagrama (17.4.2.2, estribos verticais): aℓ = d·Vmáx/[2(Vmáx − Vc)], entre 0,5d e d, na coluna aℓ, para o corte das barras.</p>
            <p><b>Torção</b> (17.5): {opc.verificarTorcao ? 'verificada em todas as vigas' : 'só nas vigas com torção de equilíbrio'}; treliça espacial com θ = 45°, seção vazada com he = A/u (ou 2c1 quando A/u &lt; 2c1; a confirmar), Ae e ue pela linha média; TRd2 = 0,5·αv2·fcd·Ae·he; A90/s = Td/(2·Ae·fywd), somada ao A90/s do cortante; Asl = Td·ue/(2·Ae·fyd), repartida pelo perímetro: a parte das faces superior e inferior é somada à armadura de flexão (absorvida pelas barras adotadas quando há folga) e a das faces laterais vai em barras próprias (φ8 a φ12,5, espaçamento até 20 cm), coluna “Laterais”; biela conjunta Vsd/VRd2 + Tsd/TRd2 ≤ 1.</p>
            <p><b>Fissuração</b> (17.3.3.2): combinação frequente; wk = menor de w1 e w2 com Acr simplificado (a confirmar); armadura aumentada até atender; vale para vigas e lajes maciças (nas lajes, faixa de 1 m, bitola adotada = menor de φ6,3 a φ16 com espaçamento ≥ 10 cm, até mín(2h; 20 cm); a confirmar); limite {opc.limiteFissura > 0 ? `${fmt(opc.limiteFissura, 2)} mm (opção)` : 'pela classe de agressividade (Tabela 13.4)'}.</p>
            <p>Flecha das vigas por vão entre pilares: rigidez de Branson em cada seção com a armadura calculada, curvatura integrada ao longo do vão, flecha total = imediata da combinação quase permanente × (1 + αf) com αf = Δξ(t0) = {fmt(deltaXi(opc.t0Flecha))} (t0 = {fmt(opc.t0Flecha)} mês, ρ′ = 0, a confirmar); limite ℓ/{opc.limiteFlechaTotal} (balanço: 2ℓ/{opc.limiteFlechaTotal}); carga variável (imediata) ≤ ℓ/{opc.limiteFlechaSensorial}.</p>
            {dim.detalhes && dim.detalhes.length > 0 && (<>
              {h2('Detalhamento das vigas')}
              <p>Armadura longitudinal disposta pela envoltória das combinações ELU decalada de aℓ (NBR 6118, 17.4.2.2), com ancoragem por aderência (9.4) e emendas por traspasse (9.5.2); estribos por zonas. Quantidades e pesos por viga (um pavimento); o grupo repete a armadura nos pavimentos indicados. Desenhos nas pranchas e na janela de resultados da viga.</p>
              {dim.detalhes.map((d) => (
                <div key={d.viga} className="avoid">
                  <h3>Viga {d.nome} — {d.repeticoes} {d.repeticoes === 1 ? 'pavimento' : 'pavimentos'}</h3>
                  <table>
                    <thead><tr><th>Pos.</th><th>Tipo</th><th>Face</th><th>Quant.</th><th>φ (mm)</th><th>Trecho s (m)</th><th>C unit. (m)</th><th>C total (m)</th><th>Peso (kg)</th></tr></thead>
                    <tbody>
                      {linhasBarras(d).map((x) => <tr key={x.pos}><td className="l">{x.pos}</td><td className="l">{TIPO_BARRA[x.tipo]}</td><td className="l">{FACE_BARRA[x.face]}</td><td>{x.n}</td><td>{fmt(x.phi, x.phi % 1 ? 1 : 0)}</td><td>{fmt(x.s0)} a {fmt(x.s1)}</td><td>{fmt(x.comprimento)}</td><td>{fmt(x.total)}</td><td>{fmt(x.peso)}</td></tr>)}
                      {linhasEstribos(d).map((z) => <tr key={z.pos}><td className="l">{z.pos}</td><td className="l">Estribo</td><td className="l">c/{Math.round(z.s * 100)} cm</td><td>{z.n}</td><td>{fmt(z.phi, z.phi % 1 ? 1 : 0)}</td><td>{fmt(z.s0)} a {fmt(z.s1)}</td><td>{fmt(z.comprimento)}</td><td>{fmt(z.total)}</td><td>{fmt(z.peso)}</td></tr>)}
                      <tr><td className="l" colSpan={8}><b>Total de uma viga</b></td><td><b>{fmt(d.peso)}</b></td></tr>
                    </tbody>
                  </table>
                  <p>lb inferior = {fmt(d.lb.inf * 100, 0)} cm (boa aderência); lb superior = {fmt(d.lb.sup * 100, 0)} cm ({d.lb.supBoaAderencia ? 'boa' : 'má'} aderência). {d.emendas.length ? `Emendas por traspasse: ${d.emendas.map((e) => `${FACE_BARRA[e.face]} em s = ${fmt(e.s)} m (l0 = ${fmt(e.l0 * 100, 0)} cm)`).join('; ')}.` : 'Sem emendas por traspasse.'}{d.avisos.length ? ` Avisos: ${d.avisos.join(' ')}` : ''}</p>
                </div>
              ))}
              <h3>Resumo de aço das vigas</h3>
              <table>
                <thead><tr><th>Aço</th><th>φ (mm)</th><th>Comprimento (m)</th><th>Peso (kg)</th><th>Peso com perdas (kg)</th></tr></thead>
                <tbody>
                  {(dim.resumoAcoVigas ?? []).map((x) => <tr key={`${x.aco}-${x.phi}`}><td className="l">{x.aco}</td><td>{fmt(x.phi, x.phi % 1 ? 1 : 0)}</td><td>{fmt(x.comprimento)}</td><td>{fmt(x.peso)}</td><td>{fmt(x.pesoComPerdas)}</td></tr>)}
                  <tr><td className="l" colSpan={2}><b>Total</b></td><td><b>{fmt((dim.resumoAcoVigas ?? []).reduce((t, x) => t + x.comprimento, 0))}</b></td><td><b>{fmt((dim.resumoAcoVigas ?? []).reduce((t, x) => t + x.peso, 0))}</b></td><td><b>{fmt((dim.resumoAcoVigas ?? []).reduce((t, x) => t + x.pesoComPerdas, 0))}</b></td></tr>
                </tbody>
              </table>
              <p>Comprimentos já multiplicados pelas repetições dos grupos. Perdas de {fmt(perdasDoResumo(dim.resumoAcoVigas ?? []), 1)} % sobre o peso (opção "perdas de aço"); barra máxima de {fmt(opc.barraMaxima, 1)} m e arredondamento de {fmt(opc.arredondamento, 0)} cm (opções de cálculo).</p>
            </>)}
            {h2('Dimensionamento dos pilares')}
            <table>
              <thead><tr><th>Pilar</th><th>Lance</th><th>Seção (cm)</th><th>Nd (kN)</th><th>ℓe (b / h, m)</th><th>λ (b / h)</th><th>Armadura</th><th>Estribo</th><th>Vd (kN)</th><th>Uso</th><th>Situação</th></tr></thead>
              <tbody>{dim.pilares.map((x) => <tr key={`${x.pilar}-${x.pavimento}`}><td className="l">{x.nome}</td><td className="l">{x.pavimento}</td><td>{x.secao}</td><td>{fmt(x.Nd, 0)}</td><td>{fmt(x.le[0])} / {fmt(x.le[1])}</td><td>{fmt(x.lambda[0], 0)} / {fmt(x.lambda[1], 0)}</td><td>{x.armadura}</td><td>{x.estribo}</td><td>{x.Vd === undefined ? '—' : fmt(x.Vd, 1)}</td><td>{x.util >= 99 ? '>1' : fmt(x.util)}</td><td>{ST[x.status]}</td></tr>)}</tbody>
            </table>
            <p>Cortante nos pilares (17.4.2, modelo I): na flexo-compressão Vc = Vc0·(1 + M0/Msd,máx) ≤ 2·Vc0 (17.4.2.2 c), com M0 = N·W/A (momento de descompressão; N com γf = 1,0 tomado como Nd/γg, a confirmar) e Msd,máx o maior momento das pontas na direção do cortante; Vc = 0 com tração; dispensa do estribo mínimo quando Vsd ≤ Vc em pilar comprimido; seção circular com bw = D e d = 0,8·D. Quando o cortante manda, o estribo vem da mensagem "Estribos pelo cortante".</p>
            {h2('Lajes')}
            <table>
              <thead><tr><th>Laje</th><th>Pavimento</th><th>Tipo</th><th>As+ (cm²/m)</th><th>As− (cm²/m)</th><th>wk / lim. (mm)</th><th>Flecha / lim. (mm)</th><th>Flecha Q / lim. (mm)</th><th>Situação</th></tr></thead>
              <tbody>{dim.lajes.map((x) => <tr key={`${x.laje}-${x.pavimento}`}><td className="l">{x.nome}</td><td className="l">{x.pavimento}</td><td className="l">{x.tipo}</td><td>{fmt(x.As.pos[0])} / {fmt(x.As.pos[1])}</td><td>{fmt(x.As.neg[0])} / {fmt(x.As.neg[1])}</td><td className={x.wk > x.wkLim + 1e-9 ? 'bad' : undefined}>{fmt(x.wk, 2)} / {fmt(x.wkLim, 2)}</td><td className={x.flecha > x.limite + 1e-9 ? 'bad' : undefined}>{fmt(x.flecha * 1000, 1)} / {fmt(x.limite * 1000, 1)}</td><td className={x.flechaQ > x.limiteQ + 1e-9 ? 'bad' : undefined}>{fmt(x.flechaQ * 1000, 1)} / {fmt(x.limiteQ * 1000, 1)}</td><td>{ST[x.status]}</td></tr>)}</tbody>
            </table>
            <p>Lajes maciças: momentos por {opc.woodArmer ? 'Wood-Armer (mx* = mx + |mxy|; mx*′ = mx − |mxy|, torçor somando |γ·mxy| por caso) com média numa faixa transversal de 1 m' : 'extremos dos momentos nas barras da grelha (Wood-Armer desligado)'}. Flecha relativa aos apoios (descontado o deslocamento das vigas e pilares), {opc.fatorFlechaLaje ? `fator simplificado ${fmt(opc.fatorFlechaLaje, 1)} × elástica` : `elástica (G + ψ2·Q) × (1 + αf), αf = Δξ(t0) = ${fmt(deltaXi(opc.t0Flecha))}, sem fissuração (a confirmar)`}; limite ℓ/{opc.limiteFlechaTotal} do menor vão; carga variável ≤ ℓ/{opc.limiteFlechaSensorial}.</p>
            {[...dim.vigas, ...dim.pilares, ...dim.lajes].some((x) => x.mensagens.length) && (
              <ul>{[...dim.vigas.map((x) => [x.nome, x.mensagens] as const), ...dim.pilares.map((x) => [`${x.nome} (${x.pavimento})`, x.mensagens] as const), ...dim.lajes.map((x) => [`${x.nome} (${x.pavimento})`, x.mensagens] as const)].filter(([, m]) => m.length).map(([n, m], i) => <li key={i}><b>{n}:</b> {m.join(' ')}</li>)}</ul>
            )}

            {h2('Erros e avisos')}
            {rev.itens.length === 0 ? <p>Nenhum erro ou aviso.</p> : (<>
              <p>{rev.erros} {rev.erros === 1 ? 'erro' : 'erros'} e {rev.avisos} {rev.avisos === 1 ? 'aviso' : 'avisos'}. Erro: o elemento não atende ao cálculo; aviso: atende, mas pede atenção.</p>
              <table>
                <thead><tr><th className="l">Elemento</th><th className="l">Pavimento</th><th className="l">Nível</th><th className="l">Código</th><th className="l">Mensagem</th></tr></thead>
                <tbody>{rev.itens.map((i, k) => <tr key={k}><td className="l">{i.tipo === 'obra' ? 'Obra' : `${i.tipo === 'viga' ? 'Viga' : i.tipo === 'pilar' ? 'Pilar' : 'Laje'} ${i.nome}`}</td><td className="l">{i.pavimento ?? '—'}</td><td className="l">{i.nivel}</td><td className="l">{i.codigo}</td><td className="l">{i.mensagem}</td></tr>)}</tbody>
              </table>
            </>)}

            {bloqueadasMemo.length > 0 && (<>
              {h2('Armaduras bloqueadas')}
              <p>Armaduras editadas pelo projetista e bloqueadas: o recálculo não as redimensiona, só as verifica (vigas: área de aço, estribos, barras laterais, fissuração e flecha; pilares: verificação completa do lance, por fibras). Situação "não atende" indica armadura insuficiente; a mensagem traz o necessário.</p>
              <table>
                <thead><tr><th className="l">Elemento</th><th className="l">Lance</th><th className="l">Arranjo adotado</th><th className="l">Situação</th><th className="l">Verificação</th></tr></thead>
                <tbody>{bloqueadasMemo.map((x, k) => <tr key={k}><td className="l">{x.elemento}</td><td className="l">{x.lance}</td><td className="l">{x.arranjo}</td><td className="l">{x.status}</td><td className="l">{x.msgs}</td></tr>)}</tbody>
              </table>
            </>)}

            {h2('Cargas na fundação')}
            <table>
              <thead><tr><th>Pilar</th><th>Nk rara máx.</th><th>Nk rara mín.</th><th>N perm.</th><th>Hx</th><th>Hy</th><th>Mx</th><th>My</th><th>Combinação</th></tr></thead>
              <tbody>{dim.fundacao.map((f) => <tr key={f.id}><td className="l">{f.label}</td><td>{fmt(f.Nk, 1)}</td><td>{fmt(f.NkMin, 1)}</td><td>{fmt(f.NkPerm ?? f.Nk, 1)}</td><td>{fmt(f.Hx, 1)}</td><td>{fmt(f.Hy, 1)}</td><td>{fmt(f.Mx, 1)}</td><td>{fmt(f.My, 1)}</td><td className="l">{f.source?.replace('Edifício · ', '')}</td></tr>)}</tbody>
            </table>
            <p>Valores característicos (kN, kN·m). Nd das ELU na tabela da aba Análise.</p>

            {h2('Quantitativos')}
            <table>
              <thead><tr><th>Pavimento</th><th>Concreto (m³)</th><th>Fôrma (m²)</th><th>Aço estimado (kg)</th></tr></thead>
              <tbody>
                {dim.quantitativos.map((q) => <tr key={q.pavimento}><td className="l">{q.pavimento}</td><td>{fmt(q.concreto.lajes + q.concreto.vigas + q.concreto.pilares)}</td><td>{fmt(q.forma.lajes + q.forma.vigas + q.forma.pilares, 1)}</td><td>{fmt(q.aco, 0)}</td></tr>)}
                {totQ && <tr><td className="l"><b>Total</b></td><td><b>{fmt(totQ.c)}</b></td><td><b>{fmt(totQ.f, 1)}</b></td><td><b>{fmt(totQ.a, 0)}</b></td></tr>}
              </tbody>
            </table>
            <p>Aço estimado por taxas: lajes {TAXAS.lajes}, vigas {TAXAS.vigas} e pilares {TAXAS.pilares} kg/m³ (a confirmar).</p>
          </>)}

          {h2('Premissas', true)}
          <ul>{PREMISSAS.map((p) => <li key={p.id}><b>{p.tema}.</b> {p.texto} <i>({p.fonte}{p.aConfirmar ? '; a confirmar' : ''})</i></li>)}</ul>
          <p className="small">Resultados de ferramenta de apoio ao projeto: a responsabilidade pela concepção, verificação e detalhamento é do engenheiro responsável.</p>
        </div>
      </div>
    </div>
  );
}
