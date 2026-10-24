// Armadura da escada (E4d, interface): janela com a seleção do lance (C8.49), elevação e planta em SVG, posições, ligações (esperas,
// passadores, quinas), verificações, edição e bloqueio das barras e as opções da armadura. O cálculo está em
// core/building/escadasArmadura.ts (e a casca em escadasCalculo.ts); aqui só se desenha e se lançam comandos.
// Calcula na hora ao abrir e quando a escada muda (a casca é refeita só se a assinatura do cálculo mudar).
import { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { Button, Check, Group, Modal, Note, NumField, Pill, Select } from '../ui';
import { assinaturaEscadas, calcularEscadas, type ResultadoEscadas } from '../../core/building/escadasCalculo';
import { armarEscadas, type BarraEscada, type ResultadoArmaduraLance } from '../../core/building/escadasArmadura';
import { desenhoArmaduraLance } from '../../core/building/escadasArmaduraDesenho';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import { ID_PADRAO, tabelasDoTipo } from '../../core/building/tabelasArmadura';
import { BITOLAS_ESCADA } from '../../core/commands/escadasArmadura';
import type { Escada, FamiliaEscada } from '../../core/building/escadas';
import { useBuilding } from './store';

interface EstadoJanela { aberta: boolean; escada?: string; lance?: number; abrir: (escada?: string, lance?: number) => void; fechar: () => void }
/** Estado da janela da armadura das escadas (a faixa, o menu da ferramenta e a paleta a abrem). */
export const useEscadaArmaduraUI = create<EstadoJanela>((set) => ({ aberta: false, abrir: (escada, lance) => set({ aberta: true, escada, lance }), fechar: () => set({ aberta: false, escada: undefined, lance: undefined }) }));

/** Monta a janela quando aberta (colocada uma vez no Edifício). */
export function EscadaArmaduraHost() {
  const { aberta, escada, lance, fechar } = useEscadaArmaduraUI();
  return aberta ? <JanelaArmadura escadaInicial={escada} lanceInicial={lance} onClose={fechar} /> : null;
}

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const phiTxt = (p: number) => fmt(p, p % 1 ? 1 : 0);
const NOME_TIPO: Record<BarraEscada['tipo'], string> = { principal: 'principal', distribuicao: 'distribuição', negativo: 'negativo', passador: 'passador', espera: 'espera' };

function Desenhos({ l }: { l: ResultadoArmaduraLance }) {
  const d = desenhoArmaduraLance(l);
  if (!d.trechos.length) return null;
  const m = 0.4, w = d.largura + 2 * m, h = d.zMax - d.zMin + 2 * m;
  const pt = (p: [number, number]) => `${(p[0] + m).toFixed(3)},${(d.zMax - p[1] + m).toFixed(3)}`;
  const larg = Math.max(...d.trechos.map((t) => t.y1)), altP = larg + 2 * m;
  const ptp = (p: [number, number]) => `${(p[0] + m).toFixed(3)},${(larg - p[1] + m).toFixed(3)}`;
  return (
    <div className="row wrap">
      <svg className="escada-arm" viewBox={`0 0 ${w.toFixed(3)} ${h.toFixed(3)}`} role="img" aria-label="Elevação da armadura" data-escada-arm-elevacao>
        {d.trechos.map((t) => <polyline key={t.chave} className={t.tipo === 'lance' ? 'a-trecho' : 'a-patamar'} points={`${pt([t.x0, t.z0])} ${pt([t.x1, t.z1])}`} />)}
        {d.barras.map((b) => b.elevacao.map((seg, i) => <polyline key={`${b.trecho}-${b.pos}-${i}`} className={b.face === 'inf' ? 'a-inf' : 'a-sup'} points={seg.map(pt).join(' ')} />))}
        {d.barras.filter((b) => b.direcao === 'L').map((b) => <text key={`t-${b.trecho}-${b.pos}`} className="a-rot" x={pt(b.elevacao[0][0]).split(',')[0]} y={Number(pt(b.elevacao[0][0]).split(',')[1]) + (b.face === 'inf' ? 0.2 : -0.08)}>{b.pos}</text>)}
      </svg>
      <svg className="escada-arm" viewBox={`0 0 ${w.toFixed(3)} ${altP.toFixed(3)}`} role="img" aria-label="Planta da armadura" data-escada-arm-planta>
        {d.trechos.map((t) => <polygon key={t.chave} className={t.tipo === 'lance' ? 'a-trecho-p' : 'a-patamar-p'} points={[[t.x0, 0], [t.x1, 0], [t.x1, t.y1], [t.x0, t.y1]].map((p) => ptp(p as [number, number])).join(' ')} />)}
        {d.barras.map((b) => b.planta.map((seg, i) => <polyline key={`${b.trecho}-${b.pos}-${i}`} className={b.face === 'inf' ? 'a-inf' : 'a-sup'} points={seg.map(ptp).join(' ')} />))}
      </svg>
    </div>
  );
}

/** Uma posição: mostra os dados e deixa trocar bitola e espaçamento (a edição bloqueia a armadura da família no trecho). */
function LinhaPosicao({ e, l, trecho, x }: { e: Escada | undefined; l: ResultadoArmaduraLance; trecho: string; x: BarraEscada }) {
  const exec = useBuilding((s) => s.exec);
  const [phi, setPhi] = useState<number>(x.phi);
  const [sCm, setSCm] = useState<number>(+(x.s * 100).toFixed(1));
  const editavel = x.familia !== 'espera' && !!e;
  return (
    <tr data-escada-posicao={`${trecho}-${x.pos}`}>
      <td className="l">{x.pos}</td><td className="l">{trecho}</td><td className="l">{NOME_TIPO[x.tipo]}{x.bloqueada ? ' (bloqueada)' : ''}</td><td>{x.face === 'inf' ? 'inferior' : 'superior'}</td>
      <td>{x.n}</td><td>φ{phiTxt(x.phi)} c/{fmt(x.s * 100, 0)}</td><td>{fmt(x.comprimento)}</td><td>{fmt(x.AsNec)}</td><td>{fmt(x.AsEf)}</td>
      <td>{editavel ? (
        <div className="row u-items-end">
          <Select label="φ" value={phi} options={BITOLAS_ESCADA.map((p) => ({ v: p, label: phiTxt(p) }))} onChange={(v) => setPhi(Number(v))} />
          <NumField label="s" unit="cm" width={70} value={sCm} onChange={setSCm} />
          <Button variant="mini" onClick={() => exec('escada.armadura', { id: e!.id, lance: l.lance, trecho, familia: x.familia as FamiliaEscada, phi, s: sCm / 100 })}>Bloquear</Button>
        </div>
      ) : '—'}</td>
    </tr>
  );
}

function JanelaArmadura({ escadaInicial, lanceInicial, onClose }: { escadaInicial?: string; lanceInicial?: number; onClose: () => void }) {
  const { sessao, exec } = useBuilding();
  const b = sessao.modelo;
  const [res, setRes] = useState<ResultadoEscadas | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [sel, setSel] = useState<string>('');
  const temEscadas = (b.escadas?.length ?? 0) > 0;
  // a casca só se refaz quando muda o que define as reações; a armadura (rápida) se refaz a cada edição ou opção
  const assinatura = useMemo(() => assinaturaEscadas(b), [b]);
  useEffect(() => {
    if (!temEscadas) { setRes(null); return; }
    setOcupado(true);
    const t = setTimeout(() => { setRes(calcularEscadas(b)); setOcupado(false); }, 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura, temEscadas]);
  const op = useMemo(() => opcoesEmUso(b.opcoes, perfilDe(b)), [b]);
  const arm = useMemo(() => (res ? armarEscadas(b, res, op) : null), [res, b, op]);
  const lances = arm?.lances ?? [];
  const chave = (x: ResultadoArmaduraLance) => `${x.escada}|${x.lance}`;
  const inicial = lances.find((x) => x.escada === escadaInicial && x.lance === (lanceInicial ?? 1)) ?? lances.find((x) => x.escada === escadaInicial) ?? lances[0];
  const l = lances.find((x) => chave(x) === sel) ?? inicial;
  const e = l ? b.escadas?.find((x) => x.id === l.escada) : undefined;
  const bloqueadas = e?.armadura?.bloqueadas?.length ?? 0;
  const liga = (k: keyof typeof ROTULO) => <Check label={ROTULO[k]} checked={!!op[k]} onChange={(v) => exec('opcoes.definir', { valores: { [k]: v ? 1 : 0 } })} />;
  const tabelas = tabelasDoTipo(b, 'lajes');
  return (
    <Modal titulo="Armadura da escada" onClose={onClose} larga ajuda="Cada trecho (lance ou patamar) é armado como laje maciça a partir dos esforços da casca. A principal inferior é contínua; a distribuição e as barras superiores seguem cada faixa. Editar uma família bloqueia a armadura dela: o recálculo só a verifica.">
      <div data-escada-armadura>
        {!temEscadas && <Note>A obra não tem escadas. Lance uma escada para armá-la.</Note>}
        {ocupado && <p className="small" data-escada-arm-calculando>Calculando a escada…</p>}
        {lances.length > 0 && (
          <div className="row wrap u-items-end">
            <Select label="Lance" value={l ? chave(l) : ''} options={lances.map((x) => ({ v: chave(x), label: `Escada ${x.nome}, lance ${x.lance}` }))} onChange={(v) => setSel(String(v))} />
            {l && <Pill tone={l.status === 'ok' ? 'ok' : 'bad'}>{l.status === 'ok' ? 'atende' : 'revisar'}</Pill>}
            {l && <Pill>{fmt(l.espessura * 100, 1)} cm</Pill>}
            {l && <Pill>{fmt(l.peso, 1)} kg</Pill>}
            {e && <Button variant="mini" disabled={!bloqueadas} onClick={() => exec('escada.armadura', { id: e.id, limpar: true })}>Desbloquear tudo{bloqueadas ? ` (${bloqueadas})` : ''}</Button>}
          </div>
        )}
        {l?.erro && <Note tone="bad">{l.erro}</Note>}
        {l && !l.erro && (
          <>
            <Desenhos l={l} />
            <table className="data quadro" data-escada-arm-posicoes>
              <thead><tr><th>Pos.</th><th>Trecho</th><th>Tipo</th><th>Face</th><th>Qtd.</th><th>Bitola</th><th>C (m)</th><th>As nec. (cm²/m)</th><th>As ef. (cm²/m)</th><th>Editar</th></tr></thead>
              <tbody>{l.trechos.flatMap((t) => t.barras.map((x) => <LinhaPosicao key={`${t.chave}-${x.pos}`} e={e} l={l} trecho={t.chave} x={x} />))}</tbody>
            </table>
            <table className="data quadro" data-escada-arm-verificacoes>
              <thead><tr><th>Trecho</th><th>Faixas</th><th>VSd (kN/m)</th><th>VRd1 (kN/m)</th><th>Asw (cm²/m²)</th><th>wk (mm)</th><th>Limite (mm)</th></tr></thead>
              <tbody>{l.trechos.map((t) => <tr key={t.chave}><td className="l">{t.chave}</td><td>{t.faixas.length}</td><td>{fmt(t.cortante.VSd, 1)}</td><td>{fmt(t.cortante.VRd1, 1)}</td><td>{fmt(t.cortante.Asw)}</td><td>{fmt(t.wk)}</td><td>{fmt(t.wkLim)}</td></tr>)}</tbody>
            </table>
            <p className="small" data-escada-arm-flecha>Flecha total {fmt(l.flecha.total, 1)} mm (fator {fmt(l.flecha.fator, 2)} sobre a elástica) para o vão de {fmt(l.flecha.vao)} m; limite {fmt(l.flecha.limite, 1)} mm.</p>
            <Group title="Ligações: esperas, passadores e quinas" open>
              <table className="data quadro" data-escada-arm-ligacoes>
                <thead><tr><th>Ligação</th><th>Apoio ou quina</th><th>Ancoragem</th><th>lb,nec (cm)</th><th>Disponível (cm)</th><th>Perna (cm)</th><th>Traspasse (cm)</th></tr></thead>
                <tbody>{l.ligacoes.map((x, i) => <tr key={i}><td className="l">{x.rotulo}</td><td className="l">{x.descricao}</td><td>{x.ancoragem?.tipo ?? '—'}</td><td>{x.ancoragem ? fmt(x.ancoragem.lbNec * 100, 0) : '—'}</td><td>{x.ancoragem ? fmt(x.ancoragem.disponivel * 100, 0) : '—'}</td><td>{x.ancoragem ? fmt(x.ancoragem.perna * 100, 0) : '—'}</td><td>{x.traspasse ? fmt(x.traspasse * 100, 0) : '—'}</td></tr>)}</tbody>
              </table>
            </Group>
            {l.mensagens.map((m, i) => <Note key={i} tone="bad">{m}</Note>)}
          </>
        )}
        {l && e && (
          <Group title="Opções da armadura" open={false}>
            <div className="row wrap u-items-end" data-escada-arm-opcoes>
              {liga('escadaIgualarSupInf')}
              {liga('escadaEspacamentoMultiplo')}
              {liga('escadaIgualarSecoes')}
              {liga('escadaEsperas')}
              {liga('escadaPassadores')}
              <NumField label="Ancoragem em viga chata (esperas)" unit="cm" width={150} value={e.armadura?.ancoragemViga ?? op.escadaAncoragemViga} onChange={(v) => exec('escada.opcoesArmadura', { id: e.id, ancoragemViga: v })} />
              <NumField label="Profundidade da fundação" unit="cm" width={130} value={e.armadura?.profundidadeFundacao ?? op.escadaProfundidadeFundacao} onChange={(v) => exec('escada.opcoesArmadura', { id: e.id, profundidadeFundacao: v })} />
              <Select label="Tabela de armadura" value={e.armadura?.tabela ?? ID_PADRAO} options={tabelas.map((t) => ({ v: t.id, label: t.nome }))} onChange={(v) => exec('escada.opcoesArmadura', { id: e.id, tabela: String(v) })} />
            </div>
            <p className="small">Cobrimento, aço, distribuição mínima e padrões das opções em Opções de cálculo (“Escadas”) e Materiais. Valores a confirmar em Premissas e pendências.</p>
          </Group>
        )}
      </div>
    </Modal>
  );
}

const ROTULO = {
  escadaIgualarSupInf: 'Igualar armaduras superior e inferior', escadaEspacamentoMultiplo: 'Espaçamentos múltiplos entre si', escadaIgualarSecoes: 'Igualar a armadura de todas as seções',
  escadaEsperas: 'Arranques (esperas) no início', escadaPassadores: 'Barras de ligação (passadores) no fim',
} as const;
