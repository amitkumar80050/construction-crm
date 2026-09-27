const SiteVisit = require('../models/SiteVisit');
const SiteVisitMedia = require('../models/SiteVisitMedia');
const Client = require('../models/Client');
const Stage = require('../models/Stage');
const Activity = require('../models/Activity');
const Team = require('../models/Team');
const User = require('../models/User');
const { createInAppNotification } = require('./notificationController');

// @desc    Schedule a new site visit
// @route   POST /api/site-visits
// @access  Private (Manager / Admin / Telecaller)
const createSiteVisit = async (req, res) => {
  try {
    const { clientId, executiveId, scheduledAt, address, priority, notes } = req.body;

    if (!clientId || !executiveId || !scheduledAt || !address) {
      return res.status(400).json({
        success: false,
        message: 'Please provide clientId, executiveId, scheduledAt, and address',
      });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Lead/Client not found',
      });
    }

    const executive = await User.findById(executiveId);
    if (!executive) {
      return res.status(404).json({
        success: false,
        message: 'Assigned Sales Executive not found',
      });
    }

    const visit = await SiteVisit.create({
      client: clientId,
      assignedTo: executiveId,
      scheduledAt: new Date(scheduledAt),
      address,
      priority: priority || 'MEDIUM',
      notes: notes || '',
      createdBy: req.user._id,
      status: 'PLANNED',
    });

    // Check if "Site Visit Planned" stage exists and transition lead to it
    const plannedStage = await Stage.findOne({ name: { $regex: /site\s*visit\s*planned/i } });
    if (plannedStage) {
      client.currentStage = plannedStage._id;
      await client.save();
    }

    await Activity.create({
      user: req.user._id,
      client: clientId,
      type: 'create',
      module: 'site_visit',
      description: `Scheduled site visit for ${client.name} assigned to ${executive.name} on ${new Date(scheduledAt).toLocaleString()}`,
    });

    await createInAppNotification({
      recipient: executiveId,
      type: 'site_visit_assigned',
      title: 'New Site Visit Scheduled',
      message: `Site visit for ${client.name} (${client.company}) has been assigned to you for ${new Date(scheduledAt).toLocaleString()}.`,
      link: '/site-visits',
      sender: req.user._id,
    });

    const populatedVisit = await SiteVisit.findById(visit._id)
      .populate('client', 'name company phone email address')
      .populate('assignedTo', 'name email phone')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Site visit scheduled successfully',
      data: populatedVisit,
    });
  } catch (error) {
    console.error('createSiteVisit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule site visit',
      error: error.message,
    });
  }
};

// @desc    Get site visits assigned to the logged in Sales Executive
// @route   GET /api/site-visits/my
// @access  Private (Sales Executive)
const getMyVisits = async (req, res) => {
  try {
    const query = { assignedTo: req.user._id };
    if (req.query.status) {
      query.status = req.query.status.toUpperCase();
    }

    const visits = await SiteVisit.find(query)
      .populate('client', 'name company phone email address projectValue')
      .populate('media')
      .populate('createdBy', 'name email')
      .sort({ scheduledAt: 1 });

    res.status(200).json({
      success: true,
      count: visits.length,
      data: visits,
    });
  } catch (error) {
    console.error('getMyVisits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve your site visits',
    });
  }
};

// @desc    Get all site visits (with filters for Manager / Admin)
// @route   GET /api/site-visits
// @access  Private (Manager / Admin)
const getAllSiteVisits = async (req, res) => {
  try {
    let query = {};

    if (req.query.status) {
      query.status = req.query.status.toUpperCase();
    }
    if (req.query.clientId) {
      query.client = req.query.clientId;
    }
    if (req.query.assignedTo) {
      query.assignedTo = req.query.assignedTo;
    }

    // Role-based filtering for managers
    if (req.user.role === 'manager') {
      const managedTeams = await Team.find({ teamLead: req.user._id }).select('_id');
      const teamUsers = await User.find({ teamIds: { $in: managedTeams.map((t) => t._id) } }).select('_id');
      query.$or = [
        { assignedTo: { $in: teamUsers.map((u) => u._id) } },
        { createdBy: req.user._id },
      ];
    }

    const visits = await SiteVisit.find(query)
      .populate('client', 'name company phone email address projectValue')
      .populate('assignedTo', 'name email phone role department')
      .populate('media')
      .populate('createdBy', 'name email')
      .sort({ scheduledAt: -1 });

    res.status(200).json({
      success: true,
      count: visits.length,
      data: visits,
    });
  } catch (error) {
    console.error('getAllSiteVisits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve site visits',
    });
  }
};

