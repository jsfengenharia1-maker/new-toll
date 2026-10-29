// Janela "Importar cargas de texto" (L1): texto ou arquivo ASCII -> mapeamento de colunas -> prévia ->
// obra só de arranques, com o cálculo das fundações em seguida.
import { useMemo, useState } from 'react';
import { Alert, Button, Check, FilePick, Hint, Modal, Note, Pill, Select, Spacer, TextArea, TextField } from '../ui';
import {
  UNIDADES_PADRAO,
  importarArranques,
  lerTabela,
  sugerirMapeamento,
  type CampoArranque,
  type Mapeamento,
  type Separador,
  type UnidadesTexto,
} from '../../core/building/importarArranques';
import { useBuilding } from './store';

const CAMPOS: { campo: CampoArranque; rotulo: string }[] = [
  { campo: 'pilar', rotulo: 'Coluna: Pilar' },
  { campo: 'caso', rotulo: 'Coluna: Caso (hipótese)' },
  { campo: 'N', rotulo: 'Coluna: N' },
  { campo: 'Hx', rotulo: 'Coluna: Hx' },
  { campo: 'Hy', rotulo: 'Coluna: Hy' },
  { campo: 'Mx', rotulo: 'Coluna: Mx' },
  { campo: 'My', rotulo: 'Coluna: My' },
  { campo: 'bx', rotulo: 'Coluna: Base bx' },
  { campo: 'by', rotulo: 'Coluna: Base by' },
  { campo: 'x', rotulo: 'Coluna: Posição x' },
  { campo: 'y', rotulo: 'Coluna: Posição y' },
];

const SEPARADORES: { v: Separador; label: string }[] = [
  { v: 'auto', label: 'Detectar' },
  { v: 'pontoVirgula', label: 'Ponto e vírgula' },
  { v: 'virgula', label: 'Vírgula' },
  { v: 'tab', label: 'Tabulação' },
  { v: 'colunas', label: 'Espaços ou colunas fixas' },
];

const FORCAS: { v: UnidadesTexto['forca']; label: string }[] = [
  { v: 'kN', label: 'kN' },
  { v: 'tf', label: 'tf' },
  { v: 'kgf', label: 'kgf' },
  { v: 'N', label: 'N' },
];
const MOMENTOS: { v: UnidadesTexto['momento']; label: string }[] = [
  { v: 'kN·m', label: 'kN·m' },
  { v: 'tf·m', label: 'tf·m' },
  { v: 'kgf·m', label: 'kgf·m' },
  { v: 'kN·cm', label: 'kN·cm' },
  { v: 'tf·cm', label: 'tf·cm' },
  { v: 'kgf·cm', label: 'kgf·cm' },
];
const COMPRIMENTOS: { v: UnidadesTexto['comprimento']; label: string }[] = [
  { v: 'm', label: 'm' },
  { v: 'cm', label: 'cm' },
  { v: 'mm', label: 'mm' },
];

const num1 = (v: number) => v.toFixed(1).replace('.', ',');
const FATOR_CM: Record<UnidadesTexto['comprimento'], number> = { m: 100, cm: 1, mm: 0.1 };

