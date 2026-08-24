import 'server-only';
import { appUrl } from '@/lib/env';

/** Link do convite. Fica fora do arquivo de actions porque não é assíncrono. */
export function inviteUrl(token: string): string {
  return `${appUrl()}/convite/${token}`;
}
