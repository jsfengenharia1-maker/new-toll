// Escritor de DXF R2000 (AC1015) próprio: planta em escala real (m) no espaço do modelo e a folha (mm) num
// layout de papel com uma janela (viewport) na escala da prancha. Camadas com cor, tipo de linha e espessura
// (pena), texto em cp1252 (acentos) e hachura sólida nos pilares. Uma prancha por arquivo.
import { CAMADAS, TRACOS, type Camada, type Prancha, type Prim } from './prancha';
import { camadaEstilo, nomeCamada } from './estilo';

const LW = [0, 5, 9, 13, 15, 18, 20, 25, 30, 35, 40, 50, 53, 60, 70, 80, 90, 100, 106, 120, 140, 158, 200, 211];
/** Espessura em centésimos de mm, arredondada para um valor aceito pelo DXF. */
const lw = (mm: number) => LW.reduce((b, v) => (Math.abs(v - mm * 100) < Math.abs(b - mm * 100) ? v : b), 25);
const n = (v: number) => (Math.abs(v) < 1e-10 ? '0.0' : String(+v.toFixed(8)));

/** Texto em cp1252 (só o trecho Latin-1); o resto vira \U+XXXX, que o AutoCAD lê em qualquer página de código. */
function cp1252(s: string): string {
  return [...s].map((ch) => {
    const c = ch.codePointAt(0)!;
    return c < 128 || (c >= 160 && c <= 255) ? ch : `\\U+${c.toString(16).toUpperCase().padStart(4, '0')}`;
  }).join('');
}

const TIPO_LINHA: Record<'cont' | 'trac' | 'eixo', string> = { cont: 'Continuous', trac: 'TRACEJADA', eixo: 'EIXO' };

