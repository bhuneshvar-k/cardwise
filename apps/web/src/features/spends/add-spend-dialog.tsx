'use client';

import {
  CATEGORIES,
  PAYMENT_METHODS,
  computeCapUsage,
  evaluate,
  type Category,
  type PaymentMethod,
} from '@cardwise/engine';
import { getCard } from '@cardwise/data';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StoredSpend, StoredUserCard } from '@/lib/db';
import { CATEGORY_LABELS, PAYMENT_LABELS } from '@/lib/labels';
import { parseRupees } from '@/lib/money';
import { toSpendInput } from '@/lib/recommend';
import { logSpend } from '@/lib/repo';

const formSchema = z.object({
  userCardId: z.string().min(1, 'Choose a card'),
  amount: z.string().refine((v) => parseRupees(v) !== undefined, 'Enter an amount in rupees'),
  category: z.enum(CATEGORIES),
  paymentMethod: z.enum(PAYMENT_METHODS),
  date: z.iso.date('Use a valid date'),
});
type FormValues = z.infer<typeof formSchema>;

interface AddSpendDialogProps {
  userCards: readonly StoredUserCard[];
  spends: readonly StoredSpend[];
  today: string;
}

/** For spends made without the picker, so caps stay accurate. */
export function AddSpendDialog({ userCards, spends, today }: AddSpendDialogProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userCardId: userCards[0]?.id ?? '',
      amount: '',
      category: 'other',
      paymentMethod: 'online',
      date: today,
    },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    const userCard = userCards.find((c) => c.id === values.userCardId);
    const card = userCard && getCard(userCard.cardId);
    if (!userCard || !card) return;
    const purchase = {
      category: values.category,
      paymentMethod: values.paymentMethod,
      amountPaise: parseRupees(values.amount),
      date: values.date,
    };
    const result = evaluate(
      card,
      userCard,
      purchase,
      computeCapUsage(card, userCard, spends, values.date),
    );
    try {
      await logSpend(toSpendInput(result, purchase));
      toast.success('Spend added');
      form.reset({ ...values, amount: '' });
      setOpen(false);
    } catch {
      toast.error('Could not save this spend.');
    }
  });

  const select = <T extends string>(
    name: 'userCardId' | 'category' | 'paymentMethod',
    items: { value: T; label: string }[],
  ) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <Select value={field.value} onValueChange={field.onChange}>
          <SelectTrigger id={name} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={userCards.length === 0}>
          <Plus data-icon="inline-start" />
          Add a spend
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a spend</DialogTitle>
          <DialogDescription>
            Log a payment made outside Cardwise so cap tracking stays right.
          </DialogDescription>
        </DialogHeader>
        <form id="add-spend" onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="userCardId">Card</FieldLabel>
              {select(
                'userCardId',
                userCards.map((c) => ({
                  value: c.id,
                  label: c.nickname ?? getCard(c.cardId)?.name ?? c.cardId,
                })),
              )}
              <FieldError errors={[errors.userCardId]} />
            </Field>
            <Field data-invalid={Boolean(errors.amount)}>
              <FieldLabel htmlFor="spend-amount">Amount (₹)</FieldLabel>
              <Input id="spend-amount" inputMode="decimal" {...form.register('amount')} />
              <FieldError errors={[errors.amount]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="category">Category</FieldLabel>
              {select<Category>(
                'category',
                CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] })),
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="paymentMethod">Paid by</FieldLabel>
              {select<PaymentMethod>(
                'paymentMethod',
                PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_LABELS[m] })),
              )}
            </Field>
            <Field data-invalid={Boolean(errors.date)}>
              <FieldLabel htmlFor="spend-date">Date</FieldLabel>
              <Input id="spend-date" type="date" max={today} {...form.register('date')} />
              <FieldError errors={[errors.date]} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="submit" form="add-spend" disabled={form.formState.isSubmitting}>
            Save spend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
