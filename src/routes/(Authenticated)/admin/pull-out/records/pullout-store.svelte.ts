import { toast } from 'svelte-sonner';
import type { SubmitFunction } from '$app/forms';
import type { DateWindow, PullOutRow, SortKey, SortValue, StoreData } from './types.ts';
import { dayKey, matchesWindow, summarize } from './utils.ts';

export const DEFAULT_CAPACITY = 560;

export interface SupplierProduct {
	id: string;
	name: string;
	sku: string;
	feedType: string;
	stage: string;
	active: number;
	onHand: number;
	minStock: number;
	status: string;
}

export interface Supplier {
	id: string;
	name: string;
	code: string;
	status: string;
	totalOnHand: number;
	products: SupplierProduct[];
}

export interface WarehouseStockOption {
	supplierId: string;
	supplierName: string;
	supplierCode: string;
	productId: string;
	feedType: string;
	stage: string;
	onHand: number;
	status: string;
}

/**
 * All page state + derived data in one place, so the components stay dumb.
 * Create once in +page.svelte: `new PulloutStore(() => data, () => suppliers)`.
 */
export class PulloutStore {
	// Needs an initial value so TypeScript allows the $derived fields below to reference it;
	// the constructor swaps in the real getter before anything is read.
	#data: () => StoreData = () => ({ pullouts: [], trucks: [], drivers: [] });
	#suppliers: () => Supplier[] = () => [];

	constructor(data: () => StoreData, suppliers: () => Supplier[] = () => []) {
		this.#data = data;
		this.#suppliers = suppliers;
	}

