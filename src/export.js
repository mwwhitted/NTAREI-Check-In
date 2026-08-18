const CSV_COLUMNS = [
  'record_id',
  'created_at',
  'first_name',
  'last_name',
  'email',
  'zip',
  'first_time',
  'source',
  'source_other',
];

function escapeCsvField(value) {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function recordsToCsv(records) {
  const header = CSV_COLUMNS.join(',');
  const rows = records.map((record) =>
    CSV_COLUMNS.map((column) => {
      const value = column === 'first_time' ? (record.first_time ? 'Yes' : 'No') : record[column];
      return escapeCsvField(value);
    }).join(',')
  );
  return [header, ...rows].join('\r\n') + '\r\n';
}

export function timestampForFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(
    date.getHours()
  )}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

export function downloadCsv(records, filename = 'ntarei-checkin-export.csv') {
  const csv = recordsToCsv(records);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoking immediately can race ahead of the browser actually reading the
  // blob on some mobile builds, silently dropping the download. A short
  // delay costs nothing and avoids that.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
