import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Actions, PageServerLoad } from './$types';
import { particulars } from '#lib/server/db/schema.ts';
import { db } from '#lib/server/db/index.ts';

type Row = typeof particulars.$inferSelect;

function rowToItem(row: Row) {
	return {
		id: row.id,
		name: row.name,
		qty: row.qty,
		price: Number(row.price),
		daysToAdd: row.daysToAdd ?? null,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString()
	};
}

export const load: PageServerLoad = async () => {
	const rows = await db.select().from(particulars).orderBy(desc(particulars.createdAt));
	return { particulars: rows.map(rowToItem) };
};

function parseForm(fd: FormData) {
	const id = String(fd.get('id') ?? '').trim();
	const name = String(fd.get('name') ?? '').trim();
	const qtyRaw = String(fd.get('qty') ?? '').trim();
	const priceRaw = String(fd.get('price') ?? '').trim();
	const daysRaw = String(fd.get('daysToAdd') ?? '').trim();

	const qty = Number(qtyRaw);
	const price = Number(priceRaw);
	const daysToAdd = daysRaw === '' ? null : Number(daysRaw);

	const errors: Record<string, string> = {};
	if (!name) errors.name = 'Name is required.';
	if (!Number.isInteger(qty) || qty < 0) errors.qty = 'QTY must be a non-negative whole number.';
	if (!Number.isFinite(price) || price < 0) errors.price = 'Price must be a non-negative number.';
	if (daysToAdd !== null && (!Number.isInteger(daysToAdd) || daysToAdd < 0))
		errors.daysToAdd = 'Days to add must be a non-negative whole number.';

	return { ok: Object.keys(errors).length === 0, id, name, qty, price, daysToAdd, errors };
}

export const actions: Actions = {
	save: async ({ request }) => {
		const fd = await request.formData();
		const parsed = parseForm(fd);

		if (!parsed.ok) {
			return fail(400, {
				errors: parsed.errors,
				values: {
					id: parsed.id,
					name: String(fd.get('name') ?? ''),
					qty: String(fd.get('qty') ?? ''),
					price: String(fd.get('price') ?? ''),
					daysToAdd: String(fd.get('daysToAdd') ?? '')
				}
			});
		}

		try {
			if (parsed.id) {
				const [existing] = await db
					.select()
					.from(particulars)
					.where(eq(particulars.id, parsed.id))
					.limit(1);
				if (!existing) return fail(404, { error: 'Particular not found.' });

				await db
					.update(particulars)
					.set({
						name: parsed.name,
						qty: parsed.qty,
						price: parsed.price.toFixed(2),
						daysToAdd: parsed.daysToAdd
					})
					.where(eq(particulars.id, parsed.id));

				return { ok: true, id: parsed.id };
			}

			const id = randomUUID();
			await db.insert(particulars).values({
				id,
				name: parsed.name,
				qty: parsed.qty,
				price: parsed.price.toFixed(2),
				daysToAdd: parsed.daysToAdd
			});
			return { ok: true, id };
		} catch (err) {
			return fail(500, {
				error: err instanceof Error ? err.message : 'Could not save particular.'
			});
		}
	},

	delete: async ({ request }) => {
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'Missing id.' });
		try {
			await db.delete(particulars).where(eq(particulars.id, id));
			return { ok: true, id };
		} catch (err) {
			return fail(500, {
				error: err instanceof Error ? err.message : 'Could not delete particular.'
			});
		}
	}
};
