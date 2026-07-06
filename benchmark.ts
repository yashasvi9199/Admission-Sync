import { performance } from 'perf_hooks';

const generateData = (numUsers: number, recordsPerUser: number) => {
  const users: any[] = Array.from({ length: numUsers }, (_, i) => ({ id: `user-${i}` }));
  const records: any[] = [];
  const breaks: any[] = [];

  for (let i = 0; i < numUsers; i++) {
    for (let j = 0; j < recordsPerUser; j++) {
      records.push({
        userId: `user-${i}`,
        timestamp: Date.now() - Math.random() * 1000000,
        type: Math.random() > 0.5 ? 'in' : 'out',
      });
    }
    if (Math.random() > 0.8) {
      breaks.push({
        userId: `user-${i}`,
        endTime: null,
        type: 'lunch',
      });
    }
  }

  return { users, records, breaks };
};

const { users, records, breaks } = generateData(1000, 50); // 1,000 users, 50,000 records total

// ORIGINAL CODE
const startOriginal = performance.now();
const liveRosterOriginal = users.map(user => {
  const userPunches = records.filter(r => r.userId === user.id);
  const lastPunch = userPunches.length > 0
    ? [...userPunches].sort((a, b) => b.timestamp - a.timestamp)[0]
    : null;

  const activeBreak = breaks.find(b => b.userId === user.id && b.endTime === null);

  let status = 'absent';
  if (lastPunch && lastPunch.type === 'in') {
    status = activeBreak ? 'break' : 'present';
  }

  return {
    ...user,
    status,
    breakType: activeBreak ? activeBreak.type : null
  };
});
const endOriginal = performance.now();

// NEW CODE
const startNew = performance.now();
const latestPunchByUserId = new Map();
for (let i = 0; i < records.length; i++) {
  const r = records[i];
  const existing = latestPunchByUserId.get(r.userId);
  if (!existing || r.timestamp > existing.timestamp) {
    latestPunchByUserId.set(r.userId, r);
  }
}

const activeBreakByUserId = new Map();
for (let i = 0; i < breaks.length; i++) {
  const b = breaks[i];
  if (b.endTime === null) {
    activeBreakByUserId.set(b.userId, b);
  }
}

const liveRosterNew = users.map(user => {
  const lastPunch = latestPunchByUserId.get(user.id) || null;
  const activeBreak = activeBreakByUserId.get(user.id);

  let status = 'absent';
  if (lastPunch && lastPunch.type === 'in') {
    status = activeBreak ? 'break' : 'present';
  }

  return {
    ...user,
    status,
    breakType: activeBreak ? activeBreak.type : null
  };
});
const endNew = performance.now();

console.log(`Original Time: ${(endOriginal - startOriginal).toFixed(2)} ms`);
console.log(`New Time: ${(endNew - startNew).toFixed(2)} ms`);
console.log(`Speedup: ${((endOriginal - startOriginal) / (endNew - startNew)).toFixed(2)}x`);
