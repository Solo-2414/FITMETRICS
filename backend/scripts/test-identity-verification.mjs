import assert from 'node:assert/strict';
import {
  automatedIdentityCheckStatus,
  automatedReviewResult,
  sanitizeReviewReason,
  validateIdLast4,
  validateIdentityImage,
} from '../src/lib/identityVerification.js';
import { idTextContainsName } from '../src/services/identityProviders.js';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

assert.equal(validateIdentityImage({ buffer: jpeg, mimetype: 'image/jpeg' }), 'image/jpeg');
assert.equal(validateIdentityImage({ buffer: png, mimetype: 'image/png' }), 'image/png');
assert.throws(() => validateIdentityImage({ buffer: jpeg, mimetype: 'image/png' }), /valid JPG or PNG/);
assert.throws(() => validateIdentityImage({ buffer: Buffer.from('not an image'), mimetype: 'image/jpeg' }), /valid JPG or PNG/);
assert.equal(validateIdLast4('aB12'), 'AB12');
assert.throws(() => validateIdLast4('123456'), /final four/);
assert.equal(sanitizeReviewReason('Reviewed ID 1234 5678 9012 in person.'), 'Reviewed ID ****9012 in person.');
assert.equal(sanitizeReviewReason('Checked number 1234/5678/9012.'), 'Checked number ****9012.');
assert.equal(idTextContainsName('JUAN CARLOS RAMÍREZ', 'Juan Carlos Ramirez'), true);
assert.equal(idTextContainsName('Any text', '---'), false);

for (const confidence of [99.99, 0.01]) {
  assert.equal(automatedReviewResult({
    faceMatch: { confidence },
    idNameMatch: false,
  }).status, 'needs_review');
}
assert.equal(automatedReviewResult({ faceMatch: null, idNameMatch: null }).score, null);
assert.equal(automatedIdentityCheckStatus({
  livenessCheckCompleted: false,
  ocrSucceeded: true,
  faceSucceeded: false,
}), 'manual_only');
assert.equal(automatedIdentityCheckStatus({
  livenessCheckCompleted: true,
  ocrSucceeded: true,
  faceSucceeded: true,
}), 'complete');
assert.equal(automatedIdentityCheckStatus({
  livenessCheckCompleted: true,
  ocrSucceeded: false,
  faceSucceeded: true,
}), 'unavailable');

console.log('Identity verification checks passed.');
