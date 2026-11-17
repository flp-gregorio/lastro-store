/**
 * End-to-End 16-Step Presentation Workflow Integration Test
 * Category: "Relógios" · Product: "Relógio"
 *
 * Roles:
 * - Person A (Comprador): Registers, logs in, browses catalog, submits "Relógio"
 * - Person B (Comprador): Registers, logs in, browses catalog, tracks "Relógios", receives 2 notifications, views verified "Relógio"
 * - Person C (EquipeLastro): Independently accesses store interface, reviews and approves "Relógio"
 * - Person D (Comprador - Control): Does NOT track "Relógios", receives 0 notifications
 */

const http = require('http');
const app = require('./backend/server');
const supabase = require('./backend/config/supabase');

const runTest = async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`\n======================================================`);
  console.log(`Starting 16-Step Presentation Workflow Test on ${baseUrl}`);
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
    // STEP 1: Person A registers and logs in
    // -----------------------------------------------------------------------
    console.log(`\n[STEP 1/16] Person A (Comprador) registers and logs in...`);
    const emailA = `persona_${timestamp}@lastro.com`;
    const resRegA = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password: 'password123', name: 'Pessoa A', role: 'Comprador' })
    });
    const dataRegA = await resRegA.json();
    assert(resRegA.status === 201 && Boolean(dataRegA.token), `Person A registered (ID: ${dataRegA.user?.id})`);

    const resLoginA = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password: 'password123' })
    });
    const dataLoginA = await resLoginA.json();
    assert(resLoginA.status === 200 && Boolean(dataLoginA.token), 'Person A logged in with valid session token');
    const tokenA = dataLoginA.token || dataRegA.token;
    const userAId = dataRegA.user.id;

    // -----------------------------------------------------------------------
    // STEP 2: Person B registers and logs in (isolated account) + Control D
    // -----------------------------------------------------------------------
    console.log(`\n[STEP 2/16] Person B (Comprador) registers and logs in independently...`);
    const emailB = `personb_${timestamp}@lastro.com`;
    const resRegB = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailB, password: 'password123', name: 'Pessoa B', role: 'Comprador' })
    });
    const dataRegB = await resRegB.json();
    assert(resRegB.status === 201 && Boolean(dataRegB.token), `Person B registered (ID: ${dataRegB.user?.id})`);

    const resLoginB = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailB, password: 'password123' })
    });
    const dataLoginB = await resLoginB.json();
    assert(resLoginB.status === 200 && Boolean(dataLoginB.token), 'Person B logged in with valid session token');
    const tokenB = dataLoginB.token || dataRegB.token;
    const userBId = dataRegB.user.id;
    assert(userAId !== userBId && tokenA !== tokenB, 'Person A and Person B have isolated user IDs and sessions');

    // Control User D (does NOT track Relógios)
    const emailD = `persond_control_${timestamp}@lastro.com`;
    const resRegD = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailD, password: 'password123', name: 'Pessoa D (Controle)', role: 'Comprador' })
    });
    const dataRegD = await resRegD.json();
    const userDId = dataRegD.user.id;
    assert(Boolean(userDId && dataRegD.token), `Control user Person D registered (ID: ${userDId})`);

    // -----------------------------------------------------------------------
    // STEP 3: Both browse available products
    // -----------------------------------------------------------------------
    console.log(`\n[STEP 3/16] Both Person A and Person B browse available products...`);
    const resBrowseA = await fetch(`${baseUrl}/api/pecas`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const catalogA = await resBrowseA.json();
    const resBrowseB = await fetch(`${baseUrl}/api/pecas`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const catalogB = await resBrowseB.json();
    assert(
      resBrowseA.status === 200 && resBrowseB.status === 200 && Array.isArray(catalogA) && Array.isArray(catalogB),
      `Person A and B can browse catalog (${catalogA.length} items loaded)`
    );

    // -----------------------------------------------------------------------
    // STEP 4: Person B tracks the existing category "Relógios"
    // -----------------------------------------------------------------------
    console.log(`\n[STEP 4/16] Person B tracks the category "Relógios"...`);
    const resTrack = await fetch(`${baseUrl}/api/categorias-rastreadas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ userId: userBId, categoria: 'Relógios' })
    });
    const trackResult = await resTrack.json();
    assert(
      (resTrack.status === 201 || resTrack.status === 200) && trackResult.data?.categoria === 'Relógios',
      'Person B tracked category "Relógios"'
    );

    const resGetTrack = await fetch(`${baseUrl}/api/categorias-rastreadas?userId=${userBId}`);
    const trackedList = await resGetTrack.json();
    assert(
      Array.isArray(trackedList) && trackedList.some((t) => t.categoria === 'Relógios'),
      'Person B sees "Relógios" persisted in tracked categories'
    );

    const resDupTrack = await fetch(`${baseUrl}/api/categorias-rastreadas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ userId: userBId, categoria: 'Relógios' })
    });
    assert(resDupTrack.status === 200, 'Duplicate category tracking handled gracefully without duplication');

    // -----------------------------------------------------------------------
    // STEP 5: Person A submits a new product named "Relógio"
    // -----------------------------------------------------------------------
    console.log(`\n[STEP 5/16] Person A submits a new product "Relógio" in "Relógios"...`);
    const productPayload = {
      name: 'Relógio',
      category: 'Relógios',
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
      body: JSON.stringify(productPayload)
    });
    const createdRelogio = await resSubmit.json();
    assert(
      resSubmit.status === 201 && Boolean(createdRelogio.id) && createdRelogio.name === 'Relógio' && createdRelogio.category === 'Relógios',
      `Product "Relógio" created in category "Relógios" (ID: ${createdRelogio.id})`
    );

    // Repeat submission idempotency check
    const resRepeatSubmit = await fetch(`${baseUrl}/api/pecas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify(productPayload)
    });
    const repeatRelogio = await resRepeatSubmit.json();
    assert(
      resRepeatSubmit.status === 200 && Number(repeatRelogio.id) === Number(createdRelogio.id),
      'Repeated submission returns existing pending product without duplicating piece or notifications'
    );

    // -----------------------------------------------------------------------
    // STEP 6: Verify "Relógio" immediately appears publicly with status Em análise
    // -----------------------------------------------------------------------
    console.log(`\n[STEP 6/16] Verify "Relógio" is immediately public with pending status...`);
    const resPublicCatalog = await fetch(`${baseUrl}/api/pecas`);
    const allPieces = await resPublicCatalog.json();
    const foundInCatalog = allPieces.find((p) => Number(p.id) === Number(createdRelogio.id));
    assert(
      Boolean(foundInCatalog) && foundInCatalog.status === 'UNDER_VALIDATION' && foundInCatalog.isPublished !== false,
      'Submitted "Relógio" is immediately publicly visible with UNDER_VALIDATION ("Em análise") status'
    );

    const resDetail = await fetch(`${baseUrl}/api/pecas/${createdRelogio.id}`);
    const detailData = await resDetail.json();
    assert(
      resDetail.status === 200 && detailData.name === 'Relógio' && detailData.status === 'UNDER_VALIDATION',
      '"Relógio" accessible on public product details endpoint with pending status'
    );

    // -----------------------------------------------------------------------
    // STEP 7: Verify Person B receives the first notification
    // -----------------------------------------------------------------------
    console.log(`\n[STEP 7/16] Verify Person B receives the first notification...`);
    const resNotifB1 = await fetch(`${baseUrl}/api/notificacoes?userId=${userBId}`);
    const notifsB1 = await resNotifB1.json();
    const pendingNotifB = notifsB1.find(
      (n) => n.tipo === 'peca_pendente' && Number(n.peca_id) === Number(createdRelogio.id)
    );
    assert(
      Boolean(pendingNotifB) && pendingNotifB.mensagem.includes('Relógios'),
      `Person B received initial pending notification referencing "Relógios" (ID: ${pendingNotifB?.id})`
    );
    assert(
      pendingNotifB?.acao_url === `/peca/${createdRelogio.id}`,
      `Initial notification navigates to /peca/${createdRelogio.id}`
    );

    // -----------------------------------------------------------------------
    // STEP 8: Verify Control User D does NOT receive the first notification
    // -----------------------------------------------------------------------
    console.log(`\n[STEP 8/16] Verify user not tracking "Relógios" does NOT receive the notification...`);
    const resNotifD1 = await fetch(`${baseUrl}/api/notificacoes?userId=${userDId}`);
    const notifsD1 = await resNotifD1.json();
    const uninvitedD1 = notifsD1.find((n) => Number(n.peca_id) === Number(createdRelogio.id));
    assert(!uninvitedD1, 'Control user D (not tracking Relógios) did NOT receive first notification');

    // -----------------------------------------------------------------------
    // STEP 9: Person C accesses the store interface independently
    // -----------------------------------------------------------------------
    console.log(`\n[STEP 9/16] Person C (EquipeLastro) registers & logs in independently...`);
    const emailC = `personc_store_${timestamp}@lastro.com`;
    const resRegC = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailC, password: 'password123', name: 'Pessoa C (Curadoria)', role: 'EquipeLastro' })
    });
    const dataRegC = await resRegC.json();
    const resLoginC = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailC, password: 'password123' })
    });
    const dataLoginC = await resLoginC.json();
    const tokenC = dataLoginC.token || dataRegC.token;
    assert(
      resRegC.status === 201 && resLoginC.status === 200 && dataRegC.user?.role === 'EquipeLastro' && Boolean(tokenC),
      `Person C authenticated with store role EquipeLastro (ID: ${dataRegC.user?.id})`
    );

    // Security check: regular buyer Person A cannot approve
    const resForbidden = await fetch(`${baseUrl}/api/pecas/${createdRelogio.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ status: 'APPROVED' })
    });
    assert(resForbidden.status === 403, 'Regular user A is rejected from verifying products (403 Forbidden)');

    // -----------------------------------------------------------------------
    // STEP 10: Person C locates the pending "Relógio"
    // -----------------------------------------------------------------------
    console.log(`\n[STEP 10/16] Person C locates the pending "Relógio" submission...`);
    const resStoreQueue = await fetch(`${baseUrl}/api/pecas`, {
      headers: { Authorization: `Bearer ${tokenC}` }
    });
    const storeQueue = await resStoreQueue.json();
    const pendingInQueue = storeQueue.find(
      (p) => Number(p.id) === Number(createdRelogio.id) && p.status === 'UNDER_VALIDATION'
    );
    assert(Boolean(pendingInQueue), 'Person C located pending "Relógio" in store curadoria queue');

    // -----------------------------------------------------------------------
    // STEP 11: Person C approves "Relógio"
    // -----------------------------------------------------------------------
    console.log(`\n[STEP 11/16] Person C approves "Relógio"...`);
    const resApprove = await fetch(`${baseUrl}/api/pecas/${createdRelogio.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenC}` },
      body: JSON.stringify({ status: 'APPROVED', expertName: 'Curadoria Lastro' })
    });
    const approvedResult = await resApprove.json();
    assert(
      resApprove.status === 200 && approvedResult.peca?.status === 'APPROVED',
      `Person C approved "Relógio" -> status transitioned to APPROVED`
    );

    // Repeated approval must stay idempotent without extra notifications
    const resRepeatApprove = await fetch(`${baseUrl}/api/pecas/${createdRelogio.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenC}` },
      body: JSON.stringify({ status: 'APPROVED' })
    });
    assert(resRepeatApprove.status === 200, 'Repeated approval request handled idempotently');

    // -----------------------------------------------------------------------
    // STEP 12: Verify product status persists in Supabase across fresh read
    // -----------------------------------------------------------------------
    console.log(`\n[STEP 12/16] Verify product status persistence in Supabase...`);
    const { data: persistedEvent } = supabase
      ? await supabase
          .from('eventos')
          .select('event_name, peca_id, metadata')
          .eq('event_name', 'curadoria_decidida')
          .eq('peca_id', createdRelogio.id)
          .maybeSingle()
      : { data: null };
    assert(
      Boolean(persistedEvent && persistedEvent.metadata?.status === 'APPROVED'),
      'Verified APPROVED curation state persisted in Supabase (curadoria_decidida / pecas)'
    );

    // -----------------------------------------------------------------------
    // STEP 13: Verify Person B receives the second notification (zero duplicates)
    // -----------------------------------------------------------------------
    console.log(`\n[STEP 13/16] Verify Person B receives the approval notification without duplicates...`);
    const resNotifB2 = await fetch(`${baseUrl}/api/notificacoes?userId=${userBId}`);
    const notifsB2 = await resNotifB2.json();
    const approvalNotifB = notifsB2.find(
      (n) => n.tipo === 'peca_aprovada' && Number(n.peca_id) === Number(createdRelogio.id)
    );
    const matchingCountB = notifsB2.filter((n) => Number(n.peca_id) === Number(createdRelogio.id)).length;
    assert(
      Boolean(approvalNotifB) && approvalNotifB.mensagem.includes('Relógios'),
      `Person B received approval notification referencing "Relógios" (ID: ${approvalNotifB?.id})`
    );
    assert(
      matchingCountB === 2,
      `Person B has exactly 2 notifications for "Relógio" (1 pending + 1 approved, Count: ${matchingCountB})`
    );

    // -----------------------------------------------------------------------
    // STEP 14: Verify unrelated user D does NOT receive the second notification
    // -----------------------------------------------------------------------
    console.log(`\n[STEP 14/16] Verify unrelated user D does NOT receive the second notification...`);
    const resNotifD2 = await fetch(`${baseUrl}/api/notificacoes?userId=${userDId}`);
    const notifsD2 = await resNotifD2.json();
    const uninvitedD2 = notifsD2.find((n) => Number(n.peca_id) === Number(createdRelogio.id));
    assert(!uninvitedD2, 'Control user D still has 0 notifications for "Relógio"');

    // -----------------------------------------------------------------------
    // STEP 15: Person B opens the approval notification
    // -----------------------------------------------------------------------
    console.log(`\n[STEP 15/16] Person B opens/reads the approval notification...`);
    const resMarkRead = await fetch(`${baseUrl}/api/notificacoes/${approvalNotifB.id}/ler?userId=${userBId}`, {
      method: 'PATCH'
    });
    const markReadData = await resMarkRead.json();
    assert(
      resMarkRead.status === 200 && markReadData.notificacao?.lida === true,
      'Person B opened/marked the approval notification as read'
    );

    // -----------------------------------------------------------------------
    // STEP 16: Person B views the approved "Relógio"
    // -----------------------------------------------------------------------
    console.log(`\n[STEP 16/16] Person B navigates to and views the approved "Relógio"...`);
    const resFinalWatch = await fetch(`${baseUrl}${approvalNotifB.acao_url}`);
    const finalWatch = await resFinalWatch.json();
    assert(
      resFinalWatch.status === 200 &&
        finalWatch.name === 'Relógio' &&
        finalWatch.category === 'Relógios' &&
        finalWatch.status === 'APPROVED' &&
        finalWatch.expertName === 'Curadoria Lastro',
      `Person B views approved "Relógio" (Status: ${finalWatch.status}, Category: ${finalWatch.category}, Expert: ${finalWatch.expertName})`
    );

    const resFinalPublic = await fetch(`${baseUrl}/api/pecas`);
    const finalCatalog = await resFinalPublic.json();
    const approvedInCatalog = finalCatalog.find((p) => Number(p.id) === Number(createdRelogio.id));
    assert(
      Boolean(approvedInCatalog) && approvedInCatalog.status === 'APPROVED',
      '"Relógio" remains publicly accessible in catalog with APPROVED status'
    );
  } catch (err) {
    console.error('\nUnexpected Error during test:', err);
    failed++;
  } finally {
    server.close();
    console.log(`\n======================================================`);
    console.log(`16-Step Test Completed: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);
    if (failed > 0) {
      process.exit(1);
    }
  }
};

runTest();
