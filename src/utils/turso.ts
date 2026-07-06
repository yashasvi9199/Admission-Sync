import { Capacitor } from '@capacitor/core';

// Secure client for Turso / libSQL proxying via Cloudflare Pages functions
export async function queryTurso(sql: string, args: any[] = []): Promise<any> {
  const dbUrl = (import.meta as any).env?.VITE_TURSO_DATABASE_URL || '';
  const token = (import.meta as any).env?.VITE_TURSO_AUTH_TOKEN || '';

  let requestUrl = '/api/turso';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  // Determine if running inside native Capacitor environment (not served from cloudflare pages)
  const isNativeCapacitor = Capacitor.isNativePlatform();

  if (isNativeCapacitor && dbUrl && token && dbUrl !== 'your_turso_db_url_here') {
    const httpUrl = dbUrl.replace(/^libsql:\/\//, 'https://');
    requestUrl = `${httpUrl}/v2/pipeline`;
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        requests: [
          {
            type: 'execute',
            stmt: {
              sql,
              args: args.map(arg => {
                if (arg === null || arg === undefined) {
                  return { type: 'null' };
                }
                if (typeof arg === 'boolean') {
                  return { type: 'integer', value: arg ? '1' : '0' };
                }
                if (typeof arg === 'number') {
                  if (Number.isInteger(arg)) {
                    return { type: 'integer', value: arg.toString() };
                  } else {
                    return { type: 'float', value: arg };
                  }
                }
                return { type: 'text', value: arg.toString() };
              })
            }
          },
          {
            type: 'close'
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Proxy HTTP Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const execResult = data.results?.[0];
    if (execResult?.type === 'error') {
      throw new Error(`Turso SQL Error: ${execResult.error.message}`);
    }

    const responseStmt = execResult?.response?.result;
    if (responseStmt) {
      const cols = responseStmt.cols.map((c: { name: string }) => c.name);
      return responseStmt.rows.map((row: unknown[]) => {
        const obj: Record<string, unknown> = {};
        row.forEach((val: unknown, idx: number) => {
          let finalVal = val;
          if (val && typeof val === 'object' && 'value' in val) {
            finalVal = (val as { value: unknown }).value;
          }
          obj[cols[idx]] = finalVal;
        });
        return obj;
      });
    }
    return null;
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
}
