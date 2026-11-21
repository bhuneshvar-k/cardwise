'use client';

import { PAYMENT_METHODS, type Merchant, type PaymentMethod } from '@cardwise/engine';
import { Field, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PAYMENT_LABELS } from '@/lib/labels';

interface PurchaseOptionsProps {
  merchant?: Merchant;
  variantId?: string;
  amount: string;
  paymentMethod: PaymentMethod;
  emi: boolean;
  onChange: (patch: { v?: string | null; a?: string; p?: PaymentMethod; emi?: boolean }) => void;
}

export function PurchaseOptions({
  merchant,
  variantId,
  amount,
  paymentMethod,
  emi,
  onChange,
}: PurchaseOptionsProps) {
  return (
    <div className="space-y-4">
      {merchant && merchant.variants.length > 0 && (
        <Field>
          <FieldLabel>What are you buying on {merchant.name}?</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            className="flex-wrap justify-start"
            value={variantId ?? 'regular'}
            onValueChange={(value) => onChange({ v: !value || value === 'regular' ? null : value })}
          >
            <ToggleGroupItem value="regular">Regular order</ToggleGroupItem>
            {merchant.variants.map((v) => (
              <ToggleGroupItem key={v.id} value={v.id}>
                {v.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      )}

      <Field>
        <FieldLabel>How are you paying?</FieldLabel>
        <ToggleGroup
          type="single"
          variant="outline"
          className="grid w-full grid-cols-2 sm:grid-cols-4"
          value={paymentMethod}
          onValueChange={(value) => value && onChange({ p: value as PaymentMethod })}
        >
          {PAYMENT_METHODS.map((m) => (
            <ToggleGroupItem key={m} value={m} className="w-full">
              {PAYMENT_LABELS[m]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>

      <div className="flex items-end gap-4">
        <Field className="flex-1">
          <FieldLabel htmlFor="amount">Amount (optional)</FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon>₹</InputGroupAddon>
            <InputGroupInput
              id="amount"
              inputMode="decimal"
              placeholder="1,000"
              value={amount}
              onChange={(e) => onChange({ a: e.target.value })}
            />
          </InputGroup>
        </Field>
        <div className="flex h-11 items-center gap-2">
          <Switch
            id="emi"
            checked={emi}
            onCheckedChange={(checked) => onChange({ emi: checked })}
          />
          <Label htmlFor="emi">EMI</Label>
        </div>
      </div>
    </div>
  );
}