export function ImportarTexto({ onClose, onCriada }: { onClose(): void; onCriada(): void }) {
  const [nome, setNome] = useState('Obra de arranques');
  const [texto, setTexto] = useState('');
  const [arquivo, setArquivo] = useState('');
  const [separador, setSeparador] = useState<Separador>('auto');
  const [larguras, setLarguras] = useState('');
  const [cabecalho, setCabecalho] = useState(true);
  const [map, setMap] = useState<Mapeamento>({});
  const [un, setUn] = useState<UnidadesTexto>({ ...UNIDADES_PADRAO });

  const larguraNums = larguras.split(/[;,\s]+/).filter(Boolean).map(Number).filter((n) => n > 0);
  const larguraOpc = separador === 'colunas' && larguraNums.length ? larguraNums : undefined;

  const tabela = useMemo(
    () => (texto.trim() ? lerTabela(texto, { separador, larguras: larguraOpc }) : { linhas: [], separador: 'colunas' as const }),
    [texto, separador, larguraOpc?.join(',')],
  );
  const res = useMemo(
    () => (texto.trim() ? importarArranques(texto, map, un, { separador, larguras: larguraOpc, cabecalho }) : null),
    [texto, map, un, separador, larguraOpc?.join(','), cabecalho],
  );

  const aoCarregar = (t: string, nomeArq: string) => {
    setTexto(t);
    setArquivo(nomeArq);
    setMap(sugerirMapeamento(lerTabela(t, { separador }).linhas[0] ?? []));
  };

  const mudarCampo = (campo: CampoArranque, k: number) => {
    const prox = { ...map };
    if (k === -1) delete prox[campo];
    else prox[campo] = k;
    setMap(prox);
  };

  const primeira = tabela.linhas[0] ?? [];

  return (
    <Modal titulo="Importar cargas de texto" onClose={onClose} larga>
      <Hint>Arquivo de texto (ASCII) em colunas, ou separado por vírgula, ponto e vírgula ou tabulação, com decimal em vírgula ou ponto. Gera uma obra só de arranques para calcular as fundações.</Hint>
      <div className="row wrap">
        <TextField label="Nome da obra a criar" value={nome} onChange={setNome} />
      </div>
      <div className="row wrap">
        <FilePick label="Escolher arquivo…" accept=".txt,.csv,.asc,.prn,text/plain,text/csv" onFile={(f) => void f.text().then((t) => aoCarregar(t, f.name))} />
      </div>
      <Hint>{arquivo ? `Arquivo: ${arquivo}` : 'Nenhum arquivo escolhido.'}</Hint>
      <TextArea label="Ou cole o texto aqui" rows={6} value={texto} onChange={(v) => aoCarregar(v, '')} />

      <div className="row wrap">
        <Select label="Separador" value={separador} options={SEPARADORES} onChange={setSeparador} />
        {separador === 'colunas' && <TextField label="Larguras das colunas (caracteres)" value={larguras} onChange={setLarguras} />}
        <Check label="Primeira linha é o título" checked={cabecalho} onChange={setCabecalho} />
      </div>

      {tabela.linhas.length > 0 && (
        <>
          <h4>Mapeamento das colunas</h4>
          <div className="row wrap">
            {CAMPOS.map(({ campo, rotulo }) => (
              <Select<number>
                key={campo}
                label={rotulo}
                value={map[campo] ?? -1}
                options={[{ v: -1, label: '(não usar)' }, ...primeira.map((c, k) => ({ v: k, label: `${k + 1} — ${c}` }))]}
                onChange={(k) => mudarCampo(campo, k)}
              />
            ))}
          </div>

          <div className="row wrap">
            <Select label="Força" value={un.forca} options={FORCAS} onChange={(v) => setUn({ ...un, forca: v })} />
            <Select label="Momento" value={un.momento} options={MOMENTOS} onChange={(v) => setUn({ ...un, momento: v })} />
            <Select label="Comprimento (base e posição)" value={un.comprimento} options={COMPRIMENTOS} onChange={(v) => setUn({ ...un, comprimento: v })} />
            <Check label="N positivo é compressão" checked={un.compressaoPositiva} onChange={(v) => setUn({ ...un, compressaoPositiva: v })} />
          </div>
        </>
      )}

      {res && (
        <>
          {res.erros.length > 0 ? (
            <Alert>{res.erros[0]}</Alert>
          ) : (
            <Pill tone="ok">{`${res.arranques.length} arranque(s), ${res.hipoteses.length} hipótese(s)`}</Pill>
          )}
          {res.avisos.length > 0 && (
            <Note>
              {res.avisos.slice(0, 6).map((a, k) => (
                <p key={k}>{a}</p>
              ))}
              {res.avisos.length > 6 && <p>{`... e mais ${res.avisos.length - 6} avisos`}</p>}
            </Note>
          )}

          <table className="data">
            <tbody>
              {tabela.linhas.slice(0, 8).map((linha, i) => (
                <tr key={i}>
                  {linha.map((c, k) => (
                    <td key={k}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {tabela.linhas.length > 8 && <Hint>{`Mostrando 8 de ${tabela.linhas.length} linhas.`}</Hint>}

          {res.arranques.length > 0 && (
            <table className="data">
              <thead>
                <tr>
                  <th>Pilar</th>
                  <th>Base (cm)</th>
                  <th>Cargas</th>
                  <th>N total (kN)</th>
                </tr>
              </thead>
              <tbody>
                {res.arranques.map((a) => (
                  <tr key={a.nome}>
                    <td>{a.nome}</td>
                    <td>{`${num1(a.bx * FATOR_CM[un.comprimento])} × ${num1(a.by * FATOR_CM[un.comprimento])}`}</td>
                    <td>{a.cargas.length}</td>
                    <td>{num1(a.cargas.reduce((s, c) => s + c.N, 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <div className="nova-obra-rodape">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Spacer />
        <Button
          variant="primary"
          disabled={!res || res.erros.length > 0 || !res.arranques.length || !nome.trim()}
          onClick={() => {
            const r = useBuilding.getState().novaObraArranques(nome.trim(), res!);
            if (r.ok) {
              void useBuilding.getState().calcular(false);
              onCriada();
            }
          }}
        >
          Criar obra e calcular fundações
        </Button>
      </div>
    </Modal>
  );
}
