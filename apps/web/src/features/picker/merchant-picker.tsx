'use client';

import { CATEGORIES, type Category, type Merchant } from '@cardwise/engine';
import { getMerchant, searchMerchants } from '@cardwise/data';
import { Search, X } from 'lucide-react';
import { useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORY_LABELS, POPULAR_MERCHANTS } from '@/lib/labels';

interface MerchantPickerProps {
  merchantId?: string;
  category?: Category;
  onMerchant: (merchant: Merchant) => void;
  onCategory: (category: Category) => void;
  onClear: () => void;
}

function Selected({
  label,
  detail,
  onClear,
}: {
  label: string;
  detail: string;
  onClear: () => void;
}) {
  return (
    <div className="bg-muted/50 flex items-center justify-between rounded-xl border px-3 py-2.5">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground text-sm">{detail}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={onClear} aria-label="Change where you're paying">
        <X />
      </Button>
    </div>
  );
}

export function MerchantPicker({
  merchantId,
  category,
  onMerchant,
  onCategory,
  onClear,
}: MerchantPickerProps) {
  const [query, setQuery] = useState('');
  const listId = useId();
  const merchant = merchantId ? getMerchant(merchantId) : undefined;

  if (merchant)
    return (
      <Selected
        label={merchant.name}
        detail={CATEGORY_LABELS[merchant.category]}
        onClear={onClear}
      />
    );
  if (category)
    return <Selected label={CATEGORY_LABELS[category]} detail="Any merchant" onClear={onClear} />;

  const results = searchMerchants(query);
  const popular = POPULAR_MERCHANTS.map(getMerchant).filter((m): m is Merchant => Boolean(m));

  return (
    <div className="space-y-3">
      <InputGroup className="h-11">
        <InputGroupAddon>
          <Search aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Where are you paying? e.g. Swiggy, IndianOil"
          aria-label="Search merchants"
          aria-controls={listId}
        />
      </InputGroup>

      {query.trim() ? (
        <ul id={listId} className="divide-y rounded-xl border" aria-label="Matching merchants">
          {results.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="hover:bg-muted flex w-full items-center justify-between px-3 py-2.5 text-left"
                onClick={() => onMerchant(m)}
              >
                <span className="font-medium">{m.name}</span>
                <span className="text-muted-foreground text-sm">{CATEGORY_LABELS[m.category]}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="text-muted-foreground px-3 py-2.5 text-sm">
              Not listed yet — pick a category below.
            </li>
          )}
        </ul>
      ) : (
        // One swipeable row, bleeding to the screen edges so the cut-off chip hints at more.
        <div
          role="group"
          aria-label="Popular merchants"
          className="scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto overscroll-x-contain px-4 [scroll-padding-inline:1rem]"
        >
          {popular.map((m) => (
            <Badge
              key={m.id}
              asChild
              variant="outline"
              className="h-8 shrink-0 cursor-pointer snap-start px-3 text-sm"
            >
              <button type="button" onClick={() => onMerchant(m)}>
                {m.name}
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Select onValueChange={(value) => onCategory(value as Category)}>
        <SelectTrigger className="w-full" aria-label="Or choose a category">
          <SelectValue placeholder="Or choose a category" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
