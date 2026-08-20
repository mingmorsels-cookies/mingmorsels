// ─────────────────────────────────────────────────────────────────────────────
// SharedLayout.js - Reusable Header, Cart Drawer & Footer Components
// ─────────────────────────────────────────────────────────────────────────────

export class SharedLayout {
  /**
   * Injects the standard Header Navigation if requested
   */
  static renderHeader(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <header class="header" role="banner">
        <div class="nav-container">
          <a href="/" class="logo-link" aria-label="Ming Morsels Home">
            <img src="/logo.png" alt="Ming Morsels" class="logo-img" />
          </a>
          <nav class="desktop-nav" aria-label="Main Navigation">
            <a href="/#products" class="nav-link">Signature Cookies</a>
            <a href="/#muffins" class="nav-link">Artisanal Muffins</a>
            <a href="/bulk-order.html" class="nav-link">Bulk &amp; Corporate</a>
            <a href="/experience-center.html" class="nav-link">Experience Centre</a>
            <a href="/track-order.html" class="nav-link">Track Order</a>
          </nav>
          <div class="nav-actions">
            <button id="btn-search-trigger" class="icon-btn" aria-label="Search Catalog">🔍</button>
            <button id="btn-cart-trigger" class="icon-btn cart-btn-wrap" aria-label="Shopping Cart">
              <span>🛒</span>
              <span id="cart-count-badge" class="cart-badge" style="display:none;">0</span>
            </button>
          </div>
        </div>
      </header>
    `;
  }

  /**
   * Injects standard Footer
   */
  static renderFooter(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <footer id="footer" class="footer" role="contentinfo">
        <div class="footer-content">
          <div class="footer-brand">
            <img src="/logo.png" alt="Ming Morsels" class="footer-logo" />
            <p class="footer-tagline">When moments matter. Handcrafted artisanal confectionery baked with love in Bengaluru.</p>
          </div>
          <div class="footer-links-grid">
            <div>
              <h5 class="footer-heading">Quick Links</h5>
              <ul class="footer-links">
                <li><a href="/#products">Cookies</a></li>
                <li><a href="/#muffins">Muffins</a></li>
                <li><a href="/bulk-order.html">Bulk Gifting</a></li>
                <li><a href="/experience-center.html">Experience Centre</a></li>
              </ul>
            </div>
            <div>
              <h5 class="footer-heading">Customer Care</h5>
              <ul class="footer-links">
                <li><a href="/track-order.html">Track Order</a></li>
                <li><a href="/#contact">Contact Us</a></li>
                <li><a href="#" id="btn-shipping-policy">Shipping Policy</a></li>
                <li><a href="#" id="btn-cancellation-refund">Cancellation &amp; Refunds</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    `;
  }
}
