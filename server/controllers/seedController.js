const User = require('../models/User');
const Stage = require('../models/Stage');
const Client = require('../models/Client');
const Remark = require('../models/Remark');
const Reminder = require('../models/Reminder');
const Activity = require('../models/Activity');

const seedDatabase = async (req, res) => {
  try {
    await Promise.all([
      Activity.deleteMany(),
      Remark.deleteMany(),
      Reminder.deleteMany(),
      Client.deleteMany(),
      Stage.deleteMany(),
      User.deleteMany(),
    ]);

    const usersData = [
      {
        name: 'Admin User',
        email: 'admin@constructioncrm.com',
        password: 'Admin123!',
        phone: '+1 555 0100',
        role: 'admin',
        department: 'management',
      },
      {
        name: 'Project Manager',
        email: 'manager@constructioncrm.com',
        password: 'Manager123!',
        phone: '+1 555 0101',
        role: 'manager',
        department: 'operations',
      },
      {
        name: 'Sales Executive',
        email: 'sales@constructioncrm.com',
        password: 'Sales123!',
        phone: '+1 555 0102',
        role: 'user',
        department: 'sales',
      },
    ];

    const users = [];
    for (const userData of usersData) {
      const userId = await User.generateUserId();
      const user = await User.create({ ...userData, userId });
      users.push(user);
    }

    const stages = await Stage.create([
      { name: 'Prospect', description: 'New lead captured and under qualification.', order: 1, color: '#2563eb' },
      { name: 'Proposal', description: 'Proposal sent and awaiting lead response.', order: 2, color: '#eab308' },
      { name: 'Negotiation', description: 'leads is negotiating terms and pricing.', order: 3, color: '#8b5cf6' },
      { name: 'Closed', description: 'Deal closed successfully and onboarding can start.', order: 4, color: '#16a34a' },
    ]);

    const clientTemplate = [
      {
        name: 'Skyline Builders',
        company: 'Skyline Construction Co.',
        email: 'contact@skylinebuild.com',
        phone: '+1 555 1000',
        status: 'active',
        source: 'referral',
        projectValue: 340000,
        notes: 'Strong interest in a project management package.',
        address: { street: '140 Main St', city: 'Dallas', state: 'TX', zipCode: '75201', country: 'USA' },
      },
      {
        name: 'Harbor Developments',
        company: 'Harbor Developments LLC',
        email: 'info@harbordevelopments.com',
        phone: '+1 555 1001',
        status: 'lead',
        source: 'website',
        projectValue: 210000,
        notes: 'Lead from website demo request.',
        address: { street: '22 Harbor Rd', city: 'Miami', state: 'FL', zipCode: '33132', country: 'USA' },
      },
      {
        name: 'Mountain Peak Estates',
        company: 'Mountain Peak Estates',
        email: 'hello@mountainpeak.com',
        phone: '+1 555 1002',
        status: 'proposal',
        source: 'email',
        projectValue: 470000,
        notes: 'In proposal stage with a high-value opportunity.',
        address: { street: '900 Alpine Dr', city: 'Denver', state: 'CO', zipCode: '80202', country: 'USA' },
      },
      {
        name: 'Urban Apex',
        company: 'Urban Apex Contractors',
        email: 'sales@urbanapex.com',
        phone: '+1 555 1003',
        status: 'lost',
        source: 'call',
        projectValue: 150000,
        notes: 'Client chose a competitor after initial discussions.',
        address: { street: '305 Market St', city: 'San Francisco', state: 'CA', zipCode: '94105', country: 'USA' },
      },
      {
        name: 'Cedar Ridge Ventures',
        company: 'Cedar Ridge Ventures',
        email: 'contact@cedarridge.com',
        phone: '+1 555 1004',
        status: 'closed',
        source: 'social_media',
        projectValue: 520000,
        notes: 'Closed deal, onboarding scheduled for next week.',
        address: { street: '710 Ridge Ln', city: 'Seattle', state: 'WA', zipCode: '98101', country: 'USA' },
      },
    ];

    const clients = [];
    for (const [index, clientData] of clientTemplate.entries()) {
      const assignedTo = users[index % users.length];
      const currentStage = stages[index % stages.length];
      const clientId = await Client.generateClientId();
      const client = await Client.create({
        clientId,
        ...clientData,
        assignedTo: assignedTo._id,
        currentStage: currentStage._id,
      });
      clients.push(client);
    }

    const remarksData = [
      {
        client: clients[0]._id,
        user: users[2]._id,
        content: 'Intro call completed. Client wants pricing for support plan.',
        type: 'call',
        visibility: 'public',
      },
      {
        client: clients[1]._id,
        user: users[0]._id,
        content: 'Qualified lead from website. Schedule discovery meeting.',
        type: 'meeting',
        visibility: 'team',
      },
      {
        client: clients[2]._id,
        user: users[1]._id,
        content: 'Proposal sent. Awaiting feedback on scope and timeline.',
        type: 'email',
        visibility: 'public',
      },
      {
        client: clients[4]._id,
        user: users[2]._id,
        content: 'Project closed. Kickoff scheduled for Monday.',
        type: 'note',
        visibility: 'public',
      },
    ];

    const remindersData = [
      {
        client: clients[0]._id,
        user: users[2]._id,
        title: 'Follow up on support proposal',
        description: 'Check if Skyline Builders has questions on the support plan.',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        priority: 'high',
        status: 'pending',
        type: 'follow-up',
      },
      {
        client: clients[1]._id,
        user: users[1]._id,
        title: 'Discovery meeting with Harbor Developments',
        description: 'Review project challenges and contract requirements.',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        status: 'pending',
        type: 'meeting',
      },
      {
        client: clients[4]._id,
        user: users[0]._id,
        title: 'Kickoff call for Cedar Ridge Ventures',
        description: 'Confirm onboarding agenda and deliverables.',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        status: 'pending',
        type: 'task',
      },
    ];

    await Remark.create(remarksData);
    await Reminder.create(remindersData);

    await Activity.create({
      user: users[0]._id,
      type: 'seed',
      module: 'seed',
      description: 'Seeded database with sample users, stages, clients, remarks and reminders.',
    });

    res.status(200).json({
      success: true,
      message: 'Database seeded successfully',
      users: users.length,
      stages: stages.length,
      clients: clients.length,
      remarks: remarksData.length,
      reminders: remindersData.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Database seeding failed',
      error: error.message,
    });
  }
};

module.exports = {
  seedDatabase,
};
