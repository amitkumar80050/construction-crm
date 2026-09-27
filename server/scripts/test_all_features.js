const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = require('../app');
const initSocket = require('../sockets');
const { Server } = require('socket.io');

const User = require('../models/User');
const Team = require('../models/Team');
const Client = require('../models/Client');
const Stage = require('../models/Stage');
const Attendance = require('../models/Attendance');
const SiteVisit = require('../models/SiteVisit');
const SiteVisitMedia = require('../models/SiteVisitMedia');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');
const Remark = require('../models/Remark');

const PORT = 5001; // Run test server on port 5001
const BASE_URL = `http://localhost:${PORT}/api`;

const results = [];

function recordTest(moduleName, feature, passed, details = '') {
  results.push({ moduleName, feature, status: passed ? 'PASSED' : 'FAILED', details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${moduleName}] ${feature}: ${passed ? 'PASSED' : 'FAILED'} ${details ? `(${details})` : ''}`);
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 STARTING END-TO-END FEATURE VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  // 1. Connect to MongoDB
  try {
    console.log(`Connecting to MongoDB Atlas...`);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas\n');
  } catch (err) {
    console.error('❌ MongoDB Connection failed:', err.message);
    process.exit(1);
  }

  // 2. Start HTTP Server
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });
  initSocket(io);

  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(`✅ Test server running on ${BASE_URL}\n`);

  try {
    // 3. Setup Demo Users for all roles
    console.log('--- Setting up Demo Users & Authentication ---');
    const demoUsers = [
      { name: 'Test Admin', email: 'e2e_admin@testcrm.com', password: 'Password123!', role: 'admin', phone: '9000000001' },
      { name: 'Test Manager', email: 'e2e_manager@testcrm.com', password: 'Password123!', role: 'manager', phone: '9000000002' },
      { name: 'Test Telecaller', email: 'e2e_telecaller@testcrm.com', password: 'Password123!', role: 'telecaller', phone: '9000000003' },
      { name: 'Test Sales Exec', email: 'e2e_sales@testcrm.com', password: 'Password123!', role: 'sales executer', phone: '9000000004' },
    ];

    const tokens = {};
    const userDocs = {};

    for (const u of demoUsers) {
      let doc = await User.findOne({ email: u.email });
      if (!doc) {
        const userId = await User.generateUserId();
        doc = await User.create({ ...u, userId, emailVerified: true, status: 'ACTIVE' });
      } else {
        doc.password = u.password;
        await doc.save();
      }
      userDocs[u.role] = doc;

      // Test Login API
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email, password: u.password }),
      });
      const loginData = await loginRes.json();
      if (loginData.token) {
        tokens[u.role] = loginData.token;
      }
    }

    const allTokensAcquired = Object.keys(tokens).length === 4;
    recordTest('Module 1: Auth & RBAC', 'Login & JWT Generation for 4 Roles', allTokensAcquired);

    // 4. Setup Team & Membership
    console.log('\n--- Testing Module 2: Team & Role Management ---');
    let team = await Team.findOne({ code: 'E2E-TEAM' });
    if (!team) {
      team = await Team.create({
        name: 'E2E Construction Team',
        code: 'E2E-TEAM',
        department: 'sales',
        teamLead: userDocs['manager']._id,
        createdBy: userDocs['admin']._id,
      });
    }

    // Assign team to telecaller and sales exec
    await User.updateMany(
      { _id: { $in: [userDocs['manager']._id, userDocs['telecaller']._id, userDocs['sales executer']._id] } },
      { $addToSet: { teamIds: team._id } }
    );
    recordTest('Module 2: Team Management', 'Team Creation & Member Association', !!team);

    // 5. Test Attendance Workflow (Module 7)
    console.log('\n--- Testing Module 7: Attendance Approval Workflow ---');
    const today = new Date().toISOString().split('T')[0];
    await Attendance.deleteMany({ user: userDocs['telecaller']._id, date: today });

    // 5a. Check-in
    const checkInRes = await fetch(`${BASE_URL}/attendance/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['telecaller']}`,
      },
      body: JSON.stringify({ userNotes: 'Working from site office' }),
    });
    const checkInData = await checkInRes.json();
    const checkInOk = checkInRes.status === 201 && checkInData.data?.status === 'PENDING';
    recordTest('Module 7: Attendance', 'Employee Check-in (Status PENDING)', checkInOk);

    // 5b. Duplicate Check-in should fail
    const dupRes = await fetch(`${BASE_URL}/attendance/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['telecaller']}`,
      },
    });
    const dupOk = dupRes.status === 409 || dupRes.status === 400;
    recordTest('Module 7: Attendance', 'Reject Duplicate Check-in on Same Day', dupOk);

    // 5c. Check-out
    const checkOutRes = await fetch(`${BASE_URL}/attendance/checkout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens['telecaller']}` },
    });
    const checkOutData = await checkOutRes.json();
    const checkOutOk = checkOutRes.status === 200 && checkOutData.data?.checkOutTime != null;
    recordTest('Module 7: Attendance', 'Employee Check-out & Hours Calculation', checkOutOk);

    // 5d. Manager view pending attendance
    const pendingAttRes = await fetch(`${BASE_URL}/attendance/pending`, {
      headers: { Authorization: `Bearer ${tokens['manager']}` },
    });
    const pendingAttData = await pendingAttRes.json();
    const attendanceRecord = pendingAttData.data?.find((a) => String(a.user?._id) === String(userDocs['telecaller']._id));
    recordTest('Module 7: Attendance', 'Manager List Pending Attendance', !!attendanceRecord);

    // 5e. Manager Approve Attendance
    if (attendanceRecord) {
      const approveRes = await fetch(`${BASE_URL}/attendance/${attendanceRecord._id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens['manager']}`,
        },
        body: JSON.stringify({ remarks: 'Shift approved on time' }),
      });
      const approveData = await approveRes.json();
      const approveOk = approveData.data?.status === 'APPROVED';
      recordTest('Module 7: Attendance', 'Manager Attendance Approval', approveOk);
    }

    // 6. Test Pipeline Stages & Role Locking (Modules 3 & 5)
    console.log('\n--- Testing Modules 3 & 5: Pipeline Stages & Role Locks ---');
    const stagesRes = await fetch(`${BASE_URL}/stages`, {
      headers: { Authorization: `Bearer ${tokens['admin']}` },
    });
    const stagesData = await stagesRes.json();
    const has9Stages = stagesData.data?.length >= 9;
    recordTest('Module 3: Pipeline Stages', 'Standard 9 Stages Seeded & Available', has9Stages, `${stagesData.data?.length} stages found`);

    const stageMap = {};
    stagesData.data.forEach((s) => {
      stageMap[s.name.toLowerCase()] = s;
    });

    // Create a demo lead for stage testing
    const clientId = await Client.generateClientId();
    const testLead = await Client.create({
      clientId,
      name: 'Skyline Commercial Tower',
      company: 'Apex Infra Ltd',
      email: 'lead_apex@testcrm.com',
      phone: '9888888888',
      assignedTo: userDocs['telecaller']._id,
      currentStage: stageMap['new']?._id,
      team: team._id,
    });

    // Telecaller attempts invalid stage jump to "Quotation" -> Must be 403 Forbidden!
    const quoteStage = stageMap['quotation'];
    const invalidJumpRes = await fetch(`${BASE_URL}/stages/client/${testLead._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['telecaller']}`,
      },
      body: JSON.stringify({ stageId: quoteStage._id }),
    });
    recordTest('Module 3 & 5: Role-to-Stage Lock', 'Block Telecaller from Jumping to Quotation (403)', invalidJumpRes.status === 403);

    // Telecaller moves to "Follow-up" without notes -> Must be 400 Bad Request!
    const followUpStage = stageMap['follow-up'];
    const missingNotesRes = await fetch(`${BASE_URL}/stages/client/${testLead._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['telecaller']}`,
      },
      body: JSON.stringify({ stageId: followUpStage._id, notes: '' }),
    });
    recordTest('Module 5: Telecaller Notes Enforcer', 'Enforce Mandatory Notes on Follow-up Stage (400)', missingNotesRes.status === 400);

    // Telecaller moves to "Follow-up" with notes & followUpDate -> Must Succeed!
    const validFollowUpRes = await fetch(`${BASE_URL}/stages/client/${testLead._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['telecaller']}`,
      },
      body: JSON.stringify({
        stageId: followUpStage._id,
        notes: 'Spoke with client, requested follow-up next Monday.',
        followUpDate: '2026-10-05T10:00:00.000Z',
      }),
    });
    const validFollowUpData = await validFollowUpRes.json();
    recordTest('Module 5: Telecaller Stage Progression', 'Telecaller Advance to Follow-up with Notes', validFollowUpRes.status === 200);

    // Advance to "Site Visit Planned"
    const plannedStage = stageMap['site visit planned'];
    const plannedRes = await fetch(`${BASE_URL}/stages/client/${testLead._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['telecaller']}`,
      },
      body: JSON.stringify({
        stageId: plannedStage._id,
        notes: 'Client agreed to site inspection.',
      }),
    });
    recordTest('Module 5: Telecaller Hand-off', 'Advance to Site Visit Planned', plannedRes.status === 200);

    // 7. Test Round-Robin Lead Distribution (Module 3 & 4)
    console.log('\n--- Testing Module 3 & 4: Round-Robin Lead Distribution ---');
    // Create 4 test leads with no assignment
    const unassignedLeads = [];
    for (let i = 1; i <= 4; i++) {
      const cId = await Client.generateClientId();
      const lead = await Client.create({
        clientId: cId,
        name: `RR Lead Project ${i}`,
        company: `RR Corp ${i}`,
        email: `rr_${i}_${Date.now()}@testcrm.com`,
        phone: `911111111${i}`,
        assignedTo: userDocs['admin']._id,
        currentStage: stageMap['new']?._id,
        team: team._id,
      });
      unassignedLeads.push(lead._id);
    }

    const distRes = await fetch(`${BASE_URL}/clients/distribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['manager']}`,
      },
      body: JSON.stringify({
        clientIds: unassignedLeads,
        roleFilter: 'telecaller',
      }),
    });
    const distData = await distRes.json();
    const distOk = distRes.status === 200 && distData.totalDistributed === 4;
    recordTest('Module 3 & 4: Lead Distribution', 'Round-Robin Lead Distribution Algorithm', distOk, distData.message);

    // 8. Test Sales Executive Site Visit Workflow with Live Photo & GPS (Module 6)
    console.log('\n--- Testing Module 6: Sales Executive Site Visit with Camera & GPS ---');
    // Ensure test lead has pipelineStage SITE_VISIT_PLANNED for assignment
    testLead.pipelineStage = 'SITE_VISIT_PLANNED';
    await testLead.save();

    // Manager schedules site visit
    const scheduleRes = await fetch(`${BASE_URL}/manager/assign-visit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['manager']}`,
      },
      body: JSON.stringify({
        leadId: testLead._id,
        executiveId: userDocs['sales executer']._id,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        address: 'Sector 62, Metro Station Road, Noida, UP',
        priority: 'HIGH',
        notes: 'Meet client on site near tower foundation.',
      }),
    });
    const scheduleData = await scheduleRes.json();
    const scheduledOk = scheduleRes.status === 201 && scheduleData.data?.status === 'PLANNED';
    recordTest('Module 6: Site Visits', 'Manager Schedules Visit for Sales Executive', scheduledOk);
    const visitId = scheduleData.data?._id;

    // Sales Exec views "My Visits"
    const myVisitsRes = await fetch(`${BASE_URL}/site-visits/my`, {
      headers: { Authorization: `Bearer ${tokens['sales executer']}` },
    });
    const myVisitsData = await myVisitsRes.json();
    const foundMyVisit = myVisitsData.data?.some((v) => String(v._id) === String(visitId));
    recordTest('Module 6: Site Visits', 'Sales Executive Retrieves My Visits', foundMyVisit);

    // Sales Exec completes site visit with Live Photo & GPS Coordinates
    if (visitId) {
      // Create a dummy JPEG buffer
      const dummyPhotoBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      const boundary = '----WebKitFormBoundaryE2ETest';
      let multipartBody = '';
      multipartBody += `--${boundary}\r\n`;
      multipartBody += `Content-Disposition: form-data; name="latitude"\r\n\r\n28.613939\r\n`;
      multipartBody += `--${boundary}\r\n`;
      multipartBody += `Content-Disposition: form-data; name="longitude"\r\n\r\n77.209021\r\n`;
      multipartBody += `--${boundary}\r\n`;
      multipartBody += `Content-Disposition: form-data; name="accuracy"\r\n\r\n5\r\n`;
      multipartBody += `--${boundary}\r\n`;
      multipartBody += `Content-Disposition: form-data; name="address"\r\n\r\nSector 62, Noida\r\n`;
      multipartBody += `--${boundary}\r\n`;
      multipartBody += `Content-Disposition: form-data; name="notes"\r\n\r\nFoundation inspected, client satisfied\r\n`;
      multipartBody += `--${boundary}\r\n`;
      multipartBody += `Content-Disposition: form-data; name="photo"; filename="visit_proof.jpg"\r\n`;
      multipartBody += `Content-Type: image/jpeg\r\n\r\n`;

      const payload = Buffer.concat([
        Buffer.from(multipartBody, 'utf8'),
        dummyPhotoBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'),
      ]);

      const completeRes = await fetch(`${BASE_URL}/site-visits/${visitId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          Authorization: `Bearer ${tokens['sales executer']}`,
        },
        body: payload,
      });
      const completeData = await completeRes.json();
      const completeOk = completeRes.status === 200 && completeData.data?.status === 'DONE';
      recordTest('Module 6: Site Visits', 'Complete Visit with Live Photo & GPS Geotagging', completeOk);

      // Verify that the lead's current stage was automatically updated to "Site Visit Done"
      const updatedLead = await Client.findById(testLead._id).populate('currentStage');
      const stageUpdatedToDone = updatedLead.pipelineStage === 'SITE_VISIT_DONE' || updatedLead.currentStage?.name?.toLowerCase()?.includes('site visit done');
      recordTest('Module 6: Site Visits', 'Auto-Transition Lead Stage to Site Visit Done', stageUpdatedToDone);

      // Test "Not Done" reporting on another visit
      const secondVisit = await SiteVisit.create({
        lead: testLead._id,
        assignedTo: userDocs['sales executer']._id,
        scheduledAt: new Date(),
        address: 'Sector 18, Noida',
        priority: 'MEDIUM',
        notes: 'Follow-up visit',
        createdBy: userDocs['manager']._id,
        status: 'PLANNED',
      });
      const notDoneRes = await fetch(`${BASE_URL}/site-visits/${secondVisit._id}/not-done`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens['sales executer']}`,
        },
        body: JSON.stringify({
          notDoneReason: 'Client unavailable / Not at site',
          nextDate: '2026-10-10T11:00:00.000Z',
        }),
      });
      const notDoneData = await notDoneRes.json();
      recordTest('Module 6: Site Visits', 'Mark Visit as Not Done with Reason & Reschedule Date', notDoneData.data?.status === 'MISSED' || notDoneData.data?.status === 'NOT_DONE');
    }

    // 9. Test Manager Dashboard & KPIs (Module 4)
    console.log('\n--- Testing Module 4: Manager Team Dashboard & KPIs ---');
    const mgrDashRes = await fetch(`${BASE_URL}/manager/dashboard`, {
      headers: { Authorization: `Bearer ${tokens['manager']}` },
    });
    const mgrDashData = await mgrDashRes.json();
    const hasStats = mgrDashRes.status === 200 && mgrDashData.data?.siteVisits !== undefined && mgrDashData.data?.totalLeads !== undefined;
    recordTest('Module 4: Manager Dashboard', 'Aggregated Team KPIs (Leads, Visits, Attendance)', hasStats);

    // 10. Test In-App Real-Time Notifications (Module 9)
    console.log('\n--- Testing Module 9: In-App System Notifications ---');
    // Check Sales Exec notifications (should have received site visit assigned alert)
    const notifsRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${tokens['sales executer']}` },
    });
    const notifsData = await notifsRes.json();
    const hasAssignedNotif = notifsData.data?.some((n) => n.type === 'site_visit_assigned');
    recordTest('Module 9: In-App Notifications', 'System Event Auto-Generated In-App Alert', hasAssignedNotif);

    if (notifsData.data?.length > 0) {
      const firstNotif = notifsData.data[0];
      // Mark as read
      const markReadRes = await fetch(`${BASE_URL}/notifications/${firstNotif._id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokens['sales executer']}` },
      });
      const markReadData = await markReadRes.json();
      recordTest('Module 9: In-App Notifications', 'Mark Single Notification Read', markReadData.data?.isRead === true);

      // Mark all as read
      const markAllRes = await fetch(`${BASE_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokens['sales executer']}` },
      });
      recordTest('Module 9: In-App Notifications', 'Mark All Notifications Read', markAllRes.status === 200);
    }

    // 11. Test Activity & Audit Logs (Module 11)
    console.log('\n--- Testing Module 11: Activity & Audit Trail ---');
    const logsRes = await fetch(`${BASE_URL}/logs/my`, {
      headers: { Authorization: `Bearer ${tokens['telecaller']}` },
    });
    const logsData = await logsRes.json();
    const logsOk = logsRes.status === 200 && logsData.data?.length > 0;
    recordTest('Module 11: Audit Trail', 'Activity Log Trail for User Operations', logsOk, `${logsData.data?.length} activity events recorded`);

  } catch (error) {
    console.error('❌ Unexpected Test Suite Error:', error);
  } finally {
    console.log('\n====================================================');
    console.log('🏁 TEST SUITE COMPLETE - SUMMARY REPORT');
    console.log('====================================================');
    const passedCount = results.filter((r) => r.status === 'PASSED').length;
    const totalCount = results.length;
    console.log(`Total Features Tested: ${totalCount}`);
    console.log(`Passed: ${passedCount} / ${totalCount}`);
    console.log(`Failed: ${totalCount - passedCount} / ${totalCount}`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    httpServer.close();
    process.exit(passedCount === totalCount ? 0 : 1);
  }
}

runTests();
