# Cartão L2-06 — Planta: vistas ligadas, textos, cor e espessura por camada

Leia só este cartão e os arquivos citados. Não crie arquivos além dos listados. Sem emojis. Depende dos cartões anteriores na ordem do índice; o núcleo da L2 (`lancamentoDxf.ts`, `commands/lancamento.ts`, `dwgLeitor.ts`, comandos `mascara.*`) já está no repositório. Não edite o núcleo.

## Objetivo
A planta e as listas passam a respeitar os grupos associados à vista (`mascaraNoGrupo`), a vista desligada (`visivel`), os textos desligados por camada e a cor/espessura próprias de cada camada. Itens: C2.5, C2.7, C2.8, C2.9, C2.12, C2.18, C2.19. Classe sugerida: Haiku, esforço baixo; se falhar uma vez, Sonnet (desenho da planta).

## Arquivos
1. `src/app/edificio/Planta.tsx` (editar)

Leia antes: `src/core/building/pilares.ts` (`geometriaPorCamada`, `geometriaMascara`); `src/core/building/types.ts` (`Mascara`, `CamadaMascara`, `mascaraNoGrupo`); `src/app/edificio/Planta.tsx` (`desenhoMascara`, `desenharMascaraEm`).

## Editar `src/app/edificio/Planta.tsx`
Faça as trocas abaixo, na ordem. Em cada uma, o trecho “Procure” aparece uma única vez no arquivo (copie-o exatamente, com os espaços); substitua-o pelo trecho “Coloque”.

### Troca 1
**Procure:**
````tsx
import { geometriaMascara } from '../../core/building/pilares';
````
**Coloque:**
````tsx
import { geometriaMascara, geometriaPorCamada } from '../../core/building/pilares';
````

### Troca 2
**Procure:**
````tsx
import { centroPilar, contornoPilar, dimsSecao, ehArranque, geometriaViga, lancesDoPilar, mascaraParaMundo, pavimentosOrdenados, trechosViga, type BuildingModel, type Pilar, contornoNoLance, centroNoLance, geoLance } from '../../core/building/types';
````
**Coloque:**
````tsx
import { centroPilar, contornoPilar, dimsSecao, ehArranque, geometriaViga, lancesDoPilar, mascaraNoGrupo, mascaraParaMundo, pavimentosOrdenados, trechosViga, type BuildingModel, type Pilar, contornoNoLance, centroNoLance, geoLance } from '../../core/building/types';
````

### Troca 3
**Procure:**
````tsx
    for (const m of mascaras.filter((x) => x.grupo === grupo))
      for (const c of m.camadas) if (c.visivel) for (const t of m.geo[c.nome]?.textos ?? []) { const [x, y] = mascaraParaMundo(m, t.x, t.y); textos.push({ x, y, h: t.h * m.escala, rot: t.rot + m.rotacao, t: t.t }); }
    return { segs: Float64Array.from(g.segs), arcos: Float64Array.from(g.arcos), textos };
````
**Coloque:**
````tsx
    for (const m of mascaras.filter((x) => mascaraNoGrupo(x, grupo) && x.visivel !== false))
      for (const c of m.camadas) if (c.visivel && c.textos !== false) for (const t of m.geo[c.nome]?.textos ?? []) { const [x, y] = mascaraParaMundo(m, t.x, t.y); textos.push({ x, y, h: t.h * m.escala, rot: t.rot + m.rotacao, t: t.t }); }
    // camadas com cor ou espessura próprias (L2, C2.7 e C2.8) são traçadas à parte
    const pad = { segs: [] as number[], arcos: [] as number[] };
    const estilos: { segs: Float64Array; arcos: Float64Array; cor?: string; espessura?: number }[] = [];
    for (const c of geometriaPorCamada({ mascaras }, grupo, false)) {
      if (c.cam.cor || c.cam.espessura) estilos.push({ segs: Float64Array.from(c.segs), arcos: Float64Array.from(c.arcos), cor: c.cam.cor, espessura: c.cam.espessura });
      else { for (const v of c.segs) pad.segs.push(v); for (const v of c.arcos) pad.arcos.push(v); }
    }
    return { segs: Float64Array.from(g.segs), arcos: Float64Array.from(g.arcos), textos, padrao: { segs: Float64Array.from(pad.segs), arcos: Float64Array.from(pad.arcos) }, estilos };
````

### Troca 4
**Procure:**
````tsx
    const { segs, arcos, textos } = desenhoMascara;
    ctx.strokeStyle = cores.mascara; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < segs.length; i += 4) { ctx.moveTo(v.ox + segs[i] * v.k, v.oy - segs[i + 1] * v.k); ctx.lineTo(v.ox + segs[i + 2] * v.k, v.oy - segs[i + 3] * v.k); }
    for (let i = 0; i < arcos.length; i += 5) {
      const cx = v.ox + arcos[i] * v.k, cy = v.oy - arcos[i + 1] * v.k, r = arcos[i + 2] * v.k;
      ctx.moveTo(cx + r * Math.cos((-arcos[i + 3] * Math.PI) / 180), cy + r * Math.sin((-arcos[i + 3] * Math.PI) / 180));
      ctx.arc(cx, cy, r, (-arcos[i + 3] * Math.PI) / 180, (-arcos[i + 4] * Math.PI) / 180, true);
    }
    ctx.stroke();
````
**Coloque:**
````tsx
    const { textos, padrao, estilos } = desenhoMascara;
    const tracar = (segs: Float64Array, arcos: Float64Array, cor: string, largura: number) => {
      ctx.strokeStyle = cor; ctx.lineWidth = largura;
      ctx.beginPath();
      for (let i = 0; i < segs.length; i += 4) { ctx.moveTo(v.ox + segs[i] * v.k, v.oy - segs[i + 1] * v.k); ctx.lineTo(v.ox + segs[i + 2] * v.k, v.oy - segs[i + 3] * v.k); }
      for (let i = 0; i < arcos.length; i += 5) {
        const cx = v.ox + arcos[i] * v.k, cy = v.oy - arcos[i + 1] * v.k, r = arcos[i + 2] * v.k;
        ctx.moveTo(cx + r * Math.cos((-arcos[i + 3] * Math.PI) / 180), cy + r * Math.sin((-arcos[i + 3] * Math.PI) / 180));
        ctx.arc(cx, cy, r, (-arcos[i + 3] * Math.PI) / 180, (-arcos[i + 4] * Math.PI) / 180, true);
      }
      ctx.stroke();
    };
    tracar(padrao.segs, padrao.arcos, cores.mascara, 1);
    for (const e of estilos) tracar(e.segs, e.arcos, e.cor || cores.mascara, e.espessura || 1);
````

### Troca 5
**Procure:**
````tsx
      const m = b.mascaras.find((x) => x.grupo === grupo);
````
**Coloque:**
````tsx
      const m = b.mascaras.find((x) => mascaraNoGrupo(x, grupo));
````

## Verificação
```bash
npx tsc -b && npx vitest run src/app/design/design.test.ts
```

## Pontos de atenção
- `desenhoMascara.segs/arcos` continuam com todas as camadas (captura, enquadramento, `data-segmentos`); `padrao` e `estilos` só servem ao traçado.
