// Importação de IFC em quatro passos (L3): Arquivo (leitura pelo web-ifc e relatório de classes), Edifício e pavimentos (nome,
// cota, pé-direito, uso, grupo), Materiais (material do arquivo ligado a cada tipo de elemento) e Revisão da proposta.
// Tudo entra por um único comando (`ifc.importar`, um passo no histórico) numa obra nova.
import { useMemo, useState } from 'react';
import { USOS, type CategoriaUso } from '../../core/building/types';
import type { IfcLido } from '../../core/ifc/ler';
import { TIPOS_ELEMENTO, textoMaterial, valoresDoMaterial, type AtribuicaoMaterial, type TipoElementoIfc } from '../../core/ifc/materiais';
import { agruparPavimentos, mapeamentoPadrao, propostaIfc, type MapeamentoIfc, type PavimentoMapeado } from '../../core/ifc/proposta';
import { useStore } from '../store';
import { Alert, Button, Check, Dropdown, FilePick, Hint, Input, Modal, Note, NumCell, OptNumField, Pill, Select, Seg, Spacer, TextCell, TextField } from '../ui';
import { lerArquivoIfc } from './ifcLeitura';
import { useBuilding } from './store';

type Passo = 'arquivo' | 'pavimentos' | 'materiais' | 'revisao';
const PASSOS: { v: Passo; label: string }[] = [{ v: 'arquivo', label: 'Arquivo' }, { v: 'pavimentos', label: 'Edifício e pavimentos' }, { v: 'materiais', label: 'Materiais' }, { v: 'revisao', label: 'Revisão' }];
const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const ACOS: { v: string; label: string }[] = [{ v: '', label: 'o da obra' }, { v: 'CA-50', label: 'CA-50' }, { v: 'CA-60', label: 'CA-60' }];

