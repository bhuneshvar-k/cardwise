import { CARDADVISOR_ATTRIBUTION, curatedCards } from '@cardwise/data';
import type { Metadata } from 'next';
import Link from 'next/link';
import { GitHubButton } from '@/components/app/github-button';
import { PageHeader } from '@/components/app/page-header';
import { Separator } from '@/components/ui/separator';
import { AccountPanel } from '@/features/account/account-panel';
import { DataControls } from '@/features/settings/data-controls';

export const metadata: Metadata = {
  title: 'About and privacy',
  description:
    'How Cardwise ranks your credit and debit cards, where its card rules come from, and how your data stays on your device.',
  alternates: { canonical: '/about' },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-medium">{title}</h2>
      <div className="text-muted-foreground space-y-2 text-sm">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About"
        description="How Cardwise works, and what it does with your data."
      />
      <div className="space-y-6">
        <Section title="Account and sync">
          <AccountPanel />
        </Section>
        <Section title="Your data">
          <p>
            Your cards, settings and spend log are stored in this browser, and on our server only if
            you sign in to sync. Cardwise never asks for card numbers, expiry dates or CVVs. Read
            the{' '}
            <a href="/privacy" className="underline">
              privacy notice
            </a>
            .
          </p>
          <DataControls />
        </Section>
        <Separator />
        <Section title="Not financial advice">
          <p>
            Rankings are estimates worked out from each card&apos;s published terms. Banks change
            rewards often, and the merchant code your payment is filed under decides what you
            actually earn. Check your card&apos;s current terms before relying on a result.
          </p>
        </Section>
        <Separator />
        <Section title="Where the card rules come from">
          <p>
            {curatedCards.length} cards have rules written by hand from the banks&apos; own pages,
            each with its source. They show “review pending” until an admin re-checks them; cards
            re-checked in the last 90 days show “Verified”.
          </p>
          <p>
            Other cards are imported automatically.{' '}
            <a
              className="underline"
              href={CARDADVISOR_ATTRIBUTION.url}
              target="_blank"
              rel="noreferrer"
            >
              {CARDADVISOR_ATTRIBUTION.text}
            </a>{' '}
            — licensed under{' '}
            <a
              className="underline"
              href={CARDADVISOR_ATTRIBUTION.licenseUrl}
              target="_blank"
              rel="noreferrer"
            >
              CC BY 4.0
            </a>
            . Imported rules may miss exclusions and conditions.
          </p>
          <p>
            Card and bank names are trademarks of their owners. Cardwise is not affiliated with any
            bank.
          </p>
        </Section>
        <Section title="Open source">
          <p>
            Cardwise is free and open source under the MIT licence. Read the code, report a wrong
            rate, or add a card on GitHub.
          </p>
          <GitHubButton />
        </Section>
        <Section title="Guides">
          <p>
            Plain-English guides to card rewards in India: caps, exclusions, UPI and the best card
            for common spends.{' '}
            <Link className="underline" href="/blog">
              Read the guides
            </Link>
            .
          </p>
        </Section>
      </div>
    </>
  );
}
