import { CARDADVISOR_ATTRIBUTION, curatedCards } from '@cardwise/data';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/app/page-header';
import { Separator } from '@/components/ui/separator';
import { DataControls } from '@/features/settings/data-controls';

export const metadata: Metadata = { title: 'About and privacy' };

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
        <Section title="Your data">
          <p>
            Your cards, settings and spend log are stored in this browser only. Nothing is sent to a
            server. Cardwise never asks for card numbers, expiry dates or CVVs.
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
      </div>
    </>
  );
}
