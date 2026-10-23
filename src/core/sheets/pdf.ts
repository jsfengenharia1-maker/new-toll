// Escritor de PDF vetorial próprio (PDF 1.5): uma página por prancha no tamanho da folha, desenho em mm
// (escala exata), espessura por pena, tracejados, Helvetica com WinAnsiEncoding (acentos) e uma camada
// opcional (OCG) por camada da prancha, que o leitor de PDF liga e desliga.
import { TRACOS, type Camada, type Prancha, type Prim } from './prancha';
import { camadasUsadas, dyBase, primitivasNoPapel } from './papel';
import { camadaEstilo, nomeCamada } from './estilo';
import { base64Bytes, infoJpeg } from './logo';

// Larguras da Helvetica (unidades de 1/1000 do corpo) dos caracteres 32 a 126 — métricas padrão da fonte.
const W_ASCII = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const W_EXTRA: Record<string, number> = { '×': 584, 'ø': 611, 'Ø': 778, '°': 400, 'º': 365, 'ª': 370, '²': 333, '³': 333, '·': 278, '–': 556, '—': 1000, '±': 584, 'ç': 500, 'Ç': 722 };

/** Código WinAnsi (cp1252) do caractere; φ vira ø (sem glifo na Helvetica padrão). */
function winAnsi(ch: string): number {
  if (ch === 'φ' || ch === 'Φ') ch = 'ø';
  const c = ch.codePointAt(0)!;
  if (c < 128 || (c >= 160 && c <= 255)) return c;
  const m: Record<string, number> = { '€': 128, '‚': 130, 'ƒ': 131, '„': 132, '…': 133, '†': 134, '‡': 135, 'ˆ': 136, '‰': 137, 'Š': 138, '‹': 139, 'Œ': 140, 'Ž': 142, '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '˜': 152, '™': 153, 'š': 154, '›': 155, 'œ': 156, 'ž': 158, 'Ÿ': 159 };
  return m[ch] ?? 63; // '?'
}

function largura(s: string): number {
  let w = 0;
  for (const ch0 of s) {
    const ch = ch0 === 'φ' ? 'ø' : ch0, c = ch.codePointAt(0)!;
    if (c >= 32 && c <= 126) w += W_ASCII[c - 32];
    else if (W_EXTRA[ch] !== undefined) w += W_EXTRA[ch];
    else { const base = ch.normalize('NFD')[0], b = base.codePointAt(0)!; w += b >= 32 && b <= 126 ? W_ASCII[b - 32] : 556; }
  }
  return w / 1000;
}

const strPdf = (s: string) => '(' + [...s].map((ch) => {
  const c = winAnsi(ch);
  if (ch === '(' || ch === ')' || ch === '\\') return '\\' + ch;
  return c >= 32 && c < 127 ? String.fromCharCode(c) : '\\' + c.toString(8).padStart(3, '0');
}).join('') + ')';

/** Texto do dicionário de informações em UTF-16BE (aceita qualquer caractere). */
const strInfo = (s: string) => '<FEFF' + [...s].map((ch) => { const c = ch.codePointAt(0)!; const u = c > 0xffff ? String.fromCharCode(0xd800 + ((c - 0x10000) >> 10), 0xdc00 + ((c - 0x10000) & 0x3ff)) : ch; return [...u].map((x) => x.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join(''); }).join('') + '>';

const n = (v: number) => (Math.abs(v) < 5e-5 ? '0' : v.toFixed(4).replace(/\.?0+$/, ''));
/** Corpo da fonte para a altura das maiúsculas `h` (Helvetica: 0,718 do corpo). */
const CORPO = 1 / 0.718;

function conteudo(pr: Prancha, prims: Prim[], ocg: Map<Camada, string>): string {
  const ops: string[] = ['1 J 1 j', `${n(72 / 25.4)} 0 0 ${n(72 / 25.4)} 0 0 cm`];
  // agrupa por camada, mantendo a ordem de desenho de cada uma (hachuras antes das linhas dentro da camada)
  for (const c of camadasUsadas(prims)) {
    const cam = camadaEstilo(pr, c), qs = prims.filter((p) => p.c === c);
    ops.push(`/OC /${ocg.get(c)} BDC`, `${n(cam.pena)} w`, cam.tipo === 'cont' ? '[] 0 d' : `[${TRACOS[cam.tipo].join(' ')}] 0 d`);
    for (const q of qs) {
      if (q.t === 'pl') { ops.push(`${n(q.pts[0][0])} ${n(q.pts[0][1])} m ` + q.pts.slice(1).map((p) => `${n(p[0])} ${n(p[1])} l`).join(' ') + (q.fechada ? ' s' : ' S')); }
      else if (q.t === 'hach') ops.push('0.6 g', `${n(q.pts[0][0])} ${n(q.pts[0][1])} m ` + q.pts.slice(1).map((p) => `${n(p[0])} ${n(p[1])} l`).join(' ') + ' h f', '0 g');
      else if (q.t === 'circ') {
        const [x, y] = q.centro, r = q.r, k = 0.5523 * r;
        ops.push(`${n(x + r)} ${n(y)} m ${n(x + r)} ${n(y + k)} ${n(x + k)} ${n(y + r)} ${n(x)} ${n(y + r)} c ${n(x - k)} ${n(y + r)} ${n(x - r)} ${n(y + k)} ${n(x - r)} ${n(y)} c ${n(x - r)} ${n(y - k)} ${n(x - k)} ${n(y - r)} ${n(x)} ${n(y - r)} c ${n(x + k)} ${n(y - r)} ${n(x + r)} ${n(y - k)} ${n(x + r)} ${n(y)} c s`);
      } else {
        const corpo = q.h * CORPO, a = ((q.ang ?? 0) * Math.PI) / 180, c2 = Math.cos(a), s2 = Math.sin(a);
        const dx = q.ah === 'c' ? -largura(q.s) * corpo / 2 : q.ah === 'd' ? -largura(q.s) * corpo : 0, dy = dyBase(q.av, q.h);
        const x = q.p[0] + dx * c2 - dy * s2, y = q.p[1] + dx * s2 + dy * c2;
        ops.push(`BT /F1 ${n(corpo)} Tf ${n(c2)} ${n(s2)} ${n(-s2)} ${n(c2)} ${n(x)} ${n(y)} Tm ${strPdf(q.s)} Tj ET`);
      }
    }
    ops.push('EMC');
  }
  return ops.join('\n');
}

/** PDF com uma página por prancha. Bytes prontos para gravar. */
export function escreverPdf(pranchas: Prancha[], info: { titulo?: string; autor?: string } = {}): Uint8Array {
  const objs: string[] = []; // objs[i] = corpo do objeto i + 1
  const add = (s: string) => { objs.push(s); return objs.length; };
  const catalogo = add(''), paginas = add(''), fonte = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const todas = [...new Set(pranchas.flatMap((pr) => camadasUsadas(primitivasNoPapel(pr))))];
  const ocgs = new Map<Camada, number>(todas.map((c) => [c, add(`<< /Type /OCG /Name ${strPdf(nomeCamada(pranchas[0], c))} >>`)]));
  const nomes = new Map<Camada, string>(todas.map((c, i) => [c, `oc${i + 1}`]));
  const kids: number[] = [];
  // logo do carimbo: um XObject de imagem (JPEG, DCTDecode) por imagem distinta, compartilhado entre as páginas
  const imagens = new Map<string, number>();
  const imagem = (dados: string) => {
    const ja = imagens.get(dados);
    if (ja) return ja;
    const b = base64Bytes(dados), info = b && infoJpeg(b);
    if (!b || !info) return 0;
    let bin = '';
    for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
    const cor = info.comp === 1 ? '/DeviceGray' : info.comp === 4 ? '/DeviceCMYK /Decode [1 0 1 0 1 0 1 0]' : '/DeviceRGB';
    const id = add(`<< /Type /XObject /Subtype /Image /Width ${info.w} /Height ${info.h} /ColorSpace ${cor} /BitsPerComponent 8 /Filter /DCTDecode /Length ${b.length} >>\nstream\n${bin}\nendstream`);
    imagens.set(dados, id);
    return id;
  };
  for (const pr of pranchas) {
    const prims = primitivasNoPapel(pr);
    let cs = conteudo(pr, prims, nomes);
    const im = pr.logo ? imagem(pr.logo.dados) : 0;
    if (im && pr.logo) { const k = 72 / 25.4, L = pr.logo; cs += `\nq ${n((L.x1 - L.x0) * k)} 0 0 ${n((L.y1 - L.y0) * k)} ${n(L.x0 * k)} ${n(L.y0 * k)} cm /Logo Do Q`; }
    const stream = add(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
    const props = camadasUsadas(prims).map((c) => `/${nomes.get(c)} ${ocgs.get(c)} 0 R`).join(' ');
    const wpt = n((pr.W * 72) / 25.4), hpt = n((pr.H * 72) / 25.4);
    kids.push(add(`<< /Type /Page /Parent ${paginas} 0 R /MediaBox [0 0 ${wpt} ${hpt}] /Resources << /Font << /F1 ${fonte} 0 R >>${im ? ` /XObject << /Logo ${im} 0 R >>` : ''} /Properties << ${props} >> >> /Contents ${stream} 0 R >>`));
  }
  const refs = [...ocgs.values()].map((i) => `${i} 0 R`).join(' ');
  objs[catalogo - 1] = `<< /Type /Catalog /Pages ${paginas} 0 R /PageMode /UseOC /OCProperties << /OCGs [${refs}] /D << /Order [${refs}] /ON [${refs}] >> >> >>`;
  objs[paginas - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
  const infoObj = add(`<< /Title ${strInfo(info.titulo ?? pranchas[0]?.titulo ?? 'Pranchas')} /Producer (Statikos)${info.autor ? ` /Author ${strInfo(info.autor)}` : ''} >>`);
  let txt = '%PDF-1.5\n%\xE2\xE3\xCF\xD3\n';
  const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(txt.length); txt += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = txt.length;
  txt += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  txt += `trailer\n<< /Size ${objs.length + 1} /Root ${catalogo} 0 R /Info ${infoObj} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const out = new Uint8Array(txt.length);
  for (let i = 0; i < txt.length; i++) out[i] = txt.charCodeAt(i) & 0xff;
  return out;
}