export function LancamentoIfc({ onClose, onCriada }: { onClose(): void; onCriada(): void }) {
  const { novo } = useBuilding();
  const [passo, setPasso] = useState<Passo>('arquivo');
  const [nomeArq, setNomeArq] = useState('');
  const [lido, setLido] = useState<IfcLido | null>(null);
  const [mapa, setMapa] = useState<MapeamentoIfc | null>(null);
  const [estado, setEstado] = useState<'' | 'carregando' | 'lendo'>('');
  const [erro, setErro] = useState('');
  const [lajes, setLajes] = useState(true);
  const [excluidos, setExcluidos] = useState<Record<string, boolean>>({});

  const abrir = async (f: File) => {
    setErro(''); setLido(null); setMapa(null); setEstado('carregando');
    try {
      const l = await lerArquivoIfc(f, () => setEstado('lendo'));
      setLido(l); setMapa(mapeamentoPadrao(l)); setNomeArq(f.name); setExcluidos({});
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
    setEstado('');
  };

  const proposta = useMemo(() => (lido && mapa && passo === 'revisao' ? propostaIfc(lido, mapa, nomeArq) : null), [lido, mapa, passo, nomeArq]);
  const ordem = PASSOS.map((p) => p.v);
  const k = ordem.indexOf(passo);
  const incluidos = mapa?.pavimentos.filter((p) => p.incluir) ?? [];
  const podeAvancar = passo === 'arquivo' ? !!lido && !!mapa : passo === 'pavimentos' ? incluidos.length > 0 && !!mapa?.obra.nome.trim() : true;

  const mudarPav = (storey: number, p: Partial<PavimentoMapeado>) => setMapa((m) => (m ? { ...m, pavimentos: m.pavimentos.map((x) => (x.storey === storey ? { ...x, ...p } : x)) } : m));
  const mudarMat = (t: TipoElementoIfc, p: Partial<AtribuicaoMaterial>) => setMapa((m) => (m ? { ...m, materiais: { ...m.materiais, [t]: { ...m.materiais[t], ...p } } } : m));
  const escolherMaterial = (t: TipoElementoIfc, nome: string) => setMapa((m) => (m && lido ? { ...m, materiais: { ...m.materiais, [t]: nome ? valoresDoMaterial(lido.materiais.find((x) => x.nome === nome)) : {} } } : m));
  const sugerirGrupos = () => { if (lido) { const g = agruparPavimentos(lido); setMapa((m) => (m ? { ...m, pavimentos: m.pavimentos.map((p) => ({ ...p, grupo: g.get(p.storey) ?? p.nome })) } : m)); } };
  const quantos = (id: number) => (lido ? [lido.colunas, lido.vigas, lido.lajes, lido.paredes].map((l) => l.filter((x) => x.pavimento === id).length) : [0, 0, 0, 0]);

  const importar = () => {
    if (!proposta) return;
    novo(true);
    const r = useBuilding.getState().exec('ifc.importar', { proposta, excluir: Object.entries(excluidos).filter(([, v]) => v).map(([o]) => o), lajes });
    if (r.ok) { useStore.getState().set({ message: `Importação do IFC “${nomeArq}” aplicada.` }); onCriada(); } else setErro(r.erros?.[0]?.mensagem ?? 'A importação foi recusada.');
  };

  return (
    <Modal titulo="Importação de IFC" onClose={onClose} larga>
      <Seg small value={passo} onChange={setPasso} options={PASSOS.map((p) => ({ v: p.v, label: p.label }))} />
      <div className="lanc" data-ifc-passo={passo}>
        {passo === 'arquivo' && (
          <>
            <Hint>Escolha um arquivo IFC (IFC2x3 ou IFC4) do projeto de arquitetura ou de estrutura. O leitor (web-ifc, cerca de 1,6 MB) é carregado só agora; nada é lançado antes da revisão.</Hint>
            <div className="row wrap"><FilePick label="Escolher arquivo IFC…" accept=".ifc" onFile={(f) => void abrir(f)} disabled={estado !== ''} /></div>
            {estado === 'carregando' && <Hint>Carregando o leitor de IFC…</Hint>}
            {estado === 'lendo' && <Hint>Lendo o arquivo…</Hint>}
            {erro && <Alert>{erro}</Alert>}
            {lido && (
              <div className="masc" data-ifc-resumo>
                <div className="row wrap"><b>{nomeArq}</b><Pill>{lido.esquema}</Pill><span className="muted small">unidade do arquivo: {lido.unidade === 1 ? 'm' : lido.unidade === 0.001 ? 'mm' : lido.unidade === 0.01 ? 'cm' : `${lido.unidade} m`}</span></div>
                <table className="data">
                  <thead><tr><th>Classe IFC</th><th>Quantidade</th></tr></thead>
                  <tbody>
                    <tr><td className="tl">IfcBuildingStorey</td><td className="num">{lido.pavimentos.length}</td></tr>
                    {Object.entries(lido.classes).map(([c, n]) => <tr key={c}><td className="tl">{c}</td><td className="num">{n}</td></tr>)}
                  </tbody>
                </table>
                {lido.avisos.map((a, i) => <Hint key={i}>{a.mensagem}</Hint>)}
              </div>
            )}
          </>
        )}

        {passo === 'pavimentos' && mapa && lido && (
          <>
            <Hint>Dados do edifício e dos pavimentos lidos do arquivo: confira nome, cota do topo da laje [a confirmar], uso e grupo. Pavimentos com o mesmo nome de grupo compartilham a planta (pavimento-tipo).</Hint>
            <div className="row wrap">
              <TextField label="Nome da obra" value={mapa.obra.nome} onChange={(v) => setMapa({ ...mapa, obra: { ...mapa.obra, nome: v } })} />
              <TextField label="Cidade" value={mapa.obra.cidade ?? ''} onChange={(v) => setMapa({ ...mapa, obra: { ...mapa.obra, cidade: v || undefined } })} />
            </div>
            <table className="data" data-ifc-pavimentos>
              <thead><tr><th>Incluir</th><th>Pavimento</th><th>Cota (m)</th><th>Pé-direito (m)</th><th>Uso</th><th>Grupo</th><th title="pilares / vigas / lajes / paredes no pavimento">Elementos</th></tr></thead>
              <tbody>
                {mapa.pavimentos.map((p) => {
                  const anterior = [...incluidos].filter((x) => x.cota < p.cota).sort((a, b) => b.cota - a.cota)[0];
                  const q = quantos(p.storey);
                  return (
                    <tr key={p.storey}>
                      <td><Input type="checkbox" aria-label={`Incluir ${p.nome}`} checked={p.incluir} onChange={(e) => mudarPav(p.storey, { incluir: e.target.checked })} /></td>
                      <td className="tl"><TextCell value={p.nome} label={`Nome de ${p.nome}`} onCommit={(v) => mudarPav(p.storey, { nome: v })} /></td>
                      <td><NumCell value={p.cota} label={`Cota de ${p.nome}`} onChange={(v) => mudarPav(p.storey, { cota: v })} /></td>
                      <td className="num">{p.incluir && anterior ? fmt(p.cota - anterior.cota) : '—'}</td>
                      <td><Dropdown aria-label={`Uso de ${p.nome}`} value={p.uso} onChange={(e) => mudarPav(p.storey, { uso: e.target.value as CategoriaUso })}>{USOS.map((u) => <option key={u.v} value={u.v}>{u.label}</option>)}</Dropdown></td>
                      <td className="tl"><TextCell value={p.grupo} label={`Grupo de ${p.nome}`} onCommit={(v) => mudarPav(p.storey, { grupo: v })} /></td>
                      <td className="num">{q.join(' / ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="row wrap"><Button onClick={sugerirGrupos}>Sugerir grupos pela geometria</Button></div>
            {incluidos.length === 0 && <Note tone="bad">Inclua ao menos um pavimento.</Note>}
          </>
        )}

        {passo === 'materiais' && mapa && lido && (
          <>
            <Hint>Os materiais do arquivo são ligados a tipos de elemento estrutural: o fck e o aço atribuídos a cada tipo aparecem ao lado da propriedade lida. Sem material no arquivo, vale o da obra.</Hint>
            <table className="data" data-ifc-materiais-arquivo>
              <thead><tr><th>Material do arquivo</th><th>Classe lida</th><th>Pilares</th><th>Vigas</th><th>Lajes</th><th>Paredes</th></tr></thead>
              <tbody>
                {lido.materiais.length === 0 && <tr><td className="tl" colSpan={6}>O arquivo não traz materiais.</td></tr>}
                {lido.materiais.map((m) => <tr key={m.nome}><td className="tl">{m.nome}</td><td className="tl">{textoMaterial(m)}</td><td className="num">{m.usos.coluna}</td><td className="num">{m.usos.viga}</td><td className="num">{m.usos.laje}</td><td className="num">{m.usos.parede}</td></tr>)}
              </tbody>
            </table>
            {TIPOS_ELEMENTO.map((t) => {
              const a = mapa.materiais[t.v] ?? {};
              return (
                <div key={t.v} className="masc" data-ifc-tipo={t.v}>
                  <b>{t.rotulo}</b>
                  <div className="row wrap">
                    <Select label={`Material de ${t.rotulo.toLowerCase()}`} value={a.material ?? ''} options={[{ v: '', label: '(sem material: o da obra)' }, ...lido.materiais.map((m) => ({ v: m.nome, label: m.nome }))]} onChange={(v) => escolherMaterial(t.v, v)} />
                    <OptNumField label={`fck de ${t.rotulo.toLowerCase()}`} unit="MPa" width={110} value={a.fck} onChange={(v) => mudarMat(t.v, { fck: v })} />
                    <Select label={`Aço de ${t.rotulo.toLowerCase()}`} value={a.aco ?? ''} options={ACOS} onChange={(v) => mudarMat(t.v, { aco: (v || undefined) as AtribuicaoMaterial['aco'] })} />
                  </div>
                </div>
              );
            })}
          </>
        )}

        {passo === 'revisao' && mapa && proposta && (
          <>
            <div className="row wrap">
              <Check label="Levar os extremos das vigas ao centro dos pilares" checked={mapa.ajustarExtremos} onChange={(v) => setMapa({ ...mapa, ajustarExtremos: v })} />
              <Check label="Lançar paredes de concreto" checked={mapa.paredes} onChange={(v) => setMapa({ ...mapa, paredes: v })} />
              <Check label="Criar lajes nos panos fechados por vigas" checked={lajes} onChange={setLajes} />
            </div>
            <table className="data" data-ifc-revisao>
              <thead><tr><th>Elemento</th><th>Quantidade</th><th>Lançar</th></tr></thead>
              <tbody>
                {([['Pavimentos', proposta.contagens.pavimentos, null], ['Grupos', proposta.contagens.grupos, null], ['Pilares', proposta.contagens.pilares, proposta.pilares.map((q) => q.origem)],
                  ['Vigas', proposta.contagens.vigas, proposta.vigas.map((q) => q.origem)], ['Lajes (IfcSlab)', proposta.contagens.lajes, proposta.lajes.map((q) => q.origem)], ['Paredes de concreto', proposta.contagens.paredes, proposta.paredes.map((q) => q.origem)]] as const).map(([rot, n, orig]) => (
                  <tr key={rot}>
                    <td className="tl">{rot}</td><td className="num">{n}</td>
                    <td>{orig ? <Input type="checkbox" aria-label={`Lançar ${rot.toLowerCase()}`} checked={!orig.some((o) => excluidos[o])} disabled={!n} onChange={(e) => setExcluidos((s) => ({ ...s, ...Object.fromEntries(orig.map((o) => [o, !e.target.checked])) }))} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {proposta.contagens.extremosAjustados > 0 && <Hint>{proposta.contagens.extremosAjustados} extremo(s) de viga levado(s) ao centro do pilar.</Hint>}
            {proposta.ambiguos.map((a, i) => <Note key={i}>{a.mensagem}</Note>)}
            {proposta.ignorados.map((g) => <Hint key={`${g.classe}${g.motivo}`}>Ignorado: {g.quantidade} × {g.classe} ({g.motivo}).</Hint>)}
            {proposta.avisos.map((a, i) => <Hint key={i}>{a}</Hint>)}
            {erro && <Alert>{erro}</Alert>}
            <Note>A nova obra substitui a obra atual. Tudo entra num único passo do histórico (desfazer volta ao estado anterior).</Note>
          </>
        )}
      </div>
      <div className="lanc-rodape">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Spacer />
        <span className="muted">Passo {k + 1} de 4</span>
        <Button disabled={k === 0} onClick={() => setPasso(ordem[k - 1])}>Voltar</Button>
        {passo !== 'revisao' && <Button variant="primary" disabled={!podeAvancar} onClick={() => setPasso(ordem[k + 1])}>Avançar</Button>}
        {passo === 'revisao' && <Button variant="primary" disabled={!proposta} onClick={importar}>Importar</Button>}
      </div>
    </Modal>
  );
}
