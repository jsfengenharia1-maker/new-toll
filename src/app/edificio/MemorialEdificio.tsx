// Memorial de cálculo do edifício: identificação, materiais, geometria, ações, modelo, estabilidade,
// dimensionamento, cargas na fundação, quantitativos e premissas. Mesmo CSS e impressão do memorial do pórtico.
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useBuilding } from './store';
import { useStore } from '../store';
import { APP_PRINT_CSS, MEMO_CSS, memoPrintCss, printHtmlDoc } from '../Memorial';
import { memo } from '../design/tokens';
import { OPCOES_INFO, opcoesAlteradas, opcoesEmUso, vinculosAlterados } from '../../core/building/opcoes';
import { acoDe, cobrimentoLaje, cobrimentoViga, fckDe, gamas } from '../../core/building/materiais';
import { Button, download, Spacer } from '../ui';
import { resumoAnalise } from '../../core/building/resumo';
import { PREMISSAS, TAXAS } from '../../core/building/premissas';

import { cotaFundacao, pavimentosOrdenados, peDireito, USOS, VENTO_PADRAO } from '../../core/building/types';
import { svgPlantaGrupo } from './desenhoMemorial';

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
  const opc = analise?.opcoes ?? opcoesEmUso(b.opcoes);
  const vinculos = useMemo(() => vinculosAlterados(b), [b]);
  const ps = pavimentosOrdenados(b);
  const v = b.vento ?? VENTO_PADRAO;
  const psi = b.norma.psiQ ?? [0.5, 0.4, 0.3];
  const falhas = new Set([...(dim?.vigas ?? []).filter((x) => x.status !== 'ok').map((x) => x.viga), ...(dim?.pilares ?? []).filter((x) => x.status === 'fail').map((x) => x.pilar)]);
  const nome = b.obra.nome || 'Edifício';

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
          <p>Vento: {v.ativo ? `V0 = ${fmt(v.v0, 0)} m/s, S1 = ${fmt(v.s1)}, S3 = ${fmt(v.s3)}, categoria ${v.categoria}, Ca = ${fmt(v.caX)} (X) / ${fmt(v.caY)} (Y), excentricidade ${fmt(v.excentricidade, 3)} × largura${r?.vento ? `, classe ${r.vento.classe} (altura ${fmt(r.vento.altura, 1)} m)` : ''}.` : 'não considerado.'}</p>

          {h2('Modelo de análise')}
          <p>Análise linear. Grelha de lajes e vigas por pavimento (malha {fmt(opc.malha)} m) e pórtico espacial com diafragma rígido por pavimento; as forças das lajes nas vigas entram no pórtico como cargas concentradas. Pilares engastados na fundação.{r && !r.erro ? ` ${r.gdl} graus de liberdade; ${r.combinacoes} combinações. Equilíbrio (reações − cargas): G ${fmt(r.equilibrio.G, 3)} kN, Q ${fmt(r.equilibrio.Q, 3)} kN.` : ''}</p>
          <h3>Opções de cálculo</h3>
          <table>
            <thead><tr><th className="l">Opção</th><th>Valor</th><th>Padrão</th><th className="l">Fonte</th></tr></thead>
            <tbody>{OPCOES_INFO.map((o) => { const alt = opc[o.chave] !== o.padrao; return <tr key={o.chave}><td className="l">{o.rotulo}{o.unidade ? ` (${o.unidade})` : ''}</td><td className={alt ? 'warn' : undefined}>{fmt(opc[o.chave])}</td><td>{fmt(o.padrao)}</td><td className="l">{o.fonte}{o.aConfirmar ? '; a confirmar' : ''}</td></tr>; })}</tbody>
          </table>
          {vinculos.length > 0 && <><h3>Vínculos e engastes alterados por elemento</h3><ul>{vinculos.map((t, i) => <li key={i}>{t}</li>)}</ul></>}
          {opcoesAlteradas(b.opcoes).length > 0 && <p className="warn">Opções diferentes do padrão: {opcoesAlteradas(b.opcoes).map((o) => o.rotulo.toLowerCase()).join('; ')}.</p>}
          {r?.erro && <p className="warn">{r.erro}</p>}
          {r && r.avisos.length > 0 && <ul>{r.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>}

          {r?.vento && (<>
            {h2('Estabilidade global')}
            <table>
              <thead><tr><th>Direção</th><th>γz</th><th>Vento nas ELU ×</th></tr></thead>
              <tbody>{r.vento.gamaZ.map((g) => <tr key={g.direcao}><td>{g.direcao}°</td><td>{fmt(g.gamaZ, 3)}</td><td>{fmt(g.ampliacaoVento, 3)}</td></tr>)}</tbody>
            </table>
            <p>γz com rigidez reduzida (vigas 0,4·Eci·Ic; pilares 0,8·Eci·Ic). Entre 1,1 e 1,3, o vento das ELU é majorado por 0,95·γz.</p>
          </>)}

          {dim && (<>
            {h2('Dimensionamento das vigas', true)}
            <table>
              <thead><tr><th>Viga</th><th>b×h (cm)</th><th>M+ (kN·m)</th><th>M− (kN·m)</th><th>V (kN)</th><th>Inferior</th><th>Superior</th><th>Estribo</th><th>Situação</th></tr></thead>
              <tbody>{dim.vigas.map((x) => <tr key={x.viga}><td className="l">{x.nome}</td><td>{Math.round(x.b * 100)}×{Math.round(x.h * 100)}</td><td>{fmt(x.Mpos, 1)}</td><td>{fmt(x.Mneg, 1)}</td><td>{fmt(x.V, 1)}</td><td>{x.barrasInf}</td><td>{x.barrasSup}</td><td>{x.estribo}</td><td>{ST[x.status]}</td></tr>)}</tbody>
            </table>
            {h2('Dimensionamento dos pilares')}
            <table>
              <thead><tr><th>Pilar</th><th>Lance</th><th>Seção (cm)</th><th>Nd (kN)</th><th>ℓe (b / h, m)</th><th>λ (b / h)</th><th>Armadura</th><th>Estribo</th><th>Uso</th><th>Situação</th></tr></thead>
              <tbody>{dim.pilares.map((x) => <tr key={`${x.pilar}-${x.pavimento}`}><td className="l">{x.nome}</td><td className="l">{x.pavimento}</td><td>{x.secao}</td><td>{fmt(x.Nd, 0)}</td><td>{fmt(x.le[0])} / {fmt(x.le[1])}</td><td>{fmt(x.lambda[0], 0)} / {fmt(x.lambda[1], 0)}</td><td>{x.armadura}</td><td>{x.estribo}</td><td>{x.util >= 99 ? '>1' : fmt(x.util)}</td><td>{ST[x.status]}</td></tr>)}</tbody>
            </table>
            {h2('Lajes')}
            <table>
              <thead><tr><th>Laje</th><th>Pavimento</th><th>Tipo</th><th>As+ (cm²/m)</th><th>As− (cm²/m)</th><th>Flecha (mm)</th><th>Limite (mm)</th><th>Situação</th></tr></thead>
              <tbody>{dim.lajes.map((x) => <tr key={`${x.laje}-${x.pavimento}`}><td className="l">{x.nome}</td><td className="l">{x.pavimento}</td><td className="l">{x.tipo}</td><td>{fmt(x.As.pos[0])} / {fmt(x.As.pos[1])}</td><td>{fmt(x.As.neg[0])} / {fmt(x.As.neg[1])}</td><td>{fmt(x.flecha * 1000, 1)}</td><td>{fmt(x.limite * 1000, 1)}</td><td>{ST[x.status]}</td></tr>)}</tbody>
            </table>
            {[...dim.vigas, ...dim.pilares, ...dim.lajes].some((x) => x.mensagens.length) && (
              <ul>{[...dim.vigas.map((x) => [x.nome, x.mensagens] as const), ...dim.pilares.map((x) => [`${x.nome} (${x.pavimento})`, x.mensagens] as const), ...dim.lajes.map((x) => [`${x.nome} (${x.pavimento})`, x.mensagens] as const)].filter(([, m]) => m.length).map(([n, m], i) => <li key={i}><b>{n}:</b> {m.join(' ')}</li>)}</ul>
            )}

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
