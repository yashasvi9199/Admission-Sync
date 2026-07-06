import { performance } from 'perf_hooks';

// Mock types
type TursoOfflineAction = {
  id: string;
  sql: string;
  args?: any[];
};

const queue: TursoOfflineAction[] = Array.from({ length: 50 }, (_, i) => ({
  id: String(i),
  sql: 'INSERT INTO dummy (id) VALUES (?)',
  args: [i]
}));

// Mock queryTurso with artificial delay
async function queryTurso(sql: string, args: any[]) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.1) reject(new Error('Random failure'));
      else resolve(true);
    }, 50); // 50ms delay
  });
}

async function runSequential() {
  const remaining: TursoOfflineAction[] = [];
  const start = performance.now();
  for (const action of queue) {
    try {
      await queryTurso(action.sql, action.args || []);
    } catch (err) {
      remaining.push(action);
    }
  }
  const end = performance.now();
  return { time: end - start, remaining };
}

async function runConcurrent() {
  const start = performance.now();
  const results = await Promise.allSettled(
    queue.map(action => queryTurso(action.sql, action.args || []))
  );

  const remaining: TursoOfflineAction[] = [];
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const action = queue[index];
      remaining.push(action);
    }
  });
  const end = performance.now();
  return { time: end - start, remaining };
}

async function run() {
  console.log('Running sequential benchmark...');
  const seqRes = await runSequential();
  console.log(`Sequential time: ${seqRes.time.toFixed(2)}ms`);

  console.log('Running concurrent benchmark...');
  const concRes = await runConcurrent();
  console.log(`Concurrent time: ${concRes.time.toFixed(2)}ms`);
}

run();
