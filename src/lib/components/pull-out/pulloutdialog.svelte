<script lang="ts">
	import { CalendarIcon, TruckIcon, UserIcon, UserCogIcon } from '@lucide/svelte';
	import { DateFormatter, getLocalTimeZone, type DateValue } from '@internationalized/date';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Checkbox } from '#lib/components/ui/checkbox/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { Calendar } from '#lib/components/ui/calendar/index.ts';
	import { cn } from '#lib/utils.js';
	import SelectCombobox from './selectcombobox.svelte';

	// Minimal shape of the row this dialog was opened from (matches PullOutRow).
	type RowContext = {
		id: string;
		documentId: string;
		farmName: string;
		farmCode: string;
		feedName: string;
		batchNumber: string;
	};

	let {
		open = $bindable(false),
		row = null,
		onsubmit
	}: {
		open?: boolean;
		row?: RowContext | null;
		onsubmit?: (data: {
			rowId: string | null;
			trucker: string;
			billingTrucker: boolean;
			feedsLabor: boolean;
			truck: string;
			driver: string;
			dateArrival: string | null;
		}) => void;
	} = $props();

	// --- Fake data ---------------------------------------------------------
	const truckers = [
		{ value: 't1', label: 'Mindanao Haulers Inc.', description: 'Cagayan de Oro' },
		{ value: 't2', label: 'Bukidnon Freight Co.', description: 'Malaybalay' },
		{ value: 't3', label: 'Dela Cruz Trucking', description: 'Iligan City' },
		{ value: 't4', label: 'Northern Express Logistics', description: 'Butuan' },
		{ value: 't5', label: 'Santos & Sons Transport', description: 'Valencia' }
	];

	const trucks = [
		{ value: 'k1', label: 'ABC 1234', description: '10-wheeler • 15 tons' },
		{ value: 'k2', label: 'XYZ 5678', description: '6-wheeler • 8 tons' },
		{ value: 'k3', label: 'NDG 4421', description: 'Wing van • 12 tons' },
		{ value: 'k4', label: 'GHT 9087', description: '10-wheeler • 15 tons' },
		{ value: 'k5', label: 'PLM 3310', description: 'Elf • 4 tons' }
	];

	const drivers = [
		{ value: 'd1', label: 'Juan Dela Cruz', description: 'License B-12 • 8 yrs' },
		{ value: 'd2', label: 'Pedro Reyes', description: 'License C-03 • 5 yrs' },
		{ value: 'd3', label: 'Mario Santos', description: 'License B-07 • 12 yrs' },
		{ value: 'd4', label: 'Ramon Bautista', description: 'License B-21 • 3 yrs' },
		{ value: 'd5', label: 'Allan Villanueva', description: 'License C-15 • 6 yrs' }
	];

	// --- Form state --------------------------------------------------------
	let trucker = $state('');
	let billingTrucker = $state(false);
	let feedsLabor = $state(false);
	let truck = $state('');
	let driver = $state('');
	let dateArrival = $state<DateValue | undefined>(undefined);

	const df = new DateFormatter('en-US', { dateStyle: 'long' });
	let dateOpen = $state(false);

	const canSubmit = $derived(!!trucker && !!truck && !!driver && !!dateArrival);

	function reset() {
		trucker = '';
		billingTrucker = false;
		feedsLabor = false;
		truck = '';
		driver = '';
		dateArrival = undefined;
	}

	// Start fresh every time the dialog opens (e.g. for a different row).
	$effect(() => {
		if (open) reset();
	});

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSubmit) return;
		onsubmit?.({
			rowId: row?.id ?? null,
			trucker,
			billingTrucker,
			feedsLabor,
			truck,
			driver,
			dateArrival: dateArrival ? dateArrival.toDate(getLocalTimeZone()).toISOString() : null
		});
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[480px]">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<TruckIcon class="size-5 text-red-700" />
				Pull out from warehouse
			</Dialog.Title>
			<Dialog.Description>
				{#if row}
					{row.feedName} · {row.farmName} ({row.farmCode}) · Batch {row.batchNumber}
				{:else}
					Select the trucker, truck, driver and arrival date.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleSubmit} class="grid gap-5 py-2">
			<!-- Trucker -->
			<div class="grid gap-2">
				<Label>Trucker</Label>
				<SelectCombobox
					options={truckers}
					bind:value={trucker}
					placeholder="Select trucker"
					searchPlaceholder="Search trucker..."
					icon={UserCogIcon}
				/>
			</div>

			<!-- Checkboxes -->
			<div class="grid grid-cols-2 gap-3">
				<Label
					for="billing-trucker"
					class="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-300 p-3 font-normal transition-colors hover:bg-amber-50/60 has-[[data-state=checked]]:border-red-500 has-[[data-state=checked]]:bg-red-50/60"
				>
					<Checkbox id="billing-trucker" bind:checked={billingTrucker} />
					<span class="text-sm font-medium">Billing Trucker</span>
				</Label>

				<Label
					for="feeds-labor"
					class="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-300 p-3 font-normal transition-colors hover:bg-amber-50/60 has-[[data-state=checked]]:border-red-500 has-[[data-state=checked]]:bg-red-50/60"
				>
					<Checkbox id="feeds-labor" bind:checked={feedsLabor} />
					<span class="text-sm font-medium">Feeds Labor</span>
				</Label>
			</div>

			<!-- Truck -->
			<div class="grid gap-2">
				<Label>Truck</Label>
				<SelectCombobox
					options={trucks}
					bind:value={truck}
					placeholder="Select truck"
					searchPlaceholder="Search plate number..."
					icon={TruckIcon}
				/>
			</div>

			<!-- Driver -->
			<div class="grid gap-2">
				<Label>Driver</Label>
				<SelectCombobox
					options={drivers}
					bind:value={driver}
					placeholder="Select driver"
					searchPlaceholder="Search driver..."
					icon={UserIcon}
				/>
			</div>

			<!-- Date Arrival -->
			<div class="grid gap-2">
				<Label>Date Arrival</Label>
				<Popover.Root bind:open={dateOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="outline"
								class={cn(
									'h-10 w-full justify-start rounded-lg border-gray-300 font-normal',
									!dateArrival && 'text-muted-foreground'
								)}
							>
								<CalendarIcon class="mr-2 size-4 text-gray-400" />
								{dateArrival ? df.format(dateArrival.toDate(getLocalTimeZone())) : 'Pick a date'}
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-auto p-0" align="start">
						<Calendar
							type="single"
							bind:value={dateArrival}
							onValueChange={() => (dateOpen = false)}
							initialFocus
						/>
					</Popover.Content>
				</Popover.Root>
			</div>

			<Dialog.Footer class="mt-2">
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={!canSubmit} class="bg-red-700 hover:bg-red-800">
					Save
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
