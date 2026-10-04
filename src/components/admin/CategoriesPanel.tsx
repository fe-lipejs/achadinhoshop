import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Category, Product } from '../../types';
import { createCategory, deleteCategory } from '../../services/catalog';

interface Props {
  categories: Category[];
  products: Product[];
  onChange: (categories: Category[]) => void;
  notify: (message: string) => void;
}

export function CategoriesPanel({ categories, products, onChange, notify }: Props) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [order, setOrder] = useState('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createCategory(name.trim(), emoji.trim(), Number(order) || 0);
      onChange([...categories, created].sort((a, b) => a.sort_order - b.sort_order));
      setName('');
      setEmoji('');
      setOrder('0');
      notify('Categoria criada');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar categoria.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(category: Category) {
    const count = products.filter((p) => p.category_id === category.id).length;
    const msg = count
      ? `Excluir "${category.name}"? ${count} produto(s) ficarão sem categoria.`
      : `Excluir "${category.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      await deleteCategory(category.id);
      onChange(categories.filter((c) => c.id !== category.id));
      notify('Categoria excluída');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.');
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Categorias</h2>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      <form className="cat-form" onSubmit={handleAdd}>
        <input
          id="cat-emoji"
          className="input"
          placeholder="🏠"
          value={emoji}
          maxLength={4}
          onChange={(e) => setEmoji(e.target.value)}
          aria-label="Emoji"
        />
        <input
          id="cat-name"
          className="input"
          placeholder="Nome da categoria (ex: Casa, Beleza, Tech)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nome"
        />
        <input
          id="cat-order"
          className="input order"
          type="number"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          aria-label="Ordem"
          title="Ordem"
        />
        <button id="cat-add" type="submit" className="btn btn-primary" disabled={busy}>
          <Plus size={16} /> Adicionar
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="hint">Nenhuma categoria ainda.</p>
      ) : (
        <div className="admin-list">
          {categories.map((c) => (
            <div key={c.id} className="admin-row" style={{ gridTemplateColumns: '40px 1fr auto' }}>
              <span style={{ fontSize: '1.4rem', textAlign: 'center' }}>{c.emoji || '🏷️'}</span>
              <div className="meta">
                <strong>{c.name}</strong>
                <div className="sub">
                  {products.filter((p) => p.category_id === c.id).length} produto(s) · ordem {c.sort_order}
                </div>
              </div>
              <div className="row-actions" style={{ gridColumn: 'auto' }}>
                <button
                  type="button"
                  id={`cat-delete-${c.id}`}
                  className="btn btn-icon btn-danger"
                  onClick={() => handleDelete(c)}
                  aria-label={`Excluir ${c.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
