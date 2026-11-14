// src/routes/admin/chick-management/+page.server.ts
import type { PageServerLoad } from './$types';
import { MEDICINE_SCHEDULE } from '#lib/server/medicine-schedule.ts';
import { getCompleted } from '#lib/server/medicine-memory.ts';
import { getMockBatches } from '#lib/server/mock-batches.ts';
import type { MedicineEntry } from '#lib/types/medicine.ts';
import type { ChickBatchWithFarm } from '#lib/types/chick-batches.ts';

type BatchStatus = 'on-track' | 'at-risk' | 'critical' | 'complete';

interface BatchOverview {
	batch: ChickBatchWithFarm;
	currentDay: number;
	completedCount: number;
	totalEntries: number;
	completionPct: number;
	overdue: MedicineEntry[];
	today: MedicineEntry[];
	upcoming: MedicineEntry[];
	nextDue: MedicineEntry | null;
	status: BatchStatus;
	daysRemaining: number;
}

export const load: PageServerLoad = async () => {
	const batches = getMockBatches();
	const schedule = MEDICINE_SCHEDULE;

	function ageDays(dateSet: string): number {
		const clean = dateSet.slice(0, 10);
		const [y, m, d] = clean.split('-').map(Number);
		const set = new Date(y, m - 1, d);
		set.setHours(0, 0, 0, 0);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return Math.round((today.getTime() - set.getTime()) / 86400000);
	}

	const overview: BatchOverview[] = batches.map((b) => {
		const completed = new Set(getCompleted(b.id));
		const currentDay = ageDays(b.dateSet) + 1;

		const pending = schedule.filter((e) => !completed.has(e.id));
		const overdue = pending.filter((e) => e.day < currentDay);
		const today = pending.filter((e) => e.day === currentDay);
		const upcoming = pending.filter((e) => e.day > currentDay && e.day <= currentDay + 7);
		const nextDue =
			pending.filter((e) => e.day >= currentDay).sort((a, b) => a.day - b.day)[0] ?? null;

		const completedCount = schedule.length - pending.length;
		const completionPct = Math.round((completedCount / schedule.length) * 100);

		let status: BatchStatus = 'on-track';
		if (currentDay > 34) status = 'complete';
		else if (overdue.length >= 3) status = 'critical';
		else if (overdue.length > 0) status = 'at-risk';

		return {
			batch: b,
			currentDay,
			completedCount,
			totalEntries: schedule.length,
			completionPct,
			overdue,
			today,
			upcoming,
			nextDue,
			status,
			daysRemaining: Math.max(0, 34 - currentDay + 1)
		};
	});

	const active = overview.filter((o) => o.status !== 'complete');
	const complete = overview.filter((o) => o.status === 'complete');

	const totalChicks = active.reduce((s, o) => s + o.batch.volume, 0);
	const totalCompleted = active.reduce((s, o) => s + o.completedCount, 0);
	const totalPossible = active.length * schedule.length;
	const compliance = totalPossible ? Math.round((totalCompleted / totalPossible) * 100) : 0;
	const totalOverdue = active.reduce((s, o) => s + o.overdue.length, 0);

	const overdueAll = active
		.flatMap((o) =>
			o.overdue.map((e) => ({
				...e,
				batchId: o.batch.id,
				batchNumber: o.batch.batchNumber,
				farmName: o.batch.farm.name,
				currentDay: o.currentDay,
				daysOverdue: o.currentDay - e.day
			}))
		)
		.sort((a, b) => b.daysOverdue - a.daysOverdue);

	const upcomingAll = active
		.flatMap((o) =>
			o.upcoming.map((e) => ({
				...e,
				batchId: o.batch.id,
				batchNumber: o.batch.batchNumber,
				farmName: o.batch.farm.name,
				currentDay: o.currentDay,
				daysAway: e.day - o.currentDay
			}))
		)
		.sort((a, b) => a.daysAway - b.daysAway);

	return {
		overview,
		active,
		complete,
		overdueAll,
		upcomingAll,
		totals: {
			batches: batches.length,
			activeBatches: active.length,
			completedBatches: complete.length,
			totalChicks,
			compliance,
			totalCompleted,
			totalPossible,
			totalOverdue
		}
	};
};
