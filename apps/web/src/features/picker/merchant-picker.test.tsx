import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { MerchantPicker } from './merchant-picker';

const handlers = () => ({ onMerchant: vi.fn(), onCategory: vi.fn(), onClear: vi.fn() });

describe('MerchantPicker', () => {
  test('shows popular merchants before typing and picks one', () => {
    const h = handlers();
    render(<MerchantPicker {...h} />);
    fireEvent.click(screen.getByRole('button', { name: 'Amazon' }));
    expect(h.onMerchant).toHaveBeenCalledWith(expect.objectContaining({ id: 'amazon' }));
  });

  test('searches by alias', () => {
    const h = handlers();
    render(<MerchantPicker {...h} />);
    fireEvent.change(screen.getByLabelText('Search merchants'), { target: { value: 'iocl' } });
    fireEvent.click(screen.getByRole('button', { name: /IndianOil/ }));
    expect(h.onMerchant).toHaveBeenCalledWith(expect.objectContaining({ id: 'indianoil' }));
  });

  test('says when nothing matches', () => {
    render(<MerchantPicker {...handlers()} />);
    fireEvent.change(screen.getByLabelText('Search merchants'), { target: { value: 'zzzz' } });
    expect(screen.getByText(/Not listed yet/)).toBeInTheDocument();
  });

  test('shows the chosen merchant or category with a clear button', () => {
    const h = handlers();
    const { rerender } = render(<MerchantPicker {...h} merchantId="swiggy" />);
    expect(screen.getByText('Swiggy')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "Change where you're paying" }));
    expect(h.onClear).toHaveBeenCalled();
    rerender(<MerchantPicker {...h} category="fuel" />);
    expect(screen.getByText('Any merchant')).toBeInTheDocument();
  });
});
