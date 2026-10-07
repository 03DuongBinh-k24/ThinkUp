const LearningLogModel = require('../models/learning-log.model');
const dateUtils = require('../utils/date.util');

const WEEKS_TO_TRACK = 12; // Track 12 tuần (84 ngày)

/**
 * Xử lý logic tính level cho khoảng thời gian học (0-4)
 */
const calculateLevel = (activeTimeSeconds) => {
  if (!activeTimeSeconds || activeTimeSeconds <= 0) return 0;
  if (activeTimeSeconds < 1800) return 1; // Dưới 30 phút
  if (activeTimeSeconds < 3600) return 2; // Dưới 1 tiếng
  if (activeTimeSeconds < 7200) return 3; // Dưới 2 tiếng
  return 4; // Trên 2 tiếng
};

exports.getLearningActivityData = async (userId) => {
  const today = new Date();
  const startDate = dateUtils.formatDateString(dateUtils.getDateXWeeksAgo(WEEKS_TO_TRACK));
  const endDate = dateUtils.formatDateString(today);

  // 1. Lấy lịch sử 90 ngày (12 tuần)
  const logs = await LearningLogModel.getLogsByUserAndDateRange(userId, startDate, endDate);
  
  // Chuyển mảng logs thành một map (key: YYYY-MM-DD, value: tổng giây) để tra cứu nhanh (O(1))
  const logMap = {};
  logs.forEach(log => {
    // Vì DB trả về `log.log_date` (tùy thuộc vào node-mysql2 parse nó thành Date object hay chuỗi)
    const dateStr = log.log_date instanceof Date ? dateUtils.formatDateString(log.log_date) : log.log_date.split('T')[0];
    logMap[dateStr] = Number(log.total_active_time || 0);
  });

  // 2. Tính Chuỗi học tập (Streak)
  // Tính ngược từ hôm nay, nếu không có thì xem hôm qua. Chuỗi bị cắt đứt nếu có 1 ngày không có.
  const allActiveDates = await LearningLogModel.getAllActiveDates(userId);
  const activeDateStrings = new Set(allActiveDates.map(d => 
    d instanceof Date ? dateUtils.formatDateString(d) : d.split('T')[0]
  ));
  
  let currentStreak = 0;
  let checkDate = new Date(today);
  
  // Nếu hôm nay không học, kiểm tra hôm qua, nếu qua học thì chuỗi vẫn chưa mất (chỉ là chưa điểm danh hôm nay)
  const todayStr = dateUtils.formatDateString(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = dateUtils.formatDateString(yesterday);

  if (!activeDateStrings.has(todayStr)) {
    checkDate = yesterday;
  }

  while (activeDateStrings.has(dateUtils.formatDateString(checkDate))) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  const percentile = await LearningLogModel.getUserPercentile(userId);

  // 3. Tính trạng thái Tuần hiện tại
  const currentWeekDays = dateUtils.getCurrentWeekDays(today);
  const currentWeekStatus = currentWeekDays.map(day => ({
    label: day.label,
    active: activeDateStrings.has(day.dateString)
  }));

  // 4. Xây dựng Heatmap Grid (12 tuần)
  // Cấu trúc mong muốn: mảng các tuần, mỗi tuần là mảng 7 level (0-4)
  const heatmapWeeks = [];
  const startOfHeatmap = dateUtils.getDateXWeeksAgo(WEEKS_TO_TRACK - 1);
  // Đưa về ngày đầu tuần (Thứ 2)
  const currentDay = startOfHeatmap.getDay();
  const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1; 
  startOfHeatmap.setDate(startOfHeatmap.getDate() - distanceToMonday);

  let tempDate = new Date(startOfHeatmap);
  
  for (let week = 0; week < WEEKS_TO_TRACK; week++) {
    const weekData = [];
    for (let day = 0; day < 7; day++) {
      const dateStr = dateUtils.formatDateString(tempDate);
      const activeTime = logMap[dateStr] || 0;
      weekData.push(calculateLevel(activeTime));
      
      // Tăng tempDate thêm 1 ngày
      tempDate.setDate(tempDate.getDate() + 1);
      
      // Nếu tempDate vượt qua hôm nay, ghi level 0 (hoặc bỏ qua tuỳ UI thiết kế)
    }
    heatmapWeeks.push(weekData);
  }

  // 5. Thống kê (Stats)
  let totalActiveDays = 0;
  let totalActiveSeconds = 0;
  for (const time of Object.values(logMap)) {
    if (time > 0) {
      totalActiveDays++;
      totalActiveSeconds += time;
    }
  }

  const totalHours = (totalActiveSeconds / 3600).toFixed(1);
  
  // Tính % tăng trưởng (So sánh với 12 tuần trước đó - Mock logic)
  // Thực tế sẽ phải query DB thêm.
  const growthPercentage = 21; 

  return {
    streak: {
      current: currentStreak,
      percentile: percentile
    },
    currentWeekStatus,
    heatmapWeeks,
    stats: {
      activeDays: totalActiveDays,
      totalHours: Number(totalHours),
      growthPercentage
    }
  };
};
