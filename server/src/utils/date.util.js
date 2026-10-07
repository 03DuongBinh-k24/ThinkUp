const { startOfDay, subWeeks, subDays, format, differenceInDays, isSameDay } = require('date-fns');
exports.formatDateString = (date) => {
  return format(date, 'yyyy-MM-dd');
};
exports.getCurrentWeekDays = (referenceDate = new Date()) => {
  const currentDay = referenceDate.getDay();
  const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1; 
  const monday = subDays(referenceDate, distanceToMonday);
  
  const weekDays = [];
  const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    weekDays.push({
      dateString: this.formatDateString(dayDate),
      label: labels[i]
    });
  }
  
  return weekDays;
};
exports.getDateXWeeksAgo = (weeks) => {
  const date = subWeeks(new Date(), weeks);
  return startOfDay(date);
};
