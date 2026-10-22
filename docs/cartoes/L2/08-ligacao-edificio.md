# Cartão L2-08 — Ligação na aba Edifício e na janela Nova obra

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões anteriores na ordem do índice; o núcleo da L2 (`lancamentoDxf.ts`, `commands/lancamento.ts`, `dwgLeitor.ts`, comandos `mascara.*`) já está no repositório. Não edite o núcleo.

## Objetivo
Botões do grupo Máscara (lançar por DXF/DWG, gabaritos e vistas, vistas por pavimento, capturas, viga pelo gabarito), diálogos na aba, o modo “Lançamento por DXF/DWG” da janela Nova obra, a origem marcada nas linhas de pilares e vigas lançados, e os filtros por grupo associado. Itens: C1.17, C1.18, C2.5, C2.19, C2.21, C6.63. Classe sugerida: Haiku, esforço baixo; se falhar uma vez, Sonnet.

## Arquivos
1. `src/app/edificio/Edificio.tsx` (editar)
2. `src/app/edificio/NovaObra.tsx` (editar)
3. `src/app/edificio/ParedesUI.tsx` (editar)

Leia antes: `src/app/edificio/Edificio.tsx` (`MascaraGrupo`, `PilaresGrupo`, `VigasGrupo`, `CargasGrupo`); `src/app/edificio/NovaObra.tsx`; `src/app/edificio/ParedesUI.tsx`.

## Editar `src/app/edificio/Edificio.tsx`
Faça as trocas abaixo, na ordem. Em cada uma, o trecho “Procure” aparece uma única vez no arquivo (copie-o exatamente, com os espaços); substitua-o pelo trecho “Coloque”.

### Troca 1
**Procure:**
````tsx
import { casosDaObra, casosParaCarga, comprimentoPolilinha, cotaFundacao, ehArranque, lancesDoPilar, pavimentosOrdenados, peDireito, USOS, VENTO_PADRAO, type Ajuste, type Alinhamento, type BuildingModel, type CategoriaUso, type CategoriaVento, type TipoLaje } from '../../core/building/types';
````
**Coloque:**
````tsx
import { casosDaObra, casosParaCarga, comprimentoPolilinha, cotaFundacao, ehArranque, lancesDoPilar, mascaraNoGrupo, pavimentosOrdenados, peDireito, USOS, VENTO_PADRAO, type Ajuste, type Alinhamento, type BuildingModel, type CategoriaUso, type CategoriaVento, type TipoLaje } from '../../core/building/types';
````

### Troca 2
**Procure:**
````tsx
import { Button, Check, Dropdown, Group, Hint, Input, Note, NumField, Select, TextCell, TextField, Textarea, download } from '../ui';
````
**Coloque:**
````tsx
import { Button, Check, Dropdown, Group, Hint, Input, Note, NumField, Seg, Select, TextCell, TextField, Textarea, download } from '../ui';
````

### Troca 3
**Procure:**
````tsx
import { NovaObra } from './NovaObra';
````
**Coloque:**
````tsx
import { NovaObra } from './NovaObra';
import { LancamentoDxf } from './LancamentoDxf';
import { GerenciadorGabaritos, JanelaCapturas, VistasRapidas } from './Gabaritos';
````

### Troca 4
**Procure:**
````tsx
  const [dialogoL1, setDialogoL1] = useState<null | 'nova' | 'recentes' | 'texto' | 'gerais'>(null);
````
**Coloque:**
````tsx
  const [dialogoL1, setDialogoL1] = useState<null | 'nova' | 'recentes' | 'texto' | 'gerais'>(null);
  const [dialogoL2, setDialogoL2] = useState<null | { tipo: 'lancar'; inicial?: string } | { tipo: 'gabaritos' } | { tipo: 'vistas' }>(null);
  const janelaCapturas = usePlanta((s) => s.janelaCapturas);
````

### Troca 5
**Procure:**
````tsx
        <MascaraGrupo b={b} />
