import { evaluate, type Purchase } from '@cardwise/engine';
import { getCard } from '@cardwise/data';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { listSpends, wipeAllData } from '@/lib/repo';
import { renderWithProviders } from '@/test/render';
import { ResultCard } from './result-card';

vi.mock('@/components/ding-toaster', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const live = getCard('hsbc-live-plus')!;
const userCard = { id: 'u-live', cardId: live.id, statementDay: 10 };
const dining = (amountPaise?: number): Purchase => ({
  category: 'dining',
  paymentMethod: 'in_store',
  amountPaise,
  date: '2026-11-21',
});

beforeEach(async () => {
  await wipeAllData();
});

describe('ResultCard', () => {
  test('shows value, rate and cap left for the best card', () => {
    const p = dining(200_000);
    renderWithProviders(
      <ResultCard evaluation={evaluate(live, userCard, p, {})} purchase={p} rank={0} owned />,
    );
    expect(screen.getByText('Best choice')).toBeInTheDocument();
    expect(screen.getByText('₹200')).toBeInTheDocument();
    expect(screen.getByText(/₹1,000 left after this/)).toBeInTheDocument();
  });

  test('logs the spend once and shows Logged', async () => {
    const p = dining(200_000);
    renderWithProviders(
      <ResultCard evaluation={evaluate(live, userCard, p, {})} purchase={p} rank={0} owned />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Paid with this' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Logged' })).toBeDisabled());
    expect(await listSpends()).toMatchObject([{ amountPaise: 200_000, valuePaise: 20_000 }]);
  });

  test('a new purchase brings the Paid button back', async () => {
    const first = dining(200_000);
    const { rerender } = renderWithProviders(
      <ResultCard
        evaluation={evaluate(live, userCard, first, {})}
        purchase={first}
        rank={0}
        owned
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Paid with this' }));
    await screen.findByRole('button', { name: 'Logged' });
    const second = dining(50_000);
    rerender(
      <ResultCard
        evaluation={evaluate(live, userCard, second, {})}
        purchase={second}
        rank={0}
        owned
      />,
    );
    expect(screen.getByRole('button', { name: 'Paid with this' })).toBeEnabled();
  });

  test('asks for an amount before logging', () => {
    const p = dining(undefined);
    renderWithProviders(
      <ResultCard evaluation={evaluate(live, userCard, p, {})} purchase={p} rank={0} owned />,
    );
    expect(screen.getByText('Enter the amount to log this spend.')).toBeInTheDocument();
  });

  test('explains why a card cannot be used', () => {
    const p: Purchase = { ...dining(10_000), paymentMethod: 'upi' };
    renderWithProviders(
      <ResultCard evaluation={evaluate(live, userCard, p, {})} purchase={p} rank={1} owned />,
    );
    expect(screen.getByText('Only RuPay credit cards can be used on UPI')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Paid with this' })).not.toBeInTheDocument();
  });

  test('cards the user does not own cannot be logged', () => {
    const p = dining(200_000);
    renderWithProviders(
      <ResultCard
        evaluation={evaluate(live, userCard, p, {})}
        purchase={p}
        rank={-1}
        owned={false}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Paid with this' })).not.toBeInTheDocument();
  });
});
