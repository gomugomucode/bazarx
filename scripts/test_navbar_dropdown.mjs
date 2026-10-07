// scripts/test_navbar_dropdown.mjs
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

console.log('====================================================');
console.log('Testing Navbar: Devnet Removal & User Dropdown');
console.log('====================================================');

let allPassed = true;
function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName} - ${details}`);
    allPassed = false;
  }
}

async function runTests() {
  // 1. Static inspection of Navbar.tsx
  const navbarFile = path.resolve('frontend/components/Navbar.tsx');
  const navbarContent = fs.readFileSync(navbarFile, 'utf8');

  assert(
    !navbarContent.includes('NetworkStatus'),
    'Navbar: NetworkStatus component completely removed from navbar'
  );

  assert(
    !navbarContent.includes('>DEVNET<') && !navbarContent.includes('Solana Devnet'),
    'Navbar: "DEVNET" and "Solana Devnet" text completely removed from Navbar'
  );

  assert(
    navbarContent.includes('userDropdownOpen') &&
    navbarContent.includes('userDropdownRef') &&
    navbarContent.includes('handleMouseEnter') &&
    navbarContent.includes('handleMouseLeave') &&
    navbarContent.includes('handleToggleClick'),
    'Navbar: Hover and click event handlers implemented for user dropdown'
  );

  assert(
    navbarContent.includes('user-profile-menu-button') &&
    navbarContent.includes('dropdown-profile-link') &&
    navbarContent.includes('dropdown-logout-button'),
    'Navbar: Dropdown markup includes trigger button, Profile link, and Logout action'
  );

  // 2. Static inspection of WalletButton.tsx
  const walletFile = path.resolve('frontend/components/WalletButton.tsx');
  const walletContent = fs.readFileSync(walletFile, 'utf8');
  assert(
    !walletContent.includes('/* Devnet Tag */'),
    'WalletButton: DEVNET badge removed from navbar trigger pill'
  );

  // 3. Test HTTP / (Logged-out public navbar in <header>)
  const resHome = await fetch(`${BASE_URL}/`);
  const htmlHome = await resHome.text();
  const headerHtml = htmlHome.substring(
    htmlHome.indexOf('<header'),
    htmlHome.indexOf('</header>') + 9
  );
  assert(
    !headerHtml.includes('DEVNET') && !headerHtml.includes('Solana Devnet'),
    'GET /: Rendered public navbar header does not contain DEVNET or Solana Devnet'
  );

  // 4. Test Buyer Login & Dropdown Data Integrity
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'buyer@bazarx.com',
      password: 'password123',
    }),
  });

  const cookie = loginRes.headers.get('set-cookie');
  const loginData = await loginRes.json();

  assert(
    loginRes.ok && loginData.user?.businessName === 'Kathmandu Valley Wholesale Buyer',
    'Auth API: Successfully logged in as Kathmandu Valley Wholesale Buyer'
  );

  // 5. Test Authenticated Profile Route
  const profileRes = await fetch(`${BASE_URL}/profile`, {
    headers: { Cookie: cookie },
  });
  assert(
    profileRes.status === 200,
    'GET /profile: Authenticated profile route accessible (HTTP 200)'
  );

  // 6. Test Authenticated Dashboard Route
  const dashRes = await fetch(`${BASE_URL}/dashboard`, {
    headers: { Cookie: cookie },
  });
  const dashHtml = await dashRes.text();
  assert(
    dashRes.status === 200,
    'GET /dashboard: Authenticated dashboard route accessible (HTTP 200)'
  );

  // 7. Test Logout API
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: cookie },
  });
  assert(
    logoutRes.ok,
    'POST /api/auth/logout: Logout action invalidates session successfully'
  );

  console.log('====================================================');
  if (allPassed) {
    console.log('ALL NAVBAR & DROPDOWN CHECKS PASSED (7/7)!');
    process.exit(0);
  } else {
    console.error('SOME CHECKS FAILED!');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
