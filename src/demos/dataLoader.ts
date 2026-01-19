function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function enrichRow(row: Record<string, any>) {
  return {
    ...row,
    address: row.address ? `${row.address.city}, ${row.address.state}` : 'Unknown',
    company: `Company ${row.id}`, // Mock missing field
    email: `user${row.id}@example.com`, // Mock missing field
  };
}

export async function load10k(delay?: number) {
  try {
    const module = await import('@/assets/data/10k.json');
    const data = module.default.map(enrichRow);
    if (delay) {
      await wait(delay);
    }
    return data;
  } catch (e) {
    console.error('Failed to load data:', e);
  }
}

export async function loadPage10k(page: number, size: number, delay?: number) {
  try {
    const module = await import('@/assets/data/10k.json');
    const data = module.default.slice((page - 1) * size, page * size).map(enrichRow);
    if (delay) {
      await wait(delay);
    }
    return data;
  } catch (e) {
    console.error('Failed to load data:', e);
  }
}
