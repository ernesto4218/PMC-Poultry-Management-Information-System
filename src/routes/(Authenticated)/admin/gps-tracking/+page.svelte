<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.js';

	import {
		createSimulator,
		DEMO_ROUTES,
		DEMO_SEEDS,
		type TruckPosition,
		type TruckSeed,
		type TruckStatus
	} from './fakegps.ts';
	import {
		SearchIcon,
		TruckIcon,
		XIcon,
		NavigationIcon,
		GaugeIcon,
		RouteIcon,
		UserIcon,
		PhoneIcon,
		AlertTriangleIcon,
		MaximizeIcon,
		ChevronUpIcon,
		ChevronDownIcon
	} from '@lucide/svelte';
	import Truckmap from './truckmap.svelte';

	let { data }: { data: PageData } = $props();

	// ---- State ---------------------------------------------------------
	let trucks = $state<TruckPosition[]>([]);
	let selectedId = $state<string | null>(null);
	let search = $state('');
	let statusFilter = $state<'all' | TruckStatus>('all');
	let listOpen = $state(true);
	let now = $state(Date.now());
	let usingDemo = $state(false);
	let map: { fitAll: () => void } | undefined = $state();

	const tripById = $derived(new Map(data.trips.map((t) => [t.id, t])));

	// ---- Fake GPS feed ---------------------------------------------------
	onMount(() => {
		const seeds: TruckSeed[] = data.trips.length
			? data.trips.map((t) => ({
					id: t.id,
					tripCode: t.tripCode,
					plateNumber: t.plateNumber,
					driverName: t.driverName,
					driverPhone: t.driverPhone,
					totalBags: t.totalBags,
					truckCapacity: t.truckCapacity
				}))
			: DEMO_SEEDS;
		usingDemo = data.trips.length === 0;

		const sim = createSimulator(seeds, DEMO_ROUTES);
		trucks = sim.snapshot();

		const id = setInterval(() => {
			sim.tick(1);
			trucks = sim.snapshot();
			now = Date.now();
		}, 1000);
		return () => clearInterval(id);
	});

	// ---- Derived -------------------------------------------------------
	const counts = $derived({
		all: trucks.length,
		moving: trucks.filter((t) => t.status === 'moving').length,
		idle: trucks.filter((t) => t.status === 'idle').length,
		offline: trucks.filter((t) => t.status === 'offline').length
	});

	const visible = $derived.by(() => {
		const q = search.trim().toLowerCase();
		return trucks.filter((t) => {
			if (statusFilter !== 'all' && t.status !== statusFilter) return false;
			if (!q) return true;
			return [t.plateNumber, t.driverName, t.tripCode, t.routeName].some((v) =>
				v.toLowerCase().includes(q)
			);
		});
	});

	const selected = $derived(trucks.find((t) => t.id === selectedId) ?? null);
	const selectedTrip = $derived(selectedId ? tripById.get(selectedId) : undefined);

	// ---- Helpers -------------------------------------------------------
	const dot: Record<TruckStatus, string> = {
		moving: 'bg-emerald-500',
		idle: 'bg-amber-500',
		offline: 'bg-gray-400'
	};
	const pill: Record<TruckStatus, string> = {
		moving: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
		idle: 'bg-amber-50 text-amber-700 ring-amber-200',
		offline: 'bg-gray-100 text-gray-600 ring-gray-200'
	};
	const pillCls =
		'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold capitalize ring-1 ring-inset';
	const floatCls = 'rounded-xl border border-gray-200 bg-white/95 shadow-lg backdrop-blur';

	function compass(h: number) {
		return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(h / 45) % 8];
	}
	function ago(ts: number) {
		const s = Math.max(0, Math.round((now - ts) / 1000));
		if (s < 5) return 'just now';
		if (s < 60) return `${s}s ago`;
		return `${Math.floor(s / 60)}m ${s % 60}s ago`;
	}

	const tabs: { value: 'all' | TruckStatus; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'moving', label: 'Moving' },
		{ value: 'idle', label: 'Idle' },
		{ value: 'offline', label: 'Offline' }
	];
</script>

<svelte:head>
	<title>Live Tracking | Puting Manok Corporation</title>
</svelte:head>

