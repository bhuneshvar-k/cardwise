'use client';

import { cardProductSchema } from '@cardwise/engine';
import { useActionState, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { saveCard, type ActionResult } from '../../actions';

/** Validates as the admin types, so only well-formed cards reach the server. */
function validate(json: string): string | null {
  try {
    const result = cardProductSchema.safeParse(JSON.parse(json));
    if (result.success) return null;
    const issue = result.error.issues[0];
    return `${issue?.path.join('.') || 'card'}: ${issue?.message}`;
  } catch {
    return 'Not valid JSON';
  }
}

export function CardEditor({ id, initialJson }: { id: string; initialJson: string }) {
  const [json, setJson] = useState(initialJson);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveCard, null);
  const problem = useMemo(() => validate(json), [json]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <Field data-invalid={Boolean(problem)}>
        <FieldLabel htmlFor="card-json">Card rules (JSON)</FieldLabel>
        <Textarea
          id="card-json"
          name="json"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          className="min-h-[50vh] font-mono text-xs"
          spellCheck={false}
        />
        <FieldDescription>{problem ?? 'Valid card.'}</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="note">What changed and why</FieldLabel>
        <Input
          id="note"
          name="note"
          required
          minLength={3}
          placeholder="e.g. Cap raised to ₹1,200 per bank T&C, checked 21 Nov"
        />
      </Field>
      <Button type="submit" disabled={pending || Boolean(problem)}>
        Save new revision
      </Button>
      {state && (
        <p className={state.ok ? 'text-primary text-sm' : 'text-destructive text-sm'}>
          {state.message}
        </p>
      )}
    </form>
  );
}
