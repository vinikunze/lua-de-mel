import { cn, initials } from '@/lib/utils';

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dimensions = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-[11px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-14 w-14 text-base',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted font-semibold text-ink-soft ring-1 ring-line',
        dimensions,
        className,
      )}
      title={name ?? undefined}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 4,
  size = 'sm',
}: {
  people: Array<{ name?: string | null; avatarUrl?: string | null }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((person, i) => (
        <Avatar key={i} name={person.name} src={person.avatarUrl} size={size} className="ring-2 ring-surface" />
      ))}
      {rest > 0 && (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-[11px] font-semibold text-ink-soft ring-2 ring-surface">
          +{rest}
        </span>
      )}
    </div>
  );
}
