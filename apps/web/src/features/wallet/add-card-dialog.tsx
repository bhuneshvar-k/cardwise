'use client';

import { cards } from '@cardwise/data';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { addUserCard } from '@/lib/repo';

interface AddCardDialogProps {
  ownedCardIds: readonly string[];
  onAdded: (userCardId: string) => void;
}

export function AddCardDialog({ ownedCardIds, onAdded }: AddCardDialogProps) {
  const [open, setOpen] = useState(false);
  const owned = new Set(ownedCardIds);
  const curated = cards.filter((c) => c.origin === 'curated');
  const imported = cards.filter((c) => c.origin !== 'curated');

  const add = async (cardId: string, name: string) => {
    try {
      const userCard = await addUserCard({ cardId });
      setOpen(false);
      toast.success(`Added ${name}`);
      onAdded(userCard.id);
    } catch {
      toast.error('Could not add the card. Please try again.');
    }
  };

  const group = (heading: string, list: typeof cards) => (
    <CommandGroup heading={heading}>
      {list.map((c) => (
        <CommandItem
          key={c.id}
          value={`${c.name} ${c.issuer}`}
          disabled={owned.has(c.id)}
          onSelect={() => add(c.id, c.name)}
        >
          <span className="truncate">{c.name}</span>
          {owned.has(c.id) && <span className="text-muted-foreground ml-auto text-xs">Added</span>}
        </CommandItem>
      ))}
    </CommandGroup>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus data-icon="inline-start" />
          Add a card
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 sm:max-w-lg">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Add a card</DialogTitle>
          <DialogDescription>
            Pick the card product. Cardwise never asks for card numbers.
          </DialogDescription>
        </DialogHeader>
        <Command className="border-t">
          <CommandInput placeholder="Search by card or bank, e.g. HSBC Live+" />
          <CommandList className="max-h-[50vh]">
            <CommandEmpty>No card found.</CommandEmpty>
            {group('Hand-checked rules', curated)}
            {group('Imported from CardAdvisor', imported)}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
