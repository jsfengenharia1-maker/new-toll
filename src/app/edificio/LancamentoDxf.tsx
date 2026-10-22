// Assistente de lançamento por DXF/DWG em quatro passos (L2): Arquivos, Camadas (cores, visibilidade e papéis com prévia),
// Grupos e Revisão da proposta (ambíguos e aplicação parcial). Tudo entra por um único comando composto (um passo no histórico).
import { useMemo, useState } from 'react';
import { deslocamentoCentralizado, PAPEIS, propostaDeLancamento, REGRAS_PADRAO, sugerirRegras, type Proposta } from '../../core/building/lancamentoDxf';
import { gruposDaMascara, pavimentosOrdenados, type BuildingModel, type CamadaGeo, type Mascara, type PapelCamada, type RegrasCamadas } from '../../core/building/types';
import { cssVar } from '../design/tokens';
import { useStore } from '../store';
import { Alert, Button, Check, ColorField, Dropdown, FilePick, Hint, Input, Modal, Note, NumField, Pill, Select, Seg, Spacer, TextField } from '../ui';
import { lerGabarito, UNIDADES } from './lancamentoLeitura';
import { PreviaCamadas } from './PreviaCamadas';
import { usePlanta } from './plantaStore';
import { useBuilding } from './store';

type Passo = 'arquivos' | 'camadas' | 'grupos' | 'revisao';
const PASSOS: { v: Passo; label: string }[] = [{ v: 'arquivos', label: 'Arquivos' }, { v: 'camadas', label: 'Camadas' }, { v: 'grupos', label: 'Grupos' }, { v: 'revisao', label: 'Revisão' }];

interface Item {
  chave: string;
  nome: string;
  arquivo: { nome: string; tipo: 'dxf' | 'dwg' };
  geo: Record<string, CamadaGeo>;
  escala: number;
  porHeader: boolean;
  avisos: string[];
  grupos: string[];
  regras: RegrasCamadas;
  visiveis: Record<string, boolean>;
  cores: Record<string, string>;
  /** Id da máscara já importada (o assistente só ajusta as regras e lança). */
  existente?: string;
}

const itemDeMascara = (m: Mascara): Item => ({
  chave: m.id, nome: m.nome, arquivo: m.arquivo ?? { nome: `${m.nome}.dxf`, tipo: 'dxf' }, geo: m.geo, escala: m.escala, porHeader: true, avisos: [],
  grupos: gruposDaMascara(m), regras: m.regras ?? sugerirRegras(m.geo, m.escala), visiveis: Object.fromEntries(m.camadas.map((c) => [c.nome, c.visivel])),
  cores: Object.fromEntries(m.camadas.filter((c) => c.cor).map((c) => [c.nome, c.cor!])), existente: m.id,
});

/** Máscara como a importação a criaria (centralizada), para calcular a proposta antes de importar. */
function mascaraDe(it: Item, b: BuildingModel): Mascara {
  const real = it.existente ? b.mascaras.find((m) => m.id === it.existente) : undefined;
  if (real) return real;
  const { dx, dy } = deslocamentoCentralizado(it.geo, it.escala);
  return { id: 'previa', nome: it.nome, grupo: it.grupos[0], escala: it.escala, rotacao: 0, dx, dy, camadas: [], geo: it.geo, regras: it.regras };
}

const cm = (v: number) => +(v * 100).toFixed(2);

