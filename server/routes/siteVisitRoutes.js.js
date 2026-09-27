const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/visitUploadMiddleware');
const ctrl = require('../controllers/siteVisitController.js.js');

router.get('/my', protect, ctrl.getMyVisits);
router.get('/:id', protect, ctrl.getVisit);
router.post('/:id/complete', protect, upload.single('photo'), ctrl.completeVisit);
router.post('/:id/not-done', protect, ctrl.markNotDone);

module.exports = router;