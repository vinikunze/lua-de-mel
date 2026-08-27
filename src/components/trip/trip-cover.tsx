import { cn } from '@/lib/utils';

/**
 * Capa da viagem. Sem imagem, gera um gradiente estável a partir do nome —
 * cada viagem fica visualmente reconhecível sem precisar de upload.
 */
/**
 * Tons profundos da mesma família da marca. O texto branco por cima vem com
 * um véu escuro, então todas começam escuras e abrem para um tom claro.
 * A ordem importa: o índice é sorteado pelo nome da viagem.
 */
const PALETTES = [
  'from-[#0d1b2a] via-[#2f4a68] to-[#9db8d4]', // noite azul
  'from-[#1d1424] via-[#4a2c56] to-[#c4a5f0]', // ameixa
  'from-[#1a1408] via-[#6f5320] to-[#d9b169]', // dourado
  'from-[#2a0f14] via-[#6d2532] to-[#d99aa4]', // vinho
  'from-[#2b1409] via-[#7a3d1c] to-[#e0a878]', // terracota
  'from-[#0f1f1a] via-[#2f5d4c] to-[#9ecfb8]', // mata ao entardecer
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
