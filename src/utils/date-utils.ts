export const isValidDay = (day: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(day)) {
    return false;
  }

  const date = new Date(day);
  return date instanceof Date && !isNaN(date.getTime());
};

export const isValidTime = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};
