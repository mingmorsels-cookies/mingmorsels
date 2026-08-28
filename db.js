// ─────────────────────────────────────────────────────────────────────────────
// db.js - High-Concurrency Persistence Layer (PostgreSQL & Async Non-Blocking Local Store)
// ─────────────────────────────────────────────────────────────────────────────

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { reserveStockHoldRedis, releaseStockHoldRedis, isRedisReady } from './redis.js';

const LOCAL_DB_PATH = path.resolve(process.cwd(), 'data_store.json');

const DEFAULT_INVENTORY = {
  'almond': 120,
  'rose': 85,
  'oatsnuts': 95,
  'orange': 60,
  'walnut': 75,
  'walnut_sf': 50,
  'strawberry': 40,
  'pineapple': 45,
  'butterscotch': 55,
  'choco': 90,
  'gift_box_4': 200,
  'gift_box_6': 200,
  'gift_box_9': 150,
  'gift_box_12': 100
};

// In-memory Stock Reservations fallback: orderId -> { items, expiresAt }
const activeStockHolds = new Map();

// File Write Mutex / Lock Queue for non-blocking concurrency
let writeQueue = Promise.resolve();

function initLocalStoreSync() {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const defaultData = {
      users: [],
      orders: [],
      abandonedCarts: [],
      inventory: { ...DEFAULT_INVENTORY },
      pincodes: [
        { pincode: "560001", area: "MG Road, Bangalore", estTime: "Same-Day Delivery (Within 3 Hours)" },
        { pincode: "560038", area: "Indiranagar, Bangalore", estTime: "Same-Day Delivery (Within 2 Hours)" },
        { pincode: "560034", area: "Koramangala, Bangalore", estTime: "Same-Day Delivery (Within 2 Hours)" },
        { pincode: "560066", area: "Whitefield, Bangalore", estTime: "Same-Day Delivery (Within 4 Hours)" },
        { pincode: "560100", area: "Electronic City, Bangalore", estTime: "Same-Day Delivery (Within 4 Hours)" },
        { pincode: "110001", area: "Connaught Place, New Delhi", estTime: "Express Delivery (Next Day)" },
        { pincode: "400001", area: "Fort, Mumbai", estTime: "Express Delivery (Next Day)" }
      ]
    };
    const tmp = `${LOCAL_DB_PATH}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(defaultData, null, 2));
    fs.renameSync(tmp, LOCAL_DB_PATH);
  }
}

initLocalStoreSync();

async function readLocalStoreAsync() {
  try {
    const raw = await fs.promises.readFile(LOCAL_DB_PATH, 'utf-8');
    const store = JSON.parse(raw);
    if (!store.inventory) store.inventory = { ...DEFAULT_INVENTORY };
    if (!store.abandonedCarts) store.abandonedCarts = [];
    if (!store.reviews) store.reviews = [];
    if (!store.adminNotifications) store.adminNotifications = [];
    if (!store.userRewards) store.userRewards = {};
    return store;
  } catch (e) {
    return { users: [], orders: [], abandonedCarts: [], reviews: [], adminNotifications: [], userRewards: {}, inventory: { ...DEFAULT_INVENTORY }, pincodes: [] };
  }
}

function readLocalStore() {
  try {
    const store = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
    if (!store.inventory) store.inventory = { ...DEFAULT_INVENTORY };
    if (!store.abandonedCarts) store.abandonedCarts = [];
    if (!store.reviews) store.reviews = [];
    if (!store.adminNotifications) store.adminNotifications = [];
    if (!store.userRewards) store.userRewards = {};
    return store;
  } catch (e) {
    return { users: [], orders: [], abandonedCarts: [], reviews: [], adminNotifications: [], userRewards: {}, inventory: { ...DEFAULT_INVENTORY }, pincodes: [] };
  }
}

async function writeLocalStoreAsync(data) {
  writeQueue = writeQueue.then(async () => {
    try {
      const tmp = `${LOCAL_DB_PATH}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
      await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2));
      await fs.promises.rename(tmp, LOCAL_DB_PATH);
    } catch (err) {
      console.error('[DB] Error in async local store write:', err);
    }
  });
  return writeQueue;
}

