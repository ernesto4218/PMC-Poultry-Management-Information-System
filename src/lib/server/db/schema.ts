import {
	mysqlTable,
	varchar,
	int,
	double,
	timestamp,
	uniqueIndex,
	index,
	date,
	json,
	decimal,
	tinyint
} from 'drizzle-orm/mysql-core';

export const supplier_brands = mysqlTable(
	'supplier_brands',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		name: varchar('name', { length: 150 }).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [uniqueIndex('supplier_brands_name_unique').on(t.name)]
);

export const supplier_item_categories = mysqlTable(
	'supplier_item_categories',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		category_name: varchar('category_name', { length: 150 }).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [uniqueIndex('supplier_item_categories_name_unique').on(t.category_name)]
);

export const supplier_items = mysqlTable(
	'supplier_items',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		category_name: varchar('category_name', { length: 150 }).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [uniqueIndex('supplier_items_category_name_unique').on(t.category_name)]
);

export const feedSupplier = mysqlTable(
	'feed_supplier',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		name: varchar('name', { length: 150 }).notNull(),
		code: varchar('code', { length: 50 }).notNull(),
		contactPerson: varchar('contact_person', { length: 120 }).notNull().default(''),
		email: varchar('email', { length: 190 }).notNull().default(''),
		phone: varchar('phone', { length: 80 }).notNull().default(''),
		address: varchar('address', { length: 255 }).notNull().default(''),
		status: varchar('status', { length: 20 }).notNull().default('Active'),
		notes: varchar('notes', { length: 500 }).notNull().default(''),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
	},
	(t) => [
		uniqueIndex('feed_supplier_name_unique').on(t.name),
		uniqueIndex('feed_supplier_code_unique').on(t.code)
	]
);

export const feedProduct = mysqlTable(
	'feed_product',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		supplierId: varchar('supplier_id', { length: 36 }).notNull(),
		feedType: varchar('feed_type', { length: 40 }).notNull(),
		stage: varchar('stage', { length: 60 }).notNull(),
		name: varchar('name', { length: 150 }).notNull().default(''),
		sku: varchar('sku', { length: 60 }).notNull().default(''),
		active: int('active').notNull().default(1),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
	},
	(t) => [
		index('feed_product_supplier_idx').on(t.supplierId),
		index('feed_product_type_idx').on(t.feedType),
		index('feed_product_stage_idx').on(t.stage)
	]
);

export const farm = mysqlTable(
	'farm',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		name: varchar('name', { length: 150 }).notNull(),
		code: varchar('code', { length: 150 }).notNull(),
		type: varchar('type', { length: 150 }).notNull(),
		volume: int('volume').notNull().default(40000),
		standardMedicationId: varchar('standard_medication_id', { length: 36 }),
		address: varchar('address', { length: 255 }).notNull().default(''),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
	},
	(t) => [
		uniqueIndex('farm_name_unique').on(t.name),
		uniqueIndex('farm_code_unique').on(t.code),
		index('farm_standard_medication_idx').on(t.standardMedicationId)
	]
);

export const chickBatch = mysqlTable(
	'chick_batch',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		farmId: varchar('farm_id', { length: 36 })
			.notNull()
			.references(() => farm.id, { onDelete: 'restrict' }),
		batchNumber: varchar('batch_number', { length: 100 }).notNull(),
		dateSet: date('date_set').notNull(),
		volume: int('volume').notNull(),
		sequence: int('sequence').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
	},
	(t) => [
		uniqueIndex('chick_batch_number_unique').on(t.batchNumber),
		uniqueIndex('chick_batch_farm_date_seq_unique').on(t.farmId, t.dateSet, t.sequence),
		index('chick_batch_farm_idx').on(t.farmId)
	]
);

// ---------------------------------------------------------------------------
// Standards: Meds & Vac
// ---------------------------------------------------------------------------
export const standard_medvac = mysqlTable(
	'standard_medvac',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		name: varchar('name', { length: 150 }).notNull(),
		farmtype: varchar('farmtype', { length: 150 }).notNull(),
		category: varchar('category', { length: 150 }).notNull(),
		value: decimal('value', { precision: 10, scale: 2 }),
		isArchived: tinyint('is_archived').notNull().default(0),
		archivedAt: timestamp('archived_at'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
	},
	(t) => [
		// NOTE: uniqueness of *active* rows is enforced in the service layer so
		// an archived row and a freshly re-created active row can coexist.
		index('standard_medvac_name_farmtype_idx').on(t.name, t.farmtype),
		index('standard_medvac_archived_idx').on(t.isArchived)
	]
);

