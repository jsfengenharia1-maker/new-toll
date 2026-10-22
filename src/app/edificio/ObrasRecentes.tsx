// Janela "Obras recentes" (L1): busca por nome ou descrição sobre a obra atual, a biblioteca, as últimas
// obras abertas, os exemplos e o histórico completo.
import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { deleteFromLibrary, listLibrary, loadFromLibrary, salvarEdificioNaBiblioteca, type LibraryItem } from '../storage';
import { EXEMPLOS_OBRA } from '../../core/building/exemplos';
import { lerEdificio } from '../../core/building/file';
import { ORIGEM_ROTULO } from '../../core/building/types';
import { Button, Group, Hint, Modal, Note, TextField } from '../ui';
import { buscarRecentes, limparRecentes, lerRecentes, registrarRecente, ultimasObras, type ObraRecente } from './recentes';
import { edificioParaArquivo, useBuilding } from './store';

export function ObrasRecentes({ onClose, onAberta }: { onClose(): void; onAberta(): void }) {
  const [termo, setTermo] = useState('');
  const [lista, setLista] = useState<ObraRecente[]>(() => lerRecentes());
  const [itens, setItens] = useState<LibraryItem[] | null>(null);
  const [aviso, setAviso] = useState('');
  const { carregar, novaObraExemplo } = useBuilding();
  const nome = useBuilding((s) => s.sessao.modelo.obra.nome);

  const recarregar = async () => {
    try {
      const r = await listLibrary();
      setItens(r.items.filter((i) => i.kind === 'edificio'));
    } catch {
      setItens([]);
    }
  };

  useEffect(() => {
    void recarregar();
  }, []);

  const casa = (x: { nome: string; descricao: string }) => {
    const o: ObraRecente = { nome: x.nome, descricao: x.descricao, origem: 'biblioteca', pavimentos: 0, abertaEm: '' };
    return buscarRecentes([o], termo).length > 0;
  };
  const bibliotecaFiltrada = (itens ?? []).filter((i) => casa({ nome: i.name, descricao: i.summary }));
  const exemplosFiltrados = EXEMPLOS_OBRA.filter((e) => casa({ nome: e.nome, descricao: e.descricao.join(' ') }));
  const historico = buscarRecentes(lista, termo);

  const guardarAtual = async () => {
    const f = edificioParaArquivo();
    if (!f) {
      useStore.getState().set({ message: 'Não há obra para guardar.' });
      return;
    }
    const o = f.building.obra;
    const descricao = (o.descricao ?? []).join(' · ');
    const r = await salvarEdificioNaBiblioteca(o.nome, descricao, f);
    if (r.ok) {
      registrarRecente({ nome: o.nome, descricao, origem: 'biblioteca', pavimentos: f.building.pavimentos.length });
      setLista(lerRecentes());
      setAviso('');
      useStore.getState().set({ message: 'Obra guardada na biblioteca.' });
      await recarregar();
    } else {
      useStore.getState().set({ message: r.aviso });
      setAviso(r.aviso);
    }
  };

  const abrirBiblioteca = async (id: string) => {
    const e = await loadFromLibrary(id);
    const f = e ? lerEdificio(e.payload) : null;
    if (f) {
      carregar(f);
      setLista(lerRecentes());
      onAberta();
    }
  };

  const excluirBiblioteca = async (id: string) => {
    await deleteFromLibrary(id);
    await recarregar();
  };

  return (
    <Modal titulo="Obras recentes" onClose={onClose} larga>
      <TextField label="Buscar obra" value={termo} onChange={setTermo} />
      <Hint>Procura palavras no nome ou na descrição da obra.</Hint>

      <h4>Obra atual</h4>
      <div className="row wrap">
        <span>{nome}</span>
        <Button onClick={() => void guardarAtual()}>Guardar na biblioteca</Button>
      </div>
      {aviso && <Note tone="bad">{aviso}</Note>}

      <h4>Obras da biblioteca</h4>
      <div className="recentes">
        {bibliotecaFiltrada.map((i) => (
          <div className="recente" key={i.id}>
            <div className="recente-nome">{i.name}</div>
            <div className="recente-meta">{`${new Date(i.savedAt).toLocaleDateString('pt-BR')} · ${i.summary || 'sem descrição'}`}</div>
            <Button aria-label={`Abrir ${i.name}`} onClick={() => void abrirBiblioteca(i.id)}>Abrir</Button>
            <Button variant="danger" aria-label={`Excluir ${i.name}`} onClick={() => void excluirBiblioteca(i.id)}>Excluir</Button>
          </div>
        ))}
      </div>
      {!bibliotecaFiltrada.length && <Hint>{termo ? 'Nenhuma obra encontrada.' : 'Nenhuma obra na biblioteca ainda.'}</Hint>}

      <h4>Últimas obras abertas</h4>
      <div className="recentes">
        {ultimasObras(buscarRecentes(lista, termo)).map((o) => (
          <div className="recente" key={`${o.abertaEm}-${o.nome}`}>
            <div className="recente-nome">{o.nome}</div>
            <div className="recente-meta">
              {`${ORIGEM_ROTULO[o.origem as keyof typeof ORIGEM_ROTULO] ?? (o.origem === 'arquivo' ? 'Arquivo do computador' : 'Biblioteca')} · ${new Date(o.abertaEm).toLocaleString('pt-BR')} · ${o.pavimentos} pavimento(s)`}
            </div>
            {o.descricao && <div className="recente-meta">{o.descricao}</div>}
          </div>
        ))}
      </div>
      <Hint>Só os dados da abertura ficam registrados. Reabra uma obra pelo Arquivo › Abrir trabalho do computador ou pela biblioteca acima.</Hint>

      <h4>Obras de exemplo</h4>
      <div className="recentes">
        {exemplosFiltrados.map((e) => (
          <div className="recente" key={e.id}>
            <div className="recente-nome">{e.nome}</div>
            <div className="recente-meta">{e.descricao.join(' · ')}</div>
            <Button
              aria-label={`Abrir exemplo ${e.nome}`}
              onClick={() => {
                novaObraExemplo(e.id);
                setLista(lerRecentes());
                onAberta();
              }}
            >
              Abrir exemplo
            </Button>
          </div>
        ))}
      </div>

      <Group title="Histórico completo" open={false}>
        {historico.length ? (
          <table className="data">
            <thead>
              <tr>
                <th>Data</th>
                <th>Obra</th>
                <th>Descrição</th>
                <th>Origem</th>
                <th>Pavimentos</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((o) => (
                <tr key={`${o.abertaEm}-${o.nome}`}>
                  <td>{new Date(o.abertaEm).toLocaleString('pt-BR')}</td>
                  <td>{o.nome}</td>
                  <td>{o.descricao}</td>
                  <td>{ORIGEM_ROTULO[o.origem as keyof typeof ORIGEM_ROTULO] ?? (o.origem === 'arquivo' ? 'Arquivo do computador' : 'Biblioteca')}</td>
                  <td>{o.pavimentos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Hint>Nenhuma abertura registrada.</Hint>
        )}
        <Button variant="ghost" onClick={() => { limparRecentes(); setLista([]); }}>Limpar histórico</Button>
      </Group>
    </Modal>
  );
}
