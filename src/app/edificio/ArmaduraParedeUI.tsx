// Armadura por pano na janela da parede e do pilar-parede (E1d): panos, malha bloqueada, pontos e reforços,
// espessura, emendas por traspasse, trechos curtos e mensagens. As regras estão em core/building (paredesLista,
// paredesArmadura, paredesBase, pilarParede); esta tela só lê o dimensionamento e chama os comandos.
import { useState } from 'react';
import { Button, Hint, NumField, Pill, Select } from '../ui';
import { BITOLAS_PAREDE } from '../../core/building/paredesArmadura';
import { ppDaParede } from '../../core/building/paredesBase';
import { ladosDoPP, lancesDoPP } from '../../core/building/pilarParede';
import {
  comandoDe, linhasEmendas, linhasLadosCurtos, linhasPanos, linhasPontos, mensagensDe, paramsBloquearPano, paramsEmendas, resumoCartao, valoresIniciais,
} from '../../core/building/paredesLista';
import { useBuilding } from './store';
import { executarERecalcular } from './Armadura';

interface EdicaoMalha { chave: string; vPhi: number; vS: number; hPhi: number; hS: number }

/** Armadura por pano da parede (`tipo` parede) ou do pilar-parede (`tipo` pilarParede), com os comandos de malha e emendas. */
export function ArmaduraDaParede({ id, tipo }: { id: string; tipo: 'parede' | 'pilarParede' }) {
  const dim = useBuilding((s) => s.dim), b = useBuilding((s) => s.sessao.modelo);
  const r = dim?.armaduraParedes?.find((x) => x.id === id);
  const det = dim?.detalhesParedes?.find((x) => x.id === id);
  const linhas = r ? linhasPanos(r) : [];
  const [sel, setSel] = useState('');
  const [edit, setEdit] = useState<EdicaoMalha | null>(null);
  const [espLance, setEspLance] = useState('');
  const [espCm, setEspCm] = useState<number | null>(null);
  const [pavEm, setPavEm] = useState('');
  const [trac, setTrac] = useState<number | null>(null);
  const [comp, setComp] = useState<number | null>(null);
  if (!r) return <Hint>Calcule o dimensionamento para ver a armadura.</Hint>;

  const rc = resumoCartao(r);
  const linhaSel = linhas.find((l) => l.chave === sel) ?? linhas[0];
  const malhaAtual: EdicaoMalha | null = linhaSel ? (edit?.chave === linhaSel.chave ? edit : { chave: linhaSel.chave, ...valoresIniciais(linhaSel) }) : null;
  const pontos = linhasPontos(r);
  const emendas = linhasEmendas(det);
  const lados = linhasLadosCurtos(r);
  const mensagens = mensagensDe(r, det);

  const w = tipo === 'parede' ? b.paredes?.find((q) => q.id === id) : undefined;
  const lancesEsp = w ? lancesDoPP(b, ppDaParede(w)) : [];
  const lanceEsp = lancesEsp.some((l) => l.id === espLance) ? espLance : lancesEsp[0]?.id ?? '';
  const espModelo = w && lanceEsp ? +(ladosDoPP(b, ppDaParede(w))[0].esp(lanceEsp).t * 100).toFixed(1) : 0;

  const pavsEm = [...new Set(emendas.map((e) => e.pavimento))];
  const pavEmEf = pavsEm.includes(pavEm) ? pavEm : pavsEm[0] ?? '';
  const ems = emendas.filter((e) => e.pavimento === pavEmEf);
  const tracEm = ems.find((e) => e.tipo === 'tracionada'), compEm = ems.find((e) => e.tipo === 'comprimida');

  return (
    <div data-pw-armadura={id}>
      <h4>Armadura por pano</h4>
      <p className="small" data-pw-situacao>
        <Pill tone={rc.status === 'ok' ? 'ok' : 'bad'}>{rc.situacao}</Pill> {rc.panos} pano(s) · cumprimento mínimo {rc.cumprimentoMin} · {rc.armadura}
      </p>
      <table className="data quadro" data-pw-panos>
        <thead><tr><th>Trecho</th><th>Lance</th><th>Pano</th><th>s (m)</th><th>Necessária V / H (cm²/m)</th><th>Vertical</th><th>Horizontal</th><th>Cumprimento</th><th>Origem</th><th>Situação</th></tr></thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.chave} data-chave={l.chave} aria-selected={linhaSel?.chave === l.chave} className={l.status === 'fail' ? 'bad' : undefined} onClick={() => setSel(l.chave)}>
              <td className="tl">{l.trecho}</td><td className="tl">{l.lance}</td><td className="num">{l.pano + 1}</td><td className="num">{l.intervalo}</td>
              <td className="num">{l.necessaria}</td><td className="tl">{l.vertical}</td><td className="tl">{l.horizontal}</td><td className="num">{l.cumprimento}</td>
              <td className="tl">{l.origem}</td><td className="tl">{l.situacao}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {linhaSel && malhaAtual && (
        <>
          <div className="row wrap" data-pw-editor-malha>
            <Select label="φ vertical" value={malhaAtual.vPhi} options={BITOLAS_PAREDE.map((p) => ({ v: p, label: String(p).replace('.', ',') }))} onChange={(v) => setEdit({ ...malhaAtual, vPhi: v })} />
            <NumField label="s vertical" unit="cm" width={90} value={malhaAtual.vS} onChange={(v) => setEdit({ ...malhaAtual, vS: v })} />
            <Select label="φ horizontal" value={malhaAtual.hPhi} options={BITOLAS_PAREDE.map((p) => ({ v: p, label: String(p).replace('.', ',') }))} onChange={(v) => setEdit({ ...malhaAtual, hPhi: v })} />
            <NumField label="s horizontal" unit="cm" width={90} value={malhaAtual.hS} onChange={(v) => setEdit({ ...malhaAtual, hS: v })} />
            <Button onClick={() => executarERecalcular(comandoDe(tipo), paramsBloquearPano(id, linhaSel, { phi: malhaAtual.vPhi, sCm: malhaAtual.vS }, { phi: malhaAtual.hPhi, sCm: malhaAtual.hS }))}>Bloquear malha</Button>
            <Button onClick={() => executarERecalcular('armadura.desbloquear', { ids: [id] })}>Desbloquear</Button>
          </div>
          <Hint>Malhas iguais nas duas faces. A malha bloqueada é verificada, não redimensionada; abaixo do fator de cumprimento exigido (opção 'Paredes: fator de cumprimento') o pano é reprovado.</Hint>
        </>
      )}
      <details data-pw-pontos>
        <summary>Pontos que não atendem e reforços locais ({pontos.length})</summary>
        {pontos.length > 0 ? (
          <table className="data quadro" data-pw-pontos-lista>
            <thead><tr><th>Trecho</th><th>Lance</th><th>Item</th><th>Faixa</th><th>Armadura adicional</th></tr></thead>
            <tbody>
              {pontos.map((p, i) => (
                <tr key={i}><td className="tl">{p.trecho}</td><td className="tl">{p.lance}</td><td className="tl">{p.descricao}</td><td className="num">{p.faixa}</td><td className="tl">{p.adicional}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <p className="muted">Todos os pontos atendem com a malha uniforme.</p>}
      </details>
      {tipo === 'parede' && (
        <>
          <h4>Espessura</h4>
          <div className="row wrap" data-pw-espessura>
            <Select label="Lance da espessura" value={lanceEsp} options={lancesEsp.map((l) => ({ v: l.id, label: l.nome }))} onChange={setEspLance} />
            <NumField label="Espessura" unit="cm" width={90} value={espCm ?? espModelo} onChange={setEspCm} />
            <Button onClick={() => executarERecalcular('parede.redimensionar', { id, pavimento: lanceEsp, espessura: +((espCm ?? espModelo) / 100).toFixed(4) })}>Aplicar espessura</Button>
          </div>
          <Hint>Mudar a espessura refaz a análise.</Hint>
        </>
      )}
      <h4>Emendas por traspasse</h4>
      {emendas.length === 0 ? <p className="muted">Sem emendas (parede de um lance só).</p> : (
        <>
          <table className="data quadro" data-pw-emendas>
            <thead><tr><th>Trecho</th><th>Acima de</th><th>Tipo</th><th>φ</th><th>Mínimo (cm)</th><th>Adotada (cm)</th><th>Origem</th></tr></thead>
            <tbody>
              {emendas.map((e) => (
                <tr key={e.chave}><td className="tl">{e.trecho}</td><td className="tl">{e.acima}</td><td className="tl">{e.tipo}</td><td className="tl">{e.phi}</td><td className="num">{e.minimo}</td><td className="num">{e.adotada}</td><td className="tl">{e.origem}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="row wrap" data-pw-editor-emendas>
            <Select label="Pavimento da emenda" value={pavEmEf} options={emendas.filter((e, i, arr) => arr.findIndex((x) => x.pavimento === e.pavimento) === i).map((e) => ({ v: e.pavimento, label: e.acima }))} onChange={(v) => { setPavEm(v); setTrac(null); setComp(null); }} />
            <NumField label="Tração" unit="cm" width={90} value={trac ?? (tracEm ? Number(tracEm.adotada.replace(',', '.')) : 0)} onChange={setTrac} />
            <NumField label="Compressão" unit="cm" width={90} value={comp ?? (compEm ? Number(compEm.adotada.replace(',', '.')) : 0)} onChange={setComp} />
            <Button onClick={() => executarERecalcular(comandoDe(tipo), paramsEmendas(id, pavEmEf, trac ?? undefined, comp ?? undefined))}>Aplicar emendas</Button>
            <Button onClick={() => executarERecalcular(comandoDe(tipo), { id, limparEmendas: true })}>Voltar às calculadas</Button>
          </div>
        </>
      )}
      {lados.length > 0 && (
        <>
          <h4>Trechos curtos (dimensionados como pilar)</h4>
          <table className="data quadro" data-pw-lados-curtos>
            <thead><tr><th>Trecho</th><th>Lance</th><th>Comprimento (cm)</th><th>Barras</th><th>Estribo</th><th>Utilização</th><th>Situação</th></tr></thead>
            <tbody>
              {lados.map((l, i) => (
                <tr key={i}><td className="tl">{l.trecho}</td><td className="tl">{l.lance}</td><td className="num">{l.comprimento}</td><td className="tl">{l.barras}</td><td className="tl">{l.estribo}</td><td className="num">{l.utilizacao}</td><td className="tl">{l.situacao}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <h4>Mensagens</h4>
      {mensagens.length > 0 ? (
        <ul data-pw-mensagens>
          {mensagens.map((m, i) => <li key={i}><b>{m.local}</b>: {m.texto}</li>)}
        </ul>
      ) : <p className="muted">Sem mensagens.</p>}
    </div>
  );
}
