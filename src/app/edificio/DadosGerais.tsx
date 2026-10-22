// Dados gerais da obra (L1): nome, descrição, cidade, fundação, norma e perfil de padrões. O mesmo corpo serve ao painel e à janela.
import { useBuilding } from './store';
import { Button, Hint, Modal, NumField, Select, Seg, Spacer, TextField } from '../ui';
import { ORIGEM_ROTULO, type BuildingModel, type Norma } from '../../core/building/types';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');

export function DadosGeraisCorpo({ b }: { b: BuildingModel }) {
  const exec = useBuilding((s) => s.exec);
  const desc = b.obra.descricao ?? [];
  const aoMudarDescricao = (i: 0 | 1, v: string) => {
    const linhas = [desc[0] ?? '', desc[1] ?? ''];
    linhas[i] = v;
    exec('obra.definir', { descricao: linhas });
  };
  return (
    <>
      <div className="row"><TextField label="Nome da obra" value={b.obra.nome} onChange={(v) => exec('obra.definir', { nome: v })} /></div>
      <div className="row"><TextField label="Descrição (linha 1)" value={desc[0] ?? ''} onChange={(v) => aoMudarDescricao(0, v)} /><TextField label="Descrição (linha 2)" value={desc[1] ?? ''} onChange={(v) => aoMudarDescricao(1, v)} /></div>
      <div className="row wrap">
        <TextField label="Cidade" value={b.obra.cidade ?? ''} onChange={(v) => exec('obra.definir', { cidade: v })} />
        <NumField label="Fundação abaixo do mais baixo" unit="m" width={150} value={b.obra.profundidadeFundacao} onChange={(v) => exec('obra.definir', { profundidadeFundacao: v })} />
      </div>
      <div className="row wrap">
        <NumField label="fck" unit="MPa" width={92} value={b.norma.fck} onChange={(v) => exec('norma.definir', { fck: v })} />
        <Select label="Aço" value={b.norma.aco} options={[{ v: 'CA-50', label: 'CA-50' }, { v: 'CA-60', label: 'CA-60' }]} onChange={(v) => exec('norma.definir', { aco: v })} />
        <Select label="CAA" value={b.norma.caa} options={(['I', 'II', 'III', 'IV'] as Norma['caa'][]).map((v) => ({ v, label: v }))} onChange={(v) => exec('norma.definir', { caa: v })} />
      </div>
      <div className="row">
        <Seg
          value={b.perfilOpcoes ?? 'sistema'}
          options={[{ v: 'sistema', label: 'Padrão do sistema' }, { v: 'nbr', label: 'Padrão NBR 6118' }]}
          onChange={(v) => exec('opcoes.definir', { perfil: v })}
        />
      </div>
      <Hint>Cobrimentos (cm): laje {fmt(b.norma.cobrimento.laje, 1)} · viga {fmt(b.norma.cobrimento.viga, 1)} · pilar {fmt(b.norma.cobrimento.pilar, 1)} (NBR 6118, Tabela 7.2).</Hint>
      <Hint>Origem do lançamento: {ORIGEM_ROTULO[b.obra.origem ?? 'vazio']}.</Hint>
    </>
  );
}

export function DadosGeraisJanela({ b, onClose }: { b: BuildingModel; onClose(): void }) {
  return (
    <Modal titulo="Dados gerais da obra" onClose={onClose}>
      <Hint>Confira as normas e os materiais da obra recém-criada. Tudo continua editável no painel Obra; materiais por elemento ficam no grupo Materiais.</Hint>
      <DadosGeraisCorpo b={b} />
      <div className="row"><Spacer /><Button variant="primary" onClick={onClose}>Concluir</Button></div>
    </Modal>
  );
}
