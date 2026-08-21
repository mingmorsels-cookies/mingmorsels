import { describe, it, expect, beforeEach } from 'vitest';
import { cartStore } from '../src/services/CartStore.js';

describe('CartStore Unit Tests', () => {
  beforeEach(() => {
    cartStore.clear();
  });

  it('should start with an empty cart', () => {
    expect(cartStore.getItems()).toEqual([]);
    expect(cartStore.getTotalCount()).toBe(0);
    expect(cartStore.getTotalAmount()).toBe(0);
  });

  it('should add items and calculate totals correctly', () => {
    cartStore.addItem({
      id: 'almond',
      name: 'Almond Cookies',
      price: 160,
      quantity: 2,
      packaging: 'none'
    });

    expect(cartStore.getItems().length).toBe(1);
    expect(cartStore.getTotalCount()).toBe(2);
    expect(cartStore.getTotalAmount()).toBe(320);
  });

  it('should increment quantity when adding the same item with same packaging', () => {
    cartStore.addItem({ id: 'rose', name: 'Rose Petal', price: 190, quantity: 1, packaging: 'none' });
    cartStore.addItem({ id: 'rose', name: 'Rose Petal', price: 190, quantity: 2, packaging: 'none' });

    expect(cartStore.getItems().length).toBe(1);
    expect(cartStore.getTotalCount()).toBe(3);
    expect(cartStore.getTotalAmount()).toBe(570);
  });

  it('should treat items with different packaging as separate line items', () => {
    cartStore.addItem({ id: 'orange', name: 'Orange Peel', price: 185, quantity: 1, packaging: 'none' });
    cartStore.addItem({ id: 'orange', name: 'Orange Peel', price: 315, quantity: 1, packaging: 'lush' });

    expect(cartStore.getItems().length).toBe(2);
    expect(cartStore.getTotalCount()).toBe(2);
    expect(cartStore.getTotalAmount()).toBe(500);
  });

  it('should update item quantity and remove item if quantity <= 0', () => {
    cartStore.addItem({ id: 'oatsnuts', name: 'Oats & Nuts', price: 170, quantity: 3 });
    cartStore.updateQuantity('oatsnuts', 5);
    expect(cartStore.getTotalCount()).toBe(5);

    cartStore.updateQuantity('oatsnuts', 0);
    expect(cartStore.getItems().length).toBe(0);
  });
});
