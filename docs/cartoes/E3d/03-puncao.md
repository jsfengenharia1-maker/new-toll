# E3d — cartão 3: ábaco na janela "Punção e cortante"

Executor: Haiku (um bloco novo no cartão de punção existente). Regras em `0-leia-primeiro.md`. Depois do cartão 2.

## Onde aparece
Janela da laje (Resultados do elemento), aba **Punção e cortante** (`Puncao.tsx`, `CartaoPuncao`): para os pilares de laje nervurada (`r.abaco`), logo abaixo da figura dos contornos:
- com ábaco (`r.abaco.id`): nome ABn, h e d do ábaco e da laje, ρ negativo no ábaco e fora, extensão mínima da face à borda, "C′ dentro do ábaco", situação do C″ fora do ábaco e a armadura de punção fora do ábaco, se houver;
- sem ábaco (`r.abaco.id === undefined`): aviso (punção verificada só nas nervuras, com a altura da laje) e a ação **Gerar ábaco neste pilar** (`abaco.gerar { lajes: [laje], pilares: [pilar], substituir: false }` seguida de recálculo, igual ao editor de grupos de armadura da mesma janela). Em radier (`semEditor`) a ação não aparece.

## Núcleo usado (já existe)
`ResultadoPuncao.abaco` (`AbacoPuncaoInfo`: `id?, hAbaco, hLaje, dAbaco, dLaje, rhoAbaco, rhoLaje, extensaoMin, c2NoAbaco, externa?`) e `armaduraExterna` de `src/core/building/puncao.ts`; `arranjoDaLaje` e `nomeAbaco`; `executarERecalcular` (`Armadura.tsx`, já importado).

## Rótulos
`Gerar ábaco neste pilar`; linhas "Ábaco", "h / d do ábaco (cm)", "h / d da laje (cm)", "ρ negativo no ábaco / fora (%)", "Extensão mínima da face do pilar à borda do ábaco (cm)", "C′ dentro do ábaco", "C″ fora do ábaco". Atributos de teste: `data-puncao-abaco="<id do ábaco>"`, `data-puncao-sem-abaco="<id do pilar>"`.

## Edições em `src/app/edificio/Puncao.tsx`

**Trocar em** `src/app/edificio/Puncao.tsx`
```text
import { BITOLAS_PUNCAO } from '../../core/building/puncao';
```
por
```text
import { BITOLAS_PUNCAO } from '../../core/building/puncao';
import { arranjoDaLaje } from '../../core/building/nervuradas';
import { nomeAbaco } from '../../core/sheets/abacoDesenho';
```

**Trocar em** `src/app/edificio/Puncao.tsx`
```text
/** Cartão de um apoio: figura, tensões por contorno
```
por
```text
/** Ábaco do pilar numa nervurada bidirecional (E3d): alturas, taxas e extensão; sem ábaco, a ação "Gerar ábaco neste pilar". */
function BlocoAbaco({ r, semEditor }: { r: ResultadoPuncao; semEditor?: boolean }) {
  const b = useBuilding((s) => s.sessao.modelo), calculando = useBuilding((s) => s.calculando);
  const ab = r.abaco!;
  if (ab.id === undefined) {
    return (
      <div data-puncao-sem-abaco={r.pilar}>
        <p className="hint">Pilar sem ábaco: a punção é verificada só nas nervuras, com a altura da laje (h = {fmt(ab.hLaje * 100, 1)} cm, d = {fmt(ab.dLaje * 100, 1)} cm).</p>
        {!semEditor && <Button disabled={calculando} onClick={() => executarERecalcular('abaco.gerar', { lajes: [r.laje], pilares: [r.pilar], substituir: false })}>Gerar ábaco neste pilar</Button>}
      </div>
    );
  }
  const l = b.lajes.find((x) => x.id === r.laje);
  const nome = l ? nomeAbaco(arranjoDaLaje(b, l)?.abacos ?? [], ab.id) : ab.id;
  return (
    <div data-puncao-abaco={ab.id}>
      <KV rows={[
        ['Ábaco', nome], ['h / d do ábaco (cm)', `${fmt(ab.hAbaco * 100, 1)} / ${fmt(ab.dAbaco * 100, 1)}`], ['h / d da laje (cm)', `${fmt(ab.hLaje * 100, 1)} / ${fmt(ab.dLaje * 100, 1)}`],
        ['ρ negativo no ábaco / fora (%)', `${fmt(ab.rhoAbaco * 100, 3)} / ${fmt(ab.rhoLaje * 100, 3)}`],
        ['Extensão mínima da face do pilar à borda do ábaco (cm)', fmt(ab.extensaoMin * 100, 0)],
        ['C′ dentro do ábaco', ab.c2NoAbaco ? 'sim' : 'não: a região interna usa a altura útil da laje'],
        ...(ab.externa ? [['C″ fora do ábaco', ST_PUN[ab.externa.status]] as [string, string]] : []),
      ]} />
      {r.armaduraExterna && <p className="small">Armadura de punção fora do ábaco (C″): {r.armaduraExterna.linhas} linhas × {r.armaduraExterna.barras} barras {phiTxt(r.armaduraExterna.phi)} = {r.armaduraExterna.total}.</p>}
    </div>
  );
}

/** Cartão de um apoio: figura, tensões por contorno
```

**Trocar em** `src/app/edificio/Puncao.tsx`
```text
      <FiguraPuncao r={r} />
```
por
```text
      <FiguraPuncao r={r} />
      {r.abaco && <BlocoAbaco r={r} semEditor={semEditor} />}
```

## Verificação
`npx tsc -b`; `npx vitest run src/app/design`. O e2e do fluxo `E3d` (cartão 5) cobre os dois casos.
