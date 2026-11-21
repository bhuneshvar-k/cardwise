'use client';

import type { CardProduct } from '@cardwise/engine';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import type { StoredUserCard } from '@/lib/db';
import { removeUserCard, updateUserCard } from '@/lib/repo';

const optionalNumber = (min: number, max: number, message: string, integer = false) =>
  z
    .string()
    .trim()
    .refine((v) => {
      if (v === '') return true;
      const n = Number(v);
      return Number.isFinite(n) && n >= min && n <= max && (!integer || Number.isInteger(n));
    }, message);

const formSchema = z.object({
  nickname: z.string().trim().max(40, 'Keep it under 40 characters'),
  statementDay: optionalNumber(1, 28, 'Use a whole day from 1 to 28', true),
  issuedOn: z.union([z.literal(''), z.iso.date('Use a valid date')]),
  amazonPrime: z.boolean(),
  redemptionId: z.string(),
  pointValue: optionalNumber(0.01, 100, 'Use a value between ₹0.01 and ₹100'),
});
type FormValues = z.infer<typeof formSchema>;

function toFormValues(userCard: StoredUserCard, card: CardProduct): FormValues {
  return {
    nickname: userCard.nickname ?? '',
    statementDay: userCard.statementDay?.toString() ?? '',
    issuedOn: userCard.issuedOn ?? '',
    amazonPrime: userCard.attributes?.amazonPrime ?? false,
    redemptionId: userCard.redemptionId ?? card.currency.defaultRedemptionId,
    pointValue: userCard.paisePerUnitOverride ? String(userCard.paisePerUnitOverride / 100) : '',
  };
}

interface EditCardSheetProps {
  userCard: StoredUserCard;
  card: CardProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCardSheet({ userCard, card, open, onOpenChange }: EditCardSheetProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: toFormValues(userCard, card),
  });
  const isPoints = card.currency.kind !== 'cashback';

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateUserCard(userCard.id, {
        nickname: values.nickname || undefined,
        statementDay: values.statementDay ? Number(values.statementDay) : undefined,
        issuedOn: values.issuedOn || undefined,
        attributes: card.attributes.includes('amazonPrime')
          ? { amazonPrime: values.amazonPrime }
          : undefined,
        redemptionId: values.redemptionId,
        paisePerUnitOverride: values.pointValue
          ? Math.round(Number(values.pointValue) * 100)
          : undefined,
      });
      toast.success('Card updated');
      onOpenChange(false);
    } catch {
      toast.error('Could not save. Please check the details.');
    }
  });

  const remove = async () => {
    await removeUserCard(userCard.id);
    toast.success(`Removed ${card.name}`);
    onOpenChange(false);
  };

  const errors = form.formState.errors;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{card.name}</SheetTitle>
          <SheetDescription>These details make caps and point values accurate.</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="px-4" id="edit-card">
          <FieldGroup>
            <Field data-invalid={Boolean(errors.nickname)}>
              <FieldLabel htmlFor="nickname">Nickname</FieldLabel>
              <Input id="nickname" placeholder="e.g. Grocery card" {...form.register('nickname')} />
              <FieldError errors={[errors.nickname]} />
            </Field>
            <Field data-invalid={Boolean(errors.statementDay)}>
              <FieldLabel htmlFor="statementDay">Statement day</FieldLabel>
              <Input
                id="statementDay"
                inputMode="numeric"
                placeholder="e.g. 15"
                {...form.register('statementDay')}
              />
              <FieldDescription>
                The day of the month your bill is generated. Caps reset after it.
              </FieldDescription>
              <FieldError errors={[errors.statementDay]} />
            </Field>
            <Field data-invalid={Boolean(errors.issuedOn)}>
              <FieldLabel htmlFor="issuedOn">Card issued on</FieldLabel>
              <Input id="issuedOn" type="date" {...form.register('issuedOn')} />
              <FieldDescription>Some caps change after the first months.</FieldDescription>
              <FieldError errors={[errors.issuedOn]} />
            </Field>
            {card.attributes.includes('amazonPrime') && (
              <Field orientation="horizontal">
                <Controller
                  control={form.control}
                  name="amazonPrime"
                  render={({ field }) => (
                    <Switch
                      id="amazonPrime"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <FieldLabel htmlFor="amazonPrime">I have Amazon Prime</FieldLabel>
              </Field>
            )}
            {isPoints && (
              <>
                <Field>
                  <FieldLabel>How you redeem {card.currency.unitLabel}</FieldLabel>
                  <Controller
                    control={form.control}
                    name="redemptionId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {card.currency.redemptions.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.label} (₹{(r.paisePerUnit / 100).toFixed(2)} each)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field data-invalid={Boolean(errors.pointValue)}>
                  <FieldLabel htmlFor="pointValue">Your own value per point (₹)</FieldLabel>
                  <Input
                    id="pointValue"
                    inputMode="decimal"
                    placeholder="Leave empty to use the option above"
                    {...form.register('pointValue')}
                  />
                  <FieldError errors={[errors.pointValue]} />
                </Field>
              </>
            )}
          </FieldGroup>
        </form>
        <SheetFooter className="flex-row justify-between">
          <Button variant="destructive" onClick={remove}>
            Remove card
          </Button>
          <Button type="submit" form="edit-card" disabled={form.formState.isSubmitting}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
