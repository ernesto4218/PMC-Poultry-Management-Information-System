import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	listQtyFormulas,
	ParticularsMemoryService
} from '#lib/services/particulars-memories.services.ts';

function fail(err: unknown) {
	const message = err instanceof Error ? err.message : 'Could not load memory.';
	const status = /not found/i.test(message) ? 404 : 500;
	return json({ error: message }, { status });
}

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const memory = await ParticularsMemoryService.getMemoryById(params.id);
		if (!memory) return json({ error: 'Memory not found.' }, { status: 404 });

		const resolve = url.searchParams.get('resolve') === '1';
		const ctx = {
			farmId: url.searchParams.get('farmId') ?? undefined,
			batchId: url.searchParams.get('batchId') ?? undefined,
			date: url.searchParams.get('date') ?? undefined,
			period: url.searchParams.get('period') ?? undefined
		};

		if (resolve) {
			const resolved = await ParticularsMemoryService.resolveMemory(params.id, ctx);
			return json({
				memory: resolved?.memory,
				items: resolved?.items,
				total: resolved?.total,
				formulaKeys: listQtyFormulas()
			});
		}

		const items = await ParticularsMemoryService.listItems(params.id);
		console.log(items);

		return json({ memory, items, formulaKeys: listQtyFormulas() });
	} catch (err) {
		return fail(err);
	}
};
