import { listTrackedDispatches, updateDispatchDelivery } from '#lib/services/dispatch.service.ts';
import { fail } from '@sveltejs/kit';

export const load = async () => {
	const trips = await listTrackedDispatches();
	return { trips };
};

export const actions = {
	updateDelivery: async ({ request }) => {
		const fd = await request.formData();
		const str = (key: string) => {
			const v = fd.get(key);
			return typeof v === 'string' && v.trim() ? v.trim() : null;
		};

		const dispatchId = str('dispatchId');
		if (!dispatchId) return fail(400, { message: 'Missing trip' });

		const amountRaw = str('amount');
		const amount = amountRaw === null ? null : Number(amountRaw.replaceAll(',', ''));

		try {
			await updateDispatchDelivery({
				dispatchId,
				arrivalDate: str('arrivalDate'),
				supplierDrNumber: str('supplierDrNumber'),
				drReceivedDate: str('drReceivedDate'),
				forwardedAccountingDate: str('forwardedAccountingDate'),
				saleInvoiceNumber: str('saleInvoiceNumber'),
				amount,
				dueDate: str('dueDate')
			});
			return { success: true };
		} catch (e) {
			return fail(400, { message: e instanceof Error ? e.message : 'Could not save' });
		}
	}
};
