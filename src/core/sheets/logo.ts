// Logo do carimbo (R7-0): imagem JPEG guardada no modelo em base64 (a interface converte PNG, SVG etc. para JPEG
// com fundo branco antes de gravar). Núcleo puro: decodificação base64 e leitura do cabeçalho JPEG sem APIs do navegador.

/** Tamanho máximo do JPEG em base64 guardado no modelo (caracteres; ~72 KB de imagem), pelo limite da biblioteca. */
export const LIMITE_LOGO = 96 * 1024;
/** Nome do arquivo da imagem referenciada pelo DXF e pelo DWG (gravada ao lado do desenho). */
export const ARQUIVO_LOGO = 'logo.jpg';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const INV = new Int16Array(128).fill(-1);
for (let i = 0; i < B64.length; i++) INV[B64.charCodeAt(i)] = i;

/** Base64 → bytes (ignora espaços; null se houver caractere inválido). */
export function base64Bytes(s: string): Uint8Array | null {
  const t = s.replace(/\s+/g, '').replace(/=+$/, '');
  if (t.length % 4 === 1) return null;
  const out = new Uint8Array(Math.floor((t.length * 3) / 4));
  let o = 0, acc = 0, bits = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i), v = c < 128 ? INV[c] : -1;
    if (v < 0) return null;
    acc = (acc << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (acc >> bits) & 0xff; }
  }
  return out.subarray(0, o);
}

/** Bytes → base64. */
export function bytesBase64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < b.length ? B64[n & 63] : '=');
  }
  return s;
}

/** Largura, altura (px) e número de componentes de cor de um JPEG (marcador SOF), ou null se não for JPEG. */
export function infoJpeg(b: Uint8Array): { w: number; h: number; comp: number } | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7) || m === 0xff) { i += m === 0xff ? 1 : 2; continue; }
    const len = (b[i + 2] << 8) | b[i + 3];
    // SOF0–SOF15, menos DHT (C4), JPG (C8) e DAC (CC)
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      const h = (b[i + 5] << 8) | b[i + 6], w = (b[i + 7] << 8) | b[i + 8], comp = b[i + 9];
      return w > 0 && h > 0 ? { w, h, comp } : null;
    }
    i += 2 + len;
  }
  return null;
}

/** Retângulo (mm) do logo dentro da célula, centrado e sem distorcer (proporção w/h em px). */
export function encaixar(cel: { x0: number; y0: number; x1: number; y1: number }, w: number, h: number, folga = 1.5) {
  const W = cel.x1 - cel.x0 - 2 * folga, H = cel.y1 - cel.y0 - 2 * folga, k = Math.min(W / w, H / h);
  const lw = w * k, lh = h * k, cx = (cel.x0 + cel.x1) / 2, cy = (cel.y0 + cel.y1) / 2;
  return { x0: cx - lw / 2, y0: cy - lh / 2, x1: cx + lw / 2, y1: cy + lh / 2 };
}