// @desc    Get single site visit
// @route   GET /api/site-visits/:id
// @access  Private
const getSiteVisitById = async (req, res) => {
  try {
    const visit = await SiteVisit.findById(req.params.id)
      .populate('client', 'name company phone email address projectValue')
      .populate('assignedTo', 'name email phone')
      .populate('media')
      .populate('createdBy', 'name email');

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Site visit not found',
      });
    }

    res.status(200).json({
      success: true,
      data: visit,
    });
  } catch (error) {
    console.error('getSiteVisitById error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve site visit',
    });
  }
};

// @desc    Complete site visit with Live Photo & GPS coordinates
// @route   POST /api/site-visits/:id/complete
// @access  Private (Assigned Sales Exec or Admin)
const completeSiteVisit = async (req, res) => {
  try {
    const visit = await SiteVisit.findById(req.params.id).populate('client');

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Site visit not found',
      });
    }

    // Permission check: only assigned rep or admin can complete
    if (
      req.user.role !== 'admin' &&
      String(visit.assignedTo) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to complete this site visit',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Live photo proof is required to complete a site visit',
      });
    }

    const { latitude, longitude, accuracy, address, notes } = req.body;

    // Create SiteVisitMedia record
    const fileUrl = `/uploads/site-visits/${req.file.filename}`;
    const media = await SiteVisitMedia.create({
      siteVisit: visit._id,
      type: 'PHOTO',
      url: fileUrl,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      accuracy: accuracy ? parseFloat(accuracy) : null,
      address: address || '',
      uploadedBy: req.user._id,
    });

    // Update SiteVisit status
    visit.status = 'DONE';
    visit.completedAt = new Date();
    visit.completionNotes = notes || '';
    visit.media.push(media._id);
    await visit.save();

    // Advance Client stage to "Site Visit Done" if stage exists
    if (visit.client) {
      const doneStage = await Stage.findOne({ name: { $regex: /site\s*visit\s*done/i } });
      if (doneStage) {
        await Client.findByIdAndUpdate(visit.client._id, {
          currentStage: doneStage._id,
          lastContactDate: new Date(),
        });
      }
    }

    await Activity.create({
      user: req.user._id,
      client: visit.client?._id,
      type: 'update',
      module: 'site_visit',
      description: `Completed site visit with photo & GPS proof at ${address || `${latitude}, ${longitude}`}`,
    });

    if (visit.createdBy && String(visit.createdBy) !== String(req.user._id)) {
      await createInAppNotification({
        recipient: visit.createdBy,
        type: 'site_visit_completed',
        title: 'Site Visit Completed',
        message: `${req.user.name} completed site visit for ${visit.client?.name} with live photo & GPS verification.`,
        link: '/site-visits',
        sender: req.user._id,
      });
    }

    const updated = await SiteVisit.findById(visit._id)
      .populate('client')
      .populate('assignedTo', 'name email')
      .populate('media');

    res.status(200).json({
      success: true,
      message: 'Site visit marked as completed with proof of visit!',
      data: updated,
    });
  } catch (error) {
    console.error('completeSiteVisit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete site visit',
      error: error.message,
    });
  }
};

// @desc    Mark site visit as not done (with reason & reschedule date)
// @route   POST /api/site-visits/:id/notdone
// @access  Private (Assigned Sales Exec or Admin)
const markSiteVisitNotDone = async (req, res) => {
  try {
    const { reason, nextDate, notes } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason for not completing site visit is required',
      });
    }

    const visit = await SiteVisit.findById(req.params.id).populate('client');

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Site visit not found',
      });
    }

    visit.status = 'NOT_DONE';
    visit.notDoneReason = reason;
    if (nextDate) {
      visit.notDoneNextDate = new Date(nextDate);
    }
    if (notes) {
      visit.notes = (visit.notes ? `${visit.notes}\n` : '') + `[Not Done]: ${notes}`;
    }
    await visit.save();

    await Activity.create({
      user: req.user._id,
      client: visit.client?._id,
      type: 'update',
      module: 'site_visit',
      description: `Site visit marked as NOT DONE. Reason: ${reason}${nextDate ? ` (Follow-up: ${new Date(nextDate).toLocaleDateString()})` : ''}`,
    });

    if (visit.createdBy && String(visit.createdBy) !== String(req.user._id)) {
      await createInAppNotification({
        recipient: visit.createdBy,
        type: 'site_visit_notdone',
        title: 'Site Visit Not Done',
        message: `Site visit for ${visit.client?.name} was marked not done: ${reason}`,
        link: '/site-visits',
        sender: req.user._id,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Site visit marked as not done',
      data: visit,
    });
  } catch (error) {
    console.error('markSiteVisitNotDone error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update site visit',
      error: error.message,
    });
  }
};

module.exports = {
  createSiteVisit,
  getMyVisits,
  getAllSiteVisits,
  getSiteVisitById,
  completeSiteVisit,
  markSiteVisitNotDone,
};
