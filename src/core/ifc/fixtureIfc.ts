// Gerador do IFC fictício de teste (L3): texto STEP escrito à mão, sem dados de obra real. Usado pelos testes do núcleo
// e para gerar `fixtures/edificio.ifc` (o arquivo do e2e). Cobre IFC4 e IFC2X3, metro e milímetro.
// Edifício: 2 pavimentos (cotas 0 e 3 m) de planta idêntica; 4 pilares por pavimento (retangular, circular, retangular
// girado de 90° e polígono fechado de 25 × 25 cm), 4 vigas de 15 × 40 cm (duas com representação "Axis"), 1 laje de
// 12 cm com abertura de 1 × 1 m; materiais "Concreto C30" (pilares e vigas, com "CA-50" na lista) e "Concreto C25" (laje).
import type { P2 } from './geom';
import type { IfcLido, SecaoIfc } from './ler';

export interface OpcoesFixture {
  esquema?: 'IFC4' | 'IFC2X3';
  /** Unidade de comprimento do arquivo: metro (padrão) ou milímetro. */
  unidade?: 'm' | 'mm';
  /** Acrescenta, no pavimento 1, um pilar sem representação extrudada (sólido de faces), que cai no fallback triangulado. */
  pilarBrep?: boolean;
  /** Acrescenta, no pavimento 1, uma parede de concreto e outra de alvenaria. */
  paredes?: boolean;
  /** Acrescenta, no pavimento 1, uma sapata e uma estaca (só entram no relatório). */
  fundacoes?: boolean;
  /** Coordenadas deslocadas (m), como em arquivos georreferenciados. */
  deslocamento?: [number, number];
}

