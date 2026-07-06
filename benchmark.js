const records = [];
for (let i = 0; i < 10000; i++) {
  records.push({ userId: i % 10, timestamp: Date.now() - Math.random() * 1000000, type: i % 2 === 0 ? 'in' : 'out' });
}

const activeUser = { id: 5 };

console.time('No Memoization (1000 renders)');
for (let i = 0; i < 1000; i++) {
  const currentStatus = (() => {
    if (!activeUser) return 'out';
    const userPunches = records.filter(r => r.userId === activeUser.id);
    if (userPunches.length === 0) return 'out';
    return [...userPunches].sort((a, b) => b.timestamp - a.timestamp)[0].type;
  })();
}
console.timeEnd('No Memoization (1000 renders)');

console.time('Memoized (1000 renders)');
let memoizedResult;
for (let i = 0; i < 1000; i++) {
  if (i === 0) {
    memoizedResult = (() => {
      if (!activeUser) return 'out';
      const userPunches = records.filter(r => r.userId === activeUser.id);
      if (userPunches.length === 0) return 'out';
      return [...userPunches].sort((a, b) => b.timestamp - a.timestamp)[0].type;
    })();
  }
  const currentStatus = memoizedResult;
}
console.timeEnd('Memoized (1000 renders)');
