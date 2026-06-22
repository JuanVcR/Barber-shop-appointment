import { addDays, format, getDay, isValid, parse } from 'date-fns';

export function isValidDay(day: string) {
  const parsed = parse(day, 'yyyy-MM-dd', new Date());
  return isValid(parsed);
}

export function getWeekDayFromDay(day: string) {
  return getDay(parse(day, 'yyyy-MM-dd', new Date()));
}

export function addDaysToDay(day: string, amount: number) {
  return format(addDays(parse(day, 'yyyy-MM-dd', new Date()), amount), 'yyyy-MM-dd');
}

export function isValidTime(time: string) {
  const parsed = parse(time, 'HH:mm', new Date());
  return isValid(parsed) && /^\d{2}:\d{2}$/.test(time);
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function addMinutesToTime(time: string, minutes: number) {
  return minutesToTime(timeToMinutes(time) + minutes);
}

export function intervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
) {
  return timeToMinutes(startA) < timeToMinutes(endB)
    && timeToMinutes(endA) > timeToMinutes(startB);
}
