import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ImagePlus, Link2, Trash2, X } from 'lucide-react';
import type { Category, Highlight, Product, ProductInput, Store } from '../../types';
import { createProduct, deleteImage, updateProduct, uploadImage } from '../../services/catalog';
import { HIGHLIGHT_LABEL } from '../../lib/utils';

interface Props {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: (product: Product) => void;
}

const MAX_SIZE_MB = 5;

function toNumber(value: string): number | null {
  const raw = value.trim().replace(/[R$\s]/g, '');
  if (!raw) return null;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function toInput(value: number | null): string {
  return value === null || value === undefined ? '' : String(value).replace('.', ',');
}

function detectStore(url: string): Store | null {
  const u = url.toLowerCase();
  if (u.includes('shopee') || u.includes('shp.ee')) return 'shopee';
  if (u.includes('mercadolivre') || u.includes('mercadolibre') || u.includes('meli.la') || u.includes('mlb'))
    return 'mercadolivre';
  return null;
}

export function ProductForm({ product, categories, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(product?.title ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [affiliateUrl, setAffiliateUrl] = useState(product?.affiliate_url ?? '');
  const [store, setStore] = useState<Store>(product?.store ?? 'shopee');
  const [price, setPrice] = useState(toInput(product?.price ?? null));
  const [oldPrice, setOldPrice] = useState(toInput(product?.old_price ?? null));
  const [categoryId, setCategoryId] = useState(product?.category_id ?? '');
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [active, setActive] = useState(product?.active ?? true);
  const [sortOrder, setSortOrder] = useState(String(product?.sort_order ?? 0));
  
  // Novos campos visuais
  const [highlight, setHighlight] = useState<Highlight | ''>(product?.highlight ?? '');
  const [rating, setRating] = useState(toInput(product?.rating ?? null));
  const [soldLabel, setSoldLabel] = useState(product?.sold_label ?? '');
  const [freeShipping, setFreeShipping] = useState(product?.free_shipping ?? false);

  const [imageUrl, setImageUrl] = useState<string | null>(product?.image_url ?? null);
  const [externalImage, setExternalImage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(product?.image_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleUrlChange(value: string) {
    setAffiliateUrl(value);
    const detected = detectStore(value);
    if (detected) setStore(detected);
  }

  function handleFile(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('Selecione uma imagem.');
    if (f.size > MAX_SIZE_MB * 1024 * 1024) return setError(`Imagem muito grande (máx. ${MAX_SIZE_MB} MB).`);
    setError(null);
    setExternalImage('');
    setFile(f);
  }

  function removeImage() {
    setFile(null);
    setPreview(null);
    setImageUrl(null);
    setExternalImage('');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError('Informe o nome do produto.');
    if (!/^https?:\/\//i.test(affiliateUrl.trim())) return setError('Link inválido (https://...).');

    setSaving(true);
    try {
      let finalImage = imageUrl;
      if (file) {
        finalImage = await uploadImage(file);
      } else if (externalImage.trim()) {
        finalImage = externalImage.trim();
      }

      const parsedRating = toNumber(rating);

      const input: ProductInput = {
        title: title.trim(),
        description: description.trim() || null,
        affiliate_url: affiliateUrl.trim(),
        store,
        price: toNumber(price),
        old_price: toNumber(oldPrice),
        category_id: categoryId || null,
        featured,
        active,
        sort_order: Number(sortOrder) || 0,
        image_url: finalImage,
        highlight: highlight ? highlight as Highlight : null,
        rating: parsedRating,
        sold_label: soldLabel.trim() || null,
        free_shipping: freeShipping,
      };

      const saved = product ? await updateProduct(product.id, input) : await createProduct(input);

      if (product?.image_url && product.image_url !== finalImage) {
        await deleteImage(product.image_url);
      }
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal form-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        <form className="form" onSubmit={handleSubmit}>
          <h2>{product ? `Editar #${product.code}` : 'Novo produto'}</h2>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label htmlFor="pf-url">Link de afiliado *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="pf-url"
                className="input"
                placeholder="https://s.shopee.com.br/... ou https://mercadolivre.com/sec/..."
                value={affiliateUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                style={{ paddingLeft: 38 }}
                required
              />
              <Link2 size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            </div>
            <span className="hint">A loja é detectada automaticamente.</span>
          </div>

          <div className="store-picker">
            <button type="button" className={`store-option shopee ${store === 'shopee' ? 'active' : ''}`} onClick={() => setStore('shopee')}>
              Shopee
            </button>
            <button type="button" className={`store-option mercadolivre ${store === 'mercadolivre' ? 'active' : ''}`} onClick={() => setStore('mercadolivre')}>
              Mercado Livre
            </button>
          </div>

          <div className="field">
            <label htmlFor="pf-title">Nome do produto *</label>
            <input id="pf-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="field">
            <label>Imagem</label>
            <div className="uploader">
              <div className="preview">
                {preview || externalImage ? <img src={preview || externalImage} alt="Prévia" /> : <ImagePlus size={24} />}
              </div>
              <div className="dropzone">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-sm btn-soft" onClick={() => fileRef.current?.click()}>
                    <ImagePlus size={14} /> Enviar
                  </button>
                  {(preview || externalImage) && (
                    <button type="button" className="btn btn-sm btn-danger" onClick={removeImage}>
                      <Trash2 size={14} /> Remover
                    </button>
                  )}
                </div>
                <input
                  className="input"
                  style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                  placeholder="...ou cole a URL da imagem"
                  value={externalImage}
                  onChange={(e) => { setExternalImage(e.target.value); setFile(null); setPreview(null); }}
                />
              </div>
            </div>
          </div>

          <div className="form-section">Valores e Detalhes</div>

          <div className="form-grid cols-3">
            <div className="field">
              <label htmlFor="pf-price">Preço (R$)</label>
              <input id="pf-price" className="input" inputMode="decimal" placeholder="49,90" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pf-old-price">De (R$)</label>
              <input id="pf-old-price" className="input" inputMode="decimal" placeholder="89,90" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pf-rating">Nota (0 a 5)</label>
              <input id="pf-rating" className="input" inputMode="decimal" placeholder="4.8" value={rating} onChange={(e) => setRating(e.target.value)} />
            </div>
          </div>

          <div className="form-grid cols-2">
            <div className="field">
              <label htmlFor="pf-highlight">Selo de destaque</label>
              <select id="pf-highlight" className="select" value={highlight} onChange={(e) => setHighlight(e.target.value as Highlight | '')}>
                <option value="">Nenhum</option>
                {Object.entries(HIGHLIGHT_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pf-sold">Vendas (ex: +10mil)</label>
              <input id="pf-sold" className="input" placeholder="+1000 vendidos" value={soldLabel} onChange={(e) => setSoldLabel(e.target.value)} />
            </div>
          </div>

          <div className="form-grid cols-2">
            <div className="field">
              <label htmlFor="pf-category">Categoria</label>
              <select id="pf-category" className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ''}{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pf-order">Ordem</label>
              <input id="pf-order" className="input" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="pf-description">Descrição longa (opcional)</label>
            <textarea id="pf-description" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="toggles">
            <label className="toggle">
              <input type="checkbox" checked={freeShipping} onChange={(e) => setFreeShipping(e.target.checked)} />
              <span className="track" /> Frete grátis
            </label>
            <label className="toggle">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
              <span className="track" /> Fixo no topo
            </label>
            <label className="toggle">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              <span className="track" /> Visível
            </label>
          </div>

          <div className="form-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ color: '#fff' }} /> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
