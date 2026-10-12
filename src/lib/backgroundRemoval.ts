import { removeBackground as imglyRemoveBackground, type Config } from '@imgly/background-removal';

/**
 * Baixa uma imagem externa contornando bloqueios de CORS quando necessário.
 */
async function fetchImageAsBlob(url: string): Promise<Blob> {
  // Se for data URL ou blob URL, fetch direto sempre funciona sem CORS
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    const res = await fetch(url);
    return await res.blob();
  }

  // 1. Tentar direto
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      return await res.blob();
    }
  } catch {
    // Bloqueado por CORS do servidor de origem
  }

  // 2. Fallback via proxy weserv.nl com suporte a CORS
  try {
    const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      return await res.blob();
    }
  } catch {
    // Tenta fallback seguinte
  }

  // 3. Fallback via corsproxy.io
  const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  const res = await fetch(corsProxyUrl);
  if (!res.ok) {
    throw new Error('Não foi possível carregar a imagem externa. Verifique se o link está acessível ou envie a imagem do seu computador.');
  }
  return await res.blob();
}

/**
 * Remove o fundo de uma imagem usando inteligência artificial no navegador.
 * Aceita um File, Blob ou URL (local ou da internet).
 */
export async function removeImageBackground(
  source: File | Blob | string,
  onProgress?: (percent: number, message: string) => void
): Promise<{ file: File; previewUrl: string }> {
  let input: Blob | File;

  if (typeof source === 'string') {
    if (onProgress) onProgress(10, 'Carregando imagem...');
    input = await fetchImageAsBlob(source);
  } else {
    input = source;
  }

  const config: Config = {
    progress: (key: string, current: number, total: number) => {
      const pct = total > 0 ? Math.round((current / total) * 100) : 0;
      const stepName = key.includes('model') ? 'Carregando IA' : 'Removendo fundo';
      if (onProgress) {
        onProgress(pct, `${stepName}: ${pct}%`);
      }
    },
  };

  const resultBlob = await imglyRemoveBackground(input, config);
  const file = new File([resultBlob], `produto-${Date.now()}-sem-fundo.png`, { type: 'image/png' });
  const previewUrl = URL.createObjectURL(resultBlob);

  return { file, previewUrl };
}