export const standard_medvac_history = mysqlTable(
	'standard_medvac_history',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		standardId: varchar('standard_id', { length: 36 }).notNull(),
		action: varchar('action', { length: 20 }).notNull(),
		changes: json('changes'),
		changedAt: timestamp('changed_at').defaultNow().notNull(),
		changedBy: varchar('changed_by', { length: 36 })
	},
	(t) => [
		index('standard_medvac_history_standard_idx').on(t.standardId),
		index('standard_medvac_history_changed_at_idx').on(t.changedAt)
	]
);

// ---------------------------------------------------------------------------
// Standards: Supplies
// ---------------------------------------------------------------------------
export const standard_supplies = mysqlTable(
	'standard_supplies',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		name: varchar('name', { length: 150 }).notNull(),
		farmcode: varchar('farmcode', { length: 150 }).notNull(), // was farmtype
		category: varchar('category', { length: 150 }).notNull(),
		perThousand: decimal('per_thousand', { precision: 10, scale: 2 }),
		standardPerFarm: decimal('standard_per_farm', { precision: 10, scale: 2 }),
		unit: varchar('unit', { length: 50 }).notNull(),
		isArchived: tinyint('is_archived').notNull().default(0),
		archivedAt: timestamp('archived_at'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
	},
	(t) => [
		index('standard_supplies_name_farmcode_idx').on(t.name, t.farmcode),
		index('standard_supplies_archived_idx').on(t.isArchived)
	]
);

export const standard_supplies_history = mysqlTable(
	'standard_supplies_history',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		standardId: varchar('standard_id', { length: 36 }).notNull(),
		action: varchar('action', { length: 20 }).notNull(),
		changes: json('changes'),
		changedAt: timestamp('changed_at').defaultNow().notNull(),
		changedBy: varchar('changed_by', { length: 36 })
	},
	(t) => [
		index('standard_supplies_history_standard_idx').on(t.standardId),
		index('standard_supplies_history_changed_at_idx').on(t.changedAt)
	]
);

// ---------------------------------------------------------------------------
// Standards: Manpower
// ---------------------------------------------------------------------------
export const standard_manpower = mysqlTable(
	'standard_manpower',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		name: varchar('name', { length: 150 }).notNull(),
		farmcode: varchar('farmcode', { length: 150 }).notNull(),
		category: varchar('category', { length: 150 }).notNull(),
		qty: int('qty').notNull().default(0),
		cost: decimal('cost', { precision: 10, scale: 2 }).notNull().default('0'),
		hours: decimal('hours', { precision: 10, scale: 2 }).notNull().default('0'),
		multiplier: decimal('multiplier', { precision: 10, scale: 2 }).notNull().default('1'),
		amount: decimal('amount', { precision: 14, scale: 2 }).notNull().default('0'),
		amountPhp: decimal('amount_php', { precision: 14, scale: 2 }).notNull().default('0'),
		isArchived: tinyint('is_archived').notNull().default(0),
		archivedAt: timestamp('archived_at'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
	},
	(t) => [
		index('standard_manpower_name_farmcode_idx').on(t.name, t.farmcode),
		index('standard_manpower_archived_idx').on(t.isArchived)
	]
);

export const standard_manpower_history = mysqlTable(
	'standard_manpower_history',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		standardId: varchar('standard_id', { length: 36 }).notNull(),
		action: varchar('action', { length: 20 }).notNull(),
		changes: json('changes'),
		changedAt: timestamp('changed_at').defaultNow().notNull(),
		changedBy: varchar('changed_by', { length: 36 })
	},
	(t) => [
		index('standard_manpower_history_standard_idx').on(t.standardId),
		index('standard_manpower_history_changed_at_idx').on(t.changedAt)
	]
);

// ---------------------------------------------------------------------------
// Standards: Cost
// ---------------------------------------------------------------------------
export const standard_cost = mysqlTable(
	'standard_cost',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		name: varchar('name', { length: 150 }).notNull(),
		farmcode: varchar('farmcode', { length: 150 }).notNull(),
		category: varchar('category', { length: 150 }).notNull(),
		qty: decimal('qty', { precision: 10, scale: 2 }).notNull().default('0'),
		amount: decimal('amount', { precision: 14, scale: 2 }).notNull().default('0'),
		amountPhp: decimal('amount_php', { precision: 14, scale: 2 }).notNull().default('0'),
		isArchived: tinyint('is_archived').notNull().default(0),
		archivedAt: timestamp('archived_at'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
	},
	(t) => [
		index('standard_cost_name_farmcode_idx').on(t.name, t.farmcode),
		index('standard_cost_archived_idx').on(t.isArchived)
	]
);

