// Armadura das aberturas (E1d-2, bloco A): verga, estribos, peitoril, montantes e cantos por abertura, com bloqueio,
// cópia para as de mesmo tipo e padrão do tipo. As regras estão em core/building (paredesLista, paredesDim).
import { useState } from 'react';
import { Button, Hint, NumField, Select } from '../ui';
import { BITOLAS_PAREDE } from '../../core/building/paredesArmadura';
import { aberturasDoMesmoTipo, armaduraDoForm, formDaArmadura, linhasAberturas, type FormAbertura } from '../../core/building/paredesLista';
import { useBuilding } from './store';
import { executarERecalcular } from './Armadura';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const PHI_ABERTURA = [...BITOLAS_PAREDE, 32].map((p) => ({ v: p, label: String(p).replace('.', ',') }));
const PHI_ESTRIBO = [5, 6.3, 8, 10].map((p) => ({ v: p, label: String(p).replace('.', ',') }));

/** Armadura das aberturas da parede `id`: tabela das aberturas, editor da selecionada e relatório. */
export function AberturasArmadura({ id }: { id: string }) {
  const dim = useBuilding((s) => s.dim), b = useBuilding((s) => s.sessao.modelo);
  const w = b.paredes?.find((q) => q.id === id);
  const linhas = dim ? linhasAberturas(dim.armaduraParedes ?? []).filter((l) => w?.aberturas?.some((a) => a.id === l.id)) : [];
  const [sel, setSel] = useState('');
  const [edit, setEdit] = useState<{ id: string; form: FormAbertura } | null>(null);
  if (!dim) return <Hint>Calcule o dimensionamento para ver a armadura das aberturas.</Hint>;

  const linhaSel = linhas.find((l) => l.id === sel) ?? linhas[0];
  const form: FormAbertura | null = linhaSel ? (edit?.id === linhaSel.id ? edit.form : formDaArmadura(linhaSel.armadura)) : null;
  const setForm = (f: FormAbertura) => { if (linhaSel) setEdit({ id: linhaSel.id, form: f }); };
  const atual = w?.aberturas?.find((a) => a.id === linhaSel?.id);
  const res = dim.armaduraParedes?.flatMap((x) => x.aberturas).find((a) => a.id === linhaSel?.id);
  const tipoSel = linhaSel?.tipo ?? 'porta';

  return (
    <div data-pw-aberturas-arm>
      <h4>Armadura das aberturas</h4>
      {linhas.length === 0 ? <p className="muted">Sem aberturas nesta parede.</p> : (
        <table className="data quadro" data-pw-aberturas-arm-lista>
          <thead><tr><th>Abertura</th><th>Lance</th><th>Necessária (verga / peitoril / montantes)</th><th>Verga</th><th>Estribos</th><th>Peitoril</th><th>Montantes</th><th>Cantos</th><th>Origem</th><th>Situação</th></tr></thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} data-id={l.id} aria-selected={linhaSel?.id === l.id} className={l.status === 'fail' ? 'bad' : undefined} onClick={() => setSel(l.id)}>
                <td className="tl">{l.tipo} {l.dimensoes}</td><td className="tl">{l.lance}</td><td className="num">{l.necessaria}</td>
                <td className="tl">{l.verga}</td><td className="tl">{l.estribo}</td><td className="tl">{l.peitoril}</td><td className="tl">{l.montante}</td><td className="tl">{l.canto}</td>
                <td className="tl">{l.origem}</td><td className="tl">{l.situacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {linhaSel && form && (
        <>
          <div className="row wrap" data-pw-editor-abertura>
            <NumField label="Verga n" width={80} value={form.vergaN} onChange={(v) => setForm({ ...form, vergaN: v })} />
            <Select label="Verga φ" value={form.vergaPhi} options={PHI_ABERTURA} onChange={(v) => setForm({ ...form, vergaPhi: v })} />
            <Select label="Estribo φ" value={form.estriboPhi} options={PHI_ESTRIBO} onChange={(v) => setForm({ ...form, estriboPhi: v })} />
            <NumField label="Estribo s" unit="cm" width={90} value={form.estriboSCm} onChange={(v) => setForm({ ...form, estriboSCm: v })} />
            {tipoSel === 'janela' && <NumField label="Peitoril n" width={80} value={form.peitorilN} onChange={(v) => setForm({ ...form, peitorilN: v })} />}
            {tipoSel === 'janela' && <Select label="Peitoril φ" value={form.peitorilPhi} options={PHI_ABERTURA} onChange={(v) => setForm({ ...form, peitorilPhi: v })} />}
            <NumField label="Montante n" width={80} value={form.montanteN} onChange={(v) => setForm({ ...form, montanteN: v })} />
            <Select label="Montante φ" value={form.montantePhi} options={PHI_ABERTURA} onChange={(v) => setForm({ ...form, montantePhi: v })} />
            <NumField label="Cantos n" width={80} value={form.cantoN} onChange={(v) => setForm({ ...form, cantoN: v })} />
            <Select label="Cantos φ" value={form.cantoPhi} options={PHI_ABERTURA} onChange={(v) => setForm({ ...form, cantoPhi: v })} />
          </div>
          <div className="row wrap">
            <Button onClick={() => executarERecalcular('abertura.armadura', { acao: 'editar', abertura: linhaSel.id, armadura: armaduraDoForm(form, tipoSel) })}>Bloquear armadura da abertura</Button>
            <Button disabled={!aberturasDoMesmoTipo(b, linhaSel.id).length || !atual?.armadura} onClick={() => executarERecalcular('abertura.armadura', { acao: 'copiar', de: linhaSel.id, para: aberturasDoMesmoTipo(b, linhaSel.id) })}>Copiar para as de mesmo tipo</Button>
            <Button onClick={() => executarERecalcular('abertura.armadura', { acao: 'padrao', tipo: tipoSel, armadura: armaduraDoForm(form, tipoSel) })}>Definir como padrão do tipo</Button>
            <Button onClick={() => executarERecalcular('abertura.armadura', { acao: 'limpar', abertura: linhaSel.id })}>Limpar armadura</Button>
            <Button disabled={!b.aberturasPadrao?.[tipoSel]} onClick={() => executarERecalcular('abertura.armadura', { acao: 'limpar', tipo: tipoSel })}>Limpar padrão do tipo</Button>
          </div>
          <details data-pw-relatorio-abertura>
            <summary>Relatório da abertura selecionada</summary>
            {res && (
              <ul>
                <li>Necessária: verga {fmt(res.necessaria.verga)} cm², peitoril {fmt(res.necessaria.peitoril)} cm², montantes {fmt(res.necessaria.montante)} cm² (barras verticais interrompidas).</li>
                <li>Adotada ({res.origem}): verga {linhaSel.verga}, estribos {linhaSel.estribo}, peitoril {linhaSel.peitoril}, montantes {linhaSel.montante}, cantos {linhaSel.canto}.</li>
                <li>Cortante da verga: Vsd {fmt(res.cortanteVerga.Vsd, 1)} kN × VRd2 {fmt(res.cortanteVerga.VRd2, 1)} kN — {res.cortanteVerga.ok ? 'atende' : 'não atende'}.</li>
                {res.mensagens.length > 0 ? res.mensagens.map((m, i) => <li key={i}>{m}</li>) : <li>Sem mensagens.</li>}
              </ul>
            )}
          </details>
        </>
      )}
      <Hint>Verga e peitoril pela tração N/2 + M/z integrada nos elementos da casca acima/abaixo da abertura; montantes = barras verticais interrompidas; a armadura bloqueada é verificada, não redimensionada. Premissa e1d-aberturas a confirmar.</Hint>
    </div>
  );
}
