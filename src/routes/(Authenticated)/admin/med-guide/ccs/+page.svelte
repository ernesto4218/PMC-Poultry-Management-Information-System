<script>
	// @ts-nocheck

	import { tick } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import MapIcon from '@lucide/svelte/icons/map';
	import Bird from '@lucide/svelte/icons/bird';
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import * as Command from '#lib/components/ui/command/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { cn } from '#lib/utils.ts';
	import MedicationTable from '#lib/components/admin/med-guide/medication-table.svelte';
	import { farmGroupOf } from '#lib/types/medication-memory.ts';
	import PrintDialogCcs from '#lib/components/admin/med-guide/print-dialog-ccs.svelte';
	import Badge from '#lib/components/ui/badge/badge.svelte';

	let pdfElement = $state(null);
	let schedule = $state();

	let { data } = $props();

	const TYPE_STYLES = {
		CCS: 'bg-blue-50 text-blue-700 ring-blue-200',
		CON: 'bg-red-50 text-red-700 ring-red-200'
	};

	const toTitle = (s = '') => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

	function formatNumber(value) {
		const number = Number(value);
		return number.toLocaleString();
	}

	// Date-only safe (YYYY-MM-DD or full ISO)
	function formatDateShort(value) {
		if (!value) return '—';
		const s = String(value).slice(0, 10);
		const parts = s.split('-');
		if (parts.length !== 3) {
			const d = new Date(value);
			return Number.isNaN(d.getTime())
				? '—'
				: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
		}
		const [y, m, d] = parts.map(Number);
		if (!y || !m || !d) return '—';
		return new Date(y, m - 1, d).toLocaleDateString('en-PH', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	// Group batches by their farm, farm sorted by name, batches newest first
	const groups = $derived.by(() => {
		const map = new Map();
		for (const b of data.batches) {
			if (!map.has(b.farmId)) map.set(b.farmId, { farm: b.farm, batches: [] });
			map.get(b.farmId).batches.push(b);
		}
		return [...map.values()]
			.sort((a, b) => a.farm.name.localeCompare(b.farm.name, undefined, { numeric: true }))
			.map((g) => ({
				...g,
				batches: g.batches.sort((a, b) => b.dateSet.localeCompare(a.dateSet))
			}));
	});

	let open = $state(false);
	let selectedBatchId = $state('');
	let triggerRef = $state(null);

	const selectedBatch = $derived(data.batches.find((b) => b.id === selectedBatchId));
	const selectedFarm = $derived(selectedBatch?.farm ?? null);
	const group = $derived(selectedFarm ? farmGroupOf(selectedFarm.type) : null);

	function select(id) {
		selectedBatchId = id;
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
					<h1 class="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight text-gray-900">
						Medication Guide Generator <Badge
							class=" bg-blue-50 p-2 text-xs text-blue-700 ring-blue-200">CCS</Badge
						>
					</h1>
					<p class="mt-1 text-sm text-gray-500">
						Generate a 34-day vaccination and medicine schedule per chick batch.
					</p>
				</div>
			</div>

			<!-- BATCH SELECT -->
			<div class="flex items-center gap-3">
				<Popover.Root bind:open>
					<Popover.Trigger bind:ref={triggerRef}>
						{#snippet child({ props })}
							<Button
								{...props}
								id="batch-select"
								variant="outline"
								role="combobox"
								aria-expanded={open}
								class="h-auto min-h-10 w-full justify-between bg-white py-2 text-left font-normal sm:w-[440px]"
							>
								{#if selectedBatch}
									<span class="flex min-w-0 flex-col items-start gap-0.5">
										<span class="flex items-center gap-2">
											<span class="truncate font-mono font-semibold text-gray-900">
												{selectedBatch.batchNumber}
											</span>
											{@render typeBadge(selectedFarm?.type)}
										</span>
										<span class="truncate text-xs text-gray-500">
											{selectedFarm?.name} · {formatNumber(selectedBatch.volume)} chicks ·
											{formatDateShort(selectedBatch.dateSet)}
										</span>
									</span>
								{:else}
									<span class="text-gray-500">Select a chick batch…</span>
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
							<Command.Input placeholder="Search by Chick In No., farm, or date…" />
							<Command.List class="max-h-[320px]">
								<Command.Empty>No batch found.</Command.Empty>

								{#each groups as g (g.farm.id)}
									<Command.Group heading={`${g.farm.name} · ${g.farm.code}`}>
										{#each g.batches as batch (batch.id)}
											<Command.Item
												value={batch.id}
												keywords={[
													batch.batchNumber,
													g.farm.name,
													g.farm.code,
													g.farm.type,
													batch.dateSet
												]}
												onSelect={() => select(batch.id)}
												class="items-start gap-2 py-2"
											>
												<Check
													class={cn(
														'mt-0.5 size-4 shrink-0 text-red-700',
														selectedBatchId !== batch.id && 'text-transparent'
													)}
												/>
												<div class="flex min-w-0 flex-1 flex-col gap-0.5">
													<div class="flex items-center gap-2">
														<span class="truncate font-mono text-sm font-semibold text-gray-900">
															{batch.batchNumber}
														</span>
														{@render typeBadge(g.farm.type)}
													</div>
													<div class="flex items-center gap-1.5 text-xs text-gray-500">
														<CalendarPlus class="size-3 shrink-0" />
														<span>{formatDateShort(batch.dateSet)}</span>
														<span aria-hidden="true">·</span>
														<span>{formatNumber(batch.volume)} chicks</span>
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

				{#if selectedBatch && selectedFarm}
					<PrintDialogCcs
						volume={selectedBatch.volume}
						columns={data.memory[group]}
						farm={selectedFarm}
						batchId={selectedBatch.id}
						batchNumber={selectedBatch.batchNumber}
						batchDateSet={selectedBatch.dateSet}
						{schedule}
					/>
				{/if}
			</div>
		</div>

		<!-- BATCH + FARM DETAILS -->
		{#if selectedBatch && selectedFarm}
			<section
				aria-labelledby="batch-details-title"
				class="overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm"
			>
				<!-- Header -->
				<div
					class="flex items-center justify-between gap-2 border-b border-red-100 bg-gradient-to-r from-red-50 to-amber-50 px-3 py-2"
				>
					<div class="flex min-w-0 items-baseline gap-2">
						<h2 id="batch-details-title" class="truncate font-mono text-sm font-bold text-gray-900">
							{selectedBatch.batchNumber}
						</h2>
						<span class="truncate text-sm font-semibold text-gray-700">{selectedFarm.name}</span>
						<span class="font-mono text-xs font-semibold text-red-700">{selectedFarm.code}</span>
						{#if selectedFarm.type}
							{@render typeBadge(selectedFarm.type)}
						{/if}
					</div>
				</div>

				<!-- Details -->
				<dl class="grid grid-cols-2 gap-x-6 gap-y-2 px-3 py-2.5 sm:grid-cols-3 lg:grid-cols-4">
					{@render infoItem(Bird, 'Batch volume', `${formatNumber(selectedBatch.volume)} chicks`)}
					{@render infoItem(CalendarPlus, 'Date set', formatDateShort(selectedBatch.dateSet))}
					{@render infoItem(MapPin, 'Farm', `${selectedFarm.name} (${selectedFarm.code})`)}
					{@render infoItem(MapIcon, 'Address', toTitle(selectedFarm.address))}
				</dl>

				<!-- Footer -->
				<p class="truncate border-t border-amber-100 px-3 py-1 font-mono text-[10px] text-gray-400">
					Batch ID: {selectedBatch.id} · Farm ID: {selectedFarm.id}
				</p>
			</section>

			{#if group}
				{#key selectedBatch.id}
					<div bind:this={pdfElement}>
						<MedicationTable
							volume={selectedBatch.volume}
							columns={data.memory[group]}
							onchange={(value) => (schedule = value)}
							type={selectedFarm.type}
						/>
					</div>
				{/key}
			{/if}
		{:else}
			<p
				class="rounded-lg border border-dashed border-amber-200 bg-amber-50/40 px-3 py-2 text-xs text-gray-600"
			>
				<span class="font-semibold text-gray-900">No batch selected.</span>
				Choose a chick batch above to generate its medication guide.
			</p>
		{/if}
	</div>
</div>
