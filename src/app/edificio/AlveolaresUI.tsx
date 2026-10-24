// Grupo "Lajes alveolares" da doca Propriedades (frente E3e): camada "Placas alveolares" da planta, processo construtivo, direção
// das placas, ambiente (CAA), negativos na capa por ponta, placa fixada x escolha automática, desbloqueio da armadura e a janela
// "Laje alveolar" (verificações, lista da série com a sugestão, negativos, placas e diagramas da faixa que governa). Os dados vêm
// do dimensionamento (`dim.alveolares`); comandos `laje.alveolar`, `laje.exposicao` e `armadura.desbloquear`. Sem dado na ficha
// a verificação aparece como "sem dado", nunca como "ok".
import { useState } from 'react';
import { PROCESSOS_ALVEOLAR } from '../../core/building/alveolares';
import type { ResultadoAlveolar } from '../../core/building/alveolaresDim';
import type { BuildingModel, Laje } from '../../core/building/types';
import { Button, Check, Group, Hint, Modal, NumField, Pill, Select } from '../ui';
import { executarERecalcular } from './Armadura';
import { Diagrama, Mensagens } from './Revisao';
import { usePlanta } from './plantaStore';
import { useBuilding } from './store';

const f2 = (x: number | null | undefined, n = 2) => (x === null || x === undefined ? '—' : String(+x.toFixed(n)).replace('.', ','));
/** Resultado de uma verificação: ok, não atende ou sem dado (a ficha não traz o valor resistente). */
const Situacao = ({ ok }: { ok: boolean | null }) => (ok === null ? <Pill tone="na">sem dado</Pill> : ok ? <Pill tone="ok">atende</Pill> : <Pill tone="bad">não atende</Pill>);

