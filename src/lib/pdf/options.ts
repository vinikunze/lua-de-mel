/**
 * Opções do PDF.
 * Viajam pela URL para que o documento gerado seja um link compartilhável e
 * reimprimível com exatamente as mesmas seções.
 */

export type PdfMode = 'resumido' | 'completo';

export interface PdfOptions {
  mode: PdfMode;
  finance: boolean;
  documents: boolean;
  maps: boolean;
  contacts: boolean;
  checklist: boolean;
  notes: boolean;
  qrCodes: boolean;
}

export const PDF_SECTIONS = [
  { key: 'finance', label: 'Financeiro', hint: 'Valores, pagamentos e orçamento.' },
  { key: 'documents', label: 'Documentos', hint: 'Lista dos arquivos anexados à viagem.' },
  { key: 'maps', label: 'Mapas', hint: 'Mapa estático de cada dia com as paradas numeradas.' },
  { key: 'contacts', label: 'Contatos', hint: 'Telefones e endereços importantes.' },
  { key: 'checklist', label: 'Checklist', hint: 'O que ainda falta resolver.' },
  { key: 'notes', label: 'Observações', hint: 'Anotações da viagem e dos eventos.' },
  { key: 'qrCodes', label: 'QR Codes', hint: 'Para abrir rotas e reservas pelo celular.' },
] as const satisfies ReadonlyArray<{ key: keyof Omit<PdfOptions, 'mode'>; label: string; hint: string }>;

/** Padrões de cada modo — o resumido é enxuto por natureza. */
export function defaultOptions(mode: PdfMode): PdfOptions {
  if (mode === 'resumido') {
    return {
      mode,
      finance: false,
      documents: false,
      maps: true,
      contacts: true,
      checklist: false,
      notes: false,
      qrCodes: true,
    };
  }
  return {
    mode,
    finance: true,
    documents: true,
    maps: true,
    contacts: true,
    checklist: true,
    notes: true,
    qrCodes: true,
  };
}

export function optionsFromParams(params: Record<string, string | string[] | undefined>): PdfOptions {
  const mode: PdfMode = params.modo === 'completo' ? 'completo' : 'resumido';
  const base = defaultOptions(mode);
  const read = (key: string, fallback: boolean) => {
    const value = params[key];
    if (value === undefined) return fallback;
    return value === '1' || value === 'true';
  };

  return {
    mode,
    finance: read('financeiro', base.finance),
    documents: read('documentos', base.documents),
    maps: read('mapas', base.maps),
    contacts: read('contatos', base.contacts),
    checklist: read('checklist', base.checklist),
    notes: read('observacoes', base.notes),
    qrCodes: read('qrcodes', base.qrCodes),
  };
}

export function optionsToQuery(options: PdfOptions): string {
  const params = new URLSearchParams({
    modo: options.mode,
    financeiro: options.finance ? '1' : '0',
    documentos: options.documents ? '1' : '0',
    mapas: options.maps ? '1' : '0',
    contatos: options.contacts ? '1' : '0',
    checklist: options.checklist ? '1' : '0',
    observacoes: options.notes ? '1' : '0',
    qrcodes: options.qrCodes ? '1' : '0',
  });
  return params.toString();
}
