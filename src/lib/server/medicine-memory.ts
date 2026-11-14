// src/lib/server/medicine-memory.ts
// Simple in-memory store. Resets on server restart. Swap for DB later.
const g = globalThis as { __medicineTracking?: Map<string, Set<string>> };
if (!g.__medicineTracking) g.__medicineTracking = new Map();
const store = g.__medicineTracking;

export function getCompleted(batchId: string): string[] {
	return [...(store.get(batchId) ?? new Set())];
}

export function toggleEntry(batchId: string, entryId: string): string[] {
	if (!store.has(batchId)) store.set(batchId, new Set());
	const set = store.get(batchId)!;
	if (set.has(entryId)) set.delete(entryId);
	else set.add(entryId);
	return [...set];
}

export function resetBatch(batchId: string): void {
	store.delete(batchId);
}
