/**
 * Utility for validating meeting spot, date, start time, and end time.
 */

export function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const str = timeStr.trim().toUpperCase();

  // 12-hour format e.g. "2:00 PM", "10:30 AM", "02:00PM"
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3];

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // 24-hour format e.g. "14:00", "09:30"
  const match24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  return null;
}

export function validateScheduleInput({ meetingSpot, proposedDate, startTime, endTime }) {
  if (!meetingSpot || !meetingSpot.trim()) {
    return 'Meeting spot is required.';
  }

  if (!proposedDate || !proposedDate.trim()) {
    return 'Date is required.';
  }

  // Date in past check
  const selectedDate = new Date(proposedDate);
  if (!isNaN(selectedDate.getTime())) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return 'The meeting date cannot be in the past.';
    }
  }

  if (!startTime || !startTime.trim()) {
    return 'Start time is required.';
  }

  if (!endTime || !endTime.trim()) {
    return 'End time is required.';
  }

  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);

  if (startMin !== null && endMin !== null) {
    if (endMin <= startMin) {
      return 'End time must be later than start time.';
    }
  }

  return null; // Valid
}
