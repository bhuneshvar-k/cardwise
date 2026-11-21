import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { addUserCard, saveSettings, wipeAllData } from '@/lib/repo';
import { Picker } from './picker';

vi.mock('@/components/ding-toaster', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function renderPicker(searchParams = '') {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <NuqsTestingAdapter searchParams={searchParams} hasMemory>
        <Picker />
      </NuqsTestingAdapter>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  await wipeAllData();
});

describe('Picker', () => {
  test('asks for cards when the wallet is empty', async () => {
    renderPicker('?m=swiggy');
    expect(await screen.findByText('Add your cards first')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add cards' })).toHaveAttribute('href', '/cards');
  });

  test('picks a merchant, then ranks the wallet for the amount entered', async () => {
    // Arrange
    await addUserCard({ cardId: 'hsbc-live-plus', statementDay: 10 });
    await addUserCard({ cardId: 'icici-amazon-pay' });
    renderPicker();
    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Swiggy' }));
    fireEvent.change(await screen.findByLabelText('Amount (optional)'), {
      target: { value: '600' },
    });
    // Assert
    const cards = await screen.findAllByTestId('result-card');
    expect(cards[0]).toHaveTextContent('HSBC Live+ Credit Card');
    expect(cards[0]).toHaveTextContent('₹60');
  });

  test('Amazon shows its purchase types and a wallet top-up earns nothing', async () => {
    await addUserCard({ cardId: 'icici-amazon-pay', attributes: { amazonPrime: true } });
    renderPicker('?m=amazon&a=1000');
    expect((await screen.findAllByTestId('result-card'))[0]).toHaveTextContent(
      '5% on Amazon (Prime)',
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Amazon Pay wallet top-up' }));
    await waitFor(() =>
      expect(screen.getAllByTestId('result-card')[0]).toHaveTextContent(
        'No rewards on wallet loads',
      ),
    );
  });

  test('EMI and UPI change what a card can earn', async () => {
    await addUserCard({ cardId: 'icici-amazon-pay' });
    renderPicker('?m=amazon&a=1000');
    fireEvent.click(await screen.findByRole('switch', { name: 'EMI' }));
    expect(await screen.findByText('No rewards on emi purchases')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'UPI' }));
    expect(
      await screen.findByText('Only RuPay credit cards can be used on UPI'),
    ).toBeInTheDocument();
  });

  test('a category works when the merchant is not listed, and can be cleared', async () => {
    await addUserCard({ cardId: 'hdfc-indianoil' });
    renderPicker('?c=grocery&a=1000');
    expect((await screen.findAllByTestId('result-card'))[0]).toHaveTextContent(
      '5% as Fuel Points on groceries',
    );
    fireEvent.click(screen.getByRole('button', { name: "Change where you're paying" }));
    expect(await screen.findByLabelText('Search merchants')).toBeInTheDocument();
  });

  test('suggests a better card the user does not hold when that setting is on', async () => {
    await addUserCard({ cardId: 'hdfc-indianoil' });
    await saveSettings({ showOtherCards: true });
    renderPicker('?m=amazon&a=1000');
    expect(
      await screen.findByText("Cards you don't have that would earn more"),
    ).toBeInTheDocument();
  });
});
