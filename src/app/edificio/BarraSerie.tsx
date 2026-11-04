// Interface do lançamento em série: opções contextuais na barra da planta (confirmação dos pilares nos cruzamentos e opções da Matriz)
// e os botões da faixa. A lógica está em `ferramentasSerie.ts` e em `core/commands/serie.ts`.
import { Button, NumField, RibbonButton, Seg } from '../ui';
import { abrirCruzamentos, confirmarCruzamentos, previaCruzamentos, useSerie, vigasNosEixos } from './ferramentasSerie';
import { usePlanta } from './plantaStore';
import { useBuilding } from './store';
import { useStore } from '../store';

/** Barra de opções: confirmação da pré-visualização dos pilares nos cruzamentos e opções da ferramenta Matriz. */
export function BarraSerie() {
  const S = useSerie();
  const ferr = usePlanta((s) => s.ferramenta);
  const b = useBuilding((s) => s.sessao.modelo);
  usePlanta((s) => s.selecao);
  usePlanta((s) => s.secao);
  usePlanta((s) => s.angulo);
  const pr = S.cruz ? previaCruzamentos(b) : null;
  return (
    <>
      {S.cruz && (
        <div className="row" role="group" aria-label="Pilares nos cruzamentos">
          <span className="small" data-cruzamentos>{pr ? `Pilares nos cruzamentos: ${pr.novos.length} a lançar${pr.pulados.length ? `, ${pr.pulados.length} já ocupado(s)` : ''}` : 'Pilares nos cruzamentos: selecione ao menos dois eixos'}</span>
          <Button variant="primary" disabled={!pr?.novos.length} title="Lança os pilares (Enter)" onClick={() => confirmarCruzamentos()}>Confirmar pilares</Button>
          <Button title="Gira 90° a pré-visualização (Espaço)" onClick={() => { const pl = usePlanta.getState(); pl.set({ angulo: (pl.angulo + 90) % 360 }); }}>Girar 90°</Button>
          <Button title="Cancela a pré-visualização (Esc)" onClick={() => { S.set({ cruz: false }); useStore.getState().set({ message: 'Pré-visualização cancelada.' }); }}>Cancelar</Button>
        </div>
      )}
      {ferr === 'matriz' && (
        <div className="row" role="group" aria-label="Opções da matriz">
          <Seg small value={S.modo} onChange={(v) => S.set({ modo: v })} options={[{ v: 'linear', label: 'Linear' }, { v: 'polar', label: 'Polar' }]} />
          {S.modo === 'linear'
            ? <Seg small value={S.referencia} onChange={(v) => S.set({ referencia: v })} options={[{ v: 'passo', label: 'Passo', title: 'O 2º clique define a distância entre cópias' }, { v: 'ultimo', label: 'Até o último', title: 'O 2º clique é a posição da última cópia; as cópias ficam igualmente espaçadas' }]} />
            : <>
              <NumField label="Ângulo" unit="°" width={80} value={S.angulo} onChange={(v) => v !== 0 && S.set({ angulo: v })} />
              <Seg small value={S.tipoAngulo} onChange={(v) => S.set({ tipoAngulo: v })} options={[{ v: 'total', label: 'Total', title: 'Ângulo até a última cópia (360° divide o círculo em cópias + 1 posições)' }, { v: 'entre', label: 'Entre cópias' }]} />
            </>}
          <NumField label="Cópias" width={70} value={S.copias} onChange={(v) => v >= 1 && v <= 100 && S.set({ copias: Math.round(v) })} />
        </div>
      )}
    </>
  );
}

/** Botão da etapa Pilares: abre a pré-visualização dos pilares nos cruzamentos dos eixos. */
export function BotaoPilaresNosCruzamentos() {
  const n = useBuilding((s) => s.sessao.modelo.eixos.length);
  return <RibbonButton icon="pilar" label="Pilares nos cruzamentos…" title="Pré-visualiza um pilar em cada cruzamento dos eixos selecionados (ou de todos); usa a seção, o ponto fixo e o ângulo do pilar ativo" disabled={n < 2} onClick={abrirCruzamentos} />;
}

/** Botão da etapa Vigas e lajes: uma viga por eixo, entre os apoios que o eixo cruza. */
export function BotaoVigasNosEixos() {
  const n = useBuilding((s) => s.sessao.modelo.eixos.length);
  return <RibbonButton icon="viga" label="Vigas nos eixos" title="Lança uma viga contínua por eixo (selecionado ou todos) entre os pilares e vigas que o eixo cruza, alinhada pelo eixo" disabled={!n} onClick={() => { vigasNosEixos(); }} />;
}