	// ── source data ────────────────────────────────────────────────────────
	todayKey = dayKey(new Date());
	rows = $derived(this.#data().pullouts ?? []);
	trucks = $derived(this.#data().trucks ?? []);
	drivers = $derived(this.#data().drivers ?? []);
	suppliers = $derived(this.#suppliers() ?? []);
	rowsById = $derived(new Map(this.rows.map((r) => [r.id, r])));

	stockOptions = $derived.by<WarehouseStockOption[]>(() =>
		this.suppliers
			.filter((s) => s.status === 'Active')
			.flatMap((s) =>
				(s.products ?? [])
					.filter((p) => p.active === 1)
					.map((p) => ({
						supplierId: s.id,
						supplierName: s.name,
						supplierCode: s.code,
						productId: p.id,
						feedType: p.feedType,
						stage: p.stage,
						onHand: p.onHand,
						status: p.status
					}))
			)
	);

	// ── filters / sort / paging ────────────────────────────────────────────
	search = $state('');
	farmFilter = $state('all');
	windowFilter = $state<DateWindow>('all');
	dateFrom = $state('');
	dateTo = $state('');
	sortValue = $state<SortValue>('date-asc');
	pageSizeRaw = $state('25');
	page = $state(1);

	pageSize = $derived(Number(this.pageSizeRaw));
	sortKey = $derived(this.sortValue.split('-')[0] as SortKey);
	sortDir = $derived(this.sortValue.endsWith('asc') ? 'asc' : 'desc');

	/** Changes whenever the result set changes — used to reset to page 1. */
	filterKey = $derived(
		[
			this.search,
			this.farmFilter,
			this.windowFilter,
			this.dateFrom,
			this.dateTo,
			this.sortValue,
			this.pageSizeRaw
		].join('|')
	);

	hasFilters = $derived(
		this.search.trim() !== '' ||
			this.farmFilter !== 'all' ||
			this.windowFilter !== 'all' ||
			this.dateFrom !== '' ||
			this.dateTo !== ''
	);

	summary = $derived(summarize(this.rows, this.todayKey));
	selectableCount = $derived(this.rows.filter((r) => r.remainingQty > 0).length);

	farmOptions = $derived.by(() => {
		const m = new Map<string, { id: string; name: string; code: string }>();
		for (const r of this.rows) {
			if (!m.has(r.farmId)) m.set(r.farmId, { id: r.farmId, name: r.farmName, code: r.farmCode });
		}
		return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
	});

	filtered = $derived.by(() => {
		const q = this.search.trim().toLowerCase();
		const out = this.rows.filter((r) => {
			if (
				q &&
				![r.documentId, r.farmName, r.farmCode, r.batchNumber, r.feedName].some((v) =>
					v.toLowerCase().includes(q)
				)
			)
				return false;
			if (this.farmFilter !== 'all' && r.farmId !== this.farmFilter) return false;
			if (!matchesWindow(r.dateKey, this.windowFilter, this.todayKey)) return false;
			if (this.dateFrom && (!r.dateKey || r.dateKey < this.dateFrom)) return false;
			if (this.dateTo && (!r.dateKey || r.dateKey > this.dateTo)) return false;
			return true;
		});

		const dir = this.sortDir === 'asc' ? 1 : -1;
		const compare: Record<SortKey, (a: PullOutRow, b: PullOutRow) => number> = {
			date: (a, b) => (a.dateKey || '9999').localeCompare(b.dateKey || '9999'),
			farm: (a, b) => a.farmCode.localeCompare(b.farmCode),
			feed: (a, b) => a.feedName.localeCompare(b.feedName),
			amount: (a, b) => a.amountNum - b.amountNum,
			qty: (a, b) => a.qtyNum - b.qtyNum
		};
		return out.sort((a, b) => dir * compare[this.sortKey](a, b));
	});

	totalPages = $derived(Math.max(1, Math.ceil(this.filtered.length / this.pageSize)));
	currentPage = $derived(Math.min(this.page, this.totalPages));
	paginated = $derived(
		this.filtered.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize)
	);

	clearFilters = () => {
		this.search = '';
		this.farmFilter = 'all';
		this.windowFilter = 'all';
		this.dateFrom = '';
		this.dateTo = '';
	};

	toggleSort = (key: SortKey) => {
		if (this.sortKey === key) {
			this.sortValue = `${key}-${this.sortDir === 'asc' ? 'desc' : 'asc'}`;
		} else {
			this.sortValue = `${key}-${key === 'amount' || key === 'qty' ? 'desc' : 'asc'}`;
		}
	};

	goToPage = (p: number) => {
		this.page = Math.max(1, Math.min(p, this.totalPages));
	};

	// ── dispatch / selection / stock source ────────────────────────────────
	selectedIds = $state<Set<string>>(new Set());
	loadQtys = $state<Record<string, number>>({});
	stockSelections = $state<Record<string, string>>({});
	drawerOpen = $state(false);
	submitting = $state(false);
	form = $state({
		truckId: '',
		driverId: '',
		dispatchDate: dayKey(new Date()),
		notes: ''
	});

	selectedStockFor = (rowId: string): WarehouseStockOption | undefined => {
		const chosenId = this.stockSelections[rowId];
		if (!chosenId) return undefined;
		return this.stockOptions.find((o) => o.productId === chosenId);
	};

	setStockSelection = (rowId: string, productId: string) => {
		this.stockSelections = { ...this.stockSelections, [rowId]: productId };
	};

	selectedRows = $derived(
		this.rows.filter((r) => this.selectedIds.has(r.id) && r.remainingQty > 0)
	);
	selectedCount = $derived(this.selectedRows.length);
	selectedTruck = $derived(this.trucks.find((t) => t.id === this.form.truckId));
	capacity = $derived(this.selectedTruck?.capacity ?? DEFAULT_CAPACITY);

	qtyFor = (r: PullOutRow) => Math.max(0, this.loadQtys[r.id] ?? r.remainingQty);

	totalBags = $derived(this.selectedRows.reduce((s, r) => s + this.qtyFor(r), 0));
	overCapacity = $derived(this.totalBags > this.capacity);
	tone = $derived<'over' | 'warn' | 'ok'>(
		this.overCapacity ? 'over' : this.totalBags > this.capacity * 0.9 ? 'warn' : 'ok'
	);

	unselectedStockRows = $derived(
		this.selectedRows.filter((r) => this.qtyFor(r) > 0 && !this.selectedStockFor(r.id))
	);
	allStocksSelected = $derived(
		this.selectedCount > 0 && this.totalBags > 0 && this.unselectedStockRows.length === 0
	);

	stockWarnings = $derived(
		this.selectedRows.filter((r) => {
			const stock = this.selectedStockFor(r.id);
			if (stock) return this.qtyFor(r) > stock.onHand;
			return r.warehouseStock != null && this.qtyFor(r) > r.warehouseStock;
		})
	);

	payload = $derived({
		...this.form,
		items: this.selectedRows
			.map((r) => {
				const stock = this.selectedStockFor(r.id);
				return {
					documentId: r.documentId,
					rowIndex: r.rowIndex,
					farmId: r.farmId,
					farmCode: r.farmCode,
					farmName: r.farmName,
					batchNumber: r.batchNumber,
					feedName: r.feedName,
					scheduledQty: r.qtyNum,
					loadedQty: this.qtyFor(r),
					supplierId: stock?.supplierId ?? null,
					supplierName: stock?.supplierName ?? null,
					supplierProductId: stock?.productId ?? null
				};
			})
			.filter((i) => i.loadedQty > 0)
	});

	toggleRow = (r: PullOutRow) => {
		if (r.remainingQty <= 0) return;
		if (this.selectedIds.has(r.id)) {
			this.removeItem(r.id);
		} else {
			this.selectedIds = new Set(this.selectedIds).add(r.id);
			this.loadQtys = { ...this.loadQtys, [r.id]: r.remainingQty };
		}
	};

	setLoadQty = (id: string, value: number) => {
		const max = this.rowsById.get(id)?.remainingQty ?? Infinity;
		this.loadQtys = { ...this.loadQtys, [id]: Math.min(max, Math.max(0, value || 0)) };
	};

	removeItem = (id: string) => {
		const ids = new Set(this.selectedIds);
		ids.delete(id);
		this.selectedIds = ids;
		const { [id]: _, ...restQtys } = this.loadQtys;
		this.loadQtys = restQtys;
		const { [id]: __, ...restStocks } = this.stockSelections;
		this.stockSelections = restStocks;
	};

	clearSelection = () => {
		this.selectedIds = new Set();
		this.loadQtys = {};
		this.stockSelections = {};
	};

	/** Earliest-due first, grouped by farm, capped by warehouse stock, up to truck capacity. */
	autoSuggest = () => {
		const cap = DEFAULT_CAPACITY;
		const picked = new Set<string>();
		const qtys: Record<string, number> = {};
		let running = 0;

		const candidates = this.rows
			.filter((r) => r.remainingQty > 0)
			.sort(
				(a, b) =>
					(a.dateKey || '9999').localeCompare(b.dateKey || '9999') ||
					a.farmCode.localeCompare(b.farmCode) ||
					a.feedName.localeCompare(b.feedName)
			);

		for (const r of candidates) {
			if (running >= cap) break;
			const available =
				r.warehouseStock != null ? Math.min(r.remainingQty, r.warehouseStock) : r.remainingQty;
			const take = Math.min(available, cap - running);
			if (take <= 0) continue;
			picked.add(r.id);
			qtys[r.id] = take;
			running += take;
		}
		this.selectedIds = picked;
		this.loadQtys = qtys;
	};

	openDrawer = () => {
		if (this.selectedCount === 0) return;
		const first = this.trucks[0];
		if (!this.form.truckId && first) {
			this.form.truckId = first.id;
			this.form.driverId = first.driverId ?? this.drivers[0]?.id ?? '';
		}
		this.drawerOpen = true;
	};

	closeDrawer = () => {
		this.drawerOpen = false;
	};

	enhanceDispatch: SubmitFunction = () => {
		this.submitting = true;
		return async ({ result, update }) => {
			this.submitting = false;
			if (result.type === 'success' && result.data?.success) {
				toast.success(`Trip ${result.data.tripCode} dispatched · ${result.data.totalBags} bags`);
				this.drawerOpen = false;
				this.clearSelection();
				this.form.notes = '';
				await update();
			} else {
				const msg = result.type === 'failure' ? (result.data?.error as string) : undefined;
				toast.error(msg ?? 'Dispatch failed');
			}
		};
	};
}
