import { PRIVACY_NOTICE_VERSION, SPEND_RETENTION_MONTHS } from '@cardwise/contracts';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/app/page-header';

export const metadata: Metadata = {
  title: 'Privacy notice',
  description:
    'What Cardwise stores, why, and your rights under India’s DPDP Act: no card numbers, local-first data, optional sync.',
  alternates: { canonical: '/privacy' },
};

const CONTACT =
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT ?? 'the contact address published on this site';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-medium">{title}</h2>
      <div className="text-muted-foreground space-y-2 text-sm">{children}</div>
    </section>
  );
}

/** Notice under India's Digital Personal Data Protection Act, 2023 and Rules, 2025. */
export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="Privacy notice" description={`Version ${PRIVACY_NOTICE_VERSION}`} />
      <div className="space-y-6">
        <Section title="Without an account">
          <p>
            Your cards, settings and spend log stay in your browser. We receive nothing except the
            ordinary request details every website sees.
          </p>
        </Section>
        <Section title="Visit statistics">
          <p>
            We count visits with Umami, which runs on our own server. It sets no cookies and stores
            no IP addresses or anything that identifies you: only the page, the referring site, and
            the browser, device type and country. It respects your browser&apos;s Do Not Track
            setting.
          </p>
        </Section>
        <Section title="What we collect when you sign in">
          <ul className="list-disc space-y-1 pl-5">
            <li>Your name and email address from Google, to identify your account.</li>
            <li>
              The card products you add, their settings (nickname, statement day, issue date) and
              the spends you log, so they sync across your devices.
            </li>
            <li>Reports you send about wrong card rules.</li>
            <li>Session details (IP address, browser) to keep you signed in and prevent abuse.</li>
          </ul>
          <p>We never ask for card numbers, expiry dates, CVVs or bank passwords.</p>
        </Section>
        <Section title="Why, and for how long">
          <p>
            We use this data only to run Cardwise: syncing, working out rewards and fixing card
            rules. We do not sell it or use it for advertising.
          </p>
          <p>
            Spends older than {SPEND_RETENTION_MONTHS} months are deleted from our server. Sessions
            expire after 30 days. Everything else is kept until you delete your account. Backups of
            the database are kept for 14 days, so deleted data leaves them within two weeks.
          </p>
        </Section>
        <Section title="Who else handles it">
          <p>
            Google (sign-in), our hosting provider in India, and Sentry (error reports, which can
            include technical details of the failing request). Each processes data only on our
            behalf.
          </p>
        </Section>
        <Section title="Your rights">
          <ul className="list-disc space-y-1 pl-5">
            <li>Access: download everything we hold from About → Download account data.</li>
            <li>Correction: edit your cards and spends in the app.</li>
            <li>
              Erasure: About → Delete account removes your account and synced data immediately.
            </li>
            <li>Withdraw consent: sign out and delete your account at any time.</li>
            <li>Grievances: write to {CONTACT}. We reply within 30 days.</li>
          </ul>
        </Section>
      </div>
    </>
  );
}
