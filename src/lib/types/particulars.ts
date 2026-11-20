// ---- Catalog --------------------------------------------------------------
export type Particular = {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	category: string;
};

export type ParticularInput = { id?: string; name: string; category: string };

// ---- Memories -------------------------------------------------------------
export interface ParticularMemoryFarm {
	id: string;
	name: string;
	code: string;
}

export type ParticularMemory = {
	id: string;
	name: string;
	notes: string;
	itemCount: number;
	createdAt: string;
	updatedAt: string;
	usedByFarms: ParticularMemoryFarm[];
};

export type ParticularMemoryInput = { id?: string; name: string; notes: string };

// ---- Memory items ---------------------------------------------------------
export type MemoryItemMode = 'static' | 'formula';

export type ParticularMemoryItem = {
	id: string;
	memoryId: string;
	particularId: string;
	particularName: string;
	label: string;
	mode: MemoryItemMode;
	qty: number;
	formulaKey: string | null;
	formulaParams: Record<string, unknown> | null;
	price: number;
	adjustmentDays: number | null;
	position: number;
	createdAt: string;
	updatedAt: string;
	particularCategory: ParticularCategory;
};

export type ParticularMemoryItemInput = {
	medicineId?: string | null;
	id?: string;
	memoryId?: string;
	particularId: string;
	label?: string;
	mode: MemoryItemMode;
	qty?: number;
	formulaKey?: string | null;
	formulaParams?: Record<string, unknown> | null;
	price?: number;
	adjustmentDays?: number | null;
	position?: number;
};

// ---- Resolver / context ---------------------------------------------------
export type QtyResolverContext = {
	farmId?: string;
	batchId?: string;
	date?: string;
	period?: string;
	[key: string]: unknown;
};

export type QtyResolver = (
	params: Record<string, unknown> | null,
	ctx: QtyResolverContext
) => Promise<number> | number;

export type ResolvedMemoryItem = ParticularMemoryItem & {
	resolvedQty: number;
	resolveError: string | null;
};

export type ResolvedMemory = {
	memory: ParticularMemory;
	items: ResolvedMemoryItem[];
	context: QtyResolverContext;
	total: number;
};

export const PARTICULAR_CATEGORIES = ['DOC', 'FEEDS', 'MED&VAC', 'OTHERS', 'ADVANCES'] as const;
export type ParticularCategory = (typeof PARTICULAR_CATEGORIES)[number];
