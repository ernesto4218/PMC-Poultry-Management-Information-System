<script lang="ts">
	import AdminSidebar from '#lib/components/admin/sidebar/admin-sidebar.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import { Bell, BookOpen, Search } from '@lucide/svelte';
	import { Avatar } from 'bits-ui';

	let { children, data } = $props();
</script>

<Sidebar.Provider class="h-screen w-screen bg-white">
	<AdminSidebar {data} />

	<main class="flex h-full flex-1 flex-col overflow-hidden">
		<header class="flex items-center justify-between p-2">
			<Sidebar.Trigger class="text-black hover:bg-gray-300" />
			<div class="flex items-center gap-2 font-semibold text-black">
				<span class="sm:inline-block">PMC Poultry Management Information System</span>
			</div>

			<div class="flex flex-1 items-center justify-end gap-4 md:gap-6">
				<Button variant="outline" size="icon" class="relative">
					<Bell class="h-4 w-4" />
					<span class="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-red-500"></span>
				</Button>
				<Avatar.Root class="h-9 w-9 rounded-full border-2 border-blue-100">
					<Avatar.Image src="/company_logo.png" alt="@shadcn" class="rounded-full" />

					<Avatar.Fallback class="bg-red-100 text-red-700">PMC</Avatar.Fallback>
				</Avatar.Root>
			</div>
		</header>

		<div class="flex-1 overflow-y-auto">
			{@render children?.()}
		</div>
	</main>
</Sidebar.Provider>
