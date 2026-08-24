'use client';

import { Select, Input } from '@/components/ui/input';
import { COMMON_TIMEZONES, CURRENCIES } from '@/lib/config';
import { timezoneLabel } from '@/lib/format/date';
import { PAYMENT_STATUS_LABEL } from '@/lib/validators/expense';

export function TimezoneSelect({
  name,
  defaultValue = 'America/Sao_Paulo',
  id,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  // Garante que um fuso já salvo apareça mesmo fora da lista de atalhos.
  const options = COMMON_TIMEZONES.includes(defaultValue as (typeof COMMON_TIMEZONES)[number])
    ? [...COMMON_TIMEZONES]
    : [String(defaultValue), ...COMMON_TIMEZONES];

  return (
    <Select name={name} id={id} defaultValue={defaultValue} {...rest}>
      {options.map((tz) => (
        <option key={tz} value={tz}>
          {timezoneLabel(tz)}
        </option>
      ))}
    </Select>
  );
}

export function CurrencySelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Select {...props}>
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.code} — {c.symbol}
        </option>
      ))}
    </Select>
  );
}

export function PaymentStatusSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Select {...props}>
      {Object.entries(PAYMENT_STATUS_LABEL).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </Select>
  );
}

/** Campo monetário: teclado numérico no celular, aceita vírgula ou ponto. */
export function MoneyInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <Input inputMode="decimal" placeholder="0,00" autoComplete="off" {...props} />;
}
