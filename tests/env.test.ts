import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * `appUrl()` monta a base dos links de confirmação de e-mail e de convite.
 * Um valor sem protocolo geraria endereços quebrados, então ele precisa
 * tolerar as formas que os painéis de hospedagem mostram.
 */
async function appUrlWith(env: Record<string, string | undefined>): Promise<string> {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const { appUrl } = await import('@/lib/env');
  return appUrl();
}

const KEYS = ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_VERCEL_URL', 'VERCEL_URL'];

afterEach(() => {
  for (const key of KEYS) delete process.env[key];
  vi.resetModules();
});

describe('URL pública da aplicação', () => {
  const limpo = { NEXT_PUBLIC_APP_URL: undefined, NEXT_PUBLIC_VERCEL_URL: undefined, VERCEL_URL: undefined };

  it('completa o protocolo quando o domínio vem sem ele', async () => {
    expect(await appUrlWith({ ...limpo, NEXT_PUBLIC_APP_URL: 'lua-de-mel-chi.vercel.app' })).toBe(
      'https://lua-de-mel-chi.vercel.app',
    );
  });

  it('mantém o protocolo quando já foi informado', async () => {
    expect(await appUrlWith({ ...limpo, NEXT_PUBLIC_APP_URL: 'https://minha-viagem.com.br' })).toBe(
      'https://minha-viagem.com.br',
    );
  });

  it('remove a barra final', async () => {
    expect(await appUrlWith({ ...limpo, NEXT_PUBLIC_APP_URL: 'https://minha-viagem.com.br/' })).toBe(
      'https://minha-viagem.com.br',
    );
  });

  it('ignora espaços em volta', async () => {
    expect(await appUrlWith({ ...limpo, NEXT_PUBLIC_APP_URL: '  exemplo.vercel.app  ' })).toBe(
      'https://exemplo.vercel.app',
    );
  });

  it('usa http em localhost, que não tem certificado', async () => {
    expect(await appUrlWith({ ...limpo, NEXT_PUBLIC_APP_URL: 'localhost:3000' })).toBe(
      'http://localhost:3000',
    );
  });

  it('cai para a URL do deploy da Vercel quando não há valor explícito', async () => {
    expect(await appUrlWith({ ...limpo, VERCEL_URL: 'lua-de-mel-abc123.vercel.app' })).toBe(
      'https://lua-de-mel-abc123.vercel.app',
    );
  });

  it('usa localhost quando nada está definido', async () => {
    expect(await appUrlWith(limpo)).toBe('http://localhost:3000');
  });
});
