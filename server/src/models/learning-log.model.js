const pool = require('../config/db.config');

class LearningLogModel {
  static async getLogsByUserAndDateRange(userId, startDate, endDate) {
    const query = `
      SELECT 
        DATE(created_at) as log_date,
        SUM(active_time_seconds) as total_active_time
      FROM learning_logs 
      WHERE user_id = ? 
        AND created_at >= ? 
        AND created_at <= ?
      GROUP BY DATE(created_at)
      ORDER BY log_date ASC
    `;
    const endDateTime = `${endDate} 23:59:59`;
    
    const [rows] = await pool.execute(query, [userId, startDate, endDateTime]);
    return rows;
  }
  static async getAllActiveDates(userId) {
    const query = `
      SELECT DISTINCT DATE(created_at) as active_date
      FROM learning_logs
      WHERE user_id = ?
      ORDER BY active_date DESC
    `;
    const [rows] = await pool.execute(query, [userId]);
    return rows.map(r => r.active_date);
  }
  static async getUserPercentile(userId) {
    return 12; 
  }
}

module.exports = LearningLogModel;
