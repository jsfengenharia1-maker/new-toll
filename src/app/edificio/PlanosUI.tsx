// Planos inclinados (frente E3f): lista e propriedades do plano na doca Propriedades, janela "Novo plano" e a ação da faixa. Os planos
// do grupo têm definição por três pontos, por reta horizontal + inclinação ou por máxima declividade; panos e vigas recebem o plano
// por `plano.atribuir`. Comandos: `plano.criar`, `plano.editar`, `plano.remover` e `plano.atribuir`.
import { useState, type ReactNode } from 'react';
import { coeficientesPlano, grausDaTangente, inclinacaoDoPlano, planoAtribuido, vigasIncoerentes } from '../../core/building/planos';
import { pavimentosOrdenados, type BuildingModel, type Plano } from '../../core/building/types';
import { Button, Group, Hint, Modal, NumField, Pill, RibbonButton, RibbonGroup, Select, TextField } from '../ui';
import { useStore } from '../store';
import { usePlanta } from './plantaStore';
import { useBuilding } from './store';
import { CORES_PLANO, DADOS_PLANO_NOVO, dadosDoPlano, fmtPlano, paramsDoPlano, rotuloPlano, TIPOS_DEF, trocaTipoDef, type DadosPlano } from './planosUtil';

/** Grupo de pavimentos da planta atual. */
export function grupoDaPlanta(b: BuildingModel, pavimento: string | null) {
  const ps = pavimentosOrdenados(b);
  const pav = ps.find((p) => p.id === pavimento) ?? ps[Math.min(1, ps.length - 1)];
  return b.grupos.find((g) => g.id === pav?.grupo);
}

/** Campos do plano (nome, cor, definição, pontos, desnível e inclinação); cada alteração devolve os dados novos. */
function CamposPlano({ d, onChange }: { d: DadosPlano; onChange: (n: DadosPlano) => void }) {
  const tres = d.tipo === 'tresPontos';
  const ponto = (k: number, i: number, v: number) => onChange({ ...d, pontos: d.pontos.map((q, j) => (j === k ? q.map((x, m) => (m === i ? v : x)) : q)) });
  const unidade = (u: '%' | 'graus') => onChange({ ...d, unidade: u, inclinacao: u === 'graus' ? +grausDaTangente(d.inclinacao / 100).toFixed(4) : +(Math.tan((d.inclinacao * Math.PI) / 180) * 100).toFixed(4) });
  return (
    <>
      <div className="row wrap">
        <TextField label="Nome do plano" value={d.nome} onChange={(x) => onChange({ ...d, nome: x.trim() })} />
        <Select label="Cor do plano" value={d.cor} options={CORES_PLANO} onChange={(v) => onChange({ ...d, cor: v })} />
        <Select label="Definição do plano" value={d.tipo} options={TIPOS_DEF} onChange={(v) => onChange(trocaTipoDef(d, v))} />
      </div>
      <div className="row wrap">
        {d.pontos.map((q, k) => (
          <span key={k} className="row wrap">
            <NumField label={`x${k + 1}`} unit="m" width={90} value={q[0]} onChange={(v) => ponto(k, 0, v)} />
            <NumField label={`y${k + 1}`} unit="m" width={90} value={q[1]} onChange={(v) => ponto(k, 1, v)} />
            {tres && <NumField label={`z${k + 1}`} unit="m" width={90} value={q[2]} onChange={(v) => ponto(k, 2, v)} />}
          </span>
        ))}
      </div>
      {!tres && (
        <div className="row wrap">
          <NumField label="Desnível do plano" unit="m" width={110} value={d.desnivel} onChange={(v) => onChange({ ...d, desnivel: v })} />
          <NumField label="Inclinação do plano" unit={d.unidade === '%' ? '%' : '°'} width={110} value={d.inclinacao} onChange={(v) => onChange({ ...d, inclinacao: v })} />
          <Select label="Unidade da inclinação" value={d.unidade} options={[{ v: '%', label: '%' }, { v: 'graus', label: 'graus' }]} onChange={unidade} />
        </div>
      )}
    </>
  );
}

