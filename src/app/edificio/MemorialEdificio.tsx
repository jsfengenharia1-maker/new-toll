// Memorial de cálculo do edifício: identificação, materiais, geometria, ações, modelo, estabilidade,
// dimensionamento, cargas na fundação, quantitativos e premissas. Mesmo CSS e impressão do memorial do pórtico.
import { MemorialPilaresParede } from './MemorialPilarParede';
import { MemorialParedes } from './MemorialParedes';
import { MemorialAlvenaria } from './AlvenariaResumo';
import { MemorialCortes } from './MemorialCortes';
import { MemorialDiagonais } from './MemorialDiagonais';
import { MemorialConsolos } from './MemorialConsolos';
import { MemorialInclinadas } from './MemorialInclinadas';
import { MemorialEscadas } from './MemorialEscadas';
import { MemorialMapas } from './MemorialMapas';
import { MemorialEscadasCalculo } from './MemorialEscadasCalculo';
import { MemorialEscadasArmadura } from './MemorialEscadasArmadura';
import { MemorialVigotasFicha } from './MemorialVigotasFicha';
import { PAINEL_TELA } from '../../core/building/telasSoldadas';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { calculoAtual, dimAtual, useBuilding } from './store';
import { useStore } from '../store';
import { APP_PRINT_CSS, MEMO_CSS, memoPrintCss, printHtmlDoc } from '../Memorial';
import { memo } from '../design/tokens';
import { valorOpcaoTxt } from './OpcoesCalculo';
import { descreverTabela, rotuloTabela, tabelasAlteradas } from '../../core/building/tabelasArmadura';
import { OPCOES_INFO, opcoesAlteradas, opcoesEmUso, padraoDe, perfilDe, vinculosAlterados } from '../../core/building/opcoes';
import { acoDe, cobrimentoFundacao, cobrimentoLaje, cobrimentoViga, fckDe, gamas } from '../../core/building/materiais';
import { Button, Check, download, Spacer } from '../ui';
import { resumoAnalise } from '../../core/building/resumo';
import { memorialFlechas } from '../../core/building/flechas';
import { deltaXi } from '../../core/design';
import { PREMISSAS, TAXAS } from '../../core/building/premissas';
import { normasNoMemorial } from '../../core/normas/memorial';
import { fichasNoMemorial } from '../../core/building/tiposLaje';
import { MemorialPlanos } from './MemorialPlanos';
import { MemorialAlveolares } from './MemorialAlveolares';
import { MemorialNervuradas } from './MemorialNervuradas';
import { MemorialAbacos } from './MemorialAbacos';

import { cotaFundacao, inicioDe, lancesDoPilar, pavimentosOrdenados, peDireito, USOS, VENTO_PADRAO, ORIGEM_ROTULO } from '../../core/building/types';
import { apoioDoPilar, excentricidadeApoio } from '../../core/building/transicao';
import { svgIsometrico, svgPlantaGrupo } from './desenhoMemorial';
import { MemorialAreasGrupos, MemorialGuia } from './MemorialGrupos';
import { MemorialGabaritos } from './MemorialGabaritos';
import { MemorialIfc } from './MemorialIfc';
import { MemorialAberturas } from './MemorialL5';
import { casosDaObra } from '../../core/building/types';
import { combinacoesEdificio } from '../../core/building/combinacoes';
import { cotaTerreno, POSICAO_LABEL, TIPO_FUNDACAO_LABEL } from '../../core/building/fundacao';
import { quantitativosFundacao } from '../../core/sheets/fundacao';
import { TABELA_K } from '../../core/building/baseElastica';
import { naturezaTexto, psiDoCaso } from './Casos';
import { MemorialAcoes } from './MemorialAcoes';
import { useRevisao } from './revisao';
import { arranjoPilarTxt, arranjoVigaTxt } from './Armadura';
import { linhasGruposVigotas } from './Vigotas';
import { resumoSecoesVigas } from '../../core/building/secaoViga';
import { resumoVigasCurvas } from '../../core/building/curvas';
import { resumoVigasComuns } from '../../core/building/vigaComum';
import { FACE_POS_LAJE, linhasPosicoesLaje, rotuloPosicaoLaje, TIPO_POS_LAJE } from './DetalhamentoLaje';
import { FACE_BARRA, linhasBarras, linhasEstribos, perdasDoResumo, somarResumosAco, TIPO_BARRA } from './Detalhamento';
import { MemorialEluPorCombinacao, MemorialListagemGeral, MemorialQuantitativosDetalhados, MemorialTaxasPilares, MemorialVentoPavimentos, MemorialVentoResumo } from './MemorialRelatorios';
import { emendasPilar, linhasBarrasPilar, linhasEstribosPilar, TRANSICAO } from './DetalhamentoPilar';

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const ST = { ok: 'ok', fail: 'NÃO ATENDE', review: 'revisar' } as const;
const METODO_CURTO = { curvatura: 'CA', curvaturaFluencia: 'CA+F', geral: 'MG' } as const;

