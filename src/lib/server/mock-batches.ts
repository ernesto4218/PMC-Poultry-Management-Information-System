// src/lib/server/mock-batches.ts
import type { ChickBatchWithFarm } from '#lib/types/chick-batches.ts';

function daysAgo(n: number): string {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d.toISOString().slice(0, 10);
}

export const MOCK_BATCHES: ChickBatchWithFarm[] = [
	{
		id: 'batch-1',
		farmId: 'farm-1',
		batchNumber: 'JAYS-1H1 110126-01',
		dateSet: daysAgo(2),
		volume: 500,
		sequence: 1,
		farm: {
			id: 'farm-1',
			name: 'Puting Manok — Pagadian',
			code: 'JAYS-1H1',
			address: 'Brgy. San Jose, Pagadian City'
		}
	},
	{
		id: 'batch-2',
		farmId: 'farm-2',
		batchNumber: 'CON-MAH 110826-02',
		dateSet: daysAgo(12),
		volume: 1000,
		sequence: 2,
		farm: {
			id: 'farm-2',
			name: 'Mahayag Farm',
			code: 'CON-MAH',
			address: 'Mahayag, Zamboanga del Sur'
		}
	},
	{
		id: 'batch-3',
		farmId: 'farm-3',
		batchNumber: 'CCS 102026-01',
		dateSet: daysAgo(28),
		volume: 750,
		sequence: 1,
		farm: {
			id: 'farm-3',
			name: 'CCS Farm',
			code: 'CCS',
			address: 'Molave, Zamboanga del Sur'
		}
	},
	{
		id: 'batch-4',
		farmId: 'farm-1',
		batchNumber: 'JAYS-1H1 112026-02',
		dateSet: daysAgo(38),
		volume: 400,
		sequence: 2,
		farm: {
			id: 'farm-1',
			name: 'Puting Manok — Pagadian',
			code: 'JAYS-1H1',
			address: 'Brgy. San Jose, Pagadian City'
		}
	}
];

export function getMockBatches(): ChickBatchWithFarm[] {
	return MOCK_BATCHES;
}
