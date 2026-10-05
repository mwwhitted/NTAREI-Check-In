import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmail } from '../src/validation.js';

test('isValidEmail accepts ordinary name@domain.ext addresses', () => {
  assert.equal(isValidEmail('mark@example.com'), true);
  assert.equal(isValidEmail('first.last+tag@sub.example.org'), true);
});

test('isValidEmail ignores surrounding whitespace', () => {
  assert.equal(isValidEmail('  mark@example.com  '), true);
});

test('isValidEmail rejects a missing @, domain, or extension', () => {
  assert.equal(isValidEmail('markexample.com'), false);
  assert.equal(isValidEmail('mark@'), false);
  assert.equal(isValidEmail('@example.com'), false);
  assert.equal(isValidEmail('mark@example'), false);
  assert.equal(isValidEmail('mark@example.'), false);
});

test('isValidEmail rejects spaces inside the address and multiple @ signs', () => {
  assert.equal(isValidEmail('mark smith@example.com'), false);
  assert.equal(isValidEmail('mark@@example.com'), false);
  assert.equal(isValidEmail('a@b@example.com'), false);
});

test('isValidEmail rejects an empty value', () => {
  assert.equal(isValidEmail(''), false);
});
