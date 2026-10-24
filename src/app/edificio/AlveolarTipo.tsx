// Tipo "Alveolar" no seletor de tipo de pano (frente E3e): ficha (obra, catálogo da biblioteca de normas ou exemplo) e placa por
// altura, com o resumo da placa e a marca da ficha. Os campos valem para o tipo de lançamento (grupo "Lajes") e para a troca do
// tipo dos panos selecionados; a análise e a escolha da placa estão no grupo "Lajes alveolares".
import { fichasAlveolaresDisponiveis, geometriaAlveolar, MARCA_FABRICANTE_ALVEOLAR } from '../../core/building/alveolares';
import type { BuildingModel, TipoLaje } from '../../core/building/types';
import { Hint, Select } from '../ui';

type TipoAlveolar = Extract<TipoLaje, { tipo: 'alveolar' }>;
const f2 = (x: number | undefined, n = 2) => (x === undefined ? '—' : String(+x.toFixed(n)).replace('.', ','));
const FONTE = { obra: 'da obra', catalogo: 'catálogo', exemplo: 'exemplo' } as const;

/** Tipo alveolar inicial: a primeira ficha disponível (a da obra primeiro) e a sua primeira placa. */
export function tipoAlveolarInicial(b: BuildingModel): TipoLaje {
  const f = fichasAlveolaresDisponiveis(b)[0]?.ficha;
  return { tipo: 'alveolar', ficha: f?.id ?? 'ex:alveolar', placa: f?.placas[0]?.id ?? '' };
}

export function AlveolarCampos({ b, tipo, onChange }: { b: BuildingModel; tipo: TipoAlveolar; onChange: (t: TipoLaje) => void }) {
  const todas = fichasAlveolaresDisponiveis(b);
  const atual = todas.find((x) => x.ficha.id === tipo.ficha);
  const g = geometriaAlveolar(b, tipo);
  const marca = g.ficha.ficticio ? 'ficha fictícia (demonstração)' : g.ficha.origem === 'fabricante' ? MARCA_FABRICANTE_ALVEOLAR : 'ficha do usuário, não verificada pelo programa';
  return (
    <>
      <Select label="Ficha alveolar do tipo" value={tipo.ficha} options={todas.map((x) => ({ v: x.ficha.id, label: `${x.ficha.nome} · ${FONTE[x.fonte]}` }))} onChange={(v) => onChange({ tipo: 'alveolar', ficha: v, placa: todas.find((x) => x.ficha.id === v)?.ficha.placas[0]?.id ?? '' })} />
      <Select label="Placa alveolar do tipo" value={tipo.placa} options={(atual?.ficha.placas ?? []).map((p) => ({ v: p.id, label: `${p.id} · h ${f2(p.altura * 100, 0)} cm` }))} onChange={(v) => onChange({ ...tipo, placa: v })} />
      <Hint>
        <span data-resumo-tipo-alveolar>
          Placa {g.placa.id}: altura {f2(g.h * 100, 0)} cm (capa {f2(g.capa * 100, 0)}), largura {f2(g.largura * 100, 0)} cm, peso próprio {f2(g.pp)} kN/m², Mu {f2(g.resist.Mu)} kN·m/m, VRd {f2(g.resist.VRd)} kN/m.
          {g.ausente ? ` ${g.ausente}.` : ''} Sem dado na ficha, a verificação correspondente não é feita. Marca: {marca}.
        </span>
      </Hint>
    </>
  );
}
