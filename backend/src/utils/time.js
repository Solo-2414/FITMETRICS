const TIME_ZONE = 'Asia/Manila';
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const partsFor = (value = new Date()) => Object.fromEntries(
  formatter.formatToParts(new Date(value))
    .filter(({ type }) => type !== 'literal')
    .map(({ type, value: part }) => [type, Number(part)]),
);

export const today = (value = new Date()) => {
  const { year, month, day } = partsFor(value);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const dayStart = (value = new Date()) => {
  const date = today(value);
  return new Date(`${date}T00:00:00+08:00`).toISOString();
};

export const monthStart = (value = new Date()) => {
  const date = today(value).split('-').map(Number);
  return new Date(Date.UTC(date[0], date[1] - 1, 1, -8)).toISOString();
};

export const nextDayStart = (value = new Date()) => {
  const start = new Date(dayStart(value));
  start.setUTCDate(start.getUTCDate() + 1);
  return start.toISOString();
};

export const manilaHour = (value) => Number(new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  hourCycle: 'h23',
}).format(new Date(value)));

export { TIME_ZONE };
