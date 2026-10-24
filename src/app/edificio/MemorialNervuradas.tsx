// Memorial das lajes nervuradas bidirecionais (frente E3c): forma, peso e volume, modelo da grelha (malha e inércias),
// verificações da NBR (mesa, nervura, espaçamento), mesa, armadura base e reforço por grupo de nervuras, vigas do pano e
// avisos. As linhas vêm do núcleo (`nervuradasNoMemorial`).
import type { ReactNode } from 'react';
import { fmt } from './Detalhamento';
import type { Dimensionamento } from '../../core/building/dimensionamento';
import { nervuradasNoMemorial } from '../../core/building/nervuradasDim';
import { opcoesEmUso, perfilDe } from '../../core/building/opcoes';
import type { BuildingModel } from '../../core/building/types';

export function MemorialNervuradas({ b, dim, h2 }: { b: BuildingModel; dim: Dimensionamento | null; h2: (t: string) => ReactNode }) {
  const linhas = dim?.nervuradas?.length ? nervuradasNoMemorial(b, dim.nervuradas, opcoesEmUso(b.opcoes, perfilDe(b))) : [];
  if (!linhas.length) return null;
  return (
    <>
      {h2('Lajes nervuradas bidirecionais')}
      <div data-memorial-nervuradas>
        <p>Grelha de barras com malha de uma fração do menor intereixo; cada barra representa uma faixa de nervuras. Esforços de cada nervura = soma das faixas da grelha que a banda do intereixo cobre (envoltória ELU de todos os pavimentos do grupo). Flexão positiva em T (mesa = intereixo) e negativa em retângulo; cortante verificado a cada fator × d (NBR 6118, 19.4.1; estribos pelo modelo I). Os números de item da NBR 6118 (13.2.4.2, 14.7.7) e as formas do catálogo (geometrias genéricas) estão a confirmar.</p>
        {linhas.map((l) => (
          <div key={l.laje} className="avoid" data-memorial-nervurada={l.laje}>
            <h3>Laje {l.nome} · {l.forma.nome} ({l.forma.tipo}){l.pavimentos.length > 1 ? ` · ${l.pavimentos.length} pavimentos` : ''}</h3>
            <p>
              Altura total {fmt(l.geometria.h * 100, 0)} cm, mesa {fmt(l.geometria.capa * 100, 0)} cm, cubeta {fmt(l.geometria.hEnch * 100, 0)} cm; intereixo {fmt(l.geometria.intereixo[0] * 100, 0)} × {fmt(l.geometria.intereixo[1] * 100, 0)} cm; nervuras {fmt(l.geometria.bw[0] * 100, 1)} (X) e {fmt(l.geometria.bw[1] * 100, 1)} (Y) cm. Forma {l.forma.origem}.
              Peso da zona aliviada {fmt(l.peso.aliviada)} kN/m² ({fmt(l.peso.volumeAliviada, 3)} m³/m²); peso médio com a parte maciça {fmt(l.peso.medio)} kN/m²; concreto {fmt(l.peso.volumeConcreto)} m³; {l.peso.cubetas} cubetas inteiras; parte maciça {fmt(l.peso.areaMacica)} m².
            </p>
            <p>
              Modelo ({l.modelo.perfil === 'nbr' ? 'perfil NBR 6118' : 'padrão do sistema'}): malha de {fmt(l.modelo.passoMalha * 100, 1)} cm; inércia à flexão = {l.modelo.inercia}; inércia à torção = {l.modelo.torcao}; faixa maciça junto às vigas {fmt(l.modelo.faixaMacicaViga * 100, 0)} cm; {l.modelo.zonasMacicas} zona(s) maciça(s) manual(is).
              Cisalhamento: {l.verificacoes.regime[0]} (X) e {l.verificacoes.regime[1]} (Y); mesa mínima {fmt(l.verificacoes.capaMin * 100, 1)} cm; distância livre entre nervuras {fmt(l.geometria.livre[0] * 100, 0)} × {fmt(l.geometria.livre[1] * 100, 0)} cm.
              {l.mesa.exigida ? ` Flexão da mesa: qd ${fmt(l.mesa.qd)} kN/m², Md ${fmt(l.mesa.Md)} kN·m/m, As ${fmt(l.mesa.AsNec)} cm²/m.` : ' Flexão da mesa dispensada (espaçamento ≤ 65 cm).'} Malha da mesa φ{fmt(l.mesa.phi, l.mesa.phi % 1 ? 1 : 0)} c/{fmt(l.mesa.s * 100, 0)} nas duas direções.
            </p>
            <table>
              <thead><tr><th>Grupo</th><th>Nervuras</th><th>L (m)</th><th>M+ (kN·m)</th><th>M− início / fim (kN·m)</th><th>V máx (kN)</th><th>Mu (kN·m)</th><th>Inferior</th><th>Superior (início / fim)</th><th>Estribos</th></tr></thead>
              <tbody>{l.grupos.map((g) => <tr key={g.nome}><td className="l">{g.nome}</td><td className="l">{g.nervuras}</td><td>{fmt(g.L)}</td><td>{fmt(g.mPos)}</td><td>{fmt(g.mNeg[0])} / {fmt(g.mNeg[1])}</td><td>{fmt(g.Vmax)}</td><td>{fmt(g.Mu)}</td><td className="l">{g.inf}</td><td className="l">{g.sup}</td><td className="l">{g.estribo}</td></tr>)}</tbody>
            </table>
            <p>Base das nervuras: {l.base.nervuras.join('; ')}. Base da mesa e das zonas maciças: {l.base.mesa}.</p>
            <ul data-memorial-nervuradas-criterios>{l.criterios.map((t, i) => <li key={i}>{t}</li>)}</ul>
            {l.vigas.length > 0 && <p>Vigas do pano: {l.vigas.map((v) => `${v.nome} (h ${fmt(v.h * 100, 0)} cm${v.saliente > 0 ? `, parte saliente ${fmt(v.saliente * 100, 0)} cm` : ', chata'})`).join('; ')}.</p>}
            {l.verificacoes.avisos.length > 0 && <ul>{l.verificacoes.avisos.map((m, i) => <li key={i}><i>{m}</i></li>)}</ul>}
          </div>
        ))}
      </div>
    </>
  );
}
