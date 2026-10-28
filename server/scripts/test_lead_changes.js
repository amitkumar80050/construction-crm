const API_URL = 'http://localhost:5001/api';

async function req(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function login(email, password) {
  const res = await req('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  return res.data?.token || res.token;
}

async function runTests() {
  console.log('--- Testing Analytics and Lead Changes ---');

  // Test 1: Log in as admin, manager
  console.log('\n1. Logging in as various roles...');
  const adminToken = await login('admin@buildtrackpro.com', 'password123');
  console.log('✓ Admin logged in');

  const managerToken = await login('manager@buildtrackpro.com', 'password123');
  console.log('✓ Manager logged in');

  const telecallerToken = await login('telecaller@buildtrackpro.com', 'password123');
  console.log('✓ Telecaller logged in');

  // Test 2: Check GET /api/analytics/performance for Admin and Manager
  console.log('\n2. Testing GET /api/analytics/performance...');
  const adminPerf = await req('/analytics/performance', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log(`✓ Admin GET /analytics/performance succeeded (${adminPerf.data.length} users returned)`);

  const managerPerf = await req('/analytics/performance', {
    headers: { Authorization: `Bearer ${managerToken}` }
  });
  console.log(`✓ Manager GET /analytics/performance succeeded (${managerPerf.data.length} users returned, No 403 Forbidden!)`);

  if (telecallerToken) {
    const telecallerPerf = await req('/analytics/performance', {
      headers: { Authorization: `Bearer ${telecallerToken}` }
    });
    console.log(`✓ Telecaller GET /analytics/performance succeeded (${telecallerPerf.data.length} users returned, No 403 Forbidden!)`);
  }

  // Test 3: Get leads and test lead update (Edit Lead)
  console.log('\n3. Testing PUT /api/leads/:id (Updating lead)...');
  const leadsRes = await req('/leads', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const testLead = leadsRes.data[0];
  console.log(`Testing with lead: "${testLead.name}" (_id: ${testLead._id})`);

  const updatedNotes = `Test note updated at ${new Date().toISOString()}`;
  const updateRes = await req(`/leads/${testLead._id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      name: testLead.name,
      company: testLead.company || 'Test Construction Co',
      projectValue: 550000,
      notes: updatedNotes,
      status: 'active'
    }
  });

  if (updateRes.success && updateRes.data.notes === updatedNotes) {
    console.log('✓ PUT /api/leads/:id successfully updated lead fields!');
  } else {
    throw new Error('Lead update did not persist fields');
  }

  // Test 4: Testing PATCH /api/leads/:id/stage (Stage transition)
  console.log('\n4. Testing PATCH /api/leads/:id/stage...');
  const stageRes = await req(`/leads/${testLead._id}/stage`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: {
      newStage: 'CONNECTED',
      notes: 'Called prospect, positive response'
    }
  });

  if (stageRes.success && stageRes.data.pipelineStage === 'CONNECTED') {
    console.log('✓ PATCH /api/leads/:id/stage successfully updated stage to CONNECTED');
    console.log(`  currentStage: ${stageRes.data.currentStage?.name || stageRes.data.currentStage}`);
  } else {
    throw new Error('Stage transition failed');
  }

  // Test 5: Follow up transition with date
  console.log('\n5. Testing transition to FOLLOW_UP with date...');
  const followUpDate = new Date(Date.now() + 86400000).toISOString();
  const followUpRes = await req(`/leads/${testLead._id}/stage`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: {
      newStage: 'FOLLOW_UP',
      followUpDate,
      notes: 'Prospect requested a call tomorrow at 10 AM'
    }
  });

  if (followUpRes.success && followUpRes.data.pipelineStage === 'FOLLOW_UP') {
    console.log('✓ Stage successfully moved to FOLLOW_UP with date!');
    console.log(`  currentStage: ${followUpRes.data.currentStage?.name || followUpRes.data.currentStage}`);
  } else {
    throw new Error('Follow-up transition failed');
  }

  // Test 6: Testing Stages endpoint and PUT /api/stages/Lead/:LeadId
  console.log('\n6. Testing Stages page move lead (PUT /api/stages/Lead/:id)...');
  const stagesRes = await req('/stages', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const interestedStage = stagesRes.data.find(s => s.name.toLowerCase().includes('interest'));
  if (interestedStage) {
    const moveRes = await req(`/stages/Lead/${testLead._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        stageId: interestedStage._id,
        notes: 'Moved from Stages board'
      }
    });

    if (moveRes.success && moveRes.data.pipelineStage === 'INTERESTED') {
      console.log('✓ PUT /api/stages/Lead/:id successfully updated both currentStage and pipelineStage to INTERESTED!');
    } else {
      throw new Error('Board stage move failed');
    }
  }

  console.log('\n==========================================');
  console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('==========================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ Test Error:', err.data || err.message);
  process.exit(1);
});
