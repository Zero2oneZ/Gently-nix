// GentlyOS Commerce Client - Vibe Commerce System
// Natural language shopping, unified checkout, TradingView integration

const crypto = require('crypto');

// Generate ID
function generateId(prefix = 'com') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// Query intent types
const QUERY_INTENT = {
  SEARCH: 'search',
  COMPARE: 'compare',
  PRICE_CHECK: 'price_check',
  AVAILABILITY: 'availability',
  REVIEW: 'review',
  RECOMMEND: 'recommend',
};

// Product categories
const CATEGORY = {
  ELECTRONICS: 'electronics',
  CLOTHING: 'clothing',
  HOME: 'home',
  BOOKS: 'books',
  FOOD: 'food',
  HEALTH: 'health',
  TOYS: 'toys',
  SPORTS: 'sports',
  AUTO: 'auto',
  OTHER: 'other',
};

// Cart item status
const ITEM_STATUS = {
  IN_CART: 'in_cart',
  SAVED: 'saved',
  PURCHASED: 'purchased',
  UNAVAILABLE: 'unavailable',
};

// Vibe Query (parsed natural language)
class VibeQuery {
  constructor(rawInput) {
    this.id = generateId('vq');
    this.rawInput = rawInput;
    this.intent = null;
    this.keywords = [];
    this.filters = {};
    this.priceRange = { min: null, max: null };
    this.category = null;
    this.brand = null;
    this.sortBy = null;
    this.timestamp = Date.now();
  }

  // Parse natural language query
  parse() {
    const input = this.rawInput.toLowerCase();

    // Detect intent
    if (input.includes('compare') || input.includes('vs') || input.includes('versus')) {
      this.intent = QUERY_INTENT.COMPARE;
    } else if (input.includes('price') || input.includes('cost') || input.includes('how much')) {
      this.intent = QUERY_INTENT.PRICE_CHECK;
    } else if (input.includes('in stock') || input.includes('available') || input.includes('can i get')) {
      this.intent = QUERY_INTENT.AVAILABILITY;
    } else if (input.includes('review') || input.includes('rating') || input.includes('good?')) {
      this.intent = QUERY_INTENT.REVIEW;
    } else if (input.includes('recommend') || input.includes('suggest') || input.includes('best')) {
      this.intent = QUERY_INTENT.RECOMMEND;
    } else {
      this.intent = QUERY_INTENT.SEARCH;
    }

    // Extract price range
    const priceMatch = input.match(/under\s*\$?(\d+)/i);
    if (priceMatch) {
      this.priceRange.max = parseFloat(priceMatch[1]);
    }
    const minPriceMatch = input.match(/over\s*\$?(\d+)/i);
    if (minPriceMatch) {
      this.priceRange.min = parseFloat(minPriceMatch[1]);
    }
    const rangeMatch = input.match(/\$?(\d+)\s*-\s*\$?(\d+)/);
    if (rangeMatch) {
      this.priceRange.min = parseFloat(rangeMatch[1]);
      this.priceRange.max = parseFloat(rangeMatch[2]);
    }

    // Extract category
    for (const cat of Object.values(CATEGORY)) {
      if (input.includes(cat)) {
        this.category = cat;
        break;
      }
    }

    // Extract keywords (remove common words)
    const stopWords = ['i', 'want', 'need', 'find', 'me', 'a', 'an', 'the', 'some', 'for', 'to', 'looking', 'search'];
    this.keywords = input
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.includes(w));

    // Detect sorting preference
    if (input.includes('cheap') || input.includes('lowest price')) {
      this.sortBy = 'price_asc';
    } else if (input.includes('expensive') || input.includes('premium') || input.includes('high-end')) {
      this.sortBy = 'price_desc';
    } else if (input.includes('popular') || input.includes('best selling')) {
      this.sortBy = 'popularity';
    } else if (input.includes('new') || input.includes('latest')) {
      this.sortBy = 'newest';
    } else if (input.includes('rating') || input.includes('top rated')) {
      this.sortBy = 'rating';
    }

    return this;
  }

  toJSON() {
    return {
      id: this.id,
      rawInput: this.rawInput,
      intent: this.intent,
      keywords: this.keywords,
      filters: this.filters,
      priceRange: this.priceRange,
      category: this.category,
      brand: this.brand,
      sortBy: this.sortBy,
      timestamp: this.timestamp,
    };
  }
}

// Product
class Product {
  constructor(name, price, store) {
    this.id = generateId('prod');
    this.name = name;
    this.price = price;
    this.originalPrice = price;
    this.currency = 'USD';
    this.store = store;
    this.category = CATEGORY.OTHER;
    this.brand = null;
    this.description = '';
    this.images = [];
    this.rating = null;
    this.reviewCount = 0;
    this.inStock = true;
    this.variants = [];        // Size, color, etc.
    this.url = null;
    this.metadata = {};
  }

