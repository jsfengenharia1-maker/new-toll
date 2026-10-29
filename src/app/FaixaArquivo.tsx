// Aba Arquivo da faixa (Pórtico e Fundações): os itens do antigo menu "Arquivo ▾", com os mesmos rótulos. O Edifício não tem esta aba: o arquivo da obra está na etapa Obra (FaixaEdificio).
import { RibbonButton, RibbonGroup } from './ui';
import { SAMPLES } from './samples';

export interface AcoesArquivo {
  novo(): void; abrir(): void; salvar(como: boolean): void; biblioteca(): void;
  json(): void; svg(): void; png(): void; copiar(): void; importarTabelas(): void; dxf(): void; exemplo(key: string): void;
  /** Navegadores com a File System Access API oferecem "Salvar como…". */
  podeSalvarComo: boolean;
}

export function FaixaArquivo({ a }: { a: AcoesArquivo }) {
  return (
    <>
      <RibbonGroup label="Arquivo">
        <RibbonButton icon="novo" label="Novo modelo" onClick={a.novo} />
        <RibbonButton icon="abrir" label="Abrir trabalho do computador…" title="Abrir trabalho do computador… (Ctrl+O)" onClick={a.abrir} />
        <RibbonButton icon="salvar" label="Salvar no computador" title="Salvar no computador (Ctrl+S)" onClick={() => a.salvar(false)} />
        {a.podeSalvarComo && <RibbonButton icon="salvar" label="Salvar como…" title="Salvar como… (Ctrl+Shift+S)" onClick={() => a.salvar(true)} />}
        <RibbonButton icon="biblioteca" label="Biblioteca e histórico…" onClick={a.biblioteca} />
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
