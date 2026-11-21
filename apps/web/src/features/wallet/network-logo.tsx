import type { CardProduct } from '@cardwise/engine';
import {
  siAmericanexpress,
  siDinersclub,
  siMastercard,
  siVisa,
  type SimpleIcon,
} from 'simple-icons';

type Network = CardProduct['network'];

const ICONS: Readonly<Partial<Record<Network, SimpleIcon>>> = {
  visa: siVisa,
  mastercard: siMastercard,
  amex: siAmericanexpress,
  diners: siDinersclub,
};

const LABELS: Readonly<Record<Network, string>> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  rupay: 'RuPay',
  amex: 'American Express',
  diners: 'Diners Club',
};

interface NetworkLogoProps {
  network: Network;
  className?: string;
}

/** Network mark, used only to identify the card network. Drawn in the current text colour. */
export function NetworkLogo({ network, className }: NetworkLogoProps) {
  const icon = ICONS[network];
  if (!icon) return <RuPayMark className={className} />;
  return (
    <svg
      role="img"
      aria-label={LABELS[network]}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d={icon.path} />
    </svg>
  );
}

/** simple-icons has no RuPay mark, so this is a plain wordmark with the two arrow accents. */
function RuPayMark({ className }: { className?: string }) {
  return (
    <svg role="img" aria-label={LABELS.rupay} viewBox="0 0 64 24" className={className}>
      <text
        x="0"
        y="17"
        fill="currentColor"
        fontFamily="inherit"
        fontSize="16"
        fontStyle="italic"
        fontWeight="800"
      >
        RuPay
      </text>
      <path d="M52 5l8 7-8 7z" fill="#f47920" />
      <path d="M56 5l8 7-8 7z" fill="#00954a" />
    </svg>
  );
}
