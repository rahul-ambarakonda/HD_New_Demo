// A simple assertion helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

// Import the function to be tested
const { isValidEmail } = await import('./validate.js');

try {
  // --- Test Case 1: Valid email addresses ---
  assert(isValidEmail('test@example.com') === true, 'Valid email: test@example.com');
  assert(isValidEmail('user.name@sub.domain.co') === true, 'Valid email: user.name@sub.domain.co');
  assert(isValidEmail('UPPERCASE@EXAMPLE.COM') === true, 'Valid email: UPPERCASE@EXAMPLE.COM');
  assert(isValidEmail('  padded@example.com  ') === true, 'Valid email: padded@example.com (trimmed)');
  assert(isValidEmail('a@b.co') === true, 'Valid email: a@b.co (short)');
  console.log('Test Case 1 Passed: Valid email addresses.');

  // --- Test Case 2: Invalid email addresses ---
  assert(isValidEmail('') === false, 'Invalid email: empty string');
  assert(isValidEmail(' ') === false, 'Invalid email: whitespace only');
  assert(isValidEmail('not-an-email') === false, 'Invalid email: no @');
  assert(isValidEmail('user@') === false, 'Invalid email: no domain');
  assert(isValidEmail('@domain.com') === false, 'Invalid email: no local part');
  assert(isValidEmail('user@domain') === false, 'Invalid email: no TLD');
  assert(isValidEmail('user@domain.c') === false, 'Invalid email: TLD too short');
  assert(isValidEmail('user@domain..com') === false, 'Invalid email: double dot in domain');
  assert(isValidEmail('user@domain com') === false, 'Invalid email: space in domain');
  assert(isValidEmail(null) === false, 'Invalid email: null');
  assert(isValidEmail(undefined) === false, 'Invalid email: undefined');
  assert(isValidEmail(123) === false, 'Invalid email: number');
  assert(isValidEmail({}) === false, 'Invalid email: object');

  // Test for email length > 254
  const longLocalPart = 'a'.repeat(240); // 240 chars
  const longEmail = longLocalPart + '@example.com'; // 240 + 1 + 10 = 251 chars (valid)
  assert(isValidEmail(longEmail) === true, 'Valid email: long but within limit');

  const superLongLocalPart = 'a'.repeat(245); // 245 chars
  const superLongEmail = superLongLocalPart + '@example.com'; // 245 + 1 + 10 = 256 chars (invalid)
  assert(isValidEmail(superLongEmail) === false, 'Invalid email: exceeds 254 characters');

  console.log('Test Case 2 Passed: Invalid email addresses.');

} catch (error) {
  console.error('isValidEmail tests FAILED:', error.message);
} finally {
  console.log('isValidEmail tests completed.');
}
