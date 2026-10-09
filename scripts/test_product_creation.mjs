// Test suite for BazaarX Supplier Product Creation, Management & Boundaries
import assert from 'node:assert';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  const cookie = res.headers.get('set-cookie')?.match(/bazarx_session=([^;]+)/)?.[0] || '';
  return { status: res.status, data, cookie };
}

async function runTests() {
  console.log('================================================================');
  console.log('BazaarX Supplier Product Creation Test Suite');
  console.log(`Target: ${BASE_URL}`);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function report(name, condition, details = '') {
    if (condition) {
      passed++;
      console.log(`[PASS] ${name}${details ? ' - ' + details : ''}`);
    } else {
      failed++;
      console.error(`[FAIL] ${name}${details ? ' - ' + details : ''}`);
    }
  }

  // 1. Authenticate Actors
  console.log('--- Step 1: Authenticating Actors ---');
  const supplier = await login('supplier@bazarx.com', 'password123');
  report('Supplier Login', supplier.status === 200 && supplier.data.success, `Role: ${supplier.data.user?.role}`);

  const supplier2 = await login('supplier2@bazarx.com', 'password123');
  report('Supplier 2 Login', supplier2.status === 200 && supplier2.data.success);

  const buyer = await login('buyer@bazarx.com', 'password123');
  report('Buyer Login', buyer.status === 200 && buyer.data.success, `Role: ${buyer.data.user?.role}`);

  let createdProductId = null;
  const sampleDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  // 2. Create Product as Supplier (Draft)
  console.log('\n--- Step 2: Creating Product with Image Upload (Data URL) ---');
  const createRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: supplier.cookie,
    },
    body: JSON.stringify({
      name: 'Chitwan Mustard Oil 15L Commercial Can',
      category: 'Cooking Oil',
      description: 'Cold-pressed extra-virgin mustard oil from Chitwan valley for commercial kitchens.',
      priceUsdc: 42,
      priceNpr: 5586,
      unit: '15L Can',
      minOrder: 5,
      availableStock: 80,
      sku: 'SKU-CHITWAN-15L',
      imageUrl: sampleDataUrl,
      status: 'Draft',
    }),
  });

  const createData = await createRes.json();
  createdProductId = createData.product?.id;
  report(
    'Create Product API returns 201 Created',
    createRes.status === 201 && createData.success === true,
    `ID: ${createdProductId}`
  );
  report(
    'Created product has correct supplier ownership',
    createData.product?.supplierId === supplier.data.user.id,
    `Supplier: ${createData.product?.supplierName}`
  );
  report(
    'Uploaded image data URL is properly preserved without corruption',
    createData.product?.imageUrl === sampleDataUrl,
    'Data URL matched'
  );
  report(
    'Created product has Draft status',
    createData.product?.status === 'Draft'
  );

  // 3. Retrieve Product by ID
  console.log('\n--- Step 3: Fetching Product by ID ---');
  const getRes = await fetch(`${BASE_URL}/api/products/${createdProductId}`);
  const getData = await getRes.json();
  report(
    'GET /api/products/:id returns 200',
    getRes.status === 200 && getData.success === true && getData.product?.id === createdProductId,
    `Name: ${getData.product?.name}`
  );

  // 4. Draft Listing Isolation
  console.log('\n--- Step 4: Verifying Draft Product Isolation ---');
  const marketplaceRes1 = await fetch(`${BASE_URL}/api/products`);
  const marketplaceData1 = await marketplaceRes1.json();
  const foundInPublic1 = marketplaceData1.products?.some((p) => p.id === createdProductId);
  report(
    'Draft product is NOT visible in public buyer marketplace',
    foundInPublic1 === false,
    `Found in marketplace: ${foundInPublic1}`
  );

  const supplierListRes1 = await fetch(`${BASE_URL}/api/products?supplierOnly=true`, {
    headers: { Cookie: supplier.cookie },
  });
  const supplierListData1 = await supplierListRes1.json();
  const foundInSupplierList1 = supplierListData1.products?.some((p) => p.id === createdProductId);
  report(
    'Draft product IS visible in owner supplier inventory',
    foundInSupplierList1 === true,
    `Found in supplier inventory: ${foundInSupplierList1}`
  );

  // 5. Update Product Details
  console.log('\n--- Step 5: Updating Product Stock and Price ---');
  const updateRes = await fetch(`${BASE_URL}/api/products/${createdProductId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: supplier.cookie,
    },
    body: JSON.stringify({
      priceUsdc: 45,
      availableStock: 120,
    }),
  });
  const updateData = await updateRes.json();
  report(
    'PUT /api/products/:id successfully updates stock & price',
    updateRes.status === 200 &&
      updateData.product?.priceUsdc === 45 &&
      updateData.product?.availableStock === 120,
    `New Price: $${updateData.product?.priceUsdc}, New Stock: ${updateData.product?.availableStock}`
  );

  // 6. Publish Product
  console.log('\n--- Step 6: Publishing Product to Marketplace ---');
  const publishRes = await fetch(`${BASE_URL}/api/products/${createdProductId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: supplier.cookie,
    },
    body: JSON.stringify({
      status: 'Published',
    }),
  });
  const publishData = await publishRes.json();
  report(
    'PUT /api/products/:id updates status to Published',
    publishRes.status === 200 && publishData.product?.status === 'Published'
  );

  const marketplaceRes2 = await fetch(`${BASE_URL}/api/products`);
  const marketplaceData2 = await marketplaceRes2.json();
  const foundInPublic2 = marketplaceData2.products?.some((p) => p.id === createdProductId);
  report(
    'Published product is now LIVE in public buyer marketplace',
    foundInPublic2 === true,
    `Found in marketplace: ${foundInPublic2}`
  );

  // 7. Security Boundaries
  console.log('\n--- Step 7: Authorization and Security Boundaries ---');
  // Buyer cannot create products
  const buyerCreateRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: buyer.cookie,
    },
    body: JSON.stringify({
      name: 'Unauthorized Buyer Listing',
      category: 'Grocery',
      description: 'Buyer attempting product creation',
      priceUsdc: 10,
      unit: 'piece',
      availableStock: 10,
      minOrder: 1,
    }),
  });
  report(
    'Buyer cannot create product (403 Forbidden)',
    buyerCreateRes.status === 403,
    `Status: ${buyerCreateRes.status}`
  );

  // Unauthenticated visitor cannot create products
  const anonCreateRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Anonymous Listing',
      category: 'Grocery',
      description: 'No session listing',
      priceUsdc: 10,
      unit: 'piece',
      availableStock: 10,
      minOrder: 1,
    }),
  });
  report(
    'Unauthenticated user cannot create product (401 Unauthorized)',
    anonCreateRes.status === 401,
    `Status: ${anonCreateRes.status}`
  );

  // Supplier 2 cannot edit Supplier 1's product
  const crossEditRes = await fetch(`${BASE_URL}/api/products/${createdProductId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: supplier2.cookie,
    },
    body: JSON.stringify({
      priceUsdc: 1,
    }),
  });
  report(
    'Cross-supplier editing blocked (403 Forbidden)',
    crossEditRes.status === 403,
    `Status: ${crossEditRes.status}`
  );

  // 8. Payload Validations
  console.log('\n--- Step 8: Input Validations ---');
  const shortNameRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: supplier.cookie,
    },
    body: JSON.stringify({
      name: 'ab', // < 3 chars
      category: 'Grocery',
      description: 'Valid length description',
      priceUsdc: 10,
      unit: 'piece',
      availableStock: 10,
      minOrder: 1,
    }),
  });
  report('Short name (< 3 chars) rejected with 400', shortNameRes.status === 400);

  const negPriceRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: supplier.cookie,
    },
    body: JSON.stringify({
      name: 'Valid Product Name',
      category: 'Grocery',
      description: 'Valid length description',
      priceUsdc: -5,
      unit: 'piece',
      availableStock: 10,
      minOrder: 1,
    }),
  });
  report('Negative price rejected with 400', negPriceRes.status === 400);

  // 9. Cleanup
  console.log('\n--- Step 9: Cleanup Test Product ---');
  const archiveRes = await fetch(`${BASE_URL}/api/products/${createdProductId}`, {
    method: 'DELETE',
    headers: { Cookie: supplier.cookie },
  });
  report('Test product successfully archived and cleaned up', archiveRes.status === 200);

  console.log('\n================================================================');
  console.log(`PRODUCT CREATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
