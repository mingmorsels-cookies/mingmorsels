// ─────────────────────────────────────────────────────────────────────────────
// Multi-Currency Exchange Rate Engine (NRI & Global Gifting)
// ─────────────────────────────────────────────────────────────────────────────

export class CurrencyService {
  constructor() {
    // Pegged base exchange rates relative to 1 INR (indicative standard)
    this.exchangeRates = {
      'INR': 1.0,
      'USD': 0.012,   // ~$1 per 83.5 INR
      'EUR': 0.011,   // ~€1 per 91 INR
      'GBP': 0.0095,  // ~£1 per 105 INR
      'AED': 0.044    // ~1 AED per 22.7 INR
    };
  }

  /**
   * Converts INR amount to target currency.
   */
  convertFromINR(amountInINR, targetCurrency = 'USD') {
    const code = String(targetCurrency).toUpperCase();
    const rate = this.exchangeRates[code] || this.exchangeRates['USD'];
    const converted = amountInINR * rate;

    return {
      sourceAmount: amountInINR,
      sourceCurrency: 'INR',
      targetCurrency: code,
      targetAmount: Number(converted.toFixed(2)),
      formatted: this.formatCurrency(converted, code)
    };
  }

  formatCurrency(amount, currencyCode) {
    const symbolMap = {
      'INR': '₹',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'AED': 'AED '
    };
    const symbol = symbolMap[currencyCode] || `${currencyCode} `;
    return `${symbol}${amount.toFixed(2)}`;
  }
}

export const currencyService = new CurrencyService();
