// Passos da janela "Nova obra" (L1): cada passo edita uma parte da especificação do assistente.
import { Alert, Button, Check, Hint, KV, NumCell, NumField, Note, Pill, Seg, Select, TextField } from '../ui';
import { categoriasDeUso, categoriaPorId } from '../../core/building/categoriasUso';
import { VENTO_PADRAO, type CategoriaVento } from '../../core/building/types';
import { gerarObra, type EspecificacaoObra, type PavimentoEspec } from '../../core/building/assistente';

export interface PassoProps { espec: EspecificacaoObra; mudar(p: Partial<EspecificacaoObra>): void }

const CATEGORIAS_VENTO: CategoriaVento[] = ['I', 'II', 'III', 'IV', 'V'];
const num2 = (v: number) => v.toFixed(2).replace('.', ',');

export function PassoObra({ espec, mudar }: PassoProps) {
  const desc = espec.descricao ?? [];
  return (
    <div className="nova-obra">
      <TextField label="Nome da obra" value={espec.nome} onChange={(v) => mudar({ nome: v })} />
      <TextField label="Descrição (linha 1)" value={desc[0] ?? ''} onChange={(v) => mudar({ descricao: [v, desc[1] ?? ''] })} />
      <TextField label="Descrição (linha 2)" value={desc[1] ?? ''} onChange={(v) => mudar({ descricao: [desc[0] ?? '', v] })} />
      <TextField label="Cidade" value={espec.cidade ?? ''} onChange={(v) => mudar({ cidade: v })} />
      <NumField label="Fundação abaixo do pavimento mais baixo" unit="m" value={espec.profundidadeFundacao ?? 1.5} onChange={(v) => mudar({ profundidadeFundacao: v })} />
      <Hint>Cada linha da descrição aceita até 120 caracteres. A descrição vai à capa do memorial e ao carimbo das pranchas.</Hint>
    </div>
  );
}

export function PassoNormas({ espec, mudar }: PassoProps) {
  const norma = espec.norma ?? { fck: 30, aco: 'CA-50' as const, caa: 'II' as const };
  return (
    <div className="nova-obra">
      <NumField label="fck" unit="MPa" value={espec.norma?.fck ?? 30} onChange={(v) => mudar({ norma: { ...norma, fck: v } })} />
      <div className="row wrap">
        <Select label="Aço" value={norma.aco} options={[{ v: 'CA-50', label: 'CA-50' }, { v: 'CA-60', label: 'CA-60' }]} onChange={(v) => mudar({ norma: { ...norma, aco: v } })} />
        <Select label="CAA" value={norma.caa} options={(['I', 'II', 'III', 'IV'] as const).map((c) => ({ v: c, label: c }))} onChange={(v) => mudar({ norma: { ...norma, caa: v } })} />
      </div>
      <Seg
        value={espec.perfil ?? 'sistema'}
        options={[{ v: 'sistema', label: 'Padrão do sistema' }, { v: 'nbr', label: 'Padrão NBR 6118' }]}
        onChange={(v) => mudar({ perfil: v })}
      />
      <Hint>O perfil define os padrões das opções de cálculo (editáveis depois): o do sistema segue o critério de mercado onde ele fixa valor; o da NBR segue a NBR 6118.</Hint>
      <Check
        label="Considerar vento"
        checked={!!espec.vento}
        onChange={(on) => mudar({ vento: on ? { v0: VENTO_PADRAO.v0, categoria: VENTO_PADRAO.categoria } : undefined })}
      />
      {espec.vento && (
        <div className="row wrap">
          <NumField label="V0" unit="m/s" value={espec.vento.v0} onChange={(v) => mudar({ vento: { ...espec.vento!, v0: v } })} />
          <Select
            label="Categoria de rugosidade"
            value={espec.vento.categoria}
            options={CATEGORIAS_VENTO.map((c) => ({ v: c, label: c }))}
            onChange={(v) => mudar({ vento: { ...espec.vento!, categoria: v } })}
          />
        </div>
      )}
      <Hint>Cobrimentos pela CAA (NBR 6118, Tabela 7.2); demais materiais e coeficientes ficam nos dados gerais da obra.</Hint>
    </div>
  );
}

