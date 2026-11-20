import { db } from '#lib/server/db/index.ts';
import { medication_memory, standard_medicine } from '#lib/server/db/schema.ts';
import { and, asc, eq, gt, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
	AGES,
	DEFAULT_MEMORY_NAMES,
	type FarmGroup,
	type MemoryColumn
} from '#lib/types/medication-memory.ts';
import { farmTypes } from '#lib/types/farms.ts';

export class MedicationMemoryService {
	/** { CCS: [...], CON: [...] } in saved order, archived medicines skipped */
	static async getAll(): Promise<Record<FarmGroup, MemoryColumn[]>> {
		const rows = await db
			.select({
				group: medication_memory.farmGroup,
				id: standard_medicine.id,
				name: standard_medicine.name,
				areaName: standard_medicine.areaName,
				unit: standard_medicine.unit,
				value: standard_medicine.value,
				price: standard_medicine.price,
				isArchived: standard_medicine.isArchived,
				ages: medication_memory.ages
			})
			.from(medication_memory)
			.innerJoin(standard_medicine, eq(medication_memory.standardMedicineId, standard_medicine.id))
			.orderBy(asc(medication_memory.farmGroup), asc(medication_memory.position));

		const out = { CCS: [], CON: [] } as Record<FarmGroup, MemoryColumn[]>;
		for (const r of rows) {
			if (r.isArchived === 1 || !(r.group in out)) continue;
			out[r.group as FarmGroup].push({
				id: r.id,
				name: r.name,
				areaName: r.areaName,
				unit: r.unit,
				value: r.value == null ? 0 : Number(r.value),
				price: r.price == null ? 0 : Number(r.price),
				ages: r.ages ?? []
			});
		}
		return out;
	}

	private static assertGroup(group: string): asserts group is FarmGroup {
		if (!farmTypes.includes(group as FarmGroup)) throw new Error('Invalid farm group.');
	}

	static async add(group: string, medicineId: string) {
		this.assertGroup(group);
		const [med] = await db
			.select()
			.from(standard_medicine)
			.where(eq(standard_medicine.id, medicineId))
			.limit(1);
		if (!med) throw new Error('Medicine not found.');

		const [{ max }] = await db
			.select({ max: sql<number>`coalesce(max(${medication_memory.position}), 0)` })
			.from(medication_memory)
			.where(eq(medication_memory.farmGroup, group));

		try {
			await db.insert(medication_memory).values({
				id: randomUUID(),
				farmGroup: group,
				standardMedicineId: medicineId,
				position: Number(max) + 1
			});
		} catch {
			throw new Error(`"${med.name}" is already in the ${group} memory.`);
		}
	}

	static async remove(group: string, medicineId: string) {
		this.assertGroup(group);
		const [row] = await db
			.select()
			.from(medication_memory)
			.where(
				and(
					eq(medication_memory.farmGroup, group),
					eq(medication_memory.standardMedicineId, medicineId)
				)
			)
			.limit(1);
		if (!row) return;

		await db.delete(medication_memory).where(eq(medication_memory.id, row.id));
		// close the gap
		await db
			.update(medication_memory)
			.set({ position: sql`${medication_memory.position} - 1` })
			.where(
				and(eq(medication_memory.farmGroup, group), gt(medication_memory.position, row.position))
			);
	}

	static async move(group: string, medicineId: string, direction: 'up' | 'down') {
		this.assertGroup(group);
		const rows = await db
			.select()
			.from(medication_memory)
			.where(eq(medication_memory.farmGroup, group))
			.orderBy(asc(medication_memory.position));

		const i = rows.findIndex((r) => r.standardMedicineId === medicineId);
		const j = direction === 'up' ? i - 1 : i + 1;
		if (i < 0 || j < 0 || j >= rows.length) return;

		await db.transaction(async (tx) => {
			await tx
				.update(medication_memory)
				.set({ position: rows[j].position })
				.where(eq(medication_memory.id, rows[i].id));
			await tx
				.update(medication_memory)
				.set({ position: rows[i].position })
				.where(eq(medication_memory.id, rows[j].id));
		});
	}

	/** Fill an EMPTY group from the default names (matched inside that group's area) */
	static async seedDefaults(group: string) {
		this.assertGroup(group);
		const [existing] = await db
			.select()
			.from(medication_memory)
			.where(eq(medication_memory.farmGroup, group))
			.limit(1);
		if (existing) return;

		const meds = await db
			.select()
			.from(standard_medicine)
			.where(and(eq(standard_medicine.areaName, group), eq(standard_medicine.isArchived, 0)));

		let position = 1;
		for (const name of DEFAULT_MEMORY_NAMES) {
			const m = meds.find((x) => x.name.trim().toLowerCase() === name.toLowerCase());
			if (!m) continue;
			await db.insert(medication_memory).values({
				id: randomUUID(),
				farmGroup: group,
				standardMedicineId: m.id,
				position: position++
			});
		}
	}

	static async setAges(group: string, medicineId: string, ages: string[]) {
		this.assertGroup(group);
		const valid = AGES.filter((a) => Array.isArray(ages) && ages.includes(a)); // valid ages, in order
		await db
			.update(medication_memory)
			.set({ ages: valid })
			.where(
				and(
					eq(medication_memory.farmGroup, group),
					eq(medication_memory.standardMedicineId, medicineId)
				)
			);
	}
}
