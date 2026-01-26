export type TSort = {
  prop: string;
  dir: 'asc' | 'desc';
};

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

function compare(a: Record<string, unknown>, b: Record<string, unknown>, sorts: TSort[]) {
  for (const sort of sorts) {
    const { prop, dir } = sort;
    if (!prop) continue;

    const valA = (a as Record<string, unknown>)?.[prop];
    const valB = (b as Record<string, unknown>)?.[prop];

    if (valA === valB) continue;

    if (valA === undefined || valA === null) return 1;
    if (valB === undefined || valB === null) return -1;

    const comparison = valA > valB ? 1 : -1;
    return dir === 'asc' ? comparison : -comparison;
  }
  return 0;
}

export async function loadPage10k(page: number, size: number, search: string, sorts?: TSort[], delay?: number) {
  try {
    const module = await import('@/assets/data/10k.json');
    let data = module.default;
    if (search) {
      data = data.filter(row => {
        return Object.values(row).some(value => value.toString().toLowerCase().includes(search.toLowerCase()));
      });
    }
    if (sorts?.length) {
      data.sort((a, b) => compare(a, b, sorts));
    }
    const result = data.slice((page - 1) * size, page * size).map(enrichRow);
    if (delay) {
      await wait(delay);
    }
    return result;
  } catch (e) {
    console.error('Failed to load data:', e);
  }
}
