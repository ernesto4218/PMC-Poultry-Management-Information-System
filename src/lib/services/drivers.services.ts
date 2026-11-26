import { db } from '#lib/server/db/index.ts';
import { driver } from '#lib/server/db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import type { Driver } from '#lib/types/drivers.ts';

export class DriverService {
	static async getAllDrivers(): Promise<Driver[]> {
		return db.select().from(driver);
	}

	static async getDriverById(id: string): Promise<Driver | null> {
		const [r] = await db.select().from(driver).where(eq(driver.id, id)).limit(1);
		return r ?? null;
	}

	static async checkDuplicates(name: string, excludeId?: string) {
		const existing = await db
			.select()
			.from(driver)
			.where(sql`lower(name) = lower(${name.trim()})`);

		const filtered = excludeId ? existing.filter((d) => d.id !== excludeId) : existing;
		return {
			duplicateName: filtered.length > 0
		};
	}

	static async createDriver(data: Driver): Promise<Driver> {
		const { duplicateName } = await this.checkDuplicates(data.name);
		if (duplicateName) throw new Error('A driver with this name already exists.');

		await db.insert(driver).values({
			id: data.id,
			name: data.name.trim(),
			phone: data.phone.trim(),
			address: data.address.trim(),
			status: data.status,
			notes: data.notes.trim()
		});

		return data;
	}

	static async updateDriver(data: Driver): Promise<Driver> {
		const { duplicateName } = await this.checkDuplicates(data.name, data.id);
		if (duplicateName) throw new Error('Another driver with this name already exists.');

		await db
			.update(driver)
			.set({
				name: data.name.trim(),
				phone: data.phone.trim(),
				address: data.address.trim(),
				status: data.status,
				notes: data.notes.trim(),
				updatedAt: new Date()
			})
			.where(eq(driver.id, data.id));

		return data;
	}

	static async deleteDriver(id: string): Promise<void> {
		const [existing] = await db.select().from(driver).where(eq(driver.id, id)).limit(1);
		if (!existing) throw new Error('Driver not found.');
		await db.delete(driver).where(eq(driver.id, id));
	}
}