export function fixtureIfc(o: OpcoesFixture = {}): string {
  const esq = o.esquema ?? 'IFC4', u = o.unidade === 'mm' ? 1000 : 1;
  const [ox, oy] = o.deslocamento ?? [0, 0];
  const linhas: string[] = [];
  let n = 0;
  const add = (s: string) => { linhas.push(`#${++n}=${s};`); return `#${n}`; };
  const num = (v: number) => { const t = String(+v.toFixed(6)); return t.includes('.') || t.includes('e') ? t : `${t}.`; };
  const ptos = (...v: number[]) => `(${v.map(num).join(',')})`;
  const pt3 = (x: number, y: number, z: number) => add(`IFCCARTESIANPOINT(${ptos(x * u, y * u, z * u)})`);
  const pt2 = (x: number, y: number) => add(`IFCCARTESIANPOINT(${ptos(x * u, y * u)})`);
  const dir = (x: number, y: number, z: number) => add(`IFCDIRECTION(${ptos(x, y, z)})`);
  const eixo3 = (x: number, y: number, z: number, ref?: [number, number, number], zz?: [number, number, number]) =>
    add(`IFCAXIS2PLACEMENT3D(${pt3(x, y, z)},${zz ? dir(...zz) : '$'},${ref ? dir(...ref) : '$'})`);
  const lugar = (rel: string | null, eixo: string) => add(`IFCLOCALPLACEMENT(${rel ?? '$'},${eixo})`);
  const eixo2 = (x: number, y: number) => add(`IFCAXIS2PLACEMENT2D(${pt2(x, y)},$)`);
  const L = (v: number) => num(v * u);
  const str = (s: string) => `'${s.replace(/'/g, "''")}'`;
  const global = (pre: string, i: number) => (pre + String(i).padStart(4, '0') + 'xxxxxxxxxxxxxxxxxxxxxx').slice(0, 22);
  const sufixoTipo = (pre: string) => (esq === 'IFC4' ? `,${pre}` : '');

  const ctx = add(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,${eixo3(0, 0, 0)},$)`);
  const unComp = add(`IFCSIUNIT(*,.LENGTHUNIT.,${u === 1000 ? '.MILLI.' : '$'},.METRE.)`);
  const unAng = add('IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.)');
  const unidades = add(`IFCUNITASSIGNMENT((${unComp},${unAng}))`);
  const projeto = add(`IFCPROJECT('3Pr0jeto000000000000A',$,'Edificio Ficticio',$,$,$,$,(${ctx}),${unidades})`);
  const lugSite = lugar(null, eixo3(ox, oy, 0));
  const site = add(`IFCSITE('3Site0000000000000000A',$,'Terreno',$,$,${lugSite},$,$,.ELEMENT.,$,$,$,$,$)`);
  const lugBld = lugar(lugSite, eixo3(0, 0, 0));
  const bld = add(`IFCBUILDING('3Bld00000000000000000A',$,'Bloco A',$,$,${lugBld},$,$,.ELEMENT.,$,$,$)`);
  const rels: string[] = [];
  rels.push(`IFCRELAGGREGATES('3Ag100000000000000000A',$,$,$,${projeto},(${site}))`);
  rels.push(`IFCRELAGGREGATES('3Ag200000000000000000A',$,$,$,${site},(${bld}))`);

  // materiais
  const mat = (nome: string, cat: string) => add(esq === 'IFC4' ? `IFCMATERIAL(${str(nome)},$,${str(cat)})` : `IFCMATERIAL(${str(nome)})`);
  const c30 = mat('Concreto C30', 'Concrete'), c25 = mat('Concreto C25', 'Concrete'), ca50 = mat('CA-50', 'Steel');
  const lista = add(`IFCMATERIALLIST((${c30},${ca50}))`);
  const camada = add(`IFCMATERIALLAYER(${c25},${L(0.12)},$${esq === 'IFC4' ? ",'Laje',$,$,$" : ''})`);
  const conjCamadas = add(`IFCMATERIALLAYERSET((${camada}),'Laje 12'${esq === 'IFC4' ? ',$' : ''})`);
  const usoCamadas = add(`IFCMATERIALLAYERSETUSAGE(${conjCamadas},.AXIS3.,.POSITIVE.,0.${esq === 'IFC4' ? ',$' : ''})`);
  const matC30: string[] = [];
  const lajes: string[] = [];

  const pavimentos = [{ nome: 'Pavimento 1', z: 0 }, { nome: 'Pavimento 2', z: 3 }];
  const lugares = pavimentos.map((p) => lugar(lugBld, eixo3(0, 0, p.z)));
  const storeys = pavimentos.map((p, i) => add(`IFCBUILDINGSTOREY('${global('Stor', i)}',$,${str(p.nome)},$,$,${lugares[i]},$,$,.ELEMENT.,${L(p.z)})`));

  const corpo = (rep: string) => add(`IFCPRODUCTDEFINITIONSHAPE($,$,(${rep}))`);
  const repCorpo = (solido: string, tipo = 'SweptSolid') => add(`IFCSHAPEREPRESENTATION(${ctx},'Body','${tipo}',(${solido}))`);
  const extrusao = (perfil: string, pos: string, prof: number) => add(`IFCEXTRUDEDAREASOLID(${perfil},${pos},${dir(0, 0, 1)},${L(prof)})`);
  const retangulo = (xd: number, yd: number) => add(`IFCRECTANGLEPROFILEDEF(.AREA.,$,${eixo2(0, 0)},${L(xd)},${L(yd)})`);
  const circulo = (d: number) => add(`IFCCIRCLEPROFILEDEF(.AREA.,$,${eixo2(0, 0)},${L(d / 2)})`);
  const poli2 = (p: [number, number][]) => add(`IFCPOLYLINE((${[...p, p[0]].map(([x, y]) => pt2(x, y)).join(',')}))`);
  const arbitrario = (p: [number, number][]) => add(`IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,${poli2(p)})`);

  const porPavimento: string[][] = pavimentos.map(() => []);
  let seq = 0;
  const gid = () => global('El', ++seq);

  for (let k = 0; k < pavimentos.length; k++) {
    const z = pavimentos[k].z;
    const lugarP = lugares[k];
    const nesteP = porPavimento[k];

    // pilares: relativos ao pavimento; base na cota do pavimento, altura 3 m
    const pil = (nome: string, x: number, y: number, perfil: string, giro?: [number, number, number]) => {
      const rep = corpo(repCorpo(extrusao(perfil, eixo3(0, 0, 0), 3)));
      const c = add(`IFCCOLUMN('${gid()}',$,${str(nome + (k + 1))},$,$,${lugar(lugarP, eixo3(x, y, 0, giro))},${rep},$${sufixoTipo('.COLUMN.')})`);
      nesteP.push(c); matC30.push(c);
    };
    pil('P1-', 0, 0, retangulo(0.2, 0.4));
    pil('P2-', 5, 0, circulo(0.3));
    pil('P3-', 5, 4, retangulo(0.2, 0.4), [0, 1, 0]);
    pil('P4-', 0, 4, arbitrario([[-0.125, -0.125], [0.125, -0.125], [0.125, 0.125], [-0.125, 0.125]]));

    if (o.pilarBrep && k === 0) {
      // pilar de 30 × 30 × 3 m em (2,2) como sólido de faces (sem extrusão): vai para o fallback triangulado
      const h = 0.15;
      const v = [[-h, -h, 0], [h, -h, 0], [h, h, 0], [-h, h, 0], [-h, -h, 3], [h, -h, 3], [h, h, 3], [-h, h, 3]].map(([x, y, zz]) => pt3(x, y, zz));
      const f = (a: number, b: number, c: number, d: number) => add(`IFCFACE((${add(`IFCFACEOUTERBOUND(${add(`IFCPOLYLOOP((${[a, b, c, d].map((i) => v[i]).join(',')}))`)},.T.)`)}))`);
      const faces = [f(0, 3, 2, 1), f(4, 5, 6, 7), f(0, 1, 5, 4), f(1, 2, 6, 5), f(2, 3, 7, 6), f(3, 0, 4, 7)];
      const brep = add(`IFCFACETEDBREP(${add(`IFCCLOSEDSHELL((${faces.join(',')}))`)})`);
      const rep = corpo(repCorpo(brep, 'Brep'));
      const c = add(`IFCCOLUMN('${gid()}',$,'PB1',$,$,${lugar(lugarP, eixo3(2, 2, 0))},${rep},$${sufixoTipo('.COLUMN.')})`);
      nesteP.push(c); matC30.push(c);
    }

    // vigas: eixo de um pilar ao outro, 15 × 40, topo na cota do pavimento
    const vigas: [string, [number, number], [number, number], boolean][] = [
      ['V1-', [0, 0], [5, 0], true], ['V2-', [5, 0], [5, 4], false], ['V3-', [5, 4], [0, 4], true], ['V4-', [0, 4], [0, 0], false],
    ];
    for (const [nome, a, b, comEixo] of vigas) {
      const comp = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const dx = (b[0] - a[0]) / comp, dy = (b[1] - a[1]) / comp;
      // sistema local do sólido: z = ao longo do eixo da viga, x = horizontal perpendicular (largura), y = vertical (altura)
      const pos = add(`IFCAXIS2PLACEMENT3D(${pt3(a[0], a[1], z - 0.2)},${dir(dx, dy, 0)},${dir(-dy, dx, 0)})`);
      const reps = [repCorpo(extrusao(retangulo(0.15, 0.4), pos, comp))];
      if (comEixo) reps.push(add(`IFCSHAPEREPRESENTATION(${ctx},'Axis','Curve3D',(${add(`IFCPOLYLINE((${pt3(a[0], a[1], z)},${pt3(b[0], b[1], z)}))`)}))`));
      const rep = add(`IFCPRODUCTDEFINITIONSHAPE($,$,(${reps.join(',')}))`);
      const v = add(`IFCBEAM('${gid()}',$,${str(nome + (k + 1))},$,$,${lugar(null, eixo3(0, 0, 0))},${rep},$${sufixoTipo('.BEAM.')})`);
      nesteP.push(v); matC30.push(v);
    }

    // laje de 12 cm com o topo na cota do pavimento (extrudada para baixo) e abertura de 1 × 1 m
    const perfil = arbitrario([[-0.1, -0.1], [5.1, -0.1], [5.1, 4.1], [-0.1, 4.1]]);
    const rep = corpo(repCorpo(extrusao(perfil, eixo3(0, 0, z - 0.12), 0.12)));
    const laje = add(`IFCSLAB('${gid()}',$,${str('Laje ' + (k + 1))},$,$,${lugar(null, eixo3(0, 0, 0))},${rep},$,.FLOOR.)`);
    nesteP.push(laje); lajes.push(laje);
    const repA = corpo(repCorpo(extrusao(retangulo(1, 1), eixo3(2.5, 2, z - 0.12), 0.12)));
    const ab = add(`IFCOPENINGELEMENT('${gid()}',$,'Abertura',$,$,${lugar(null, eixo3(0, 0, 0))},${repA},$${esq === 'IFC4' ? ',.OPENING.' : ''})`);
    rels.push(`IFCRELVOIDSELEMENT('${global('Vd', k)}',$,$,$,${laje},${ab})`);
  }

  if (o.paredes) {
    const retW = (e: number) => repCorpo(extrusao(retangulo(2, e), eixo3(0, 0, 0), 3));
    const w = add(`IFCWALLSTANDARDCASE('${gid()}',$,'Parede concreto',$,$,${lugar(lugares[0], eixo3(8, 1, 0))},${corpo(retW(0.2))},$${sufixoTipo('.STANDARD.')})`);
    const w2 = add(`IFCWALL('${gid()}',$,'Parede alvenaria',$,$,${lugar(lugares[0], eixo3(8, 3, 0))},${corpo(retW(0.14))},$${sufixoTipo('.STANDARD.')})`);
    const alv = mat('Bloco ceramico', 'Masonry');
    rels.push(`IFCRELASSOCIATESMATERIAL('${global('Mw', 1)}',$,$,$,(${w}),${c30})`, `IFCRELASSOCIATESMATERIAL('${global('Mw', 2)}',$,$,$,(${w2}),${alv})`);
    porPavimento[0].push(w, w2);
  }
  if (o.fundacoes) {
    const sap = add(`IFCFOOTING('${gid()}',$,'Sapata S1',$,$,${lugar(lugares[0], eixo3(0, 0, -1.5))},${corpo(repCorpo(extrusao(retangulo(1, 1), eixo3(0, 0, 0), 0.5)))},$${sufixoTipo('.PAD_FOOTING.')})`);
    const est = add(`IFCPILE('${gid()}',$,'Estaca E1',$,$,${lugar(lugares[0], eixo3(5, 0, -1.5))},${corpo(repCorpo(extrusao(circulo(0.4), eixo3(0, 0, 0), 8)))},$${esq === 'IFC4' ? ',.BORED.,$' : ',$,$'})`);
    porPavimento[0].push(sap, est);
  }

  porPavimento.forEach((els, k) => rels.push(`IFCRELCONTAINEDINSPATIALSTRUCTURE('${global('Ct', k)}',$,$,$,(${els.join(',')}),${storeys[k]})`));
  rels.push(`IFCRELAGGREGATES('${global('Ag', 3)}',$,$,$,${bld},(${storeys.join(',')}))`);
  rels.push(`IFCRELASSOCIATESMATERIAL('${global('Mc', 1)}',$,$,$,(${matC30.join(',')}),${lista})`);
  rels.push(`IFCRELASSOCIATESMATERIAL('${global('Ml', 1)}',$,$,$,(${lajes.join(',')}),${usoCamadas})`);
  for (const r of rels) add(r);

  const cab = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('edificio-ficticio.ifc','2026-10-24T00:00:00',(''),(''),'Statikos teste','','');
FILE_SCHEMA(('${esq}'));
ENDSEC;
DATA;
`;
  return cab + linhas.join('\n') + '\nENDSEC;\nEND-ISO-10303-21;\n';
}