export function PassoPavimentos({ espec, mudar }: PassoProps) {
  const pavs = espec.pavimentos;
  const trocar = (i: number, p: Partial<PavimentoEspec>) => mudar({ pavimentos: pavs.map((x, k) => (k === i ? { ...x, ...p } : x)) });
  const remover = (i: number) => mudar({ pavimentos: pavs.filter((_, k) => k !== i) });
  const adicionar = () => {
    const ult = pavs[pavs.length - 1];
    mudar({ pavimentos: [...pavs, { nome: `Pavimento ${pavs.length + 1}`, peDireito: ult?.peDireito ?? 3, categoria: ult?.categoria ?? 'residencial', repeticoes: 1 }] });
  };
  const totalPavs = pavs.reduce((s, p) => s + p.repeticoes, 0);
  const altura = pavs.reduce((s, p, i) => s + (i === 0 ? (p.repeticoes - 1) * p.peDireito : p.peDireito * p.repeticoes), 0);
  return (
    <div className="nova-obra">
      <Hint>Do mais baixo (1) para o mais alto. “Repetições” cria pavimentos iguais no mesmo grupo (pavimento-tipo). O pé-direito do pavimento 1 só vale para as repetições dele.</Hint>
      {pavs.map((p, i) => {
        const n = i + 1;
        return (
          <div className="row wrap" key={i}>
            <TextField label={`Nome ${n}`} value={p.nome} onChange={(v) => trocar(i, { nome: v })} />
            <NumField label={`Pé-direito ${n}`} unit="m" value={p.peDireito} onChange={(v) => trocar(i, { peDireito: v })} />
            <Select
              label={`Uso ${n}`}
              value={p.categoria}
              options={categoriasDeUso().map((c) => ({ v: c.id, label: c.rotulo }))}
              onChange={(v) => trocar(i, { categoria: v, q: undefined })}
            />
            <NumField
              label={`Sobrecarga ${n}`}
              unit="kN/m²"
              value={p.q ?? espec.qCategoria?.[p.categoria] ?? categoriaPorId(p.categoria)?.q ?? 0}
              onChange={(v) => trocar(i, { q: v })}
            />
            <NumField label={`Repetições ${n}`} value={p.repeticoes} onChange={(v) => trocar(i, { repeticoes: Math.min(60, Math.max(1, Math.round(v))) })} />
            <Button aria-label={`Remover pavimento ${n}`} disabled={pavs.length <= 1} onClick={() => remover(i)}>Remover</Button>
          </div>
        );
      })}
      <div className="row wrap">
        <Button onClick={adicionar}>Adicionar pavimento</Button>
      </div>
      <Hint>{`Altura total: ${num2(altura)} m em ${totalPavs} pavimento(s).`}</Hint>
    </div>
  );
}

/** Número de eixos da malha: um eixo a mais que espaçamentos, em cada direção. */
export function contarEixos(dx: number[], dy: number[]): number {
  return (dx.length ? dx.length + 1 : 0) + (dy.length ? dy.length + 1 : 0);
}

const fmtM = (v: number) => String(v).replace('.', ',');
const listaM = (v: number[]) => v.map(fmtM).join('; ');
const lerM = (texto: string): number[] | null => {
  const vals = texto.split(/[;\s]+/).filter(Boolean).map((t) => parseFloat(t.replace(',', '.')));
  return vals.some((x) => !Number.isFinite(x) || x <= 0) ? null : vals;
};

