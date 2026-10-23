# D3 — cartão 02: faixa, abas Arquivo e Lançamento

Classe: Sonnet baixo (cada botão aponta para handler existente; integra layout).

Entrega: o menu "Arquivo ▾" some do cabeçalho e vira a aba Arquivo; as ferramentas de lançamento da planta saem da barra da planta e viram a aba Lançamento. Depois deste cartão o `FaixaModulo` do `App` recebe `corpo`.

## Arquivos
- `src/app/FaixaArquivo.tsx` (novo)
- `src/app/edificio/FaixaEdificio.tsx` (novo; este cartão faz o esqueleto e a aba Lançamento)
- `src/app/edificio/mascaraImportar.ts` (novo; lógica movida de `MascaraGrupo`)
- `src/App.tsx`
- `src/app/edificio/Edificio.tsx` (retirar os botões movidos)

## 1. `src/app/FaixaArquivo.tsx`
```tsx
// Aba Arquivo da faixa (os três módulos): os itens do antigo menu "Arquivo ▾", com os mesmos rótulos (os testes de interface os acham pelo texto).
import { RibbonButton, RibbonGroup } from './ui';
import { SAMPLES } from './samples';
import { useEdifUI } from './edificio/uiStore';

export interface AcoesArquivo {
  novo(): void; abrir(): void; salvar(como: boolean): void; biblioteca(): void;
  json(): void; svg(): void; png(): void; copiar(): void; importarTabelas(): void; dxf(): void; exemplo(key: string): void;
  /** Navegadores com a File System Access API oferecem "Salvar como…". */
  podeSalvarComo: boolean;
}

export function FaixaArquivo({ a, edificio }: { a: AcoesArquivo; edificio: boolean }) {
  const ui = useEdifUI.getState().set;
  return (
    <>
      {edificio && (
        <RibbonGroup label="Obra">
          <RibbonButton icon="novo" label="Nova obra…" onClick={() => ui({ l1: 'nova' })} />
          <RibbonButton icon="obra" label="Obras recentes…" onClick={() => ui({ l1: 'recentes' })} />
          <RibbonButton icon="obra" label="Dados gerais…" onClick={() => ui({ l1: 'gerais' })} />
          <RibbonButton icon="config" label="Configuração da obra…" onClick={() => ui({ cfg: 'dados' })} />
          <RibbonButton icon="importar" label="Importar de texto…" onClick={() => ui({ l1: 'texto' })} />
        </RibbonGroup>
      )}
      <RibbonGroup label="Arquivo">
        <RibbonButton icon="novo" label="Novo modelo" onClick={a.novo} />
        <RibbonButton icon="abrir" label="Abrir trabalho do computador…" title="Abrir trabalho do computador… (Ctrl+O)" onClick={a.abrir} />
        <RibbonButton icon="salvar" label="Salvar no computador" title="Salvar no computador (Ctrl+S)" onClick={() => a.salvar(false)} />
        {a.podeSalvarComo && <RibbonButton icon="salvar" label="Salvar como…" title="Salvar como… (Ctrl+Shift+S)" onClick={() => a.salvar(true)} />}
        <RibbonButton icon="biblioteca" label="Biblioteca e histórico…" onClick={a.biblioteca} />
        {edificio && <RibbonButton icon="versoes" label="Versões do arquivo…" onClick={() => ui({ cfg: 'arquivo' })} />}
      </RibbonGroup>
      <RibbonGroup label="Exportar">
        <RibbonButton icon="exportar" label="Só o modelo (.json)" onClick={a.json} />
        <RibbonButton icon="exportar" label="Exportar desenho (SVG)" onClick={a.svg} />
        <RibbonButton icon="exportar" label="Exportar desenho (PNG)" onClick={a.png} />
        <RibbonButton icon="copiar" label="Copiar desenho" onClick={a.copiar} />
        <RibbonButton icon="importar" label="Importar materiais, seções e unidades de outro arquivo…" onClick={a.importarTabelas} />
        <RibbonButton icon="exportar" label="Desenho DXF (CAD)" onClick={a.dxf} />
      </RibbonGroup>
      <RibbonGroup label="Exemplos">
        {SAMPLES.map((s) => <RibbonButton key={s.key} icon="exemplos" label={s.label} onClick={() => a.exemplo(s.key)} />)}
      </RibbonGroup>
    </>
  );
}
```
Para os rótulos longos funcionarem, acrescentar ao CSS (junto de `.rbl`): `.rbl { max-width: 112px; white-space: normal; text-align: center; line-height: 1.15; overflow-wrap: anywhere; }` e trocar o `height: var(--h-ribbon)` de `.rbtn` por `min-height: var(--h-ribbon); height: auto;` (a faixa cresce até duas linhas; o resto fica igual).

