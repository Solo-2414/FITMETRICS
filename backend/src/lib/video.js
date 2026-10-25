export const VIDEO_CATEGORIES = [
  'Chest / Triceps',
  'Back / Biceps',
  'Legs / Glutes',
  'Shoulders / Core',
  'Full Body / Mobility',
];

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);

export function parseVideoUrl(value) {
  if (typeof value !== 'string' || value.length > 500) throw new Error('Video URL must be a valid HTTPS YouTube or Vimeo link.');
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('Video URL must be a valid HTTPS YouTube or Vimeo link.'); }
  if (url.protocol !== 'https:') throw new Error('Video URL must use HTTPS.');

  const host = url.hostname.toLowerCase();
  if (YOUTUBE_HOSTS.has(host)) {
    let id = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v');
    if (!id && url.pathname.startsWith('/embed/')) id = url.pathname.split('/')[2];
    if (!id || !/^[\w-]{11}$/.test(id)) throw new Error('Enter a valid YouTube video link.');
    return {
      provider: 'youtube',
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }
  if (host === 'vimeo.com' || host === 'www.vimeo.com') {
    const match = url.pathname.match(/^\/(?:video\/)?(\d+)\/?$/);
    if (!match) throw new Error('Enter a valid Vimeo video link.');
    return { provider: 'vimeo', id: match[1], embedUrl: `https://player.vimeo.com/video/${match[1]}`, thumbnailUrl: null };
  }
  throw new Error('Only HTTPS YouTube and Vimeo links are allowed.');
}

export function durationLabel(seconds) {
  if (seconds === null || seconds === undefined) return 'No duration';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function parseDuration(value) {
  if (typeof value !== 'string' || !/^\d{1,3}:\d{2}$/.test(value.trim())) throw new Error('Duration must use mm:ss format.');
  const [minutes, seconds] = value.trim().split(':').map(Number);
  const total = minutes * 60 + seconds;
  if (seconds > 59 || total < 1 || total > 4 * 60 * 60) throw new Error('Duration must be between 00:01 and 240:00.');
  return total;
}

