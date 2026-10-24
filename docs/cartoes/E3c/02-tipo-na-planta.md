# E3c — cartão 2: nervurada bidirecional como tipo de laje (doca Propriedades) e camada "Nervuras e cubetas" na planta

Executor: Haiku (um ramo novo num componente existente e uma camada no desenho da planta, no padrão da camada de punção). Regras em `0-leia-primeiro.md`. **Aplicar depois da D7** (toca `Edificio.tsx`).

## Onde aparece
- Doca **Propriedades**, grupo "Lajes": o seletor "Tipo" ganha "Nervurada bidirecional" (forma, altura total, mesa e resumo de peso e volume); a coluna "Dir. (°)" da tabela de lajes edita a direção das nervuradas.
- **Planta**: cubetas inteiras em traço fino (camada `camadaNervuras`, não vai para o arquivo) e setas duplas nas duas direções das nervuras. A caixa que liga a camada é do cartão 3 (grupo "Nervuradas bidirecionais"); aqui só o estado e o desenho. Nada de botão na barra da planta.

## Núcleo usado (já existe)
O tipo `{ tipo: 'nervurada', forma, hTotal, capa }` (`TipoLaje`), `formasDisponiveis(b)`, `geometriaBidirecional(b, tipo)` e `arranjoDaLaje(b, laje)` (`{ g, arr }`; `arr.cubetas[].poligono` são os 4 cantos de cada cubeta, em m) de `src/core/building/nervuradas.ts`; `laje.detectarPanos`, `laje.atribuir` e `laje.editar` já aceitam o tipo novo e a direção.

## Rótulos
O "Tipo" continua com esse rótulo e ganha a opção "Nervurada bidirecional"; novos: "Forma da nervurada", "Altura total da nervurada", "Mesa da nervurada".

## Edições em `plantaStore.ts` e `Planta.tsx`

**Trocar em** `src/app/edificio/plantaStore.ts`
```text
  /** Camada "Punção e cortante" (N2d): contornos críticos d
```
por
```text
  /** Camada "Nervuras e cubetas" (E3c): cubetas inteiras das lajes nervuradas bidirecionais do pavimento (não vai para o arquivo). */
  camadaNervuras: boolean;
  /** Camada "Punção e cortante" (N2d): contornos críticos d
```

**Trocar em** `src/app/edificio/plantaStore.ts`
```text
  camadaPuncao: false,
```
por
```text
  camadaNervuras: false,
  camadaPuncao: false,
```

**Trocar em** `src/app/edificio/Planta.tsx`
```text
import { useEffect, useMemo, useRef, useState } from 'react'
```
por
```text
import { arranjoDaLaje } from '../../core/building/nervuradas';
import { useEffect, useMemo, useRef, useState } from 'react'
```

**Trocar em** `src/app/edificio/Planta.tsx`
```text
  const bloqueados = useMemo(() => idsBloqueados({ vigas: b.
```
por
```text
  // nervuradas bidirecionais (E3c): cubetas inteiras do arranjo (camada opcional)
  const cubetasPlanta = useMemo(() => (pl.camadaNervuras ? lajes.flatMap(({ l }) => (arranjoDaLaje(b, l)?.arr.cubetas ?? []).map((cb) => cb.poligono)) : []), [b, lajes, pl.camadaNervuras]);
  const bloqueados = useMemo(() => idsBloqueados({ vigas: b.
```

**Trocar em** `src/app/edificio/Planta.tsx`
```text
      if (ehNervurada(l.tipo) && !l.definir) { // seta dupla
```
por
```text
      if (l.tipo.tipo === 'nervurada' && !l.definir) { // nervurada bidirecional: setas duplas nas duas direções das nervuras
        const a0 = ((l.direcao ?? 0) * Math.PI) / 180, L = 16, cy = ty + 22;
        ctx.strokeStyle = cores.laje; ctx.lineWidth = 1.2; ctx.beginPath();
        for (const ang of [a0, a0 + Math.PI / 2]) {
          const ux = Math.cos(ang), uy = -Math.sin(ang);
          ctx.moveTo(tx - ux * L, cy - uy * L); ctx.lineTo(tx + ux * L, cy + uy * L);
          for (const sgn of [1, -1]) { const ex = tx + sgn * ux * L, ey = cy + sgn * uy * L; ctx.moveTo(ex, ey); ctx.lineTo(ex - sgn * (ux * 6 - uy * 3.5), ey - sgn * (uy * 6 + ux * 3.5)); ctx.moveTo(ex, ey); ctx.lineTo(ex - sgn * (ux * 6 + uy * 3.5), ey - sgn * (uy * 6 - ux * 3.5)); }
        }
        ctx.stroke();
      }
      if (ehNervurada(l.tipo) && !l.definir) { // seta dupla
```

