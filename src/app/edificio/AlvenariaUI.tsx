// Grupo "Alvenaria estrutural" da aba Edifício (frente E1e): blocos de concreto, tipos de alvenaria e
// biblioteca do usuário. As funções puras estão em core/building/alvenariaLista.ts.
import { useEffect, useState } from 'react';
import { useBuilding } from './store';
import type { BuildingModel } from '../../core/building/types';
import {
  BITOLAS_ALV_HORIZONTAL, BITOLAS_ALV_VERTICAL, FORM_BLOCO_PADRAO, GRAUTEAMENTOS,
  bibliotecaDeAlvenaria, comandosDaBiblioteca, formDoBloco, formDoTipo, linhasBlocos, linhasTiposAlvenaria,
  paramsBloco, paramsTipoAlvenaria, resumoBiblioteca, type BibliotecaAlvenaria, type FormAlvenaria, type FormBloco,
} from '../../core/building/alvenariaLista';
import { deleteFromLibrary, listLibrary, loadFromLibrary, saveToLibrary, type LibraryItem } from '../storage';
import { Button, Check, Group, Hint, NumField, OptNumField, Select, TextField } from '../ui';

export function AlvenariaGrupo({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const blocos = b.blocos ?? [];
  const tipos = b.tiposAlvenaria ?? [];
  const [fb, setFb] = useState<FormBloco>(FORM_BLOCO_PADRAO);
  const [editB, setEditB] = useState<string | null>(null);
  const [ft, setFt] = useState<FormAlvenaria>(() => formDoTipo(undefined, 'blocos', blocos[0]?.id ?? ''));
  const [editT, setEditT] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const linhasB = linhasBlocos(b);
  const linhasT = linhasTiposAlvenaria(b);
  const blocoEf = blocos.some((x) => x.id === ft.bloco) ? ft.bloco : blocos[0]?.id ?? '';

  const aplicar = (nome: string, params: Record<string, unknown>, aoOk: () => void) => {
    const r = exec(nome, params);
    if (r.ok) { aoOk(); setMsg(''); } else setMsg(r.erros[0]?.mensagem ?? 'Não foi possível.');
  };

  const criarOuSalvarBloco = () => aplicar('bloco.tipo', paramsBloco(fb, editB ?? undefined), () => { setFb(FORM_BLOCO_PADRAO); setEditB(null); });
  const cancelarBloco = () => { setFb(FORM_BLOCO_PADRAO); setEditB(null); };
  const criarOuSalvarTipo = () => {
    const f = { ...ft, bloco: blocoEf };
    aplicar('alvenaria.tipo', paramsTipoAlvenaria(f, editT ?? undefined, tipos.find((t) => t.id === editT)), () => {
      setFt(formDoTipo(undefined, ft.modelo, blocos[0]?.id ?? ''));
      setEditT(null);
    });
  };
  const cancelarTipo = () => { setFt(formDoTipo(undefined, ft.modelo, blocos[0]?.id ?? '')); setEditT(null); };

  return (
    <Group title={`Alvenaria estrutural (${tipos.length})`} open={tipos.length > 0 || blocos.length > 0}>
      <h4>Blocos de concreto</h4>
      {linhasB.length > 0 && (
        <table className="data quadro" data-alv-blocos>
          <thead>
            <tr>
              <th className="tl">Bloco</th>
              <th className="tl">Dimensões</th>
              <th className="num">fbk (MPa)</th>
              <th className="tl">Peça de canto</th>
              <th className="tl">Tipos que usam</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {linhasB.map((l) => (
              <tr key={l.id} data-id={l.id}>
                <td className="tl"><b>{l.nome}</b></td>
                <td className="tl">{l.dimensoes}</td>
                <td className="num">{l.fbk}</td>
                <td className="tl">{l.canto}</td>
                <td className="num">{l.emUso}</td>
                <td>
                  <Button variant="ghost" aria-label={`Editar bloco ${l.nome}`} onClick={() => {
                    const x = blocos.find((y) => y.id === l.id);
                    if (!x) return;
                    setFb(formDoBloco(x));
                    setEditB(l.id);
                  }}>editar</Button>
                  <Button variant="ghost" aria-label={`Remover bloco ${l.nome}`} onClick={() => aplicar('bloco.tipo', { id: l.id, remover: true }, () => {})}>×</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="row wrap" data-alv-editor-bloco>
        <TextField label="Bloco: nome" value={fb.nome} onChange={(v) => setFb({ ...fb, nome: v })} />
        <NumField label="Bloco: comprimento" unit="cm" width={90} value={fb.comprimentoCm} onChange={(v) => setFb({ ...fb, comprimentoCm: v })} />
        <NumField label="Bloco: largura" unit="cm" width={90} value={fb.larguraCm} onChange={(v) => setFb({ ...fb, larguraCm: v })} />
        <NumField label="Bloco: altura" unit="cm" width={90} value={fb.alturaCm} onChange={(v) => setFb({ ...fb, alturaCm: v })} />
        <NumField label="Bloco: fbk" unit="MPa" width={90} value={fb.fbk} onChange={(v) => setFb({ ...fb, fbk: v })} />
        <Select label="Bloco: peça de canto" value={fb.canto} options={[{ v: 'auto', label: 'automática' }, { v: 'sim', label: 'sempre' }, { v: 'nao', label: 'nunca' }]} onChange={(v) => setFb({ ...fb, canto: v })} />
        {editB === null ? (
          <Button onClick={criarOuSalvarBloco}>Criar bloco</Button>
        ) : (
          <>
            <Button onClick={criarOuSalvarBloco}>Salvar bloco</Button>
            <Button variant="ghost" onClick={cancelarBloco}>Cancelar edição do bloco</Button>
          </>
        )}
      </div>
      <Hint>Dimensões modulares com a junta (ex.: 40 × 15 × 20 cm). O meio bloco é metade do comprimento; a peça de canto é automática quando a largura não é metade do comprimento.</Hint>

      <h4>Tipos de alvenaria</h4>
      {linhasT.length > 0 && (
        <table className="data quadro" data-alv-tipos>
          <thead>
            <tr>
              <th className="tl">Tipo</th>
              <th className="tl">Modelo</th>
              <th className="tl">Bloco</th>
              <th className="num">γ (kN/m³)</th>
              <th className="num">fd (MPa)</th>
              <th className="num">ftd (MPa)</th>
              <th className="num">E (MPa)</th>
              <th className="num">G (MPa)</th>
              <th className="num">ν</th>
              <th className="tl">Armada</th>
              <th className="num">Paredes</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {linhasT.map((l) => (
              <tr key={l.id} data-id={l.id}>
                <td className="tl"><b>{l.nome}</b></td>
                <td className="tl">{l.modeloTexto}</td>
                <td className="tl">{l.bloco}</td>
                <td className="num">{l.gama}</td>
                <td className="num">{l.fd}</td>
                <td className="num">{l.ftd}</td>
                <td className="num">{l.E}</td>
                <td className="num">{l.G}</td>
                <td className="num">{l.nu}</td>
                <td className="tl">{l.armada}</td>
                <td className="num">{l.emUso}</td>
                <td>
                  <Button variant="ghost" aria-label={`Editar tipo ${l.nome}`} onClick={() => {
                    const t = tipos.find((y) => y.id === l.id);
                    if (!t) return;
                    setFt(formDoTipo(t));
                    setEditT(l.id);
                  }}>editar</Button>
                  <Button variant="ghost" aria-label={`Remover tipo ${l.nome}`} onClick={() => aplicar('alvenaria.tipo', { id: l.id, remover: true }, () => {})}>×</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="row wrap" data-alv-editor-tipo>
        <Select
          label="Tipo de alvenaria: modelo"
          value={ft.modelo}
          disabled={editT !== null}
          options={[{ v: 'blocos', label: 'blocos de concreto' }, { v: 'generica', label: 'alvenaria genérica' }]}
          onChange={(v) => setFt(formDoTipo(undefined, v, blocos[0]?.id ?? ''))}
        />
        <TextField label="Tipo de alvenaria: nome" value={ft.nome} onChange={(v) => setFt({ ...ft, nome: v })} />
        <NumField label="Tipo de alvenaria: peso específico" unit="kN/m³" width={96} value={ft.gama} onChange={(v) => setFt({ ...ft, gama: v })} />
        {ft.modelo === 'generica' && (
          <>
            <NumField label="Tipo de alvenaria: E" unit="MPa" width={96} value={ft.E ?? 0} onChange={(v) => setFt({ ...ft, E: v })} />
            <NumField label="Tipo de alvenaria: fd" unit="MPa" width={96} value={ft.fd ?? 0} onChange={(v) => setFt({ ...ft, fd: v })} />
            <OptNumField label="Tipo de alvenaria: ftd" unit="MPa" width={96} value={ft.ftd} onChange={(v) => setFt({ ...ft, ftd: v })} />
            <OptNumField label="Tipo de alvenaria: fvd" unit="MPa" width={96} value={ft.fvd} onChange={(v) => setFt({ ...ft, fvd: v })} />
          </>
        )}
        {ft.modelo === 'blocos' && (
          <>
            <Select
              label="Tipo de alvenaria: bloco"
              value={blocoEf}
              options={blocos.length ? blocos.map((x) => ({ v: x.id, label: x.nome })) : [{ v: '', label: '(crie um bloco)' }]}
              onChange={(v) => setFt({ ...ft, bloco: v })}
            />
            <OptNumField label="Tipo de alvenaria: argamassa" unit="MPa" value={ft.argamassa} onChange={(v) => setFt({ ...ft, argamassa: v })} />
            <OptNumField label="Tipo de alvenaria: graute" unit="MPa" value={ft.graute} onChange={(v) => setFt({ ...ft, graute: v })} />
            <Select label="Tipo de alvenaria: grauteamento" value={ft.grauteamento} options={GRAUTEAMENTOS} onChange={(v) => setFt({ ...ft, grauteamento: v })} />
            <OptNumField label="Tipo de alvenaria: prisma fpk" unit="MPa" value={ft.fpk} onChange={(v) => setFt({ ...ft, fpk: v })} />
            <OptNumField label="Tipo de alvenaria: E" unit="MPa" value={ft.E} onChange={(v) => setFt({ ...ft, E: v })} />
            <OptNumField label="Tipo de alvenaria: ftd" unit="MPa" value={ft.ftd} onChange={(v) => setFt({ ...ft, ftd: v })} />
            <Check label="Tipo de alvenaria: armada" checked={ft.armada} onChange={(v) => setFt({ ...ft, armada: v })} />
            {ft.armada && (
              <>
                <Select
                  label="Tipo de alvenaria: φ vertical"
                  value={ft.vPhi ?? 0}
                  options={[{ v: 0, label: 'calculada' }, ...BITOLAS_ALV_VERTICAL.map((p) => ({ v: p, label: String(p).replace('.', ',') }))]}
                  onChange={(v) => setFt({ ...ft, vPhi: v || undefined })}
                />
                <OptNumField label="Tipo de alvenaria: s vertical" unit="cm" value={ft.vSCm} onChange={(v) => setFt({ ...ft, vSCm: v })} />
                <Select
                  label="Tipo de alvenaria: φ horizontal"
                  value={ft.hPhi ?? 0}
                  options={[{ v: 0, label: 'calculada' }, ...BITOLAS_ALV_HORIZONTAL.map((p) => ({ v: p, label: String(p).replace('.', ',') }))]}
                  onChange={(v) => setFt({ ...ft, hPhi: v || undefined })}
                />
                <OptNumField label="Tipo de alvenaria: s horizontal" unit="cm" value={ft.hSCm} onChange={(v) => setFt({ ...ft, hSCm: v })} />
              </>
            )}
          </>
        )}
        <Check label="Tipo de alvenaria: considerar rigidez ao cisalhamento" checked={ft.considerarG} onChange={(v) => setFt({ ...ft, considerarG: v })} />
        {ft.considerarG && <OptNumField label="Tipo de alvenaria: G" unit="MPa" value={ft.G} onChange={(v) => setFt({ ...ft, G: v })} />}
        {editT === null ? (
          <Button onClick={criarOuSalvarTipo}>Criar tipo de alvenaria</Button>
        ) : (
          <>
            <Button onClick={criarOuSalvarTipo}>Salvar tipo de alvenaria</Button>
            <Button variant="ghost" onClick={cancelarTipo}>Cancelar edição do tipo</Button>
          </>
        )}
      </div>
      <Hint>Genérica: informe E e a resistência de cálculo à compressão fd; tração e cisalhamento ficam em % de fd pelas opções (alvenaria*) se vazios. Blocos: fd = 0,7·fpk/γm, com fpk do prisma ou estimado em 0,8·fbk; fórmulas da NBR 16868 a confirmar. Aço da armadura em Materiais.</Hint>

      <BibliotecaAlvenaria b={b} />
      {msg && <p className="hint bad" data-alv-msg>{msg}</p>}
    </Group>
  );
}

function BibliotecaAlvenaria({ b }: { b: BuildingModel }) {
  const { exec } = useBuilding();
  const [itens, setItens] = useState<LibraryItem[]>([]);
  const [sel, setSel] = useState('');
  const [nome, setNome] = useState('');
  const [msg2, setMsg2] = useState('');
  const recarregar = () => listLibrary().then((r) => setItens(r.items.filter((i) => i.kind === 'alvenaria'))).catch(() => {});
  useEffect(() => { recarregar(); }, []);
  const temAlgo = (b.blocos ?? []).length > 0 || (b.tiposAlvenaria ?? []).length > 0;

  const gravar = async () => {
    const lib: BibliotecaAlvenaria = bibliotecaDeAlvenaria(b);
    try {
      await saveToLibrary('alvenaria', nome.trim(), resumoBiblioteca(lib), lib);
      setNome('');
      recarregar();
      setMsg2(`Alvenaria “${nome.trim()}” gravada.`);
    } catch (e) { setMsg2((e as Error).message); }
  };
  const trazer = async () => {
    if (!sel) return;
    try {
      const e = await loadFromLibrary(sel);
      if (!e) { setMsg2('Alvenaria não encontrada na biblioteca.'); return; }
      const cmds = comandosDaBiblioteca(b, e.payload as BibliotecaAlvenaria);
      if (!cmds.length) { setMsg2('Nada novo: os blocos e tipos de mesmo nome já existem na obra.'); return; }
      const r = exec('lote', { comandos: cmds });
      setMsg2(r.ok ? `“${e.name}” trazida para a obra (${cmds.length} item(ns)).` : r.erros[0]?.mensagem ?? 'Não foi possível.');
    } catch (e) { setMsg2((e as Error).message); }
  };
  const excluir = async () => {
    if (!sel) return;
    await deleteFromLibrary(sel);
    setSel('');
    recarregar();
  };

  return (
    <details className="small" data-alv-biblioteca>
      <summary>Biblioteca de alvenaria</summary>
      <div className="row wrap">
        <TextField label="Nome na biblioteca de alvenaria" value={nome} onChange={setNome} />
        <Button disabled={!nome.trim() || !temAlgo} onClick={gravar}>Gravar alvenaria da obra</Button>
      </div>
      <div className="row wrap">
        <Select label="Alvenaria gravada" value={sel} options={[{ v: '', label: itens.length ? '— escolha —' : '(vazia)' }, ...itens.map((i) => ({ v: i.id, label: `${i.name} · ${i.summary}` }))]} onChange={setSel} />
        <Button disabled={!sel} onClick={trazer}>Trazer para a obra</Button>
        <Button variant="danger" disabled={!sel} onClick={excluir}>Excluir da biblioteca</Button>
      </div>
      {msg2 && <span className="hint" data-alv-msg-biblioteca>{msg2}</span>}
      <Hint>Grava os blocos e tipos de alvenaria da obra, sem ids. Ao trazer, blocos e tipos de mesmo nome que já existem na obra são pulados.</Hint>
    </details>
  );
}
