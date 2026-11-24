import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVerificationSteps,
  formatAbhaInput,
  getInitials,
  isValidAbhaId,
  isValidEmail,
  isValidIndianPhone,
  normalizeIndianPhone,
} from './authValidation';

test('formatAbhaInput masks digits as XX-XXXX-XXXX-XXXX up to 14 digits', () => {
  assert.equal(formatAbhaInput('27481930228194999'), '27-4819-3022-8194');
  assert.equal(formatAbhaInput('27-4819'), '27-4819');
  assert.equal(isValidAbhaId('27-4819-3022-8194'), true);
  assert.equal(isValidAbhaId('27-4819-3022'), false);
});

test('Indian phone validation and formatting handles +91 prefix and 10 digits', () => {
  assert.equal(normalizeIndianPhone('9823044120'), '+91 98230 44120');
  assert.equal(normalizeIndianPhone('919823044120'), '+91 98230 44120');
  assert.equal(isValidIndianPhone('+91 98230 44120'), true);
  assert.equal(isValidIndianPhone('1234567890'), false);
  assert.equal(isValidIndianPhone('98230'), false);
});

test('isValidEmail and getInitials behave deterministically', () => {
  assert.equal(isValidEmail('priya.sharma@swiftcare.in'), true);
  assert.equal(isValidEmail('invalid-email'), false);
  assert.equal(getInitials('Priya Sharma'), 'PS');
  assert.equal(getInitials('Abhinav'), 'AB');
  assert.equal(getInitials(''), 'SC');
});

test('buildVerificationSteps marks done, active, idle, and error states cleanly', () => {
  const step2Active = buildVerificationSteps({ provider: 'abha', activeStepIndex: 1 });
  assert.equal(step2Active[0].status, 'done');
  assert.equal(step2Active[1].status, 'active');
  assert.equal(step2Active[2].status, 'idle');
  assert.equal(step2Active[3].status, 'idle');

  const stepErrored = buildVerificationSteps({
    provider: 'email',
    activeStepIndex: 1,
    errorIndex: 1,
    errorMessage: 'Invalid password',
  });
  assert.equal(stepErrored[1].status, 'error');
  assert.equal(stepErrored[1].detail, 'Invalid password');
});
