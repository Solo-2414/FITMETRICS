import 'dotenv/config';

const API_URL = (process.env.API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const roles = [
  ['admin', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'],
  ['member', 'MEMBER_EMAIL', 'MEMBER_PASSWORD'],
  ['clerk', 'CLERK_EMAIL', 'CLERK_PASSWORD'],
];
const memberEndpoints = [
  '/member/dashboard',
  '/member/membership',
  '/member/billing',
  '/member/notifications',
  '/attendance/me',
  '/attendance/analysis',
  '/me',
];
const results = [];
const record = (name, passed, detail = '') => results.push({ name, passed, detail });
const jsonRequest = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
};
const accessTokenFor = async (email, password) => {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token)
    throw new Error(`sign-in returned HTTP ${response.status}`);
  return body.access_token;
};
const requestAs = (token, path, options = {}) =>
  jsonRequest(path, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
const assertStatus = async (role, token, path, expected, label) => {
  const { response, body } = await requestAs(token, path);
  const passed = response.status === expected;
  record(
    `${role} ${label || path}`,
    passed,
    `HTTP ${response.status}${body.message ? `: ${body.message}` : ''}`,
  );
  return { response, body };
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_ANON_KEY; set them in backend/.env or the environment.',
  );
  process.exit(1);
}

try {
  const health = await fetch(`${API_URL.replace(/\/api$/, '')}/health`);
  record('health check', health.ok, `HTTP ${health.status}`);
} catch (error) {
  record('health check', false, error.message);
}

const tokens = {};
for (const [role, emailKey, passwordKey] of roles) {
  if (!process.env[emailKey] || !process.env[passwordKey]) {
    console.log(`Skipping ${role}: set ${emailKey} and ${passwordKey} to test this role.`);
    continue;
  }
  try {
    tokens[role] = await accessTokenFor(process.env[emailKey], process.env[passwordKey]);
    record(`${role} sign-in`, true);
  } catch (error) {
    record(`${role} sign-in`, false, error.message);
  }
}

if (!tokens.admin || !tokens.member) {
  console.error('Admin and member credentials are required to run maintenance assertions.');
  for (const result of results)
    console.log(`${result.passed ? 'PASS' : 'FAIL'} | ${result.name} | ${result.detail}`);
  process.exitCode = 1;
} else {
  let original;
  const testMessage = 'Maintenance test message.';
  const patchSettings = (body) =>
    requestAs(tokens.admin, '/admin/settings', { method: 'PATCH', body: JSON.stringify(body) });
  const publicStatus = () => jsonRequest('/public/status');

  try {
    const settingsResult = await requestAs(tokens.admin, '/admin/settings');
    if (!settingsResult.response.ok)
      throw new Error(`could not read settings (HTTP ${settingsResult.response.status})`);
    original = settingsResult.body;

    await patchSettings({ maintenance_enabled: false, maintenance_starts_at: null });
    const off = await publicStatus();
    record(
      'maintenance OFF public status',
      off.response.ok && off.body.maintenance === false,
      `HTTP ${off.response.status}`,
    );
    for (const endpoint of memberEndpoints)
      await assertStatus('member', tokens.member, endpoint, 200, 'OFF ' + endpoint);

    const enabled = await patchSettings({
      maintenance_enabled: true,
      maintenance_message: testMessage,
      maintenance_starts_at: null,
    });
    record(
      'enable maintenance PATCH',
      enabled.response.status === 200,
      `HTTP ${enabled.response.status}`,
    );
    const active = await publicStatus();
    record(
      'maintenance ON public status',
      active.body.maintenance === true && active.body.message === testMessage,
      `HTTP ${active.response.status}`,
    );
    for (const endpoint of memberEndpoints) {
      const result = await assertStatus('member', tokens.member, endpoint, 503, 'ON ' + endpoint);
      record(
        `member ${endpoint} maintenance payload`,
        result.body.maintenance === true,
        JSON.stringify(result.body),
      );
    }
    await assertStatus('admin', tokens.admin, '/admin/settings', 200, 'during maintenance');
    if (tokens.clerk)
      await assertStatus('clerk', tokens.clerk, '/clerk/settings', 200, 'during maintenance');

    const past = await patchSettings({
      maintenance_enabled: false,
      maintenance_starts_at: new Date(Date.now() - 60_000).toISOString(),
      maintenance_message: testMessage,
    });
    record('past schedule PATCH', past.response.status === 200, `HTTP ${past.response.status}`);
    const pastStatus = await publicStatus();
    record(
      'past schedule active',
      pastStatus.body.maintenance === true,
      `HTTP ${pastStatus.response.status}`,
    );
    const future = await patchSettings({
      maintenance_enabled: false,
      maintenance_starts_at: new Date(Date.now() + 60_000).toISOString(),
      maintenance_message: testMessage,
    });
    record('future schedule PATCH', future.response.status === 200, `HTTP ${future.response.status}`);
    const futureStatus = await publicStatus();
    record(
      'future schedule inactive',
      futureStatus.body.maintenance === false,
      `HTTP ${futureStatus.response.status}`,
    );

    await patchSettings({ maintenance_enabled: false, maintenance_starts_at: null });
    for (const endpoint of memberEndpoints)
      await assertStatus('member', tokens.member, endpoint, 200, 'RECOVERED ' + endpoint);
  } catch (error) {
    record('test execution', false, error.message);
  } finally {
    if (original) {
      const restore = {
        maintenance_enabled: Boolean(original.maintenance_enabled),
        maintenance_message: original.maintenance_message || '',
        maintenance_starts_at: original.maintenance_starts_at || null,
      };
      const restored = await patchSettings(restore);
      if (restored.response.status !== 200)
        record('restore original settings', false, `HTTP ${restored.response.status}`);
      else record('restore original settings', true);
    }
  }
}

console.log('\nResult | Check | Detail');
console.log('-------|-------|-------');
for (const result of results)
  console.log(`${result.passed ? 'PASS' : 'FAIL'} | ${result.name} | ${result.detail}`);
if (results.some((result) => !result.passed)) process.exitCode = 1;
