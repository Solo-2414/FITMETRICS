import assert from 'node:assert/strict';
import { hasAdminPasskey } from '../src/lib/adminPasskey.js';

assert.equal(hasAdminPasskey({ aal: 'aal1', amr: [{ method: 'password' }] }), false);
assert.equal(hasAdminPasskey({ aal: 'aal1', amr: [{ method: 'passkey' }] }), true);
assert.equal(hasAdminPasskey({ aal: 'aal2', amr: ['passkey'] }), true);

console.log('Admin passkey checks passed.');
