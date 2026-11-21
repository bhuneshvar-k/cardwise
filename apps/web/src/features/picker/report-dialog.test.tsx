import { evaluate, type Purchase } from '@cardwise/engine';
import { getCard } from '@cardwise/data';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { ReportDialog } from './report-dialog';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/components/ding-toaster', () => ({ toast }));

const live = getCard('hsbc-live-plus')!;
const purchase: Purchase = {
  category: 'dining',
  paymentMethod: 'in_store',
  amountPaise: 10_000,
  date: '2026-11-21',
};
const evaluation = evaluate(live, { id: 'u', cardId: live.id }, purchase, {});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function openAndType(message: string) {
  renderWithProviders(<ReportDialog evaluation={evaluation} purchase={purchase} />);
  fireEvent.click(screen.getByRole('button', { name: 'Something wrong?' }));
  fireEvent.change(screen.getByLabelText('What is wrong?'), { target: { value: message } });
}

describe('ReportDialog', () => {
  test('sends what the app showed along with the message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    openAndType('Dining is 5% now');
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(body).toMatchObject({
      cardId: 'hsbc-live-plus',
      message: 'Dining is 5% now',
      shown: { effectiveBps: 1000 },
    });
  });

  test('waits for a meaningful message', () => {
    openAndType('hi');
    expect(screen.getByRole('button', { name: 'Send report' })).toBeDisabled();
  });

  test('explains rate limits and failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 429 })));
    openAndType('Something is off here');
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/several reports/)),
    );
  });
});
