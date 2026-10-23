// Vigas curvas e viga comum a dois grupos (E2b, interface): dados do trecho curvo, poliviga (compor e decompor), viga comum
// (tornar comum, abrir o grupo de origem, desfazer) e ajuste a planos inclinados. O cálculo está em core/building/curvas.ts,
// vigaComum.ts e nos comandos viga.compor, viga.decompor, viga.comum, viga.comumDesfazer e viga.ajustarPlano.
import { useState } from 'react';
import { Button, Hint, NumField, OptNumField, Select } from '../ui';
import { comprimentoDesenvolvido, dadosDosArcos, decomporPoligonal, ehCurva } from '../../core/building/curvas';
import { comprimentoPolilinha, pavimentosDoGrupo, type BuildingModel, type Viga } from '../../core/building/types';
import { usePlanta } from './plantaStore';
import { useBuilding } from './store';

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
type Plano = { a: number; b: number; c: number };
const PLANO0: Plano = { a: 0, b: 0, c: 0 };

/** Editor das vigas curvas e comuns da seleção (o primeiro elemento mostra o valor; compor vale para a seleção toda). */
export function VigaCurvaComum({ b, vigas }: { b: BuildingModel; vigas: Viga[] }) {
  const { exec } = useBuilding();
  const [grupo, setGrupo] = useState('');
  const [de, setDe] = useState(0);
  const [ate, setAte] = useState<number | undefined>(undefined);
  const [modo, setModo] = useState<'interseccao' | 'maximaDeclividade'>('interseccao');
  const [p1, setP1] = useState<Plano>(PLANO0);
  const [p2, setP2] = useState<Plano>(PLANO0);
  const v0 = vigas[0];
  if (!v0) return null;
  const nomeGrupo = (id: string) => b.grupos.find((g) => g.id === id)?.nome ?? id;
  const origem = v0.comumDe ? b.vigas.find((x) => x.id === v0.comumDe) : undefined;
  const arcos = dadosDosArcos(v0);
  const outros = b.grupos.filter((g) => g.id !== v0.grupo && pavimentosDoGrupo(b, g.id).length > 0);
  const alvo = grupo && outros.some((g) => g.id === grupo) ? grupo : outros[0]?.id ?? '';
  const comprimento = comprimentoPolilinha(v0.pontos);
  const abrirOrigem = () => {
    if (!origem) return;
    const pav = pavimentosDoGrupo(b, origem.grupo)[0];
    if (pav) usePlanta.getState().set({ pavimento: pav.id, selecao: new Set([origem.id]) });
  };
  return (
    <div data-viga-curva-comum>
      <p className="small"><b>Viga curva e viga comum {vigas.length > 1 ? `(${vigas.length} vigas)` : `— ${v0.nome}`}</b></p>
      {ehCurva(v0) && (
        <p className="small" data-viga-curva>
          Trecho curvo: {arcos.map((x) => `R = ${fmt(x.raio)} m, ${fmt(x.angulo, 1)}°, ${x.cordas} cordas de até ${fmt(x.cordaMax * 100, 0)} cm`).join('; ')}. Comprimento desenvolvido {fmt(comprimentoDesenvolvido(v0))} m.
        </p>
      )}
      <div className="row wrap">
        {vigas.length >= 2 && <Button onClick={() => exec('viga.compor', { ids: vigas.map((x) => x.id) })}>Compor a viga (poliviga)</Button>}
        {vigas.length === 1 && decomporPoligonal(v0).length >= 2 && <Button onClick={() => exec('viga.decompor', { id: v0.id })}>Decompor a viga (trechos retos e curvos)</Button>}
      </div>
      {vigas.length === 1 && (
        <div data-viga-comum>
          {origem && (
            <>
              <p className="small">Viga associada de {origem.nome} ({nomeGrupo(origem.grupo)}): geometria, seção, armadura e envoltórias ficam na viga de origem.</p>
              <div className="row wrap">
                <Button onClick={abrirOrigem}>Abrir o grupo de origem</Button>
                <Button onClick={() => exec('viga.comumDesfazer', { id: v0.id })}>Desfazer a viga comum</Button>
              </div>
            </>
          )}
          {v0.comum && (
            <>
              <p className="small">Comum ao grupo {nomeGrupo(v0.comum.grupo)}: uma barra só no pórtico, que recebe as lajes dos dois grupos.</p>
              <div className="row wrap">
                <Button onClick={() => exec('viga.comumDesfazer', { id: v0.id })}>Desfazer a viga comum</Button>
              </div>
            </>
          )}
          {!origem && !v0.comum && outros.length > 0 && (
            <>
              <div className="row wrap u-items-end">
                <Select label="Grupo associado" value={alvo} options={outros.map((g) => ({ v: g.id, label: g.nome }))} onChange={setGrupo} />
                <NumField label="Início da parte comum" unit="m" width={150} value={de} onChange={setDe} />
                <OptNumField label="Fim da parte comum (vazio = até o fim)" unit="m" width={230} value={ate} onChange={setAte} />
                <Button variant="primary" onClick={() => exec('viga.comum', { id: v0.id, grupo: alvo, ...(de > 0 ? { de } : {}), ...(ate !== undefined && ate < comprimento ? { ate } : {}) })}>Tornar comum a dois grupos</Button>
              </div>
              <Hint>A viga é criada no grupo associado (eixo em traço-ponto) e é uma barra só no pórtico. Com início e fim, só essa parte vira comum (a viga é dividida); cada parte pode ser comum a um grupo.</Hint>
            </>
          )}
        </div>
      )}
      {vigas.length === 1 && !origem && !ehCurva(v0) && (
        <div data-viga-plano>
          <div className="row wrap u-items-end">
            <Select label="Ajuste a planos inclinados" value={modo} options={[{ v: 'interseccao' as const, label: 'interseção de dois planos' }, { v: 'maximaDeclividade' as const, label: 'linha de máxima declividade' }]} onChange={setModo} />
            <NumField label="Plano 1, inclinação a" unit="m/m" width={140} value={p1.a} onChange={(a) => setP1({ ...p1, a })} />
            <NumField label="Plano 1, inclinação b" unit="m/m" width={140} value={p1.b} onChange={(b2) => setP1({ ...p1, b: b2 })} />
            <NumField label="Plano 1, cota c" unit="m" width={120} value={p1.c} onChange={(c) => setP1({ ...p1, c })} />
          </div>
          {modo === 'interseccao' && (
            <div className="row wrap u-items-end">
              <NumField label="Plano 2, inclinação a" unit="m/m" width={140} value={p2.a} onChange={(a) => setP2({ ...p2, a })} />
              <NumField label="Plano 2, inclinação b" unit="m/m" width={140} value={p2.b} onChange={(b2) => setP2({ ...p2, b: b2 })} />
              <NumField label="Plano 2, cota c" unit="m" width={120} value={p2.c} onChange={(c) => setP2({ ...p2, c })} />
            </div>
          )}
          <div className="row wrap">
            <Button onClick={() => exec('viga.ajustarPlano', { id: v0.id, modo, planos: modo === 'interseccao' ? [p1, p2] : [p1] })}>Ajustar a viga aos planos</Button>
          </div>
          <Hint>Planos z = a·x + b·y + c (cotas informadas). Interseção: cada ponto da viga vai à projeção da linha em que os dois planos se cruzam; máxima declividade: a viga acompanha a linha de maior declividade do plano a partir do primeiro ponto.</Hint>
        </div>
      )}
    </div>
  );
}