export function LancamentoDxf({ onClose, inicial }: { onClose(): void; inicial?: string }) {
  const { sessao, exec } = useBuilding();
  const b = sessao.modelo;
  const grupos = b.grupos;
  const ps = pavimentosOrdenados(b);
  const [passo, setPasso] = useState<Passo>('arquivos');
  const [itens, setItens] = useState<Item[]>(() => { const m = inicial ? b.mascaras.find((x) => x.id === inicial) : undefined; return m ? [itemDeMascara(m)] : []; });
  const [ativo, setAtivo] = useState(0);
  const [erro, setErro] = useState('');
  const [nasce, setNasce] = useState('fundacao');
  const [lajes, setLajes] = useState(true);
  const [fora, setFora] = useState<Record<string, boolean>>({}); // categoria desligada: `${chave}:${categoria}`
  const [incluidos, setIncluidos] = useState<Record<string, boolean>>({}); // ambíguo incluído: origem
  const grupoPadrao = (ps.find((p) => p.id === usePlanta.getState().pavimento) ?? ps[Math.min(1, ps.length - 1)])?.grupo ?? grupos[0]?.id ?? '';

  const mudar = (chave: string, p: Partial<Item>) => setItens((l) => l.map((x) => (x.chave === chave ? { ...x, ...p } : x)));
  const it = itens[Math.min(ativo, itens.length - 1)];
  const nomesRepetidos = new Set(itens.map((x) => x.nome)).size !== itens.length || itens.some((x) => !x.nome.trim() || (!x.existente && b.mascaras.some((m) => m.nome === x.nome.trim())));

  const adicionar = async (f: File) => {
    setErro('');
    try {
      const g = await lerGabarito(f);
      if (!Object.keys(g.lido.camadas).length) { setErro(`${f.name}: nenhuma entidade lida.`); return; }
      const chave = `${f.name}-${itens.length}-${Date.now()}`;
      setItens((l) => [...l, { chave, nome: g.nome, arquivo: g.arquivo, geo: g.lido.camadas, escala: g.escala, porHeader: g.porHeader, avisos: g.avisos, grupos: [grupoPadrao], regras: sugerirRegras(g.lido.camadas, g.escala), visiveis: Object.fromEntries(Object.keys(g.lido.camadas).map((c) => [c, true])), cores: {} }]);
      setAtivo(itens.length);
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
  };

  const propostas = useMemo<Proposta[]>(() => (passo === 'revisao' ? itens.map((x) => propostaDeLancamento(b, mascaraDe(x, b), x.regras)) : []), [passo, itens, b]);

  const ordem = PASSOS.map((p) => p.v);
  const k = ordem.indexOf(passo);
  const podeAvancar = passo === 'arquivos' ? itens.length > 0 && !nomesRepetidos : passo === 'grupos' ? itens.every((x) => x.grupos.length > 0) : true;

  /** Origens que ficam de fora: categorias desligadas e ambíguos não incluídos. */
  const excluirDe = (x: Item, p: Proposta): string[] => {
    const sai: string[] = [];
    if (fora[`${x.chave}:pilares`]) sai.push(...p.pilares.map((q) => q.origem));
    if (fora[`${x.chave}:vigas`]) sai.push(...p.vigas.map((q) => q.origem));
    if (fora[`${x.chave}:eixos`]) sai.push(...p.eixos.map((q) => q.origem));
    for (const q of [...p.pilares, ...p.vigas]) if (q.ambiguo && !incluidos[q.origem]) sai.push(q.origem);
    if (p.contorno?.ambiguo && !incluidos[p.contorno.origem]) sai.push(p.contorno.origem);
    return sai;
  };

  const aplicar = () => {
    const n0 = b.seq;
    const cmds: { nome: string; params: Record<string, unknown> }[] = [];
    const ids: string[] = [];
    let novos = 0;
    for (const x of itens) {
      const extras = x.grupos.slice(1);
      let id = x.existente ?? '';
      if (!x.existente) {
        id = `m_${(n0 + 1 + novos++).toString(36)}`; // ids por seq: cada importação consome um
        cmds.push({ nome: 'mascara.importar', params: { grupo: x.grupos[0], nome: x.nome.trim(), geo: x.geo, escala: x.escala, centralizar: true, ...(extras.length ? { grupos: extras } : {}), regras: x.regras, arquivo: x.arquivo } });
      } else {
        cmds.push({ nome: 'mascara.regras', params: { id, regras: x.regras } });
        cmds.push({ nome: 'mascara.editar', params: { id, grupos: x.grupos } });
      }
      ids.push(id);
      const ocultas = Object.entries(x.visiveis).filter(([, v]) => !v).map(([c]) => c);
      const visiveis = Object.entries(x.visiveis).filter(([, v]) => v).map(([c]) => c);
      if (ocultas.length) cmds.push({ nome: 'mascara.camadas', params: { id, camadas: ocultas, visivel: false } });
      if (x.existente && visiveis.length) cmds.push({ nome: 'mascara.camadas', params: { id, camadas: visiveis, visivel: true } });
      for (const [c, cor] of Object.entries(x.cores)) if (x.geo[c]) cmds.push({ nome: 'mascara.camadas', params: { id, camadas: [c], cor } });
    }
    itens.forEach((x, i) => cmds.push({ nome: 'lancamento.aplicar', params: { grupo: x.grupos[0], mascara: ids[i], proposta: propostas[i], excluir: excluirDe(x, propostas[i]), nasce, lajes } }));
    const r = exec('lote', { comandos: cmds });
    if (r.ok) { usePlanta.getState().set({ vista: null }); useStore.getState().set({ message: `Lançamento por camada aplicado a ${itens.length} gabarito(s).` }); onClose(); }
  };

  const corPadrao = (papel: PapelCamada) => (papel === 'pilar' || papel === 'pilarParede' ? cssVar('--ink-strong') : papel === 'vigaFaces' || papel === 'vigaEixo' ? cssVar('--accent-text') : cssVar('--muted'));
  const total = propostas.reduce((s, p) => s + p.pilares.length + p.vigas.length + p.eixos.length, 0);

  return (
    <Modal titulo="Lançamento por DXF/DWG" onClose={onClose} larga>
      <Seg small value={passo} onChange={setPasso} options={PASSOS.map((p) => ({ v: p.v, label: p.label }))} />
      <div className="lanc">
        {passo === 'arquivos' && (
          <>
            <Hint>Escolha um ou mais arquivos DXF ou DWG de arquitetura. Cada arquivo vira um gabarito (vista) ligado a grupos de pavimentos; o lançamento só entra no modelo depois da revisão.</Hint>
            <div className="row wrap"><FilePick label="Adicionar arquivo DXF/DWG…" accept=".dxf,.dwg" onFile={(f) => void adicionar(f)} /></div>
            {erro && <Alert>{erro}</Alert>}
            {itens.map((x) => (
              <div key={x.chave} className="masc">
                <div className="row wrap">
                  <TextField label="Nome do gabarito" value={x.nome} onChange={(v) => mudar(x.chave, { nome: v })} disabled={!!x.existente} />
                  <Pill>{x.arquivo.tipo.toUpperCase()}</Pill>
                  <span className="muted small">{Object.keys(x.geo).length} camada(s)</span>
                  {!x.existente && (
                    <Select label={`Unidade de ${x.arquivo.nome}`} value={UNIDADES.find((u) => Math.abs(u.v - x.escala) < 1e-12)?.v ?? x.escala} options={[...UNIDADES.map((u) => ({ v: u.v, label: u.label })), ...(UNIDADES.some((u) => Math.abs(u.v - x.escala) < 1e-12) ? [] : [{ v: x.escala, label: `${x.escala} m/un` }])]}
                      onChange={(v) => mudar(x.chave, { escala: v, regras: sugerirRegras(x.geo, v) })} />
                  )}
                  {!x.existente && <Button variant="mini" aria-label={`Remover ${x.arquivo.nome}`} onClick={() => { setItens((l) => l.filter((y) => y.chave !== x.chave)); setAtivo(0); }}>remover</Button>}
                </div>
                {!x.porHeader && !x.existente && <Note>Unidade estimada pelo tamanho do desenho (o arquivo não informa $INSUNITS): confira.</Note>}
                {x.avisos.map((a) => <Hint key={a}>{a}</Hint>)}
              </div>
            ))}
            {nomesRepetidos && itens.length > 0 && <Note tone="bad">Cada gabarito precisa de um nome próprio, diferente dos já importados.</Note>}
          </>
        )}

        {passo === 'camadas' && it && (
          <>
            {itens.length > 1 && <Select label="Arquivo" value={it.chave} options={itens.map((x) => ({ v: x.chave, label: x.nome }))} onChange={(v) => setAtivo(Math.max(0, itens.findIndex((x) => x.chave === v)))} />}
            <div className="lanc-corpo">
              <div>
                <table className="data camadas">
                  <thead><tr><th>Camada</th><th title="Visível">vis.</th><th>Cor</th><th>Papel no lançamento</th></tr></thead>
                  <tbody>
                    {Object.keys(it.geo).sort().map((c) => {
                      const papel = it.regras.papeis[c] ?? 'ignorar';
                      return (
                        <tr key={c}>
                          <td className="tl">{c}</td>
                          <td><Input type="checkbox" aria-label={`Camada ${c} visível`} checked={it.visiveis[c] !== false} onChange={(e) => mudar(it.chave, { visiveis: { ...it.visiveis, [c]: e.target.checked } })} /></td>
                          <td><ColorField aria-label={`Cor da camada ${c}`} value={it.cores[c] ?? corPadrao(papel)} onChange={(v) => mudar(it.chave, { cores: { ...it.cores, [c]: v } })} /></td>
                          <td>
                            <Dropdown aria-label={`Papel da camada ${c}`} value={papel} onChange={(e) => mudar(it.chave, { regras: { ...it.regras, papeis: { ...it.regras.papeis, [c]: e.target.value as PapelCamada } } })}>
                              {PAPEIS.map((p) => <option key={p.papel} value={p.papel}>{p.rotulo}</option>)}
                            </Dropdown>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="row wrap">
                  <NumField label="Largura da viga por eixo" unit="cm" width={110} value={cm(it.regras.larguraViga)} onChange={(v) => mudar(it.chave, { regras: { ...it.regras, larguraViga: v / 100 } })} />
                  <NumField label="Altura da viga" unit="cm" width={110} value={cm(it.regras.alturaViga)} onChange={(v) => mudar(it.chave, { regras: { ...it.regras, alturaViga: v / 100 } })} />
                  <NumField label="Espessura da laje" unit="cm" width={110} value={cm(it.regras.lajeH)} onChange={(v) => mudar(it.chave, { regras: { ...it.regras, lajeH: v / 100 } })} />
                </div>
                <Hint>Papéis sugeridos pelo nome da camada e, sem nome reconhecido, pela geometria [a confirmar]. Valores padrão: viga {cm(REGRAS_PADRAO.larguraViga)} × {cm(REGRAS_PADRAO.alturaViga)} cm, laje {cm(REGRAS_PADRAO.lajeH)} cm.</Hint>
              </div>
              <PreviaCamadas geo={it.geo} camadas={Object.keys(it.geo).map((c) => ({ nome: c, visivel: it.visiveis[c] !== false, papel: it.regras.papeis[c], cor: it.cores[c] }))} />
            </div>
          </>
        )}

        {passo === 'grupos' && (
          <>
            <Hint>Grupos de pavimentos em que cada gabarito aparece. Pilares, vigas e lajes lançados entram no primeiro grupo marcado; nos demais o gabarito serve de fundo.</Hint>
            {itens.map((x) => (
              <div key={x.chave} className="masc">
                <b>{x.nome}</b>
                <div className="row wrap">
                  {grupos.map((g) => (
                    <Check key={g.id} label={`${x.nome} em ${g.nome}`} checked={x.grupos.includes(g.id)} onChange={(v) => mudar(x.chave, { grupos: v ? [...x.grupos, g.id] : x.grupos.filter((y) => y !== g.id) })} />
                  ))}
                </div>
                {x.grupos.length === 0 && <Note tone="bad">Marque ao menos um grupo.</Note>}
              </div>
            ))}
          </>
        )}

        {passo === 'revisao' && (
          <>
            <div className="row wrap">
              <Select label="Pilares nascem em" value={nasce} options={[{ v: 'fundacao', label: 'Fundação' }, ...ps.map((p) => ({ v: p.id, label: p.nome }))]} onChange={setNasce} />
              <Check label="Criar lajes nos panos e no contorno" checked={lajes} onChange={setLajes} />
            </div>
            {itens.map((x, i) => {
              const p = propostas[i];
              if (!p) return null;
              const amb = [...p.pilares.filter((q) => q.ambiguo), ...p.vigas.filter((q) => q.ambiguo), ...(p.contorno?.ambiguo ? [p.contorno] : [])];
              return (
                <div key={x.chave} className="masc" data-revisao={x.nome}>
                  <b>{x.nome}</b>
                  <table className="data">
                    <thead><tr><th>Elemento</th><th>Quantidade</th><th>Lançar</th></tr></thead>
                    <tbody>
                      {([['pilares', 'Pilares', p.pilares.length], ['vigas', 'Vigas', p.vigas.length], ['eixos', 'Eixos', p.eixos.length]] as const).map(([c, rot, n]) => (
                        <tr key={c}><td className="tl">{rot}</td><td className="num">{n}</td><td><Input type="checkbox" aria-label={`Lançar ${rot.toLowerCase()} de ${x.nome}`} checked={!fora[`${x.chave}:${c}`]} disabled={!n} onChange={(e) => setFora((f) => ({ ...f, [`${x.chave}:${c}`]: !e.target.checked }))} /></td></tr>
                      ))}
                      <tr><td className="tl">Aberturas</td><td className="num">{p.aberturas.length}</td><td /></tr>
                      <tr><td className="tl">Contorno do edifício</td><td className="num">{p.contorno ? 1 : 0}</td><td /></tr>
                    </tbody>
                  </table>
                  {p.jaLancados.length > 0 && <Hint>{p.jaLancados.length} elemento(s) já lançado(s) deste gabarito não entram de novo.</Hint>}
                  {amb.length > 0 && (
                    <div className="lanc-amb">
                      <Note>Ambíguos (marque para incluir):</Note>
                      {amb.map((q) => (
                        <Check key={q.origem} label={`Incluir ${q.ambiguo} em ${x.nome} (${q.origem.slice(-4)})`} checked={!!incluidos[q.origem]} onChange={(v) => setIncluidos((s) => ({ ...s, [q.origem]: v }))} />
                      ))}
                    </div>
                  )}
                  {p.ambiguos.filter((a) => !a.origem).map((a, j) => <Note key={j}>{a.mensagem}</Note>)}
                  {p.ignorados.map((g) => <Hint key={`${g.camada}${g.motivo}`}>Ignorado em {g.camada}: {g.quantidade} × {g.motivo}.</Hint>)}
                  {p.avisos.map((a) => <Hint key={a}>{a}</Hint>)}
                </div>
              );
            })}
            <Hint>{total} elemento(s) na proposta. Tudo entra num único passo do histórico (desfazer volta ao estado anterior).</Hint>
          </>
        )}
      </div>
      <div className="lanc-rodape">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Spacer />
        <span className="muted">Passo {k + 1} de 4</span>
        <Button disabled={k === 0} onClick={() => setPasso(ordem[k - 1])}>Voltar</Button>
        {passo !== 'revisao' && <Button variant="primary" disabled={!podeAvancar} onClick={() => setPasso(ordem[k + 1])}>Avançar</Button>}
        {passo === 'revisao' && <Button variant="primary" disabled={!itens.length} onClick={aplicar}>Aplicar lançamento</Button>}
      </div>
    </Modal>
  );
}
