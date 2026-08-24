/** Erros de domínio, com mensagens já prontas para o usuário final. */

export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string = 'app_error',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Você não tem permissão para esta ação.') {
    super(message, 'forbidden');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Não encontramos o que você procura.') {
    super(message, 'not_found');
  }
}

/** Traduz erros do Postgres/Supabase em algo compreensível, sem vazar stack trace. */
export function friendlyMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;

  const raw =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : '';
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case '23505':
      return 'Já existe um registro com esses dados.';
    case '23503':
      return 'Este item está vinculado a outro registro e não pode ser removido.';
    case '23514':
      return 'Algum valor informado está fora do permitido. Revise os campos.';
    case '42501':
      return 'Você não tem permissão para esta ação nesta viagem.';
    case 'PGRST116':
      return 'Registro não encontrado.';
    default:
      break;
  }

  if (/row-level security/i.test(raw)) return 'Você não tem permissão para esta ação nesta viagem.';
  if (/Invalid login credentials/i.test(raw)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(raw)) return 'Confirme seu e-mail antes de entrar.';
  if (/User already registered/i.test(raw)) return 'Este e-mail já possui cadastro.';
  if (/Password should be at least/i.test(raw)) return 'A senha precisa ter ao menos 8 caracteres.';
  if (/rate limit|too many requests/i.test(raw)) return 'Muitas tentativas. Aguarde um instante.';
  if (raw.startsWith('É necessário') || raw.startsWith('Este convite') || raw.startsWith('Apenas o')) {
    return raw;
  }

  return 'Não foi possível concluir a operação. Tente novamente.';
}

/** Loga no servidor com contexto e devolve mensagem segura para o cliente. */
export function logAndFriendly(context: string, error: unknown): string {
  console.error(`[${context}]`, error);
  return friendlyMessage(error);
}
