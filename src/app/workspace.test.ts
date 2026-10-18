import { describe, expect, it } from 'vitest';
import { parseWorkspace, WORKSPACE_FORMAT } from './workspace';
import { samplePortico } from './samples';

describe('arquivo de trabalho', () => {
  const model = samplePortico();
  it('lê o arquivo de trabalho completo', () => {
    const txt = JSON.stringify({ format: WORKSPACE_FORMAT, version: 1, savedAt: '2026-01-01T00:00:00Z', model, library: [], history: [] });
    const r = parseWorkspace(txt);
    expect(r.model.name).toBe(model.name);
    expect(r.workspace?.format).toBe(WORKSPACE_FORMAT);
  });
  it('aceita um modelo .json avulso', () => {
    const r = parseWorkspace(JSON.stringify(model));
    expect(r.workspace).toBeNull();
    expect(r.model.members.length).toBe(model.members.length);
  });
  it('recusa arquivo estranho', () => {
    expect(() => parseWorkspace('{"a":1}')).toThrow();
    expect(() => parseWorkspace('não é json')).toThrow();
  });
});
