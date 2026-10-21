// Compatibilidade entre casos, opção de combinar os adicionais e gerador de arranjos (xadrez, faixas e carga móvel).
import { useState } from 'react';
import { casosDaObra, relacaoEfetiva, type BuildingModel, type RelacaoCasos } from '../../core/building/types';
import { Button, Check, Hint, NumField, Select, TextField } from '../ui';
import { useBuilding } from './store';

const RELACOES: { v: RelacaoCasos; label: string }[] = [{ v: 'compativel', label: 'compatível' }, { v: 'incompativel', label: 'incompatível' }, { v: 'simultaneo', label: 'simultâneo' }];

/** Tabela par a par dos casos variáveis (Q) e dos horizontais (W): relação efetiva, editável. */
export function CompatibilidadeCasos({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const todos = casosDaObra(b);
  const blocos = (['Q', 'W'] as const).map((n) => ({ n, cs: todos.filter((c) => c.natureza === n) })).filter((x) => x.cs.length >= 2);
  if (!blocos.length) return null;
  return (
    <details className="small">
      <summary>Compatibilidade entre casos</summary>
      {blocos.map(({ n, cs }) => (
        <div key={n} className="tablewrap">
          <table className="data quadro">
            <caption>{n === 'Q' ? 'Casos variáveis (Q)' : 'Casos horizontais (W)'}</caption>
            <thead><tr><th />{cs.slice(1).map((c) => <th key={c.id}>{c.nome}</th>)}</tr></thead>
            <tbody>
              {cs.slice(0, -1).map((a, i) => (
                <tr key={a.id}>
                  <td className="tl">{a.nome}</td>
                  {cs.slice(1).map((z, j) => j + 1 <= i ? <td key={z.id} /> : (
                    <td key={z.id}>
                      <select aria-label={`Relação entre ${a.nome} e ${z.nome}`} value={relacaoEfetiva(todos, a.id, z.id)} onChange={(e) => exec('caso.compatibilidade', { a: a.id, b: z.id, relacao: e.target.value })}>
                        {RELACOES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <Hint>Tabela derivada do grupo, do caso simultâneo e dos arranjos; o que você muda aqui vale como exceção. A incompatibilidade vale por componente: se A é incompatível com B e B com C, os três são excludentes. Simultâneo: o caso da linha entra com o mesmo fator do da coluna (o mais à direita segue o da esquerda quando a linha é a primeira).</Hint>
    </details>
  );
}

/** Opção por natureza: os casos adicionais se combinam entre si (padrão) ou são mutuamente excludentes. */
export function CombinarAdicionais({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const ad = b.casos ?? [];
  const naturezas = (['Q', 'W'] as const).filter((n) => ad.filter((c) => c.natureza === n && !c.pai).length >= 2 || b.norma.combinarAdicionais?.[n] === false);
  if (!naturezas.length) return null;
  return (
    <div className="row wrap">
      {naturezas.map((n) => (
        <Check key={n} label={`Casos adicionais ${n === 'Q' ? 'variáveis (Q)' : 'horizontais (W)'} se combinam entre si`} checked={b.norma.combinarAdicionais?.[n] !== false} onChange={(v) => exec('estados.definir', { combinarAdicionais: { [n]: v } })} />
      ))}
    </div>
  );
}

const MODOS = [{ v: 'xadrez', label: 'Xadrez por pano (2 arranjos)' }, { v: 'faixasX', label: 'Colunas alternadas (2 arranjos)' }, { v: 'faixasY', label: 'Linhas alternadas (2 arranjos)' }, { v: 'movel', label: 'Carga móvel (uma posição por passo)' }] as const;

/** "x1,y1; x2,y2; …" → pontos (m); null se mal formado. */
export function lerTrajeto(t: string): [number, number][] | null {
  const pts = t.split(/[;\n]/).map((s) => s.trim()).filter(Boolean).map((s) => s.split(/[\s,]+(?=[-\d])/).map((v) => parseFloat(v.replace(',', '.'))));
  if (pts.length < 2 || pts.some((p) => p.length !== 2 || p.some((v) => !Number.isFinite(v)))) return null;
  return pts as [number, number][];
}

/** Gerador de cargas alternadas (xadrez/faixas por pano) e de carga móvel, como casos filhos incompatíveis entre si. */
export function ArranjosCasos({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const [modo, setModo] = useState<(typeof MODOS)[number]['v']>('xadrez');
  const [escolhido, setGrupo] = useState('');
  // sem escolha, o primeiro grupo com 2 lajes ou mais (os panos a alternar)
  const grupo = b.grupos.some((g) => g.id === escolhido) ? escolhido : (b.grupos.find((g) => b.lajes.filter((l) => l.grupo === g.id).length >= 2) ?? b.grupos[0])?.id ?? '';
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState(0);
  const [traj, setTraj] = useState('0, 0; 4, 0');
  const [passo, setPasso] = useState(1);
  const [carga, setCarga] = useState<'ponto' | 'linha'>('ponto');
  const [comp, setComp] = useState(2);
  const [orient, setOrient] = useState<'trajeto' | 'transversal'>('trajeto');
  const g = b.grupos.find((x) => x.id === grupo);
  const movel = modo === 'movel';
  const trajeto = lerTrajeto(traj);
  const pronto = !!nome.trim() && !!g && (!movel || (!!trajeto && passo > 0 && valor > 0 && (carga === 'ponto' || comp > 0)));
  const gerar = () => {
    const base = { modo, grupo, nome: nome.trim() };
    exec('caso.arranjos', movel ? { ...base, trajeto, passo, valor, carga, ...(carga === 'linha' ? { comprimento: comp, orientacao: orient } : {}) } : { ...base, ...(valor > 0 ? { valor } : {}) });
    setNome('');
  };
  return (
    <details className="small">
      <summary>Arranjos alternados e móveis</summary>
      <div className="row wrap">
        <Select label="Tipo de arranjo" value={modo} options={MODOS.map((m) => ({ v: m.v, label: m.label }))} onChange={setModo} />
        <Select label="Grupo" value={grupo} options={b.grupos.map((x) => ({ v: x.id, label: x.nome }))} onChange={setGrupo} />
        <TextField label="Nome do caso" value={nome} onChange={setNome} />
      </div>
      <div className="row wrap">
        <NumField label={movel ? (carga === 'ponto' ? 'Carga (kN)' : 'Carga (kN/m)') : 'Carga (kN/m²; 0 = a do grupo)'} width={150} value={valor} onChange={setValor} />
        {movel && (
          <>
            <TextField label="Trajeto (x, y; x, y; …) em m" value={traj} onChange={setTraj} />
            <NumField label="Passo" unit="m" width={90} value={passo} onChange={setPasso} />
            <Select label="Carga" value={carga} options={[{ v: 'ponto', label: 'concentrada (kN)' }, { v: 'linha', label: 'em linha (kN/m)' }]} onChange={setCarga} />
            {carga === 'linha' && <NumField label="Comprimento" unit="m" width={100} value={comp} onChange={setComp} />}
            {carga === 'linha' && <Select label="Direção da linha" value={orient} options={[{ v: 'trajeto', label: 'ao longo do trajeto' }, { v: 'transversal', label: 'transversal ao trajeto' }]} onChange={setOrient} />}
          </>
        )}
        <Button variant="primary" disabled={!pronto} onClick={gerar}>Gerar arranjos</Button>
      </div>
      {movel && !trajeto && <Hint>Trajeto inválido: informe ao menos dois pontos “x, y” separados por “;”.</Hint>}
      <Hint>{movel ? 'Uma posição da carga a cada passo ao longo do trajeto (até 60), cada uma como caso filho do novo caso; os arranjos nunca atuam juntos.' : 'Cria o caso-pai e dois arranjos com a carga de área nos panos alternados do grupo (cor de um tabuleiro ou colunas/linhas), e zera a carga variável geral do grupo para não somar duas vezes.'} O pai deixa de combinar e carrega a natureza e o ψ dos arranjos.</Hint>
    </details>
  );
}
