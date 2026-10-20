import { describe, expect, it } from 'vitest';
import { crc32, zip } from './zip';

describe('zip', () => {
  it('CRC-32 de referência e estrutura (cabeçalho local, diretório central, fim)', () => {
    const enc = new TextEncoder();
    expect(crc32(enc.encode('123456789'))).toBe(0xcbf43926);
    const dados = enc.encode('0\r\nSECTION\r\n'), z = zip([{ nome: 'prancha—1.dxf', dados }]);
    const v = new DataView(z.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    const nl = v.getUint16(26, true);
    expect(new TextDecoder().decode(z.slice(30, 30 + nl))).toBe('prancha—1.dxf');
    expect(z.slice(30 + nl, 30 + nl + dados.length)).toEqual(dados);
    const fim = z.length - 22;
    expect(v.getUint32(fim, true)).toBe(0x06054b50);
    expect(v.getUint32(v.getUint32(fim + 16, true), true)).toBe(0x02014b50);
  });
});
