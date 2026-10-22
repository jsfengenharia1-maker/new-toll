// Cortes do edifício e linhas de seção (V2): grupo da barra lateral (lançar, nomear, lado visto, profundidade, apagar) e
// janela com a elevação do corte ou com o diagrama da seção do pavimento. A geometria vem de core/vista3d/corte.ts.
import { useMemo } from 'react';
import { Button, Check, Group, Hint, Modal, NumField, Select, TextCell } from '../ui';
import { pavimentosOrdenados, type BuildingModel } from '../../core/building/types';
import { construirCena } from '../../core/vista3d/cena';
import { desenharCorte, secaoDoPavimento } from '../../core/vista3d/corte';
import { useBuilding } from './store';
import { usePlanta } from './plantaStore';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const LADOS = [{ v: 'esq' as const, label: 'esquerda do traçado' }, { v: 'dir' as const, label: 'direita do traçado' }];

/** Grupo "Cortes e seções" da barra lateral. */
export function CortesGrupo({ b, onPlanta }: { b: BuildingModel; onPlanta?: () => void }) {
  const { exec } = useBuilding();
  const pl = usePlanta();
  const cs = b.cortes ?? [], ss = b.secoes ?? [];
  const ps = pavimentosOrdenados(b);
  const abrir = (tipo: 'corte' | 'secao', id: string) => pl.set({ janelaCorte: { tipo, id } });
  return (
    <Group title={`Cortes e seções (${cs.length + ss.length})`} open={cs.length + ss.length > 0}>
      <div className="row wrap" data-cortes-lancar>
        <Select label="Lado visto do novo corte" value={pl.corteLanc.sentido} options={LADOS} onChange={(v) => pl.set({ corteLanc: { ...pl.corteLanc, sentido: v } })} />
        <NumField label="Profundidade do novo corte" unit="m" width={120} value={pl.corteLanc.profundidade} onChange={(v) => pl.set({ corteLanc: { ...pl.corteLanc, profundidade: Math.max(0, v) } })} />
      </div>
      <div className="row wrap">
        <Button onClick={() => { pl.set({ ferramenta: 'corte' }); onPlanta?.(); }}>Traçar corte na planta</Button>
        <Button onClick={() => { pl.set({ ferramenta: 'secao' }); onPlanta?.(); }}>Traçar linha de seção na planta</Button>
        <Check label="Mostrar cortes e seções na planta" checked={pl.mostrarCortes} onChange={(v) => pl.set({ mostrarCortes: v })} />
      </div>
      <Hint>Profundidade 0 = até o fim do edifício. O corte olha para o lado escolhido do traçado, no sentido em que os pontos foram dados.</Hint>
      {cs.length > 0 && (
        <div className="corte-lista" data-cortes-lista>
          {cs.map((c) => (
            <div key={c.id} className="corte-item" data-corte={c.id}>
              <TextCell value={c.nome} label={`Nome do corte ${c.nome}`} onCommit={(v) => exec('corte.editar', { id: c.id, nome: v })} />
              <Select aria-label={`Lado visto de ${c.nome}`} value={c.sentido} options={LADOS} onChange={(v) => exec('corte.editar', { id: c.id, sentido: v })} />
              <NumField label={`Profundidade de ${c.nome}`} unit="m" width={110} value={c.profundidade ?? 0} onChange={(v) => exec('corte.editar', { id: c.id, profundidade: Math.max(0, v) })} />
              <Button variant="mini" onClick={() => abrir('corte', c.id)}>{`Abrir ${c.nome}`}</Button>
              <Button variant="mini" aria-label={`Apagar ${c.nome}`} onClick={() => exec('corte.remover', { ids: [c.id] })}>×</Button>
            </div>
          ))}
        </div>
      )}
      {ss.length > 0 && (
        <div className="corte-lista" data-secoes-lista>
          {ss.map((s) => (
            <div key={s.id} className="corte-item" data-secao={s.id}>
              <TextCell value={s.nome} label={`Nome da seção ${s.nome}`} onCommit={(v) => exec('secao.editar', { id: s.id, nome: v })} />
              <span className="muted">{ps.find((p) => p.id === s.pavimento)?.nome ?? 'pavimento de lançamento'}</span>
              <Button variant="mini" onClick={() => abrir('secao', s.id)}>{`Abrir ${s.nome}`}</Button>
              <Button variant="mini" aria-label={`Apagar ${s.nome}`} onClick={() => exec('secao.remover', { ids: [s.id] })}>×</Button>
            </div>
          ))}
        </div>
      )}
    </Group>
  );
}

