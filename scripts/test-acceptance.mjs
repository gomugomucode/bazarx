// BazaarX Automated Authentication & Route Hardening Acceptance Test Suite
// Verifies all 18 security requirements specified in the final hardening spec.

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const results = [];

function assert(condition, testId, description, details = '') {
  const status = condition ? 'PASS' : 'FAIL';
  results.push({ testId, description, status, details });
  console.log(`[${status}] Test ${testId}: ${description}${details ? ' (' + details + ')' : ''}`);
}

async function runAcceptanceTests() {
  console.log('====================================================');
  console.log('BazaarX Acceptance Test Suite - 18 Security Scenarios');
  console.log(`Base URL: ${BASE_URL} | Backend: ${BACKEND_URL}`);
  console.log('====================================================\n');

  // Test 1: GET / (Logged-out public navbar)
  try {
    const res = await fetch(`${BASE_URL}/`);
    const html = await res.text();
    const hasLogin = html.includes('Login');
    const hasRegister = html.includes('Register');
    const hasDashboardLink = html.includes('href="/dashboard"');
    const hasConnectWalletAsAuth = html.includes('Connect Wallet to Authenticate');
    assert(
      res.status === 200 && hasLogin && hasRegister && !hasDashboardLink && !hasConnectWalletAsAuth,
      1,
      'GET / Public Navbar: Login/Register visible; Dashboard & Connect Wallet absent'
    );
  } catch (e) {
    assert(false, 1, 'GET / Public Navbar', e.message);
  }

  // Test 2: Logged-out GET /dashboard (Server-side 307 Redirect)
  try {
    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
    const location = res.headers.get('location') || '';
    assert(
      res.status === 307 && location.includes('/login?redirect=%2Fdashboard'),
      2,
      'Logged-out GET /dashboard redirects to /login?redirect=/dashboard via HTTP 307',
      `Status: ${res.status}, Location: ${location}`
    );
  } catch (e) {
    assert(false, 2, 'Logged-out GET /dashboard', e.message);
  }

  // Test 3: Logged-out GET /profile (Server-side 307 Redirect)
  try {
    const res = await fetch(`${BASE_URL}/profile`, { redirect: 'manual' });
    const location = res.headers.get('location') || '';
    assert(
      res.status === 307 && location.includes('/login?redirect=%2Fprofile'),
      3,
      'Logged-out GET /profile redirects to /login?redirect=/profile via HTTP 307',
      `Status: ${res.status}, Location: ${location}`
    );
  } catch (e) {
    assert(false, 3, 'Logged-out GET /profile', e.message);
  }

  // Test 4: Logged-out GET /orders/ord-80024 (Server-side 307 Redirect)
  try {
    const res = await fetch(`${BASE_URL}/orders/ord-80024`, { redirect: 'manual' });
    const location = res.headers.get('location') || '';
    assert(
      res.status === 307 && location.includes('/login?redirect=%2Forders%2Ford-80024'),
      4,
      'Logged-out GET /orders/<id> redirects to /login?redirect=/orders/<id> via HTTP 307',
      `Status: ${res.status}, Location: ${location}`
    );
  } catch (e) {
    assert(false, 4, 'Logged-out GET /orders/<id>', e.message);
  }

  // Test 5: Logged-out GET /admin (Server-side 307 Redirect)
  try {
    const res = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
    const location = res.headers.get('location') || '';
    assert(
      res.status === 307 && location.includes('/login?redirect=%2Fadmin'),
      5,
      'Logged-out GET /admin redirects to /login?redirect=/admin via HTTP 307',
      `Status: ${res.status}, Location: ${location}`
    );
  } catch (e) {
    assert(false, 5, 'Logged-out GET /admin', e.message);
  }

  // Test 6: Buyer login (Receives valid session, role BUYER)
  let buyerCookie = '';
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'buyer@bazarx.com', password: 'password123' }),
    });
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');
    buyerCookie = setCookie?.match(/bazarx_session=([^;]+)/)?.[0] || '';
    assert(
      res.status === 200 && data.success && data.user?.roles?.includes('BUYER') && Boolean(buyerCookie),
      6,
      'Buyer login receives valid HTTP-only session cookie and role BUYER',
      `Roles: ${JSON.stringify(data.user?.roles)}`
    );
  } catch (e) {
    assert(false, 6, 'Buyer login', e.message);
  }

  // Test 7: Supplier login (Receives valid session, role SUPPLIER)
  let supplierCookie = '';
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'supplier@bazarx.com', password: 'password123' }),
    });
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');
    supplierCookie = setCookie?.match(/bazarx_session=([^;]+)/)?.[0] || '';
    assert(
      res.status === 200 && data.success && data.user?.roles?.includes('SUPPLIER') && Boolean(supplierCookie),
      7,
      'Supplier login receives valid HTTP-only session cookie and role SUPPLIER',
      `Roles: ${JSON.stringify(data.user?.roles)}`
    );
  } catch (e) {
    assert(false, 7, 'Supplier login', e.message);
  }

  // Test 8: Admin login (Receives valid session, role ADMIN)
  let adminCookie = '';
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@bazarx.com', password: 'password123' }),
    });
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');
    adminCookie = setCookie?.match(/bazarx_session=([^;]+)/)?.[0] || '';
    assert(
      res.status === 200 && data.success && data.user?.roles?.includes('ADMIN') && Boolean(adminCookie),
      8,
      'Admin login receives valid HTTP-only session cookie and role ADMIN',
      `Roles: ${JSON.stringify(data.user?.roles)}`
    );
  } catch (e) {
    assert(false, 8, 'Admin login', e.message);
  }

  // Test 9: Buyer attempting supplier dashboard (?role=SUPPLIER)
  try {
    const res = await fetch(`${BASE_URL}/dashboard?role=SUPPLIER`, {
      headers: { Cookie: buyerCookie },
    });
    // Server permits access to /dashboard for authenticated buyer, but the role resolved remains BUYER
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: buyerCookie },
    });
    const meData = await meRes.json();
    const isSupplier = meData.user?.roles?.includes('SUPPLIER');
    assert(
      res.status === 200 && !isSupplier && meData.user?.roles?.includes('BUYER'),
      9,
      'Buyer requesting ?role=SUPPLIER is strictly constrained to BUYER authority',
      `Active Roles: ${JSON.stringify(meData.user?.roles)}`
    );
  } catch (e) {
    assert(false, 9, 'Buyer attempting supplier dashboard', e.message);
  }

  // Test 10: Buyer attempting admin (GET /admin -> 403 Forbidden)
  try {
    const res = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: buyerCookie },
      redirect: 'manual',
    });
    assert(
      res.status === 403,
      10,
      'Authenticated BUYER attempting GET /admin is denied with HTTP 403 Forbidden',
      `Status: ${res.status}`
    );
  } catch (e) {
    assert(false, 10, 'Buyer attempting admin', e.message);
  }

  // Test 11: Supplier attempting admin (GET /admin -> 403 Forbidden)
  try {
    const res = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: supplierCookie },
      redirect: 'manual',
    });
    assert(
      res.status === 403,
      11,
      'Authenticated SUPPLIER attempting GET /admin is denied with HTTP 403 Forbidden',
      `Status: ${res.status}`
    );
  } catch (e) {
    assert(false, 11, 'Supplier attempting admin', e.message);
  }

  // Test 12: Unauthenticated order API (GET /api/orders/ord-80024 -> 401)
  try {
    const res = await fetch(`${BASE_URL}/api/orders/ord-80024`);
    assert(
      res.status === 401,
      12,
      'Unauthenticated GET /api/orders/<id> returns HTTP 401 Unauthorized',
      `Status: ${res.status}`
    );
  } catch (e) {
    assert(false, 12, 'Unauthenticated order API', e.message);
  }

  // Test 13: Authenticated unrelated user requesting another user's order (403)
  try {
    // Register a new independent buyer who does NOT own ord-80024
    const newBuyerEmail = `unrelated_${Date.now()}@bazarx.com`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newBuyerEmail,
        password: 'password123',
        fullName: 'Unrelated Trader',
        businessName: 'Unrelated Traders Pvt Ltd',
        phone: '+977-9811223344',
        citizenshipNumber: '99-88-77-66554',
        role: 'BUYER',
      }),
    });
    const regCookie = regRes.headers.get('set-cookie')?.match(/bazarx_session=([^;]+)/)?.[0] || '';

    // Attempt to access ord-80024
    const orderRes = await fetch(`${BASE_URL}/api/orders/ord-80024`, {
      headers: { Cookie: regCookie },
    });
    assert(
      orderRes.status === 403,
      13,
      'Authenticated unrelated user requesting another user order returns HTTP 403 Forbidden',
      `Status: ${orderRes.status}`
    );
  } catch (e) {
    assert(false, 13, 'Unrelated user requesting another user order', e.message);
  }

  // Test 14: ADMIN registration attempt (Must be rejected with 400)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `hacker_${Date.now()}@bazarx.com`,
        password: 'password123',
        fullName: 'Hacker',
        businessName: 'Fake Org',
        phone: '+977-9800000000',
        citizenshipNumber: '11-22-33-44556',
        role: 'ADMIN',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.success === false,
      14,
      'ADMIN self-registration attempt is strictly rejected with HTTP 400',
      `Error: ${data.error}`
    );
  } catch (e) {
    assert(false, 14, 'ADMIN registration attempt', e.message);
  }

  // Test 15: Duplicate wallet linking (Must be rejected)
  try {
    // Attempt to link Ram Shrestha's existing wallet (6VBKbKRZJ9Vq3ui92JwnuddegkCrGPPmPmKEE2uCEM1K) to supplier account
    const res = await fetch(`${BASE_URL}/api/auth/link-wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: supplierCookie },
      body: JSON.stringify({ wallet: '6VBKbKRZJ9Vq3ui92JwnuddegkCrGPPmPmKEE2uCEM1K' }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.success === false,
      15,
      'Duplicate settlement wallet linking is rejected with HTTP 400',
      `Error: ${data.error}`
    );
  } catch (e) {
    assert(false, 15, 'Duplicate wallet linking', e.message);
  }

  // Test 16: Invalid wallet public key (Non-Base58 or invalid length rejected)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/link-wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
      body: JSON.stringify({ wallet: 'invalid_solana_address!!' }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.success === false,
      16,
      'Invalid wallet public key format rejected with HTTP 400',
      `Error: ${data.error}`
    );
  } catch (e) {
    assert(false, 16, 'Invalid wallet public key', e.message);
  }

  // Test 17: PAN and Citizenship privacy (Never in public responses or URLs)
  try {
    const mktRes = await fetch(`${BASE_URL}/api/products`);
    const mktData = await mktRes.json();
    const mktStr = JSON.stringify(mktData);

    const buyerMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: buyerCookie },
    });
    const buyerMeData = await buyerMeRes.json();

    const notInPublic = !mktStr.includes('citizenshipNumber') && !mktStr.includes('panNumber');
    const maskedInProfile =
      !buyerMeData.user?.citizenshipNumber &&
      buyerMeData.user?.maskedCitizenship?.startsWith('•••••••');

    assert(
      notInPublic && maskedInProfile,
      17,
      'PAN & Citizenship numbers are never exposed publicly and are masked in user profiles',
      `Masked: ${buyerMeData.user?.maskedCitizenship}`
    );
  } catch (e) {
    assert(false, 17, 'PAN and Citizenship privacy', e.message);
  }

  // Test 18: Logout (Session invalidated, protected resources become inaccessible)
  try {
    // 1. Call logout
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: buyerCookie },
    });
    const logoutCookie = logoutRes.headers.get('set-cookie');

    // 2. Attempt to use old session cookie on /api/auth/me
    const meAfterLogout = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: buyerCookie },
    });

    // 3. Attempt to visit /dashboard with old cookie
    const dashAfterLogout = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: buyerCookie },
      redirect: 'manual',
    });

    assert(
      logoutRes.status === 200 &&
        meAfterLogout.status === 401 &&
        dashAfterLogout.status === 307,
      18,
      'Logout invalidates session token server-side and re-locks protected routes',
      `Me Status: ${meAfterLogout.status}, Dashboard Status: ${dashAfterLogout.status}`
    );
  } catch (e) {
    assert(false, 18, 'Logout session invalidation', e.message);
  }

  console.log('\n====================================================');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`ACCEPTANCE SUMMARY: ${passed}/18 PASSED, ${failed}/18 FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAcceptanceTests();
