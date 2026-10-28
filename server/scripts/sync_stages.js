const mongoose = require('mongoose');

const PIPELINE_TO_STAGE_KEYWORDS = {
  NEW: ['new', 'lead', 'prospect'],
  CONNECTED: ['connected', 'contacted', 'connect'],
  INTERESTED: ['interested', 'interest'],
  FOLLOW_UP: ['follow-up', 'follow up', 'followup', 'follow'],
  SITE_VISIT_PLANNED: ['site visit planned', 'visit planned', 'site visit'],
  SITE_VISIT_DONE: ['site visit done', 'visit done', 'site visit completed', 'visit completed'],
  QUOTATION: ['quotation', 'proposal', 'negotiation', 'quote'],
  CONVERTED: ['converted', 'closed', 'won'],
};

async function main() {
  await mongoose.connect('mongodb://localhost:27017/construction_crm');
  console.log('Connected to MongoDB');

  const Stage = mongoose.model('Stage', new mongoose.Schema({
    name: String,
    order: Number,
    color: String,
    description: String,
    isActive: Boolean
  }, { strict: false }));

  const Lead = mongoose.model('Lead', new mongoose.Schema({
    name: String,
    pipelineStage: String,
    currentStage: { type: mongoose.Schema.Types.ObjectId, ref: 'Stage' },
    status: String
  }, { strict: false }));

  let stages = await Stage.find({}).sort({ order: 1 });
  console.log('Current stages count:', stages.length);

  const hasFollowUp = stages.some(s => s.name.toLowerCase().includes('follow'));
  const hasSiteVisitDone = stages.some(s => s.name.toLowerCase().includes('site visit done') || s.name.toLowerCase().includes('visit completed'));

  const maxOrder = stages.reduce((max, s) => Math.max(max, s.order || 0), 0);

  if (!hasFollowUp) {
    const s = await Stage.create({
      name: 'Follow-up',
      description: 'Scheduled follow-up discussion',
      order: maxOrder + 1,
      color: '#06b6d4',
      isActive: true
    });
    stages.push(s);
    console.log('Created stage: Follow-up');
  }

  if (!hasSiteVisitDone) {
    const s = await Stage.create({
      name: 'Site Visit Done',
      description: 'Site inspection completed and verified',
      order: maxOrder + 2,
      color: '#10b981',
      isActive: true
    });
    stages.push(s);
    console.log('Created stage: Site Visit Done');
  }

  stages = await Stage.find({}).sort({ order: 1 });

  const leads = await Lead.find({});
  console.log(`Found ${leads.length} leads to sync`);

  for (const lead of leads) {
    const pipe = lead.pipelineStage || 'NEW';
    const keywords = PIPELINE_TO_STAGE_KEYWORDS[pipe] || ['new', 'lead'];
    let matched = stages.find(s => keywords.some(k => s.name.toLowerCase().includes(k)));
    if (!matched && stages.length > 0) matched = stages[0];

    lead.pipelineStage = pipe;
    lead.currentStage = matched._id;
    await lead.save();
    console.log(`Synced lead "${lead.name}" -> ${pipe} (Stage: ${matched.name})`);
  }

  console.log('All leads successfully synchronized!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
