'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from '@/components/ding-toaster';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';
import { rememberConsentIntent } from './consent-intent';
import type { ServerStatus } from './use-server-status';

/** Agreeing first is required: the consent is recorded once the user is back from Google. */
export function SignInCard({ status }: { status: ServerStatus }) {
  const [agreed, setAgreed] = useState(false);
  const callbackURL = '/about';

  const google = async () => {
    rememberConsentIntent();
    const { error } = await authClient.signIn.social({ provider: 'google', callbackURL });
    if (error) toast.error('Could not start Google sign-in. Please try again.');
  };

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="text-sm">
        Sign in to keep your cards and spends on all your devices. Without an account they stay on
        this device only.
      </p>
      <Field orientation="horizontal">
        <Checkbox id="consent" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
        <FieldLabel htmlFor="consent" className="font-normal">
          I agree to the&nbsp;
          <Link href="/privacy" className="underline">
            privacy notice
          </Link>
        </FieldLabel>
      </Field>
      {status.google && (
        <Button className="w-full" size="lg" disabled={!agreed} onClick={google}>
          Continue with Google
        </Button>
      )}
      {status.testLogin && <TestSignIn disabled={!agreed} callbackURL={callbackURL} />}
    </div>
  );
}

/** Email + password, only when the server enables it for automated tests. */
function TestSignIn({ disabled, callbackURL }: { disabled: boolean; callbackURL: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const submit = async () => {
    rememberConsentIntent();
    const signIn = await authClient.signIn.email({ email, password, callbackURL });
    if (!signIn.error) return;
    const signUp = await authClient.signUp.email({
      email,
      password,
      name: email.split('@')[0] ?? email,
      callbackURL,
    });
    if (!signUp.error) return;
    // Someone else may have created the account in the meantime: try signing in once more.
    const retry = await authClient.signIn.email({ email, password, callbackURL });
    if (retry.error) toast.error(signUp.error.message ?? 'Sign-in failed');
  };
  return (
    <form
      className="space-y-2 border-t pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="text-muted-foreground text-xs">Test sign-in (development only)</p>
      <Input
        aria-label="Test email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        aria-label="Test password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" variant="outline" disabled={disabled}>
        Sign in for testing
      </Button>
    </form>
  );
}
