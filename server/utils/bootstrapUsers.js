const User = require('../models/User');
const Team = require('../models/Team');
const Lead = require('../models/Lead');
const SiteVisit = require('../models/SiteVisit');
const SiteVisitMedia = require('../models/SiteVisitMedia');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const Remark = require('../models/Remark');
const TeamChannel = require('../models/TeamChannel');
const TeamMessage = require('../models/TeamMessage');

async function bootstrapDefaultUsers() {
  try {
    // 1. Define standard role accounts for BuildTrack Pro CRM
    const defaultAccounts = [
      {
        name: 'BuildTrack Admin',
        email: 'admin@buildtrackpro.com',
        altEmail: 'admin@example.com',
        password: 'password123',
        role: 'admin',
        department: 'management',
        phone: '+91 98765 43210',
      },
      {
        name: 'Rajesh Sharma (Manager)',
        email: 'manager@buildtrackpro.com',
        altEmail: 'e2e_manager@testcrm.com',
        password: 'password123',
        role: 'manager',
        department: 'operations',
        phone: '+91 98765 43211',
      },
      {
        name: 'Pooja Verma (Telecaller)',
        email: 'telecaller@buildtrackpro.com',
        altEmail: 'e2e_telecaller@testcrm.com',
        password: 'password123',
        role: 'telecaller',
        department: 'sales',
        phone: '+91 98765 43212',
      },
      {
        name: 'Vikram Singh (Sales Exec)',
        email: 'sales@buildtrackpro.com',
        altEmail: 'e2e_sales@testcrm.com',
        password: 'password123',
        role: 'sales executer',
        department: 'sales',
        phone: '+91 98765 43213',
      },
    ];

    const createdUsers = {};

    for (const acc of defaultAccounts) {
      // Find or create primary email
      let user = await User.findOne({ email: acc.email });
      if (!user) {
        const userId = await User.generateUserId();
        user = await User.create({
          userId,
          name: acc.name,
          email: acc.email,
          password: acc.password,
          role: acc.role,
          department: acc.department,
          phone: acc.phone,
          status: 'ACTIVE',
          emailVerified: true,
          isActive: true,
        });
      } else {
        // Ensure active and password is up-to-date
        user.password = acc.password;
        user.status = 'ACTIVE';
        user.isActive = true;
        user.role = acc.role;
        await user.save();
      }
      createdUsers[acc.role] = user;

      // Also ensure alternate/legacy email exists for seamless compatibility
      if (acc.altEmail && acc.altEmail !== acc.email) {
        let altUser = await User.findOne({ email: acc.altEmail });
        if (!altUser) {
          const userId = await User.generateUserId();
          altUser = await User.create({
            userId,
            name: acc.name,
            email: acc.altEmail,
            password: acc.password,
            role: acc.role,
            department: acc.department,
            phone: acc.phone,
            status: 'ACTIVE',
            emailVerified: true,
            isActive: true,
          });
        } else {
          altUser.password = acc.password;
          altUser.status = 'ACTIVE';
          altUser.isActive = true;
          altUser.role = acc.role;
          await altUser.save();
        }
      }
    }

    // 2. Ensure default team exists with Manager as lead, and Telecaller & Sales Executive as members
    let defaultTeam = await Team.findOne({ code: 'BT-CORE-01' });
    if (!defaultTeam) {
      defaultTeam = await Team.create({
        name: 'BuildTrack Core Operations Team',
        code: 'BT-CORE-01',
        department: 'operations',
        description: 'Primary cross-functional team connecting Managers, Telecallers, and Sales Executives.',
        teamLead: createdUsers['manager']._id,
        status: 'ACTIVE',
        createdBy: createdUsers['admin']._id,
      });
    } else {
      defaultTeam.teamLead = createdUsers['manager']._id;
      await defaultTeam.save();
    }

    // Assign team to users
    await User.updateMany(
      { _id: { $in: [createdUsers['manager']._id, createdUsers['telecaller']._id, createdUsers['sales executer']._id] } },
      { $addToSet: { teamIds: defaultTeam._id } }
    );

    // Also assign team to all active non-admin users (e.g. Dinesh Kumar) who have no team yet
    await User.updateMany(
      {
        role: { $in: ['telecaller', 'sales executer', 'sales executive', 'manager'] },
        $or: [{ teamIds: { $exists: false } }, { teamIds: { $size: 0 } }, { teamIds: null }]
      },
      { $addToSet: { teamIds: defaultTeam._id } }
    );

    // Ensure default team channels exist
    let defaultChannels = await TeamChannel.find({ team: defaultTeam._id });
    if (!defaultChannels || defaultChannels.length === 0) {
      const generalChannel = await TeamChannel.create({
        team: defaultTeam._id,
        name: 'general',
        description: 'General workspace discussion',
        createdBy: createdUsers['admin']._id,
      });
      await TeamMessage.create({
        channel: generalChannel._id,
        team: defaultTeam._id,
        sender: createdUsers['manager']._id,
        senderName: createdUsers['manager'].name,
        message: '👋 Welcome to Sungrid CRM Internal Team Workspace! Collaborate with your team members, share visit updates, and coordinate seamlessly.',
        readBy: [createdUsers['manager']._id],
      });
    }

    // 3. Ensure sample leads representing every stage of the pipeline exist (4 leads per team)
    const sampleLeads = [
      {
        name: 'Sunil Mehta (Skyline Towers)',
        company: 'Skyline Constructions',
        phone: '9820011223',
        email: 'sunil@skylinetowers.in',
        address: { street: 'Tower 4, Bandra West', city: 'Mumbai', state: 'MH' },
        source: 'website',
        pipelineStage: 'NEW',
        assignedTo: createdUsers['telecaller']._id,
        team: defaultTeam._id,
      },
      {
        name: 'Ananya Sharma (Green Valley Villas)',
        company: 'Green Valley Projects',
        phone: '9833022334',
        email: 'ananya@greenvalley.com',
        address: { street: 'Sector 62, Golf Course Ext', city: 'Gurugram', state: 'HR' },
        source: 'referral',
        pipelineStage: 'CONNECTED',
        assignedTo: createdUsers['telecaller']._id,
        team: defaultTeam._id,
      },
      {
        name: 'Kavita Singhal (Metro Grand Residences)',
        company: 'Metro City Realty',
        phone: '9844044556',
        email: 'kavita@metrocityrealty.com',
        address: { street: 'Outer Ring Road, Marathahalli', city: 'Bengaluru', state: 'KA' },
        source: 'website',
        pipelineStage: 'SITE_VISIT_PLANNED',
        assignedTo: createdUsers['sales executer']._id,
        team: defaultTeam._id,
      },
      {
        name: 'Harish Patel (Horizon Business Park)',
        company: 'Horizon Builders Ltd',
        phone: '9855055667',
        email: 'harish@horizonpark.com',
        address: { street: 'SG Highway, Bodakdev', city: 'Ahmedabad', state: 'GJ' },
        source: 'call',
        pipelineStage: 'SITE_VISIT_DONE',
        assignedTo: createdUsers['sales executer']._id,
        team: defaultTeam._id,
      },
    ];

    const leadDocs = {};
    for (const leadData of sampleLeads) {
      let lead = await Lead.findOne({ phone: leadData.phone });
      if (!lead) {
        const LeadId = await Lead.generateLeadId();
        lead = await Lead.create({
          LeadId,
          ...leadData,
          createdBy: createdUsers['admin']._id,
        });
      } else {
        lead.pipelineStage = leadData.pipelineStage;
        lead.assignedTo = leadData.assignedTo;
        lead.team = leadData.team;
        await lead.save();
      }
      leadDocs[leadData.pipelineStage] = lead;
    }

    // 4. Ensure site visit records exist for Sales Executive
    if (leadDocs['SITE_VISIT_PLANNED']) {
      const existingPlannedVisit = await SiteVisit.findOne({ lead: leadDocs['SITE_VISIT_PLANNED']._id });
      if (!existingPlannedVisit) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(11, 0, 0, 0);

        await SiteVisit.create({
          lead: leadDocs['SITE_VISIT_PLANNED']._id,
          assignedTo: createdUsers['sales executer']._id,
          scheduledAt: tomorrow,
          address: 'Outer Ring Road, Marathahalli, Bengaluru, KA',
          priority: 'HIGH',
          status: 'PLANNED',
          notes: 'leadrequested architectural blueprint walkthrough and site measurement inspection.',
          createdBy: createdUsers['manager']._id,
        });
      }
    }

    if (leadDocs['SITE_VISIT_DONE']) {
      const existingDoneVisit = await SiteVisit.findOne({ lead: leadDocs['SITE_VISIT_DONE']._id });
      if (!existingDoneVisit) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        const doneVisit = await SiteVisit.create({
          lead: leadDocs['SITE_VISIT_DONE']._id,
          assignedTo: createdUsers['sales executer']._id,
          scheduledAt: pastDate,
          address: 'SG Highway, Bodakdev, Ahmedabad, GJ',
          priority: 'MEDIUM',
          status: 'DONE',
          photoUrl: '/uploads/site-visits/demo-site-visit.jpg',
          latitude: 23.0338,
          longitude: 72.5850,
          completedAt: pastDate,
          notes: 'Inspected boundary wall and foundation pit. leadconfirmed interest in phase 1 contract.',
          createdBy: createdUsers['manager']._id,
        });

        const media = await SiteVisitMedia.create({
          siteVisit: doneVisit._id,
          type: 'PHOTO',
          url: '/uploads/site-visits/demo-site-visit.jpg',
          latitude: 23.0338,
          longitude: 72.5850,
          address: 'SG Highway, Ahmedabad',
          uploadedBy: createdUsers['sales executer']._id,
        });

        doneVisit.media = [media._id];
        await doneVisit.save();
      }
    }

    // 5. Ensure pending attendance record for Telecaller so Manager can approve
    const todayStr = new Date().toISOString().split('T')[0];
    let telecallerAttendance = await Attendance.findOne({
      user: createdUsers['telecaller']._id,
      date: todayStr,
    });
    if (!telecallerAttendance) {
      const now = new Date();
      await Attendance.create({
        user: createdUsers['telecaller']._id,
        date: todayStr,
        checkInTime: now,
        markedAt: now,
        status: 'PENDING',
        notes: 'Clocked in from home office for telecalling shift.',
      });
    }

    // 6. Ensure sample in-app notifications
    const existingNotif = await Notification.findOne({ recipient: createdUsers['manager']._id });
    if (!existingNotif) {
      await Notification.create({
        recipient: createdUsers['manager']._id,
        type: 'LEAD_SITE_VISIT_PLANNED',
        title: 'Lead ready for site visit assignment',
        message: 'Kavita Singhal (Metro Grand Residences) has reached Site Visit Planned. Please assign a Sales Executive.',
        entityType: 'Lead',
        entityId: leadDocs['SITE_VISIT_PLANNED']?._id,
        isRead: false,
      });

      await Notification.create({
        recipient: createdUsers['sales executer']._id,
        type: 'SITE_VISIT_ASSIGNED',
        title: 'New site visit scheduled',
        message: 'Site visit assigned for Outer Ring Road, Bengaluru with high priority.',
        entityType: 'SiteVisit',
        isRead: false,
      });
    }

    console.log('✅ BuildTrack Pro CRM role accounts & sample workflow data initialized successfully');
  } catch (err) {
    console.error('⚠️  Bootstrap error (non-fatal):', err.message);
  }
}

module.exports = { bootstrapDefaultUsers };