  // Get discount percentage
  getDiscount() {
    if (this.price >= this.originalPrice) return 0;
    return Math.round((1 - this.price / this.originalPrice) * 100);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      price: this.price,
      originalPrice: this.originalPrice,
      currency: this.currency,
      store: this.store,
      category: this.category,
      brand: this.brand,
      description: this.description,
      images: this.images,
      rating: this.rating,
      reviewCount: this.reviewCount,
      inStock: this.inStock,
      variants: this.variants,
      url: this.url,
      discount: this.getDiscount(),
      metadata: this.metadata,
    };
  }

  static fromJSON(json) {
    const product = new Product(json.name, json.price, json.store);
    Object.assign(product, json);
    return product;
  }
}

// Cart Item
class CartItem {
  constructor(product, quantity = 1, variant = null) {
    this.id = generateId('item');
    this.productId = product.id;
    this.product = product;
    this.quantity = quantity;
    this.variant = variant;
    this.status = ITEM_STATUS.IN_CART;
    this.addedAt = Date.now();
    this.savedPrice = product.price; // Price when added
  }

  // Get total for this item
  getTotal() {
    return this.product.price * this.quantity;
  }

  toJSON() {
    return {
      id: this.id,
      productId: this.productId,
      product: this.product.toJSON(),
      quantity: this.quantity,
      variant: this.variant,
      status: this.status,
      addedAt: this.addedAt,
      savedPrice: this.savedPrice,
      total: this.getTotal(),
    };
  }
}

// Shopping Cart
class Cart {
  constructor() {
    this.items = [];
    this.couponCode = null;
    this.discount = 0;
    this.createdAt = Date.now();
    this.modifiedAt = Date.now();
  }

  // Add item to cart
  addItem(product, quantity = 1, variant = null) {
    // Check if product already in cart
    const existing = this.items.find(i =>
      i.productId === product.id &&
      JSON.stringify(i.variant) === JSON.stringify(variant)
    );

    if (existing) {
      existing.quantity += quantity;
      existing.modifiedAt = Date.now();
    } else {
      this.items.push(new CartItem(product, quantity, variant));
    }

    this.modifiedAt = Date.now();
    return this;
  }

  // Remove item from cart
  removeItem(itemId) {
    this.items = this.items.filter(i => i.id !== itemId);
    this.modifiedAt = Date.now();
    return this;
  }

  // Update quantity
  updateQuantity(itemId, quantity) {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      if (quantity <= 0) {
        return this.removeItem(itemId);
      }
      item.quantity = quantity;
      this.modifiedAt = Date.now();
    }
    return this;
  }

  // Apply coupon
  applyCoupon(code, discountPercent) {
    this.couponCode = code;
    this.discount = discountPercent;
    this.modifiedAt = Date.now();
    return this;
  }

  // Clear cart
  clear() {
    this.items = [];
    this.couponCode = null;
    this.discount = 0;
    this.modifiedAt = Date.now();
    return this;
  }

  // Calculate totals
  getTotals() {
    const subtotal = this.items.reduce((sum, item) => sum + item.getTotal(), 0);
    const discountAmount = subtotal * (this.discount / 100);
    const total = subtotal - discountAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discountAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      itemCount: this.items.reduce((sum, item) => sum + item.quantity, 0),
      uniqueItems: this.items.length,
      couponCode: this.couponCode,
      discountPercent: this.discount,
    };
  }

  toJSON() {
    return {
      items: this.items.map(i => i.toJSON()),
      totals: this.getTotals(),
      createdAt: this.createdAt,
      modifiedAt: this.modifiedAt,
    };
  }
}

// Store configuration
class Store {
  constructor(name, domain) {
    this.id = generateId('store');
    this.name = name;
    this.domain = domain;
    this.enabled = true;
    this.apiKey = null;
    this.priority = 100;       // Lower = higher priority in search
    this.supportedCategories = Object.values(CATEGORY);
    this.shipping = { free: false, minFreeShipping: null };
    this.metadata = {};
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      domain: this.domain,
      enabled: this.enabled,
      priority: this.priority,
      supportedCategories: this.supportedCategories,
      shipping: this.shipping,
      metadata: this.metadata,
    };
  }

  static fromJSON(json) {
    const store = new Store(json.name, json.domain);
    Object.assign(store, json);
    return store;
  }
}

// Price Alert
class PriceAlert {
  constructor(productId, targetPrice) {
    this.id = generateId('alert');
    this.productId = productId;
    this.targetPrice = targetPrice;
    this.currentPrice = null;
    this.triggered = false;
    this.createdAt = Date.now();
    this.triggeredAt = null;
  }

  toJSON() {
    return {
      id: this.id,
      productId: this.productId,
      targetPrice: this.targetPrice,
      currentPrice: this.currentPrice,
      triggered: this.triggered,
      createdAt: this.createdAt,
      triggeredAt: this.triggeredAt,
    };
  }
}

