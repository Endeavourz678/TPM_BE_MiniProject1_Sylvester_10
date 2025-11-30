const express = require('express');
const router = express.Router();
const api = require('../controllers/apiController');

router.get('/events', api.listEvents);
router.post('/submit', api.submitFeedback);
router.get('/feedback', api.listFeedback);

router.post('/events', api.createEvent);
router.post('/events/:id/delete', api.deleteEvent);
router.post('/feedback/:id/delete', api.deleteFeedback);
router.get('/feedback/export', api.exportFeedback);

module.exports = router;
