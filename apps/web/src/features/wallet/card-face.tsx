'use client';

import type { CardProduct } from '@cardwise/engine';
import { useRef, type CSSProperties, type PointerEvent } from 'react';
import { cn } from '@/lib/utils';
import { paletteFor } from './card-art';
import { NetworkLogo } from './network-logo';

/** Largest tilt in degrees at the card's edge. */
const MAX_TILT_DEG = 10;

interface CardFaceProps {
  title: string;
  /** Missing when the card has been removed from the catalogue. */
  card: CardProduct | undefined;
  className?: string;
}

/**
 * A drawn card face: issuer colours, a chip, the title and the network mark, under a holographic
 * foil that follows the pointer. Pointer position is written to CSS variables, not React state,
 * so moving over the card does not re-render it. See `.card-holo` in globals.css.
 */
export function CardFace({ title, card, className }: CardFaceProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const palette = paletteFor(card?.issuer ?? '');

  const onPointerMove = (e: PointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
    el.style.setProperty('--rx', `${(x - 0.5) * 2 * MAX_TILT_DEG}deg`);
    el.style.setProperty('--ry', `${(0.5 - y) * 2 * MAX_TILT_DEG}deg`);
    el.dataset.active = 'true';
  };

  const onPointerLeave = () => {
    const el = ref.current;
    if (!el) return;
    ['--mx', '--my', '--rx', '--ry'].forEach((p) => el.style.removeProperty(p));
    delete el.dataset.active;
  };

  const style = {
    '--card-from': palette.from,
    '--card-to': palette.to,
    color: palette.ink,
  } as CSSProperties;

  return (
    <span
      ref={ref}
      data-testid="card-face"
      className={cn('card-holo block aspect-[1.586] w-full', className)}
      style={style}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <span className="card-holo__surface flex flex-col justify-between p-[6%] text-left">
        <span className="line-clamp-2 text-base leading-tight font-semibold tracking-tight sm:text-lg">
          {title}
        </span>
        <span aria-hidden className="card-holo__chip" />
        <span className="flex items-end justify-end">
          {card && <NetworkLogo network={card.network} className="h-8 w-auto max-w-[30%]" />}
        </span>
      </span>
    </span>
  );
}