**Trocar em** `src/app/edificio/Planta.tsx`
```text
    }
    // painéis de tela soldada da base detalhada (retângulo com diagonais e designação)
```
por
```text
    }
    // nervuradas bidirecionais (E3c): cubetas inteiras em traço fino (camada opcional)
    if (cubetasPlanta.length) {
      ctx.strokeStyle = cores.laje; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.9;
      for (const poli of cubetasPlanta) {
        ctx.beginPath();
        poli.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.closePath(); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // painéis de tela soldada da base detalhada (retângulo com diagonais e designação)
```

## Edições em `src/app/edificio/Edificio.tsx`

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
import { VinculosGrupo } from './Vinculos';
```
por
```text
import { formasDisponiveis, geometriaBidirecional } from '../../core/building/nervuradas';
import { VinculosGrupo } from './Vinculos';
```

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
{ tipo: 'vigotas', ficha: 'cat:trelicadas', serie: 'H12' } : { tipo: 'moldada', capa: 0.05
```
por
```text
{ tipo: 'vigotas', ficha: 'cat:trelicadas', serie: 'H12' } : v === 'nervurada' ? { tipo: 'nervurada', forma: formasDisponiveis(b)[0]?.id ?? 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 } : { tipo: 'moldada', capa: 0.05
```

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
{ v: 'moldada', label: 'Nervurada moldada no local' }]} onChange={trocaTipo}
```
por
```text
{ v: 'moldada', label: 'Nervurada moldada no local' }, { v: 'nervurada', label: 'Nervurada bidirecional' }]} onChange={trocaTipo}
```

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
        : tipo.tipo !== 'trelicada' ? <Hint>Laje de vigotas por ficha ou nervurada moldada
```
por
```text
        : tipo.tipo === 'nervurada' ? <>
          <Select label="Forma da nervurada" value={tipo.forma} options={formasDisponiveis(b).map((f) => ({ v: f.id, label: f.nome }))} onChange={(v) => onChange({ ...tipo, forma: v })} />
          <NumField label="Altura total da nervurada" unit="cm" width={80} value={+(tipo.hTotal * 100).toFixed(1)} onChange={(v) => v > 0 && onChange({ ...tipo, hTotal: v / 100 })} />
          <NumField label="Mesa da nervurada" unit="cm" width={80} value={+(tipo.capa * 100).toFixed(1)} onChange={(v) => v >= 3 && onChange({ ...tipo, capa: v / 100 })} />
          <Hint>{(() => { const g = geometriaBidirecional(b, tipo); return `Zona aliviada: peso ${fmt(g.pp)} kN/m², concreto ${fmt(g.volume, 3)} m³/m², cubeta de ${Math.round(g.forma.altura * 100)} cm (${g.recuperavel ? 'forma recuperável' : 'forma perdida'}).`; })()}</Hint>
        </>
        : tipo.tipo !== 'trelicada' ? <Hint>Laje de vigotas por ficha ou nervurada moldada
```

**Trocar em** `src/app/edificio/Edificio.tsx`
```text
<td>{ehNervurada(l.tipo) ? <TextCell value={fmt(l.direcao ?? 0, 0)}
```
por
```text
<td>{ehNervurada(l.tipo) || l.tipo.tipo === 'nervurada' ? <TextCell value={fmt(l.direcao ?? 0, 0)}
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`. O e2e do fluxo `E3c` (cartão 4) cobre a atribuição e a camada.
