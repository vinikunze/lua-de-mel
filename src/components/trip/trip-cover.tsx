import { cn } from '@/lib/utils';

/**
 * Capa da viagem. Sem imagem, gera um gradiente estável a partir do nome —
 * cada viagem fica visualmente reconhecível sem precisar de upload.
 */
const PALETTES = [
  'from-[#1d3557] via-[#457b9d] to-[#a8dadc]',
  'from-[#2d3142] via-[#4f5d75] to-[#bfc0c0]',
  'from-[#14532d] via-[#15803d] to-[#86efac]',
  'from-[#4a1d3f] via-[#8c3061] to-[#e0a5c4]',
  'from-[#7c2d12] via-[#c2410c] to-[#fdba74]',
  'from-[#0c4a6e] via-[#0e7490] to-[#67e8f9]',
];

function paletteFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTES[hash % PALETTES.length];
}

export function TripCover({
  name,
  imageUrl,
  className,
  children,
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn('relative overflow-hidden bg-surface-muted', className)}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className={cn('h-full w-full bg-gradient-to-br', paletteFor(name))} aria-hidden />
      )}
      {children}
    </div>
  );
}