/** Janela do corte ou da seção aberta em `plantaStore.janelaCorte` (abre sozinha ao traçar). */
export function JanelaCorte() {
  const b = useBuilding((s) => s.sessao.modelo);
  const rev = useBuilding((s) => s.rev);
  const dim = useBuilding((s) => s.dim);
  const j = usePlanta((s) => s.janelaCorte);
  const plPav = usePlanta((s) => s.pavimento);
  const set = usePlanta((s) => s.set);
  const corte = j?.tipo === 'corte' ? b.cortes?.find((c) => c.id === j.id) : undefined;
  const secao = j?.tipo === 'secao' ? b.secoes?.find((c) => c.id === j.id) : undefined;
  const ps = pavimentosOrdenados(b);
  const pavSecao = secao ? (ps.some((p) => p.id === secao.pavimento) ? secao.pavimento! : ps.some((p) => p.id === plPav) ? plPav! : ps[0]?.id ?? '') : '';
  const des = useMemo(() => (corte ? desenharCorte(b, corte, { cena: construirCena(b, { fundacoes: dim?.fundacoes, vigasFundacao: dim?.vigasFundacao }) }) : null), [b, rev, corte, dim?.fundacoes, dim?.vigasFundacao]);
  const sec = useMemo(() => (secao ? secaoDoPavimento(b, secao, pavSecao) : null), [b, rev, secao, pavSecao]);
  if (!j || (!corte && !secao)) return null;
  const fechar = () => set({ janelaCorte: null });
  return (
    <Modal titulo={corte ? `Corte — ${corte.nome}` : `Seção — ${secao!.nome}`} onClose={fechar} larga>
      {des && (
        <div data-janela-corte={corte!.id}>
          <div className="corte-folha" dangerouslySetInnerHTML={{ __html: des.svg }} />
          <p className="muted">{des.cena.secoes.length} polígono(s) seccionado(s); {des.cena.vistos.length} elemento(s) vistos além do plano{corte!.profundidade ? ` até ${fmt(corte!.profundidade)} m` : ''}. Níveis: {des.niveis.map((n) => `${n.nome} ${fmt(n.cota)}`).join(' · ')}.</p>
        </div>
      )}
      {sec && secao && (
        <div data-janela-secao={secao.id}>
          <div className="row wrap">
            <Select label="Pavimento da seção" value={pavSecao} options={[...ps].reverse().map((p) => ({ v: p.id, label: p.nome }))} onChange={(v) => useBuilding.getState().exec('secao.editar', { id: secao.id, pavimento: v })} />
          </div>
          <div className="corte-folha" dangerouslySetInnerHTML={{ __html: sec.svg }} />
          <table className="data quadro" data-secao-vaos>
            <thead><tr><th>Vão entre</th><th>Livre (m)</th><th>Eixo a eixo (m)</th><th>Laje</th></tr></thead>
            <tbody>
              {sec.vaos.map((v, i) => <tr key={i}><td>{v.apoioIni} — {v.apoioFim}</td><td className="num">{fmt(v.livre)}</td><td className="num">{fmt(v.eixo)}</td><td>{v.laje ? 'sim' : 'não'}</td></tr>)}
              {!sec.vaos.length && <tr><td colSpan={4} className="muted">A linha não cruza dois apoios neste pavimento.</td></tr>}
            </tbody>
          </table>
          <p className="muted">Comprimento da linha {fmt(sec.comprimento)} m · {sec.elementos.length} elemento(s) cortado(s) em {sec.pavimentoNome}.</p>
        </div>
      )}
    </Modal>
  );
}
