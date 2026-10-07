// BazaarX Full Marketplace Buyer-Seller Workflow & Boundary Verification
import { setTimeout as sleep } from 'node:timers/promises';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const results = [];

function assert(condition, testId, description, details = '') {
  const status = condition ? 'PASS' : 'FAIL';
  results.push({ testId, description, status, details });
  console.log(`[${status}] Test ${String(testId).padStart(2, '0')}: ${description}${details ? ' (' + details + ')' : ''}`);
}

async function loginUser(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  const cookie = res.headers.get('set-cookie')?.match(/bazarx_session=([^;]+)/)?.[0] || '';
  return { status: res.status, data, cookie };
}

async function runMarketplaceTests() {
  console.log('================================================================');
  console.log('BazaarX Marketplace Buyer-Seller Workflow Test Suite');
  console.log(`Target: ${BASE_URL}`);
  console.log('================================================================\n');

  // Authenticate actors
  console.log('--- Authenticating Actors ---');
  const buyerAuth = await loginUser('buyer@bazarx.com', 'password123');
  const supplier1Auth = await loginUser('supplier@bazarx.com', 'password123');
  const supplier2Auth = await loginUser('supplier2@bazarx.com', 'password123');
  const pendingSupplierAuth = await loginUser('pending_supplier@bazarx.com', 'password123');
  const adminAuth = await loginUser('admin@bazarx.com', 'password123');

  console.log(`Buyer: ${buyerAuth.data.user?.email} (${buyerAuth.data.user?.role})`);
  console.log(`Supplier 1: ${supplier1Auth.data.user?.email} (${supplier1Auth.data.user?.role}, status: ${supplier1Auth.data.user?.verificationStatus})`);
  console.log(`Supplier 2: ${supplier2Auth.data.user?.email} (${supplier2Auth.data.user?.role}, status: ${supplier2Auth.data.user?.verificationStatus})`);
  console.log(`Pending Supplier: ${pendingSupplierAuth.data.user?.email} (${pendingSupplierAuth.data.user?.role}, status: ${pendingSupplierAuth.data.user?.verificationStatus})`);
  console.log(`Admin: ${adminAuth.data.user?.email} (${adminAuth.data.user?.role})\n`);

  let testProduct1Id = null;

  // --- SECTION 1: SUPPLIER PRODUCT CREATION & PERMISSION BOUNDARIES ---
  console.log('--- Section 1: Product Creation & Authorization Boundaries ---');

  // Test 1: Verified Supplier 1 creates a draft product
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: supplier1Auth.cookie,
      },
      body: JSON.stringify({
        name: 'Himalayan Organic Buckwheat Honey 50kg Drum',
        category: 'Grocery',
        description: 'Raw, unpasteurized wild buckwheat honey harvested from Mustang valley.',
        price: 450,
        currency: 'USDC',
        nprPrice: 60000,
        unit: 'drum',
        availableStock: 25,
        minOrderQuantity: 2,
        sku: 'HONEY-MUSTANG-50K',
        status: 'Draft',
      }),
    });
    const data = await res.json();
    testProduct1Id = data.product?.id;
    assert(
      res.status === 201 && data.success && data.product?.status === 'Draft' && data.product?.supplierId === supplier1Auth.data.user.id,
      1,
      'Verified supplier creates a draft product listing',
      `ID: ${testProduct1Id}, Status: ${data.product?.status}, Supplier: ${data.product?.supplierName}`
    );
  } catch (e) {
    assert(false, 1, 'Verified supplier creates a draft product', e.message);
  }

  // Test 2: Pending Supplier is blocked from publishing/creating products
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: pendingSupplierAuth.cookie,
      },
      body: JSON.stringify({
        name: 'Unverified Grain Shipment',
        category: 'Rice & Grains',
        price: 100,
        unit: 'bag',
        availableStock: 50,
        minOrderQuantity: 5,
        status: 'Draft',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 403 && (data.error || '').toLowerCase().includes('pending'),
      2,
      'Pending supplier is rejected with 403 Forbidden verification notice',
      `Status: ${res.status}, Error: ${data.error}`
    );
  } catch (e) {
    assert(false, 2, 'Pending supplier rejected', e.message);
  }

  // Test 3: Buyer is blocked from creating products
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buyerAuth.cookie,
      },
      body: JSON.stringify({
        name: 'Illegal Buyer Listing',
        category: 'Grocery',
        price: 50,
        unit: 'piece',
        availableStock: 10,
        minOrderQuantity: 1,
      }),
    });
    const data = await res.json();
    assert(
      res.status === 403,
      3,
      'Buyer is rejected with 403 Forbidden from product creation',
      `Status: ${res.status}, Error: ${data.error}`
    );
  } catch (e) {
    assert(false, 3, 'Buyer rejected', e.message);
  }

  // Test 4: Unauthenticated user is rejected
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Anonymous Listing',
        price: 100,
      }),
    });
    assert(
      res.status === 401,
      4,
      'Unauthenticated request rejected with 401 Unauthorized',
      `Status: ${res.status}`
    );
  } catch (e) {
    assert(false, 4, 'Unauthenticated rejected', e.message);
  }

  // Test 5: Validation errors (e.g. negative price, 0 MOQ)
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: supplier1Auth.cookie,
      },
      body: JSON.stringify({
        name: 'Invalid Price Listing',
        category: 'Grocery',
        price: -10,
        unit: 'piece',
        availableStock: 10,
        minOrderQuantity: 0,
      }),
    });
    const data = await res.json();
    assert(
      res.status === 400,
      5,
      'Invalid product payload (negative price, 0 MOQ) rejected with 400 Bad Request',
      `Status: ${res.status}, Error: ${data.error}`
    );
  } catch (e) {
    assert(false, 5, 'Invalid payload rejected', e.message);
  }

  // --- SECTION 2: PRODUCT MANAGEMENT & OWNERSHIP ISOLATION ---
  console.log('\n--- Section 2: Product Management & Cross-Supplier Isolation ---');

  // Test 6: Supplier 1 publishes the draft product
  try {
    const res = await fetch(`${BASE_URL}/api/products/${testProduct1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: supplier1Auth.cookie,
      },
      body: JSON.stringify({
        status: 'Published',
        availableStock: 20,
      }),
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.success && data.product?.status === 'Published' && data.product?.availableStock === 20,
      6,
      'Supplier 1 publishes draft product and updates stock to 20',
      `Status: ${data.product?.status}, Stock: ${data.product?.availableStock}`
    );
  } catch (e) {
    assert(false, 6, 'Supplier 1 publishes draft', e.message);
  }

  // Test 7: Supplier 2 attempts to edit Supplier 1's product -> Rejected
  try {
    const res = await fetch(`${BASE_URL}/api/products/${testProduct1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: supplier2Auth.cookie,
      },
      body: JSON.stringify({
        price: 1, // Maliciously low price
      }),
    });
    const data = await res.json();
    assert(
      res.status === 403,
      7,
      'Supplier 2 cannot edit Supplier 1 product (403 Forbidden)',
      `Status: ${res.status}, Error: ${data.error}`
    );
  } catch (e) {
    assert(false, 7, 'Cross-supplier edit rejected', e.message);
  }

  // Test 8: Supplier 2 attempts to archive Supplier 1's product -> Rejected
  try {
    const res = await fetch(`${BASE_URL}/api/products/${testProduct1Id}`, {
      method: 'DELETE',
      headers: {
        Cookie: supplier2Auth.cookie,
      },
    });
    const data = await res.json();
    assert(
      res.status === 403,
      8,
      'Supplier 2 cannot archive Supplier 1 product (403 Forbidden)',
      `Status: ${res.status}, Error: ${data.error}`
    );
  } catch (e) {
    assert(false, 8, 'Cross-supplier archive rejected', e.message);
  }

  // Test 9: Supplier 1's supplierOnly inventory view returns their products
  try {
    const res = await fetch(`${BASE_URL}/api/products?supplierOnly=true`, {
      headers: { Cookie: supplier1Auth.cookie },
    });
    const data = await res.json();
    const products = data.products || [];
    const allOwned = products.every((p) => p.supplierId === supplier1Auth.data.user.id);
    const hasProduct = products.some((p) => p.id === testProduct1Id);
    assert(
      res.status === 200 && allOwned && hasProduct,
      9,
      'Supplier 1 retrieves only their own listings in supplier view',
      `Count: ${products.length}, Contains new product: ${hasProduct}`
    );
  } catch (e) {
    assert(false, 9, 'Supplier 1 inventory view', e.message);
  }

  // --- SECTION 3: MARKETPLACE BROWSING, SEARCH, CATEGORY & SORT ---
  console.log('\n--- Section 3: Buyer Marketplace Browsing, Filtering & Details ---');

  // Test 10: Published product appears in public marketplace
  try {
    const res = await fetch(`${BASE_URL}/api/products`);
    const data = await res.json();
    const products = data.products || [];
    const hasPublished = products.some((p) => p.id === testProduct1Id && p.status === 'Published');
    const noDrafts = products.every((p) => p.status === 'Published');
    assert(
      res.status === 200 && hasPublished && noDrafts,
      10,
      'Public marketplace displays published product and zero drafts',
      `Total published: ${products.length}, Has test product: ${hasPublished}`
    );
  } catch (e) {
    assert(false, 10, 'Public marketplace displays published product', e.message);
  }

  // Test 11: Category filter works
  try {
    const res = await fetch(`${BASE_URL}/api/products?category=Grocery`);
    const data = await res.json();
    const products = data.products || [];
    const allGrocery = products.length > 0 && products.every((p) => p.category === 'Grocery');
    assert(
      res.status === 200 && allGrocery,
      11,
      'Category filter "?category=Grocery" accurately filters results',
      `Count: ${products.length}`
    );
  } catch (e) {
    assert(false, 11, 'Category filter', e.message);
  }

  // Test 12: Search query filter works
  try {
    const res = await fetch(`${BASE_URL}/api/products?search=Buckwheat`);
    const data = await res.json();
    const products = data.products || [];
    const hasMatch = products.some((p) => p.id === testProduct1Id);
    assert(
      res.status === 200 && hasMatch,
      12,
      'Search query "?search=Buckwheat" returns matching product',
      `Match count: ${products.length}`
    );
  } catch (e) {
    assert(false, 12, 'Search filter', e.message);
  }

  // Test 13: Sort order works (price-desc)
  try {
    const res = await fetch(`${BASE_URL}/api/products?sort=price-desc`);
    const data = await res.json();
    const products = data.products || [];
    let isSorted = true;
    for (let i = 0; i < products.length - 1; i++) {
      const p1 = products[i].priceUsdc ?? products[i].price;
      const p2 = products[i + 1].priceUsdc ?? products[i + 1].price;
      if (p1 < p2) {
        isSorted = false;
        break;
      }
    }
    assert(
      res.status === 200 && products.length > 0 && isSorted,
      13,
      'Sort order "?sort=price-desc" correctly orders descending by price',
      `First: $${products[0]?.priceUsdc ?? products[0]?.price}, Last: $${products[products.length - 1]?.priceUsdc ?? products[products.length - 1]?.price}`
    );
  } catch (e) {
    assert(false, 13, 'Sort order', e.message);
  }

  // Test 14: Fetch single product details
  try {
    const res = await fetch(`${BASE_URL}/api/products/${testProduct1Id}`);
    const data = await res.json();
    const productPrice = data.product?.priceUsdc ?? data.product?.price;
    assert(
      res.status === 200 && data.product?.id === testProduct1Id && data.product?.sku === 'HONEY-MUSTANG-50K',
      14,
      'Fetch single product details via /api/products/[id]',
      `Name: ${data.product?.name}, Price: $${productPrice}`
    );
  } catch (e) {
    assert(false, 14, 'Fetch product details', e.message);
  }

  // --- SECTION 4: REAL ORDER CREATION & STOCK ATOMICITY ---
  console.log('\n--- Section 4: Real Order Creation, Validations & Concurrency ---');

  // Test 15: Ordering below MOQ is rejected
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buyerAuth.cookie,
      },
      body: JSON.stringify({
        productId: testProduct1Id,
        quantity: 1, // MOQ is 2
      }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && (data.error || '').toLowerCase().includes('minimum'),
      15,
      'Order below MOQ (qty 1 < MOQ 2) rejected with 400 Bad Request',
      `Status: ${res.status}, Error: ${data.error}`
    );
  } catch (e) {
    assert(false, 15, 'Below MOQ rejected', e.message);
  }

  // Test 16: Ordering more than available stock is rejected
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buyerAuth.cookie,
      },
      body: JSON.stringify({
        productId: testProduct1Id,
        quantity: 9999, // available is 20
      }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && (data.error || '').toLowerCase().includes('stock'),
      16,
      'Order exceeding available stock (qty 9999 > stock 20) rejected with 400 Bad Request',
      `Status: ${res.status}, Error: ${data.error}`
    );
  } catch (e) {
    assert(false, 16, 'Exceeding stock rejected', e.message);
  }

  // Test 17: Supplier ordering own product (self-trading) is rejected
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: supplier1Auth.cookie,
      },
      body: JSON.stringify({
        productId: testProduct1Id,
        quantity: 2,
      }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && (data.error || '').toLowerCase().includes('own product'),
      17,
      'Supplier self-trading purchase blocked with 400 Bad Request',
      `Status: ${res.status}, Error: ${data.error}`
    );
  } catch (e) {
    assert(false, 17, 'Self trading blocked', e.message);
  }

  // Test 18: Unauthenticated buyer cannot place order
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: testProduct1Id,
        quantity: 2,
      }),
    });
    assert(
      res.status === 401,
      18,
      'Unauthenticated order placement rejected with 401 Unauthorized',
      `Status: ${res.status}`
    );
  } catch (e) {
    assert(false, 18, 'Unauthenticated order rejected', e.message);
  }

  // Test 19: Buyer places valid order for quantity 4 (price $450 x 4 = $1800)
  let createdOrderId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buyerAuth.cookie,
      },
      body: JSON.stringify({
        productId: testProduct1Id,
        quantity: 4,
      }),
    });
    const data = await res.json();
    createdOrderId = data.order?.id;
    const orderTotal = data.order?.amountUsdc ?? data.order?.totalAmount;
    const orderState = data.order?.state ?? data.order?.status;
    assert(
      (res.status === 200 || res.status === 201) && data.success && orderTotal === 1800 && (orderState === 'Created' || orderState === 'CREATED'),
      19,
      'Buyer successfully places valid wholesale order (4 drums x $450 = $1800 USDC)',
      `Order ID: ${createdOrderId}, State: ${orderState}, Total: $${orderTotal}`
    );
  } catch (e) {
    assert(false, 19, 'Buyer places valid order', e.message);
  }

  // Test 20: Product stock atomically deducted by 4 (20 - 4 = 16)
  try {
    const res = await fetch(`${BASE_URL}/api/products/${testProduct1Id}`);
    const data = await res.json();
    assert(
      res.status === 200 && data.product?.availableStock === 16,
      20,
      'Product stock atomically deducted on order placement (20 -> 16)',
      `Current stock: ${data.product?.availableStock}`
    );
  } catch (e) {
    assert(false, 20, 'Stock deducted check', e.message);
  }

  // Test 21: Order appears in Buyer order history
  try {
    const res = await fetch(`${BASE_URL}/api/orders?role=buyer`, {
      headers: { Cookie: buyerAuth.cookie },
    });
    const data = await res.json();
    const orders = data.orders || [];
    const hasOrder = orders.some((o) => o.id === createdOrderId);
    assert(
      res.status === 200 && hasOrder,
      21,
      'Created order appears in buyer order history',
      `Buyer order count: ${orders.length}, Has order: ${hasOrder}`
    );
  } catch (e) {
    assert(false, 21, 'Buyer order history check', e.message);
  }

  // Test 22: Order appears in Supplier 1 incoming orders
  try {
    const res = await fetch(`${BASE_URL}/api/orders?role=supplier`, {
      headers: { Cookie: supplier1Auth.cookie },
    });
    const data = await res.json();
    const orders = data.orders || [];
    const hasOrder = orders.some((o) => o.id === createdOrderId);
    assert(
      res.status === 200 && hasOrder,
      22,
      'Created order appears in Supplier 1 incoming orders',
      `Supplier 1 order count: ${orders.length}, Has order: ${hasOrder}`
    );
  } catch (e) {
    assert(false, 22, 'Supplier 1 incoming orders check', e.message);
  }

  // Test 23: Order does NOT appear in Supplier 2 incoming orders
  try {
    const res = await fetch(`${BASE_URL}/api/orders?role=supplier`, {
      headers: { Cookie: supplier2Auth.cookie },
    });
    const data = await res.json();
    const orders = data.orders || [];
    const hasOrder = orders.some((o) => o.id === createdOrderId);
    assert(
      res.status === 200 && !hasOrder,
      23,
      'Created order is completely isolated from Supplier 2',
      `Supplier 2 order count: ${orders.length}, Has Supplier 1 order: ${hasOrder}`
    );
  } catch (e) {
    assert(false, 23, 'Supplier 2 isolation check', e.message);
  }

  // Test 24: Single order detail access boundary
  try {
    // Buyer can read it
    const buyerRes = await fetch(`${BASE_URL}/api/orders/${createdOrderId}`, {
      headers: { Cookie: buyerAuth.cookie },
    });
    // Supplier 1 can read it
    const sup1Res = await fetch(`${BASE_URL}/api/orders/${createdOrderId}`, {
      headers: { Cookie: supplier1Auth.cookie },
    });
    // Supplier 2 is forbidden (403)
    const sup2Res = await fetch(`${BASE_URL}/api/orders/${createdOrderId}`, {
      headers: { Cookie: supplier2Auth.cookie },
    });
    assert(
      buyerRes.status === 200 && sup1Res.status === 200 && sup2Res.status === 403,
      24,
      'Order detail access enforced: Buyer=200, Owner Supplier=200, Unrelated Supplier=403',
      `Buyer: ${buyerRes.status}, Sup1: ${sup1Res.status}, Sup2: ${sup2Res.status}`
    );
  } catch (e) {
    assert(false, 24, 'Order detail access enforcement', e.message);
  }

  // --- SECTION 5: ARCHIVING & DEACTIVATION ---
  console.log('\n--- Section 5: Archiving & Listing Deactivation ---');

  // Test 25: Supplier 1 archives the product
  try {
    const res = await fetch(`${BASE_URL}/api/products/${testProduct1Id}`, {
      method: 'DELETE',
      headers: { Cookie: supplier1Auth.cookie },
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.success && data.product?.status === 'Archived',
      25,
      'Supplier 1 deactivates/archives the product listing',
      `Status: ${data.product?.status}`
    );
  } catch (e) {
    assert(false, 25, 'Supplier 1 archives product', e.message);
  }

  // Test 26: Archived product no longer visible in public marketplace
  try {
    const res = await fetch(`${BASE_URL}/api/products`);
    const data = await res.json();
    const products = data.products || [];
    const hasArchived = products.some((p) => p.id === testProduct1Id);
    assert(
      res.status === 200 && !hasArchived,
      26,
      'Archived product is immediately removed from public buyer marketplace',
      `Has archived: ${hasArchived}`
    );
  } catch (e) {
    assert(false, 26, 'Archived product hidden from marketplace', e.message);
  }

  // --- SUMMARY ---
  console.log('\n================================================================');
  console.log('MARKETPLACE TEST SUITE RESULTS SUMMARY');
  console.log('================================================================');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);

  if (failed > 0) {
    console.error('\nFAILURES:');
    results.filter((r) => r.status === 'FAIL').forEach((r) => {
      console.error(`- Test ${r.testId}: ${r.description} -> ${r.details}`);
    });
    process.exit(1);
  } else {
    console.log('\nALL 26 MARKETPLACE WORKFLOW & BOUNDARY TESTS PASSED PERFECTLY!');
  }
}

runMarketplaceTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
