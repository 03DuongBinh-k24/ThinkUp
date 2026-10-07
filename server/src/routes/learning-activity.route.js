const express = require('express');
const router = express.Router();
const learningActivityController = require('../controllers/learning-activity.controller');

// Mock auth middleware - Thực tế sẽ import từ ../middlewares/auth.middleware
const mockAuthMiddleware = (req, res, next) => {
  req.user = { id: 1, email: 'user@thinkup.vn' };
  next();
};

// Đăng ký route GET / 
// (Tới đây prefix của route có thể là /api/v1/learning-activity từ app.js chính)
router.get('/', mockAuthMiddleware, learningActivityController.getLearningActivity);

module.exports = router;
