# E3e — cartão 3: camada "Placas alveolares" na planta (estado e desenho)

Executor: Haiku (uma camada no desenho da planta, no padrão da camada de nervuras da E3c e da de ábacos da E3d). Regras em `00-leia-primeiro.md`. **Aplicar depois da D7, da E3c e da E3d.**

## Onde aparece
Desenho da **Planta**: cada placa do pano alveolar como retângulo (largura × comprimento entre eixos dos apoios) com o número e as dimensões ("P1 · 120 × 5,50", largura em cm e comprimento em m); a placa de borda cortada ou oblíqua em cor de aviso; a placa com apoio insuficiente ou que não atende, em vermelho com traço grosso (marca "insuficiente", K1.9.71). Aparece depois de calcular e dimensionar. O estado `camadaPlacas` (não vai para o arquivo) é ligado pela caixa "Mostrar placas alveolares na planta" do grupo "Lajes alveolares" (cartão 4). Nada de botão na barra da planta.

## Núcleo usado (já existe)
`dim.alveolares` (`ResultadoAlveolar[]`, por laje) e `placas: PlacaDim[]` de `src/core/building/alveolaresDim.ts`: `{ numero, a, z, largura, comprimento, cortada, obliqua, status: 'ok' | 'insuficiente' }` (`a`/`z` = pontas do eixo da placa em m, coordenadas de planta). A placa oblíqua é desenhada com a extremidade perpendicular ao eixo (a maior corda está no comprimento do rótulo); o recorte exato do canto fica com o fabricante (aviso `ALVEOLAR_CHANFRO`).

## Rótulos
Nenhum (só desenho). Atributo de teste no contêiner do desenho: `data-placas-alveolares` (número de placas desenhadas).

## Edições

**Trocar em** `src/app/edificio/plantaStore.ts`
```text
  camadaPuncao: boolean;
```
por
```text
  camadaPuncao: boolean;
  /** Camada "Placas alveolares" (E3e): placas numeradas das lajes alveolares do pavimento (não vai para o arquivo). */
  camadaPlacas: boolean;
```

**Trocar em** `src/app/edificio/plantaStore.ts`
```text
  camadaPuncao: false,
```
por
```text
  camadaPuncao: false,
  camadaPlacas: false,
```

**Trocar em** `src/app/edificio/Planta.tsx`
```text
  const bloqueados = useMemo(() => idsBloqueados(
```
por
```text
  // lajes alveolares (E3e): placas numeradas do pano, das lajes do pavimento (camada opcional)
  const dimAlveolares = useBuilding((st) => st.dim?.alveolares);
  const placasPlanta = useMemo(() => (pl.camadaPlacas && dimAlveolares ? dimAlveolares.filter((r) => lajes.some(({ l }) => l.id === r.laje)).flatMap((r) => r.placas) : []), [dimAlveolares, lajes, pl.camadaPlacas]);
  const bloqueados = useMemo(() => idsBloqueados(
```

**Trocar em** `src/app/edificio/Planta.tsx`
```text
    // punção e cortante: contornos C
```
por
```text
    // lajes alveolares (E3e): placas numeradas com largura e comprimento; borda cortada e oblíqua em aviso; insuficiente em vermelho (camada opcional)
    if (wrap.current) wrap.current.dataset.placasAlveolares = String(placasPlanta.length);
    if (placasPlanta.length) {
      ctx.save();
      ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const p of placasPlanta) {
        const dx = p.z[0] - p.a[0], dy = p.z[1] - p.a[1], n = Math.hypot(dx, dy) || 1, nx = (-dy / n) * (p.largura / 2), ny = (dx / n) * (p.largura / 2);
        const cantos = [[p.a[0] + nx, p.a[1] + ny], [p.z[0] + nx, p.z[1] + ny], [p.z[0] - nx, p.z[1] - ny], [p.a[0] - nx, p.a[1] - ny]];
        const ruim = p.status === 'insuficiente';
        ctx.strokeStyle = ruim ? cores.erro : p.cortada || p.obliqua ? cores.aviso : cores.laje; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = ruim ? 2.4 : 1;
        ctx.beginPath();
        cantos.forEach((q, i) => { const [x, y] = paraTela(q[0], q[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.closePath(); ctx.stroke();
        if (v.k > 18) { const [tx, ty] = paraTela((p.a[0] + p.z[0]) / 2, (p.a[1] + p.z[1]) / 2); ctx.fillText(`${p.numero.replace(/^.*-/, '')} · ${Math.round(p.largura * 100)} × ${p.comprimento.toFixed(2).replace('.', ',')}`, tx, ty); }
      }
      ctx.restore();
    }
    // punção e cortante: contornos C
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`. O e2e do fluxo `E3e` (cartão 5) cobre a camada.
