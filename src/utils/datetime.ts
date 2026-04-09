import { isValid, parse } from 'date-fns';

export function isValidDay(day: string) {
  const parsed = parse(day, 'yyyy-MM-dd', new Date());
  return isValid(parsed);
}

export function isValidTime(time: string) {
  const parsed = parse(time, 'HH:mm', new Date());
  return isValid(parsed) && /^\d{2}:\d{2}$/.test(time);
}