function JanelaAlveolar({ l, onClose }: { l: Laje; onClose: () => void }) {
  const r: ResultadoAlveolar | undefined = useBuilding((s) => s.dim?.alveolares?.find((x) => x.laje === l.id));
  const proc = r ? PROCESSOS_ALVEOLAR.find((x) => x.v === r.processo)?.rotulo : '';
  const xs = r?.diagrama.x ?? [];
  return (
    <Modal titulo={`Laje alveolar ${l.nome}`} onClose={onClose} larga>
      {!r ? <p className="muted">Sem resultado para esta laje: calcule e dimensione o edifício (aba Dimensionamento).</p> : (
        <div data-janela-alveolar={l.id}>
          <p className="small" data-ficha-janela-alveolar>{r.fichaNome} · {r.fabricante} · <Pill tone="warn">{r.marca}</Pill></p>
          <p className="small">
            Placa adotada {r.placaAdotada}{r.fixa ? ' (fixada)' : ' (automática)'}: altura {f2(r.h * 100, 0)} cm, capa {f2(r.capa * 100, 0)} cm, peso próprio {f2(r.pp)} kN/m²; vão {f2(r.vao)} m; largura do pano {f2(r.larguraPano)} m; {r.placas.length} placa(s). Processo: {proc}.
          </p>
          <table className="data quadro" data-verificacoes-alveolar>
            <thead><tr><th>Verificação</th><th>Solicitante</th><th>Resistente</th><th>Aproveit.</th><th>Situação</th></tr></thead>
            <tbody>
              <tr><td className="l">Flexão positiva (kN·m/m)</td><td>{f2(r.positivo.Md)}</td><td>{f2(r.positivo.Mu)}</td><td>{f2(r.positivo.aproveitamento)}</td><td><Situacao ok={r.positivo.ok} /></td></tr>
              {r.servico && <tr><td className="l">Serviço, protensão {r.servico.nivel}, CAA {r.servico.caa}, combinação {r.servico.combinacao} (kN·m/m)</td><td>{f2(r.servico.Ms)}</td><td>{f2(r.servico.Madm)}</td><td>{f2(r.servico.aproveitamento)}</td><td><Situacao ok={r.servico.ok} /></td></tr>}
              {r.cortante.map((c, i) => <tr key={i}><td className="l">Cortante {i === 0 ? 'no início' : 'no fim'}, região {c.regiao} (kN/m)</td><td>{f2(c.Vd)}</td><td>{f2(c.VRd)}</td><td>{c.VRd ? f2(c.Vd / c.VRd) : '—'}</td><td><Situacao ok={c.VRd === null ? null : c.ok} /></td></tr>)}
              <tr><td className="l">Capa (cm)</td><td>{f2(r.capaVerificacao.minima * 100, 1)} (mínima)</td><td>{f2(r.capaVerificacao.espessura * 100, 1)}</td><td>—</td><td><Situacao ok={r.capaVerificacao.ok} /></td></tr>
              {r.lateral.map((x, i) => <tr key={i}><td className="l">Apoio lateral da placa de borda {i === 0 ? 'inicial' : 'final'} (cm)</td><td>—</td><td>{x.disponivel === null ? 'sem viga' : f2(x.disponivel * 100, 1)}</td><td>—</td><td><Situacao ok={x.ok} /></td></tr>)}
              {r.flecha && <tr><td className="l">Flecha total (mm)</td><td>{f2(r.flecha.total * 1000, 1)}</td><td>{f2(r.flecha.limite * 1000, 1)}</td><td>{f2(r.flecha.total / r.flecha.limite)}</td><td><Situacao ok={r.flecha.ok} /></td></tr>}
            </tbody>
          </table>
          <p className="small">Envoltória do pano por metro (ELU): M+ {f2(r.envoltoria.mPos)} kN·m/m; M− início / fim {f2(r.envoltoria.mNeg[0])} / {f2(r.envoltoria.mNeg[1])} kN·m/m; V início / fim {f2(r.envoltoria.v[0])} / {f2(r.envoltoria.v[1])} kN/m.</p>
          <p className="small"><b>Placas da ficha</b> {r.trocar && r.placaEscolhida ? `— a verificação sugere a placa ${r.placaEscolhida}.` : '— a placa adotada atende, ou nenhuma da série atende.'}</p>
          <table className="data quadro" data-tabela-candidatas>
            <thead><tr><th>Placa</th><th>h (cm)</th><th>Mu (kN·m/m)</th><th>Situação</th><th>Motivos</th><th></th></tr></thead>
            <tbody>
              {r.candidatas.map((c) => (
                <tr key={c.placa} data-candidata={c.placa}>
                  <td className="l">{c.placa}</td><td>{f2(c.altura * 100, 0)}</td><td>{c.Mu === null ? 'sem dado' : f2(c.Mu)}</td>
                  <td>{c.adequada ? <Pill tone="ok">atende</Pill> : <Pill tone="bad">insuficiente</Pill>}</td>
                  <td className="l">{c.motivos.join('; ') || '—'}</td>
                  <td className="l">{c.adotada ? 'adotada' : ''}{c.escolhida ? ' sugerida' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row wrap">
            <Button disabled={!(r.trocar && r.placaEscolhida)} onClick={() => { void executarERecalcular('laje.alveolar', { ids: [l.id], placa: r.placaEscolhida }); }}>Adotar a placa sugerida</Button>
          </div>
          <p className="small"><b>Negativos na capa</b></p>
          <table className="data quadro" data-tabela-negativos-alveolar>
            <thead><tr><th>Ponta</th><th>Md− (kN·m/m)</th><th>Armadura</th><th>Barras</th><th>Comprimento (m)</th><th>Mu (kN·m/m)</th><th>Origem</th></tr></thead>
            <tbody>
              {r.negativos.map((n, i) => (
                <tr key={i}>
                  <td className="l">{i === 0 ? 'início' : 'fim'}</td>
                  {n ? <><td>{f2(n.Md)}</td><td className="l">φ{f2(n.phi, 1)} c/{f2(n.s * 100, 1)}</td><td>{n.barras}</td><td>{f2(n.comprimento)}</td><td>{f2(n.Mu)}</td><td className="l">{n.fonte === 'ficha' ? 'linha da ficha' : n.fonte === 'secao' ? 'pela seção' : 'editado'}</td></> : <td className="l" colSpan={6}>sem negativo de cálculo</td>}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small"><b>Placas do pano</b></p>
          <table className="data quadro" data-tabela-placas-alveolar>
            <thead><tr><th>Placa</th><th>Largura (cm)</th><th>Comprimento (m)</th><th>Apoios (cm)</th><th>Observação</th><th>Situação</th></tr></thead>
            <tbody>
              {r.placas.map((p) => (
                <tr key={p.numero} data-placa-alveolar={p.numero}>
                  <td className="l">{p.numero}</td><td>{f2(p.largura * 100, 0)}</td><td>{f2(p.comprimento)}</td>
                  <td>{p.apoios.map((a) => (a.disponivel === null ? 'sem viga' : f2(a.adotado * 100, 1))).join(' / ')}</td>
                  <td className="l">{[p.cortada ? 'borda cortada' : '', p.obliqua ? `oblíqua ${f2(p.angulo, 1)}°` : ''].filter(Boolean).join('; ') || '—'}</td>
                  <td>{p.status === 'ok' ? <Pill tone="ok">ok</Pill> : <Pill tone="bad">insuficiente</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small">Quantitativo: {r.quantitativo.numeroPlacas} placa(s), {f2(r.quantitativo.areaPlacas)} m², {f2(r.quantitativo.pesoPlacas, 0)} kN; concreto moldado no local {f2(r.quantitativo.concretoLocal)} m³; capa {f2(r.quantitativo.areaCapa)} m².</p>
          {xs.length > 1 && (<>
            <Diagrama id="alveolar-m" titulo="Momento por metro da faixa que governa" unid="kN·m/m" xs={xs} L={xs[xs.length - 1]} baixo cor="dg-m" series={[{ ys: r.diagrama.Mmax, rot: 'Mmáx' }, { ys: r.diagrama.Mmin, rot: 'Mmín', alt: true }]} />
            <Diagrama id="alveolar-v" titulo="Cortante por metro da faixa que governa" unid="kN/m" xs={xs} L={xs[xs.length - 1]} cor="dg-v" series={[{ ys: r.diagrama.V, rot: 'V' }]} />
          </>)}
          <Mensagens msgs={r.mensagens} />
        </div>
      )}
    </Modal>
  );
}

/** Ajustes dos panos alveolares selecionados: processo, direção das placas, ambiente, placa fixada e negativos por ponta. */
function Ajustes({ ls }: { ls: Laje[] }) {
  const l0 = ls[0], ids = ls.map((l) => l.id);
  const ed = l0.alveolar?.negativos?.find((n) => !!n) ?? undefined;
  const [ponta, setPonta] = useState<0 | 1>(0);
  const [phi, setPhi] = useState(ed?.phi ?? 16);
  const [s, setS] = useState(ed ? ed.s * 100 : 20);
  const [pct, setPct] = useState(ed?.percentual ?? 25);
  const roda = (nome: string, p: Record<string, unknown>) => { void executarERecalcular(nome, p); };
  return (
    <div data-ajustes-alveolar>
      <p className="small"><b>{ls.length > 1 ? `${ls.length} panos alveolares` : l0.nome}</b></p>
      <div className="row wrap">
        <Select<'obra' | 0 | 1 | 2> label="Processo construtivo do pano alveolar" value={l0.alveolar?.processo ?? 'obra'} options={[{ v: 'obra', label: 'o da opção das alveolares' }, ...PROCESSOS_ALVEOLAR.map((p) => ({ v: p.v, label: p.rotulo }))]} onChange={(v) => roda('laje.alveolar', { ids, processo: v })} />
        <NumField label="Direção das placas alveolares" unit="°" width={110} value={+(l0.direcao ?? 0).toFixed(1)} onChange={(v) => roda('laje.alveolar', { ids, direcao: v })} />
        <Select<'obra' | 'I' | 'II' | 'III' | 'IV'> label="Ambiente da laje alveolar (CAA)" value={l0.exposicao ?? 'obra'} options={[{ v: 'obra', label: 'o da obra' }, ...(['I', 'II', 'III', 'IV'] as const).map((c) => ({ v: c, label: `CAA ${c}` }))]} onChange={(v) => roda('laje.exposicao', { ids, caa: v })} />
      </div>
      <div className="row wrap">
        <Button disabled={!ls.some((l) => l.alveolar?.fixa)} onClick={() => roda('laje.alveolar', { ids, fixar: false })}>Voltar à escolha automática da placa</Button>
        <Button disabled={!ls.some((l) => l.alveolar?.fixa || l.alveolar?.negativos)} onClick={() => roda('armadura.desbloquear', { ids })}>Desbloquear a armadura da laje alveolar</Button>
      </div>
      <div className="row wrap">
        <Select<0 | 1> label="Ponta do negativo editado" value={ponta} options={[{ v: 0, label: 'início' }, { v: 1, label: 'fim' }]} onChange={setPonta} />
        <NumField label="φ do negativo editado da laje alveolar" unit="mm" width={100} value={phi} onChange={(v) => v >= 5 && v <= 25 && setPhi(v)} />
        <NumField label="Espaçamento do negativo editado da laje alveolar" unit="cm" width={120} value={s} onChange={(v) => v >= 5 && v <= 40 && setS(v)} />
        <NumField label="Comprimento do negativo editado" unit="% do vão" width={120} value={pct} onChange={(v) => v > 0 && v <= 100 && setPct(v)} />
        <Button onClick={() => roda('laje.alveolar', { ids, negativos: { [ponta === 0 ? 'inicio' : 'fim']: { phi, s: s / 100, percentual: pct } } })}>Aplicar o negativo na ponta</Button>
        <Button disabled={!ls.some((l) => l.alveolar?.negativos)} onClick={() => roda('laje.alveolar', { ids, negativos: { limpar: 'ambos' } })}>Limpar os negativos editados</Button>
      </div>
      <Hint>A troca de placa feita aqui a fixa: a verificação deixa de sugerir outra. Negativos editados ficam bloqueados até desbloquear a armadura. Início e fim seguem a direção das placas.</Hint>
    </div>
  );
}

export function AlveolaresGrupo({ b }: { b: BuildingModel }) {
  const pl = usePlanta();
  const [janela, setJanela] = useState<string | null>(null);
  const alvs = b.lajes.filter((l) => l.tipo.tipo === 'alveolar');
  const sel = alvs.filter((l) => pl.selecao.has(l.id));
  if (!alvs.length) return null;
  const aberta = alvs.find((l) => l.id === janela);
  return (
    <div data-grupo-alveolares>
      <Group title={`Lajes alveolares (${alvs.length})`} open={false}>
        <Check label="Mostrar placas alveolares na planta" checked={pl.camadaPlacas} onChange={(c) => pl.set({ camadaPlacas: c })} />
        {!sel.length && <Hint>Selecione na planta (ou na tabela de lajes) um ou mais panos alveolares para ajustar o processo, a direção das placas, os negativos e abrir a janela da laje.</Hint>}
        {sel.length > 0 && <Ajustes key={sel.map((l) => l.id).join(',')} ls={sel} />}
        {sel.length === 1 && <div className="row wrap"><Button onClick={() => setJanela(sel[0].id)}>Janela da laje alveolar</Button></div>}
        {aberta && <JanelaAlveolar l={aberta} onClose={() => setJanela(null)} />}
        <Hint>A placa é a do tipo da laje; a lista da série mostra quais atendem e sugere a menor. Sem dado do fabricante na ficha, a verificação correspondente não é feita e aparece como “sem dado”. Resistência ao fogo das alveolares não é verificada.</Hint>
      </Group>
    </div>
  );
}