export const standard_cost_history = mysqlTable(
	'standard_cost_history',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		standardId: varchar('standard_id', { length: 36 }).notNull(),
		action: varchar('action', { length: 20 }).notNull(),
		changes: json('changes'),
		changedAt: timestamp('changed_at').defaultNow().notNull(),
		changedBy: varchar('changed_by', { length: 36 })
	},
	(t) => [
		index('standard_cost_history_standard_idx').on(t.standardId),
		index('standard_cost_history_changed_at_idx').on(t.changedAt)
	]
);

export const standard_area = mysqlTable(
	'standard_area',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		name: varchar('name', { length: 150 }).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
	},
	(t) => [uniqueIndex('standard_area_name_unique').on(t.name)]
);

// ---------------------------------------------------------------------------
// Standards: Medicine
// ---------------------------------------------------------------------------
export const standard_medicine = mysqlTable(
	'standard_medicine',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		name: varchar('name', { length: 150 }).notNull(),
		areaName: varchar('area_name', { length: 150 }).notNull(),
		// farmType removed
		value: decimal('value', { precision: 10, scale: 2 }).notNull().default('0'),
		unit: varchar('unit', { length: 20 }).notNull(),
		amDuration: varchar('am_duration', { length: 50 }).notNull().default('2-3hrs'),
		amPmDuration: varchar('am_pm_duration', { length: 50 }).notNull().default('3 hrs'),
		pmDuration: varchar('pm_duration', { length: 50 }).notNull().default('2-3 hrs'),
		isArchived: tinyint('is_archived').notNull().default(0),
		archivedAt: timestamp('archived_at'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
	},
	(t) => [
		index('standard_medicine_name_area_idx').on(t.name, t.areaName),
		index('standard_medicine_area_idx').on(t.areaName),
		index('standard_medicine_archived_idx').on(t.isArchived)
	]
);

export const standard_medicine_history = mysqlTable(
	'standard_medicine_history',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		standardId: varchar('standard_id', { length: 36 }).notNull(),
		action: varchar('action', { length: 20 }).notNull(),
		changes: json('changes'),
		changedAt: timestamp('changed_at').defaultNow().notNull(),
		changedBy: varchar('changed_by', { length: 36 })
	},
	(t) => [
		index('standard_medicine_history_standard_idx').on(t.standardId),
		index('standard_medicine_history_changed_at_idx').on(t.changedAt)
	]
);

// ---------------------------------------------------------------------------
// Standards: Age Medicine (per bird age, split by CSS / CON)
// ---------------------------------------------------------------------------
export const standard_age_medicine = mysqlTable(
	'standard_age_medicine',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		age: varchar('age', { length: 20 }).notNull(),
		medications: json('medications')
			.$type<
				Array<{
					id: string;
					name: string;
					areaName: string;
					value: number;
					unit: string;
					amDuration: string;
					amPmDuration: string;
					pmDuration: string;
				}>
			>()
			.notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
	},
	(t) => [uniqueIndex('standard_age_medicine_age_unique').on(t.age)]
);

// ---------------------------------------------------------------------------
// Standards: Medication (reusable standards, linkable from farms)
// ---------------------------------------------------------------------------
export const standard_medication = mysqlTable(
	'standard_medication',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		name: varchar('name', { length: 150 }).notNull(),
		notes: varchar('notes', { length: 500 }).notNull().default(''),
		isArchived: tinyint('is_archived').notNull().default(0),
		archivedAt: timestamp('archived_at'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
	},
	(t) => [
		index('standard_medication_name_idx').on(t.name),
		index('standard_medication_archived_idx').on(t.isArchived)
	]
);

export const standard_medication_age = mysqlTable(
	'standard_medication_age',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		standardId: varchar('standard_id', { length: 36 }).notNull(),
		age: varchar('age', { length: 20 }).notNull(),
		note: varchar('note', { length: 200 }).notNull().default(''),
		medications: json('medications')
			.$type<
				Array<{
					id: string;
					name: string;
					areaName: string;
					value: number;
					unit: string;
					amDuration: string;
					amPmDuration: string;
					pmDuration: string;
				}>
			>()
			.notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull()
	},
	(t) => [
		uniqueIndex('standard_medication_age_standard_age_unique').on(t.standardId, t.age),
		index('standard_medication_age_standard_idx').on(t.standardId)
	]
);

export const medication_memory = mysqlTable(
	'medication_memory',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		farmGroup: varchar('farm_group', { length: 20 }).notNull(), // 'CCS' | 'CON'
		standardMedicineId: varchar('standard_medicine_id', { length: 36 })
			.notNull()
			.references(() => standard_medicine.id, { onDelete: 'cascade' }),
		ages: json('ages').$type<string[]>(),
		position: int('position').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [uniqueIndex('uq_memory_group_med').on(t.farmGroup, t.standardMedicineId)]
);

export * from './auth.schema';
