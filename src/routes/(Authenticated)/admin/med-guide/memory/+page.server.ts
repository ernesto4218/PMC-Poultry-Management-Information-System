import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { MedicationMemoryService as Memory } from '#lib/services/medication-memory.services.ts';
import { StandardMedicineService } from '#lib/services/standardsmedicine.services.ts';

export const load: PageServerLoad = async () => {
	const [medicines, memory] = await Promise.all([
		StandardMedicineService.getAll(), // all areas; the page filters per group
		Memory.getAll()
	]);
	return { medicines, memory };
};

/** Run a service call and turn thrown errors into a form failure */
async function run(fn: () => Promise<unknown>) {
	try {
		await fn();
		return { success: true };
	} catch (e) {
		return fail(400, { error: e instanceof Error ? e.message : 'Something went wrong.' });
	}
}

export const actions: Actions = {
	add: async ({ request }) => {
		const fd = await request.formData();
		return run(() => Memory.add(String(fd.get('group')), String(fd.get('medicineId'))));
	},

	remove: async ({ request }) => {
		const fd = await request.formData();
		return run(() => Memory.remove(String(fd.get('group')), String(fd.get('medicineId'))));
	},

	move: async ({ request }) => {
		const fd = await request.formData();
		const direction = fd.get('direction') === 'up' ? 'up' : 'down';
		return run(() => Memory.move(String(fd.get('group')), String(fd.get('medicineId')), direction));
	},

	seed: async ({ request }) => {
		const fd = await request.formData();
		return run(() => Memory.seedDefaults(String(fd.get('group'))));
	},

	ages: async ({ request }) => {
		const fd = await request.formData();
		let ages: string[];
		try {
			ages = JSON.parse(String(fd.get('ages') ?? '[]'));
		} catch {
			return fail(400, { error: 'Invalid ages.' });
		}
		return run(() => Memory.setAges(String(fd.get('group')), String(fd.get('medicineId')), ages));
	}
};
