// Aba Arquivo da faixa (os três módulos): os itens do antigo menu "Arquivo ▾", com os mesmos rótulos (os testes de interface os acham pelo texto).
import { RibbonButton, RibbonGroup } from './ui';
import { SAMPLES } from './samples';
import { useEdifUI } from './edificio/uiStore';
import { useBuilding } from './edificio/store';

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
          <RibbonButton icon="novo" label="Novo padrão" onClick={() => useBuilding.getState().novo(false)} />
          <RibbonButton icon="novo" label="Novo vazio" onClick={() => useBuilding.getState().novo(true)} />
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