export function MemorialEdificio({ onClose }: { onClose: () => void }) {
  const { sessao, analise, dim } = useBuilding();
  const estado = useBuilding();
  const st = useStore();
  const b = sessao.modelo;
  const docRef = useRef<HTMLDivElement>(null);
  const [today] = useState(() => new Date().toLocaleDateString('pt-BR'));
  const [iso, setIso] = useState(false);
  const [mapas, setMapas] = useState(false);
  const [eluDet, setEluDet] = useState(false);
  const [guia, setGuia] = useState(false);
  const r = useMemo(() => (analise ? resumoAnalise(b, analise) : null), [b, analise]);
  const velha = !!analise && (!calculoAtual(estado) || !dimAtual(estado));
  const perfil = perfilDe(b);
  const opc = analise?.opcoes ?? opcoesEmUso(b.opcoes, perfil);
  const vinculos = useMemo(() => vinculosAlterados(b), [b]);
  const secoesEsp = useMemo(() => resumoSecoesVigas(b), [b]);
  const vigasCurvas = useMemo(() => resumoVigasCurvas(b), [b]);
  const vigasComuns = useMemo(() => resumoVigasComuns(b), [b]);
  const tabelas = useMemo(() => tabelasAlteradas(b), [b]);
  const ps = pavimentosOrdenados(b);
  const v = b.vento ?? VENTO_PADRAO;
  const psi = b.norma.psiQ ?? [0.5, 0.4, 0.3];
  const falhas = new Set([...(dim?.vigas ?? []).filter((x) => x.status !== 'ok').map((x) => x.viga), ...(dim?.pilares ?? []).filter((x) => x.status === 'fail').map((x) => x.pilar)]);
  const bloqueadasMemo = [
    ...(dim?.vigas ?? []).filter((x) => x.bloqueada && !(x.agrupada && !b.vigas.find((v) => v.id === x.viga)?.armadura)).map((x) => ({ elemento: `Viga ${x.nome}`, lance: 'todos os vãos', arranjo: arranjoVigaTxt(x), status: x.status === 'ok' ? 'atende' : 'NÃO ATENDE', msgs: x.mensagens.filter((m) => /^(Armadura bloqueada|Flecha|Abertura)/.test(m)).join(' ') || '—' })),
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
  /** Pilares que nascem acima da fundação (E1a): apoio detectado, excentricidade e como ficou ligado no modelo. */
  const apoiados = useMemo(() => b.pilares.filter((p) => p.nasce !== 'fundacao' && lancesDoPilar(b, p).length).map((p) => {
    const ap = inicioDe(p) === 'apoiado' ? apoioDoPilar(b, p) : null, q = ap?.tipo === 'pilar' ? b.pilares.find((x) => x.id === ap.principal) : undefined;
    const e = q ? excentricidadeApoio(b, p, q) : null;
    const txt = inicioDe(p) === 'fundacao' ? 'fundação (vínculo externo)' : !ap ? 'sem apoio' : ap.tipo === 'pilar' ? `pilar ${q?.nome ?? ''}${ap.todos.length > 1 ? ` (+${ap.todos.length - 1})` : ''}` : ap.tipo === 'viga' ? `viga ${ap.vigas.map((id) => b.vigas.find((v) => v.id === id)?.nome).join(', ')} (transição)` : `laje ${b.lajes.find((l) => l.id === ap.laje)?.nome ?? ''}`;
    return { p, txt, ligado: analise?.apoiados?.[p.id]?.ligado, exc: e ? Math.hypot(e[0], e[1]) : null, tipo: ap?.tipo ?? null };
  }), [b, analise]);
  const lancesProprios = useMemo(() => b.pilares.flatMap((p) => (p.secoes ?? []).filter((e) => e.ajuste !== undefined || e.angulo !== undefined || e.dx || e.dy).map((e) => ({ p, e }))), [b]);
  const quantFund = useMemo(() => { if (!dim) return null; try { return quantitativosFundacao(b, analise ?? null, dim); } catch { return null; } }, [b, analise, dim]);

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
        <Check label="Incluir vista isométrica" checked={iso} onChange={setIso} />
        <Check label="Incluir mapas de resultados das lajes" checked={mapas} onChange={setMapas} />
        <Check label="ELU por combinação" checked={eluDet} onChange={setEluDet} />
        <Check label="Incluir guia rápido (anexo)" checked={guia} onChange={setGuia} />
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
            {b.obra.descricao?.length ? <><dt>Descrição</dt><dd>{b.obra.descricao.join(' · ')}</dd></> : null}
            <dt>Local</dt><dd>{b.obra.cidade || '—'}</dd>
            <dt>Origem do lançamento</dt><dd>{ORIGEM_ROTULO[b.obra.origem ?? 'vazio']}</dd>
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
              <tr><td className="l">Pilares</td><td>{fckDe(b, 'pilar')}{b.pilares.some((x) => x.fck?.length) ? ` (fck próprio por lance: ${b.pilares.filter((x) => x.fck?.length).map((x) => `${x.nome} ${x.fck!.map((f) => `${b.pavimentos.find((q) => q.id === f.pavimento)?.nome ?? f.pavimento} ${f.fck}`).join(', ')}`).join('; ')})` : ''}{b.norma.fckPilarPav?.length ? ` (lances: ${b.norma.fckPilarPav.map((x) => `${b.pavimentos.find((p) => p.id === x.pavimento)?.nome ?? x.pavimento} ${x.fck}`).join('; ')})` : ''}</td><td className="l">longitudinal {acoDe(b, 'pilarLong').aco}; estribos {acoDe(b, 'pilarEstribo').aco}</td><td className="l">{fmt(b.norma.cobrimento.pilar, 1)}</td></tr>
              {!!b.fundacao?.elementos.length && <tr><td className="l">Fundações</td><td>{fckDe(b, 'fundacao')}</td><td className="l">{acoDe(b, 'fundacao').aco}</td><td className="l">{fmt(cobrimentoFundacao(b) * 100, 1)}</td></tr>}
            </tbody>
          </table>
          <p>γc = {fmt(gamas(b).c)}; γs = {fmt(gamas(b).s)}; γg = {fmt(gamas(b).g)} (favorável 1,0); γq = {fmt(gamas(b).q)}. Elementos com cobrimento próprio: {[...b.pilares, ...b.vigas, ...b.lajes].filter((x) => x.cobrimento).map((x) => `${x.nome} ${fmt(x.cobrimento!, 1)} cm`).join('; ') || 'nenhum'}. Comprimento de flambagem dos pilares: ℓe = mín(ℓ0 + h; ℓ) × α (NBR 6118, 15.6){[...b.pavimentos.filter((p) => p.alfaFlambagem).map((p) => `${p.nome}: α ${fmt(p.alfaFlambagem!)}`), ...b.pilares.flatMap((p) => (p.flambagem ?? []).map((f) => `${p.nome} até ${b.pavimentos.find((x) => x.id === f.pavimento)?.nome ?? f.pavimento}: α ${fmt(f.au ?? 1)} (b) / ${fmt(f.av ?? 1)} (h)`))].map((t, i) => (i ? '; ' : ' — ') + t).join('')}.</p>

          {h2('Geometria')}
          <table>
            <thead><tr><th>Pavimento</th><th>Cota (m)</th><th>Pé-direito (m)</th><th>Grupo</th></tr></thead>
            <tbody>{[...ps].reverse().map((p) => <tr key={p.id}><td className="l">{p.nome}</td><td>{fmt(p.cota)}</td><td>{fmt(peDireito(b, p.id))}</td><td className="l">{b.grupos.find((g) => g.id === p.grupo)?.nome ?? '—'}</td></tr>)}</tbody>
          </table>
          <p>Fundação na cota {fmt(cotaFundacao(b))} m. {b.pilares.length} pilares{b.pilaresParede?.length ? `, ${b.pilaresParede.length} pilar(es)-parede` : ''}, {b.vigas.length} vigas e {b.lajes.length} lajes lançadas.</p>
          <MemorialAreasGrupos b={b} />
          <MemorialAberturas b={b} />
          <MemorialGabaritos b={b} />
          <MemorialIfc b={b} />
          {apoiados.length > 0 && <>
            <h3>Pilares que nascem acima da fundação (apoiados)</h3>
            <table>
              <thead><tr><th className="l">Pilar</th><th className="l">Nasce em</th><th className="l">Apoio</th><th>Excentricidade (cm)</th><th className="l">Pé no modelo</th><th>Engaste da base</th></tr></thead>
              <tbody>{apoiados.map(({ p, txt, ligado, exc, tipo }) => <tr key={p.id}>
                <td className="l">{p.nome}</td><td className="l">{nomePav(p.nasce)}</td><td className="l">{txt}</td><td>{exc === null ? '—' : fmt(exc * 100, 1)}</td>
                <td className="l">{tipo === null ? 'apoio fixo' : ligado ? 'ligado ao apoio' : 'apoio fixo provisório'}</td>
                <td>{tipo === 'viga' || tipo === 'laje' ? fmt(opc.engasteTransicao) : tipo === 'pilar' ? '1,00 (contínuo)' : '—'}</td>
              </tr>)}</tbody>
            </table>
            <p>O apoio é detectado no pavimento em que o pilar nasce (pilar que morre ali com seção sobreposta; senão viga; senão laje). Sobre pilar, o pé é o nó do topo do pilar de baixo e a parte fora da projeção liga-se por trecho rígido horizontal (momento N·e); sobre viga, o pé é nó da viga e não a apoia; sobre laje, só no modelo integrado. A viga de transição é verificada para o cortante junto às faces do pilar (resultados das vigas).</p>
          </>}
          {lancesProprios.length > 0 && <p>Lances com geometria própria: {lancesProprios.map(({ p, e }) => `${p.nome} em ${nomePav(e.pavimento)}${e.ajuste ? ` (ponto fixo ${e.ajuste})` : ''}${e.angulo !== undefined ? ` (${fmt(e.angulo, 0)}°)` : ''}${e.dx || e.dy ? ` (deslocamento ${fmt((e.dx ?? 0) * 100, 1)}; ${fmt((e.dy ?? 0) * 100, 1)} cm)` : ''}`).join('; ')}. A parte do lance fora da projeção do lance de baixo liga-se a ele por trecho rígido horizontal.</p>}
          <MemorialPilaresParede b={b} dim={dim} h2={h2} />
          <MemorialParedes b={b} dim={dim} h2={h2} />
          <MemorialAlvenaria b={b} dim={dim} h2={h2} />
          {b.grupos.map((g) => { const svg = svgPlantaGrupo(b, g.id, falhas); return svg ? <figure key={g.id}><div dangerouslySetInnerHTML={{ __html: svg }} /><figcaption>Planta de fôrma esquemática — {g.nome}{falhas.size ? ' (em vermelho: elementos que não atendem)' : ''}</figcaption></figure> : null; })}

          {(() => { const fig = iso ? svgIsometrico(b, { fundacoes: dim?.fundacoes, vigasFundacao: dim?.vigasFundacao }) : ''; return fig ? <figure data-isometrico><div dangerouslySetInnerHTML={{ __html: fig }} /><figcaption>Vista isométrica do edifício, gerada da geometria lançada (pilares, vigas, lajes{dim?.fundacoes?.length ? ' e fundações' : ''}); cores por tipo de elemento.</figcaption></figure> : null; })()}

          {mapas && <MemorialMapas b={b} analise={analise ?? null} dim={dim} h2={h2} />}

          <MemorialEscadas b={b} h2={h2} />
          <MemorialEscadasCalculo b={b} h2={h2} />
          <MemorialEscadasArmadura b={b} dim={dim} h2={h2} />
          <MemorialCortes b={b} dim={dim} h2={h2} />
          <MemorialDiagonais b={b} dim={dim} h2={h2} />
          <MemorialConsolos b={b} dim={dim} h2={h2} />
          <MemorialInclinadas b={b} dim={dim} h2={h2} />
          <MemorialNervuradas b={b} dim={dim} h2={h2} />
          <MemorialAbacos b={b} dim={dim} h2={h2} />
          <MemorialAlveolares b={b} dim={dim} h2={h2} />
          <MemorialPlanos b={b} an={analise} h2={h2} />
          <MemorialListagemGeral b={b} h2={h2} />
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
              <thead><tr><th className="l">Pilar</th><th className="l">Lance</th><th className="l">Caso</th><th className="l">Tipo / eixos</th><th>Altura (m)</th><th>N</th><th>Hx</th><th>Hy</th><th>Mx (kN·m)</th><th>My (kN·m)</th><th>T (kN·m)</th></tr></thead>
              <tbody>{cps.map((c) => <tr key={c.id}><td className="l">{b.pilares.find((p) => p.id === c.pilar)?.nome ?? c.pilar}</td><td className="l">{b.pavimentos.find((p) => p.id === c.pavimento)?.nome ?? c.pavimento}</td><td className="l">{nomeCaso(c.caso)}</td><td className="l">{c.tipo === 'uniforme' ? 'uniforme' : c.tipo === 'faixa' ? 'faixa' : 'concentrada'} / {c.eixos === 'local' ? 'locais' : 'globais'}</td><td>{c.tipo === 'uniforme' ? 'lance' : c.tipo === 'faixa' ? `${fmt(c.altura ?? 0)} a ${fmt(c.ate ?? 0)}` : c.altura === undefined ? 'topo' : fmt(c.altura)}</td><td>{fmt(c.N, 1)}</td><td>{fmt(c.Hx, 1)}</td><td>{fmt(c.Hy, 1)}</td><td>{fmt(c.Mx, 1)}</td><td>{fmt(c.My, 1)}</td><td>{fmt(c.T ?? 0, 1)}</td></tr>)}</tbody>
            </table>
            <p>N &gt; 0 = compressão; concentradas em kN, uniformes e em faixa em kN/m (faixa como 20 resultantes concentradas); eixos locais com x ao longo de b.</p>
          </>)}
          {analise && !analise.erro && (
            <p>Combinações geradas: {combs.length} ({porTipo('ELU')} ELU, {porTipo('RARA')} raras, {porTipo('FREQ')} frequentes, {porTipo('QP')} quase permanentes).{excepcionais.length ? ` Excepcionais: ${excepcionais.map((c) => c.nome.replace('ELU excepcional ', '')).join('; ')}.` : ''} A lista completa, com os fatores por caso, pode ser exportada em CSV na aba Análise.</p>
          )}
          <p>Vento: {v.ativo ? `V0 = ${fmt(v.v0, 0)} m/s, S1 = ${fmt(v.s1)}, S3 = ${fmt(v.s3)}, categoria ${v.categoria}, Ca = ${fmt(v.caX)} (X) / ${fmt(v.caY)} (Y), excentricidade ${fmt(v.excentricidade, 3)} × largura${ventoExtra}${r?.vento ? `, classe ${r.vento.classe} (altura ${fmt(r.vento.altura, 1)} m)` : ''}.` : 'não considerado.'}</p>

          <MemorialAcoes b={b} analise={analise} dim={dim} />

          {h2('Modelo de análise')}
          {opc.modeloGlobal ? (
            <p>Análise linear, <b>modelo integrado</b>: a grelha de lajes e vigas de cada pavimento (malha {fmt(opc.malha)} m) entra no pórtico espacial como superelemento — condensação estática exata (complemento de Schur) dos graus de liberdade fora do plano (uz, rx, ry) para os nós dos pilares — e pilares, vigas e lajes são resolvidos juntos; os deslocamentos internos voltam por retrossubstituição, e os esforços das vigas e das lajes incluem as ações horizontais. Nós da grelha dentro da seção de um pilar ficam ligados ao nó do pilar por trecho rígido (corpo rígido até o eixo); as vigas que saem do pilar têm trecho rígido até a face menos {fmt(opc.trechoRigido)}h. No plano, diafragma rígido por zona (lajes e vigas do diafragma ligam os nós).{opc.cortanteBarrasLaje ? ' Barras de laje com deformação por cortante (Timoshenko, área de cisalhamento 5/6·b·h; nas treliçadas, a alma das nervuras e a capa).' : ''} γz e deslocamentos com rigidez reduzida também nas lajes: 0,3·Eci·Ic (NBR 6118, 15.7.3), além de 0,4 nas vigas e 0,8 nos pilares. Validação: superelemento igual ao modelo cheio (erro relativo &lt; 1e-9) e modelo cheio igual ao do OpenSees na mesma discretização (2e-11). A casca espessa de 6 nós (membrana LST e placa de Mindlin com cortante por interpolação mista) e a malha triangular (Delaunay restrita, alvo {fmt(opc.malhaCasca)} m [a confirmar]) entram nas paredes e pilares-parede com a frente E1. Pilares engastados na fundação salvo vínculo externo próprio (rótula ou molas, listados abaixo); nó de cada pavimento no centro da seção do lance de baixo e trecho rígido horizontal até o centro do lance de cima quando a seção muda (N·e transmitido){opc.pilarComprimento ? '; parte flexível dos pilares até a face inferior da viga mais alta (trecho rígido vertical no topo)' : ''}.</p>
          ) : (
          <p>Análise linear, <b>modelo separado</b> (opção): grelha de lajes e vigas por pavimento (malha {fmt(opc.malha)} m) e pórtico espacial com diafragma rígido por pavimento (zonas do pavimento ligadas por vigas são diafragmas independentes, cada uma com seu mestre; pilar isolado, sem diafragma; vigas fora do diafragma não o integram); as forças das lajes nas vigas entram no pórtico como cargas concentradas.{opc.cortanteBarrasLaje ? ' Barras de laje com deformação por cortante (Timoshenko).' : ''} Pilares engastados na fundação salvo vínculo externo próprio (rótula ou molas, listados abaixo); nó de cada pavimento no centro da seção do lance de baixo e trecho rígido horizontal até o centro do lance de cima quando a seção muda (N·e transmitido){opc.pilarComprimento ? '; parte flexível dos pilares até a face inferior da viga mais alta (trecho rígido vertical no topo)' : ''}.</p>
          )}
          <p>{opc.zonasIndependentes ? '' : ' Zonas independentes desligadas: um diafragma por pavimento.'}{zonasTxt}{r && !r.erro ? ` ${r.gdl} graus de liberdade; ${r.combinacoes} combinações. Equilíbrio (reações − cargas): G ${fmt(r.equilibrio.G, 3)} kN, Q ${fmt(r.equilibrio.Q, 3)} kN.` : ''}</p>
          <h3>Opções de cálculo</h3>
          <p>Perfil dos padrões: <b>{perfil === 'nbr' ? 'padrão NBR 6118' : 'padrão do sistema (critério de mercado; NBR 6118 onde ele não fixa valor)'}</b>. As colunas mostram o padrão dos dois perfis; os valores que diferem estão destacados.</p>
          <table>
            <thead><tr><th className="l">Opção</th><th>Em uso</th><th>Padrão do sistema</th><th>Padrão NBR 6118</th><th className="l">Fonte</th></tr></thead>
            <tbody>{OPCOES_INFO.map((o) => { const sim = (v: number) => valorOpcaoTxt(o, v, fmt), nbr = padraoDe(o, 'nbr'), alt = opc[o.chave] !== padraoDe(o, perfil), dif = nbr !== o.padrao; return <tr key={o.chave}><td className="l">{o.rotulo}{o.unidade ? ` (${o.unidade})` : ''}</td><td className={alt ? 'warn' : undefined}>{sim(opc[o.chave])}</td><td className={dif ? 'warn' : undefined}>{sim(o.padrao)}</td><td className={dif ? 'warn' : undefined}>{sim(nbr)}</td><td className="l">{o.fonte}{o.aConfirmar ? '; a confirmar' : ''}{dif && o.fonteNBR ? `. NBR: ${o.fonteNBR}` : ''}</td></tr>; })}</tbody>
          </table>
          {vinculos.length > 0 && <><h3>Vínculos e engastes alterados por elemento</h3><ul>{vinculos.map((t, i) => <li key={i}>{t}</li>)}</ul></>}
          {secoesEsp.length > 0 && (
            <div data-memorial-secoes-viga>
              <h3>Seções especiais das vigas</h3>
              <table>
                <thead><tr><th>Viga</th><th>Alma (cm)</th><th>Seção</th><th>bf (cm)</th><th>hf (cm)</th><th>a (m)</th><th>Situação</th></tr></thead>
                <tbody>
                  {secoesEsp.map((x) => (
                    <tr key={x.viga}>
                      <td className="l">{x.nome}</td><td>{fmt(x.b, 0)} × {fmt(x.h, 0)}</td><td>{x.tipo === 'ret' ? 'retangular' : x.tipo}</td>
                      <td>{x.bf === undefined ? '—' : fmt(x.bf * 100, 1)}</td><td>{x.hf === undefined ? '—' : fmt(x.hf * 100, 1)}</td><td>{x.a === undefined ? '—' : fmt(x.a, 2)}</td>
                      <td className="l">{[x.tipo !== 'ret' && (x.automatica ? 'mesa colaborante (NBR 6118, 14.6.2.2)' : 'mesa informada'), x.chata && 'chata', !x.estrutural && 'não estrutural (fora do cálculo)', x.amarracao && 'amarração (sem flexão vertical)'].filter(Boolean).join('; ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>Largura colaborante: bf = bw + b1 + b3, com b1 ≤ 0,1·a e b1 ≤ 0,5·b2 (a: distância entre pontos de momento nulo pelo número de vãos; b2: distância livre à viga vizinha). A mesa entra na rigidez da análise; a flexão é dimensionada {opc.mesaDimensionamento ? 'na seção T onde a mesa está comprimida' : 'só com a alma'} (a confirmar).</p>
            </div>
          )}
          {vigasCurvas.length > 0 && (
            <div data-memorial-vigas-curvas>
              <h3>Vigas curvas</h3>
              <table>
                <thead><tr><th>Viga</th><th>Raio (m)</th><th>Ângulo (°)</th><th>Cordas</th><th>Corda máx. (cm)</th><th>Comprimento desenvolvido (m)</th></tr></thead>
                <tbody>
                  {vigasCurvas.map((x) => (
                    <tr key={x.viga}>
                      <td className="l">{x.nome}</td><td>{x.raios.map((r) => fmt(r, 2)).join('; ')}</td><td>{x.angulos.map((a) => fmt(a, 1)).join('; ')}</td>
                      <td>{x.cordas}</td><td>{fmt(x.cordaMax * 100, 0)}</td><td>{fmt(x.comprimentoDesenvolvido, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>Cada trecho curvo (arco por três pontos) é analisado como poligonal de cordas de até {fmt(opc.curvaSegmento, 0)} cm, as das pontas com 25 % do tamanho das do meio; a torção da curvatura é de equilíbrio e a viga curva mantém a rigidez à torção da seção bruta{opc.curvaTorcaoEquilibrio ? '' : ' (opção desligada: vale o redutor das vigas retas)'}. A verificação à torção é feita sempre. A força radial da armadura longitudinal (As·fyd/R) deve ser equilibrada pelos estribos (a confirmar). A elevação da prancha é desenvolvida ao longo do eixo (a confirmar a representação).</p>
            </div>
          )}
          {vigasComuns.length > 0 && (
            <div data-memorial-vigas-comuns>
              <h3>Vigas comuns a dois grupos</h3>
              <table>
                <thead><tr><th>Viga de origem</th><th>Grupo de origem</th><th>Viga associada</th><th>Grupo associado</th><th>Comprimento (m)</th><th>Pavimento associado → pavimento que recebe a carga</th></tr></thead>
                <tbody>
                  {vigasComuns.map((x) => (
                    <tr key={x.origem}>
                      <td className="l">{x.nomeOrigem}</td><td className="l">{x.grupoOrigem}</td><td className="l">{x.nomeAssociada}</td><td className="l">{x.grupoAssociado}</td><td>{fmt(x.comprimento, 2)}</td>
                      <td className="l">{x.pavimentos.map((q) => `${q.associado} → ${q.origem}`).join('; ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>A viga comum é uma barra só no pórtico (a do grupo de origem), que recebe as lajes dos dois grupos: a viga associada apoia a laje do seu grupo e as reações são levadas à viga de origem, no pavimento do grupo de origem de menor cota igual ou acima do associado (senão o mais alto abaixo; a confirmar). Armadura, envoltórias e dimensionamento só na origem.</p>
            </div>
          )}
          {opcoesAlteradas(b.opcoes, perfil).length > 0 && <p className="warn">Opções diferentes do padrão do perfil: {opcoesAlteradas(b.opcoes, perfil).map((o) => o.rotulo.toLowerCase()).join('; ')}.</p>}
          {r?.erro && <p className="warn">{r.erro}</p>}
          {r && r.avisos.length > 0 && <ul>{r.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>}

          {r?.vento && (<>
            {h2('Estabilidade global')}
            <table>
              <thead><tr><th>Direção</th><th>γz</th><th>Vento nas ELU ×</th></tr></thead>
              <tbody>{r.vento.gamaZ.map((g) => <tr key={g.direcao}><td>{g.direcao}°</td><td>{fmt(g.gamaZ, 3)}</td><td>{fmt(g.ampliacaoVento, 3)}</td></tr>)}</tbody>
            </table>
            {analise?.segundaOrdem
              ? <p data-memorial-2ordem="pDelta">γz com rigidez reduzida (vigas 0,4·Eci·Ic; pilares 0,8·Eci·Ic), só informado: os efeitos globais de 2ª ordem vêm do <b>processo P-Δ</b> (opção de cálculo). Cada combinação ELU é resolvida no pórtico espacial com a mesma rigidez reduzida{opc.modeloGlobal === 1 ? ' (lajes 0,3·Eci·Ic)' : ''} somando a matriz geométrica dos pilares (parcela P-Δ de corpo rígido, N/L), com as normais atualizadas a cada iteração até a convergência dos deslocamentos (tolerância 10⁻⁵); as forças fictícias −K_G·u finais entram no modelo de cálculo como um caso por combinação, sem a ampliação 0,95·γz. {analise.segundaOrdem.combinacoes.length} combinações; maior amplificação dos deslocamentos horizontais {fmt(analise.segundaOrdem.amplificacaoMax, 3)}; até {analise.segundaOrdem.iteracoesMax} iterações{analise.segundaOrdem.combinacoes.some((c) => c.erro) ? `; sem convergência (instabilidade) em: ${analise.segundaOrdem.combinacoes.filter((c) => c.erro).map((c) => c.nome).join('; ')}` : '; todas convergiram'}. Validação: igual ao P-Δ do Pórtico 2D num pórtico plano e ao OpenSees (transformação P-Delta) num pórtico espacial com diafragma.</p>
              : <p data-memorial-2ordem="gamaZ">γz com rigidez reduzida (vigas 0,4·Eci·Ic; pilares 0,8·Eci·Ic). Entre 1,1 e 1,3, o vento das ELU é majorado por 0,95·γz. O processo P-Δ é opção de cálculo (alternativa ao γz).</p>}
            <MemorialVentoResumo b={b} analise={analise ?? null} />
            <MemorialVentoPavimentos b={b} analise={analise ?? null} />
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
              <thead><tr><th>Viga</th><th>b×h (cm)</th><th>M+ (kN·m)</th><th>M− (kN·m)</th><th>V (kN)</th><th>Inferior</th><th>Superior</th><th>Estribo</th><th>Td (kN·m)</th><th>δ</th><th>wk inf / sup / lim. (mm)</th><th>Flecha / lim. (mm)</th><th>Flecha Q / lim. (mm)</th><th>Ativa / lim. (mm)</th><th>Laterais (torção)</th><th>aℓ (cm)</th><th>Situação</th></tr></thead>
              <tbody>{dim.vigas.map((x) => <tr key={x.viga}><td className="l">{x.nome}</td><td>{Math.round(x.b * 100)}×{Math.round(x.h * 100)}</td><td>{fmt(x.Mpos, 1)}</td><td>{fmt(x.Mneg, 1)}</td><td>{fmt(x.V, 1)}</td><td>{x.barrasInf}</td><td>{x.barrasSup}</td><td>{x.estribo}</td><td>{fmt(x.T, 1)}</td><td>{x.delta < 1 ? fmt(x.delta, 2) : '—'}</td><td className={Math.max(x.wk[0], x.wk[1]) > x.wkLim + 1e-9 ? 'bad' : undefined}>{fmt(x.wk[0], 2)} / {fmt(x.wk[1], 2)} / {fmt(x.wkLim, 2)}</td><td className={x.flecha > x.limite + 1e-9 ? 'bad' : undefined}>{fmt(x.flecha * 1000, 1)} / {fmt(x.limite * 1000, 1)}</td><td className={x.flechaQ > x.limiteQ + 1e-9 ? 'bad' : undefined}>{fmt(x.flechaQ * 1000, 1)} / {fmt(x.limiteQ * 1000, 1)}</td><td className={x.flechas && x.flechas.ativa > x.flechas.limites.ativa + 1e-9 ? 'bad' : undefined}>{x.flechas ? `${fmt(x.flechas.ativa * 1000, 1)} / ${fmt(x.flechas.limites.ativa * 1000, 1)}` : '—'}</td><td>{x.barrasLaterais}</td><td>{fmt(x.al * 100, 1)}</td><td>{ST[x.status]}</td></tr>)}</tbody>
            </table>
            {dim.vigas.some((x) => x.transicoes?.length) && (<>
              <h3>Vigas de transição (pilares que nascem sobre vigas)</h3>
              <table data-memorial-transicoes>
                <thead><tr><th className="l">Viga</th><th className="l">Pilar</th><th>s (m)</th><th>Nd (kN)</th><th className="l">Combinação</th><th>Vd nas faces (kN)</th><th>VRd3 / VRd2 (kN)</th><th className="l">Situação</th></tr></thead>
                <tbody>{dim.vigas.flatMap((x) => (x.transicoes ?? []).map((t) => <tr key={`${x.viga}${t.pilar}`}><td className="l">{x.nome}</td><td className="l">{t.nome}</td><td>{fmt(t.s)}</td><td>{fmt(t.Nd, 1)}</td><td className="l">{t.combinacao}</td><td>{fmt(t.Vfaces[0], 1)} / {fmt(t.Vfaces[1], 1)}</td><td>{fmt(t.VRd3, 1)} / {fmt(t.VRd2, 1)}</td><td className="l">{ST[t.status === 'ok' ? 'ok' : 'fail']}</td></tr>))}</tbody>
              </table>
              <p>A carga do pilar apoiado entra na viga como concentrada no nó do pé (o pé não apoia a viga); os estribos atendem o maior cortante da cadeia, inclusive o junto às faces do pilar (NBR 6118, 17.4.2.2). Armadura de suspensão não se aplica (a carga entra por cima da viga); a carga a menos de 2d do apoio é tratada em “Apoios e avisos de modelagem”.</p>
            </>)}
            <p><b>Redistribuição</b> (NBR 6118, 14.6.4.3): {opc.redistribuicao > 0 ? `${fmt(opc.redistribuicao, 0)} %` : 'desligada'}. Reduz o momento negativo das cargas verticais nos apoios internos de vigas contínuas por δ = 1 − r/100, com δ ≥ 0,75 em nós fixos, δ ≥ 0,90 em nós móveis (γz &gt; 1,1) e δ ≥ 0,44 + 1,25·x/d; só as cargas verticais; o positivo aumenta por equilíbrio, aplicado linearmente ao longo do vão. A coluna δ mostra o valor efetivo (— sem redistribuição).</p>
            <p><b>Momentos mínimos</b>: {opc.momentoMinPositivo > 0 || opc.momentoMinNegativo > 0 ? `positivo ${opc.momentoMinPositivo > 0 ? `≥ p·ℓ²/${opc.momentoMinPositivo}` : 'desligado'} e negativo nos apoios ${opc.momentoMinNegativo > 0 ? `≥ p·ℓ²/${opc.momentoMinNegativo}` : 'desligado'}` : 'desligados'}, com a carga equivalente p = (V1 + V2)/ℓ dos cortantes das cargas verticais nas pontas do vão, aplicados antes da redistribuição (o negativo mínimo nos apoios internos também é multiplicado por δ); critério do programa de referência (recomendados p·ℓ²/20 e p·ℓ²/32).</p>
            <div data-memorial-apoios>
              <p><b>Apoios e avisos de modelagem</b> (N2e). Arredondamento do diagrama nos apoios internos: {opc.arredondamentoApoio === 1 ? 'parábola cúbica M(x) = a·x³ + b·x² + c·x + d entre as faces do apoio, com M e V das duas faces (Q = 3a·x² + 2b·x + c); a redistribuição atua sobre o diagrama arredondado (a confirmar)' : opc.arredondamentoApoio === 2 ? 'redução do momento negativo do apoio de ΔM = R·t/8 (NBR 6118, 14.6.3, Figura 14.7), R a reação e t a largura do apoio' : 'desligado (diagrama do modelo, com o trecho rígido face − 0,3h)'}{opc.arredondamentoApoio > 0 && opc.momentoFaceMin > 0 ? `; módulo mínimo de ${fmt(opc.momentoFaceMin, 0)} % do momento do eixo (a confirmar)` : ''}. {opc.arredondamentoApoio > 0 ? 'O dimensionamento não fica abaixo do momento nas faces. ' : ''}Viga apoiada em viga: {opc.vigaApoiadaRigida ? 'trecho rígido até a face da viga de apoio (a confirmar)' : 'sem trecho rígido'}. Barras curtas: {opc.barraCurtaLimite > 0 ? `até ${fmt(opc.barraCurtaLimite, 1)} m, rigidez × ${fmt(opc.barraCurtaFator, 1)} (a confirmar)` : 'sem multiplicador'}. Envoltória de cortante {opc.envoltoriaCortante ? 'descontínua (patamares por ¼ do vão, a confirmar)' : 'contínua'}. Taxas mínimas: vigas {opc.vigaTaxaMin > 0 ? `${fmt(opc.vigaTaxaMin, 2)} %` : 'da norma'}, lajes maciças {opc.lajeTaxaMin > 0 ? `${fmt(opc.lajeTaxaMin, 2)} %` : 'da norma'}; estribos com s {opc.vigaEstriboSmax > 0 ? `≤ ${fmt(opc.vigaEstriboSmax, 0)} cm` : 'máximo da norma'} e {opc.vigaEstriboSmin > 0 ? `≥ ${fmt(opc.vigaEstriboSmin, 0)} cm` : 'mínimo da tabela'}.</p>
              <p>Carga concentrada a menos de 2d do apoio: {opc.cargaProximaApoio ? 'cortante da carga multiplicado por a/2d (NBR 6118, 17.4.1.2.1), com a parcela da carga que vai ao apoio ≈ F·(ℓ − a)/ℓ (a confirmar); a ≤ d: biela-tirante, verificação e armadura horizontal manuais (aviso CARGA_PROXIMA_APOIO)' : 'sem redução'}. Estribos onde há armadura longitudinal comprimida: {opc.vigaEstriboComprimida ? 's ≤ mín(20 cm; b; 12φ) e φt ≥ φℓ/4 (NBR 6118, 18.2.4; a confirmar)' : 'sem limite adicional'}. Critério de elemento linear: {opc.criterioLinear ? 'vão > h/3 e > 4b (referência)' : 'ℓ ≥ 3h (NBR 6118, 14.4.1)'}; avisos: viga-parede (ℓ/h &lt; 2 biapoiada ou &lt; 3 contínua, 22.4.1), elemento não linear, viga-placa (largura &gt; 2 × o vão), consolo curto (balanço ≤ d) e pilar curto, listados na revisão.</p>
              {dim.vigas.some((x) => x.suspensoes?.length) && (<>
                <table data-memorial-suspensao>
                  <thead><tr><th className="l">Viga de apoio</th><th className="l">Viga apoiada</th><th>s (m)</th><th>Rd (kN)</th><th>As (cm²)</th><th>Estribos adicionais</th><th>Largura (cm)</th></tr></thead>
                  <tbody>{dim.vigas.flatMap((x) => (x.suspensoes ?? []).map((q) => <tr key={`${x.viga}${q.viga}`}><td className="l">{x.nome}</td><td className="l">{q.nome}</td><td>{fmt(q.s)}</td><td>{fmt(q.Rd, 1)}</td><td>{fmt(q.As * 1e4, 2)}</td><td>{q.n} φ{String(q.phi).replace('.', ',')}</td><td>{Math.round(q.largura * 100)}</td></tr>)) }</tbody>
                </table>
                <p>Armadura de suspensão (NBR 6118, 18.3.6): As = {fmt(opc.vigaSuspensaoFator, 2)} · Rd/fywd com a reação de cálculo da viga apoiada, em estribos adicionais da viga de apoio distribuídos na largura bw da apoiada + h/2 de cada lado (a confirmar a largura e a redução por h1/h2). Vigas contínuas por cima da de apoio não entram.</p>
              </>)}
            </div>
            <p><b>Cortante junto ao pilar</b> (17.4.1.2.1): {opc.cortanteApoio ? `a partir da face do pilar${opc.cortanteDistancia ? ` mais ${fmt(opc.cortanteDistancia, 0)} % de d` : ''}` : 'maior valor em toda a parte flexível'}. Decalagem do diagrama (17.4.2.2, estribos verticais): aℓ = d·Vmáx/[2(Vmáx − Vc)], entre 0,5d e d, na coluna aℓ, para o corte das barras.</p>
            <p><b>Torção</b> (17.5): {opc.verificarTorcao ? 'verificada em todas as vigas' : 'só nas vigas com torção de equilíbrio'}; treliça espacial com θ = 45°, seção vazada com he = A/u (ou 2c1 quando A/u &lt; 2c1; a confirmar), Ae e ue pela linha média; TRd2 = 0,5·αv2·fcd·Ae·he; A90/s = Td/(2·Ae·fywd), somada ao A90/s do cortante; Asl = Td·ue/(2·Ae·fyd), repartida pelo perímetro: a parte das faces superior e inferior é somada à armadura de flexão (absorvida pelas barras adotadas quando há folga) e a das faces laterais vai em barras próprias (φ8 a φ12,5, espaçamento até 20 cm), coluna “Laterais”; biela conjunta Vsd/VRd2 + Tsd/TRd2 ≤ 1.</p>
            <p><b>Fissuração</b> (17.3.3.2): combinação frequente; wk = menor de w1 e w2 com Acr simplificado (a confirmar); armadura aumentada até atender; vale para vigas e lajes maciças (nas lajes, faixa de 1 m, bitola adotada = menor de φ6,3 a φ16 com espaçamento ≥ 10 cm, até mín(2h; 20 cm); a confirmar); limite {opc.limiteFissura > 0 ? `${fmt(opc.limiteFissura, 2)} mm (opção)` : 'pela classe de agressividade (Tabela 13.4)'}.</p>
            <p>Flecha das vigas por vão entre pilares: rigidez de Branson em cada seção ({opc.inerciaHomogeneizada ? 'estádio I homogeneizado, αe = Es/Ecs' : 'seção bruta'}) com a armadura calculada, curvatura integrada ao longo do vão{opc.flechaRotacaoBalanco ? ', giro do apoio somado nos balanços' : ''}; {opc.flechaEtapas ? 'flecha diferida por etapas de carga (ver tabela de etapas)' : `flecha total = imediata × (1 + αf), αf = Δξ(t0) = ${fmt(deltaXi(opc.t0Flecha))}`}, ρ′ {opc.flechaRhoLinha ? 'das barras de montagem' : '= 0'} (a confirmar); limite ℓ/{opc.limiteFlechaTotal} (balanço: 2ℓ/{opc.limiteFlechaTotal}); carga variável (imediata) ≤ ℓ/{opc.limiteFlechaSensorial}.</p>
            <div data-memorial-flechas>
              <p><b>Etapas de carga e limites de flecha</b> (N2f; NBR 6118, 17.3.2.1.2 e Tabela 13.3).</p>
              {memorialFlechas(b, opc).map((m) => (
                <table key={m.tipo}>
                  <caption>{m.rotulo}{m.proprias ? ' (etapas próprias)' : ''} — paredes aos {m.tParedes} dias; limites: total {m.limites.total}, ativa {m.limites.ativa}, variável {m.limites.variavel}, instantânea {m.limites.instantanea}</caption>
                  <thead><tr><th>Etapa</th><th>Idade (dias)</th><th>pp</th><th>Alvenaria</th><th>Revestimento</th><th>ψ2·Q</th><th>ξ(t)</th><th>Δξ</th><th>Δξ após as paredes</th></tr></thead>
                  <tbody>{m.etapas.map((e) => <tr key={e.nome}><td className="l">{e.nome}</td><td>{e.dias}</td><td>{fmt(e.pp)}</td><td>{fmt(e.alvenaria)}</td><td>{fmt(e.revestimento)}</td><td>{fmt(e.variavel)}</td><td>{fmt(e.xi)}</td><td>{fmt(e.dXi)}</td><td>{fmt(e.dXiAtiva)}</td></tr>)}</tbody>
                </table>
              ))}
            </div>
            {dim.detalhes && dim.detalhes.length > 0 && (<>
              {h2('Detalhamento das vigas')}
              <p>Armadura longitudinal disposta pela envoltória das combinações ELU decalada de aℓ (NBR 6118, 17.4.2.2), com ancoragem por aderência (9.4) e emendas por traspasse (9.5.2); estribos por zonas. Quantidades e pesos por viga (um pavimento); o grupo repete a armadura nos pavimentos indicados. Desenhos nas pranchas e na janela de resultados da viga.</p>
              <p data-memorial-det-vigas>Critérios em uso (opções de cálculo): prolongamento dos cortes {opc.vigaReducaoLb ? 'lb·As,calc/As,ef ≥ lb,mín = máx(0,3·lb; 10φ; 10 cm) (NBR 6118, 9.4.2.5)' : 'lb pleno (≥ 10φ)'}; negativos com no mínimo {fmt(opc.vigaNegativoVao, 0)} % do vão adjacente a partir da face{opc.vigaReforcoVao > 0 ? `; reforços inferiores com no mínimo ${fmt(opc.vigaReforcoVao, 0)} % do vão` : ''}; {opc.vigaNegativosUnir ? 'negativos separados por menos de lb unidos' : 'negativos não unidos'}; {opc.vigaSimetriaNegativos > 0 ? `negativos simétricos em vigas de um vão (diferença até ${fmt(opc.vigaSimetriaNegativos, 0)} %)` : 'negativos de vigas de um vão sem simetria forçada'}; montagem {opc.vigaMontagemContinua ? 'contínua' : 'interrompida (porta-estribos entre as pontas dos negativos, traspasse construtivo)'}, {opc.vigaMontagemColaborante && opc.vigaMontagemContinua ? 'colaborante' : 'construtiva (colaborante só onde há compressão superior)'}, {opc.vigaMontagemGancho ? 'com gancho' : `reta, medida ${opc.vigaMontagemEixo ? 'do eixo do apoio' : 'do extremo'}`}; perna reta dos ganchos {fmt(opc.vigaPernaGancho, 0)}φ; zonas de estribos {opc.vigaEstriboExtensao ? 'estendidas de d/2' : 'sem extensão'}{opc.vigaEstriboZonaMin > 0 ? `, comprimento mínimo ${fmt(opc.vigaEstriboZonaMin, 0)} cm` : ''}{opc.vigaEstriboSimetria ? ', simétricas' : ''}; estribos {opc.vigaEstriboU ? 'em U' : 'fechados'} com gancho de {fmt(opc.vigaEstriboGancho, 0)}° (NBR 6118, 9.4.6.1){opc.vigaAsMinPonto ? '; As,mín longitudinal comparada ponto a ponto com a necessária' : ''}; fator do comprimento de emenda {fmt(opc.vigaFatorEmenda, 1)}; aviso de desnível longitudinal acima de {fmt(opc.vigaDesnivelLimite, 1)} cm. Vários desses valores são "a confirmar" (ver Premissas).</p>
              {(b.tramos ?? []).length > 0 && <p data-memorial-tramos>Tramos predefinidos (armadura inferior passante sem emenda nem gancho nos apoios comuns): {(b.tramos ?? []).map((t) => t.map((id) => b.vigas.find((x) => x.id === id)?.nome ?? id).join(' + ')).join('; ')}.</p>}
              {dim.detalhes.map((d) => (
                <div key={d.viga} className="avoid">
                  <h3>Viga {d.nome} — {d.repeticoes} {d.repeticoes === 1 ? 'pavimento' : 'pavimentos'}</h3>
                  <table>
                    <thead><tr><th>Pos.</th><th>Tipo</th><th>Face</th><th>Quant.</th><th>φ (mm)</th><th>Trecho s (m)</th><th>C unit. (m)</th><th>C total (m)</th><th>Peso (kg)</th></tr></thead>
                    <tbody>
                      {linhasBarras(d).map((x) => <tr key={x.pos}><td className="l">{x.pos}{x.editada ? ' (editada)' : ''}</td><td className="l">{TIPO_BARRA[x.tipo]}{x.continuaCom ? ' (tramo)' : ''}</td><td className="l">{FACE_BARRA[x.face]}</td><td>{x.n}</td><td>{fmt(x.phi, x.phi % 1 ? 1 : 0)}</td><td>{fmt(x.s0)} a {fmt(x.s1)}</td><td>{fmt(x.comprimento)}</td><td>{fmt(x.total)}</td><td>{fmt(x.peso)}</td></tr>)}
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
              <thead><tr><th>Pilar</th><th>Lance</th><th>Seção (cm)</th><th>Nd (kN)</th><th>ℓe (b / h, m)</th><th>λ (b / h)</th><th>2ª ordem local (b / h)</th><th>Armadura</th><th>Estribo</th><th>Vd (kN)</th><th>Uso</th><th>Situação</th></tr></thead>
              <tbody>{dim.pilares.map((x) => <tr key={`${x.pilar}-${x.pavimento}`}><td className="l">{x.nome}</td><td className="l">{x.pavimento}</td><td>{x.secao}</td><td>{fmt(x.Nd, 0)}</td><td>{fmt(x.le[0])} / {fmt(x.le[1])}</td><td>{fmt(x.lambda[0], 0)} / {fmt(x.lambda[1], 0)}</td><td>{x.local ? x.local.metodo.map((m) => METODO_CURTO[m]).join(' / ') : '—'}</td><td>{x.armadura}</td><td>{x.estribo}</td><td>{x.Vd === undefined ? '—' : fmt(x.Vd, 1)}</td><td>{x.util >= 99 ? '>1' : fmt(x.util)}</td><td>{ST[x.status]}</td></tr>)}</tbody>
            </table>
            <p data-memorial-local>Efeitos locais de 2ª ordem por direção: λ ≤ 90 pilar-padrão com curvatura aproximada (CA); 90 &lt; λ ≤ 140 o mesmo com fluência (CA+F); 140 &lt; λ ≤ 200 método geral com fluência (MG: integração das curvaturas com a relação M–N–1/r da seção de fibras, concreto com 1,1·σcd [a confirmar]). Fluência (NBR 6118, 15.8.4): e_cc = (MSg/NSg + ea)·(2,718^(φNSg/(Ne − NSg)) − 1), Ne = 10·Eci·Ic/ℓe², φ = {fmt(opc.pilarFluencia, 1)}{opc.pilarFluencia === 2.5 ? ' [a confirmar]' : ''}, com NSg e MSg da combinação quase permanente. {opc.pilarLancesDesligados ? 'Lances sem viga nem laje que os travem no topo somam-se ao de cima: ℓe = máx(αi) × Σℓi por direção.' : 'Comprimento de flambagem lance a lance (soma dos lances desligados desligada).'} Taxa geométrica mínima {opc.pilarTaxaMin ? `${fmt(opc.pilarTaxaMin)} % (valor do usuário)` : '0,4 % (norma)'}, com 0,15·Nd/fyd. Com carga horizontal no lance, também as seções da carga e nove internas.</p>
            {dim.pilares.some((x) => x.cortante) && (<>
              <h3>Cortante dos pilares por direção</h3>
              <table data-memorial-cortante>
                <thead><tr><th>Pilar</th><th>Lance</th><th>Vsd u / v (kN)</th><th>Vc u / v (kN)</th><th>VRd2 u / v (kN)</th><th>Asw/s u / v (cm²/m)</th><th>As faces u / v (cm²)</th></tr></thead>
                <tbody>{dim.pilares.filter((x) => x.cortante).map((x) => { const c = x.cortante!, d2 = (f: (q: NonNullable<typeof c.v>) => number, dd = 1) => `${fmt(f(c.u), dd)} / ${c.v ? fmt(f(c.v), dd) : '—'}`; return <tr key={`${x.pilar}-${x.pavimento}`}><td className="l">{x.nome}</td><td className="l">{x.pavimento}</td><td>{d2((q) => q.Vsd)}</td><td>{d2((q) => q.Vc)}</td><td>{d2((q) => q.VRd2)}</td><td>{d2((q) => q.asw, 2)}</td><td>{d2((q) => q.AsLong, 2)}</td></tr>; })}</tbody>
              </table>
            </>)}
            <p>Cortante nos pilares (17.4.2, modelo I): na flexo-compressão Vc = Vc0·(1 + M0/Msd,máx) ≤ 2·Vc0 (17.4.2.2 c), com M0 = N·W/A (momento de descompressão; N com γf = 1,0 tomado como Nd/γg, a confirmar) e Msd,máx o maior momento das pontas na direção do cortante; Vc = 0 com tração; dispensa do estribo mínimo quando Vsd ≤ Vc em pilar comprimido; seção circular com bw = D e d = 0,8·D. Quando o cortante manda, o estribo vem da mensagem "Estribos pelo cortante".</p>
            <MemorialTaxasPilares b={b} dim={dim} />
            {dim.detalhesPilares && dim.detalhesPilares.length > 0 && (<>
              {h2('Detalhamento dos pilares')}
              <p>Barras longitudinais de baixo para cima: espera na fundação e ancoragem no topo com ganchos de 90°, emenda por traspasse de comprimento lb (boa aderência) na passagem de um lance a outro, união de lances curtos (até {fmt(opc.pilarUniaoLances, 1)} m) com a mesma armadura, dobra (inclinação ≤ 1:6) ou arranque na mudança de seção, barra máxima de {fmt(opc.pilarBarraMaxima, 1)} m; continuidade da armadura entre lances {opc.continuidadePilares ? 'ligada (a armadura não diminui de cima para baixo)' : 'desligada (cada lance pela sua necessidade)'}; ancoragem reduzida no topo {opc.ancoragemReduzidaTopo ? 'ligada (As,calc/As,ef)' : 'desligada'}. Estribos ao longo de cada lance e grampos nas barras a mais de 20φt de um canto (NBR 6118, 18.2.4). Comprimentos arredondados para cima a {fmt(opc.arredondamento, 0)} cm. Desenhos na janela de resultados do pilar.</p>
              <p data-memorial-det-pilares>Critérios em uso (opções de cálculo): continuidade a partir do {opc.pilarContinuidadeInicio ? 'penúltimo' : 'último'} lance{opc.pilarContinuidadeFaces ? ', mantendo o número de barras de cada face' : ''}; níveis sem viga chegando ao pilar {opc.pilarProlongarSemViga ? 'prolongados sem emenda (lances de armadura idêntica)' : 'emendados como os demais'}; topo do último lance {opc.pilarCorteTopo ? 'com as barras cortadas, sem ancoragem (só desenho e medição, não calculado)' : opc.ancoragemReduzidaTopo ? 'ancorado com gancho, ancoragem reduzida por As,calc/As,ef' : 'ancorado com gancho, lb pleno'}; traspasse e ancoragem dos arranques {opc.pilarReducaoIntermediarios ? `reduzidos pela utilização (traspasse mínimo ${fmt(opc.pilarReducaoMinimo, 0)} % de lb, 15φ e 20 cm)` : 'com lb pleno'}; estribos {opc.pilarAdensamento ? `adensados a cada ${fmt(opc.pilarAdensamentoEspacamento, 0)} cm numa altura de ${fmt(opc.pilarAdensamentoAltura)} m junto à base e ao topo de cada lance` : 'com espaçamento uniforme no lance (nó incluído)'}; pilar com seção insuficiente {opc.pilarInsuficienteSemDesenho ? 'fora do detalhamento, das pranchas e do quantitativo (continua como erro na revisão)' : 'detalhado mesmo assim, com a armadura de 4 %'}.</p>
              {b.pilares.some((q) => q.detalhe) && <p data-memorial-det-pilares-editados>Comprimentos editados: {b.pilares.filter((q) => q.detalhe).map((q) => `${q.nome} (${[q.detalhe!.espera !== undefined ? `espera ${fmt(q.detalhe!.espera)} m` : '', ...(q.detalhe!.passagens ?? []).map((x) => `${dim.detalhesPilares?.find((d) => d.pilar === q.id)?.lances.find((l) => l.pavimento === x.pavimento)?.nome ?? x.pavimento}: ${[x.emenda !== undefined ? `traspasse ${fmt(x.emenda)} m` : '', x.ancoragem !== undefined ? `ancoragem ${fmt(x.ancoragem)} m` : ''].filter(Boolean).join(', ')}`)].filter(Boolean).join('; ')})`).join('; ')}.</p>}
              {dim.detalhesPilares.map((d) => {
                const barras = linhasBarrasPilar(d), est = linhasEstribosPilar(d), nome = new Map(d.lances.map((l) => [l.pavimento, l.nome]));
                return (
                  <div key={d.pilar} className="avoid">
                    <h3>Pilar {d.nome}</h3>
                    <table>
                      <thead><tr><th>Pos.</th><th>Tipo</th><th>Lances</th><th>Quant.</th><th>φ (mm)</th><th>Cotas (m)</th><th>C unit. (m)</th><th>C total (m)</th><th>Peso (kg)</th></tr></thead>
                      <tbody>
                        {barras.map((x) => <tr key={x.pos}><td className="l">{x.pos}</td><td className="l">{x.tipo === 'arranque' ? 'Arranque' : 'Longitudinal'}</td><td className="l">{x.lances.map((l) => nome.get(l) ?? l).join(', ')}</td><td>{x.n}</td><td>{fmt(x.phi, x.phi % 1 ? 1 : 0)}</td><td>{fmt(x.z0)} a {fmt(x.z1)}</td><td>{fmt(x.comprimento)}</td><td>{fmt(x.total)}</td><td>{fmt(x.peso)}</td></tr>)}
                      </tbody>
                    </table>
                    <table>
                      <thead><tr><th>Lance</th><th>Seção (cm)</th><th>Passagem ao lance de cima</th><th>Estribos</th><th>C estribo (m)</th><th>Grampos por estribo</th><th>C grampo (m)</th><th>Peso (kg)</th></tr></thead>
                      <tbody>
                        {est.map((z, i) => <tr key={z.pavimento}><td className="l">{z.nome}</td><td>{d.lances[i].secao}</td><td className="l">{TRANSICAO[d.lances[i].transicao]}</td><td>{z.n} {`φ${String(z.phi).replace('.', ',')}`} c/{Math.round(z.s * 100)}</td><td>{fmt(z.comprimento)}</td><td>{z.grampos}</td><td>{z.grampos ? fmt(z.comprimentoGrampo) : '—'}</td><td>{fmt(z.peso)}</td></tr>)}
                        <tr><td className="l" colSpan={7}><b>Total do pilar</b></td><td><b>{fmt(d.peso)}</b></td></tr>
                      </tbody>
                    </table>
                    <p>lb: {d.lances.map((l) => `${l.nome} ${fmt((d.lb[l.pavimento] ?? 0) * 100, 0)} cm`).join('; ')}. Emendas/sobreposições: {emendasPilar(d).length ? emendasPilar(d).map((e) => `${fmt(e.z0)} a ${fmt(e.z1)} m`).join('; ') : 'nenhuma'}.{d.avisos.length ? ` Avisos: ${d.avisos.join(' ')}` : ''}</p>
                  </div>
                );
              })}
            </>)}
            {dim.detalhesLajes && dim.detalhesLajes.length > 0 && (<>
              {h2('Detalhamento das lajes')}
              <p>Lajes maciças: positivas em malha nas duas direções, recortadas pelo contorno e pelos furos e ancoradas além da face dos apoios; negativos sobre as bordas contínuas (diagrama de momentos da grelha decalado em {fmt(opc.lajeDecalagem, 1)}·d mais o comprimento de ancoragem, com mínimo de {fmt(opc.lajeNegativoVao, 0)} % do maior vão) e negativos de borda sem continuidade ({fmt(opc.lajeNegativoBorda, 0)} % do menor vão; NBR 6118, 19.3.3.2); armadura de distribuição sob os negativos; borda livre em U (20.1); malha superior de canto {opc.lajeArmaduraCanto ? 'ligada' : 'desligada'}; reforço junto aos furos. Bitola mínima φ{fmt(opc.lajeBitolaMinima, 1)}, espaçamento mínimo de {fmt(opc.lajeEspacamentoMinimo, 0)} cm, barra máxima de {fmt(opc.barraMaxima, 1)} m (emenda por traspasse acima disso) e comprimentos arredondados para cima a {fmt(opc.arredondamento, 0)} cm. Desenhos na janela de resultados da laje.</p>
              {((b.zonasLaje?.length ?? 0) > 0 || (b.linhasDobra?.length ?? 0) > 0 || opc.lajeUniformizarPilares === 1) && (
                <div className="avoid" data-memorial-zonas-lajes>
                  <h3>Zonas de uniformização e linhas de dobra</h3>
                  <p>Zonas de uniformização: as barras calculadas da face (e da direção, quando dada) que passam pela zona recebem a maior taxa (φ e espaçamento de maior As/m) e o maior comprimento entre elas. Linhas de dobra: locais de negativo máximo e de emenda preferencial da armadura inferior (quando passa da barra máxima); o mínimo em % do vão dos negativos usa o vão até a linha seguinte [a confirmar].{opc.lajeUniformizarPilares === 1 ? ` Uniformização automática junto aos pilares ligada: faixa de ${fmt(opc.lajeUniformizarPilaresLargura, 0)} cm em torno de cada pilar, face superior [a confirmar].` : ''}</p>
                  <table>
                    <thead><tr><th>Item</th><th>Forma</th><th>Face</th><th>Direção</th><th>Pontos (m)</th></tr></thead>
                    <tbody>
                      {(b.zonasLaje ?? []).map((z, i) => <tr key={z.id}><td className="l">Z{i + 1} ({b.grupos.find((g) => g.id === z.grupo)?.nome ?? z.grupo})</td><td className="l">{z.forma === 'linha' ? `linha, largura ${fmt(z.largura ?? 0.5)} m` : 'retângulo'}</td><td className="l">{z.face === 'inf' ? 'inferior' : 'superior'}</td><td className="l">{z.angulo === undefined ? 'qualquer' : `${fmt(z.angulo, 0)}°`}</td><td>{fmt(z.pontos[0][0])} ; {fmt(z.pontos[0][1])} → {fmt(z.pontos[1][0])} ; {fmt(z.pontos[1][1])}</td></tr>)}
                      {(b.linhasDobra ?? []).map((ln, i) => <tr key={ln.id}><td className="l">LD{i + 1} ({b.grupos.find((g) => g.id === ln.grupo)?.nome ?? ln.grupo})</td><td className="l">linha de dobra</td><td className="l">—</td><td className="l">—</td><td>{fmt(ln.a[0])} ; {fmt(ln.a[1])} → {fmt(ln.z[0])} ; {fmt(ln.z[1])}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              )}
              {dim.detalhesLajes.map((d) => (
                <div key={d.laje} className="avoid">
                  <h3>Laje {d.nome} · h = {fmt(d.h * 100, 0)} cm{d.repeticoes > 1 ? ` · ${d.repeticoes} pavimentos` : ''}</h3>
                  <table>
                    <thead><tr><th>Direção</th><th>Adotada</th><th>As adotada (cm²/m)</th><th>As necessária (cm²/m)</th></tr></thead>
                    <tbody>{d.positivas.map((p, k) => <tr key={k}><td className="l">{k === 0 ? 'principal' : 'perpendicular'}{p.secundaria ? ' (secundária)' : ''}</td><td className="l">{`φ${String(p.phi).replace('.', ',')}`} c/{fmt(p.s * 100, 0)}</td><td>{fmt(p.As)}</td><td>{fmt(p.AsNec)}</td></tr>)}</tbody>
                  </table>
                  {d.base && <p>Armadura base {d.base.detalhada ? '(detalhada, desenhada e medida)' : '(só indicada, fora do desenho e do quantitativo)'}: {[d.base.inf && `inferior ${d.base.inf.nota} (${fmt(d.base.inf.As[0])} / ${fmt(d.base.inf.As[1])} cm²/m)`, d.base.sup && `superior ${d.base.sup.nota} (${fmt(d.base.sup.As[0])} / ${fmt(d.base.sup.As[1])} cm²/m)`].filter(Boolean).join('; ')}. A base é colaborante: reforço = necessária − base{d.positivas.some((p) => p.reforco) ? ` (reforço adotado nas direções ${d.positivas.map((p, k) => (p.reforco ? k : -1)).filter((k) => k >= 0).join(' e ')})` : ' (a base atende a positiva)'}.</p>}
                  {d.edicao && <p data-memorial-edicao-laje>{[d.edicao.semCalculo && 'Armadura gerada só com a geometria (mínimos e base), sem os esforços da análise: a edição vale contra os mínimos.', d.edicao.editadas > 0 && `${d.edicao.editadas} ${d.edicao.editadas === 1 ? 'posição editada e bloqueada' : 'posições editadas e bloqueadas'} (${d.posicoes.filter((x) => x.editada).map((x) => x.pos).join(', ')}), verificadas contra a armadura exigida.`, d.edicao.uniformizadas > 0 && `${d.edicao.uniformizadas} ${d.edicao.uniformizadas === 1 ? 'posição uniformizada' : 'posições uniformizadas'} por zona (${[...new Set(d.posicoes.filter((x) => x.uniforme).map((x) => x.uniforme))].map((u) => (u!.startsWith('auto_') ? 'pilares' : `Z${(b.zonasLaje ?? []).findIndex((z) => z.id === u) + 1}`)).join(', ')}).`, d.edicao.emendasDobra > 0 && `${d.edicao.emendasDobra} ${d.edicao.emendasDobra === 1 ? 'emenda' : 'emendas'} da armadura inferior centradas em linha de dobra.`, d.edicao.media && 'Armadura positiva média uniforme por direção (opção).'].filter(Boolean).join(' ')}</p>}
                  {d.paineis && d.paineis.length > 0 && <p>Painéis de tela: {d.paineis.map((p) => `${p.n} ${p.designacao} ${fmt(p.largura)} × ${fmt(p.comprimento)} m`).join('; ')}.</p>}
                  <table>
                    <thead><tr><th>Pos.</th><th>Face</th><th>Tipo</th><th>Quant.</th><th>φ (mm)</th><th>Espaç. (cm)</th><th>C unit. (m)</th><th>C total (m)</th><th>Peso (kg)</th></tr></thead>
                    <tbody>
                      {linhasPosicoesLaje(d).map((x) => <tr key={x.pos}><td className="l" title={rotuloPosicaoLaje(x)}>{x.pos}</td><td className="l">{FACE_POS_LAJE[x.face]}</td><td className="l">{TIPO_POS_LAJE[x.tipo]}</td><td>{x.n}</td><td>{fmt(x.phi, x.phi % 1 ? 1 : 0)}</td><td>{x.s > 0 ? fmt(x.s * 100, 0) : '—'}</td><td>{fmt(x.comprimento)}</td><td>{fmt(x.total)}</td><td>{fmt(x.peso)}</td></tr>)}
                      <tr><td className="l" colSpan={8}><b>Total de uma laje</b></td><td><b>{fmt(d.peso)}</b></td></tr>
                    </tbody>
                  </table>
                  <p>lb inferior = {fmt(d.lb.inf * 100, 0)} cm (boa aderência); lb superior = {fmt(d.lb.sup * 100, 0)} cm ({d.lb.supBoaAderencia ? 'boa' : 'má'} aderência). {d.emendas.length ? `Emendas por traspasse: ${d.emendas.map((e) => `direção ${e.dir} (l0 = ${fmt(e.l0 * 100, 0)} cm, ${e.linhas} ${e.linhas === 1 ? 'linha' : 'linhas'})`).join('; ')}.` : 'Sem emendas por traspasse.'}{d.avisos.length ? ` Avisos: ${d.avisos.join(' ')}` : ''}</p>
                </div>
              ))}
            </>)}
            {dim.vigotas?.some((r) => !r.familia) && (<>
              {h2('Lajes treliçadas')}
              <p>Esforços por nervura (alinhamentos da grelha na direção das vigotas × intereixo), na envoltória ELU dos pavimentos do grupo, com momentos mínimos {opc.vigotaMomentoMinPositivo > 0 ? `p·ℓ²/${fmt(opc.vigotaMomentoMinPositivo, 0)}` : 'desligado'} (positivo) e {opc.vigotaMomentoMinNegativo > 0 ? `p·ℓ²/${fmt(opc.vigotaMomentoMinNegativo, 0)}` : 'desligado'} (negativo) e igualação entre vigotas vizinhas ({opc.vigotaIgualacao === 0 ? 'desligada' : opc.vigotaIgualacao === 1 ? 'pelo máximo' : 'pela média'}, diferença de {fmt(opc.vigotaIgualacaoDif, 0)} %). Positiva em seção T com o banzo inferior da treliça (CA-60) descontado e adicional de 1 a 2 barras por nervura; negativos na capa sobre os apoios, com comprimento pelo diagrama decalado mais lb (mínimo de {fmt(opc.vigotaNegativoVao, 0)} % do vão); cortante sem armadura transversal (NBR 6118, 19.4.1) com faixa maciçada quando necessário; capa conforme 13.2.4.2; distribuição pela Tabela 19.1. Treliça por modelo, peso pela geometria, adicional no comprimento eixo a eixo e igualação de 100 % a confirmar.</p>
              {dim.vigotas.filter((r) => !r.familia).map((r) => (
                <div key={r.laje} className="avoid">
                  <h3>Laje {r.nome} · {r.modelo}+{fmt(r.capa * 100, 0)} · {r.trelica} · {r.vigotas} vigotas{r.repeticoes > 1 ? ` · ${r.repeticoes} pavimentos` : ''} · {ST[r.status]}{r.bloqueada ? ' · armadura bloqueada' : ''}</h3>
                  <table>
                    <thead><tr><th>Grupo</th><th>Vigotas</th><th>L (m)</th><th>Md+ (kN·m)</th><th>Md− ini / fim (kN·m)</th><th>Vsd / VRd1 ini (kN)</th><th>Vsd / VRd1 fim (kN)</th><th>As nec. (cm²)</th><th>Treliça (cm²)</th><th>Adicional</th><th>Negativo ini</th><th>Negativo fim</th><th>Maciço ini / fim (cm)</th></tr></thead>
                    <tbody>
                      {linhasGruposVigotas(r).map((x) => <tr key={x.grupo}><td className="l">G{x.grupo}</td><td>{x.vigotas}</td><td>{fmt(x.L)}</td><td>{fmt(x.mPos)}</td><td>{fmt(x.mNeg[0])} / {fmt(x.mNeg[1])}</td><td>{fmt(x.v[0].Vsd, 1)} / {fmt(x.v[0].VRd1, 1)}</td><td>{fmt(x.v[1].Vsd, 1)} / {fmt(x.v[1].VRd1, 1)}</td><td>{fmt(x.AsNec)}</td><td>{fmt(x.AsTrelica)}</td><td className="l">{x.adicional}{x.adicional !== '—' ? ` (C = ${fmt(x.comprimento)} m)` : ''}</td><td className="l">{x.negativos[0]}</td><td className="l">{x.negativos[1]}</td><td>{fmt(x.macico[0] * 100, 0)} / {fmt(x.macico[1] * 100, 0)}</td></tr>)}
                    </tbody>
                  </table>
                  <p>Altura h = {fmt(r.h * 100, 0)} cm (capa {fmt(r.capa * 100, 1)} cm; mínimo {fmt(r.verificacaoCapa.minima * 100, 1)} cm: {r.verificacaoCapa.ok ? 'atende' : 'não atende'}); intereixo {fmt(r.intereixo * 100, 0)} cm. Distribuição na capa: φ{String(r.distribuicao.phi).replace('.', ',')} c/{fmt(r.distribuicao.s * 100, 0)} cm. Peso das barras {fmt(r.peso)} kg e da treliça {fmt(r.pesoTrelica)} kg por pavimento.</p>
                </div>
              ))}
            </>)}
            <MemorialVigotasFicha dim={dim} h2={h2} />
            {((dim.resumoAcoVigas?.length ?? 0) > 0 || (dim.resumoAcoPilares?.length ?? 0) > 0 || (dim.resumoAcoLajes?.length ?? 0) > 0 || (dim.resumoAcoVigotas?.length ?? 0) > 0 || (dim.resumoAcoNervuradas?.length ?? 0) > 0 || (dim.resumoAcoParedes?.length ?? 0) > 0 || (dim.resumoTelas?.length ?? 0) > 0 || (dim.resumoAcoEscadas?.length ?? 0) > 0) && (<>
              {h2('Resumo geral de aço')}
              {([['Vigas', dim.resumoAcoVigas ?? []], ['Pilares', dim.resumoAcoPilares ?? []], ['Paredes e pilares-parede', dim.resumoAcoParedes ?? []], ['Lajes maciças', dim.resumoAcoLajes ?? []], ['Lajes treliçadas (adicionais, negativos e distribuição)', dim.resumoAcoVigotas ?? []], ['Lajes nervuradas bidirecionais (nervuras, base e malha da mesa)', dim.resumoAcoNervuradas ?? []], ['Lajes alveolares (negativos na capa)', dim.resumoAcoAlveolares ?? []], ...((dim.resumoAcoEscadas?.length ?? 0) > 0 ? [['Escadas (lances e patamares)', dim.resumoAcoEscadas ?? []] as const] : []), [(dim.resumoAcoEscadas?.length ?? 0) > 0 ? 'Total geral (vigas, pilares, paredes, lajes, vigotas, nervuradas, alveolares e escadas)' : 'Total geral (vigas, pilares, paredes, lajes, vigotas, nervuradas e alveolares)', somarResumosAco(dim.resumoAcoVigas ?? [], dim.resumoAcoPilares ?? [], dim.resumoAcoParedes ?? [], dim.resumoAcoLajes ?? [], dim.resumoAcoVigotas ?? [], dim.resumoAcoNervuradas ?? [], dim.resumoAcoAlveolares ?? [], dim.resumoAcoEscadas ?? [])]] as const).map(([tit, rs]) => (
                <div key={tit} className="avoid">
                  <h3>{tit}</h3>
                  <table>
                    <thead><tr><th>Aço</th><th>φ (mm)</th><th>Comprimento (m)</th><th>Peso (kg)</th><th>Peso com perdas (kg)</th></tr></thead>
                    <tbody>
                      {rs.map((x) => <tr key={`${x.aco}-${x.phi}`}><td className="l">{x.aco}</td><td>{fmt(x.phi, x.phi % 1 ? 1 : 0)}</td><td>{fmt(x.comprimento)}</td><td>{fmt(x.peso)}</td><td>{fmt(x.pesoComPerdas)}</td></tr>)}
                      <tr><td className="l" colSpan={2}><b>Total</b></td><td><b>{fmt(rs.reduce((s, x) => s + x.comprimento, 0))}</b></td><td><b>{fmt(rs.reduce((s, x) => s + x.peso, 0))}</b></td><td><b>{fmt(rs.reduce((s, x) => s + x.pesoComPerdas, 0))}</b></td></tr>
                    </tbody>
                  </table>
                </div>
              ))}
              {(dim.resumoTelas?.length ?? 0) > 0 && (
                <div className="avoid">
                  <h3>Telas soldadas da base das lajes (NBR 7481, fora do total de barras)</h3>
                  <table>
                    <thead><tr><th>Designação</th><th>Painéis</th><th>Área (m²)</th><th>Peso (kg)</th><th>Peso com perdas (kg)</th></tr></thead>
                    <tbody>{dim.resumoTelas!.map((t) => <tr key={t.designacao}><td className="l">{t.designacao}</td><td>{t.paineis}</td><td>{fmt(t.area)}</td><td>{fmt(t.peso)}</td><td>{fmt(t.pesoComPerdas)}</td></tr>)}</tbody>
                  </table>
                  <p>Painéis de {fmt(PAINEL_TELA.largura)} × {fmt(PAINEL_TELA.comprimento)} m cortados no pano, com traspasse de {fmt(opc.lajeTelaTraspasse, 0)} cm entre painéis e cobrimento nas bordas; peso = 7850 kg/m³ × área de aço das duas direções [a confirmar: dimensões dos fios e das malhas do catálogo conferidas por catálogos de fabricantes, séries L e T fora do catálogo].</p>
                </div>
              )}
              <p>Perdas de {fmt(perdasDoResumo(somarResumosAco(dim.resumoAcoVigas ?? [], dim.resumoAcoPilares ?? [], dim.resumoAcoParedes ?? [], dim.resumoAcoLajes ?? [], dim.resumoAcoVigotas ?? [], dim.resumoAcoNervuradas ?? [], dim.resumoAcoAlveolares ?? [], dim.resumoAcoEscadas ?? [])), 1)} % sobre o peso (opção "perdas de aço"). Lajes maciças pelo detalhamento; lajes treliçadas pelas barras adicionais, negativos e distribuição (as treliças eletrossoldadas vêm em tabela própria, abaixo, e não entram nos totais de barras); lajes nervuradas seguem estimadas por taxa na tabela de quantitativos e não entram neste resumo.</p>
              {(dim.trelicas?.length ?? 0) > 0 && (
                <div className="avoid">
                  <h3>Treliças eletrossoldadas (por tipo)</h3>
                  <table>
                    <thead><tr><th>Treliça</th><th>Comprimento (m)</th><th>Peso (kg)</th><th>Peso com perdas (kg)</th></tr></thead>
                    <tbody>
                      {dim.trelicas!.map((t) => <tr key={t.trelica}><td className="l">{t.trelica}</td><td>{fmt(t.comprimento)}</td><td>{fmt(t.peso)}</td><td>{fmt(t.pesoComPerdas)}</td></tr>)}
                      <tr><td className="l"><b>Total</b></td><td><b>{fmt(dim.trelicas!.reduce((a, t) => a + t.comprimento, 0))}</b></td><td><b>{fmt(dim.trelicas!.reduce((a, t) => a + t.peso, 0))}</b></td><td><b>{fmt(dim.trelicas!.reduce((a, t) => a + t.pesoComPerdas, 0))}</b></td></tr>
                    </tbody>
                  </table>
                </div>
              )}
            </>)}
            {h2('Lajes')}
            <table>
              <thead><tr><th>Laje</th><th>Pavimento</th><th>Tipo</th><th>As+ (cm²/m)</th><th>As− (cm²/m)</th><th>wk / lim. (mm)</th><th>Flecha / lim. (mm)</th><th>Flecha Q / lim. (mm)</th><th>Ativa / lim. (mm)</th><th>Situação</th></tr></thead>
              <tbody>{dim.lajes.map((x) => <tr key={`${x.laje}-${x.pavimento}`}><td className="l">{x.nome}</td><td className="l">{x.pavimento}</td><td className="l">{x.tipo}</td><td>{fmt(x.As.pos[0])} / {fmt(x.As.pos[1])}</td><td>{fmt(x.As.neg[0])} / {fmt(x.As.neg[1])}</td><td className={x.wk > x.wkLim + 1e-9 ? 'bad' : undefined}>{fmt(x.wk, 2)} / {fmt(x.wkLim, 2)}</td><td className={x.flecha > x.limite + 1e-9 ? 'bad' : undefined}>{fmt(x.flecha * 1000, 1)} / {fmt(x.limite * 1000, 1)}</td><td className={x.flechaQ > x.limiteQ + 1e-9 ? 'bad' : undefined}>{fmt(x.flechaQ * 1000, 1)} / {fmt(x.limiteQ * 1000, 1)}</td><td className={x.flechas && x.flechas.ativa > x.flechas.limites.ativa + 1e-9 ? 'bad' : undefined}>{x.flechas ? `${fmt(x.flechas.ativa * 1000, 1)} / ${fmt(x.flechas.limites.ativa * 1000, 1)}` : '—'}</td><td>{ST[x.status]}</td></tr>)}</tbody>
            </table>
            <p>Lajes maciças: momentos por {opc.woodArmer ? 'Wood-Armer (mx* = mx + |mxy|; mx*′ = mx − |mxy|, torçor somando |γ·mxy| por caso) com média numa faixa transversal de 1 m' : 'extremos dos momentos nas barras da grelha (Wood-Armer desligado)'}. Flecha relativa aos apoios (descontado o deslocamento das vigas e pilares), {opc.fatorFlechaLaje ? `fator simplificado ${fmt(opc.fatorFlechaLaje, 1)} × elástica (ativa ${fmt(opc.fatorFlechaAtiva, 2)}/${fmt(opc.fatorFlechaAtivaTrelicada, 2)} e variável ${fmt(opc.fatorFlechaConforto, 2)}/${fmt(opc.fatorFlechaConfortoTrelicada, 2)} × elástica, maciça/treliçada)` : `método por etapas${opc.fissuracaoLajes ? ' com a grelha fissurada (Branson por barra, Mr da 17.3.1)' : ', sem fissuração'}`}; limite ℓ/{opc.limiteFlechaTotal} do menor vão; carga variável ≤ ℓ/{opc.limiteFlechaSensorial}.</p>
            {(!!dim.puncao?.length || dim.lajes.some((x) => x.cortante)) && (<>
              {h2('Punção e cortante das lajes')}
              <p>Cortante e punção das lajes maciças pela NBR 6118:2014, 19.4 e 19.5 (numeração a confirmar na edição de 2023). Valores de cálculo (ELU, γg·G + γq·Q); tensões em MPa, forças em kN, momentos em kN·m, comprimentos em m.</p>
              {(dim.puncao?.[0]?.origens ?? dim.lajes.find((x) => x.cortante)?.origens?.filter((o) => o.grandeza === 'Cortante') ?? []).map((o, i) => <p key={i}><b>{o.grandeza}.</b> {o.formula}. <i>{o.item}.</i></p>)}
              {!!dim.puncao?.length && (<>
                <h3>Punção por pilar</h3>
                <table>
                  <thead><tr><th className="l">Pilar</th><th className="l">Pavimento</th><th className="l">Apoio</th><th>FSd</th><th>MSd u / v</th><th>u (C′)</th><th>τSd (C) / τRd2</th><th>τSd (C′) / {'τRd1'}</th><th className="l">Armadura de punção</th><th className="l">Situação</th></tr></thead>
                  <tbody>{dim.puncao.map((r) => (
                    <tr key={r.id}>
                      <td className="l">{r.nome}</td><td className="l">{r.pavimento}</td><td className="l">{r.tipo}{r.origem === 'viga' ? ' (viga chata)' : ''}</td><td>{fmt(r.F, 1)}</td><td>{fmt(r.M[0], 1)} / {fmt(r.M[1], 1)}</td><td>{fmt(r.contornos[1].u)}</td>
                      <td className={r.contornos[0].ok ? undefined : 'bad'}>{fmt(r.contornos[0].tau, 3)} / {fmt(r.tauRd2, 3)}</td>
                      <td className={r.contornos[1].tau > r.tauRd1 + 1e-9 ? 'bad' : undefined}>{fmt(r.contornos[1].tau, 3)} / {fmt(r.tauRd1, 3)}</td>
                      <td className="l">{r.armadura ? `${r.armadura.linhas} linhas × ${r.armadura.barras} ${r.armadura.tipo === 'estribo' ? 'estribos' : 'conectores'} φ${String(r.armadura.phi).replace('.', ',')} (τRd3 = ${fmt(r.tauRd3 ?? 0, 3)})${r.manual.length ? ' + informada' : ''}` : r.manual.length ? 'informada' : '—'}</td>
                      <td className="l">{r.status === 'ok' ? 'sem armadura' : r.status === 'armadura' ? 'com armadura' : 'não atende'}</td>
                    </tr>
                  ))}</tbody>
                </table>
                <p>Contornos: C no perímetro do pilar, C′ a 2d e C″ a 2d da última linha de armadura, recortados pela laje (pilares de borda e de canto: contorno reduzido) e sem o trecho entre as tangentes aos furos a menos de {fmt(opc.puncaoFuroDist, 0)}d. τSd = FSd/(u·d) + ΣK·MSd1/(Wp·d), com MSd1 = máx(0; MSd − FSd·e*), K da Tabela 19.2 e Wp = ∫|e|dℓ. FSd é a reação do pilar na grelha da laje; MSd, o momento das molas de rotação do pilar (cargas verticais, módulos somados caso a caso). ρ = √(ρx·ρy) da armadura superior calculada. Armadura em linhas radiais: primeira barra a {fmt(opc.puncaoS0, 2)}d e barras a {fmt(opc.puncaoSr, 2)}d, {opc.puncaoTipoArmadura ? 'conectores (fywd ≤ 300 MPa)' : 'estribos em grampo (fywd ≤ 250 MPa)'}, aço {acoDe(b, 'lajePuncao').aco}.</p>
              </>)}
              {dim.lajes.some((x) => x.cortante) && (<>
                <h3>Cortante das lajes nos apoios em vigas</h3>
                <table>
                  <thead><tr><th className="l">Laje</th><th className="l">Pavimento</th><th>VSd / VRd1 dir. 0 (kN/m)</th><th>VSd / VRd1 dir. 1 (kN/m)</th><th>VRd2 (kN/m)</th><th>Armadura transversal (cm²/m²)</th></tr></thead>
                  <tbody>{dim.lajes.filter((x) => x.cortante).map((x) => <tr key={`${x.laje}-${x.pavimento}`}><td className="l">{x.nome}</td><td className="l">{x.pavimento}</td><td className={x.cortante!.VSd[0] > x.cortante!.VRd1[0] + 1e-9 ? 'bad' : undefined}>{fmt(x.cortante!.VSd[0], 1)} / {fmt(x.cortante!.VRd1[0], 1)}</td><td className={x.cortante!.VSd[1] > x.cortante!.VRd1[1] + 1e-9 ? 'bad' : undefined}>{fmt(x.cortante!.VSd[1], 1)} / {fmt(x.cortante!.VRd1[1], 1)}</td><td>{fmt(x.cortante!.VRd2, 1)}</td><td>{x.cortante!.Asw ? fmt(x.cortante!.Asw) : '—'}</td></tr>)}</tbody>
                </table>
                <p>Cortante nas pontas das barras da malha que chegam a vigas, por metro de largura, contra VRd1 (19.4.1); acima dele, armadura transversal (19.4.2) para h ≥ 15 cm, com Vc interpolado entre VRd1 (h ≤ 15 cm) e 0,6·fctd·d (h ≥ 35 cm) [a confirmar]. No entorno de pilares sem viga, varredura em superfícies a cada {fmt(opc.cortanteVarreduraPasso, 2)}d a partir do contorno C′ ({opc.cortanteVarredura ? 'ligada' : 'desligada'}).</p>
              </>)}
            </>)}
            {[...dim.vigas, ...dim.pilares, ...dim.lajes].some((x) => x.mensagens.length) && (
              <ul>{[...dim.vigas.map((x) => [x.nome, x.mensagens] as const), ...dim.pilares.map((x) => [`${x.nome} (${x.pavimento})`, x.mensagens] as const), ...dim.lajes.map((x) => [`${x.nome} (${x.pavimento})`, x.mensagens] as const)].filter(([, m]) => m.length).map(([n, m], i) => <li key={i}><b>{n}:</b> {m.join(' ')}</li>)}</ul>
            )}

            {dim.fogo && (<>
              {h2('Resistência ao fogo')}
              <div data-memorial-fogo>
                <p>Verificação em situação de incêndio pela NBR 15200: método tabular nas lajes e vigas (edição de 2004, dimensões mínimas e distância c1 do eixo da armadura à face exposta, TRRF de 30 a 120 min, sem interpolação) e, nos pilares, {opc.fogoPilarMetodo ? 'a tabela da edição de 2004 por μfi' : 'o método analítico da edição de 2012 (TRF = 120·[(Rμ + Ra + Rl + Rb + Rn)/120]^1,8)'}. c1 = cobrimento + φ do estribo + φ/2 das barras adotadas; o revestimento de proteção soma a c1 (e à largura das vigas e à espessura das lajes) pela eficiência do material (cal e areia 67 %, cimento e areia 100 %). μfi dos pilares {fmt(opc.fogoMuFi)}, {opc.fogoFacesPilar} face(s) exposta(s), ℓef,fi {opc.fogoLefReducao ? '= 0,5·ℓe (0,7·ℓe no último pavimento) com γz ≤ 1,1' : '= ℓe'}; lajes {opc.fogoLajeCompartimentadora ? 'compartimentadoras (espessura mínima também verificada)' : 'sem função compartimentadora (só c1)'}. Tabelas da edição de 2012 para lajes maciças e vigas e as tabelas gerais dos pilares não foram transcritas (a confirmar).</p>
                {dim.fogo.sugestao && <p>Sugestão pela ocupação {dim.fogo.sugestao.divisao} e altura {fmt(dim.fogo.sugestao.altura, 1)} m (classe {dim.fogo.sugestao.classe}): {dim.fogo.sugestao.trrf === null ? 'consultar o corpo técnico dos bombeiros' : `${dim.fogo.sugestao.trrf} min`}. {dim.fogo.sugestao.fonte}.</p>}
                <table>
                  <thead><tr><th className="l">Grupo</th><th>TRRF (min)</th><th className="l">Origem</th></tr></thead>
                  <tbody>{dim.fogo.grupos.map((g) => <tr key={g.grupo}><td className="l">{g.nome}</td><td>{g.trrf}</td><td className="l">{g.origem === 'grupo' ? 'informado para o grupo' : g.origem === 'ocupacao' ? 'sugerido pela ocupação' : g.origem === 'elemento' ? 'do elemento' : 'padrão das opções'}</td></tr>)}</tbody>
                </table>
                <table>
                  <thead><tr><th className="l">Elemento</th><th className="l">Tipo</th><th className="l">Pavimento</th><th>TRRF (min)</th><th>TRF (min)</th><th>Folga (min)</th><th className="l">Tabela ou método</th><th className="l">Exigido</th><th className="l">Adotado</th><th className="l">Situação</th></tr></thead>
                  <tbody>{dim.fogo.elementos.map((e) => <tr key={`${e.tipo}-${e.id}-${e.pavimento ?? ''}`}><td className="l">{e.nome}</td><td className="l">{e.tipo}</td><td className="l">{e.pavimento ?? '—'}</td><td>{e.trrf}</td><td>{e.metodo === 'analítico' ? e.trf : e.trf > 0 ? `${e.limiteTabela ? '≥ ' : ''}${e.trf}` : '< 30'}</td><td className={e.folga < 0 ? 'bad' : undefined}>{e.folga}</td><td className="l">{e.tabela}</td><td className="l">{e.exigido}</td><td className="l">{e.adotado}</td><td className="l">{e.status === 'ok' ? 'atende' : e.status === 'review' ? 'revisar' : 'não atende'}</td></tr>)}</tbody>
                </table>
              </div>
            </>)}
            {h2('Erros e avisos')}
            {rev.itens.length === 0 ? <p>Nenhum erro ou aviso.</p> : (<>
              <p>{rev.erros} {rev.erros === 1 ? 'erro' : 'erros'} e {rev.avisos} {rev.avisos === 1 ? 'aviso' : 'avisos'}. Erro: o elemento não atende ao cálculo; aviso: atende, mas pede atenção.</p>
              <table>
                <thead><tr><th className="l">Elemento</th><th className="l">Pavimento</th><th className="l">Nível</th><th className="l">Código</th><th className="l">Mensagem</th></tr></thead>
                <tbody>{rev.itens.map((i, k) => <tr key={k}><td className="l">{i.tipo === 'obra' ? 'Obra' : `${i.tipo === 'viga' ? 'Viga' : i.tipo === 'pilar' ? 'Pilar' : 'Laje'} ${i.nome}`}</td><td className="l">{i.pavimento ?? '—'}</td><td className="l">{i.nivel}</td><td className="l">{i.codigo}</td><td className="l">{i.mensagem}</td></tr>)}</tbody>
              </table>
            </>)}

            {tabelas.length > 0 && (<>
              {h2('Tabelas de armadura')}
              <p>Tabelas de bitolas, espaçamentos e tipologias que o dimensionamento e o detalhamento podem usar; só as alteradas pelo projetista ou criadas por ele. As demais seguem a tabela de fábrica (todas as bitolas comerciais da NBR 7480, com os limites da NBR 6118). Tolerância de simetria da armadura dos pilares: {opcoesEmUso(b.opcoes, perfil).pilarSimetria >= 1000 ? 'sempre simétrica' : `${String(opcoesEmUso(b.opcoes, perfil).pilarSimetria).replace('.', ',')} %`}.</p>
              {tabelas.map((x, k) => (
                <div key={k}>
                  <p><b>{rotuloTabela(x)}</b> (id {x.tabela.id}). Elementos que a usam: {x.tabela.id === 'padrao' ? 'todos sem tabela própria' : `${[...b.vigas.filter((v) => v.tabela === x.tabela.id || v.tabelaEstribo === x.tabela.id), ...b.pilares.filter((p) => p.tabela === x.tabela.id), ...b.lajes.filter((l) => l.tabela === x.tabela.id)].map((e) => e.nome).join(', ') || 'nenhum'}`}.</p>
                  <ul>{descreverTabela(x.tipo, x.tabela).map((l, i) => <li key={i}>{l}</li>)}</ul>
                </div>
              ))}
            </>)}

            {bloqueadasMemo.length > 0 && (<>
              {h2('Armaduras bloqueadas')}
              <p>Armaduras editadas pelo projetista e bloqueadas: o recálculo não as redimensiona, só as verifica (vigas: área de aço, estribos, barras laterais, fissuração e flecha; pilares: verificação completa do lance, por fibras). Situação "não atende" indica armadura insuficiente; a mensagem traz o necessário.</p>
              <table>
                <thead><tr><th className="l">Elemento</th><th className="l">Lance</th><th className="l">Arranjo adotado</th><th className="l">Situação</th><th className="l">Verificação</th></tr></thead>
                <tbody>{bloqueadasMemo.map((x, k) => <tr key={k}><td className="l">{x.elemento}</td><td className="l">{x.lance}</td><td className="l">{x.arranjo}</td><td className="l">{x.status}</td><td className="l">{x.msgs}</td></tr>)}</tbody>
              </table>
            </>)}

            {!!dim.agrupamentos?.length && (<>
              {h2('Pórticos agrupados')}
              <p>Vigas agrupadas levam a mesma armadura: a do pórtico que governa (maior área inferior, superior, barras laterais e armadura de estribos entre os membros), verificada em cada viga. Desenho único quando a geometria dos membros é idêntica (mesma seção, comprimento e vãos eixo a eixo, tolerância de 1 cm). Sem o mesmo número de vãos e a mesma seção o agrupamento é desconsiderado e cada viga é dimensionada sozinha.</p>
              <table data-memorial-agrupamentos>
                <thead><tr><th className="l">Agrupamento</th><th className="l">Vigas</th><th className="l">Situação</th><th className="l">Pórtico de referência</th><th className="l">Desenhos</th></tr></thead>
                <tbody>{dim.agrupamentos.map((g) => <tr key={g.id}><td className="l">{g.nome}</td><td className="l">{g.vigas.map((id) => b.vigas.find((v) => v.id === id)?.nome ?? id).join(', ')}</td><td className="l">{g.efetivo ? 'vale' : `desconsiderado: ${g.motivo}`}</td><td className="l">{g.referencia ? b.vigas.find((v) => v.id === g.referencia)?.nome : '—'}</td><td className="l">{g.efetivo ? g.desenhos.map((d) => d.map((id) => b.vigas.find((v) => v.id === id)?.nome ?? id).join(' = ')).join('; ') : '—'}</td></tr>)}</tbody>
              </table>
            </>)}

            {(dim.rearme || !!b.copiasLaje?.length) && (<>
              {h2('Rearme e cópias de armadura')}
              {dim.rearme && <p data-memorial-rearme>Dimensionamento e detalhamento refeitos sobre a análise já feita, sem nova análise (modo “{dim.rearme.modo === 'alterados' ? 'alterados' : 'todos'}”), com os esforços da revisão de cálculo {dim.rearme.esforcosRev}.{dim.rearme.antigos ? ` As seções diferem das analisadas; elementos com a inércia variando mais de ${fmt(opc.rearmarLimiteRigidez, 0)} % têm o aviso de esforços antigos: ${dim.rearme.variacoes.map((x) => `${x.nome} (${x.variacao >= 0 ? '+' : '−'}${fmt(Math.abs(x.variacao) * 100, 0)} %)`).join(', ') || 'nenhum'}.` : ''}{dim.rearme.modo === 'alterados' ? ` Elementos refeitos: ${dim.rearme.refeitos.map((x) => `${x.nome} (${x.motivo})`).join(', ') || 'nenhum'}; ${dim.rearme.mantidos} mantido(s).${dim.rearme.global ? ` Todos entraram porque ${dim.rearme.global}.` : ''}` : ''}</p>}
              {!!b.copiasLaje?.length && <p data-memorial-copias>Cópias da armadura das lajes guardadas: {b.copiasLaje.map((c) => `“${c.nome}” (${c.lajes.length} laje(s)${c.data ? `, ${c.data}` : ''})`).join('; ')}.</p>}
            </>)}

            {h2('Cargas na fundação')}
            <table>
              <thead><tr><th>Pilar</th><th>Nk rara máx.</th><th>Nk rara mín.</th><th>N perm.</th><th>Hx</th><th>Hy</th><th>Mx</th><th>My</th><th>Combinação</th></tr></thead>
              <tbody>{dim.fundacao.map((f) => <tr key={f.id}><td className="l">{f.label}</td><td>{fmt(f.Nk, 1)}</td><td>{fmt(f.NkMin, 1)}</td><td>{fmt(f.NkPerm ?? f.Nk, 1)}</td><td>{fmt(f.Hx, 1)}</td><td>{fmt(f.Hy, 1)}</td><td>{fmt(f.Mx, 1)}</td><td>{fmt(f.My, 1)}</td><td className="l">{f.source?.replace('Edifício · ', '')}</td></tr>)}</tbody>
            </table>
            <p>Valores característicos (kN, kN·m). Nd das ELU na tabela da aba Análise.</p>

            {!!dim.fundacoes?.length && (<>
              {h2('Fundações')}
              <p>
                Elementos lançados no nível de fundação, calculados depois da estrutura com as cargas na base dos pilares (vínculo externo) pelo mesmo núcleo do módulo Fundações.
                Terreno: σadm {b.fundacao?.terreno.sigmaModo === 'sondagem' ? 'estimada pelo SPT (N̄/50 nas sapatas, N̄/30 nos tubulões; a confirmar)' : `informada, ${fmt(b.fundacao?.terreno.sigmaAdm ?? NaN, 0)} kN/m²`}
                {' '}(majoração com vento × {fmt(b.fundacao?.terreno.fatorVento ?? 1)}; a confirmar); cota do terreno {fmt(cotaTerreno(b))} m; {b.fundacao?.sondagens.length ?? 0} furo(s) de sondagem.
                {b.fundacao?.terreno.estacas.length ? ` Estacas: ${b.fundacao.terreno.estacas.map((e) => `${e.nome} (${e.modo === 'informada' ? `${fmt(e.capacidade ?? NaN, 0)} kN por estaca` : 'pela sondagem'})`).join('; ')}.` : ''}
              </p>
              <p>
                Geração automática (quando usada): distância de visão D = {fmt(opcoesEmUso(b.opcoes, perfilDe(b)).gerarDistVisao, 1)} m, ângulo de visão A = {fmt(opcoesEmUso(b.opcoes, perfilDe(b)).gerarAnguloVisao, 0)}°
                (cone de abertura total A), associação de pilares com bordas a menos de {fmt(opcoesEmUso(b.opcoes, perfilDe(b)).gerarDistAssociada, 1)} m, elemento de divisa com limite a menos de {fmt(opcoesEmUso(b.opcoes, perfilDe(b)).gerarDistLimite, 2)} m da face
                e bloco sobre estacas se σadm &lt; {fmt(opcoesEmUso(b.opcoes, perfilDe(b)).gerarSigmaMin, 0)} kN/m² (a confirmar); os elementos gerados são editáveis como os lançados à mão.
              </p>
              <table>
                <thead><tr><th className="l">Elemento</th><th className="l">Pilar</th><th className="l">Tipo</th><th>Cota (m)</th><th className="l">Dimensões</th><th>σadm (kN/m²)</th><th>Concreto (m³)</th><th className="l">Situação</th><th className="l">Mensagens</th></tr></thead>
                <tbody>{dim.fundacoes.map((f) => <tr key={f.id}><td className="l">{f.nome}</td><td className="l">{f.pilares.join(', ')}</td><td className="l">{TIPO_FUNDACAO_LABEL[f.tipo]} {POSICAO_LABEL[f.posicao]}</td><td>{fmt(f.cota)}</td><td className="l">{f.resumo.replace(`${f.nome}: `, '')}</td><td>{f.sigmaAdm !== undefined ? fmt(f.sigmaAdm, 0) : '—'}</td><td>{fmt(f.volume, 3)}</td><td className="l">{f.status === 'ok' ? 'atende' : 'não atende'}</td><td className="l">{[...f.mensagens, ...f.notas].join(' ')}</td></tr>)}</tbody>
              </table>
              {!!dim.vigasFundacao?.length && (<>
                <p>
                  Vigas de fundação (sem apoio no solo): as de equilíbrio centram o elemento excêntrico pela alavanca, R = N·ℓ/(ℓ − e), e aliviam a ponta oposta
                  ({fmt(opcoesEmUso(b.opcoes, perfilDe(b)).vigaEqAlivio, 0)} % do alívio no Nk; tração verificada com o alívio total e a carga mínima); tensões sob o elemento {opcoesEmUso(b.opcoes, perfilDe(b)).vigaEqDistribuicao ? 'trapezoidais (núcleo central)' : 'uniformes'}.
                  As de travamento dos blocos de 1 e 2 estacas recebem Nk × {fmt(opcoesEmUso(b.opcoes, perfilDe(b)).vigaTravExc, 0)} cm (excentricidade de execução, a confirmar). Peso próprio e cargas do nível de fundação
                  biapoiados entre os pilares; ELU = 1,4 × característico; dimensionamento como as vigas (NBR 6118, 17.3 e 17.4).
                </p>
                <table>
                  <thead><tr><th className="l">Viga</th><th className="l">Tipo</th><th className="l">Pontas</th><th>ℓ (m)</th><th>b × h (cm)</th><th>Alívio (kN)</th><th>Md sup./inf. (kN·m)</th><th>Vd (kN)</th><th className="l">Armadura</th><th className="l">Situação</th><th className="l">Mensagens</th></tr></thead>
                  <tbody>{dim.vigasFundacao.map((v) => <tr key={v.id}><td className="l">{v.nome}</td><td className="l">{v.tipo === 'equilibrio' ? 'equilíbrio' : 'travamento'}{v.equilibrio.ini || v.equilibrio.fim ? ` (${[v.equilibrio.ini && v.ini, v.equilibrio.fim && v.fim].filter(Boolean).join(', ')})` : ''}</td><td className="l">{v.ini}–{v.fim}</td><td>{fmt(v.L)}</td><td>{Math.round(v.bAdot * 100)} × {Math.round(v.hAdot * 100)}</td><td>{fmt(Math.max(v.alivio.ini, v.alivio.fim), 1)}</td><td>{fmt(v.Md.sup, 1)} / {fmt(v.Md.inf, 1)}</td><td>{fmt(v.Vd, 1)}</td><td className="l">{v.resumo.replace(/^[^:]*: /, '')}</td><td className="l">{v.status === 'ok' ? 'atende' : 'não atende'}</td><td className="l">{[...v.mensagens, ...v.notas].join(' ')}</td></tr>)}</tbody>
                </table>
              </>)}
              {dim.avisosFundacao?.map((a, i) => <p key={i}>{a}</p>)}
            </>)}

            {!!(dim.radiers?.length || dim.vigasElasticas?.length) && (<>
              {h2('Base elástica: radiers e vigas sobre base elástica')}
              <p>
                Radiers e vigas de fundação sobre base elástica (Winkler) incluídos no pórtico espacial: grelha do radier com malha de {fmt(opc.radierMalha)} m (rigidez à flexão e à torção das lajes maciças), barras das vigas com a seção b × h,
                molas verticais k × área de influência em cada nó (k padrão {fmt(opc.radierK, 0)} kN/m³, a confirmar) e os pilares que nascem sobre eles sem vínculo externo. Nós flutuantes com deslocamentos horizontais e giro em planta presos (a confirmar).
                Análise linear: mola tracionada não é iterada (erro de levantamento). Tensão no solo σ = k·w nas combinações raras contra a σadm; armadura do radier por Wood-Armer (ELU, faixa de 1 m) com ρmín 0,15 % por face; punção sob os pilares verificada pela NBR 6118, 19.5, com a reação do solo descontada dentro do contorno.
              </p>
              {!!dim.radiers?.length && <table data-memorial-radiers>
                <thead><tr><th className="l">Radier</th><th>h (cm)</th><th>Área (m²)</th><th>k (kN/m³)</th><th>σmáx (kN/m²)</th><th>σmín (kN/m²)</th><th>σadm (kN/m²)</th><th>Recalque (mm)</th><th>As inf. x/y (cm²/m)</th><th>As sup. x/y (cm²/m)</th><th className="l">Situação</th><th className="l">Mensagens</th></tr></thead>
                <tbody>{dim.radiers.map((x) => <tr key={x.id}><td className="l">{x.nome}</td><td>{fmt(x.h * 100, 0)}</td><td>{fmt(x.area, 1)}</td><td>{fmt(x.k, 0)}</td><td>{fmt(x.sigmaMax, 1)}</td><td>{fmt(x.sigmaMin, 1)}</td><td>{x.sigmaAdm ? fmt(x.sigmaAdm, 0) : '—'}</td><td>{fmt(x.recalque * 1000, 2)}</td><td>{fmt(x.As.pos[0])} / {fmt(x.As.pos[1])}</td><td>{fmt(x.As.neg[0])} / {fmt(x.As.neg[1])}</td><td className="l">{ST[x.status]}</td><td className="l">{x.mensagens.join(' ')}</td></tr>)}</tbody>
              </table>}
              {!!dim.radiers?.some((x) => x.puncao?.length) && <>
                <p>Punção sob os pilares dos radiers (NBR 6118, 19.5): combinação ELU de maior τSd em C′, FSd = força axial no pé do pilar, MSd = momentos no pé, reação do solo (pressão k·w média nos nós vizinhos) descontada dentro de cada contorno; armadura de flexão da face em contato com o solo.</p>
                <table data-memorial-puncao-radier>
                  <thead><tr><th className="l">Radier</th><th className="l">Pilar</th><th className="l">Apoio</th><th>FSd (kN)</th><th>MSd u / v (kN·m)</th><th>τSd (C) / τRd2</th><th>τSd (C′) / τRd1</th><th className="l">Armadura de punção</th><th className="l">Situação</th><th className="l">Combinação</th></tr></thead>
                  <tbody>{dim.radiers.flatMap((x) => (x.puncao ?? []).map((r) => (
                    <tr key={r.id}><td className="l">{x.nome}</td><td className="l">{r.nome}</td><td className="l">{r.tipo}</td><td>{fmt(r.F, 1)}</td><td>{fmt(r.M[0], 1)} / {fmt(r.M[1], 1)}</td><td className={r.contornos[0].ok ? undefined : 'bad'}>{fmt(r.contornos[0].tau, 3)} / {fmt(r.tauRd2, 3)}</td><td className={r.contornos[1].tau > r.tauRd1 + 1e-9 ? 'bad' : undefined}>{fmt(r.contornos[1].tau, 3)} / {fmt(r.tauRd1, 3)}</td>
                      <td className="l">{r.armadura ? `${r.armadura.linhas} linhas × ${r.armadura.barras} ${r.armadura.tipo === 'estribo' ? 'estribos' : 'conectores'} φ${String(r.armadura.phi).replace('.', ',')}` : '—'}</td><td className="l">{r.status === 'ok' ? 'sem armadura' : r.status === 'armadura' ? 'com armadura' : 'não atende'}</td><td className="l">{r.combinacao}</td></tr>
                  )))}</tbody>
                </table>
              </>}
              {!!dim.vigasElasticas?.length && <table data-memorial-vigas-elasticas>
                <thead><tr><th className="l">Viga</th><th>b × h (cm)</th><th>L (m)</th><th>k (kN/m³)</th><th>σmáx (kN/m²)</th><th>σadm (kN/m²)</th><th>Recalque (mm)</th><th>Md inf./sup. (kN·m)</th><th>Vd (kN)</th><th className="l">Armadura</th><th className="l">Situação</th><th className="l">Mensagens</th></tr></thead>
                <tbody>{dim.vigasElasticas.map((x) => { const a = x.armadura, t = (q: { n: number; phi: number } | null) => (q ? `${q.n} φ${fmt(q.phi, 1)}` : '—'); return <tr key={x.id}><td className="l">{x.nome}</td><td>{Math.round(x.b * 100)} × {Math.round(x.h * 100)}</td><td>{fmt(x.L)}</td><td>{fmt(x.k, 0)}</td><td>{fmt(x.sigmaMax, 1)}</td><td>{x.sigmaAdm ? fmt(x.sigmaAdm, 0) : '—'}</td><td>{fmt(x.recalque * 1000, 2)}</td><td>{fmt(x.Md.inf, 1)} / {fmt(x.Md.sup, 1)}</td><td>{fmt(x.Vd, 1)}</td><td className="l">inf. {t(a.inf.barras)}; sup. {t(a.sup.barras)}{a.estribo ? `; estribo φ${fmt(a.estribo.phi, 1)} c/${Math.round(a.estribo.s * 100)}` : ''}</td><td className="l">{ST[x.status]}</td><td className="l">{x.mensagens.join(' ')}</td></tr>; })}</tbody>
              </table>}
              <p>Tabela orientativa do coeficiente de reação vertical (Bowles, 1996; a confirmar com o geotécnico): {TABELA_K.map((x) => `${x.solo.toLowerCase()} ${fmt(x.min / 1000, 0)}–${fmt(x.max / 1000, 0)} MN/m³`).join('; ')}.</p>
            </>)}

            {!!dim.corridas?.length && (<>
              {h2('Sapatas corridas')}
              <p>
                Sapatas corridas lançadas por polilinha sob parede (sem pilares sobre o eixo) ou sob pilares. Sob parede: a carga por metro é a maior soma, em janelas de {fmt(opc.corridaJanela)} m ao longo do eixo, das cargas do nível de fundação sobre ela, nas combinações raras;
                a largura B sai da σadm (passos de 5 cm, com o peso próprio, pressão sem tração e área comprimida mínima), a altura da rigidez (balanço ≤ 1,5·h) e a flexão transversal da aba, numa faixa de 1 m, do CEB-70 com a seção de referência a {fmt(opc.corridaRefConcreto, 0)} % de bw dentro da face
                ({fmt(opc.corridaRefAlvenaria, 0)} % em alvenaria), com ρmín e armadura de distribuição mínima de {fmt(opc.corridaDistribuicao, 0)} % da principal (a confirmar). Sob pilares: viga sobre base elástica na análise global (k padrão {fmt(opc.radierK, 0)} kN/m³, a confirmar),
                seção em T invertido, e flexão transversal da aba com a pressão máxima do solo. Aba de um lado só: apoio rente à divisa; o momento N·e vai para as vigas de equilíbrio (cintas): cada cinta toma o momento do seu trecho tributário (R = N·ℓ/(ℓ − e), reação sob a base majorada por R/N) e alivia o elemento interno da ponta (50 %, opção das vigas de fundação).
              </p>
              <table data-memorial-corridas>
                <thead><tr><th className="l">Sapata</th><th className="l">Modo</th><th>L (m)</th><th>B (cm)</th><th>bw (cm)</th><th>h / h0 (cm)</th><th>Nk (kN/m)</th><th>σmáx (kN/m²)</th><th>σadm (kN/m²)</th><th>Md (kN·m/m)</th><th className="l">Transversal</th><th className="l">Distribuição</th><th>Concreto (m³)</th><th className="l">Situação</th><th className="l">Mensagens</th></tr></thead>
                <tbody>{dim.corridas.map((x) => <tr key={x.id}><td className="l">{x.nome}</td><td className="l">{x.modo === 'pilares' ? 'sob pilares' : 'sob parede'}</td><td>{fmt(x.L)}</td><td>{fmt(x.B * 100, 0)}</td><td>{fmt(x.bw * 100, 0)}</td><td>{fmt(x.h * 100, 0)} / {fmt(x.h0 * 100, 0)}</td>
                  <td>{x.carga ? fmt(x.carga.Nk, 1) : '—'}</td><td>{x.pressao ? fmt(x.pressao.sigmaMax, 1) : '—'}</td><td>{x.sigmaAdm ? fmt(x.sigmaAdm, 0) : '—'}</td><td>{x.transversal ? fmt(x.transversal.Md, 1) : '—'}</td>
                  <td className="l">{x.transversal?.barras ? `φ${fmt(x.transversal.barras.phi, 1)} c/${Math.round(x.transversal.barras.s * 100)}` : '—'}</td><td className="l">{x.transversal?.distribuicao.barras ? `φ${fmt(x.transversal.distribuicao.barras.phi, 1)} c/${Math.round(x.transversal.distribuicao.barras.s * 100)}` : '—'}</td>
                  <td>{fmt(x.volume, 2)}</td><td className="l">{ST[x.status]}</td><td className="l">{x.mensagens.join(' ')}</td></tr>)}</tbody>
              </table>
              {dim.corridas.some((x) => x.cintas?.length) && <table data-memorial-cintas>
                <thead><tr><th className="l">Cinta</th><th className="l">Sapata corrida</th><th>s (m)</th><th>Trecho (m)</th><th>ℓ (m)</th><th>N (kN)</th><th>R = N·ℓ/(ℓ − e) (kN)</th><th>e (m)</th><th>Alívio ΔN (kN)</th><th>b × h (cm)</th><th>Md sup./inf. (kN·m)</th><th>Vd (kN)</th><th className="l">Armadura</th><th className="l">Situação</th></tr></thead>
                <tbody>{dim.corridas.flatMap((x) => (x.cintas ?? []).map((ct) => <tr key={ct.id}><td className="l">{ct.nome}</td><td className="l">{x.nome}</td><td>{fmt(ct.s)}</td><td>{fmt(ct.tributario[0])}–{fmt(ct.tributario[1])}</td><td>{fmt(ct.L)}</td><td>{fmt(ct.N, 1)}</td><td>{fmt(ct.R, 1)}</td><td>{fmt(ct.e)}</td><td>{fmt(ct.dN, 1)}</td><td>{Math.round(ct.bAdot * 100)} × {Math.round(ct.hAdot * 100)}</td><td>{fmt(ct.Md.sup, 1)} / {fmt(ct.Md.inf, 1)}</td><td>{fmt(ct.Vd, 1)}</td><td className="l">{ct.resumo}</td><td className="l">{ST[ct.status]}</td></tr>))}</tbody>
              </table>}
            </>)}

            {!!dim.corridas?.some((x) => x.parede) && (<>
              <p>
                Sapatas de parede e de muro (FU7b): a base da parede cria a sapata corrida vinculada ao eixo e à espessura da parede. A carga por metro vem das reações da base da parede na análise (normal, momento em torno do eixo e cortante normal à parede,
                por caso, espalhadas em janelas de {fmt(opc.corridaJanela)} m) mais as cargas lançadas no nível de fundação; o momento vira excentricidade M/(N + peso próprio) somada à geométrica no sentido desfavorável (pressão sem tração);
                o deslizamento é FS = μ·(N + peso próprio)/H nas combinações raras, com μ = {fmt(opc.fundCorridaAtrito)} e FS mínimo {fmt(opc.fundCorridaFSDesliz, 1)} ({opc.fundCorridaDeslizamento === 1 ? 'reprova' : 'só informa'}), sem empuxo passivo (a confirmar).
                Pilares que nascem na fundação sobre o eixo viram sapata isolada equivalente a × a, (Pk + q·a)(1 + 5 %) ≤ σadm(a)·a², e a reação é espalhada por a metros no eixo.
              </p>
              <table data-memorial-corridas-parede>
                <thead><tr><th className="l">Sapata</th><th className="l">Parede</th><th className="l">Cargas</th><th>M máx. (kN·m/m)</th><th>e = M/N (cm)</th><th>H máx. (kN/m)</th><th>μ</th><th>FS desliz. (mín.)</th><th className="l">Pilares sobre o eixo (a × a)</th></tr></thead>
                <tbody>{dim.corridas.filter((x) => x.parede).map((x) => <tr key={x.id}><td className="l">{x.nome}</td><td className="l">{x.parede!.nome}</td><td className="l">{x.parede!.origem === 'reacoes' ? 'reações da análise' : 'só lançadas'}</td><td>{fmt(x.parede!.M, 1)}</td><td>{fmt(x.parede!.eM * 100, 0)}</td><td>{fmt(x.parede!.H, 1)}</td><td>{x.parede!.deslizamento ? fmt(x.parede!.deslizamento.mu) : '—'}</td><td>{x.parede!.deslizamento ? `${fmt(x.parede!.deslizamento.FS)} (${fmt(x.parede!.deslizamento.FSmin, 1)})` : '—'}</td><td className="l">{(x.parede!.pilaresEq ?? []).map((q) => `${q.pilar} ${fmt(q.a)} × ${fmt(q.a)} m`).join('; ') || '—'}</td></tr>)}</tbody>
              </table>
            </>)}
            {!!dim.basesMuros?.length && (<>
              {h2('Bases dos muros de arrimo na fundação')}
              <p>A σadm da base do muro é a própria, ou a informada do terreno, ou a menor estimada pelo SPT de todos os furos com a largura B do muro (o muro não tem posição em planta); a tensão máxima é a da estabilidade (rara, por metro, com a sobrecarga). Quantitativos da base: ponta, talão e distribuição; totais com o comprimento do muro.</p>
              <table data-memorial-bases-muros>
                <thead><tr><th className="l">Muro</th><th>B (m)</th><th>Cota (m)</th><th>df (m)</th><th>σmáx (kN/m²)</th><th>σadm (kN/m²)</th><th className="l">Fonte</th><th>Concreto (m³/m)</th><th>Forma (m²/m)</th><th>Aço (kg/m)</th><th>Comprimento (m)</th><th className="l">Situação</th><th className="l">Mensagens</th></tr></thead>
                <tbody>{dim.basesMuros.map((x) => <tr key={x.id}><td className="l">{x.nome}</td><td>{fmt(x.B)}</td><td>{fmt(x.cota)}</td><td>{fmt(x.profundidade)}</td><td>{fmt(x.sigmaMax, 1)}</td><td>{x.sigmaAdm !== null ? fmt(x.sigmaAdm, 0) : '—'}</td><td className="l">{x.sigmaFonte === 'propria' ? 'própria' : x.sigmaFonte === 'terreno' ? 'terreno' : x.sigmaFonte === 'spt' ? 'SPT (menor furo)' : '—'}</td><td>{fmt(x.porMetro.concreto)}</td><td>{fmt(x.porMetro.forma)}</td><td>{fmt(x.porMetro.aco, 1)}</td><td>{x.comprimento !== null ? fmt(x.comprimento) : '—'}</td><td className="l">{ST[x.status]}</td><td className="l">{x.mensagens.join(' ')}</td></tr>)}</tbody>
              </table>
            </>)}

            {quantFund && quantFund.linhas.length > 0 && (<>
              {h2('Quantitativos da fundação')}
              <table data-memorial-quant-fundacao>
                <thead><tr><th className="l">Elementos</th><th className="l">Tipo</th><th>Quant.</th><th>Concreto (m³)</th><th>Fôrma (m²)</th><th>Aço (kg)</th></tr></thead>
                <tbody>
                  {quantFund.linhas.map((l, k) => <tr key={k}><td className="l">{l.nomes.join(', ')}</td><td className="l">{l.tipo}</td><td>{l.quant}</td><td>{fmt(l.concreto, 3)}</td><td>{fmt(l.forma, 2)}</td><td>{fmt(l.aco, 1)}</td></tr>)}
                  <tr><td className="l"><b>Total</b></td><td /><td /><td><b>{fmt(quantFund.linhas.reduce((t, l) => t + l.concreto, 0), 3)}</b></td><td><b>{fmt(quantFund.linhas.reduce((t, l) => t + l.forma, 0), 2)}</b></td><td><b>{fmt(quantFund.linhas.reduce((t, l) => t + l.aco, 0), 1)}</b></td></tr>
                </tbody>
              </table>
              {quantFund.estacas.length > 0 && <p>Estacas: {quantFund.estacas.map((e) => `${e.quant} × ${e.nome}${e.L ? ` (L = ${fmt(e.L, 1)} m)` : ''}`).join('; ')}.</p>}
              <p>Aço pela soma das posições desenhadas nas folhas de fundação (sem perdas); concreto das vigas de fundação entre as faces dos pilares; fôrma lateral, fundo sobre o lastro (a confirmar).</p>
            </>)}

            {h2('Quantitativos')}
            <table>
              <thead><tr><th>Pavimento</th><th>Concreto (m³)</th><th>Fôrma (m²)</th><th>Aço estimado (kg)</th></tr></thead>
              <tbody>
                {dim.quantitativos.map((q) => <tr key={q.pavimento}><td className="l">{q.pavimento}</td><td>{fmt(q.concreto.lajes + q.concreto.vigas + q.concreto.pilares)}</td><td>{fmt(q.forma.lajes + q.forma.vigas + q.forma.pilares, 1)}</td><td>{fmt(q.aco, 0)}</td></tr>)}
                {totQ && <tr><td className="l"><b>Total</b></td><td><b>{fmt(totQ.c)}</b></td><td><b>{fmt(totQ.f, 1)}</b></td><td><b>{fmt(totQ.a, 0)}</b></td></tr>}
              </tbody>
            </table>
            <p>Aço estimado por taxas: lajes {TAXAS.lajes}, vigas {TAXAS.vigas} e pilares {TAXAS.pilares} kg/m³ (a confirmar).</p>
            <MemorialQuantitativosDetalhados b={b} dim={dim} />
            {eluDet && <MemorialEluPorCombinacao dim={dim} h2={h2} />}
          </>)}

          {h2('Tabelas normativas em uso')}
          <p>Biblioteca de normas da obra: tabelas que o cálculo lê, com a edição, a fonte e a origem (de fábrica ou alterada pelo projetista).</p>
          <table className="quadro" data-memorial-normas>
            <thead><tr><th>Tabela</th><th>Norma e edição</th><th>Fonte</th><th>Origem</th></tr></thead>
            <tbody>{normasNoMemorial(b).map((n) => <tr key={n.id}><td className="l">{n.titulo}</td><td className="l">{n.edicao}</td><td className="l">{n.fonte}{n.aConfirmar ? ' [a confirmar]' : ''}</td><td className="l">{n.origem}{n.nota ? ` (${n.nota})` : ''}</td></tr>)}</tbody>
          </table>

          {fichasNoMemorial(b).length > 0 && (<>
            {h2('Fichas de vigotas usadas')}
            <p>Dados de ficha são do fabricante e não são verificados pelo programa, que só confere a coerência lógica. Peso por m² = capa + nervuras + enchimento, calculado (ou o informado na ficha).</p>
            {fichasNoMemorial(b).map((f) => (
              <table key={f.id} className="quadro" data-memorial-ficha={f.id}>
                <caption>{f.nome} ({f.familia}; {f.origem}) — {f.marca}</caption>
                <thead><tr><th>Laje</th><th>h (cm)</th><th>Intereixo (cm)</th><th>Capa (cm)</th><th>Nervura (cm)</th><th>Peso (kN/m²)</th><th>Mu+ (kN·m)</th><th>Mfis+ (kN·m)</th><th>VRd1 (kN)</th><th>Usada</th></tr></thead>
                <tbody>{f.series.map((s) => <tr key={s.id}><td className="l">{s.id}{s.tipo ? ` (${s.tipo})` : ''}</td><td>{fmt(s.altura * 100, 0)}</td><td>{fmt(s.intereixo * 100, 0)}</td><td>{fmt(s.capa * 100, 1)}</td><td>{fmt(s.bw * 100, 1)}</td><td>{fmt(s.pp, 2)}</td><td>{s.Mu === undefined ? '—' : fmt(s.Mu, 2)}</td><td>{s.Mfis === undefined ? '—' : fmt(s.Mfis, 2)}</td><td>{s.VRd1 === undefined ? '—' : fmt(s.VRd1, 2)}</td><td>{s.usada ? 'sim' : ''}</td></tr>)}</tbody>
              </table>
            ))}
          </>)}

          {h2('Premissas', true)}
          <ul>{PREMISSAS.map((p) => <li key={p.id}><b>{p.tema}.</b> {p.texto} <i>({p.fonte}{p.aConfirmar ? '; a confirmar' : ''})</i></li>)}</ul>
          {guia && <MemorialGuia h2={h2} />}
          <p className="small">Resultados de ferramenta de apoio ao projeto: a responsabilidade pela concepção, verificação e detalhamento é do engenheiro responsável.</p>
        </div>
      </div>
    </div>
  );
}