// Main Commerce Client
class CommerceClient {
  constructor() {
    // Stores
    this.stores = new Map();
    this.loadDefaultStores();

    // Products cache
    this.products = new Map();

    // Shopping cart
    this.cart = new Cart();

    // Price alerts
    this.alerts = [];

    // User preferences
    this.preferences = {
      currency: 'USD',
      language: 'en',
      region: 'US',
      savedSearches: [],
      favoriteStores: [],
      excludedStores: [],
    };

    // Search history
    this.searchHistory = [];

    // Trading data (simulated)
    this.marketData = new Map();
  }

  // Load default stores (simulated)
  loadDefaultStores() {
    const defaultStores = [
      { name: 'Amazon', domain: 'amazon.com' },
      { name: 'eBay', domain: 'ebay.com' },
      { name: 'Walmart', domain: 'walmart.com' },
      { name: 'Target', domain: 'target.com' },
      { name: 'Best Buy', domain: 'bestbuy.com' },
      { name: 'Newegg', domain: 'newegg.com' },
    ];

    for (const s of defaultStores) {
      const store = new Store(s.name, s.domain);
      this.stores.set(store.id, store);
    }
  }

  // === QUERY OPERATIONS ===

  // Parse vibe query
  parseVibeQuery(rawInput) {
    const query = new VibeQuery(rawInput);
    query.parse();

    // Save to history
    this.searchHistory.push({
      query: query.toJSON(),
      timestamp: Date.now(),
    });

    // Trim history
    if (this.searchHistory.length > 100) {
      this.searchHistory.shift();
    }

    return { success: true, query: query.toJSON() };
  }

  // Search products (simulated)
  searchProducts(query, limit = 20) {
    const vq = query instanceof VibeQuery ? query : new VibeQuery(query).parse();
    const results = [];

    // Generate simulated products based on query
    const keywords = vq.keywords.join(' ') || vq.rawInput;
    const storeList = Array.from(this.stores.values()).filter(s => s.enabled);

    for (let i = 0; i < Math.min(limit, 10); i++) {
      const store = storeList[i % storeList.length];
      const basePrice = 50 + Math.random() * 200;
      const product = new Product(
        `${keywords} Product ${i + 1}`,
        Math.round(basePrice * 100) / 100,
        store.name
      );

      product.category = vq.category || CATEGORY.OTHER;
      product.rating = 3 + Math.random() * 2;
      product.reviewCount = Math.floor(Math.random() * 1000);
      product.inStock = Math.random() > 0.1;

      if (vq.priceRange.max && product.price > vq.priceRange.max) {
        product.price = vq.priceRange.max * 0.9;
      }
      if (vq.priceRange.min && product.price < vq.priceRange.min) {
        product.price = vq.priceRange.min * 1.1;
      }

      this.products.set(product.id, product);
      results.push(product);
    }

    // Sort results
    if (vq.sortBy === 'price_asc') {
      results.sort((a, b) => a.price - b.price);
    } else if (vq.sortBy === 'price_desc') {
      results.sort((a, b) => b.price - a.price);
    } else if (vq.sortBy === 'rating') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return {
      success: true,
      products: results.map(p => p.toJSON()),
      total: results.length,
      query: vq.toJSON(),
    };
  }

  // Get product by ID
  getProduct(productId) {
    const product = this.products.get(productId);
    if (!product) {
      return { success: false, error: 'Product not found' };
    }
    return { success: true, product: product.toJSON() };
  }

  // === CART OPERATIONS ===

  // Add to cart
  addToCart(productId, quantity = 1, variant = null) {
    const product = this.products.get(productId);
    if (!product) {
      return { success: false, error: 'Product not found' };
    }
    this.cart.addItem(product, quantity, variant);
    return { success: true, cart: this.cart.toJSON() };
  }

  // Remove from cart
  removeFromCart(itemId) {
    this.cart.removeItem(itemId);
    return { success: true, cart: this.cart.toJSON() };
  }

  // Update quantity
  updateQuantity(itemId, quantity) {
    this.cart.updateQuantity(itemId, quantity);
    return { success: true, cart: this.cart.toJSON() };
  }

  // Get cart summary
  getCartSummary() {
    return { success: true, cart: this.cart.toJSON() };
  }

  // Apply coupon
  applyCoupon(code) {
    // Simulated coupon validation
    const coupons = {
      'SAVE10': 10,
      'SAVE20': 20,
      'SAVE30': 30,
    };

    const discount = coupons[code.toUpperCase()];
    if (!discount) {
      return { success: false, error: 'Invalid coupon code' };
    }

    this.cart.applyCoupon(code, discount);
    return { success: true, cart: this.cart.toJSON() };
  }

