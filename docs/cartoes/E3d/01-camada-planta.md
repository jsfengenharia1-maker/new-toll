# E3d — cartão 1: camada "Ábacos" na planta (estado e desenho)

Executor: Haiku (uma camada no desenho da planta, no padrão da camada de nervuras da E3c). Regras em `0-leia-primeiro.md`. Depois da E3c.

## Onde aparece
Desenho da **Planta**: a zona efetiva de cada ábaco (polígono ajustado às cubetas e recortado pelo contorno do pano) sombreada com contorno. O estado `camadaAbacos` (não vai para o arquivo) é ligado pela caixa "Mostrar ábacos na planta" do grupo "Ábacos" (cartão 2) e pelos botões de gerar. Nada de botão na barra da planta.

## Núcleo usado (já existe)
`arranjoDaLaje(b, laje).abacos` (`AbacoEfetivo[]`: `{ abaco, poligono, area }`) de `src/core/building/nervuradas.ts` (já importado em `Planta.tsx` pelo cartão E3c-2).

## Rótulos
Nenhum (só desenho).

## Edições

**Trocar em** `src/app/edificio/plantaStore.ts`
```text
  camadaNervuras: boolean;
```
por
```text
  camadaNervuras: boolean;
  /** Camada "Ábacos" (E3d): zona efetiva dos ábacos das lajes nervuradas bidirecionais do pavimento (não vai para o arquivo). */
  camadaAbacos: boolean;
```

**Trocar em** `src/app/edificio/plantaStore.ts`
```text
  camadaNervuras: false,
```
por
```text
  camadaNervuras: false,
  camadaAbacos: false,
```

**Trocar em** `src/app/edificio/Planta.tsx`
```text
  const bloqueados = useMemo(() => idsBloqueados(
```
por
```text
  // ábacos das nervuradas bidirecionais (E3d): zona efetiva de cada ábaco (camada opcional)
  const abacosPlanta = useMemo(() => (pl.camadaAbacos ? lajes.flatMap(({ l }) => (arranjoDaLaje(b, l)?.abacos ?? []).map((e) => e.poligono)) : []), [b, lajes, pl.camadaAbacos]);
  const bloqueados = useMemo(() => idsBloqueados(
```

**Trocar em** `src/app/edificio/Planta.tsx`
```text
    // painéis de tela soldada da base detalhada (retângulo com diagonais e designação)
```
por
```text
    // ábacos das nervuradas bidirecionais (E3d): zona efetiva sombreada com contorno (camada opcional)
    if (abacosPlanta.length) {
      ctx.fillStyle = cores.laje; ctx.strokeStyle = cores.laje; ctx.lineWidth = 1.4;
      for (const poli of abacosPlanta) {
        ctx.beginPath();
        poli.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.closePath();
        ctx.globalAlpha = 0.22; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
      }
    }
    // painéis de tela soldada da base detalhada (retângulo com diagonais e designação)
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`. O e2e do fluxo `E3d` (cartão 5) cobre a camada ligada pelo botão de gerar.
