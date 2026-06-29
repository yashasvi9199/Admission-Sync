// Lightweight HTTP client for Turso / libSQL
export async function queryTurso(sql: string, args: any[] = []): Promise<any> {
  const dbUrl = (import.meta as any).env?.VITE_TURSO_DATABASE_URL || '';
  const token = (import.meta as any).env?.VITE_TURSO_AUTH_TOKEN || '';

  if (!dbUrl || !token || dbUrl === 'your_turso_db_url_here') {
    return null;
  }

  // Convert libsql:// to https://
  const httpUrl = dbUrl.replace(/^libsql:\/\//, 'https://');

  // CORS bypass proxy for local development server
  const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const requestUrl = isLocalDev ? '/api/turso/v2/pipeline' : `${httpUrl}/v2/pipeline`;

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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
      throw new Error(`Turso HTTP Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const execResult = data.results?.[0];
    if (execResult?.type === 'error') {
      throw new Error(`Turso SQL Error: ${execResult.error.message}`);
    }

    const responseStmt = execResult?.response?.result;
    if (responseStmt) {
      const cols = responseStmt.cols.map((c: any) => c.name);
      return responseStmt.rows.map((row: any) => {
        const obj: any = {};
        row.forEach((val: any, idx: number) => {
          // Check for typed object response values
          let finalVal = val;
          if (val && typeof val === 'object' && 'value' in val) {
            finalVal = val.value;
          }
          obj[cols[idx]] = finalVal;
        });
        return obj;
      });
    }
    return null;
  } catch (error) {
    console.error('Turso DB Query Failed:', error);
    throw error;
  }
}
