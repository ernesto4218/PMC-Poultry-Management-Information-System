// Place at e.g. #lib/server/standards-summary.ts (server-only: it imports the services).

import { StandardCostService } from '#lib/services/standardscost.services.ts';
import { StandardManpowerService } from '#lib/services/standardsmanpower.services.ts';
import { StandardMedVacService } from '#lib/services/standardsmedvac.services.ts';
import { StandardSuppliesService } from '#lib/services/standardssupplies.services.ts';
import type { StandardSummary } from '../../routes/(Authenticated)/admin/standard-management/+page.svelte';

type Base = { isArchived: boolean; updatedAt: string };

const php = new Intl.NumberFormat('en-PH', {
	style: 'currency',
	currency: 'PHP',
	maximumFractionDigits: 0
});

function base<T extends Base>(items: T[]) {
	const active = items.filter((i) => !i.isArchived);
	const lastUpdated = items.reduce<string | null>(
		(latest, i) => (!latest || i.updatedAt > latest ? i.updatedAt : latest),
		null
	);
	return { active, archivedCount: items.length - active.length, lastUpdated };
}

export async function getStandardsSummary(): Promise<StandardSummary[]> {
	const [cost, manpower, supplies, medvac] = await Promise.all([
		StandardCostService.getAll({ includeArchived: true }),
		StandardManpowerService.getAll({ includeArchived: true }),
		StandardSuppliesService.getAll({ includeArchived: true }),
		StandardMedVacService.getAll({ includeArchived: true })
	]);

	const c = base(cost);
	const m = base(manpower);
	const s = base(supplies);
	const v = base(medvac);

	return [
		{
			key: 'costitems',
			active: c.active.length,
			archived: c.archivedCount,
			highlightLabel: 'Total amount (PHP)',
			highlightValue: new Intl.NumberFormat('en-PH', {
				style: 'currency',
				currency: 'PHP',
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(m.active.reduce((n, i) => n + i.amountPhp, 0)),
			lastUpdated: c.lastUpdated
		},
		{
			key: 'manpower',
			active: m.active.length,
			archived: m.archivedCount,
			highlightLabel: 'Total amount (PHP)',
			highlightValue: new Intl.NumberFormat('en-PH', {
				style: 'currency',
				currency: 'PHP',
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(m.active.reduce((n, i) => n + i.amountPhp, 0)),
			lastUpdated: m.lastUpdated
		},
		{
			key: 'supplies',
			active: s.active.length,
			archived: s.archivedCount,
			highlightLabel: 'Farm codes covered',
			highlightValue: String(new Set(s.active.map((i) => i.farmCode)).size),
			lastUpdated: s.lastUpdated
		},
		{
			key: 'medsvac',
			active: v.active.length,
			archived: v.archivedCount,
			highlightLabel: 'Farm types covered',
			highlightValue: String(new Set(v.active.map((i) => i.farmType)).size),
			lastUpdated: v.lastUpdated
		}
	];
}
