/**
 * End-to-End Presentation Workflow Integration Test
 * Verifies all 7 Stages:
 * Stage 1: Registration and Login (Person A, Person B, Person C)
 * Stage 2: Person B Tracks Watches
 * Stage 3: Person A Submits a Watch (status: UNDER_VALIDATION)
 * Stage 4: Initial Notification to Person B (and NOT to Person D)
 * Stage 5: Person C Verifies the Product (Authorization check & UNDER_VALIDATION -> APPROVED)
 * Stage 6: Second Notification to Person B (APPROVED notification, duplicate prevention)
 * Stage 7: Person B Opens the Approved Product
 */

const http = require('http');
const app = require('./backend/server');

const runTest = async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`\n======================================================`);
  console.log(`Starting Presentation Workflow Test Server on ${baseUrl}`);
  console.log(`======================================================\n`);

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  };

  try {
    const timestamp = Date.now();

    // -----------------------------------------------------------------------
    // STAGE 1: Registration and Login
    // -----------------------------------------------------------------------
    console.log(`\n[STAGE 1] Testing User Registration and Independent Accounts...`);

    // Person A (Regular User)
    const emailA = `persona_${timestamp}@lastro.com`;
    const resRegA = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password: 'password123', name: 'Person A', role: 'Comprador' })
    });
    const dataRegA = await resRegA.json();
    assert(resRegA.status === 201 && dataRegA.token, `Person A registered successfully (ID: ${dataRegA.user?.id})`);
    const tokenA = dataRegA.token;
    const userAId = dataRegA.user.id;

    // Person B (Regular User)
    const emailB = `personb_${timestamp}@lastro.com`;
    const resRegB = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailB, password: 'password123', name: 'Person B', role: 'Comprador' })
    });
    const dataRegB = await resRegB.json();
    assert(resRegB.status === 201 && dataRegB.token, `Person B registered successfully (ID: ${dataRegB.user?.id})`);
    const tokenB = dataRegB.token;
    const userBId = dataRegB.user.id;

    assert(userAId !== userBId, 'Person A and Person B have distinct, isolated user accounts');

    // Person C (Store Representative)
    const emailC = `personc_store_${timestamp}@lastro.com`;
    const resRegC = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailC, password: 'password123', name: 'Person C (Curadoria)', role: 'EquipeLastro' })
    });
    const dataRegC = await resRegC.json();
    assert(resRegC.status === 201 && dataRegC.user?.role === 'EquipeLastro', `Person C registered with Store Representative role (ID: ${dataRegC.user?.id})`);
    const tokenC = dataRegC.token;
    const userCId = dataRegC.user.id;

    // Person D (Control User - Non-tracker)
    const emailD = `persond_control_${timestamp}@lastro.com`;
    const resRegD = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailD, password: 'password123', name: 'Person D', role: 'Comprador' })
    });
    const dataRegD = await resRegD.json();
    const tokenD = dataRegD.token;
    const userDId = dataRegD.user.id;

    // Test Login for Person B
    const resLoginB = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailB, password: 'password123' })
    });
    const dataLoginB = await resLoginB.json();
    assert(resLoginB.status === 200 && dataLoginB.token, 'Person B can log in and obtain valid authenticated session');

    // Browse Catalog
    const resBrowse = await fetch(`${baseUrl}/api/pecas`);
    const catalogItems = await resBrowse.json();
    assert(resBrowse.status === 200 && Array.isArray(catalogItems), `Both users can browse available products (${catalogItems.length} items loaded)`);

    // -----------------------------------------------------------------------
    // STAGE 2: Person B Tracks Watches
    // -----------------------------------------------------------------------
    console.log(`\n[STAGE 2] Person B Tracks the Category "Watches"...`);

    const resTrack = await fetch(`${baseUrl}/api/categorias-rastreadas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ userId: userBId, categoria: 'Watches' })
    });
    const dataTrack = await resTrack.json();
    assert(resTrack.status === 201 || resTrack.status === 200, 'Person B added "Watches" to tracked categories');

    // Retrieve tracked categories for Person B
    const resGetTrack = await fetch(`${baseUrl}/api/categorias-rastreadas?userId=${userBId}`);
    const trackedList = await resGetTrack.json();
    const isWatchesTracked = trackedList.some((t) => t.categoria.toLowerCase() === 'watches');
    assert(isWatchesTracked, 'Person B sees "Watches" persisted in their tracked categories');

    // Test Duplicate Subscription
    const resDupTrack = await fetch(`${baseUrl}/api/categorias-rastreadas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ userId: userBId, categoria: 'Watches' })
    });
    assert(resDupTrack.status === 200, 'Duplicate category tracking request handled gracefully without duplication');

    // -----------------------------------------------------------------------
    // STAGE 3: Person A Submits a Watch
    // -----------------------------------------------------------------------
    console.log(`\n[STAGE 3] Person A Submits a Product "Watch"...`);

    const watchPayload = {
      name: 'Watch',
      category: 'Watches',
      price: 245000,
      description: 'Cronógrafo clássico em platina com movimento mecânico manufaturado.',
      ownerId: userAId,
      provenance: 'Coleção particular Genebra',
      conservationState: 'Excelente',
      image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=1000&auto=format&fit=crop'
    };

    const resSubmit = await fetch(`${baseUrl}/api/pecas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify(watchPayload)
    });
    const createdWatch = await resSubmit.json();
    assert(resSubmit.status === 201 && createdWatch.id, `Product "Watch" created successfully with ID: ${createdWatch.id}`);
    assert(createdWatch.status === 'UNDER_VALIDATION', `Product status is explicitly persisted as UNDER_VALIDATION (Current: ${createdWatch.status})`);

    // Verify Public Visibility
    const resPublicCatalog = await fetch(`${baseUrl}/api/pecas`);
    const allPieces = await resPublicCatalog.json();
    const foundInCatalog = allPieces.find((p) => p.id === createdWatch.id);
    assert(foundInCatalog && foundInCatalog.status === 'UNDER_VALIDATION', 'Submitted Watch is immediately publicly visible in catalog with UNDER_VALIDATION status');

    // Verify Detail Page Accessibility
    const resDetail = await fetch(`${baseUrl}/api/pecas/${createdWatch.id}`);
    const detailData = await resDetail.json();
    assert(resDetail.status === 200 && detailData.name === 'Watch' && detailData.status === 'UNDER_VALIDATION', 'Watch is accessible via product detail API with pending verification status');

    // -----------------------------------------------------------------------
    // STAGE 4: Initial Notification to Person B
    // -----------------------------------------------------------------------
    console.log(`\n[STAGE 4] Checking Initial Notification to Person B...`);

    const resNotifB = await fetch(`${baseUrl}/api/notificacoes?userId=${userBId}`);
    const notifsB = await resNotifB.json();
    const pendingNotifB = notifsB.find((n) => n.tipo === 'peca_pendente' && Number(n.peca_id) === Number(createdWatch.id));
    assert(Boolean(pendingNotifB), `Person B received initial notification for submitted Watch (ID: ${pendingNotifB?.id})`);
    assert(pendingNotifB?.acao_url === `/peca/${createdWatch.id}`, `Notification links to submitted Watch details: ${pendingNotifB?.acao_url}`);

    // Verify Non-tracking user (Person D) does NOT receive the notification
    const resNotifD = await fetch(`${baseUrl}/api/notificacoes?userId=${userDId}`);
    const notifsD = await resNotifD.json();
    const uninvitedNotifD = notifsD.find((n) => Number(n.peca_id) === Number(createdWatch.id));
    assert(!uninvitedNotifD, 'Control user (Person D, who does NOT track Watches) did NOT receive the notification');

    // -----------------------------------------------------------------------
    // STAGE 5: Person C Verifies the Product
    // -----------------------------------------------------------------------
    console.log(`\n[STAGE 5] Person C (Store Representative) Verifies the Product...`);

    // Verify security: Regular user cannot approve
    const resUnauthorizedApproval = await fetch(`${baseUrl}/api/pecas/${createdWatch.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ status: 'APPROVED' })
    });
    assert(resUnauthorizedApproval.status === 403, 'Regular user without store authorization is correctly rejected (403 Forbidden)');

    // Store Representative approves the product
    const resApprove = await fetch(`${baseUrl}/api/pecas/${createdWatch.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenC}` },
      body: JSON.stringify({ status: 'APPROVED', expertName: 'Curadoria Lastro' })
    });
    const approvedResult = await resApprove.json();
    assert(resApprove.status === 200, 'Person C successfully approved the product');
    assert(approvedResult.peca?.status === 'APPROVED', `Product status transitioned to APPROVED (Current: ${approvedResult.peca?.status})`);

    // Test Idempotency / Repeated approval
    const resRepeatApprove = await fetch(`${baseUrl}/api/pecas/${createdWatch.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenC}` },
      body: JSON.stringify({ status: 'APPROVED' })
    });
    assert(resRepeatApprove.status === 200, 'Repeated approval request handled cleanly without errors');

    // -----------------------------------------------------------------------
    // STAGE 6: Second Notification to Person B
    // -----------------------------------------------------------------------
    console.log(`\n[STAGE 6] Checking Second Notification (Approval) to Person B...`);

    const resNotifB2 = await fetch(`${baseUrl}/api/notificacoes?userId=${userBId}`);
    const notifsB2 = await resNotifB2.json();

    const approvalNotifB = notifsB2.find((n) => n.tipo === 'peca_aprovada' && Number(n.peca_id) === Number(createdWatch.id));
    assert(Boolean(approvalNotifB), `Person B received second notification about Watch approval (ID: ${approvalNotifB?.id})`);

    const watchNotifsCount = notifsB2.filter((n) => Number(n.peca_id) === Number(createdWatch.id));
    assert(watchNotifsCount.length === 2, `Person B has exactly 2 notifications (1 pending + 1 approved) with zero duplicates (Count: ${watchNotifsCount.length})`);

    // -----------------------------------------------------------------------
    // STAGE 7: Person B Opens the Approved Product
    // -----------------------------------------------------------------------
    console.log(`\n[STAGE 7] Person B Opens the Approved Product...`);

    // Person B marks notification as read
    const resMarkRead = await fetch(`${baseUrl}/api/notificacoes/${approvalNotifB.id}/ler?userId=${userBId}`, {
      method: 'PATCH'
    });
    assert(resMarkRead.status === 200, 'Person B opened/read the approval notification');

    // Person B navigates to the Watch
    const resFinalWatch = await fetch(`${baseUrl}${approvalNotifB.acao_url}`);
    const finalWatch = await resFinalWatch.json();
    assert(resFinalWatch.status === 200 && finalWatch.name === 'Watch', 'Person B successfully navigated to the Watch details');
    assert(finalWatch.status === 'APPROVED', `Watch complete information reflects APPROVED status (Status: ${finalWatch.status})`);
    assert(finalWatch.expertName === 'Curadoria Lastro', `Watch reflects credentialed expert approval: ${finalWatch.expertName}`);

  } catch (err) {
    console.error('\nUnexpected Error during test:', err);
    failed++;
  } finally {
    server.close();
    console.log(`\n======================================================`);
    console.log(`Test Execution Completed: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);
    if (failed > 0) {
      process.exit(1);
    }
  }
};

runTest();
