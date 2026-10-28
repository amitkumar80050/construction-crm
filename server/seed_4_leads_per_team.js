const mongoose = require('mongoose');

async function distribute4LeadsPerTeam() {
  await mongoose.connect('mongodb://localhost:27017/construction_crm');
  console.log('Connected to MongoDB');

  const User = require('./models/User');
  const Team = require('./models/Team');
  const Lead = require('./models/Lead');
  const TeamChannel = require('./models/TeamChannel');
  const TeamMessage = require('./models/TeamMessage');
  const SiteVisit = require('./models/SiteVisit');

  const admin = await User.findOne({ role: 'admin' });
  const adminId = admin ? admin._id : null;

  const teams = await Team.find();
  console.log(`Found ${teams.length} teams.`);

  // Define team-specific lead definitions (4 leads per team)
  const teamLeadsData = {
    // Lucknow
    '32': [
      {
        name: 'Hazratganj Commercial Plaza',
        company: 'Awadh Retail & Commercials',
        email: 'hazratganj@awadhretail.in',
        phone: '9872010001',
        address: { street: '42 MG Marg, Hazratganj', city: 'Lucknow', state: 'UP', zipCode: '226001' },
        source: 'website',
        pipelineStage: 'NEW',
        roleTarget: 'telecaller',
        projectValue: 35000000,
        notes: 'Inquiry for 12,000 sq.ft prime retail space and office suites.'
      },
      {
        name: 'Gomti Nagar Elite Heights',
        company: 'Vipul Greens Housing',
        email: 'eliteheights@vipulgreens.com',
        phone: '9872010002',
        address: { street: 'Vibhuti Khand, Gomti Nagar', city: 'Lucknow', state: 'UP', zipCode: '226010' },
        source: 'referral',
        pipelineStage: 'CONNECTED',
        roleTarget: 'telecaller',
        projectValue: 55000000,
        notes: 'Interested in luxury 3BHK and penthouse towers overlooking Gomti riverfront.'
      },
      {
        name: 'Alambagh Metro Residency',
        company: 'Metro Infra Builders',
        email: 'alambagh@metroinfra.in',
        phone: '9872010003',
        address: { street: 'Kanpur Road, Alambagh', city: 'Lucknow', state: 'UP', zipCode: '226005' },
        source: 'call',
        pipelineStage: 'SITE_VISIT_PLANNED',
        roleTarget: 'sales executer',
        projectValue: 42000000,
        notes: 'Site visit scheduled to inspect plot layout and foundation piling.'
      },
      {
        name: 'Indira Nagar Luxury Villas',
        company: 'Shalimar Prestige Homes',
        email: 'villas@shalimarhomes.in',
        phone: '9872010004',
        address: { street: 'Ring Road, Sector 14, Indira Nagar', city: 'Lucknow', state: 'UP', zipCode: '226016' },
        source: 'social_media',
        pipelineStage: 'SITE_VISIT_DONE',
        roleTarget: 'sales executer',
        projectValue: 78000000,
        notes: 'Site inspection completed. Client requesting structural design blueprints.'
      }
    ],

    // Sitapur
    '34': [
      {
        name: 'Sitapur City Center Arcade',
        company: 'Oudh Commercial Developers',
        email: 'citycenter@oudhdev.in',
        phone: '9872020001',
        address: { street: 'Station Road, Civil Lines', city: 'Sitapur', state: 'UP', zipCode: '261001' },
        source: 'website',
        pipelineStage: 'NEW',
        roleTarget: 'telecaller',
        projectValue: 28000000,
        notes: 'Commercial shopping arcade with 40 shops and food court.'
      },
      {
        name: 'Naimisharanya Heritage Resorts',
        company: 'Sacred Lands Hospitality',
        email: 'naimish@sacredlands.in',
        phone: '9872020002',
        address: { street: 'Tirth Kshetra Marg', city: 'Naimisharanya, Sitapur', state: 'UP', zipCode: '261402' },
        source: 'referral',
        pipelineStage: 'INTERESTED',
        roleTarget: 'telecaller',
        projectValue: 62000000,
        notes: 'Eco-resort and spiritual wellness retreat facility construction.'
      },
      {
        name: 'Vaidehi Township Phase 1',
        company: 'Vaidehi Housing Ltd',
        email: 'vaidehi@township.in',
        phone: '9872020003',
        address: { street: 'Lakhimpur Highway, Vaidehi Nagar', city: 'Sitapur', state: 'UP', zipCode: '261001' },
        source: 'call',
        pipelineStage: 'SITE_VISIT_PLANNED',
        roleTarget: 'sales executer',
        projectValue: 49000000,
        notes: 'Site visit booked for soil testing and boundary survey.'
      },
      {
        name: 'Sarayan Commercial Logistics Hub',
        company: 'Sarayan Logistics Infra',
        email: 'logistics@sarayan.in',
        phone: '9872020004',
        address: { street: 'Bypass Road, Sarayan River Bank', city: 'Sitapur', state: 'UP', zipCode: '261001' },
        source: 'other',
        pipelineStage: 'QUOTATION',
        roleTarget: 'sales executer',
        projectValue: 85000000,
        notes: 'Warehousing complex quotation shared and under financial review.'
      }
    ],

    // BuildTrack Core Operations Team
    'BT-CORE-01': [
      {
        name: 'Sunil Mehta (Skyline Towers)',
        company: 'Skyline Constructions',
        email: 'sunil@skylinetowers.in',
        phone: '9820011223',
        address: { street: 'Tower 4, Bandra West', city: 'Mumbai', state: 'MH', zipCode: '400050' },
        source: 'website',
        pipelineStage: 'NEW',
        roleTarget: 'telecaller',
        projectValue: 45000000,
        notes: 'Initial inquiry for twin tower high-rise residential structure.'
      },
      {
        name: 'Ananya Sharma (Green Valley Villas)',
        company: 'Green Valley Projects',
        email: 'ananya@greenvalley.com',
        phone: '9833022334',
        address: { street: 'Sector 62, Golf Course Ext', city: 'Gurugram', state: 'HR', zipCode: '122001' },
        source: 'referral',
        pipelineStage: 'CONNECTED',
        roleTarget: 'telecaller',
        projectValue: 65000000,
        notes: 'Spoke with architect. Discussed green building GRIHA certification.'
      },
      {
        name: 'Kavita Singhal (Metro Grand Residences)',
        company: 'Metro City Realty',
        email: 'kavita@metrocityrealty.com',
        phone: '9844044556',
        address: { street: 'Outer Ring Road, Marathahalli', city: 'Bengaluru', state: 'KA', zipCode: '560037' },
        source: 'website',
        pipelineStage: 'SITE_VISIT_PLANNED',
        roleTarget: 'sales executer',
        projectValue: 52000000,
        notes: 'Site visit scheduled with sales team for foundation review.'
      },
      {
        name: 'Harish Patel (Horizon Business Park)',
        company: 'Horizon Builders Ltd',
        email: 'harish@horizonpark.com',
        phone: '9855055667',
        address: { street: 'SG Highway, Bodakdev', city: 'Ahmedabad', state: 'GJ', zipCode: '380054' },
        source: 'call',
        pipelineStage: 'SITE_VISIT_DONE',
        roleTarget: 'sales executer',
        projectValue: 95000000,
        notes: 'Site visit completed successfully. Client pleased with speed of execution.'
      }
    ]
  };

  // Re-allocate any extra leads in Core team to keep exactly 4 per team
  const excessLeads = await Lead.find({
    phone: { $in: ['9811033445', '9866066778'] }
  });
  if (excessLeads.length > 0) {
    for (const ex of excessLeads) {
      await Lead.deleteOne({ _id: ex._id });
      console.log(`Removed excess lead: ${ex.name} to ensure exactly 4 leads per team.`);
    }
  }

  for (const team of teams) {
    console.log(`\n--- Processing Team: ${team.name} (Code: ${team.code}, ID: ${team._id}) ---`);
    
    // Find team members
    const members = await User.find({ teamIds: team._id, isActive: true, isDeleted: { $ne: true } });
    const telecaller = members.find(m => m.role === 'telecaller') || members[0];
    const salesExec = members.find(m => m.role === 'sales executer') || members[0];
    const manager = members.find(m => m.role === 'manager') || members[0];

    console.log(`  Members: Telecaller: ${telecaller?.name}, Sales: ${salesExec?.name}, Manager: ${manager?.name}`);

    // Ensure Default Channels exist
    let generalChannel = await TeamChannel.findOne({ team: team._id, name: 'general' });
    if (!generalChannel) {
      generalChannel = await TeamChannel.create({
        team: team._id,
        name: 'general',
        description: `General discussion channel for ${team.name}`,
        createdBy: manager ? manager._id : adminId
      });
      console.log(`  Created #general channel for ${team.name}`);
    }

    let leadsChannel = await TeamChannel.findOne({ team: team._id, name: 'leads' });
    if (!leadsChannel) {
      leadsChannel = await TeamChannel.create({
        team: team._id,
        name: 'leads',
        description: `Lead updates and pipeline coordination for ${team.name}`,
        createdBy: manager ? manager._id : adminId
      });
      console.log(`  Created #leads channel for ${team.name}`);
    }

    // Ensure welcome messages exist
    const messageCount = await TeamMessage.countDocuments({ channel: generalChannel._id });
    if (messageCount === 0) {
      await TeamMessage.create({
        channel: generalChannel._id,
        team: team._id,
        sender: manager ? manager._id : adminId,
        senderName: manager ? manager.name : 'System Admin',
        message: `Welcome to the ${team.name} team workspace! Here you can collaborate, share lead updates, and coordinate site visits.`,
        readBy: [manager ? manager._id : adminId]
      });
      if (telecaller && manager && telecaller._id.toString() !== manager._id.toString()) {
        await TeamMessage.create({
          channel: generalChannel._id,
          team: team._id,
          sender: telecaller._id,
          senderName: telecaller.name,
          message: `Hello team! All new leads for ${team.name} have been received and follow-ups are underway.`,
          readBy: [telecaller._id]
        });
      }
      console.log(`  Created welcome messages in #general for ${team.name}`);
    }

    // Process the 4 leads for this team
    const leadsConfig = teamLeadsData[team.code] || teamLeadsData['BT-CORE-01'];
    let count = 0;

    for (const leadData of leadsConfig) {
      count++;
      const assignedUser = leadData.roleTarget === 'telecaller' ? telecaller : salesExec;
      
      let lead = await Lead.findOne({ phone: leadData.phone });
      if (!lead) {
        const leadId = await Lead.generateLeadId();
        lead = await Lead.create({
          LeadId: leadId,
          name: leadData.name,
          company: leadData.company,
          email: leadData.email,
          phone: leadData.phone,
          address: leadData.address,
          source: leadData.source,
          pipelineStage: leadData.pipelineStage,
          projectValue: leadData.projectValue,
          notes: leadData.notes,
          team: team._id,
          assignedTo: assignedUser ? assignedUser._id : null,
          createdBy: adminId || (manager ? manager._id : null),
        });
        console.log(`  Created Lead #${count}: "${lead.name}" [${lead.pipelineStage}] assigned to ${assignedUser?.name} (${assignedUser?.role})`);
      } else {
        lead.name = leadData.name;
        lead.company = leadData.company;
        lead.email = leadData.email;
        lead.address = leadData.address;
        lead.source = leadData.source;
        lead.pipelineStage = leadData.pipelineStage;
        lead.projectValue = leadData.projectValue;
        lead.notes = leadData.notes;
        lead.team = team._id;
        lead.assignedTo = assignedUser ? assignedUser._id : null;
        await lead.save();
        console.log(`  Updated Lead #${count}: "${lead.name}" [${lead.pipelineStage}] assigned to ${assignedUser?.name} (${assignedUser?.role})`);
      }

      // If lead is in SITE_VISIT stage, ensure a SiteVisit record exists
      if (['SITE_VISIT_PLANNED', 'SITE_VISIT_DONE'].includes(lead.pipelineStage) && salesExec) {
        let visit = await SiteVisit.findOne({ lead: lead._id });
        if (!visit) {
          await SiteVisit.create({
            lead: lead._id,
            Lead: lead._id,
            assignedTo: salesExec._id,
            scheduledAt: new Date(Date.now() + (lead.pipelineStage === 'SITE_VISIT_PLANNED' ? 86400000 * 2 : -86400000)),
            status: lead.pipelineStage === 'SITE_VISIT_PLANNED' ? 'PLANNED' : 'DONE',
            address: `${lead.address?.street}, ${lead.address?.city}`,
            priority: 'HIGH',
            notes: lead.notes,
            createdBy: manager ? manager._id : adminId
          });
          console.log(`    Linked SiteVisit (${lead.pipelineStage}) to ${salesExec.name}`);
        }
      }
    }
  }

  // Print summary verification
  console.log('\n=== VERIFICATION SUMMARY ===');
  for (const t of teams) {
    const leads = await Lead.find({ team: t._id }).populate('assignedTo', 'name role');
    console.log(`\nTeam: ${t.name} (Code: ${t.code}) Total Leads: ${leads.length}`);
    for (const l of leads) {
      console.log(`  - [${l.pipelineStage}] ${l.name} | Assigned: ${l.assignedTo?.name} (${l.assignedTo?.role}) | Phone: ${l.phone}`);
    }
  }

  process.exit(0);
}

distribute4LeadsPerTeam().catch((err) => {
  console.error('Error running script:', err);
  process.exit(1);
});
