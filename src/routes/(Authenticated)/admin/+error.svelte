<script lang="ts">
	import { page } from '$app/state';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import {
		HomeIcon,
		ArrowLeftIcon,
		RotateCcwIcon,
		GhostIcon,
		ServerCrashIcon,
		ShieldXIcon,
		AlertTriangleIcon
	} from '@lucide/svelte';

	const meta = $derived.by(() => {
		switch (page.status) {
			case 404:
				return {
					Icon: GhostIcon,
					title: 'Page not found',
					blurb:
						"We couldn't find the page you're looking for. It may have been moved, renamed, or never existed."
				};
			case 500:
				return {
					Icon: ServerCrashIcon,
					title: 'Something went wrong',
					blurb: 'An unexpected error occurred on our end. Please try again in a moment.'
				};
			case 401:
			case 403:
				return {
					Icon: ShieldXIcon,
					title: 'Access denied',
					blurb:
						"You don't have permission to view this page. If you believe this is a mistake, contact your administrator."
				};
			default:
				return {
					Icon: AlertTriangleIcon,
					title: 'Unexpected error',
					blurb: page.error?.message ?? 'Something went wrong. Please try again.'
				};
		}
	});

	const Icon = $derived(meta.Icon);

	function goBack() {
		if (history.length > 1) history.back();
		else window.location.assign('/');
	}
</script>

<svelte:head>
	<title>{page.status} · {meta.title} | Puting Manok Corporation</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-svh w-full items-center justify-center bg-stone-50 px-4 py-16">
	<div class="w-full max-w-lg text-center">
		<div
			class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-100"
		>
			<Icon class="h-8 w-8" strokeWidth={1.75} />
		</div>

		<p class="mt-4 font-mono text-xs font-semibold tracking-[0.2em] text-red-700 uppercase">
			Error {page.status}
		</p>

		<h1 class="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
			{meta.title}
		</h1>

		<p class="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-stone-500">
			{meta.blurb}
		</p>

		{#if page.status === 404}
			<div class="mt-4 flex justify-center">
				<code
					class="max-w-full truncate rounded-md bg-stone-100 px-2.5 py-1 text-xs text-stone-600"
				>
					{page.url.pathname}
				</code>
			</div>
		{/if}

		<div class="mt-8 flex flex-wrap items-center justify-center gap-2">
			<a href="/" class={buttonVariants({ class: 'h-10 px-4' })}>
				<HomeIcon class="mr-2 h-4 w-4" />
				Go home
			</a>
			<Button variant="outline" class="h-10 px-4" onclick={goBack}>
				<ArrowLeftIcon class="mr-2 h-4 w-4" />
				Go back
			</Button>
			{#if page.status !== 404}
				<Button variant="ghost" class="h-10 px-4" onclick={() => window.location.reload()}>
					<RotateCcwIcon class="mr-2 h-4 w-4" />
					Retry
				</Button>
			{/if}
		</div>
	</div>
</div>
