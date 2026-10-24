# L3 — cartão 3: memorial da importação

Classe: Haiku. Depende do cartão 1 (não usa a janela; só o núcleo `memorialIfc`).

## `src/app/edificio/MemorialIfc.tsx` (novo)
```tsx
// Memorial: origem IFC (arquivo e esquema), mapeamento de materiais e relatório de importação (L3).
import type { BuildingModel } from '../../core/building/types';
import { memorialIfc } from '../../core/ifc/memorial';

export function MemorialIfc({ b }: { b: BuildingModel }) {
  const m = memorialIfc(b);
  if (!m) return null;
  return (
    <div data-memorial-ifc>
      <h3>Importação de IFC</h3>
      <table>
        <tbody>{m.cabecalho.map(([k, v]) => <tr key={k}><td className="l">{k}</td><td className="l">{v}</td></tr>)}</tbody>
      </table>
      <h3>Materiais do arquivo ligados aos tipos de elemento</h3>
      <table>
        <thead><tr><th className="l">Tipo</th><th className="l">Material do arquivo</th><th>fck</th><th>Aço</th></tr></thead>
        <tbody>{m.materiais.map((x) => <tr key={x.tipo}><td className="l">{x.tipo}</td><td className="l">{x.material}</td><td>{x.fck}</td><td>{x.aco}</td></tr>)}</tbody>
      </table>
      <h3>Relatório de importação</h3>
      <table>
        <tbody>{m.relatorio.map(([k, v]) => <tr key={k}><td className="l">{k}</td><td>{v}</td></tr>)}</tbody>
      </table>
      {m.classes.length > 0 && <p>Classes IFC do arquivo: {m.classes.map(([k, v]) => `${k} ${v}`).join('; ')}.</p>}
      {m.ignorados.map((x) => <p key={`${x.classe}${x.motivo}`}>Ignorado: {x.quantidade} × {x.classe} ({x.motivo}).</p>)}
      {m.ambiguos.map((a, i) => <p key={`a${i}`}>{a}</p>)}
      {m.avisos.map((a, i) => <p key={`v${i}`}>{a}</p>)}
      <p>
        Mapeamento de pavimentos, tolerâncias (1 cm de posição, 15 cm de cota) e demais critérios da importação: a confirmar (premissa lancamento-ifc).
        Cada elemento lançado guarda a origem (“ifc:” e o GlobalId), então reimportar o mesmo arquivo não duplica.
      </p>
    </div>
  );
}
```

## `src/app/edificio/MemorialEdificio.tsx`
1. Depois de `import { MemorialGabaritos } from './MemorialGabaritos';`, acrescentar `import { MemorialIfc } from './MemorialIfc';`.
2. Depois da linha `<MemorialGabaritos b={b} />`, acrescentar `<MemorialIfc b={b} />`.

## Verificação
`npx tsc -b`; `npx vitest run src/app/design --reporter=dot`.
