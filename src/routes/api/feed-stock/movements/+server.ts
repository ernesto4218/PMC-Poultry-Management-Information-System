import { FeedStockService } from '#lib/services/feed-stock.services.ts';
import { json } from '@sveltejs/kit';

export const POST = async ({ request }) => {
	try {
		const body = await request.json();
		const movement = await FeedStockService.createMovement(body);
		return json({ movement });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to record movement.' }, { status: 400 });
	}
};