function writeLocalStore(data) {
  try {
    const tmp = `${LOCAL_DB_PATH}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, LOCAL_DB_PATH);
  } catch (err) {
    console.error('Error writing local database store:', err);
  }
}

let pgPool = null;
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/mingmorsels';
try {
  pgPool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
  });
} catch (e) {
  console.log('⚠️ PostgreSQL Pool initialization deferred to local store mode.');
}

/**
 * Executes a callback within a PostgreSQL transaction
 */
export async function withTransaction(callback) {
  if (!pgPool) {
    return await callback(null);
  }
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function initPostgresTables() {
  if (!pgPool) return false;
  try {
    const client = await pgPool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        picture TEXT,
        address TEXT,
        phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        endpoint TEXT UNIQUE NOT NULL,
        keys_auth TEXT NOT NULL,
        keys_p256dh TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        product_id VARCHAR(100) PRIMARY KEY,
        stock_count INT NOT NULL DEFAULT 100,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(100) PRIMARY KEY,
        user_id INT REFERENCES users(id),
        user_name VARCHAR(255),
        user_email VARCHAR(255),
        items_json JSONB NOT NULL,
        total_amount NUMERIC(10,2) NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'PENDING',
        payment_id VARCHAR(255),
        razorpay_order_id VARCHAR(255),
        shipping_address TEXT,
        delivery_status VARCHAR(50) DEFAULT 'BAKING',
        shipway_awb VARCHAR(255),
        courier_name VARCHAR(255),
        tracking_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_orders_user_email ON orders(user_email);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);
      CREATE INDEX IF NOT EXISTS idx_orders_razorpay_id ON orders(razorpay_order_id);
    `);
    client.release();
    console.log('✅ PostgreSQL Schema, Tables & Indexes verified successfully.');
    return true;
  } catch (err) {
    console.log('ℹ️ Running in local persistent database mode (PostgreSQL service standby).');
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY & STOCK PERSISTENCE WITH RESERVATION (HOLD) MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

function getActiveReservedStock() {
  const now = Date.now();
  const reservedMap = {};

  for (const [orderId, hold] of activeStockHolds.entries()) {
    if (hold.expiresAt < now) {
      activeStockHolds.delete(orderId);
      continue;
    }
    for (const it of hold.items) {
      const key = String(it.id || it.productId || '').split('_')[0].toLowerCase();
      const qty = Number(it.quantity) || 1;
      reservedMap[key] = (reservedMap[key] || 0) + qty;
    }
  }
  return reservedMap;
}

export function reserveStockHold(orderId, items = [], ttlMs = 10 * 60 * 1000) {
  if (!orderId || !items.length) return false;

  // Redis Distributed Reservation
  if (isRedisReady()) {
    reserveStockHoldRedis(orderId, items, Math.floor(ttlMs / 1000));
  }

  // Memory Fallback Map
  activeStockHolds.set(orderId, {
    items,
    expiresAt: Date.now() + ttlMs
  });
  return true;
}

export function releaseStockHold(orderId) {
  if (!orderId) return false;
  if (isRedisReady()) {
    releaseStockHoldRedis(orderId);
  }
  return activeStockHolds.delete(orderId);
}

export async function checkStockAvailability(items = []) {
  const store = await readLocalStoreAsync();
  const inventory = store.inventory || DEFAULT_INVENTORY;
  const reserved = getActiveReservedStock();

  for (const it of items) {
    const key = String(it.id || it.productId || '').split('_')[0].toLowerCase();
    const qty = Number(it.quantity) || 1;
    const baseStock = inventory[key] !== undefined ? inventory[key] : 100;
    const currentlyReserved = reserved[key] || 0;
    const effectiveAvailable = Math.max(0, baseStock - currentlyReserved);

    if (effectiveAvailable < qty) {
      return {
        available: false,
        item: it.name || key,
        stock: effectiveAvailable,
        requested: qty
      };
    }
  }
  return { available: true };
}

export async function decrementProductStock(items = []) {
  if (pgPool) {
    try {
      return await withTransaction(async (client) => {
        for (const it of items) {
          const key = String(it.id || it.productId || '').split('_')[0].toLowerCase();
          const qty = Number(it.quantity) || 1;
          await client.query(
            `UPDATE inventory 
             SET stock_count = stock_count - $1 
             WHERE product_id = $2 AND stock_count >= $1 
             RETURNING stock_count`,
            [qty, key]
          );
        }
      });
    } catch (e) {
      // Fallback to local store on db failure
    }
  }

  const store = await readLocalStoreAsync();
  if (!store.inventory) store.inventory = { ...DEFAULT_INVENTORY };

  for (const it of items) {
    const key = String(it.id || it.productId || '').split('_')[0].toLowerCase();
    const qty = Number(it.quantity) || 1;
    if (store.inventory[key] !== undefined) {
      store.inventory[key] = Math.max(0, store.inventory[key] - qty);
    }
  }
  await writeLocalStoreAsync(store);
  return store.inventory;
}

export async function getInventoryStock() {
  const store = await readLocalStoreAsync();
  return store.inventory || DEFAULT_INVENTORY;
}

export async function upsertUser({ google_id, name, email, picture }) {
  if (pgPool) {
    try {
      const res = await pgPool.query(
        `INSERT INTO users (google_id, name, email, picture)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE 
         SET name = EXCLUDED.name, picture = EXCLUDED.picture
         RETURNING *`,
        [google_id, name, email, picture]
      );
      return res.rows[0];
    } catch (e) {}
  }

  const store = await readLocalStoreAsync();
  let user = store.users.find(u => u.email === email);
  if (!user) {
    user = { id: Date.now(), google_id, name, email, picture, address: "", created_at: new Date().toISOString() };
    store.users.push(user);
  } else {
    user.name = name;
    user.picture = picture;
  }
  await writeLocalStoreAsync(store);
  return user;
}

export async function createOrderRecord(orderData) {
  const { id, user_id, user_name, user_email, user_phone, items, total_amount, discount_amount, applied_coupon, tax_gst, delivery_fee, payment_status, razorpay_order_id, shipping_address } = orderData;

  if (pgPool) {
    try {
      const res = await pgPool.query(
        `INSERT INTO orders (id, user_id, user_name, user_email, user_phone, items_json, total_amount, payment_status, razorpay_order_id, shipping_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [id, user_id || null, user_name, user_email, user_phone || null, JSON.stringify(items), total_amount, payment_status || 'PENDING', razorpay_order_id || null, shipping_address || '']
      );
      return res.rows[0];
    } catch (e) {}
  }
  const store = await readLocalStoreAsync();
  const newOrder = {
    id,
    user_id: user_id || null,
    user_name,
    user_email,
    user_phone: user_phone || null,
    items,
    total_amount,
    discount_amount: discount_amount || 0,
    applied_coupon: applied_coupon || null,
    tax_gst: tax_gst || 0,
    delivery_fee: delivery_fee || 0,
    payment_status: payment_status || 'PENDING',
    payment_id: null,
    razorpay_order_id: razorpay_order_id || null,
    shipping_address: shipping_address || '',
    delivery_status: 'BAKING',
    created_at: new Date().toISOString()
  };
  store.orders.unshift(newOrder);
  await writeLocalStoreAsync(store);
  return newOrder;
}

export async function getUserRewards() {
  const store = await readLocalStoreAsync();
  return store.userRewards || {};
}

export async function redeemUserPoints(email, points) {
  if (!email || !points) return false;
  const store = await readLocalStoreAsync();
  if (!store.userRewards) store.userRewards = {};
  const normalizedEmail = email.toLowerCase().trim();
  const currentRedeemed = store.userRewards[normalizedEmail]?.redeemed || 0;
  
  store.userRewards[normalizedEmail] = {
    redeemed: currentRedeemed + points,
    last_redeemed_at: new Date().toISOString()
  };
  
  await writeLocalStoreAsync(store);
  return store.userRewards[normalizedEmail];
}

export async function isPaymentAlreadyProcessed(paymentId, currentOrderId) {
  if (!paymentId) return false;
  const store = await readLocalStoreAsync();
  const existing = store.orders.find(o => 
    o.payment_id === paymentId && 
    o.id !== currentOrderId && 
    o.razorpay_order_id !== currentOrderId
  );
  return !!existing;
}

export async function markOrderPaid(orderId, paymentId) {
  const store = await readLocalStoreAsync();
  const order = store.orders.find(o => o.id === orderId || o.razorpay_order_id === orderId);
  if (order) {
    if (order.payment_status === 'PAID' && order.payment_id === paymentId) {
      return order; // Idempotent return
    }
    order.payment_status = 'PAID';
    order.payment_id = paymentId;
    await writeLocalStoreAsync(store);

    releaseStockHold(order.id);
    const items = Array.isArray(order.items) ? order.items : [];
    await decrementProductStock(items);

    return order;
  }
  return null;
}

export async function updateOrderShipmentInfo(orderId, updateFields = {}) {
  const store = await readLocalStoreAsync();
  const cleanId = String(orderId || '').trim().replace(/^#/, '');
  const order = store.orders.find(o => 
    o.id === orderId || 
    o.id === cleanId || 
    o.id === `#${cleanId}` || 
    o.razorpay_order_id === orderId ||
    o.razorpay_order_id === cleanId
  );
  if (order) {
    const { awb, courier, status, trackingUrl, delivery_status, pickup_handed_over_at, pickup_verified, pickup_pin, payment_status } = updateFields;
    if (awb !== undefined) order.shipway_awb = awb;
    if (courier !== undefined) order.courier_name = courier;
    if (delivery_status !== undefined || status !== undefined) {
      order.delivery_status = delivery_status || status || order.delivery_status;
    }
    if (trackingUrl !== undefined) order.tracking_url = trackingUrl;
    if (pickup_handed_over_at !== undefined) order.pickup_handed_over_at = pickup_handed_over_at;
    if (pickup_verified !== undefined) order.pickup_verified = pickup_verified;
    if (pickup_pin !== undefined) order.pickup_pin = pickup_pin;
    if (payment_status !== undefined) order.payment_status = payment_status;
    if (order.delivery_status === 'DELIVERED' && order.payment_method === 'Cash on Delivery') {
      order.payment_status = 'PAID';
    }
    await writeLocalStoreAsync(store);
    return order;
  }
  return null;
}

export async function cancelOrderRecord(orderId, reason = 'Customer requested cancellation') {
  if (!orderId) return null;
  const order = await getOrderRecord(orderId);
  if (!order) return null;

  releaseStockHold(order.id);

  const targetId = order.id;
  const store = await readLocalStoreAsync();
  const localOrder = store.orders.find(o => o.id === targetId || o.id === orderId);
  if (localOrder) {
    localOrder.delivery_status = 'CANCELLED';
    localOrder.payment_status = 'REFUND_INITIATED';
    localOrder.cancellation_reason = reason;
    localOrder.cancelled_at = new Date().toISOString();
    await writeLocalStoreAsync(store);
    return localOrder;
  }
  return null;
}

export async function getOrderRecord(orderOrAwbId) {
  if (!orderOrAwbId) return null;
  const cleanId = String(orderOrAwbId).trim();
  const cleanHyphen = cleanId.startsWith('MM-') ? cleanId : `MM-${cleanId.replace(/^MM_?/, '')}`;
  const cleanUnderscore = cleanId.startsWith('MM_') ? cleanId : `MM_${cleanId.replace(/^MM-?/, '')}`;
  const rawDigits = cleanId.replace(/\D/g, '');

  const store = await readLocalStoreAsync();
  const lower = cleanId.toLowerCase();
  return store.orders.find(o => 
    (o.id && (
      o.id.toLowerCase() === lower || 
      o.id.toLowerCase() === cleanHyphen.toLowerCase() ||
      o.id.toLowerCase() === cleanUnderscore.toLowerCase() ||
      (rawDigits && rawDigits.length >= 4 && o.id.includes(rawDigits))
    )) ||
    (o.shipway_awb && (
      o.shipway_awb.toLowerCase() === lower || 
      (rawDigits && rawDigits.length >= 4 && o.shipway_awb.includes(rawDigits))
    )) ||
    (o.user_phone && rawDigits && o.user_phone.replace(/\D/g, '').includes(rawDigits)) ||
    (o.shipping_phone && rawDigits && o.shipping_phone.replace(/\D/g, '').includes(rawDigits)) ||
    (o.razorpay_order_id && o.razorpay_order_id.toLowerCase() === lower) ||
    (o.payment_id && o.payment_id.toLowerCase() === lower) ||
    (o.shipping_address && o.shipping_address.toLowerCase().includes(lower))
  ) || null;
}

export async function getUserOrders(userEmail) {
  if (!userEmail) return [];
  const cleanEmail = String(userEmail).trim().toLowerCase();
  const store = await readLocalStoreAsync();
  return store.orders.filter(o => (o.user_email || '').toLowerCase() === cleanEmail);
}

export async function getAllOrders() {
  const store = await readLocalStoreAsync();
  return (store.orders || []).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

export function getPincodeShippingTier(pincode) {
  const cleanCode = String(pincode || '').trim();
  if (!/^\d{6}$/.test(cleanCode)) {
    return {
      tier: 1,
      deliveryFee: 49,
      freeDeliveryAbove: 1000,
      zone: 'Local Bengaluru Hyperlocal',
      area: 'Bengaluru Urban'
    };
  }

  const prefix2 = cleanCode.slice(0, 2);
  const prefix3 = cleanCode.slice(0, 3);

  // Tier 1: Local Bengaluru Urban Hub (560xxx)
  if (prefix3 === '560') {
    return {
      tier: 1,
      deliveryFee: 49,
      freeDeliveryAbove: 1000,
      zone: 'Local Bengaluru Hyperlocal',
      area: 'Bengaluru Urban (Central Hub)'
    };
  }

  // Tier 2: Greater Bengaluru & Intra-State Karnataka (561-563, 57, 58, 59, 56)
  if (['561', '562', '563'].includes(prefix3) || ['57', '58', '59', '56'].includes(prefix2)) {
    return {
      tier: 2,
      deliveryFee: 69,
      freeDeliveryAbove: 1000,
      zone: 'Karnataka Regional',
      area: 'Karnataka Regional'
    };
  }

  // Tier 3: South India (50-53, 60-69)
  if (['50', '51', '52', '53', '60', '61', '62', '63', '64', '67', '68', '69'].includes(prefix2)) {
    return {
      tier: 3,
      deliveryFee: 89,
      freeDeliveryAbove: 1000,
      zone: 'South Zone Express',
      area: 'South India'
    };
  }

  // Tier 4: National / Far Away Outstation (11-49, 70-85, etc.)
  return {
    tier: 4,
    deliveryFee: 119,
    freeDeliveryAbove: 1000,
    zone: 'National Delivery (Air Express)',
    area: 'National Outstation'
  };
}

export async function checkPincodeServiceable(pincode) {
  const cleanCode = String(pincode || '').trim();
  if (!/^\d{6}$/.test(cleanCode)) {
    return { serviceable: false, area: '', estTime: '', error: 'Please enter a valid 6-digit Indian PIN code.' };
  }

  const shippingInfo = getPincodeShippingTier(cleanCode);
  const prefix2 = cleanCode.slice(0, 2);
  const prefix3 = cleanCode.slice(0, 3);
  const pNum = parseInt(cleanCode, 10);

  // 1. Local Bengaluru Urban Hub (560001 - 560110)
  if (prefix3 === '560') {
    return {
      serviceable: true,
      pincode: cleanCode,
      area: 'Bengaluru Urban (Central Hub)',
      zone: 'Local Bengaluru Hyperlocal',
      tier: shippingInfo.tier,
      deliveryFee: shippingInfo.deliveryFee,
      freeDeliveryAbove: shippingInfo.freeDeliveryAbove,
      courier: 'Shadowfax / Porter City Express (Shipway Partner)',
      estTime: 'Same-Day Delivery (Within 3–5 Hours)',
      estDays: 0,
      badge: '⚡ Same-Day Delivery'
    };
  }

  // 2. Greater Bengaluru & Rural (561xxx, 562xxx, 563xxx)
  if (['561', '562', '563'].includes(prefix3)) {
    return {
      serviceable: true,
      pincode: cleanCode,
      area: 'Bengaluru Rural & Peri-Urban',
      zone: 'Greater Bengaluru Area',
      tier: shippingInfo.tier,
      deliveryFee: shippingInfo.deliveryFee,
      freeDeliveryAbove: shippingInfo.freeDeliveryAbove,
      courier: 'BlueDart Express (Shipway Partner)',
      estTime: 'Same-Day / Next-Morning Delivery (12–18 Hours)',
      estDays: 1,
      badge: '🚚 Next Morning Delivery'
    };
  }

  // 3. Intra-State Karnataka (57xxxx, 58xxxx, 59xxxx)
  if (['57', '58', '59', '56'].includes(prefix2)) {
    const karnatakaCities = {
      '570': 'Mysuru', '571': 'Mandya', '575': 'Mangaluru', '576': 'Udupi',
      '577': 'Shivamogga', '580': 'Hubballi / Dharwad', '583': 'Ballari / Hospet',
      '585': 'Kalaburagi', '590': 'Belagavi'
    };
    const city = karnatakaCities[prefix3] || 'Karnataka Regional';
    return {
      serviceable: true,
      pincode: cleanCode,
      area: `${city}, Karnataka`,
      zone: 'Intra-State Karnataka',
      tier: shippingInfo.tier,
      deliveryFee: shippingInfo.deliveryFee,
      freeDeliveryAbove: shippingInfo.freeDeliveryAbove,
      courier: 'BlueDart Express / Delhivery (Shipway Logistics)',
      estTime: 'Next-Day Delivery (24–36 Hours)',
      estDays: 1,
      badge: '📦 Next-Day Delivery'
    };
  }

  // 4. South India Tier-1 Metros (Chennai 600xxx, Hyderabad 500xxx, Kochi 682xxx, Coimbatore 641xxx)
  if (['500', '600', '682', '641'].includes(prefix3)) {
    const southMetros = {
      '500': 'Hyderabad / Secunderabad',
      '600': 'Chennai Metro',
      '682': 'Kochi / Ernakulam',
      '641': 'Coimbatore'
    };
    return {
      serviceable: true,
      pincode: cleanCode,
      area: southMetros[prefix3],
      zone: 'South India Tier-1 Metro',
      tier: shippingInfo.tier,
      deliveryFee: shippingInfo.deliveryFee,
      freeDeliveryAbove: shippingInfo.freeDeliveryAbove,
      courier: 'BlueDart Air Priority (Shipway Air Logistics)',
      estTime: '1 to 2 Business Days (Shipway Air Priority)',
      estDays: 2,
      badge: '✈️ Air Express (1–2 Days)'
    };
  }

  // 5. Rest of South India (Andhra Pradesh, Telangana, Tamil Nadu, Kerala)
  if (['50', '51', '52', '53', '60', '61', '62', '63', '64', '67', '68', '69'].includes(prefix2)) {
    const southStates = {
      '50': 'Telangana', '51': 'Rayalaseema, AP', '52': 'Coastal Andhra Pradesh', '53': 'North Andhra Pradesh',
      '60': 'Tamil Nadu North', '61': 'Tamil Nadu Central', '62': 'Madurai, Tamil Nadu', '63': 'Salem, Tamil Nadu',
      '64': 'Coimbatore Region', '67': 'North Kerala (Kozhikode)', '68': 'Central Kerala', '69': 'Thiruvananthapuram, Kerala'
    };
    return {
      serviceable: true,
      pincode: cleanCode,
      area: southStates[prefix2] || 'South India Region',
      zone: 'South Zone Express',
      tier: shippingInfo.tier,
      deliveryFee: shippingInfo.deliveryFee,
      freeDeliveryAbove: shippingInfo.freeDeliveryAbove,
      courier: 'BlueDart / Delhivery (Shipway Air)',
      estTime: '2 to 3 Business Days (Shipway Air Express)',
      estDays: 2.5,
      badge: '✈️ Air Express (2–3 Days)'
    };
  }

  // 6. National Tier-1 Metros (Delhi NCR, Mumbai, Pune, Kolkata, Ahmedabad)
  if (['110', '400', '411', '700', '380'].includes(prefix3)) {
    const nationalMetros = {
      '110': 'Delhi NCR',
      '400': 'Mumbai Metro',
      '411': 'Pune Metro',
      '700': 'Kolkata Metro',
      '380': 'Ahmedabad Metro'
    };
    return {
      serviceable: true,
      pincode: cleanCode,
      area: nationalMetros[prefix3],
      zone: 'National Metro Priority',
      tier: shippingInfo.tier,
      deliveryFee: shippingInfo.deliveryFee,
      freeDeliveryAbove: shippingInfo.freeDeliveryAbove,
      courier: 'BlueDart Air Priority (Shipway Cargo)',
      estTime: '1 to 2 Business Days (Shipway Air Priority)',
      estDays: 2,
      badge: '✈️ Air Express (1–2 Days)'
    };
  }

  // 7. North & West India (UP, Rajasthan, Gujarat, Punjab, Haryana, Himachal, Uttarakhand)
  if (pNum >= 110000 && pNum <= 399999) {
    const northWest = {
      '12': 'Haryana (Gurugram/Faridabad)', '13': 'Haryana North', '14': 'Punjab (Ludhiana/Amritsar)',
      '15': 'Punjab South', '16': 'Chandigarh / Mohali', '17': 'Himachal Pradesh', '18': 'Jammu Region',
      '19': 'Kashmir Valley', '20': 'UP West (Noida/Ghaziabad/Agra)', '21': 'UP Central (Kanpur)',
      '22': 'UP East (Lucknow/Varanasi)', '23': 'UP South', '24': 'Uttarakhand (Dehradun)',
      '25': 'UP Meerut Region', '26': 'Uttarakhand Kumaon', '27': 'UP Gorakhpur', '28': 'UP Jhansi',
      '30': 'Jaipur, Rajasthan', '31': 'Udaipur, Rajasthan', '32': 'Kota, Rajasthan',
      '33': 'Bikaner, Rajasthan', '34': 'Jodhpur, Rajasthan', '36': 'Rajkot, Gujarat',
      '37': 'Kutch, Gujarat', '38': 'Ahmedabad / Gandhinagar', '39': 'Surat / South Gujarat'
    };
    const region = northWest[prefix2] || 'North / West India';
    const isRemote = ['17', '18', '19', '24', '26'].includes(prefix2);
    return {
      serviceable: true,
      pincode: cleanCode,
      area: region,
      zone: isRemote ? 'Special Northern Region' : 'North/West India Air Express',
      tier: shippingInfo.tier,
      deliveryFee: shippingInfo.deliveryFee,
      freeDeliveryAbove: shippingInfo.freeDeliveryAbove,
      courier: 'BlueDart Air Express / Delhivery (Shipway Partner)',
      estTime: isRemote ? '3 to 5 Business Days (Shipway Air)' : '2 to 3 Business Days (Shipway Air Express)',
      estDays: isRemote ? 4 : 2.5,
      badge: isRemote ? '📦 Express Delivery (3–5 Days)' : '✈️ Air Express (2–3 Days)'
    };
  }

  // 8. Central & West India (Maharashtra Rest, MP, Chhattisgarh, Goa)
  if (pNum >= 400000 && pNum <= 499999) {
    const centralWest = {
      '40': 'Mumbai / Thane', '41': 'Pune / Western Maharashtra', '42': 'Nashik / North Maharashtra',
      '43': 'Chhatrapati Sambhajinagar', '44': 'Nagpur / Vidarbha', '45': 'Indore, MP',
      '46': 'Bhopal, MP', '47': 'Gwalior, MP', '48': 'Jabalpur, MP',
      '49': 'Raipur, Chhattisgarh'
    };
    return {
      serviceable: true,
      pincode: cleanCode,
      area: centralWest[prefix2] || 'Maharashtra / Central India',
      zone: 'Central & Western Region',
      tier: shippingInfo.tier,
      deliveryFee: shippingInfo.deliveryFee,
      freeDeliveryAbove: shippingInfo.freeDeliveryAbove,
      courier: 'BlueDart / Delhivery (Shipway Air)',
      estTime: '2 to 3 Business Days (Shipway Air Express)',
      estDays: 2.5,
      badge: '✈️ Air Express (2–3 Days)'
    };
  }

  // 9. East & North-East India (West Bengal, Odisha, Assam, Bihar, Jharkhand, NE States)
  if (pNum >= 700000 && pNum <= 859999) {
    const eastRegions = {
      '70': 'Kolkata Metro', '71': 'Howrah / WB Central', '72': 'Medinipur, WB', '73': 'Siliguri / North Bengal',
      '74': '24 Parganas, WB', '75': 'Bhubaneswar / Cuttack, Odisha', '76': 'Berhampur, Odisha',
      '77': 'Rourkela, Odisha', '78': 'Guwahati / Assam', '79': 'North-East States (Shillong/Imphal/Agartala)',
      '80': 'Patna, Bihar', '81': 'Bhagalpur, Bihar', '82': 'Gaya, Bihar',
      '83': 'Ranchi / Jamshedpur, Jharkhand', '84': 'Muzaffarpur, Bihar', '85': 'Purnia, Bihar'
    };
    const isNE = prefix2 === '78' || prefix2 === '79';
    return {
      serviceable: true,
      pincode: cleanCode,
      area: eastRegions[prefix2] || 'Eastern India',
      zone: isNE ? 'North-East Air Express' : 'East Zone Express',
      tier: shippingInfo.tier,
      deliveryFee: shippingInfo.deliveryFee,
      freeDeliveryAbove: shippingInfo.freeDeliveryAbove,
      courier: 'BlueDart Air Priority / India Post Speed Post (Shipway)',
      estTime: isNE ? '3 to 5 Business Days (Shipway Air Priority)' : '2 to 4 Business Days (Shipway Air Express)',
      estDays: isNE ? 4 : 3,
      badge: isNE ? '✈️ Air Express (3–5 Days)' : '✈️ Air Express (2–4 Days)'
    };
  }

  return {
    serviceable: true,
    pincode: cleanCode,
    area: `India Postal Zone ${cleanCode.slice(0, 1)}`,
    zone: 'National Delivery',
    tier: shippingInfo.tier,
    deliveryFee: shippingInfo.deliveryFee,
    freeDeliveryAbove: shippingInfo.freeDeliveryAbove,
    courier: 'BlueDart / India Post Speed Post (Shipway Partner)',
    estTime: '3 to 5 Business Days (Shipway Express)',
    estDays: 4,
    badge: '📦 Standard National Express (3–5 Days)'
  };
}

export async function saveAbandonedCart({ email, name, phone, items, totalAmount }) {
  if (!email) return null;
  const store = await readLocalStoreAsync();
  const cleanEmail = email.trim().toLowerCase();

  store.abandonedCarts = (store.abandonedCarts || []).filter(c => c.email !== cleanEmail);

  const cartEntry = {
    id: `AC-${Date.now().toString().slice(-6)}`,
    email: cleanEmail,
    name: name || 'Connoisseur',
    phone: phone || '',
    items: items || [],
    totalAmount: totalAmount || 0,
    capturedAt: new Date().toISOString(),
    recovered: false
  };

  store.abandonedCarts.unshift(cartEntry);
  await writeLocalStoreAsync(store);
  return cartEntry;
}

export async function getAbandonedCarts() {
  const store = await readLocalStoreAsync();
  return store.abandonedCarts || [];
}

export async function purgeAllOrders() {
  const store = await readLocalStoreAsync();
  store.orders = [];
  await writeLocalStoreAsync(store);
  if (pgPool) {
    try {
      await pgPool.query('TRUNCATE TABLE orders CASCADE');
    } catch (e) {}
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer Reviews Persistence & Moderation Layer
// ─────────────────────────────────────────────────────────────────────────────

export async function createReviewRecord({ productId, name, email = '', location = 'Bengaluru', rating = 5, text = '', sentiment = 'Loved It', verified = true }) {
  const store = await readLocalStoreAsync();
  if (!store.reviews) store.reviews = [];

  const reviewEntry = {
    id: `rev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    productId: String(productId || 'rose').toLowerCase().trim(),
    name: String(name || 'Connoisseur').trim(),
    email: String(email || '').trim().toLowerCase(),
    location: String(location || 'Bengaluru').trim(),
    rating: Math.max(1, Math.min(5, Number(rating) || 5)),
    text: String(text || '').trim(),
    sentiment: sentiment || 'Loved It',
    verified: Boolean(verified),
    status: 'pending', // 'pending' | 'approved' | 'rejected'
    createdAt: new Date().toISOString()
  };

  store.reviews.unshift(reviewEntry);
  await writeLocalStoreAsync(store);
  return reviewEntry;
}

export async function getApprovedReviews(productId) {
  const store = await readLocalStoreAsync();
  const all = store.reviews || [];
  if (!productId) {
    return all.filter(r => r.status === 'approved');
  }
  const cleanId = String(productId).toLowerCase().trim();
  return all.filter(r => r.status === 'approved' && (r.productId === cleanId || r.productId.includes(cleanId)));
}

export async function getAllReviewsAdmin() {
  const store = await readLocalStoreAsync();
  return store.reviews || [];
}

export async function updateReviewStatus(reviewId, status) {
  const store = await readLocalStoreAsync();
  if (!store.reviews) store.reviews = [];
  const validStatus = ['pending', 'approved', 'rejected'].includes(status) ? status : 'approved';

  const review = store.reviews.find(r => r.id === reviewId);
  if (!review) return null;

  review.status = validStatus;
  review.moderatedAt = new Date().toISOString();
  await writeLocalStoreAsync(store);
  return review;
}

export async function deleteReviewRecord(reviewId) {
  const store = await readLocalStoreAsync();
  if (!store.reviews) return false;
  const initialLen = store.reviews.length;
  store.reviews = store.reviews.filter(r => r.id !== reviewId);
  if (store.reviews.length !== initialLen) {
    await writeLocalStoreAsync(store);
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN NOTIFICATIONS & VIP REWARDS MILESTONE ALERTS
// ─────────────────────────────────────────────────────────────────────────────

export async function saveAdminNotification(notification) {
  const store = await readLocalStoreAsync();
  if (!store.adminNotifications) store.adminNotifications = [];
  const notif = {
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    ...notification,
    created_at: new Date().toISOString()
  };
  store.adminNotifications.unshift(notif);
  if (store.adminNotifications.length > 100) {
    store.adminNotifications = store.adminNotifications.slice(0, 100);
  }
  await writeLocalStoreAsync(store);
  return notif;
}

export async function getAdminNotifications() {
  const store = await readLocalStoreAsync();
  return store.adminNotifications || [];
}

export async function dismissAdminNotification(notificationId) {
  const store = await readLocalStoreAsync();
  if (!store.adminNotifications) return false;
  store.adminNotifications = store.adminNotifications.filter(n => n.id !== notificationId);
  await writeLocalStoreAsync(store);
  return true;
}

export { pgPool };
