// BazaarX Role-Based Transaction Visibility & Access Boundary Verification Suite
// Verifies Buyer, Supplier, Admin visibility boundaries, query parameter tampering prevention, and order authorization.

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const results = [];

function assert(condition, testId, description, details = '') {
  const status = condition ? 'PASS' : 'FAIL';
  results.push({ testId, description, status, details });
  console.log(`[${status}] Test ${testId}: ${description}${details ? ' (' + details + ')' : ''}`);
}

async function loginUser(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  const cookie = res.headers.get('set-cookie')?.match(/bazarx_session=([^;]+)/)?.[0] || '';
  return { data, cookie };
}

async function runRoleVisibilityTests() {
  console.log('================================================================');
  console.log('BazaarX Role Visibility & Transaction Boundary Test Suite');
  console.log(`Target: ${BASE_URL}`);
  console.log('================================================================\n');

  // 1. Authenticate actors
  const buyerAuth = await loginUser('buyer@bazarx.com', 'password123');
  const supplierAuth = await loginUser('supplier@bazarx.com', 'password123');
  const adminAuth = await loginUser('admin@bazarx.com', 'password123');

  // --- BUYER TESTS ---
  console.log('\n--- Category: BUYER VISIBILITY & ACCESS ---');

  // Test 1: Buyer sees their own orders
  try {
    const res = await fetch(`${BASE_URL}/api/orders?role=buyer`, {
      headers: { Cookie: buyerAuth.cookie },
    });
    const data = await res.json();
    const orders = data.orders || [];
    const allBuyer = orders.length > 0 && orders.every(
      (o) =>
        o.buyerWallet?.toLowerCase() === buyerAuth.data.user.wallet?.toLowerCase() ||
        o.buyerEmail?.toLowerCase() === buyerAuth.data.user.email?.toLowerCase() ||
        o.buyerName === buyerAuth.data.user.businessName
    );
    assert(
      res.status === 200 && data.success && allBuyer,
      1,
      'Buyer retrieves only orders where they are the buyer',
      `Count: ${orders.length}, Order IDs: ${orders.map((o) => o.id).join(', ')}`
    );
  } catch (e) {
    assert(false, 1, 'Buyer retrieves orders', e.message);
  }

  // Test 2: Buyer does NOT see another buyer's orders (e.g. ord-80027, ord-80028)
  try {
    const res = await fetch(`${BASE_URL}/api/orders?role=buyer`, {
      headers: { Cookie: buyerAuth.cookie },
    });
    const data = await res.json();
    const orders = data.orders || [];
    const containsOther = orders.some((o) => o.id === 'ord-80027' || o.id === 'ord-80028');
    assert(
      res.status === 200 && !containsOther,
      2,
      'Buyer does NOT see another buyer orders (ord-80027, ord-80028)',
      `Found other orders: ${containsOther}`
    );
  } catch (e) {
    assert(false, 2, 'Buyer isolation check', e.message);
  }

  // Test 3: Buyer cannot retrieve another user's order by direct ID (GET /api/orders/ord-80027 -> 403)
  try {
    const res = await fetch(`${BASE_URL}/api/orders/ord-80027`, {
      headers: { Cookie: buyerAuth.cookie },
    });
    assert(
      res.status === 403,
      3,
      'Buyer cannot retrieve another user order by direct ID (HTTP 403)',
      `Status: ${res.status}`
    );
  } catch (e) {
    assert(false, 3, 'Buyer direct order ID access', e.message);
  }

  // Test 4: Buyer cannot access admin endpoint (GET /admin -> 403)
  try {
    const res = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: buyerAuth.cookie },
      redirect: 'manual',
    });
    assert(
      res.status === 403,
      4,
      'Buyer cannot access admin route (HTTP 403 Forbidden)',
      `Status: ${res.status}`
    );
  } catch (e) {
    assert(false, 4, 'Buyer admin route access', e.message);
  }

  // --- SUPPLIER TESTS ---
  console.log('\n--- Category: SUPPLIER VISIBILITY & ACCESS ---');

  // Test 5: Supplier sees only orders where they are designated supplier
  try {
    const res = await fetch(`${BASE_URL}/api/orders?role=supplier`, {
      headers: { Cookie: supplierAuth.cookie },
    });
    const data = await res.json();
    const orders = data.orders || [];
    const allSupplier = orders.length > 0 && orders.every(
      (o) =>
        o.supplierWallet?.toLowerCase() === supplierAuth.data.user.wallet?.toLowerCase() ||
        o.supplierEmail?.toLowerCase() === supplierAuth.data.user.email?.toLowerCase() ||
        o.supplierName === supplierAuth.data.user.businessName
    );
    assert(
      res.status === 200 && data.success && allSupplier,
      5,
      'Supplier sees only incoming orders for goods they supply',
      `Count: ${orders.length}, Order IDs: ${orders.map((o) => o.id).join(', ')}`
    );
  } catch (e) {
    assert(false, 5, 'Supplier retrieves orders', e.message);
  }

  // Test 6: Supplier does NOT see another supplier's orders (e.g. ord-80025, ord-80026)
  try {
    const res = await fetch(`${BASE_URL}/api/orders?role=supplier`, {
      headers: { Cookie: supplierAuth.cookie },
    });
    const data = await res.json();
    const orders = data.orders || [];
    const containsOtherSuppliers = orders.some(
      (o) => o.id === 'ord-80025' || o.id === 'ord-80026'
    );
    assert(
      res.status === 200 && !containsOtherSuppliers,
      6,
      'Supplier does NOT see other suppliers orders (ord-80025 Annapurna, ord-80026 Ilam Tea)',
      `Contained other: ${containsOtherSuppliers}`
    );
  } catch (e) {
    assert(false, 6, 'Supplier isolation check', e.message);
  }

  // Test 7: Supplier cannot retrieve another supplier's order by direct ID (GET /api/orders/ord-80025 -> 403)
  try {
    const res = await fetch(`${BASE_URL}/api/orders/ord-80025`, {
      headers: { Cookie: supplierAuth.cookie },
    });
    assert(
      res.status === 403,
      7,
      'Supplier cannot retrieve another supplier order by direct ID (HTTP 403)',
      `Status: ${res.status}`
    );
  } catch (e) {
    assert(false, 7, 'Supplier direct order ID access', e.message);
  }

  // Test 8: Supplier cannot access admin route (GET /admin -> 403)
  try {
    const res = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: supplierAuth.cookie },
      redirect: 'manual',
    });
    assert(
      res.status === 403,
      8,
      'Supplier cannot access admin route (HTTP 403 Forbidden)',
      `Status: ${res.status}`
    );
  } catch (e) {
    assert(false, 8, 'Supplier admin route access', e.message);
  }

  // --- ADMIN TESTS ---
  console.log('\n--- Category: ADMIN VISIBILITY & RECONCILIATION ---');

  // Test 9: Admin can view all marketplace orders
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      headers: { Cookie: adminAuth.cookie },
    });
    const data = await res.json();
    const orders = data.orders || [];
    const hasMultipleBuyers = new Set(orders.map((o) => o.buyerWallet)).size > 1;
    const hasMultipleSuppliers = new Set(orders.map((o) => o.supplierWallet)).size > 1;
    assert(
      res.status === 200 && data.success && orders.length >= 5 && hasMultipleBuyers && hasMultipleSuppliers,
      9,
      'Admin views all marketplace orders across buyers and suppliers',
      `Total: ${orders.length}`
    );
  } catch (e) {
    assert(false, 9, 'Admin view all orders', e.message);
  }

  // Test 10: Admin can filter complete transaction list by state
  try {
    const res = await fetch(`${BASE_URL}/api/orders?state=Completed`, {
      headers: { Cookie: adminAuth.cookie },
    });
    const data = await res.json();
    const orders = data.orders || [];
    const allCompleted = orders.length > 0 && orders.every((o) => o.state === 'Completed');
    assert(
      res.status === 200 && allCompleted,
      10,
      'Admin can filter complete transaction list by state (e.g. Completed)',
      `Completed count: ${orders.length}`
    );
  } catch (e) {
    assert(false, 10, 'Admin filter by state', e.message);
  }

  // Test 11: Admin can access any order detail directly
  try {
    const res = await fetch(`${BASE_URL}/api/orders/ord-80024`, {
      headers: { Cookie: adminAuth.cookie },
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.success && data.order?.id === 'ord-80024',
      11,
      'Admin can inspect any order and transaction signatures',
      `Order: ${data.order?.id}`
    );
  } catch (e) {
    assert(false, 11, 'Admin order inspection', e.message);
  }

  // --- TAMPERING & SECURITY BOUNDARIES ---
  console.log('\n--- Category: TAMPERING & AUTHORIZATION INVARIANTS ---');

  // Test 12: Buyer query-parameter role tampering (?role=ADMIN) does not elevate permissions
  try {
    const res = await fetch(`${BASE_URL}/api/orders?role=ADMIN`, {
      headers: { Cookie: buyerAuth.cookie },
    });
    const data = await res.json();
    const orders = data.orders || [];
    // Should still only return buyer's own orders or []
    const containsOther = orders.some((o) => o.id === 'ord-80027');
    assert(
      res.status === 200 && !containsOther,
      12,
      'Query-parameter role tampering (?role=ADMIN) does not elevate permissions',
      `Other orders leaked: ${containsOther}`
    );
  } catch (e) {
    assert(false, 12, 'Role tampering test', e.message);
  }

  // Test 13: Client-supplied wallet tampering (?wallet=other_wallet) is ignored for non-admin
  try {
    const otherWallet = '8bhuiuQKXQrkofbqzqv3v9TiTJKNHBkq6VR72wnKsBDP'; // supplier wallet
    const res = await fetch(`${BASE_URL}/api/orders?wallet=${otherWallet}`, {
      headers: { Cookie: buyerAuth.cookie },
    });
    const data = await res.json();
    const orders = data.orders || [];
    const leakedSupplierOnly = orders.some((o) => o.id === 'ord-80027');
    assert(
      res.status === 200 && !leakedSupplierOnly,
      13,
      'Client-supplied wallet tampering does not override authenticated identity',
      `Leaked other wallet orders: ${leakedSupplierOnly}`
    );
  } catch (e) {
    assert(false, 13, 'Wallet tampering test', e.message);
  }

  // Test 14: Logged-out users cannot access order data (HTTP 401)
  try {
    const res = await fetch(`${BASE_URL}/api/orders`);
    assert(
      res.status === 401,
      14,
      'Logged-out users cannot access order API (HTTP 401 Unauthorized)',
      `Status: ${res.status}`
    );
  } catch (e) {
    assert(false, 14, 'Logged-out API check', e.message);
  }

  // Test 15: Unauthorized order mutations are rejected (Buyer trying to accept an order)
  try {
    const res = await fetch(`${BASE_URL}/api/orders/ord-80024`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: buyerAuth.cookie },
      body: JSON.stringify({ nextState: 'Accepted' }),
    });
    // Either 400 (invalid state because already Accepted) or 403 (unauthorized role)
    assert(
      res.status === 400 || res.status === 403,
      15,
      'Unauthorized order state mutations are rejected with 400 or 403',
      `Status: ${res.status}`
    );
  } catch (e) {
    assert(false, 15, 'Unauthorized mutation test', e.message);
  }

  console.log('\n================================================================');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`ROLE VISIBILITY SUMMARY: ${passed}/${results.length} PASSED, ${failed}/${results.length} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRoleVisibilityTests();
