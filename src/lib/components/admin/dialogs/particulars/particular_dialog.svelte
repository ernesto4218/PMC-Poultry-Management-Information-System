<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { PackageIcon, AlertCircleIcon, LoaderCircleIcon } from '@lucide/svelte';
	import {
		type Particular,
		type ParticularInput,
		type ParticularCategory,
		PARTICULAR_CATEGORIES
	} from '#lib/types/particulars.ts';
	import * as Select from '#lib/components/ui/select/index.ts';

	let {
		open = $bindable(false),
		item = null,
		onsave
	}: {
		open?: boolean;
		item?: Particular | null;
		onsave: (p: ParticularInput) => Promise<void>;
	} = $props();

	let name = $state('');
	let saving = $state(false);
	let submitError = $state('');
	let category = $state('');

	$effect(() => {
		if (open) {
			name = item?.name ?? '';
			category = item?.category ?? '';
			submitError = '';
		}
	});

	const isEdit = $derived(item !== null);
	const canSave = $derived(name.trim() !== '' && category !== '');

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSave || saving || category === '') return;
		saving = true;
		submitError = '';
		try {
			await onsave({ id: item?.id, name: name.trim(), category });
			open = false;
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Could not save particular.';
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="min-w-md gap-0 overflow-y-auto border-t-4 border-t-red-700 p-0">
		<Dialog.Header class="border-b border-gray-100 px-6 pt-5 pb-4">
			<Dialog.Title class="flex items-center gap-3 text-lg font-semibold text-gray-900">
				<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700">
					<PackageIcon class="h-5 w-5" />
				</span>
				{isEdit ? 'Edit particular' : 'Add new particular'}
			</Dialog.Title>
		</Dialog.Header>

		<form onsubmit={submit} class="flex flex-col">
			<div class="space-y-1.5 px-6 py-5">
				<Label for="particularName" class="text-sm font-medium text-gray-700">
					Name <span class="text-red-600">*</span>
				</Label>
				<Input
					id="particularName"
					bind:value={name}
					placeholder="e.g. FARM SALARIES AND OVERTIME"
					required
					autocomplete="off"
					class="h-10 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-0"
				/>
				<Label for="particularCategory" class="mt-4 text-sm font-medium text-gray-700">
					Category <span class="text-red-600">*</span>
				</Label>
				<Select.Root type="single" bind:value={category}>
					<Select.Trigger
						id="particularCategory"
						class="h-10 w-full focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30"
					>
						{category || 'Select category'}
					</Select.Trigger>
					<Select.Content>
						{#each PARTICULAR_CATEGORIES as c (c)}
							<Select.Item value={c} label={c}>{c}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				{#if submitError}
					<p class="mt-2 flex items-center gap-1.5 text-xs text-red-600">
						<AlertCircleIcon class="h-3.5 w-3.5 shrink-0" />{submitError}
					</p>
				{/if}
			</div>

			<Dialog.Footer
				class="mb-2 flex w-full items-end gap-2 border-t border-gray-100 bg-gray-50/60"
			>
				<Dialog.Close
					type="button"
					disabled={saving}
					class={buttonVariants({ variant: 'outline' })}
				>
					Cancel
				</Dialog.Close>
				<Button
					type="submit"
					disabled={!canSave || saving}
					class="bg-red-700 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
				>
					{#if saving}
						<LoaderCircleIcon class="mr-1.5 h-4 w-4 animate-spin" />Saving…
					{:else}
						{isEdit ? 'Save changes' : 'Add particular'}
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
