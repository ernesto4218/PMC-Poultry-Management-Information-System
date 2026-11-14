import { json } from '@sveltejs/kit';
import { MedicationMemoryService as Memory } from '#lib/services/medication-memory.services.ts';

export const POST = async ({ request }) => {
	const { action, group, medicineId } = await request.json();
	try {
		if (action === 'add') await Memory.add(group, medicineId);
		else if (action === 'remove') await Memory.remove(group, medicineId);
		else if (action === 'up' || action === 'down') await Memory.move(group, medicineId, action);
		else if (action === 'seed') await Memory.seedDefaults(group);
		else return json({ error: 'Unknown action.' }, { status: 400 });
		return json({ ok: true });
	} catch (e) {
		return json({ error: e instanceof Error ? e.message : 'Failed.' }, { status: 400 });
	}
};
