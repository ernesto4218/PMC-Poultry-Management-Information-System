<script>
	// @ts-nocheck

	import { tick } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import MapIcon from '@lucide/svelte/icons/map';
	import Warehouse from '@lucide/svelte/icons/warehouse';
	import Hash from '@lucide/svelte/icons/hash';
	import Tag from '@lucide/svelte/icons/tag';
	import Pill from '@lucide/svelte/icons/pill';
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import X from '@lucide/svelte/icons/x';
	import * as Command from '#lib/components/ui/command/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { cn } from '#lib/utils.ts';
	import MedicationTable from '#lib/components/admin/med-guide/medication-table.svelte';
	import { farmGroupOf } from '#lib/types/medication-memory.ts';
	import MedicationSummary from '../../../../../lib/components/admin/med-guide/medication-summary.svelte';
	import { Printer } from '@lucide/svelte';
	import PrintDialogCcs from '#lib/components/admin/med-guide/print-dialog-ccs.svelte';

	let pdfElement = $state(null);

	let schedule = $state();

	let { data } = $props();
	const TYPE_STYLES = {
		CCS: 'bg-red-50 text-red-700 ring-red-600/20',
		'CON-MAH': 'bg-amber-50 text-amber-700 ring-amber-600/20',
		'CON-PAG': 'bg-sky-50 text-sky-700 ring-sky-600/20'
	};

	// "CANIANGAN RAMON MAGSAYSAY ZAMBOANGA DEL SUR" -> { barangay, municipality }
	function parseAddress(address = '') {
		const m = address.match(/^(.*?)\s+(RAMON MAGAYSAY|PAGADIAN CITY|MAHAYAG)\s+ZAMBOANGA DEL SUR$/);
		return m
			? { barangay: m[1], municipality: m[2] }
			: { barangay: address, municipality: 'Other' };
	}

	const toTitle = (s = '') => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
	function formatNumber(value) {
		const number = Number(value);
		return number.toLocaleString();
	}

	// Works whether the date arrives as a Date object or an ISO string
	function formatDate(value) {
		if (!value) return '—';
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return '—';
		return new Intl.DateTimeFormat('en-PH', {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: 'Asia/Manila'
		}).format(d);
	}

	const farms = $derived(data.farms.map((f) => ({ ...f, ...parseAddress(f.address) })));

	// Group by municipality, sort naturally (CANIANGAN 2 before CANIANGAN 10)
	const groups = $derived.by(() => {
		const map = new Map();
		for (const f of farms) {
			if (!map.has(f.municipality)) map.set(f.municipality, []);
			map.get(f.municipality).push(f);
		}
		return [...map.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([municipality, items]) => ({
				municipality,
				items: items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
			}));
	});

	let open = $state(false);
	let selectedId = $state('');
	let triggerRef = $state(null);

	const selected = $derived(farms.find((f) => f.id === selectedId));
	const group = $derived(selected ? farmGroupOf(selected.type) : null);

	function select(id) {
		selectedId = id;
		open = false;
		tick().then(() => triggerRef?.focus());
	}
</script>

<svelte:head>
	<title>Med Guide CCS | Puting Manok Corporation</title>
</svelte:head>