## 2. `src/App.tsx`
1. Remover o estado `menu`/`setMenu`, o `<div className="menuwrap">…</div>` e todas as chamadas `setMenu(false)` (em `load`, `openWork`, `saveWork`, `saveJSON`, `exportSVG`, `exportPNG`, `copyPNG`, `exportDXF`). Os dois `<input type="file" hidden … ref={tablesRef|fileRef}>` ficam no cabeçalho, onde o `menuwrap` estava (fora de qualquer menu).
2. Montar as ações e passar a `corpo` (depois de definidas as funções do arquivo, antes do `return`):
```tsx
  const acoes: AcoesArquivo = {
    novo: () => { const m = emptyModel(); forgetFile(); load(m); logActivity('Novo modelo', m.name); },
    abrir: openWork, salvar: saveWork, biblioteca: () => st.set({ libraryOpen: true }),
    json: saveJSON, svg: exportSVG, png: exportPNG, copiar: copyPNG, dxf: exportDXF,
    importarTabelas: () => tablesRef.current?.click(),
    exemplo: (key) => { const s = SAMPLES.find((x) => x.key === key); if (!s) return; const m = s.make(); if (s.key === 'portico') m.combinations = nbrCombinations(m.cases, 1); forgetFile(); load(m); },
    podeSalvarComo: canPickFiles(),
  };
  const corpoFaixa = (aba: string) => aba === 'arquivo' ? <FaixaArquivo a={acoes} edificio={st.module === 'edificio'} />
    : st.module === 'edificio' ? <FaixaEdificio aba={aba} /> : undefined;
```
e `<FaixaModulo modulo={st.module} corpo={corpoFaixa} />`. (`FaixaModulo` mostra a dica da D2 quando `corpo` devolve `undefined`.)
3. Botões "Salvar" e "Biblioteca" do cabeçalho permanecem (QA).
4. Em `src/app/FaixaModulo.tsx`, a aba aberta quando nada foi escolhido passa a ser **Lançamento** (Pórtico e Edifício): `const ativa = abas.some((a) => a.id === salva) ? salva : (abas.find((a) => a.id === 'lancamento') ?? abas[0]).id;`. Motivo: os fluxos de e2e (e o uso comum) começam lançando elementos; os controles escondidos da faixa (como o `input` do DXF da máscara) existem só enquanto a aba está aberta.

## 3. `src/app/edificio/mascaraImportar.ts` (lógica do botão "Importar DXF…", movida de `MascaraGrupo.importar`)
```ts
// Importação do DXF da máscara (gabarito): lê o arquivo, estima a unidade e cria a máscara no grupo do pavimento atual.
import { lerDxf, metrosPorUnidade } from '../../core/dxf/read';
import { UNIDADES, unidadeProvavel } from './lancamentoLeitura';
import { useStore } from '../store';
import { usePlanta } from './plantaStore';

type Exec = (nome: string, params: Record<string, unknown>) => { ok: boolean };

export async function importarMascara(f: File, grupo: string, exec: Exec) {
  const txt = await f.text();
  const r = lerDxf(txt);
  const escala = metrosPorUnidade(r.insunits) ?? unidadeProvavel(r.bbox);
  const res = exec('mascara.importar', { grupo, nome: f.name.replace(/\.dxf$/i, ''), geo: r.camadas, escala });
  if (res.ok) {
    const ign = Object.entries(r.ignoradas).map(([k, n]) => `${n} ${k}`).join(', ');
    useStore.getState().set({ message: `${f.name}: ${r.segmentos} segmento(s) em ${Object.keys(r.camadas).length} camada(s), unidade ${UNIDADES.find((u) => u.v === escala)?.label ?? escala} ${metrosPorUnidade(r.insunits) ? '($INSUNITS)' : '(estimada pelo tamanho; confira)'}${ign ? ` · ignoradas: ${ign}` : ''}.` });
    usePlanta.getState().set({ vista: null });
  }
}
```
Em `Edificio.tsx` (`MascaraGrupo`) trocar o corpo de `importar` por `await importarMascara(f, grupo.id, exec)`; retirar do grupo os botões que sobem para a faixa (Importar DXF…, Alinhar por 2 pontos, Lançar por DXF/DWG…, Gabaritos e vistas…, Vistas por pavimento…, Capturas…, Viga pelo gabarito) e o `<input type="file" hidden aria-label="Arquivo DXF da máscara">` (o da faixa assume o mesmo `aria-label`); ficam no grupo (nó "Gabaritos" do NAV na D4): ajustar escala, lista das máscaras (unidade, remover) e a tabela de camadas. O `Seg` Linha = face/eixo e o botão "Viga pelo gabarito" vão para a barra de opções (cartão 06).

