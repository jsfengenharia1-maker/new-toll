// ZIP mínimo (sem compressão, método "stored") para entregar arquivos cujo tipo o ambiente não aceita direto.
const TAB = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(d: Uint8Array): number { let c = 0xffffffff; for (const b of d) c = TAB[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

export function zip(arquivos: { nome: string; dados: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder(), partes: Uint8Array[] = [], central: Uint8Array[] = [];
  let off = 0;
  const cab = (tam: number) => { const b = new Uint8Array(tam); return { b, v: new DataView(b.buffer) }; };
  for (const a of arquivos) {
    const nome = enc.encode(a.nome), crc = crc32(a.dados), n = a.dados.length;
    const l = cab(30); // cabeçalho local; bit 11 = nome em UTF-8
    l.v.setUint32(0, 0x04034b50, true); l.v.setUint16(4, 20, true); l.v.setUint16(6, 0x0800, true); l.v.setUint16(8, 0, true);
    l.v.setUint16(10, 0, true); l.v.setUint16(12, 0x21, true); l.v.setUint32(14, crc, true); l.v.setUint32(18, n, true); l.v.setUint32(22, n, true);
    l.v.setUint16(26, nome.length, true); l.v.setUint16(28, 0, true);
    const c = cab(46);
    c.v.setUint32(0, 0x02014b50, true); c.v.setUint16(4, 20, true); c.v.setUint16(6, 20, true); c.v.setUint16(8, 0x0800, true); c.v.setUint16(10, 0, true);
    c.v.setUint16(12, 0, true); c.v.setUint16(14, 0x21, true); c.v.setUint32(16, crc, true); c.v.setUint32(20, n, true); c.v.setUint32(24, n, true);
    c.v.setUint16(28, nome.length, true); c.v.setUint32(42, off, true);
    partes.push(l.b, nome, a.dados); central.push(c.b, nome);
    off += 30 + nome.length + n;
  }
  const tamCentral = central.reduce((s, x) => s + x.length, 0), fim = cab(22);
  fim.v.setUint32(0, 0x06054b50, true); fim.v.setUint16(8, arquivos.length, true); fim.v.setUint16(10, arquivos.length, true);
  fim.v.setUint32(12, tamCentral, true); fim.v.setUint32(16, off, true);
  const tudo = [...partes, ...central, fim.b], out = new Uint8Array(tudo.reduce((s, x) => s + x.length, 0));
  let p = 0; for (const x of tudo) { out.set(x, p); p += x.length; }
  return out;
}
