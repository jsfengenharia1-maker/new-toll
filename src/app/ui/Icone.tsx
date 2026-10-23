// Ícones próprios dos atalhos (L4, C1.6): traços simples em 22 × 22, na cor do texto. Nomes = `Atalho.icone` de src/core/ajuda/atalhos.ts.
const TRACOS: Record<string, string> = {
  desfazer: 'M8 5 L3 10 L8 15 M3 10 H14 A5 5 0 0 1 14 20',
  refazer: 'M14 5 L19 10 L14 15 M19 10 H8 A5 5 0 0 0 8 20',
  ajuda: 'M8 8 A3 3 0 1 1 11 11 V13 M11 16 V17',
  guia: 'M5 3 H17 V19 H5 Z M8 7 H14 M8 10 H14 M8 13 H12',
  copiarGrupo: 'M3 3 H12 V12 H3 Z M10 10 H19 V19 H10 Z',
  unirPavimentos: 'M3 5 H19 M3 11 H19 M3 17 H19 M11 5 V17',
  selecionar: 'M5 3 L5 17 L9 13 L12 19 L14 18 L11 12 L16 12 Z',
  pilar: 'M6 4 H16 V18 H6 Z M6 4 L16 18',
  viga: 'M2 8 H20 V14 H2 Z',
  laje: 'M3 5 H19 V17 H3 Z M3 11 H19',
  carga: 'M11 3 V15 M6 10 L11 16 L16 10 M4 19 H18',
  eixo: 'M2 11 H20 M11 2 V20 M11 5 A0 0 0 0 1 11 5',
  mover: 'M11 2 V20 M2 11 H20 M11 2 L8 5 M11 2 L14 5 M11 20 L8 17 M11 20 L14 17',
  copiar: 'M7 7 H18 V18 H7 Z M4 15 V4 H15',
  medir: 'M3 16 L19 16 M3 12 V19 M19 12 V19 M7 16 V14 M11 16 V13 M15 16 V14',
  dimensionamento: 'M4 18 V8 M9 18 V4 M14 18 V11 M19 18 V6',
  verificacao: 'M4 11 L9 16 L18 5',
};
export function Icone({ nome }: { nome: string }) {
  return <svg viewBox="0 0 22 22" className="icone" aria-hidden="true"><path d={TRACOS[nome] ?? TRACOS.ajuda} /></svg>;
}
