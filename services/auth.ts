// services/auth.ts

export interface AppUser {
  username: string;
  namaGuru: string;
  nip: string;
}

export const SPREADSHEET_ID = "1AfWC71g0kj1ZVSYT1cYSqMIiSCzr0pJhCqQTB7iuxsQ";
export const SHEET_NAME = "Users";

const parseGVizJson = (responseText: string): any[] => {
  // GViz response format: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  const start = responseText.indexOf('{');
  const end = responseText.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error("Format respons Google Sheets tidak valid.");
  }
  const jsonStr = responseText.substring(start, end + 1);
  const data = JSON.parse(jsonStr);

  const cols = data.table.cols.map((c: any) => (c?.label || c?.id || '').trim().toLowerCase());
  const rows = data.table.rows;

  // Find column indexes
  let usernameIdx = cols.findIndex((c: string) => c.includes('user'));
  let passwordIdx = cols.findIndex((c: string) => c.includes('pass'));
  let namaIdx = cols.findIndex((c: string) => c.includes('nama'));
  let nipIdx = cols.findIndex((c: string) => c.includes('nip'));

  // Default fallback indexes if headers aren't labeled explicitly
  if (usernameIdx === -1) usernameIdx = 0;
  if (passwordIdx === -1) passwordIdx = 1;
  if (namaIdx === -1) namaIdx = 2;
  if (nipIdx === -1) nipIdx = 3;

  const users: any[] = [];
  for (const row of rows) {
    const c = row.c;
    if (!c) continue;
    const username = c[usernameIdx]?.v?.toString().trim() || '';
    const password = c[passwordIdx]?.v?.toString().trim() || '';
    const namaGuru = c[namaIdx]?.v?.toString().trim() || '';
    const nip = c[nipIdx]?.v?.toString().trim() || '';

    // Ignore header row if accidentally parsed
    if (username.toLowerCase() === 'username' && password.toLowerCase() === 'password') {
      continue;
    }

    if (username && password) {
      users.push({
        username,
        password,
        namaGuru: namaGuru || username,
        nip: nip || '-'
      });
    }
  }

  return users;
};

const parseCsv = (csvText: string): any[] => {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Parse CSV line handling potential quotes
  const parseLine = (line: string): string[] => {
    const parts: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        parts.push(cur.replace(/^"|"$/g, '').trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    parts.push(cur.replace(/^"|"$/g, '').trim());
    return parts;
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase());
  let usernameIdx = headers.findIndex(h => h.includes('user'));
  let passwordIdx = headers.findIndex(h => h.includes('pass'));
  let namaIdx = headers.findIndex(h => h.includes('nama'));
  let nipIdx = headers.findIndex(h => h.includes('nip'));

  if (usernameIdx === -1) usernameIdx = 0;
  if (passwordIdx === -1) passwordIdx = 1;
  if (namaIdx === -1) namaIdx = 2;
  if (nipIdx === -1) nipIdx = 3;

  const users: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const username = cols[usernameIdx] || '';
    const password = cols[passwordIdx] || '';
    const namaGuru = cols[namaIdx] || '';
    const nip = cols[nipIdx] || '';

    if (username && password) {
      users.push({
        username,
        password,
        namaGuru: namaGuru || username,
        nip: nip || '-'
      });
    }
  }
  return users;
};

export const fetchUsersFromSpreadsheet = async (): Promise<{ users: any[]; error?: string; isPrivate?: boolean }> => {
  // Method 1: Google Visualization API (GViz)
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}&_ts=${Date.now()}`;
  
  try {
    const res = await fetch(gvizUrl);
    const text = await res.text();

    if (text.includes('Sign in to your Google Account') || text.includes('accounts.google.com') || text.includes('ServiceLogin')) {
      return {
        users: [],
        isPrivate: true,
        error: "Google Spreadsheet masih bersifat Privat. Ubah akses di Google Sheets menjadi 'Siapa saja yang memiliki link' (Viewer/Pelihat)."
      };
    }

    if (text.includes('google.visualization.Query.setResponse')) {
      const users = parseGVizJson(text);
      if (users.length > 0) {
        return { users };
      }
    }
  } catch (err: any) {
    console.warn("GViz fetch failed, trying CSV fallback...", err);
  }

  // Method 2: CSV Export fallback
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}&_ts=${Date.now()}`;
  try {
    const res = await fetch(csvUrl);
    const text = await res.text();

    if (text.includes('Sign in to your Google Account') || text.includes('accounts.google.com')) {
      return {
        users: [],
        isPrivate: true,
        error: "Google Spreadsheet masih bersifat Privat. Silakan bagikan spreadsheet dengan akses 'Siapa saja dengan link' (Viewer)."
      };
    }

    const users = parseCsv(text);
    return { users };
  } catch (err: any) {
    return {
      users: [],
      error: `Gagal mengakses database spreadsheet: ${err.message || 'Koneksi error'}`
    };
  }
};
