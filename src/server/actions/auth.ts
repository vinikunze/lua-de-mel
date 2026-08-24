'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { appUrl } from '@/lib/env';
import { friendlyMessage } from '@/lib/errors';
import { failure, success, zodFailure, type ActionResult } from '@/server/action-result';
import {
  forgotPasswordSchema, profileSchema, resetPasswordSchema, signInSchema, signUpSchema,
} from '@/lib/validators/misc';

function formValues(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function signInAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signInSchema.safeParse(formValues(formData));
  if (!parsed.success) return zodFailure(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return failure(friendlyMessage(error));

  const next = String(formData.get('proximo') ?? '') || '/';
  const redirectTo = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  revalidatePath('/', 'layout');
  return success({ redirectTo });
}

export async function signUpAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = signUpSchema.safeParse(formValues(formData));
  if (!parsed.success) return zodFailure(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${appUrl()}/auth/callback`,
    },
  });

  if (error) return failure(friendlyMessage(error));

  // Sem sessão significa que o projeto exige confirmação por e-mail.
  const needsConfirmation = !data.session;
  if (!needsConfirmation) revalidatePath('/', 'layout');
  return success({ needsConfirmation });
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/entrar');
}

export async function requestPasswordResetAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ sent: true }>> {
  const parsed = forgotPasswordSchema.safeParse(formValues(formData));
  if (!parsed.success) return zodFailure(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl()}/auth/callback?proximo=/nova-senha`,
  });
  // Não revelamos se o e-mail existe — resposta idêntica nos dois casos.
  if (error && !/rate limit/i.test(error.message)) {
    console.error('[requestPasswordReset]', error);
  }
  if (error && /rate limit/i.test(error.message)) return failure(friendlyMessage(error));
  return success({ sent: true });
}

export async function updatePasswordAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ updated: true }>> {
  const parsed = resetPasswordSchema.safeParse(formValues(formData));
  if (!parsed.success) return zodFailure(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return failure(friendlyMessage(error));
  revalidatePath('/', 'layout');
  return success({ updated: true });
}

export async function updateProfileAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ saved: true }>> {
  const parsed = profileSchema.safeParse(formValues(formData));
  if (!parsed.success) return zodFailure(parsed.error);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return failure('Sessão expirada. Entre novamente.');

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data.fullName })
    .eq('id', user.id);
  if (error) return failure(friendlyMessage(error));

  await supabase.auth.updateUser({ data: { full_name: parsed.data.fullName } });
  revalidatePath('/', 'layout');
  return success({ saved: true });
}

/** Login com Google — o provedor precisa estar habilitado no painel do Supabase. */
export async function signInWithGoogleAction(formData: FormData) {
  const supabase = await createClient();
  const next = String(formData.get('proximo') ?? '/');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${appUrl()}/auth/callback?proximo=${encodeURIComponent(next)}`,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
  if (error || !data.url) {
    redirect(`/entrar?erro=${encodeURIComponent(friendlyMessage(error))}`);
  }
  redirect(data.url);
}
