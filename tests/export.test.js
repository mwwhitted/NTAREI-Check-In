import test from 'node:test';
import assert from 'node:assert/strict';
import { recordsToCsv } from '../src/export.js';

test('recordsToCsv includes the expected header in stable column order', () => {
  const csv = recordsToCsv([]);
  const [header] = csv.split('\r\n');
  assert.equal(
    header,
    'record_id,created_at,first_name,last_name,email,zip,first_time,source,source_other'
  );
});

test('recordsToCsv renders a simple record without quoting', () => {
  const csv = recordsToCsv([
    {
      record_id: 'abc-123',
      created_at: '2026-08-15T10:00:00.000Z',
      first_name: 'Mark',
      last_name: 'Whitted',
      email: 'mark@example.com',
      zip: '75001',
      first_time: true,
      source: 'ChatGPT / AI search',
      source_other: '',
    },
  ]);
  const rows = csv.split('\r\n');
  assert.equal(
    rows[1],
    'abc-123,2026-08-15T10:00:00.000Z,Mark,Whitted,mark@example.com,75001,Yes,ChatGPT / AI search,'
  );
});

test('recordsToCsv escapes commas in a field', () => {
  const csv = recordsToCsv([
    {
      record_id: '1',
      created_at: 't',
      first_name: 'Smith, Jr.',
      last_name: 'Doe',
      email: 'a@b.com',
      zip: '75001',
      first_time: false,
      source: 'Other',
      source_other: '',
    },
  ]);
  assert.match(csv, /"Smith, Jr\."/);
});

test('recordsToCsv escapes double quotes by doubling them', () => {
  const csv = recordsToCsv([
    {
      record_id: '1',
      created_at: 't',
      first_name: 'Jo "JJ" Ann',
      last_name: 'Doe',
      email: 'a@b.com',
      zip: '75001',
      first_time: false,
      source: 'Other',
      source_other: '',
    },
  ]);
  assert.match(csv, /"Jo ""JJ"" Ann"/);
});

test('recordsToCsv escapes embedded line breaks and wraps the field in quotes', () => {
  const csv = recordsToCsv([
    {
      record_id: '1',
      created_at: 't',
      first_name: 'Line1\nLine2',
      last_name: 'Doe',
      email: 'a@b.com',
      zip: '75001',
      first_time: false,
      source: 'Other',
      source_other: 'multi\r\nline note',
    },
  ]);
  assert.match(csv, /"Line1\nLine2"/);
  assert.match(csv, /"multi\r\nline note"/);
});

test('recordsToCsv escapes a comma inside the zip field', () => {
  const csv = recordsToCsv([
    {
      record_id: '1',
      created_at: 't',
      first_name: 'A',
      last_name: 'B',
      email: 'a@b.com',
      zip: '75001, USA',
      first_time: false,
      source: 'Other',
      source_other: '',
    },
  ]);
  assert.match(csv, /"75001, USA"/);
});

test('recordsToCsv maps first_time boolean to Yes/No text', () => {
  const csv = recordsToCsv([
    {
      record_id: '1',
      created_at: 't',
      first_name: 'A',
      last_name: 'B',
      email: 'a@b.com',
      zip: '75001',
      first_time: true,
      source: 'Facebook',
      source_other: '',
    },
    {
      record_id: '2',
      created_at: 't',
      first_name: 'C',
      last_name: 'D',
      email: 'c@d.com',
      zip: '75002',
      first_time: false,
      source: 'Meetup',
      source_other: '',
    },
  ]);
  const rows = csv.trim().split('\r\n');
  assert.match(rows[1], /,Yes,/);
  assert.match(rows[2], /,No,/);
});

test('recordsToCsv handles an empty record set (header only)', () => {
  const csv = recordsToCsv([]);
  const rows = csv.trim().split('\r\n');
  assert.equal(rows.length, 1);
});