````
**Coloque:**
````tsx
        <MascaraGrupo b={b} abrir={setDialogoL2} />
````

### Troca 6
**Procure:**
````tsx
      {dialogoL1 === 'nova' && <NovaObra onClose={() => setDialogoL1(null)} onCriada={() => setDialogoL1('gerais')} onTexto={() => setDialogoL1('texto')} />}
````
**Coloque:**
````tsx
      {dialogoL1 === 'nova' && <NovaObra onClose={() => setDialogoL1(null)} onCriada={() => setDialogoL1('gerais')} onTexto={() => setDialogoL1('texto')} onDxf={() => { setDialogoL1(null); setDialogoL2({ tipo: 'lancar' }); }} />}
      {dialogoL2?.tipo === 'lancar' && <LancamentoDxf inicial={dialogoL2.inicial} onClose={() => setDialogoL2(null)} />}
      {dialogoL2?.tipo === 'gabaritos' && <GerenciadorGabaritos onClose={() => setDialogoL2(null)} onLancar={(id) => setDialogoL2({ tipo: 'lancar', inicial: id })} />}
      {dialogoL2?.tipo === 'vistas' && <VistasRapidas onClose={() => setDialogoL2(null)} />}
      {janelaCapturas && <JanelaCapturas onClose={() => usePlanta.getState().set({ janelaCapturas: false })} />}
````

### Troca 7
**Procure:**
````tsx
function MascaraGrupo({ b }: { b: BuildingModel }) {
````
**Coloque:**
````tsx
function MascaraGrupo({ b, abrir }: { b: BuildingModel; abrir: (d: { tipo: 'lancar' } | { tipo: 'gabaritos' } | { tipo: 'vistas' }) => void }) {
````

### Troca 8
**Procure:**
````tsx
  const ms = b.mascaras.filter((m) => m.grupo === grupo?.id);
````
**Coloque:**
````tsx
  const ms = b.mascaras.filter((m) => !!grupo && mascaraNoGrupo(m, grupo.id));
````

### Troca 9
**Procure:**
````tsx
        {ms.length > 0 && <Button onClick={() => pl.set({ ferramenta: 'alinhar' })}>Alinhar por 2 pontos</Button>}
````
**Coloque:**
````tsx
        {ms.length > 0 && <Button onClick={() => pl.set({ ferramenta: 'alinhar' })}>Alinhar por 2 pontos</Button>}
        <Button onClick={() => abrir({ tipo: 'lancar' })}>Lançar por DXF/DWG…</Button>
        <Button onClick={() => abrir({ tipo: 'gabaritos' })}>Gabaritos e vistas…</Button>
        <Button onClick={() => abrir({ tipo: 'vistas' })}>Vistas por pavimento…</Button>
        <Button onClick={() => pl.set({ janelaCapturas: true })}>Capturas…</Button>
````

### Troca 10
**Procure:**
````tsx
        </div>
      ))}
````
**Coloque:**
````tsx
        </div>
      ))}
      {ms.length > 0 && (
        <div className="row wrap">
          <Seg small value={pl.modoVigaGab} onChange={(v) => pl.set({ modoVigaGab: v })} options={[{ v: 'face', label: 'Linha = face' }, { v: 'eixo', label: 'Linha = eixo' }]} />
          <Button variant={pl.ferramenta === 'vigaGabarito' ? 'primary' : 'default'} onClick={() => pl.set({ ferramenta: 'vigaGabarito' })}>Viga pelo gabarito</Button>
        </div>
      )}
````

### Troca 11
**Procure:**
````tsx
                <tr key={p.id} className={pl.selecao.has(p.id) ? 'on' : ''} onClick={() => pl.set({ selecao: new Set([p.id]) })}>
````
**Coloque:**
````tsx
                <tr key={p.id} className={`${pl.selecao.has(p.id) ? 'on' : ''}${p.origemLancamento ? ' lancado' : ''}`} title={p.origemLancamento ? `Lançado do gabarito (${p.origemLancamento})` : undefined} onClick={() => pl.set({ selecao: new Set([p.id]) })}>
