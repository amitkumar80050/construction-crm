const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const photoUpload = require('../middleware/photoUploadMiddleware');
const {
  createSiteVisit,
  getMyVisits,
  getAllSiteVisits,
  getSiteVisitById,
  completeSiteVisit,
  markSiteVisitNotDone,
} = require('../controllers/siteVisitController');

router.use(protect);

router.route('/')
  .post(createSiteVisit)
  .get(getAllSiteVisits);

router.get('/my', getMyVisits);
router.get('/:id', getSiteVisitById);

router.post('/:id/complete', photoUpload.single('photo'), completeSiteVisit);
router.post('/:id/notdone', markSiteVisitNotDone);

module.exports = router;