export function PassoEixos({ espec, mudar }: PassoProps) {
  const e = espec.eixos;
  return (
    <div className="nova-obra">
      <Check
        label="Criar malha de eixos"
        checked={!!e}
        onChange={(on) => mudar({ eixos: on ? { dx: [5, 5, 5], dy: [4.5, 4.5] } : undefined })}
      />
      {e && (
        <>
          <TextField
            label="Espaçamentos em X (m)"
            value={listaM(e.dx)}
            onChange={(t) => {
              const v = lerM(t);
              if (v) mudar({ eixos: { ...e, dx: v } });
            }}
          />
          <TextField
            label="Espaçamentos em Y (m)"
            value={listaM(e.dy)}
            onChange={(t) => {
              const v = lerM(t);
              if (v) mudar({ eixos: { ...e, dy: v } });
            }}
          />
        </>
      )}
      <Hint>Eixos verticais numerados (1, 2, 3…) com os espaçamentos em X; horizontais com letras (A, B, C…) com os de Y. “5; 5; 4,5” cria 4 eixos. A origem é o ponto (0; 0).</Hint>
    </div>
  );
}

export function PassoCargas({ espec, mudar }: PassoProps) {
  return (
    <div className="nova-obra">
      <NumField label="Revestimento e piso" unit="kN/m²" value={espec.revestimento ?? 1} onChange={(v) => mudar({ revestimento: v })} />
      <Hint>Sobrecargas por categoria de uso (NBR 6120:2019, Tabela 10). Edite os valores desta obra; cada pavimento pode ter ainda um valor próprio (passo Pavimentos).</Hint>
      <table className="data">
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Sobrecarga (kN/m²)</th>
            <th>Usada em</th>
            <th>Fonte</th>
          </tr>
        </thead>
        <tbody>
          {categoriasDeUso().map((c) => {
            const usada = espec.pavimentos.filter((p) => p.categoria === c.id).reduce((s, p) => s + p.repeticoes, 0);
            return (
              <tr key={c.id}>
                <td>{c.rotulo}</td>
                <td>
                  <NumCell
                    label={`Sobrecarga de ${c.rotulo}`}
                    value={espec.qCategoria?.[c.id] ?? c.q}
                    onChange={(v) => mudar({ qCategoria: { ...espec.qCategoria, [c.id]: Math.max(0, v) } })}
                  />
                </td>
                <td>{usada ? `${usada} pavimento(s)` : '—'}</td>
                <td>{c.aConfirmar ? <Pill tone="warn">a confirmar</Pill> : 'NBR 6120:2019'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PassoResumo({ espec, erros }: PassoProps & { erros: string[] }) {
  if (erros.length) {
    return (
      <div className="nova-obra">
        <Alert>
          <ul>
            {erros.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Alert>
      </div>
    );
  }
  const desc = (espec.descricao ?? []).filter(Boolean);
  const totalPavs = espec.pavimentos.reduce((s, p) => s + p.repeticoes, 0);
  const v = espec.vento;
  const norma = espec.norma ?? { fck: 30, aco: 'CA-50', caa: 'II' };
  const eixos = espec.eixos ? contarEixos(espec.eixos.dx, espec.eixos.dy) : 0;
  const linhas: [string, string][] = [
    ['Obra', espec.nome],
    ['Descrição', desc.length ? desc.join(' · ') : '—'],
    ['Cidade', espec.cidade || '—'],
    ['Concreto e aço', `C${norma.fck} · ${norma.aco} · CAA ${norma.caa}`],
    ['Perfil de padrões', espec.perfil === 'nbr' ? 'NBR 6118' : 'Sistema'],
    ['Vento', v ? `V0 ${fmtM(v.v0)} m/s · categoria ${v.categoria}` : 'não considerado'],
    ['Pavimentos', `${totalPavs} em ${espec.pavimentos.length} grupo(s)`],
    ['Eixos', eixos ? `${eixos} eixo(s)` : '—'],
    ['Revestimento', `${fmtM(espec.revestimento ?? 1)} kN/m²`],
  ];
  return (
    <div className="nova-obra">
      <KV rows={linhas} />
      <Note>Ao criar, a obra atual é substituída (guarde-a antes pelo Arquivo › Salvar no computador, se precisar) e a janela de dados gerais abre para conferir normas e materiais. Tudo vira um único passo no histórico: Ctrl+Z desfaz a obra inteira.</Note>
      <Pill tone="ok">{`${gerarObra(espec).comandos.length} comando(s) serão aplicados`}</Pill>
    </div>
  );
}