{#snippet typeBadge(type)}
	{#if type}
		<span
			class={cn(
				'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
				TYPE_STYLES[type] ?? 'bg-gray-50 text-gray-600 ring-gray-500/20'
			)}
		>
			{type}
		</span>
	{/if}
{/snippet}

{#snippet infoItem(Icon, label, value, mono = false)}
	<div class="flex items-start gap-2 rounded-lg">
		<div
			class="flex size-5 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm ring-1 ring-amber-200/70"
		>
			<Icon class="size-3" />
		</div>
		<div class="min-w-0">
			<p class="text-[10px] font-semibold tracking-wider text-amber-700/80 uppercase">{label}</p>
			<p class={cn('mt-0.5 text-xs font-medium break-words text-gray-900', mono && 'font-mono')}>
				{value}
			</p>
		</div>
	</div>
{/snippet}

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<div class="flex flex-row items-center justify-between">
			<!-- HEADER -->
			<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">
						Chick Management
					</p>
					<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">
						Medication Guide Generator
					</h1>
					<p class="mt-1 text-sm text-gray-500">
						Generate a 34-day vaccination and medicine schedule per farm.
					</p>
				</div>
			</div>

			<!-- FARM SELECT -->
			<div class="flex items-center gap-3">
				<Popover.Root bind:open>
					<Popover.Trigger bind:ref={triggerRef}>
						{#snippet child({ props })}
							<Button
								{...props}
								id="farm-select"
								variant="outline"
								role="combobox"
								aria-expanded={open}
								class="h-auto min-h-10 w-full justify-between bg-white py-2 text-left font-normal sm:w-[420px]"
							>
								{#if selected}
									<span class="flex min-w-0 flex-col items-start gap-0.5">
										<span class="flex items-center gap-2">
											<span class="truncate font-medium text-gray-900">{selected.name}</span>
											{@render typeBadge(selected.type)}
										</span>
										<span class="truncate text-xs text-gray-500">
											{selected.code} · {toTitle(selected.barangay)}, {toTitle(
												selected.municipality
											)}
										</span>
									</span>
								{:else}
									<span class="text-gray-500">Select a farm…</span>
								{/if}
								<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
							</Button>
						{/snippet}
					</Popover.Trigger>

					<Popover.Content
						class="w-[var(--bits-popover-anchor-width)] min-w-[320px] p-0"
						align="start"
					>
						<Command.Root>
							<Command.Input placeholder="Search by name, code, type or location…" />
							<Command.List class="max-h-[320px]">
								<Command.Empty>No farm found.</Command.Empty>

								{#each groups as group (group.municipality)}
									<Command.Group heading={toTitle(group.municipality)}>
										{#each group.items as farm (farm.id)}
											<Command.Item
												value={farm.id}
												keywords={[
													farm.name,
													farm.code,
													farm.type,
													farm.barangay,
													farm.municipality
												]}
												onSelect={() => select(farm.id)}
												class="items-start gap-2 py-2"
											>
												<Check
													class={cn(
														'mt-0.5 size-4 shrink-0 text-red-700',
														selectedId !== farm.id && 'text-transparent'
													)}
												/>
												<div class="flex min-w-0 flex-1 flex-col gap-0.5">
													<div class="flex items-center gap-2">
														<span class="truncate text-sm font-medium text-gray-900">
															{farm.name}
														</span>
														{@render typeBadge(farm.type)}
													</div>
													<div class="flex items-center gap-1.5 text-xs text-gray-500">
														<span class="font-mono">{farm.code}</span>
														<span aria-hidden="true">·</span>
														<MapPin class="size-3 shrink-0" />
														<span class="truncate">{toTitle(farm.barangay)}</span>
													</div>
												</div>
											</Command.Item>
										{/each}
									</Command.Group>
								{/each}
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>

				{#if selected}
					<!-- ⬇ schedule now flows into the dialog -->
					<PrintDialogCcs
						volume={selected.volume}
						columns={data.memory[group]}
						farm={selected}
						{schedule}
					/>
				{/if}
			</div>
		</div>

		<!-- FARM DETAILS -->
		{#if selected}
			<section
				aria-labelledby="farm-details-title"
				class="overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm"
			>
				<!-- Header -->
				<div
					class="flex items-center justify-between gap-2 border-b border-red-100 bg-gradient-to-r from-red-50 to-amber-50 px-3 py-2"
				>
					<div class="flex min-w-0 items-baseline gap-2">
						<h2 id="farm-details-title" class="truncate text-sm font-bold text-gray-900">
							{selected.name}
						</h2>
						<span class="font-mono text-xs font-semibold text-red-700">{selected.code}</span>
						{#if selected.type}
							<span class="text-xs font-bold text-amber-600">{selected.type}</span>
						{/if}
					</div>
				</div>

				<!-- Details -->
				<dl class="grid grid-cols-2 gap-x-6 gap-y-2 px-3 py-2.5 sm:grid-cols-3 lg:grid-cols-6">
					{@render infoItem(MapPin, 'Volume', formatNumber(selected.volume))}
					{@render infoItem(MapIcon, 'Address', toTitle(selected.address))}
					{@render infoItem(CalendarPlus, 'Created', formatDate(selected.createdAt))}
					{@render infoItem(CalendarClock, 'Updated', formatDate(selected.updatedAt))}
				</dl>

				<!-- Footer -->
				<p class="truncate border-t border-amber-100 px-3 py-1 font-mono text-[10px] text-gray-400">
					ID: {selected.id}
				</p>
			</section>

			{#if group}
				{#key selected.id}
					<div bind:this={pdfElement}>
						<MedicationTable
							volume={selected.volume}
							columns={data.memory[group]}
							onchange={(value) => (schedule = value)}
						/>
					</div>
				{/key}
			{/if}
		{:else}
			<p
				class="rounded-lg border border-dashed border-amber-200 bg-amber-50/40 px-3 py-2 text-xs text-gray-600"
			>
				<span class="font-semibold text-gray-900">No farm selected.</span>
				Choose a farm above to view its details.
			</p>
		{/if}
	</div>
</div>