## 4. `src/app/edificio/FaixaEdificio.tsx` (esqueleto + aba Lançamento)
```tsx
// Corpo das abas da faixa do módulo Edifício. Cada botão chama o mesmo handler que o grupo ou a barra de onde saiu (ver o mapa).
import { useRef, type ReactNode } from 'react';
import { RibbonButton, RibbonGroup } from '../ui';
import { aoEscolher, usePlanta, type Ferramenta } from './plantaStore';
import { ROTULO_FERRAMENTA, TECLA_FERRAMENTA } from './Planta';
import { useBuilding } from './store';
import { useEdifUI } from './uiStore';
import { useInclinadasUI } from './InclinadasUI';
import { importarMascara } from './mascaraImportar';
import { mascaraNoGrupo, pavimentosOrdenados } from '../../core/building/types';

const ui = (p: Parameters<ReturnType<typeof useEdifUI.getState>['set']>[0]) => useEdifUI.getState().set(p);

/** Escolhe a ferramenta na planta (a faixa sempre leva à vista Planta). */
export const irFerramenta = (f: Ferramenta) => { ui({ aba: 'planta' }); usePlanta.getState().set({ ferramenta: f, ...aoEscolher(f) }); };

/** Botão de ferramenta: `role=radio` com o rótulo e a tecla de antes (a barra da planta usava o mesmo `title`). */
export function Ferr({ f, icon, disabled }: { f: Ferramenta; icon: string; disabled?: boolean }) {
  const atual = usePlanta((s) => s.ferramenta);
  const t = TECLA_FERRAMENTA[f];
  return <RibbonButton role="radio" aria-checked={atual === f} icon={icon} label={ROTULO_FERRAMENTA[f]} title={t ? `${ROTULO_FERRAMENTA[f]} (${t})` : ROTULO_FERRAMENTA[f]} disabled={disabled} onClick={() => irFerramenta(f)} />;
}

function Gabarito() {
  const { sessao, exec } = useBuilding();
  const pl = usePlanta();
  const b = sessao.modelo;
  const ps = pavimentosOrdenados(b);
  const pav = ps.find((p) => p.id === pl.pavimento) ?? ps[Math.min(1, ps.length - 1)];
  const grupo = b.grupos.find((g) => g.id === pav?.grupo);
  const temMascara = !!grupo && b.mascaras.some((m) => mascaraNoGrupo(m, grupo.id));
  const ref = useRef<HTMLInputElement>(null);
  return (
    <RibbonGroup label="Gabarito" radios="Ferramenta">
      <RibbonButton icon="importarDxf" label="Importar DXF…" disabled={!grupo} onClick={() => ref.current?.click()} />
      <input ref={ref} type="file" accept=".dxf" hidden aria-label="Arquivo DXF da máscara" onChange={(e) => { const f = e.target.files?.[0]; if (f && grupo) void importarMascara(f, grupo.id, exec); e.target.value = ''; }} />
      {temMascara && <Ferr f="alinhar" icon="alinhar" />}
      <RibbonButton icon="importarDxf" label="Lançar por DXF/DWG…" onClick={() => ui({ l2: { tipo: 'lancar' } })} />
      <RibbonButton icon="gabarito" label="Gabaritos e vistas…" onClick={() => ui({ l2: { tipo: 'gabaritos' } })} />
      <RibbonButton icon="gabarito" label="Vistas por pavimento…" onClick={() => ui({ l2: { tipo: 'vistas' } })} />
      <RibbonButton icon="gabarito" label="Capturas…" onClick={() => pl.set({ janelaCapturas: true })} />
      <Ferr f="vigaGabarito" icon="viga" />
    </RibbonGroup>
  );
}

function Lancamento() {
  return (
    <>
      <RibbonGroup label="Seleção" radios="Ferramenta"><Ferr f="selecionar" icon="selecionar" /></RibbonGroup>
      <RibbonGroup label="Elementos" radios="Ferramenta">
        <Ferr f="pilar" icon="pilar" /><Ferr f="pilarParede" icon="pilarParede" /><Ferr f="viga" icon="viga" /><Ferr f="laje" icon="laje" /><Ferr f="parede" icon="parede" />
        <RibbonButton icon="vigaInclinada" label="Vigas inclinadas" onClick={() => useInclinadasUI.getState().abrir()} />
      </RibbonGroup>
      <RibbonGroup label="Eixos" radios="Ferramenta">
        <Ferr f="eixo" icon="eixo" />
        <RibbonButton icon="malha" label="Malha de eixos…" onClick={() => ui({ jan: 'malha' })} />
      </RibbonGroup>
      <RibbonGroup label="Cargas" radios="Ferramenta"><Ferr f="carga" icon="carga" /><Ferr f="cargaLaje" icon="cargaLaje" /><Ferr f="cargaViga" icon="cargaViga" /></RibbonGroup>
      <Gabarito />
      <RibbonGroup label="Lançamento rápido" radios="Ferramenta"><Ferr f="contornoRet" icon="contorno" /><Ferr f="aberturaRet" icon="abertura" /></RibbonGroup>
      <RibbonGroup label="Cortes" radios="Ferramenta"><Ferr f="corte" icon="corte" /><Ferr f="secao" icon="secao" /></RibbonGroup>
      <RibbonGroup label="Pavimentos"><RibbonButton icon="pavimento" label="Novo pavimento…" onClick={() => ui({ jan: 'novoPavimento' })} /></RibbonGroup>
    </>
  );
}

/** Corpo da aba `aba` da faixa do Edifício. Os cartões 03 a 05 acrescentam as demais abas. */
export function FaixaEdificio({ aba }: { aba: string }): ReactNode {
  if (aba === 'lancamento') return <Lancamento />;
  return null;
}
```
Observações: (a) `Ferr f="vigaGabarito"` etc. mantêm o `ROTULO_FERRAMENTA` de antes; (b) as ferramentas que só existem no nível de fundação (Fundação, Viga de fundação, Radier…) ficam na aba Fundações (cartão 05); (c) `ui(...)` usa o tipo do `set` do store; se o `tsc` reclamar, trocar por `(p: Partial<Parameters<typeof useEdifUI.setState>[0]>)`.

