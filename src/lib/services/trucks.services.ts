import { db } from '#lib/server/db/index.ts';
import { truck, driver } from '#lib/server/db/schema.ts';
import { eq, sql, inArray } from 'drizzle-orm';
import type { Truck } from '#lib/types/trucks.ts';

export class TruckService {
	static async getAllTrucks(): Promise<Truck[]> {
		return db.select().from(truck);
	}

	static async getTruckById(id: string): Promise<Truck | null> {
		const [r] = await db.select().from(truck).where(eq(truck.id, id)).limit(1);
		return r ?? null;
	}

	static async checkDuplicates(plateNumber: string, excludeId?: string) {
		const existing = await db
			.select()
			.from(truck)
			.where(sql`lower(plate_number) = lower(${plateNumber.trim()})`);
		const filtered = excludeId ? existing.filter((t) => t.id !== excludeId) : existing;
		return {
			duplicatePlate: filtered.some(
				(t) => t.plateNumber.toLowerCase() === plateNumber.trim().toLowerCase()
			)
		};
	}

	static async createTruck(data: Truck): Promise<Truck> {
		const { duplicatePlate } = await this.checkDuplicates(data.plateNumber);
		if (duplicatePlate) throw new Error('This plate number is already registered.');
		if (data.driverId) {
			const [d] = await db.select().from(driver).where(eq(driver.id, data.driverId)).limit(1);
			if (!d) throw new Error('Selected driver does not exist.');
		}

		await db.insert(truck).values({
			id: data.id,
			plateNumber: data.plateNumber.trim(),
			capacity: data.capacity,
			status: data.status,
			driverId: data.driverId ?? null,
			notes: data.notes.trim()
		});
		return data;
	}

	static async updateTruck(data: Truck): Promise<Truck> {
		const { duplicatePlate } = await this.checkDuplicates(data.plateNumber, data.id);
		if (duplicatePlate) throw new Error('Another truck already uses this plate number.');
		if (data.driverId) {
			const [d] = await db.select().from(driver).where(eq(driver.id, data.driverId)).limit(1);
			if (!d) throw new Error('Selected driver does not exist.');
		}

		await db
			.update(truck)
			.set({
				plateNumber: data.plateNumber.trim(),
				capacity: data.capacity,
				status: data.status,
				driverId: data.driverId ?? null,
				notes: data.notes.trim(),
				updatedAt: new Date()
			})
			.where(eq(truck.id, data.id));

		return data;
	}

	static async deleteTruck(id: string): Promise<void> {
		const [existing] = await db.select().from(truck).where(eq(truck.id, id)).limit(1);
		if (!existing) throw new Error('Truck not found.');
		await db.delete(truck).where(eq(truck.id, id));
	}

	static async countByDriverIds(driverIds: string[]): Promise<Record<string, number>> {
		if (driverIds.length === 0) return {};
		const rows = await db
			.select({ driverId: truck.driverId })
			.from(truck)
			.where(inArray(truck.driverId, driverIds));
		const out: Record<string, number> = {};
		for (const r of rows) if (r.driverId) out[r.driverId] = (out[r.driverId] ?? 0) + 1;
		return out;
	}
}