````

### Troca 12
**Procure:**
````tsx
              <tr key={v.id} className={pl.selecao.has(v.id) ? 'on' : ''} onClick={() => pl.set({ selecao: new Set([v.id]) })}>
````
**Coloque:**
````tsx
              <tr key={v.id} className={`${pl.selecao.has(v.id) ? 'on' : ''}${v.origemLancamento ? ' lancado' : ''}`} title={v.origemLancamento ? `Lançada do gabarito (${v.origemLancamento})` : undefined} onClick={() => pl.set({ selecao: new Set([v.id]) })}>
````

### Troca 13
**Procure:**
````tsx
  const camadas = [...new Set(b.mascaras.filter((m) => m.grupo === grupo?.id).flatMap((m) => m.camadas.map((c) => c.nome)))];
````
**Coloque:**
````tsx
  const camadas = [...new Set(b.mascaras.filter((m) => !!grupo && mascaraNoGrupo(m, grupo.id)).flatMap((m) => m.camadas.map((c) => c.nome)))];
````

## Editar `src/app/edificio/NovaObra.tsx`
Faça as trocas abaixo, na ordem. Em cada uma, o trecho “Procure” aparece uma única vez no arquivo (copie-o exatamente, com os espaços); substitua-o pelo trecho “Coloque”.

### Troca 1
**Procure:**
````tsx
  { v: 'dxf', label: 'Lançamento por DXF/DWG', desabilitado: 'Chega com a frente L2' },
````
**Coloque:**
````tsx
  { v: 'dxf', label: 'Lançamento por DXF/DWG' },
````

### Troca 2
**Procure:**
````tsx
export function NovaObra({ onClose, onCriada, onTexto }: { onClose(): void; onCriada(): void; onTexto(): void }) {
````
**Coloque:**
````tsx
export function NovaObra({ onClose, onCriada, onTexto, onDxf }: { onClose(): void; onCriada(): void; onTexto(): void; onDxf(): void }) {
````

### Troca 3
**Procure:**
````tsx
            )}
          </>
````
**Coloque:**
````tsx
            )}
            {modo === 'dxf' && (
              <>
                <Hint>Cria o edifício padrão (pavimentos e grupos para editar depois) e abre o assistente de lançamento: arquivos DXF ou DWG, camadas, grupos e revisão da proposta de pilares, vigas, eixos, lajes e aberturas.</Hint>
                <div><Button variant="primary" onClick={() => { novo(false); onDxf(); }}>Criar edifício padrão e lançar pelo gabarito…</Button></div>
              </>
            )}
          </>
````

## Editar `src/app/edificio/ParedesUI.tsx`
Faça as trocas abaixo, na ordem. Em cada uma, o trecho “Procure” aparece uma única vez no arquivo (copie-o exatamente, com os espaços); substitua-o pelo trecho “Coloque”.

### Troca 1
**Procure:**
````tsx
import { casosParaCarga, pavimentosOrdenados, type BuildingModel, type Parede } from '../../core/building/types';
````
**Coloque:**
````tsx
import { casosParaCarga, mascaraNoGrupo, pavimentosOrdenados, type BuildingModel, type Parede } from '../../core/building/types';
````

### Troca 2
**Procure:**
````tsx
  const mascaras = (b.mascaras ?? []).filter((m) => m.grupo === grupoAtivo);
````
**Coloque:**
````tsx
  const mascaras = (b.mascaras ?? []).filter((m) => mascaraNoGrupo(m, grupoAtivo));
````

## Verificação
```bash
npx tsc -b && npx vitest run src/app/design/design.test.ts
```

## Pontos de atenção
- Nenhum botão novo na barra da planta: tudo no painel (grupo Máscara) e na janela Nova obra.
- A linha de pilar ou viga lançada do gabarito ganha a classe `lancado` (faixa de destaque, definida no cartão 02) e o `title` com a origem.