## 5. Retirar da `PlantaBarra` (Edificio.tsx)
Em `const FERRAMENTAS = ferramentas([...])` remover `'selecionar', 'pilar', 'viga', 'laje', 'carga', 'eixo'` (ficam: `fundacao, vigaFund, girarFund, insFund, limite, limiteMascara, mover, medir`, que saem nos cartões 03 e 05). Teclas e paleta não mudam. O `radiogroup` de Edição (`EDICAO`) fica até o cartão 03.

## 6. Fluxos (`e2e/flows.mjs`)
O menu `.menu` deixa de existir. Trocar o helper `fileMenu`:
```js
async function fileMenu(page, item) {
  await page.getByRole('tablist', { name: 'Faixa de comandos' }).getByRole('tab', { name: 'Arquivo', exact: true }).click();
  await page.getByRole('toolbar', { name: /^Comandos: Arquivo/ }).getByRole('button', { name: item }).first().click();
}
```
Os 14 usos (`Novo modelo`, `Abrir trabalho do computador`, `Salvar no computador`, `Só o modelo (.json)`, `Desenho DXF`, `Pórtico de galpão`, `Viga contínua`) continuam iguais. O fluxo que clicava `getByRole('button', { name: 'Arquivo ▾' })` direto (se houver) usa o helper. Seletores `.menu button` desaparecem (`grep -n "\.menu" e2e/flows.mjs` deve ficar vazio).

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`; `npm run build`; `npm run mapa`; `npm run e2e -- --workers 4` completo (81 verdes).

## Rótulos
Rótulos do menu preservados; `role=radio` das ferramentas com o nome do `ROTULO_FERRAMENTA`; `aria-label="Arquivo DXF da máscara"` no `input` da faixa; faixa = `role=toolbar` de nome `Comandos: <aba>`.
