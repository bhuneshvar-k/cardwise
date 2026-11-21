import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { addUserCard, wipeAllData } from '@/lib/repo';
import { Wallet } from './wallet';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// The edit sheet's Switch measures itself; jsdom has no ResizeObserver.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
// The add dialog's command list scrolls the active option into view; jsdom lacks it too.
Element.prototype.scrollIntoView = vi.fn();

beforeEach(async () => {
  await wipeAllData();
});

describe('Wallet', () => {
  test('shows a ghost card that opens the add dialog when the wallet is empty', async () => {
    // Arrange
    render(<Wallet />);
    // Act
    fireEvent.click(await screen.findByRole('button', { name: /Add your first card/ }));
    // Assert
    expect(await screen.findByRole('dialog', { name: 'Add a card' })).toBeInTheDocument();
  });

  test('shows one or two cards as a grid, and a tap opens the edit sheet', async () => {
    // Arrange
    await addUserCard({ cardId: 'icici-amazon-pay' });
    render(<Wallet />);
    // Act
    const card = await screen.findByRole('button', { name: /Amazon Pay ICICI Bank/ });
    // Assert
    expect(screen.getByTestId('wallet')).toHaveAttribute('data-layout', 'grid');
    expect(screen.getByText('Add the statement day')).toBeInTheDocument();
    fireEvent.click(card);
    expect(
      await screen.findByRole('dialog', { name: 'Amazon Pay ICICI Bank Credit Card' }),
    ).toBeInTheDocument();
  });

  test('stacks three cards alphabetically; a tap brings one forward, then Edit opens it', async () => {
    // Arrange
    await addUserCard({ cardId: 'hsbc-live-plus', statementDay: 10 });
    await addUserCard({ cardId: 'icici-amazon-pay', statementDay: 5 });
    await addUserCard({ cardId: 'hdfc-indianoil', statementDay: 1 });
    render(<Wallet />);
    // Act
    await waitFor(() =>
      expect(screen.getByTestId('wallet')).toHaveAttribute('data-layout', 'stack'),
    );
    const faces = screen.getAllByTestId('card-face').map((el) => el.textContent ?? '');
    // Assert: alphabetical
    expect(faces[0]).toMatch(/^Amazon Pay ICICI Bank/);
    expect(faces[1]).toMatch(/^HSBC Live\+/);
    expect(faces[2]).toMatch(/^IndianOil HDFC Bank/);
    // Selecting a card shows its details, not the edit sheet
    fireEvent.click(screen.getByRole('button', { name: /HSBC Live\+/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const details = screen.getByRole('region', { name: 'Selected card' });
    fireEvent.click(within(details).getByRole('button', { name: 'Edit' }));
    expect(
      await screen.findByRole('dialog', { name: 'HSBC Live+ Credit Card' }),
    ).toBeInTheDocument();
  });
});
