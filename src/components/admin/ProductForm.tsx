import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, ImagePlus, Link2, Sparkles, Trash2, Undo2, X } from 'lucide-react';
import type { Category, Highlight, Product, ProductInput, Store } from '../../types';
import { createProduct, deleteImage, updateProduct, uploadImage } from '../../services/catalog';
import { HIGHLIGHT_LABEL } from '../../lib/utils';
import { removeImageBackground } from '../../lib/backgroundRemoval';

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

interface ImageBackup {
  file: File | null;
  preview: string | null;
  externalImage: string;
  imageUrl: string | null;
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

  // Estados para remoção de fundo com IA
  const [removingBg, setRemovingBg] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [bgProgress, setBgProgress] = useState<string | null>(null);
  const [imageBackup, setImageBackup] = useState<ImageBackup | null>(null);

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
    setBgRemoved(false);
    setImageBackup(null);
    setFile(f);
  }

  function removeImage() {
    setFile(null);
    setPreview(null);
    setImageUrl(null);
    setExternalImage('');
    setBgRemoved(false);
    setImageBackup(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleRemoveBackground() {
    const currentSource = file || (externalImage.trim() ? externalImage.trim() : null) || preview || imageUrl;
    if (!currentSource) {
      setError('Adicione uma imagem antes de remover o fundo.');
      return;
    }

    setError(null);
    setRemovingBg(true);
    setBgProgress('Iniciando processamento...');

    // Salva backup para permitir desfazer
    setImageBackup({
      file,
      preview,
      externalImage,
      imageUrl,
    });

    try {
      const result = await removeImageBackground(currentSource, (_pct, msg) => {
        setBgProgress(msg);
      });

      setFile(result.file);
      setPreview(result.previewUrl);
      setExternalImage('');
      setImageUrl(null);
      setBgRemoved(true);
    } catch (err) {
      console.error('Erro ao remover fundo:', err);
      setError(err instanceof Error ? err.message : 'Falha ao remover o fundo da imagem.');
    } finally {
      setRemovingBg(false);
      setBgProgress(null);
    }
  }

  function handleUndoBgRemoval() {
    if (!imageBackup) return;
    setFile(imageBackup.file);
    setPreview(imageBackup.preview);
    setExternalImage(imageBackup.externalImage);
    setImageUrl(imageBackup.imageUrl);
    setBgRemoved(false);
    setImageBackup(null);
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

  const hasImage = Boolean(preview || externalImage || imageUrl);

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

          {/* ÁREA DE IMAGEM COM REMOÇÃO DE FUNDO */}
          <div className="field">
            <label>Imagem do Produto</label>
            <div className="uploader">
              <div 
                className="preview"
                style={{
                  backgroundImage: (preview || externalImage) ? 'repeating-conic-gradient(#e5e7eb 0 90deg, #ffffff 0 180deg)' : undefined,
                  backgroundSize: '14px 14px',
                }}
              >
                {preview || externalImage ? (
                  <img src={preview || externalImage} alt="Prévia" />
                ) : (
                  <ImagePlus size={24} />
                )}
              </div>
              <div className="dropzone">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="button" className="btn btn-sm btn-soft" onClick={() => fileRef.current?.click()} disabled={removingBg}>
                    <ImagePlus size={14} /> Enviar do Computador
                  </button>

                  {hasImage && !bgRemoved && (
                    <button 
                      type="button" 
                      className="btn btn-sm"
                      style={{ 
                        background: '#6b21a8', 
                        color: '#fff', 
                        borderColor: '#6b21a8',
                        boxShadow: '0 1px 3px rgba(107,33,168,0.25)' 
                      }}
                      onClick={handleRemoveBackground}
                      disabled={removingBg || saving}
                      title="Usa inteligência artificial para deixar a foto sem fundo"
                    >
                      {removingBg ? (
                        <>
                          <span className="spinner" style={{ color: '#fff', width: 14, height: 14 }} />
                          <span>Removendo...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          <span>Remover Fundo (IA)</span>
                        </>
                      )}
                    </button>
                  )}

                  {bgRemoved && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span className="badge badge-discount" style={{ background: '#10b981', color: '#fff', padding: '5px 8px', borderRadius: 6 }}>
                        <Check size={12} /> Fundo Removido
                      </span>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-ghost" 
                        onClick={handleUndoBgRemoval}
                        title="Restaurar imagem original com fundo"
                      >
                        <Undo2 size={13} /> Desfazer
                      </button>
                    </div>
                  )}

                  {hasImage && (
                    <button type="button" className="btn btn-sm btn-danger" onClick={removeImage} disabled={removingBg}>
                      <Trash2 size={14} /> Remover
                    </button>
                  )}
                </div>

                {bgProgress && (
                  <div style={{ fontSize: '0.8rem', color: '#6b21a8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span className="spinner" style={{ color: '#6b21a8', width: 12, height: 12 }} />
                    <span>{bgProgress}</span>
                  </div>
                )}

                <input
                  className="input"
                  style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                  placeholder="...ou cole a URL da imagem da Shopee / Mercado Livre"
                  value={externalImage}
                  onChange={(e) => { 
                    setExternalImage(e.target.value); 
                    setFile(null); 
                    setPreview(null); 
                    setBgRemoved(false);
                    setImageBackup(null);
                  }}
                  disabled={removingBg}
                />
                <span className="hint">
                  Dica: envie um arquivo ou cole um link. O botão <strong>Remover Fundo</strong> deixa a imagem recortada transparente para salvar!
                </span>
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
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving || removingBg}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving || removingBg}>
              {saving ? <span className="spinner" style={{ color: '#fff' }} /> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