/** Propriedades do plano selecionado: cada alteração chama `plano.editar`. */
export function PropriedadesPlano({ pl }: { pl: Plano }) {
  const { exec } = useBuilding();
  const b = useBuilding((s) => s.sessao.modelo);
  const [un, setUn] = useState<'%' | 'graus'>('%');
  const base = dadosDoPlano(pl);
  const d: DadosPlano = un === '%' ? base : { ...base, unidade: 'graus', inclinacao: +grausDaTangente(base.inclinacao / 100).toFixed(4) };
  const c = coeficientesPlano(pl.def), inc = c ? inclinacaoDoPlano(c) : null;
  const muda = (n: DadosPlano) => {
    if (n.unidade !== un) { setUn(n.unidade); return; }
    const r = exec('plano.editar', { id: pl.id, nome: n.nome || pl.nome, cor: n.cor, ...paramsDoPlano(n) });
    if (!r.ok) useStore.getState().set({ message: r.erros[0]?.mensagem ?? 'Plano recusado.' });
  };
  return (
    <div data-propriedades-plano={pl.id}>
      <CamposPlano d={d} onChange={muda} />
      <p className="small">
        <span data-leitura-plano>Inclinação: {inc ? `${fmtPlano(inc.percentual)} % (${fmtPlano(inc.graus)}°)` : '—'}</span>
        {planoAtribuido(b, pl.id) && <> <Pill tone="ok">atribuído</Pill></>}
      </p>
      <div className="row wrap"><Button variant="danger" onClick={() => { exec('plano.remover', { ids: [pl.id] }); usePlanta.getState().set({ planoSel: null }); }}>Remover plano</Button></div>
    </div>
  );
}

/** Lista dos planos do grupo (a escolha vale também para a árvore do Navegador) e as propriedades do escolhido. */
export function ListaPlanos({ b, grupo }: { b: BuildingModel; grupo: string }) {
  const pl = usePlanta();
  const planos = (b.planos ?? []).filter((p) => p.grupo === grupo);
  const atual = planos.find((p) => p.id === pl.planoSel);
  if (!planos.length) return <Hint>Sem planos neste grupo. Use “Novo plano” na faixa (aba Edição, grupo Planos) e atribua depois aos panos e vigas selecionados.</Hint>;
  return (
    <>
      <Select label="Plano do grupo" value={atual?.id ?? ''} options={[{ v: '', label: '— escolha —' }, ...planos.map((p) => ({ v: p.id, label: rotuloPlano(p) }))]} onChange={(v) => pl.set({ planoSel: v || null })} />
      {atual && <PropriedadesPlano key={atual.id} pl={atual} />}
    </>
  );
}

/** Grupo "Planos" da doca Propriedades. */
export function PlanosGrupo({ b }: { b: BuildingModel }) {
  const pl = usePlanta();
  const grupo = grupoDaPlanta(b, pl.pavimento);
  const n = (b.planos ?? []).filter((p) => p.grupo === grupo?.id).length;
  return (
    <div data-grupo-planos>
      <Group title={`Planos — ${grupo?.nome ?? '—'} (${n})`} open={false}>
        {grupo && <ListaPlanos b={b} grupo={grupo.id} />}
        <DefinirNaPlanta />
        {grupo && <CorrigirVigas b={b} grupo={grupo.id} />}
        <Hint>Fluxo: lance panos e vigas na horizontal, crie o plano e atribua. O plano muda a cota do topo do pano e da viga (z = a·x + b·y + c); desnível e inclinação em relação ao topo do pavimento.</Hint>
      </Group>
    </div>
  );
}

/** Janela "Novo plano". */
export function CriarPlano({ b, grupo, onClose }: { b: BuildingModel; grupo: string; onClose: () => void }) {
  const { exec } = useBuilding();
  const [d, setD] = useState<DadosPlano>({ ...DADOS_PLANO_NOVO, cor: (b.planos ?? []).filter((p) => p.grupo === grupo).length % 8 });
  const [erro, setErro] = useState('');
  const criar = () => {
    const r = exec('plano.criar', { grupo, ...(d.nome.trim() ? { nome: d.nome.trim() } : {}), cor: d.cor, ...paramsDoPlano(d) });
    if (!r.ok) { setErro(r.erros[0]?.mensagem ?? 'Plano recusado.'); return; }
    const novo = useBuilding.getState().sessao.modelo.planos?.filter((p) => p.grupo === grupo).at(-1);
    usePlanta.getState().set({ planoSel: novo?.id ?? null });
    onClose();
  };
  return (
    <Modal titulo="Novo plano" onClose={onClose}>
      <div data-novo-plano>
        <CamposPlano d={d} onChange={setD} />
        {erro && <p className="small bad" role="alert" data-erros-plano>{erro}</p>}
        <div className="row wrap"><Button variant="primary" onClick={criar}>Criar</Button><Button onClick={onClose}>Cancelar</Button></div>
      </div>
    </Modal>
  );
}

/** Monta a janela "Novo plano" quando aberta pela faixa (colocada uma vez no Edifício). */
export function PlanosHost() {
  const b = useBuilding((s) => s.sessao.modelo);
  const aberta = usePlanta((s) => s.novoPlano), pavimento = usePlanta((s) => s.pavimento);
  const grupo = grupoDaPlanta(b, pavimento);
  return aberta && grupo ? <CriarPlano b={b} grupo={grupo.id} onClose={() => usePlanta.getState().set({ novoPlano: false })} /> : null;
}

