const TIME_ZONE = 'Asia/Manila';
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

export const manilaDateString = (value = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date(value));

export const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return manilaDateString(date);
};

export const rangeFromDates = (from, to) => ({
  from: new Date(`${from}T00:00:00+08:00`).toISOString(),
  to: new Date(`${to}T00:00:00+08:00`).toISOString(),
});

export const manilaRange = (range = 'today', value = new Date()) => {
  const today = manilaDateString(value);
  const days = range === '30d' ? 30 : range === '7d' ? 7 : 1;
  const from = addDays(today, -(days - 1));
  return { fromDate: from, toDate: addDays(today, 1), ...rangeFromDates(from, addDays(today, 1)) };
};

export const manilaHour = (value) => Number(new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  hourCycle: 'h23',
}).format(new Date(value)));

export const previousRange = (fromDate, toDate) => {
  const days = Math.round((new Date(`${toDate}T00:00:00+08:00`) - new Date(`${fromDate}T00:00:00+08:00`)) / 86400000);
  const previousTo = fromDate;
  const previousFrom = addDays(fromDate, -days);
  return { fromDate: previousFrom, toDate: previousTo, ...rangeFromDates(previousFrom, previousTo) };
};

export { MANILA_OFFSET_MS, TIME_ZONE };
