import { FeedStockService } from '#lib/services/feed-stock.services.ts';
import { json } from '@sveltejs/kit';

export const DELETE = async ({ params }) => {
	try {
		await FeedStockService.deleteMovement(params.id);
		return json({ ok: true });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to delete movement.' }, { status: 400 });
	}
};
