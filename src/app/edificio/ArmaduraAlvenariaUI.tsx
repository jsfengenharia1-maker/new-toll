// Janela da parede de alvenaria ou de blocos (frente E1e): verificação por pano, pontos fora das tensões-limite,
// trechos curtos, aberturas com verga, quantitativo, pilares em contato e mensagens. Regras em core/building/alvenariaLista.ts.
import { useState } from 'react';
import { Button, Hint, NumField, Pill, Select } from '../ui';
import {
  BITOLAS_ALV_VERTICAL, BITOLAS_ESTRIBO_VERGA, aberturasBlocosDoMesmoTipo, armaduraVergaDoForm, formDaVerga, linhasDesligamentos,
  linhasLadosAlv, linhasPanosAlv, linhasPontosAlv, linhasQuantitativo, linhasVergas, linhasVigasMuro, mensagensAlv, paramsVergaEditar,
  resumoCartaoAlv, type FormVerga,
} from '../../core/building/alvenariaLista';
import { useBuilding } from './store';
import { executarERecalcular } from './Armadura';

export function AlvenariaDaParede({ id }: { id: string }) {
  const dim = useBuilding((s) => s.dim);
  const b = useBuilding((s) => s.sessao.modelo);
  const r = dim?.alvenaria?.paredes.find((x) => x.id === id);
  const w = b.paredes?.find((x) => x.id === id);
  const panos = r ? linhasPanosAlv(r) : [];
  const vergas = r ? linhasVergas(r) : [];
  const [sel, setSel] = useState<string>(panos[0]?.chave ?? '');
  const [selV, setSelV] = useState<string>(vergas[0]?.id ?? '');
  const [fv, setFv] = useState<FormVerga | null>(null);

  if (!r || !w || !dim?.alvenaria) return <Hint>Calcule o dimensionamento para ver a verificação da alvenaria.</Hint>;
  const al = dim.alvenaria;
  const rc = resumoCartaoAlv(r);
  const pontos = linhasPontosAlv(r);
  const lados = linhasLadosAlv(r);
  const quant = linhasQuantitativo(r);
  const desl = linhasDesligamentos(al, id);
  const vigas = linhasVigasMuro(al, id);
  const msgs = mensagensAlv(r);
  const linhaSel = vergas.find((v) => v.id === selV) ?? vergas[0];
  const atual: FormVerga = fv ?? formDaVerga(linhaSel?.armadura);

  return (
    <div data-alv-parede={id}>
      <h4>Verificação por pano</h4>
      <p className="small" data-alv-situacao>
        <Pill tone={rc.status === 'ok' ? 'ok' : 'bad'}>{rc.situacao}</Pill> {rc.material} · {rc.armada} · {rc.panos} pano(s) · cumprimento mínimo {rc.cumprimentoMin} · {rc.blocos} peças
      </p>
      <table className="data quadro" data-alv-panos>
        <thead>
          <tr>
            <th className="tl">Trecho</th><th className="tl">Lance</th><th className="num">Pano</th><th className="num">s (m)</th><th className="num">λ</th>
            <th className="tl">Utilização compressão / tração / cisalhamento</th><th className="num">Cumprimento</th><th className="tl">Pior combinação</th>
            {r.armada && <th className="tl">Vertical</th>}
            {r.armada && <th className="tl">Horizontal</th>}
            {r.armada && <th className="tl">Origem</th>}
            <th className="tl">Situação</th>
          </tr>
        </thead>
        <tbody>
          {panos.map((l) => (
            <tr key={l.chave} data-chave={l.chave} aria-selected={sel === l.chave} className={l.status === 'fail' ? 'bad' : undefined} onClick={() => setSel(l.chave)}>
              <td className="tl">{l.trecho}</td><td className="tl">{l.lance}</td><td className="num">{l.pano + 1}</td><td className="num">{l.intervalo}</td><td className="num">{l.esbeltez}</td>
              <td className="tl">{l.utilizacao}</td><td className="num">{l.cumprimento}</td><td className="tl">{l.governa}</td>
              {r.armada && <td className="tl">{l.vertical}</td>}
              {r.armada && <td className="tl">{l.horizontal}</td>}
              {r.armada && <td className="tl">{l.origem}</td>}
              <td className="tl">{l.situacao}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <details data-alv-pontos>
        <summary>Pontos fora das tensões-limite ({pontos.length})</summary>
        {pontos.length === 0 ? <p className="muted">Todos os pontos atendem.</p> : (
          <table className="data quadro" data-alv-pontos-lista>
            <thead><tr><th className="tl">Trecho</th><th className="tl">Lance</th><th className="tl">Ponto (s; z) m</th><th className="num">Área (m²)</th><th className="tl">Limite excedido</th><th className="num">Utilização</th><th className="tl">Combinação</th></tr></thead>
            <tbody>
              {pontos.map((p, i) => (
                <tr key={i}><td className="tl">{p.trecho}</td><td className="tl">{p.lance}</td><td className="tl">{p.ponto}</td><td className="num">{p.area}</td><td className="tl">{p.limite}</td><td className="num">{p.utilizacao}</td><td className="tl">{p.combinacao}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </details>
      <Hint>Fator de cumprimento: fração da área do pano que atende compressão, tração (10 % da compressão) e cisalhamento (opção 'Alvenaria: fator de cumprimento'); o que passa dela é aviso no relatório.</Hint>

      {lados.length > 0 && (
        <>
          <h4>Trechos curtos (pilares de alvenaria)</h4>
          <table className="data quadro" data-alv-lados>
            <thead><tr><th className="tl">Trecho</th><th className="tl">Lance</th><th className="num">Comprimento (cm)</th><th className="num">λ</th><th className="num">Utilização</th><th className="tl">Combinação</th><th className="tl">Situação</th></tr></thead>
            <tbody>
              {lados.map((l, i) => (
                <tr key={i}><td className="tl">{l.trecho}</td><td className="tl">{l.lance}</td><td className="num">{l.comprimento}</td><td className="num">{l.esbeltez}</td><td className="num">{l.utilizacao}</td><td className="tl">{l.combinacao}</td><td className="tl">{l.situacao}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {w.tipo === 'blocos' ? (
        <>
          <h4>Aberturas: modulação e verga</h4>
          <Button disabled={!w.aberturas?.length} onClick={() => executarERecalcular('parede.modularAbertura', { parede: id })}>Ajustar aberturas à modulação</Button>
          {vergas.length === 0 ? <p className="muted">Sem aberturas nesta parede.</p> : (
            <>
              <table className="data quadro" data-alv-vergas>
                <thead>
                  <tr>
                    <th className="tl">Tipo</th><th className="tl">Lance</th><th className="tl">Largura × altura</th><th className="tl">Modular</th><th className="tl">Necessária verga / contraverga</th>
                    <th className="tl">Verga</th><th className="tl">Contraverga</th><th className="tl">Estribo</th><th className="tl">Cortante V / VRd</th><th className="tl">Origem</th><th className="tl">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {vergas.map((l) => (
                    <tr key={l.id} data-id={l.id} aria-selected={selV === l.id} className={l.status === 'fail' ? 'bad' : undefined} onClick={() => { setSelV(l.id); setFv(null); }}>
                      <td className="tl">{l.tipo}</td><td className="tl">{l.lance}</td><td className="tl">{l.dimensoes}</td><td className="tl">{l.modular}</td><td className="tl">{l.necessaria}</td>
                      <td className="tl">{l.verga}</td><td className="tl">{l.contraverga}</td><td className="tl">{l.estribo}</td><td className="tl">{l.cortante}</td><td className="tl">{l.origem}</td><td className="tl">{l.situacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {linhaSel && (
                <div className="row wrap" data-alv-editor-verga>
                  <NumField label="Verga: n" width={80} value={atual.n} onChange={(v) => setFv({ ...atual, n: v })} />
                  <Select label="Verga: φ" value={atual.phi} options={BITOLAS_ALV_VERTICAL.map((p) => ({ v: p, label: String(p).replace('.', ',') }))} onChange={(v) => setFv({ ...atual, phi: v })} />
                  <Select label="Estribo da verga: φ" value={atual.estriboPhi} options={BITOLAS_ESTRIBO_VERGA.map((p) => ({ v: p, label: String(p).replace('.', ',') }))} onChange={(v) => setFv({ ...atual, estriboPhi: v })} />
                  <NumField label="Estribo da verga: s" unit="cm" width={90} value={atual.estriboSCm} onChange={(v) => setFv({ ...atual, estriboSCm: v })} />
                  {linhaSel.tipo === 'janela' && (
                    <>
                      <NumField label="Contraverga: n" width={80} value={atual.contravergaN} onChange={(v) => setFv({ ...atual, contravergaN: v })} />
                      <Select label="Contraverga: φ" value={atual.contravergaPhi} options={BITOLAS_ALV_VERTICAL.map((p) => ({ v: p, label: String(p).replace('.', ',') }))} onChange={(v) => setFv({ ...atual, contravergaPhi: v })} />
                    </>
                  )}
                  <Button onClick={() => executarERecalcular('verga.armadura', paramsVergaEditar(selV, atual, linhaSel.tipo))}>Bloquear verga</Button>
                  <Button disabled={linhaSel.origem !== 'bloqueada' || aberturasBlocosDoMesmoTipo(b, selV).length === 0} onClick={() => executarERecalcular('verga.armadura', { acao: 'copiar', de: selV, para: aberturasBlocosDoMesmoTipo(b, selV) })}>Copiar verga para as de mesmo tipo</Button>
                  <Button onClick={() => executarERecalcular('verga.armadura', { acao: 'padrao', tipo: linhaSel.tipo, armadura: armaduraVergaDoForm(atual, linhaSel.tipo) })}>Definir como padrão do tipo</Button>
                  <Button onClick={() => executarERecalcular('verga.armadura', { acao: 'limpar', abertura: selV })}>Limpar verga</Button>
                </div>
              )}
              <Hint>Verga na canaleta grauteada, calculada pela faixa de parede acima da abertura; a verga bloqueada é verificada, não redimensionada. Em muro de subsolo não há aviso de biela.</Hint>
            </>
          )}
        </>
      ) : (
        <Hint>Alvenaria genérica: não há verga calculada nem modulação.</Hint>
      )}

      {r.quantitativo && (
        <>
          <h4>Quantitativo de blocos</h4>
          <table className="data quadro" data-alv-quant>
            <thead><tr><th className="tl">Lance</th><th className="num">Fiadas</th><th className="num">Inteiros</th><th className="num">Meios blocos</th><th className="num">Peças de canto</th><th className="num">Canaletas</th><th className="num">Total</th><th className="num">Área líquida (m²)</th></tr></thead>
            <tbody>
              {quant.map((q, i) => {
                const t = q.lance === 'Total';
                const c = (v: string) => (t ? <b>{v}</b> : v);
                return (
                  <tr key={i}><td className="tl">{c(q.lance)}</td><td className="num">{c(q.fiadas)}</td><td className="num">{c(q.inteiros)}</td><td className="num">{c(q.meios)}</td><td className="num">{c(q.cantos)}</td><td className="num">{c(q.canaletas)}</td><td className="num">{c(q.total)}</td><td className="num">{c(q.area)}</td></tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      <h4>Pilares em contato com o muro</h4>
      {desl.length === 0 ? <p className="muted">Nenhum pilar em contato com esta parede.</p> : (
        <table className="data quadro" data-alv-desligamentos>
          <thead><tr><th className="tl">Pilar</th><th className="tl">Pavimento</th><th className="tl">Laje junto ao pilar</th><th className="tl">Desligado do muro</th></tr></thead>
          <tbody>{desl.map((d, i) => <tr key={i}><td className="tl">{d.pilar}</td><td className="tl">{d.pavimento}</td><td className="tl">{d.laje}</td><td className="tl">{d.desligado}</td></tr>)}</tbody>
        </table>
      )}
      <Hint>O desligamento só vale com lajes de vigotas; com laje maciça lance o muro como elemento (aviso MURO_PILAR_MACICA).</Hint>

      {vigas.length > 0 && (
        <>
          <h4>Vigas sobre o muro</h4>
          <table className="data quadro" data-alv-vigas-muro>
            <thead><tr><th className="tl">Viga</th><th className="tl">Papel</th><th className="tl">Seção</th><th className="tl">Armadura</th><th className="tl">Situação</th></tr></thead>
            <tbody>{vigas.map((v, i) => <tr key={i}><td className="tl">{v.viga}</td><td className="tl">{v.papel}</td><td className="tl">{v.secao}</td><td className="tl">{v.armadura}</td><td className="tl">{v.situacao}</td></tr>)}</tbody>
          </table>
        </>
      )}

      <h4>Mensagens</h4>
      {msgs.length === 0 ? <p className="muted">Sem mensagens.</p> : (
        <ul data-alv-mensagens>
          {msgs.map((m, i) => <li key={i}><b>{m.local}</b>: {m.texto}</li>)}
        </ul>
      )}
    </div>
  );
}
