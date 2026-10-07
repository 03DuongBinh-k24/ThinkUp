const learningActivityService = require('../services/learning-activity.service');

exports.getLearningActivity = async (req, res, next) => {
  try {
    // Trong thực tế, authMiddleware sẽ đặt `user` object vào `req`
    // const userId = req.user.id;
    
    // Tạm thời mock một userId cho môi trường dev/test
    const userId = req.user?.id || 1; 

    const data = await learningActivityService.getLearningActivityData(userId);
    
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    // Bắt lỗi và đẩy qua middleware xử lý lỗi tổng của Express
    next(error); 
  }
};