/** Grupo "Planos" da faixa (aba Edição): novo plano e atribuir ou retirar o plano dos panos e vigas selecionados da planta. */
export function PlanosFaixa({ children }: { children?: ReactNode }) {
  const b = useBuilding((s) => s.sessao.modelo);
  const { exec } = useBuilding();
  const pl = usePlanta();
  const grupo = grupoDaPlanta(b, pl.pavimento);
  const lajes = b.lajes.filter((l) => pl.selecao.has(l.id) && l.grupo === grupo?.id).map((l) => l.id);
  const vigas = b.vigas.filter((v) => pl.selecao.has(v.id) && v.grupo === grupo?.id).map((v) => v.id);
  const plano = (b.planos ?? []).find((p) => p.id === pl.planoSel && p.grupo === grupo?.id);
  const alvo = { ...(lajes.length ? { lajes } : {}), ...(vigas.length ? { vigas } : {}) };
  const roda = (params: Record<string, unknown>) => { const r = exec('plano.atribuir', params); if (!r.ok) useStore.getState().set({ message: r.erros[0]?.mensagem ?? 'Atribuição recusada.' }); };
  return (
    <RibbonGroup label="Planos">
      <RibbonButton icon="laje" label="Novo plano" title="Cria um plano inclinado no grupo da planta atual (três pontos, reta horizontal + inclinação ou máxima declividade)" disabled={!grupo} onClick={() => pl.set({ novoPlano: true })} />
      <RibbonButton icon="zona" label="Atribuir plano" title="Atribui o plano escolhido no Navegador (ou no grupo Planos) aos panos e vigas selecionados na planta" disabled={!plano || !(lajes.length + vigas.length)} onClick={() => plano && roda({ plano: plano.id, ...alvo })} />
      <RibbonButton icon="dobra" label="Retirar plano" title="Volta os panos e vigas selecionados à horizontal" disabled={!(lajes.length + vigas.length)} onClick={() => roda(alvo)} />
      {children}
    </RibbonGroup>
  );
}

/** Definição do plano pelos cliques na planta (ferramenta `plano`): tipo e desníveis; visível com a ferramenta ativa. */
function DefinirNaPlanta() {
  const pl = usePlanta();
  const d = pl.planoDef, tres = d.tipo === 'tresPontos';
  if (pl.ferramenta !== 'plano') return <Hint>Para definir o plano na planta use “Definir plano na planta” (faixa, aba Edição, grupo Planos): marque os pontos com o mouse; o clique captura o eixo ou a face da viga mais próxima.</Hint>;
  return (
    <div data-definir-plano>
      <div className="row wrap">
        <Select label="Definição na planta" value={d.tipo} options={TIPOS_DEF} onChange={(v) => pl.set({ planoDef: { ...d, tipo: v } })} />
        {tres
          ? [0, 1, 2].map((k) => <NumField key={k} label={`Desnível do ponto ${k + 1}`} unit="m" width={110} value={d.z[k]} onChange={(v) => pl.set({ planoDef: { ...d, z: d.z.map((x, i) => (i === k ? v : x)) as [number, number, number] } })} />)
          : <>
            <NumField label="Desnível do primeiro ponto" unit="m" width={130} value={d.desnivel} onChange={(v) => pl.set({ planoDef: { ...d, desnivel: v } })} />
            <NumField label="Inclinação da definição na planta" unit="%" width={130} value={d.inclinacao} onChange={(v) => pl.set({ planoDef: { ...d, inclinacao: v } })} />
          </>}
      </div>
      <Hint>{tres ? 'Três cliques: um por ponto, com o desnível de cada um.' : d.tipo === 'retaHorizontal' ? 'Dois cliques: a reta horizontal; a inclinação sobe para a esquerda de p1 → p2.' : 'Dois cliques: a linha de máxima declividade; a inclinação sobe de p1 para p2.'} Esc cancela.</Hint>
    </div>
  );
}

/** Vigas incoerentes com o pano inclinado do grupo (PLANO_VIGA) e a correção pelo clique: copia a inclinação do pano para as selecionadas. */
function CorrigirVigas({ b, grupo }: { b: BuildingModel; grupo: string }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const inc = vigasIncoerentes(b, grupo);
  if (!inc.length) return null;
  const sel = [...new Set(inc.filter((x) => pl.selecao.has(x.viga)).map((x) => x.viga))];
  return (
    <div data-vigas-incoerentes>
      <p className="small bad" role="alert">{new Set(inc.map((x) => x.viga)).size} viga(s) não acompanham a inclinação do pano (erro PLANO_VIGA): selecione-as na planta e copie a inclinação do pano.</p>
      <div className="row wrap">
        <Button onClick={() => pl.set({ selecao: new Set(inc.map((x) => x.viga)) })}>Selecionar as vigas incoerentes</Button>
        <Button disabled={!sel.length} onClick={() => { const r = exec('plano.corrigirVigas', { vigas: sel }); if (!r.ok) useStore.getState().set({ message: r.erros[0]?.mensagem ?? 'Correção recusada.' }); }}>Copiar inclinação do pano</Button>
      </div>
    </div>
  );
}