/** O mesmo edifício do `fixtureIfc`, já no formato lido (sem o web-ifc): testes rápidos de proposta e do comando. */
export function lidoFicticio(o: { andares?: number; semMateriais?: boolean } = {}): IfcLido {
  const n = o.andares ?? 2;
  const mat = o.semMateriais ? [] : ['Concreto C30', 'CA-50'];
  const pavimentos = Array.from({ length: n }, (_, k) => ({ id: 100 + k, globalId: `Stor${k}`, nome: `Pavimento ${k + 1}`, cota: 3 * k }));
  const lido: IfcLido = {
    esquema: 'IFC4', unidade: 1, projeto: 'Edificio Ficticio', edificio: 'Bloco A', pavimentos, colunas: [], vigas: [], lajes: [], paredes: [], outros: [],
    materiais: o.semMateriais ? [] : [
      { nome: 'Concreto C30', fck: 30, usos: { coluna: 4 * n, viga: 4 * n, laje: 0, parede: 0, outros: 0 } },
      { nome: 'CA-50', aco: 'CA-50', usos: { coluna: 4 * n, viga: 4 * n, laje: 0, parede: 0, outros: 0 } },
      { nome: 'Concreto C25', fck: 25, usos: { coluna: 0, viga: 0, laje: n, parede: 0, outros: 0 } },
    ],
    classes: { IFCCOLUMN: 4 * n, IFCBEAM: 4 * n, IFCSLAB: n }, avisos: [],
  };
  const sec: { x: number; y: number; angulo: number; secao: SecaoIfc }[] = [
    { x: 0, y: 0, angulo: 0, secao: { tipo: 'ret', b: 0.2, h: 0.4 } }, { x: 5, y: 0, angulo: 0, secao: { tipo: 'circ', d: 0.3 } },
    { x: 5, y: 4, angulo: 90, secao: { tipo: 'ret', b: 0.2, h: 0.4 } }, { x: 0, y: 4, angulo: 0, secao: { tipo: 'ret', b: 0.25, h: 0.25 } },
  ];
  const eixos: [P2, P2][] = [[[0, 0], [5, 0]], [[5, 0], [5, 4]], [[5, 4], [0, 4]], [[0, 4], [0, 0]]];
  pavimentos.forEach((p, k) => {
    sec.forEach((s, i) => lido.colunas.push({ tipo: 'coluna', id: 1000 + 10 * k + i, globalId: `Col${k}${i}`, nome: `P${i + 1}-${k + 1}`, classe: 'IFCCOLUMN', pavimento: p.id, materiais: mat, ...s, secao: { ...s.secao }, z0: p.cota, z1: p.cota + 3 }));
    eixos.forEach((e, i) => lido.vigas.push({ tipo: 'viga', id: 2000 + 10 * k + i, globalId: `Vig${k}${i}`, nome: `V${i + 1}-${k + 1}`, classe: 'IFCBEAM', pavimento: p.id, materiais: mat, pontos: e.map((q) => [...q] as P2), b: 0.15, h: 0.4, zTopo: p.cota }));
    lido.lajes.push({ tipo: 'laje', id: 3000 + k, globalId: `Laj${k}`, nome: `Laje ${k + 1}`, classe: 'IFCSLAB', pavimento: p.id, materiais: o.semMateriais ? [] : ['Concreto C25'], predefinido: 'FLOOR', contorno: [[-0.1, -0.1], [5.1, -0.1], [5.1, 4.1], [-0.1, 4.1]], furos: [[[2, 2.5], [3, 2.5], [3, 1.5], [2, 1.5]]], espessura: 0.12, zTopo: p.cota });
  });
  return lido;
}
