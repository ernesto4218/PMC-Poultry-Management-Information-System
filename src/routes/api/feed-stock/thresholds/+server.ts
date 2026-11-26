import { FeedStockService } from '#lib/services/feed-stock.services.ts';
import { json } from '@sveltejs/kit';

export const PUT = async ({ request }) => {
	try {
		const { feedProductId, minStock } = await request.json();
		if (!feedProductId) throw new Error('Missing feedProductId.');
		await FeedStockService.updateMinStock(feedProductId, Number(minStock));
		return json({ ok: true });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to update threshold.' }, { status: 400 });
	}
};
