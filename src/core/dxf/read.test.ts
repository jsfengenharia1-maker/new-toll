import { describe, expect, it } from 'vitest';
import { lerDxf, metrosPorUnidade } from './read';

/** Monta um DXF a partir de pares código/valor. */
const dxf = (...secoes: (string | number)[][]) => secoes.flat().map(String).join('\n') + '\n0\nEOF\n';
const sec = (nome: string, ...corpo: (string | number)[][]) => [0, 'SECTION', 2, nome, ...corpo.flat(), 0, 'ENDSEC'];
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 9);

describe('leitor de DXF', () => {
  it('LINE, CIRCLE, ARC, TEXT e $INSUNITS', () => {
    const r = lerDxf(dxf(
      sec('HEADER', [9, '$INSUNITS', 70, 5]),
      sec('ENTITIES',
        [0, 'LINE', 8, 'PAREDE', 10, 0, 20, 0, 30, 0, 11, 300, 21, 0, 31, 0],
        [0, 'CIRCLE', 8, 'PILAR', 10, 50, 20, 50, 40, 10],
        [0, 'ARC', 8, 'PORTA', 10, 0, 20, 0, 40, 80, 50, 0, 51, 90],
        [0, 'TEXT', 8, 'TXT', 10, 10, 20, 20, 40, 15, 1, 'SALA'],
      ),
    ));
    expect(r.insunits).toBe(5);
    expect(metrosPorUnidade(r.insunits)).toBe(0.01);
    expect(r.camadas.PAREDE.linhas).toEqual([0, 0, 300, 0]);
    expect(r.camadas.PILAR.arcos).toEqual([50, 50, 10, 0, 360]);
    expect(r.camadas.PORTA.arcos).toEqual([0, 0, 80, 0, 90]);
    expect(r.camadas.TXT.textos[0]).toMatchObject({ x: 10, y: 20, h: 15, t: 'SALA' });
    expect(r.bbox).toEqual([-80, -80, 300, 80]);
  });

  it('LWPOLYLINE fechada com bulge vira segmentos e arco', () => {
    // retângulo 4 × 2 com o lado de cima em semicírculo (bulge 1 = 180°)
    const r = lerDxf(dxf(sec('ENTITIES', [0, 'LWPOLYLINE', 8, 'A', 90, 4, 70, 1, 10, 0, 20, 0, 10, 4, 20, 0, 10, 4, 20, 2, 42, 1, 10, 0, 20, 2])));
    const c = r.camadas.A;
    expect(c.linhas).toEqual([0, 0, 4, 0, 4, 0, 4, 2, 0, 2, 0, 0]);
    expect(c.arcos).toHaveLength(5);
    const [cx, cy, rr, a0, a1] = c.arcos;
    close(cx, 2); close(cy, 2); close(rr, 2);
    close(((a0 % 360) + 360) % 360, 0); close(a1 - a0, 180); // de (4,2) a (0,2) por cima, anti-horário
  });

  it('POLYLINE com VERTEX e SEQEND', () => {
    const r = lerDxf(dxf(sec('ENTITIES',
      [0, 'POLYLINE', 8, 'B', 66, 1, 70, 0, 10, 0, 20, 0],
      [0, 'VERTEX', 8, 'B', 10, 0, 20, 0], [0, 'VERTEX', 8, 'B', 10, 1, 20, 0], [0, 'VERTEX', 8, 'B', 10, 1, 20, 1],
      [0, 'SEQEND', 8, 'B'],
      [0, 'LINE', 8, 'C', 10, 5, 20, 5, 11, 6, 21, 5],
    )));
    expect(r.camadas.B.linhas).toEqual([0, 0, 1, 0, 1, 0, 1, 1]);
    expect(r.camadas.C.linhas).toEqual([5, 5, 6, 5]);
  });

  it('INSERT com escala, rotação, ponto base, camada 0 herdada e matriz; bloco aninhado', () => {
    const r = lerDxf(dxf(
      sec('BLOCKS',
        [0, 'BLOCK', 8, '0', 2, 'BARRA', 70, 0, 10, 1, 20, 0],
        [0, 'LINE', 8, '0', 10, 1, 20, 0, 11, 2, 21, 0],
        [0, 'ENDBLK'],
        [0, 'BLOCK', 8, '0', 2, 'DUAS', 70, 0, 10, 0, 20, 0],
        [0, 'INSERT', 8, 'FIXA', 2, 'BARRA', 10, 0, 20, 0],
        [0, 'INSERT', 8, '0', 2, 'BARRA', 10, 0, 20, 1],
        [0, 'ENDBLK'],
      ),
      sec('ENTITIES',
        [0, 'INSERT', 8, 'ESQ', 2, 'BARRA', 10, 10, 20, 0, 41, 2, 42, 2, 50, 90],
        [0, 'INSERT', 8, 'MAT', 2, 'BARRA', 10, 0, 20, 0, 70, 2, 71, 1, 44, 5, 45, 0],
        [0, 'INSERT', 8, 'NIN', 2, 'DUAS', 10, 100, 20, 100],
        [0, 'HATCH', 8, 'X'],
      ),
    ));
    // BARRA: segmento de 0 a 1 em x a partir do ponto base; escala 2 e giro 90° em (10, 0)
    const e = r.camadas.ESQ.linhas;
    close(e[0], 10); close(e[1], 0); close(e[2], 10); close(e[3], 2);
    expect(r.camadas.MAT.linhas).toEqual([0, 0, 1, 0, 5, 0, 6, 0]);
    expect(r.camadas.FIXA.linhas).toEqual([100, 100, 101, 100]);
    expect(r.camadas.NIN.linhas).toEqual([100, 101, 101, 101]); // camada 0 dentro do bloco herda a do INSERT
    expect(r.ignoradas).toEqual({ HATCH: 1 });
  });

  it('MTEXT sem códigos de formatação; CRLF', () => {
    const t = ['0', 'SECTION', '2', 'ENTITIES', '0', 'MTEXT', '8', 'T', '10', '0', '20', '0', '40', '0.2', '1', '{\\fArial|b0;COZINHA\\PA=12,5 m²}', '0', 'ENDSEC', '0', 'EOF'].join('\r\n');
    expect(lerDxf(t).camadas.T.textos[0].t).toBe('COZINHA A=12,5 m²');
  });
});
