import 'server-only';
import QRCode from 'qrcode';

/**
 * QR Codes do PDF.
 *
 * Gerados como SVG embutido (data URI): funcionam impressos, não dependem de
 * internet no momento da leitura do documento e não exigem nenhum serviço externo.
 */
export async function qrCodeDataUrl(value: string, size = 96): Promise<string | null> {
  if (!value) return null;
  try {
    const svg = await QRCode.toString(value, {
      type: 'svg',
      margin: 0,
      width: size,
      errorCorrectionLevel: 'M',
      color: { dark: '#111111', light: '#ffffff' },
    });
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  } catch (error) {
    console.error('[qrCode]', error);
    return null;
  }
}

/** Gera vários QR Codes de uma vez, mantendo a ordem de entrada. */
export async function qrCodeBatch(
  items: Array<{ key: string; value: string | null | undefined }>,
  size = 96,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  await Promise.all(
    items.map(async ({ key, value }) => {
      if (!value) return;
      const dataUrl = await qrCodeDataUrl(value, size);
      if (dataUrl) result[key] = dataUrl;
    }),
  );
  return result;
}