/** `arquivoLogo`: nome do arquivo da imagem do logo, gravada ao lado do DXF (o DXF só referencia imagens externas). */
export function escreverDxf(pr: Prancha, o: { arquivoLogo?: string } = {}): Uint8Array {
  const L: string[] = [];
  const inteiro = (c: number) => (c >= 60 && c < 100) || (c >= 170 && c < 180) || (c >= 270 && c < 300) || (c >= 370 && c < 390);
  const g = (code: number, v: string | number) => { L.push(String(code), typeof v === 'number' ? (inteiro(code) ? String(Math.round(v)) : n(v)) : v); };
  let seq = 0x20;
  const h = () => (seq++).toString(16).toUpperCase();
  // handles fixos dos objetos estruturais
  const H = {
    raiz: 'C', tVport: h(), tLtype: h(), tLayer: h(), tStyle: h(), tView: h(), tUcs: h(), tAppid: h(), tDim: h(), tBr: h(),
    brModel: h(), brPaper: h(), blkModel: h(), endModel: h(), blkPaper: h(), endPaper: h(),
    dGroup: h(), dLayout: h(), dPlot: h(), placeholder: h(), layModel: h(), layPaper: h(),
    vpActive: h(), ltByBlock: h(), ltByLayer: h(), ltCont: h(), ltTrac: h(), ltEixo: h(), styStd: h(), appAcad: h(), dimStd: h(),
    vp1: h(), vp2: h(),
    dImg: h(), imgVars: h(), imgDef: h(), imgReactor: h(), imgEnt: h(),
  };
  const logo = pr.logo;
  const kModelo = pr.escala / 1000; // escala dos tipos de linha no modelo (padrões definidos em mm de papel)
  const mods = pr.modelo, pap = pr.papel;
  const ext = (prims: Prim[]) => {
    const pts = prims.flatMap((q) => (q.t === 'pl' || q.t === 'hach' ? q.pts : q.t === 'circ' ? [q.centro] : [q.p]));
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return pts.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] : [0, 0, 1, 1];
  };
  const [mx0, my0, mx1, my1] = ext(mods);

  // ---------- HEADER ----------
  g(0, 'SECTION'); g(2, 'HEADER');
  const hv = (nome: string, ...pares: [number, string | number][]) => { g(9, nome); for (const [c, v] of pares) g(c, v); };
  hv('$ACADVER', [1, 'AC1015']); hv('$ACADMAINTVER', [70, 6]); hv('$DWGCODEPAGE', [3, 'ANSI_1252']);
  hv('$INSBASE', [10, 0], [20, 0], [30, 0]);
  hv('$EXTMIN', [10, mx0], [20, my0], [30, 0]); hv('$EXTMAX', [10, mx1], [20, my1], [30, 0]);
  hv('$LIMMIN', [10, 0], [20, 0]); hv('$LIMMAX', [10, pr.W], [20, pr.H]);
  hv('$LTSCALE', [40, 1]); hv('$PSLTSCALE', [70, 0]); hv('$TEXTSTYLE', [7, 'Standard']); hv('$CLAYER', [8, '0']);
  hv('$LUNITS', [70, 2]); hv('$LUPREC', [70, 3]); hv('$INSUNITS', [70, 6]); hv('$MEASUREMENT', [70, 1]);
  hv('$LWDISPLAY', [290, 1]); hv('$TILEMODE', [70, 0]); hv('$PEXTMIN', [10, 0], [20, 0], [30, 0]); hv('$PEXTMAX', [10, pr.W], [20, pr.H], [30, 0]);
  hv('$PLIMMIN', [10, 0], [20, 0]); hv('$PLIMMAX', [10, pr.W], [20, pr.H]);
  const handseedPos = L.length; hv('$HANDSEED', [5, 'FFFF']);
  g(0, 'ENDSEC');

  // ---------- CLASSES ----------
  g(0, 'SECTION'); g(2, 'CLASSES');
  for (const [nome, cpp] of [['ACDBDICTIONARYWDFLT', 'AcDbDictionaryWithDefault'], ['ACDBPLACEHOLDER', 'AcDbPlaceHolder'], ['LAYOUT', 'AcDbLayout']]) {
    g(0, 'CLASS'); g(1, nome); g(2, cpp); g(3, 'ObjectDBX Classes'); g(90, 0); g(280, 0); g(281, 0);
  }
  if (logo) for (const [nome, cpp, flags, ent] of [['IMAGE', 'AcDbRasterImage', 127, 1], ['IMAGEDEF', 'AcDbRasterImageDef', 0, 0], ['IMAGEDEF_REACTOR', 'AcDbRasterImageDefReactor', 1, 0], ['RASTERVARIABLES', 'AcDbRasterVariables', 0, 0]] as const) {
    g(0, 'CLASS'); g(1, nome); g(2, cpp); g(3, 'ISM'); g(90, flags); g(280, 0); g(281, ent);
  }
  g(0, 'ENDSEC');

  // ---------- TABLES ----------
  g(0, 'SECTION'); g(2, 'TABLES');
  const tabela = (nome: string, th: string, n: number, f: () => void, extra?: () => void) => {
    g(0, 'TABLE'); g(2, nome); g(5, th); g(330, '0'); g(100, 'AcDbSymbolTable'); g(70, n); extra?.(); f(); g(0, 'ENDTAB');
  };
  const reg = (tipo: string, hh: string, th: string, sub: string, nome: string) => { g(0, tipo); g(tipo === 'DIMSTYLE' ? 105 : 5, hh); g(330, th); g(100, 'AcDbSymbolTableRecord'); g(100, sub); g(2, nome); g(70, 0); };
  tabela('VPORT', H.tVport, 1, () => {
    reg('VPORT', H.vpActive, H.tVport, 'AcDbViewportTableRecord', '*Active');
    g(10, 0); g(20, 0); g(11, 1); g(21, 1); g(12, (mx0 + mx1) / 2); g(22, (my0 + my1) / 2); g(13, 0); g(23, 0); g(14, 0.5); g(24, 0.5); g(15, 0.5); g(25, 0.5);
    g(16, 0); g(26, 0); g(36, 1); g(17, 0); g(27, 0); g(37, 0); g(40, Math.max(my1 - my0, (mx1 - mx0) / 1.6) * 1.1); g(41, 1.6); g(42, 50); g(43, 0); g(44, 0); g(50, 0); g(51, 0);
    g(71, 0); g(72, 100); g(73, 1); g(74, 3); g(75, 0); g(76, 0); g(77, 0); g(78, 0); g(281, 0); g(65, 1); g(110, 0); g(120, 0); g(130, 0); g(111, 1); g(121, 0); g(131, 0); g(112, 0); g(122, 1); g(132, 0); g(79, 0); g(146, 0);
  });
  tabela('LTYPE', H.tLtype, 5, () => {
    const lt = (hh: string, nome: string, desc: string, padrao: number[]) => {
      reg('LTYPE', hh, H.tLtype, 'AcDbLinetypeTableRecord', nome); g(3, desc); g(72, 65); g(73, padrao.length);
      g(40, padrao.reduce((s, v) => s + Math.abs(v), 0));
      for (const v of padrao) { g(49, v); g(74, 0); }
    };
    lt(H.ltByBlock, 'ByBlock', '', []); lt(H.ltByLayer, 'ByLayer', '', []); lt(H.ltCont, 'Continuous', 'Solid line', []);
    lt(H.ltTrac, 'TRACEJADA', 'Tracejada __ __ __', TRACOS.trac.map((v, i) => (i % 2 ? -v : v)));
    lt(H.ltEixo, 'EIXO', 'Eixo ____ . ____ .', TRACOS.eixo.map((v, i) => (i % 2 ? -v : v)));
  });
  const camadas = Object.keys(CAMADAS) as Camada[];
  tabela('LAYER', H.tLayer, camadas.length + 2, () => {
    const ly = (nome: string, cor: number, tipo: string, peso: number, plot = true) => {
      reg('LAYER', h(), H.tLayer, 'AcDbLayerTableRecord', nome); g(62, cor); g(6, tipo); if (!plot) g(290, 0); g(370, peso); g(390, H.placeholder);
    };
    ly('0', 7, 'Continuous', -3);
    ly('JANELA', 8, 'Continuous', -3, false);
    for (const c of camadas) { const ce = camadaEstilo(pr, c); ly(ce.nome, ce.cor, TIPO_LINHA[ce.tipo], lw(ce.pena)); }
  });
  tabela('STYLE', H.tStyle, 1, () => {
    reg('STYLE', H.styStd, H.tStyle, 'AcDbTextStyleTableRecord', 'Standard'); g(40, 0); g(41, 1); g(50, 0); g(71, 0); g(42, 2.5); g(3, 'arial.ttf'); g(4, '');
  });
  tabela('VIEW', H.tView, 0, () => {});
  tabela('UCS', H.tUcs, 0, () => {});
  tabela('APPID', H.tAppid, 1, () => { reg('APPID', H.appAcad, H.tAppid, 'AcDbRegAppTableRecord', 'ACAD'); });
  tabela('DIMSTYLE', H.tDim, 1, () => {
    reg('DIMSTYLE', H.dimStd, H.tDim, 'AcDbDimStyleTableRecord', 'Standard'); g(340, H.styStd);
  }, () => { g(100, 'AcDbDimStyleTable'); g(71, 0); });
  tabela('BLOCK_RECORD', H.tBr, 2, () => {
    for (const [hh, nome, lay] of [[H.brModel, '*Model_Space', H.layModel], [H.brPaper, '*Paper_Space', H.layPaper]]) {
      g(0, 'BLOCK_RECORD'); g(5, hh); g(330, H.tBr); g(100, 'AcDbSymbolTableRecord'); g(100, 'AcDbBlockTableRecord'); g(2, nome); g(340, lay); g(70, 0); g(280, 1); g(281, 0);
    }
  });
  g(0, 'ENDSEC');

  // ---------- BLOCKS ----------
  g(0, 'SECTION'); g(2, 'BLOCKS');
  for (const [nome, br, bh, eh, papel] of [['*Model_Space', H.brModel, H.blkModel, H.endModel, false], ['*Paper_Space', H.brPaper, H.blkPaper, H.endPaper, true]] as const) {
    g(0, 'BLOCK'); g(5, bh); g(330, br); g(100, 'AcDbEntity'); if (papel) g(67, 1); g(8, '0'); g(100, 'AcDbBlockBegin'); g(2, nome); g(70, 0); g(10, 0); g(20, 0); g(30, 0); g(3, nome); g(1, '');
    g(0, 'ENDBLK'); g(5, eh); g(330, br); g(100, 'AcDbEntity'); if (papel) g(67, 1); g(8, '0'); g(100, 'AcDbBlockEnd');
  }
  g(0, 'ENDSEC');

  // ---------- ENTITIES ----------
  g(0, 'SECTION'); g(2, 'ENTITIES');
  const ent = (tipo: string, papel: boolean, camada: string, sub: string) => {
    g(0, tipo); g(5, h()); g(330, papel ? H.brPaper : H.brModel); g(100, 'AcDbEntity'); if (papel) g(67, 1); g(8, camada);
    if (!papel && camada !== 'JANELA') g(48, kModelo);
    g(100, sub);
  };
  const escrever = (q: Prim, papel: boolean) => {
    if (q.t === 'pl') {
      ent('LWPOLYLINE', papel, nomeCamada(pr, q.c), 'AcDbPolyline'); g(90, q.pts.length); g(70, q.fechada ? 1 : 0); g(43, 0);
      for (const p of q.pts) { g(10, p[0]); g(20, p[1]); }
    } else if (q.t === 'circ') {
      ent('CIRCLE', papel, nomeCamada(pr, q.c), 'AcDbCircle'); g(10, q.centro[0]); g(20, q.centro[1]); g(30, 0); g(40, q.r);
    } else if (q.t === 'hach') {
      ent('HATCH', papel, nomeCamada(pr, q.c), 'AcDbHatch'); g(10, 0); g(20, 0); g(30, 0); g(210, 0); g(220, 0); g(230, 1);
      g(2, 'SOLID'); g(70, 1); g(71, 0); g(91, 1); g(92, 3); g(72, 0); g(73, 1); g(93, q.pts.length);
      for (const p of q.pts) { g(10, p[0]); g(20, p[1]); }
      g(97, 0); g(75, 0); g(76, 1); g(98, 0);
    } else {
      const ah = q.ah === 'c' ? 1 : q.ah === 'd' ? 2 : 0, av = q.av === 'meio' ? 2 : q.av === 'topo' ? 3 : 0;
      ent('TEXT', papel, nomeCamada(pr, q.c), 'AcDbText'); g(10, q.p[0]); g(20, q.p[1]); g(30, 0); g(40, q.h); g(1, q.s); if (q.ang) g(50, q.ang); g(7, 'Standard');
      if (ah || av) { g(72, ah); g(11, q.p[0]); g(21, q.p[1]); g(31, 0); }
      g(100, 'AcDbText'); if (av) g(73, av);
    }
  };
  for (const q of mods) escrever(q, false);
  // janelas do papel: a 1 é o próprio papel; a 2 mostra o modelo na escala da prancha
  const vp = (hh: string, id: number, cx: number, cy: number, w: number, hgt: number, vc: [number, number], vh: number) => {
    g(0, 'VIEWPORT'); g(5, hh); g(330, H.brPaper); g(100, 'AcDbEntity'); g(67, 1); g(8, id === 1 ? '0' : 'JANELA'); g(100, 'AcDbViewport');
    g(10, cx); g(20, cy); g(30, 0); g(40, w); g(41, hgt); g(68, id); g(69, id);
    g(12, vc[0]); g(22, vc[1]); g(13, 0); g(23, 0); g(14, 10); g(24, 10); g(15, 10); g(25, 10); g(16, 0); g(26, 0); g(36, 1); g(17, 0); g(27, 0); g(37, 0);
    g(42, 50); g(43, 0); g(44, 0); g(45, vh); g(50, 0); g(51, 0); g(72, 100); g(90, id === 1 ? 32864 : 32864 | 16384); g(1, ''); g(281, 0); g(71, 1); g(74, 0);
    g(110, 0); g(120, 0); g(130, 0); g(111, 1); g(121, 0); g(131, 0); g(112, 0); g(122, 1); g(132, 0); g(79, 0); g(146, 0);
  };
  const j = pr.janela;
  vp(H.vp1, 1, pr.W / 2, pr.H / 2, pr.W * 1.05, pr.H * 1.05, [pr.W / 2, pr.H / 2], pr.H * 1.05);
  if (j) vp(H.vp2, 2, (j.x0 + j.x1) / 2, (j.y0 + j.y1) / 2, j.x1 - j.x0, j.y1 - j.y0, j.centro, (j.y1 - j.y0) * kModelo);
  for (const q of pap) escrever(q, true);
  // logo do carimbo: IMAGE no papel, referenciando a imagem externa (IMAGEDEF)
  if (logo) {
    g(0, 'IMAGE'); g(5, H.imgEnt); g(330, H.brPaper); g(100, 'AcDbEntity'); g(67, 1); g(8, nomeCamada(pr, 'FOLHA')); g(100, 'AcDbRasterImage'); g(90, 0);
    g(10, logo.x0); g(20, logo.y0); g(30, 0);
    g(11, (logo.x1 - logo.x0) / logo.largura); g(21, 0); g(31, 0); g(12, 0); g(22, (logo.y1 - logo.y0) / logo.altura); g(32, 0);
    g(13, logo.largura); g(23, logo.altura); g(340, H.imgDef); g(70, 7); g(280, 0); g(281, 50); g(282, 50); g(283, 0); g(360, H.imgReactor);
    g(71, 1); g(91, 2); g(14, -0.5); g(24, -0.5); g(14, logo.largura - 0.5); g(24, logo.altura - 0.5);
  }
  g(0, 'ENDSEC');

  // ---------- OBJECTS ----------
  g(0, 'SECTION'); g(2, 'OBJECTS');
  const dic = (hh: string, dono: string, itens: [string, string][], tipo = 'DICTIONARY') => {
    g(0, tipo); g(5, hh); if (dono !== '0') { g(102, '{ACAD_REACTORS'); g(330, dono); g(102, '}'); } g(330, dono); g(100, 'AcDbDictionary'); g(281, 1);
    for (const [k, v] of itens) { g(3, k); g(350, v); }
  };
  dic(H.raiz, '0', [['ACAD_GROUP', H.dGroup], ...(logo ? [['ACAD_IMAGE_DICT', H.dImg], ['ACAD_IMAGE_VARS', H.imgVars]] as [string, string][] : []), ['ACAD_LAYOUT', H.dLayout], ['ACAD_PLOTSTYLENAME', H.dPlot]]);
  dic(H.dGroup, H.raiz, []);
  if (logo) {
    dic(H.dImg, H.raiz, [['LOGO', H.imgDef]]);
    g(0, 'IMAGEDEF'); g(5, H.imgDef); g(102, '{ACAD_REACTORS'); g(330, H.dImg); g(330, H.imgReactor); g(102, '}'); g(330, H.dImg);
    g(100, 'AcDbRasterImageDef'); g(90, 0); g(1, o.arquivoLogo ?? 'logo.jpg'); g(10, logo.largura); g(20, logo.altura); g(11, 1); g(21, 1); g(280, 1); g(281, 0);
    g(0, 'IMAGEDEF_REACTOR'); g(5, H.imgReactor); g(330, H.imgEnt); g(100, 'AcDbRasterImageDefReactor'); g(90, 2); g(330, H.imgEnt);
    g(0, 'RASTERVARIABLES'); g(5, H.imgVars); g(102, '{ACAD_REACTORS'); g(330, H.raiz); g(102, '}'); g(330, H.raiz); g(100, 'AcDbRasterVariables'); g(90, 0); g(70, 0); g(71, 1); g(72, 0);
  }
  const nomeLayout = pr.titulo.replace(/[<>/\\":;?*|=`]/g, '-').slice(0, 60) || 'Prancha';
  dic(H.dLayout, H.raiz, [['Model', H.layModel], [nomeLayout, H.layPaper]]);
  dic(H.dPlot, H.raiz, [['Normal', H.placeholder]], 'ACDBDICTIONARYWDFLT'); g(100, 'AcDbDictionaryWithDefault'); g(340, H.placeholder);
  g(0, 'ACDBPLACEHOLDER'); g(5, H.placeholder); g(102, '{ACAD_REACTORS'); g(330, H.dPlot); g(102, '}'); g(330, H.dPlot);
  const layout = (hh: string, nome: string, tab: number, br: string, papel: boolean) => {
    g(0, 'LAYOUT'); g(5, hh); g(102, '{ACAD_REACTORS'); g(330, H.dLayout); g(102, '}'); g(330, H.dLayout);
    g(100, 'AcDbPlotSettings'); g(1, ''); g(2, 'none_device'); g(4, papel ? `ISO_full_bleed_${pr.formato}_(${pr.W}.00_x_${pr.H}.00_MM)` : ''); g(6, '');
    g(40, 0); g(41, 0); g(42, 0); g(43, 0); g(44, papel ? pr.W : 0); g(45, papel ? pr.H : 0); g(46, 0); g(47, 0); g(48, 0); g(49, 0); g(140, 0); g(141, 0);
    g(142, 1); g(143, 1); g(70, papel ? 688 : 1712); g(72, 1); g(73, 0); g(74, 5); g(7, ''); g(75, 16); g(76, 0); g(77, 2); g(78, 300); g(147, 1); g(148, 0); g(149, 0);
    g(100, 'AcDbLayout'); g(1, nome); g(70, 1); g(71, tab);
    g(10, 0); g(20, 0); g(11, papel ? pr.W : 420); g(21, papel ? pr.H : 297); g(12, 0); g(22, 0); g(32, 0);
    g(14, papel ? 0 : mx0); g(24, papel ? 0 : my0); g(34, 0); g(15, papel ? pr.W : mx1); g(25, papel ? pr.H : my1); g(35, 0);
    g(146, 0); g(13, 0); g(23, 0); g(33, 0); g(16, 1); g(26, 0); g(36, 0); g(17, 0); g(27, 1); g(37, 0); g(76, 1); g(330, br);
    if (papel) g(331, H.vp1);
  };
  layout(H.layModel, 'Model', 0, H.brModel, false);
  layout(H.layPaper, nomeLayout, 1, H.brPaper, true);
  g(0, 'ENDSEC');
  g(0, 'EOF');
  L[handseedPos + 3] = h();

  const txt = cp1252(L.join('\r\n') + '\r\n');
  const out = new Uint8Array(txt.length);
  for (let i = 0; i < txt.length; i++) out[i] = txt.charCodeAt(i) & 0xff;
  return out;
}