  // Clear cart
  clearCart() {
    this.cart.clear();
    return { success: true, cart: this.cart.toJSON() };
  }

  // === CHECKOUT ===

  // Process checkout (simulated)
  processCheckout(paymentInfo, shippingAddress) {
    if (this.cart.items.length === 0) {
      return { success: false, error: 'Cart is empty' };
    }

    const order = {
      id: generateId('order'),
      items: this.cart.items.map(i => i.toJSON()),
      totals: this.cart.getTotals(),
      shipping: shippingAddress,
      status: 'confirmed',
      createdAt: Date.now(),
    };

    // Clear cart after checkout
    this.cart.clear();

    return {
      success: true,
      order,
      message: 'Order placed successfully (simulated)',
    };
  }

  // === PRICE ALERTS ===

  // Set price alert
  setPriceAlert(productId, targetPrice) {
    const product = this.products.get(productId);
    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    const alert = new PriceAlert(productId, targetPrice);
    alert.currentPrice = product.price;
    this.alerts.push(alert);

    return { success: true, alert: alert.toJSON() };
  }

  // List alerts
  listAlerts() {
    return {
      success: true,
      alerts: this.alerts.map(a => a.toJSON()),
      total: this.alerts.length,
    };
  }

  // Remove alert
  removeAlert(alertId) {
    this.alerts = this.alerts.filter(a => a.id !== alertId);
    return { success: true };
  }

  // === TRADING/MARKET DATA ===

  // Get market data (simulated)
  getMarketData(ticker, timeframe = '1D') {
    // Generate simulated data
    const basePrice = 100 + Math.random() * 900;
    const data = {
      ticker,
      timeframe,
      currentPrice: basePrice,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      high: basePrice * (1 + Math.random() * 0.05),
      low: basePrice * (1 - Math.random() * 0.05),
      volume: Math.floor(Math.random() * 1000000),
      timestamp: Date.now(),
    };

    this.marketData.set(ticker, data);

    return { success: true, data };
  }

  // Set market alert
  setMarketAlert(ticker, targetPrice, direction = 'below') {
    const alert = {
      id: generateId('malert'),
      ticker,
      targetPrice,
      direction,
      triggered: false,
      createdAt: Date.now(),
    };

    this.alerts.push(alert);
    return { success: true, alert };
  }

  // === STORES ===

  // List stores
  listStores() {
    return {
      success: true,
      stores: Array.from(this.stores.values()).map(s => s.toJSON()),
      total: this.stores.size,
    };
  }

  // Add store
  addStore(name, domain) {
    const store = new Store(name, domain);
    this.stores.set(store.id, store);
    return { success: true, store: store.toJSON() };
  }

  // Enable/disable store
  setStoreEnabled(storeId, enabled) {
    const store = this.stores.get(storeId);
    if (!store) {
      return { success: false, error: 'Store not found' };
    }
    store.enabled = enabled;
    return { success: true, store: store.toJSON() };
  }

  // === PREFERENCES ===

  // Set preferences
  setPreferences(prefs) {
    Object.assign(this.preferences, prefs);
    return { success: true, preferences: this.preferences };
  }

  // Get preferences
  getPreferences() {
    return { success: true, preferences: this.preferences };
  }

  // Get recommendations (simulated)
  getRecommendations(limit = 5) {
    // Based on search history and preferences
    const recentSearches = this.searchHistory.slice(-5);
    const recommendations = [];

    for (const search of recentSearches) {
      const results = this.searchProducts(search.query.rawInput, 2);
      recommendations.push(...results.products.slice(0, 1));
    }

    return {
      success: true,
      recommendations: recommendations.slice(0, limit),
      basedOn: recentSearches.map(s => s.query.rawInput),
    };
  }

  // === STATS ===

  // Get commerce stats
  getStats() {
    return {
      success: true,
      stats: {
        storeCount: this.stores.size,
        productsCached: this.products.size,
        cartItems: this.cart.items.length,
        cartTotal: this.cart.getTotals().total,
        alertCount: this.alerts.length,
        searchCount: this.searchHistory.length,
      },
    };
  }

  // Export data
  export() {
    return {
      success: true,
      data: {
        preferences: this.preferences,
        alerts: this.alerts.map(a => a.toJSON ? a.toJSON() : a),
        searchHistory: this.searchHistory,
      },
    };
  }

  // Import data
  import(data) {
    try {
      if (data.preferences) {
        Object.assign(this.preferences, data.preferences);
      }
      if (data.alerts) {
        this.alerts = data.alerts;
      }
      if (data.searchHistory) {
        this.searchHistory = data.searchHistory;
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = {
  CommerceClient,
  VibeQuery,
  Product,
  CartItem,
  Cart,
  Store,
  PriceAlert,
  QUERY_INTENT,
  CATEGORY,
  ITEM_STATUS,
};
