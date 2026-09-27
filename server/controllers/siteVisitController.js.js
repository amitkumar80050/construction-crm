const SiteVisit = require('../models/SiteVisit');
const User = require('../models/User');
const Client = require('../models/Client');
const LeadStageHistory = require('../models/LeadStageHistory');
const { sendSiteVisitStatusEmail } = require('../services/notificationService');
const { logActivity } = require('../services/activityLogService');

const getMyVisits = async (req, res) => {
  try {
    const filter = { assignedTo: req.user.id };
    if (req.query.status === 'PLANNED' || req.query.status === 'SCHEDULED') filter.status = { $in: ['PLANNED', 'SCHEDULED'] };
    else if (req.query.status === 'DONE' || req.query.status === 'COMPLETED') filter.status = { $in: ['DONE', 'COMPLETED'] };
    else if (req.query.status === 'MISSED' || req.query.status === 'NOT_DONE') filter.status = { $in: ['MISSED', 'NOT_DONE'] };
    else filter.status = { $in: ['PLANNED', 'SCHEDULED'] };

    const visits = await SiteVisit.find(filter)
      .populate('lead', 'name phone address company')
      .sort({ scheduledAt: 1 });

    res.status(200).json({ success: true, data: visits });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const getVisit = async (req, res) => {
  try {
    const visit = await SiteVisit.findById(req.params.id).populate('lead');
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });
    if (String(visit.assignedTo) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.status(200).json({ success: true, data: visit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const completeVisit = async (req, res) => {
  try {
    const visit = await SiteVisit.findById(req.params.id);
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });
    if (String(visit.assignedTo) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized for this visit' });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'A live photo is required' });

    const { latitude, longitude, notes } = req.body;
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (latitude === undefined || latitude === '' || longitude === undefined || longitude === ''
      || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Location is required' });
    }

    visit.status = 'DONE';
    visit.photoUrl = `/uploads/site-visits/${req.file.filename}`;
    visit.latitude = lat;
    visit.longitude = lng;
    visit.notes = notes || '';
    visit.completedAt = Date.now();
    await visit.save();

    const lead = await Client.findById(visit.lead);
    if (lead && lead.pipelineStage === 'SITE_VISIT_PLANNED') {
      lead.pipelineStage = 'SITE_VISIT_DONE';
      await lead.save();
      await LeadStageHistory.create({
        lead: lead._id,
        oldStage: 'SITE_VISIT_PLANNED',
        newStage: 'SITE_VISIT_DONE',
        changedBy: req.user.id,
        notes: notes?.trim() || 'Site visit completed with photo and GPS proof.',
      });
    }

    await logActivity({ req, user: req.user, type: 'update', module: 'site_visit', description: `Completed site visit for ${lead?.name || 'lead'}`, targetId: visit._id, targetType: 'SiteVisit', client: lead?._id, metadata: { status: 'DONE', latitude: lat, longitude: lng } });
    if (visit.createdBy) {
      const manager = await User.findById(visit.createdBy).select('name email');
      if (manager) await sendSiteVisitStatusEmail(manager, visit, 'DONE');
    }
    res.status(200).json({ success: true, data: visit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const markNotDone = async (req, res) => {
  try {
    const visit = await SiteVisit.findById(req.params.id);
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });
    if (String(visit.assignedTo) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized for this visit' });
    }

    const { notDoneReason, nextDate } = req.body;
    if (!notDoneReason) return res.status(400).json({ success: false, message: 'Reason is required' });

    visit.status = 'MISSED';
    visit.notDoneReason = notDoneReason;
    if (nextDate) visit.nextDate = nextDate;
    await visit.save();

    const lead = await Client.findById(visit.lead).select('name');
    await logActivity({ req, user: req.user, type: 'update', module: 'site_visit', description: `Marked site visit for ${lead?.name || 'lead'} as not done: ${notDoneReason}`, targetId: visit._id, targetType: 'SiteVisit', client: lead?._id, metadata: { status: 'MISSED', nextDate: visit.nextDate } });
    if (visit.createdBy) {
      const manager = await User.findById(visit.createdBy).select('name email');
      if (manager) await sendSiteVisitStatusEmail(manager, visit, 'MISSED');
    }
    res.status(200).json({ success: true, data: visit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = { getMyVisits, getVisit, completeVisit, markNotDone };