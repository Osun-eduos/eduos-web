// Reads a student list from an Excel (.xlsx) or CSV file in the browser. Nothing is uploaded until the rows are sent to the API.

export interface ImportRow {
  surname?: string;
  firstName?: string;
  middleName?: string;
  sex?: string;
  dateOfBirth?: string;
  className?: string;
  admittedOn?: string;
  stateOfOrigin?: string;
  lgaOfOrigin?: string;
  homeAddress?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  relationship?: string;
}
type Field = keyof ImportRow;

/** Template columns, in order, with an example row. */
const TEMPLATE: [string, Field, string][] = [
  ['Surname', 'surname', 'Adewale'],
  ['First name', 'firstName', 'Toluwani'],
  ['Middle name', 'middleName', 'Grace'],
  ['Sex', 'sex', 'F'],
  ['Date of birth', 'dateOfBirth', '03/02/2014'],
  ['Class', 'className', 'JSS 1A'],
  ['Admission date', 'admittedOn', '15/09/2025'],
  ['State of origin', 'stateOfOrigin', 'Osun'],
  ['LGA of origin', 'lgaOfOrigin', 'Osogbo'],
  ['Home address', 'homeAddress', '12 Station Road, Osogbo'],
  ['Parent name', 'parentName', 'Mrs Funmi Adewale'],
  ['Parent phone', 'parentPhone', '0803 111 2222'],
  ['Parent email', 'parentEmail', ''],
  ['Relationship', 'relationship', 'Mother'],
];

/** Column names schools commonly use, after lower-casing and removing spaces and punctuation. */
const ALIASES: Record<string, Field> = {
  surname: 'surname', lastname: 'surname', familyname: 'surname',
  firstname: 'firstName', givenname: 'firstName', forename: 'firstName',
  middlename: 'middleName', othername: 'middleName', othernames: 'middleName',
  sex: 'sex', gender: 'sex',
  dateofbirth: 'dateOfBirth', dob: 'dateOfBirth', birthdate: 'dateOfBirth', birthday: 'dateOfBirth',
  class: 'className', classname: 'className', classarm: 'className', arm: 'className',
  admissiondate: 'admittedOn', dateofadmission: 'admittedOn', admittedon: 'admittedOn', admitted: 'admittedOn',
  stateoforigin: 'stateOfOrigin', state: 'stateOfOrigin',
  lgaoforigin: 'lgaOfOrigin', lga: 'lgaOfOrigin',
  homeaddress: 'homeAddress', address: 'homeAddress',
  parentname: 'parentName', parentfullname: 'parentName', guardianname: 'parentName', parent: 'parentName', guardian: 'parentName',
  parentphone: 'parentPhone', parentphonenumber: 'parentPhone', guardianphone: 'parentPhone', phone: 'parentPhone', phonenumber: 'parentPhone',
  parentemail: 'parentEmail', guardianemail: 'parentEmail', email: 'parentEmail',
  relationship: 'relationship', relationshiptostudent: 'relationship', relation: 'relationship',
};
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Finds the field for a column name: an exact alias first, then keywords ("Parent/Guardian phone no.", "Father's mobile"). */
export function fieldFor(header: string): Field | undefined {
  const k = key(header);
  if (!k) return undefined;
  if (ALIASES[k]) return ALIASES[k];
  const parentish = /parent|guardian|father|mother|sponsor/.test(k);
  if (/phone|mobile|tel|gsm/.test(k)) return 'parentPhone';
  if (/email/.test(k)) return 'parentEmail';
  if (/relation/.test(k)) return 'relationship';
  if (parentish && /name/.test(k)) return 'parentName';
  if (/birth|dob/.test(k)) return 'dateOfBirth';
  if (/admi/.test(k) && /date|on/.test(k)) return 'admittedOn';
  if (/surname|lastname/.test(k)) return 'surname';
  if (/firstname/.test(k)) return 'firstName';
  if (/middle|othername/.test(k)) return 'middleName';
  return undefined;
}

export function buildTemplateCsv() {
  const q = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  // The byte-order mark makes Excel open the file as UTF-8.
  return '﻿' + [TEMPLATE.map((t) => t[0]), TEMPLATE.map((t) => t[2])].map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';
}

/** Splits CSV text into rows of cells (RFC 4180: quoted cells may hold commas, quotes and line breaks). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (quoted) {
      if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',' || ch === ';') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Turns a cell into text the API understands. Excel dates become YYYY-MM-DD; phone numbers keep their leading 0. */
export function cellText(v: unknown, field: Field | undefined): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  if (typeof v === 'number' && field === 'parentPhone') {
    const s = String(Math.round(v));
    return s.length === 10 && /^[789]/.test(s) ? '0' + s : s;
  }
  const s = String(v).trim();
  return s || undefined;
}

/** Maps a header row and data rows to import rows, dropping empty rows. */
export function toRows(table: unknown[][]) {
  const header = (table[0] ?? []).map((h) => (h === null || h === undefined ? '' : String(h)));
  const fields = header.map(fieldFor);
  const recognised = [...new Set(fields.filter(Boolean))] as Field[];
  const unknown = header.filter((h, i) => h.trim() && !fields[i]);
  const rows: ImportRow[] = [];
  for (const line of table.slice(1)) {
    const r: ImportRow = {};
    line.forEach((v, i) => {
      const f = fields[i];
      if (!f || r[f]) return;
      const t = cellText(v, f);
      if (t) r[f] = t.slice(0, 250);
    });
    if (Object.keys(r).length) rows.push(r);
  }
  return { rows, recognised, unknown };
}

export async function readRows(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return toRows(parseCsv(await file.text()));
  if (name.endsWith('.xlsx')) {
    const { readSheet } = await import('read-excel-file/browser');
    return toRows(await readSheet(file));
  }
  if (name.endsWith('.xls')) throw new Error('This is an old Excel file (.xls). Open it in Excel and save it as .xlsx or CSV, then choose it again.');
  throw new Error('Choose an Excel (.xlsx) or CSV file.');
}
