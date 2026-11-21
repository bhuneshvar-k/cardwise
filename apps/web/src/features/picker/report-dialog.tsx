'use client';

import type { Evaluation, Purchase } from '@cardwise/engine';
import { useMutation } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/ding-toaster';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';

const MIN_LENGTH = 5;

async function sendReport(evaluation: Evaluation, purchase: Purchase, message: string) {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cardId: evaluation.cardId,
      merchantId: purchase.merchantId,
      category: purchase.category,
      message,
      shown: { ruleLabel: evaluation.ruleLabel, effectiveBps: evaluation.effectiveBps },
    }),
  });
  if (res.status === 429)
    throw new Error('You have sent several reports already. Try again later.');
  if (!res.ok) throw new Error('Could not send the report. Please try again.');
}

/** Lets anyone flag a wrong rule; an admin sees it with what the app showed. */
export function ReportDialog({
  evaluation,
  purchase,
}: {
  evaluation: Evaluation;
  purchase: Purchase;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const send = useMutation({
    mutationFn: () => sendReport(evaluation, purchase, message.trim()),
    onSuccess: () => {
      toast.success('Thanks — we will check this card.');
      setMessage('');
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Flag data-icon="inline-start" />
          Something wrong?
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a problem with {evaluation.cardName}</DialogTitle>
          <DialogDescription>
            We showed: {evaluation.ruleLabel ?? evaluation.ineligibleReason}
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="report-message">What is wrong?</FieldLabel>
          <Textarea
            id="report-message"
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. My bank says Swiggy earns 5%, not 10%"
          />
          <FieldDescription>
            Please don&apos;t include card numbers or personal details.
          </FieldDescription>
        </Field>
        <DialogFooter>
          <Button
            onClick={() => send.mutate()}
            disabled={send.isPending || message.trim().length < MIN_LENGTH}
          >
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
