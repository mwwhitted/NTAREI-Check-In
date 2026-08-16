import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { putRecord, getAllRecords, countRecords, clearAllRecords, _resetConnectionForTests } from '../src/db.js';

function freshIndexedDB() {
  _resetConnectionForTests();
  return new IDBFactory();
}

function sampleRecord(overrides = {}) {
  return {
    record_id: 'rec-1',
    created_at: '2026-08-15T10:00:00.000Z',
    first_name: 'Mark',
    last_name: 'Whitted',
    email: 'mark@example.com',
    first_time: true,
    source: 'NTAREI email',
    source_other: '',
    ...overrides,
  };
}

test('putRecord then getAllRecords returns the saved record', async () => {
  const idb = freshIndexedDB();
  const record = sampleRecord();
  await putRecord(record, idb);
  const all = await getAllRecords(idb);
  assert.equal(all.length, 1);
  assert.deepEqual(all[0], record);
});

test('countRecords reflects the number of stored records', async () => {
  const idb = freshIndexedDB();
  await putRecord(sampleRecord({ record_id: 'rec-1' }), idb);
  await putRecord(sampleRecord({ record_id: 'rec-2' }), idb);
  await putRecord(sampleRecord({ record_id: 'rec-3' }), idb);
  const count = await countRecords(idb);
  assert.equal(count, 3);
});

test('putRecord upserts by record_id instead of creating duplicates', async () => {
  const idb = freshIndexedDB();
  await putRecord(sampleRecord({ record_id: 'rec-1', first_name: 'Mark' }), idb);
  await putRecord(sampleRecord({ record_id: 'rec-1', first_name: 'Marcus' }), idb);
  const all = await getAllRecords(idb);
  assert.equal(all.length, 1);
  assert.equal(all[0].first_name, 'Marcus');
});

test('records persist across a simulated app close/reopen (new connection, same store)', async () => {
  const idb = freshIndexedDB();
  await putRecord(sampleRecord({ record_id: 'rec-1' }), idb);

  // Simulate the app closing and reopening: drop the cached connection and
  // open a fresh one against the same underlying indexedDB instance.
  _resetConnectionForTests();
  const all = await getAllRecords(idb);
  assert.equal(all.length, 1);
  assert.equal(all[0].record_id, 'rec-1');
});

test('clearAllRecords deletes every stored record', async () => {
  const idb = freshIndexedDB();
  await putRecord(sampleRecord({ record_id: 'rec-1' }), idb);
  await putRecord(sampleRecord({ record_id: 'rec-2' }), idb);
  await putRecord(sampleRecord({ record_id: 'rec-3' }), idb);

  await clearAllRecords(idb);

  const all = await getAllRecords(idb);
  const count = await countRecords(idb);
  assert.equal(all.length, 0);
  assert.equal(count, 0);
});

test('clearAllRecords on an already-empty store is a no-op, not an error', async () => {
  const idb = freshIndexedDB();
  await assert.doesNotReject(clearAllRecords(idb));
  const count = await countRecords(idb);
  assert.equal(count, 0);
});

test('records saved after clearAllRecords are stored normally', async () => {
  const idb = freshIndexedDB();
  await putRecord(sampleRecord({ record_id: 'rec-1' }), idb);
  await clearAllRecords(idb);
  await putRecord(sampleRecord({ record_id: 'rec-2', first_name: 'Jane' }), idb);

  const all = await getAllRecords(idb);
  assert.equal(all.length, 1);
  assert.equal(all[0].record_id, 'rec-2');
});