<div class="relative h-full w-full overflow-hidden rounded-tl-4xl bg-stone-100">
	<!-- FULL-PAGE MAP -->
	<div class="absolute inset-0">
		<Truckmap
			bind:this={map}
			{trucks}
			routes={DEMO_ROUTES}
			{selectedId}
			onselect={(id) => (selectedId = id)}
		/>
	</div>

	<!-- FLOATING LAYER -->
	<div class="pointer-events-none absolute inset-0 z-10 p-3 sm:p-4">
		<!-- Top-left: title, filters, truck list -->
		<div
			class="{floatCls} pointer-events-auto flex max-h-full w-full flex-col overflow-hidden sm:w-80"
			style="max-height: calc(100% - 0.5rem)"
		>
			<div class="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
				<div>
					<h1 class="text-lg font-bold tracking-tight text-gray-900">Live Tracking</h1>
					<p class="text-xs text-gray-500">
						{counts.all} trucks · {counts.moving} moving
					</p>
				</div>
				<button
					type="button"
					onclick={() => (listOpen = !listOpen)}
					class="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
					aria-expanded={listOpen}
					aria-label={listOpen ? 'Collapse truck list' : 'Expand truck list'}
				>
					{#if listOpen}
						<ChevronUpIcon class="h-4 w-4" />
					{:else}
						<ChevronDownIcon class="h-4 w-4" />
					{/if}
				</button>
			</div>

			{#if listOpen}
				<div class="space-y-2 px-4 pb-3">
					<div class="relative">
						<SearchIcon
							class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
						/>
						<Input
							bind:value={search}
							placeholder="Search plate, driver, or trip…"
							class="h-9 rounded-lg border-gray-300 pl-9 text-sm focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
							aria-label="Search trucks"
						/>
					</div>
					<div class="flex rounded-lg border border-gray-200 bg-stone-50 p-1">
						{#each tabs as tab (tab.value)}
							<button
								type="button"
								onclick={() => (statusFilter = tab.value)}
								aria-pressed={statusFilter === tab.value}
								class="flex h-7 flex-1 items-center justify-center gap-1 rounded-md text-xs font-semibold transition-colors {statusFilter ===
								tab.value
									? 'bg-white text-gray-900 shadow-sm'
									: 'text-gray-500 hover:text-gray-700'}"
							>
								{tab.label}
								<span class="font-mono text-[11px] text-gray-400">{counts[tab.value]}</span>
							</button>
						{/each}
					</div>
				</div>

				<ul
					class="max-h-[40vh] min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto border-t border-gray-100 sm:max-h-none"
				>
					{#each visible as t (t.id)}
						{@const over = t.totalBags > t.truckCapacity}
						<li>
							<button
								type="button"
								onclick={() => (selectedId = t.id === selectedId ? null : t.id)}
								aria-pressed={t.id === selectedId}
								class="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-amber-50/50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none focus-visible:ring-inset {t.id ===
								selectedId
									? 'bg-amber-50/70'
									: ''}"
							>
								<span class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full {dot[t.status]}"></span>
								<span class="min-w-0 flex-1">
									<span class="flex items-center gap-2">
										<span class="text-sm font-semibold text-gray-900">{t.plateNumber}</span>
										<Badge variant="secondary" class="font-mono">{t.tripCode}</Badge>
										{#if over}
											<AlertTriangleIcon class="h-3.5 w-3.5 text-red-700" />
										{/if}
									</span>
									<span class="mt-0.5 block truncate text-xs text-gray-500">
										{t.driverName} · {t.routeName}
									</span>
								</span>
								<span class="shrink-0 text-right">
									<span class="block font-mono text-sm font-bold text-gray-900">
										{t.speedKph}<span class="text-xs font-normal text-gray-500"> km/h</span>
									</span>
									<span class="block text-[11px] text-gray-400">{ago(t.updatedAt)}</span>
								</span>
							</button>
						</li>
					{:else}
						<li class="px-4 py-10 text-center">
							<TruckIcon class="mx-auto mb-2 h-6 w-6 text-gray-300" />
							<p class="text-sm font-semibold text-gray-900">No trucks found</p>
							<p class="mt-1 text-xs text-gray-500">Try a different search or status.</p>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<!-- Bottom-left: legend, feed note, fit button -->
		<div
			class="pointer-events-none absolute bottom-3 left-3 hidden items-center gap-2 sm:bottom-4 sm:left-4 sm:flex"
		>
			<div
				class="{floatCls} pointer-events-auto flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-700"
			>
				<span class="inline-flex items-center gap-1.5">
					<span class="h-2 w-2 rounded-full bg-emerald-500"></span>Moving {counts.moving}
				</span>
				<span class="inline-flex items-center gap-1.5">
					<span class="h-2 w-2 rounded-full bg-amber-500"></span>Idle {counts.idle}
				</span>
				<span class="inline-flex items-center gap-1.5">
					<span class="h-2 w-2 rounded-full bg-gray-400"></span>Offline {counts.offline}
				</span>
				<span class="text-gray-400">|</span>
				<span class="text-gray-500">
					{usingDemo ? 'Sample trucks' : 'Simulated feed'}
				</span>
			</div>
			<Button
				variant="outline"
				class="pointer-events-auto h-9 rounded-lg border-gray-300 bg-white/95 text-xs font-semibold text-gray-700 shadow-lg backdrop-blur"
				onclick={() => map?.fitAll()}
				disabled={trucks.length === 0}
			>
				<MaximizeIcon class="mr-1.5 h-4 w-4" />
				Fit all
			</Button>
		</div>

		<!-- Selected truck: top-right on desktop, bottom sheet on mobile -->
		{#if selected}
			{@const over = selected.totalBags > selected.truckCapacity}
			{@const pct = Math.round((selected.totalBags / Math.max(1, selected.truckCapacity)) * 100)}
			<div
				class="{floatCls} pointer-events-auto absolute inset-x-3 bottom-3 max-h-[55%] overflow-y-auto p-4 sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-auto sm:max-h-[calc(100%-2rem)] sm:w-80"
			>
				<div class="flex items-start justify-between gap-2">
					<div>
						<p class="text-lg font-bold text-gray-900">{selected.plateNumber}</p>
						<p class="font-mono text-xs text-gray-500">{selected.tripCode}</p>
					</div>
					<div class="flex items-center gap-2">
						<span class="{pillCls} {pill[selected.status]}">
							<span class="h-1.5 w-1.5 rounded-full {dot[selected.status]}"></span>
							{selected.status}
						</span>
						<button
							type="button"
							onclick={() => (selectedId = null)}
							class="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
							aria-label="Close truck details"
						>
							<XIcon class="h-4 w-4" />
						</button>
					</div>
				</div>

				<dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
					<div>
						<dt class="flex items-center gap-1 text-xs text-gray-500">
							<GaugeIcon class="h-3.5 w-3.5" />Speed
						</dt>
						<dd class="font-mono font-bold text-gray-900">{selected.speedKph} km/h</dd>
					</div>
					<div>
						<dt class="flex items-center gap-1 text-xs text-gray-500">
							<NavigationIcon class="h-3.5 w-3.5" />Heading
						</dt>
						<dd class="font-mono font-bold text-gray-900">
							{compass(selected.heading)}
							{Math.round(selected.heading)}°
						</dd>
					</div>
					<div class="col-span-2">
						<dt class="flex items-center gap-1 text-xs text-gray-500">
							<RouteIcon class="h-3.5 w-3.5" />Route
						</dt>
						<dd class="font-medium text-gray-900">
							{selected.routeName}
							<span class="font-mono text-xs text-gray-500">({selected.progress}%)</span>
						</dd>
					</div>
					<div>
						<dt class="flex items-center gap-1 text-xs text-gray-500">
							<UserIcon class="h-3.5 w-3.5" />Driver
						</dt>
						<dd class="font-medium text-gray-900">{selected.driverName}</dd>
					</div>
					<div>
						<dt class="flex items-center gap-1 text-xs text-gray-500">
							<PhoneIcon class="h-3.5 w-3.5" />Phone
						</dt>
						<dd class="font-medium text-gray-900">{selected.driverPhone || '—'}</dd>
					</div>
					<div class="col-span-2">
						<dt class="text-xs text-gray-500">Last position</dt>
						<dd class="font-mono text-xs text-gray-900">
							{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)} · {ago(selected.updatedAt)}
						</dd>
					</div>
				</dl>

				<div class="mt-3 border-t border-gray-100 pt-3">
					<div class="mb-1 flex items-baseline justify-between">
						<span class="font-mono text-sm font-bold {over ? 'text-red-700' : 'text-gray-900'}">
							{selected.totalBags.toLocaleString()}
							<span class="text-xs font-normal text-gray-500">
								/ {selected.truckCapacity.toLocaleString()} bags
							</span>
						</span>
						<span
							class="font-mono text-[11px] font-semibold {over ? 'text-red-700' : 'text-gray-500'}"
						>
							{over ? 'Over capacity' : `${pct}%`}
						</span>
					</div>
					<div class="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
						<div
							class="h-full {over ? 'bg-red-600' : pct > 90 ? 'bg-amber-500' : 'bg-emerald-500'}"
							style="width: {Math.min(100, pct)}%"
						></div>
					</div>

					{#if selectedTrip?.items.length}
						<ul class="mt-3 space-y-1.5">
							{#each selectedTrip.items as item (item.id)}
								<li class="flex items-baseline justify-between gap-2 text-xs">
									<span class="min-w-0 truncate text-gray-700">
										<span class="font-semibold text-gray-900">{item.farmName || '—'}</span>
										· {item.feedName}
									</span>
									<span class="shrink-0 font-mono font-bold text-gray-900">
										{item.loadedQty.toLocaleString()}
									</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
