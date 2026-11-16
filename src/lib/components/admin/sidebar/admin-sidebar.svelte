<script lang="ts">
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import { useSidebar } from '#lib/components/ui/sidebar/index.js';
	import * as Avatar from '#lib/components/ui/avatar/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.ts';

	import {
		ChevronsUpDown,
		LogOut,
		ShieldQuestionMark,
		LayoutDashboard,
		ChartNoAxesCombined,
		Settings,
		Warehouse,
		Package,
		Shield,
		Wallet,
		Calculator,
		Receipt,
		TrendingUp,
		BookCopy,
		ChevronDown,
		SquareBookmark,
		BookDashed,
		MapPinHouseIcon,
		Newspaper,
		Bird,
		Birdhouse,
		MemoryStickIcon,
		ListOrdered,
		CpuIcon
	} from '@lucide/svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '#lib/auth-client.ts';
	import { toast } from 'svelte-sonner';
	import { Collapsible } from 'bits-ui';

	const sidebar = useSidebar();
	// Icon-only rail on desktop (on mobile the sidebar is a full sheet)
	let isCollapsed = $derived(sidebar.state === 'collapsed' && !sidebar.isMobile);

	async function handleSignOut() {
		const { error } = await authClient.signOut();

		if (error) {
			toast.error(error.message ?? 'Failed to sign out');
			return;
		}

		await invalidateAll(); // clear any cached user/session data
		goto('/login');
	}

	const navGroups = [
		{
			label: 'Overview',
			items: [
				{ title: 'Dashboard', url: '/admin/dashboard', icon: LayoutDashboard },
				{ title: 'Analytics', url: '/admin/analytics', icon: ChartNoAxesCombined },
				{ title: 'Standard Management', url: '/admin/standard-management', icon: Shield },
				{ title: 'Suppliers', url: '/admin/suppliers', icon: Package }
			]
		},
		{
			label: 'Farm Management',
			items: [
				{ title: 'Farms', url: '/admin/farms', icon: Warehouse },
				{ title: 'Map', url: '/admin/farm-map', icon: MapPinHouseIcon }
			]
		},
		{
			label: 'Chick Management',
			items: [
				{
					title: 'Chick Batching',
					url: '/admin/chick-batch',
					icon: Birdhouse,
					children: [
						{ title: 'Batches', url: '/admin/chick-batch', icon: Bird },
						{ title: 'Reports', url: '/admin/chick-batch/reports', icon: Newspaper }
					]
				},
				{
					title: 'Med Guide',
					url: '/admin/med-guide',
					icon: BookCopy,
					children: [
						{ title: 'CCS', url: '/admin/med-guide/ccs', icon: SquareBookmark },
						{ title: 'CON', url: '/admin/med-guide/con', icon: SquareBookmark },
						{ title: 'Memory', url: '/admin/med-guide/memory', icon: MemoryStickIcon },
						{ title: 'Reports', url: '/admin/med-guide/med-reports', icon: Newspaper }
					]
				},
				{
					title: 'Budget Placement',
					url: '/admin/budget-placement',
					icon: Wallet,
					children: [
						{ title: 'Particulars', url: '/admin/budget-placement/particulars', icon: ListOrdered },
						{ title: 'Memory', url: '/admin/budget-placement/memory', icon: MemoryStickIcon },
						{
							title: 'Configurations',
							url: '/admin/budget-placement/configuraion',
							icon: Settings
						},
						{ title: 'Generator', url: '/admin/budget-placement/generator', icon: CpuIcon },
						{ title: 'Reports', url: '/admin/budget-placement/reports', icon: Newspaper }
					]
				}
			]
		},
		{
			label: 'Budget & Finance',
			items: [
				{ title: 'Budget Tracking', url: '/admin/budget/tracking', icon: Wallet },
				{ title: 'Budget Generator', url: '/admin/budget/generator', icon: Calculator },
				{ title: 'Expenses & Feeds Cost', url: '/admin/budget/expenses', icon: Receipt },
				{ title: 'Cycle Costing Reports', url: '/admin/budget/reports', icon: TrendingUp }
			]
		},
		{
			label: 'System',
			items: [
				{ title: 'Settings', url: '/admin/settings', icon: Settings },
				{ title: 'Help & Support', url: '/admin/support', icon: ShieldQuestionMark }
			]
		}
	];

	let { data } = $props();
	let user = $derived(data.session.user);

	/**
	 * Pick the single most-specific child that matches the current path.
	 * Prevents `/admin/chick-batch` from being highlighted when the user is
	 * actually on `/admin/chick-batch/reports`.
	 */
	function activeChildHref(
		pathname: string,
		children: { url: string }[] | undefined
	): string | undefined {
		return children
			?.filter((c) => pathname === c.url || pathname.startsWith(c.url + '/'))
			?.sort((a, b) => b.url.length - a.url.length)[0]?.url;
	}
</script>

<Sidebar.Root collapsible="icon" class="bg-white text-gray-800">
	<div class="flex h-full flex-col bg-white">
		<!-- Sidebar Header / Branding -->
		<Sidebar.Header class="border-b border-gray-100/80 p-4 group-data-[collapsible=icon]:p-2">
			<div
				class="relative z-10 flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
			>
				<div
					class="flex size-15 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-700 shadow-md shadow-red-500/20 group-data-[collapsible=icon]:size-8"
				>
					<img
						alt="company logo"
						src="/company_logo.png"
						class="size-20 object-contain group-data-[collapsible=icon]:size-7"
					/>
				</div>

				<div class="flex flex-col group-data-[collapsible=icon]:hidden">
					<div class="text-sm font-bold tracking-wider text-red-950 uppercase">PMC PMIS</div>
					<div class="flex items-center gap-1.5">
						<span class="inline-block size-2 animate-pulse rounded-full bg-amber-500"></span>
						<span class="text-[0.65rem] font-semibold tracking-widest text-amber-700 uppercase">
							Administrator
						</span>
					</div>
				</div>
			</div>
		</Sidebar.Header>

		<!-- Navigation Content -->
		<Sidebar.Content class="px-2 py-3">
			{#each navGroups as group}
				<Sidebar.Group class="mb-2">
					<Sidebar.GroupLabel
						class="px-3 text-[0.65rem] font-bold tracking-widest text-amber-900/60 uppercase"
					>
						{group.label}
					</Sidebar.GroupLabel>
					<Sidebar.GroupContent class="mt-1">
						<Sidebar.Menu>
							{#each group.items as nav}
								{@const isActive =
									page.url.pathname === nav.url || page.url.pathname.startsWith(nav.url + '/')}
								{@const Icon = nav.icon}
								<!--
									Single most-specific matching child. Both the collapsed flyout and the
									expanded sub-list use this so that exactly one sub-item lights up.
								-->
								{@const activeChild = activeChildHref(page.url.pathname, nav.children)}

								{#if nav.children && isCollapsed}
									<!-- Collapsed: parent opens a flyout menu with its sub-links -->
									<Sidebar.MenuItem>
										<DropdownMenu.Root>
											<DropdownMenu.Trigger>
												{#snippet child({ props })}
													<Sidebar.MenuButton
														{...props}
														{isActive}
														tooltipContent={nav.title}
														class="relative flex w-full items-center justify-center rounded-lg px-0 py-2 transition-all duration-150 ease-in-out {isActive
															? 'bg-red-50 font-semibold text-red-700 shadow-xs'
															: 'text-gray-600 hover:bg-amber-50/60 hover:text-red-600'}"
													>
														{#if isActive}
															<span
																class="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-amber-500"
															></span>
														{/if}
														<Icon
															size={18}
															class="shrink-0 transition-colors {isActive
																? 'text-red-600'
																: 'text-gray-400'}"
														/>
													</Sidebar.MenuButton>
												{/snippet}
											</DropdownMenu.Trigger>
											<DropdownMenu.Content
												side="right"
												align="start"
												class="w-44 border-amber-100 shadow-lg"
											>
												<DropdownMenu.Label class="text-xs text-amber-900/70">
													{nav.title}
												</DropdownMenu.Label>
												<DropdownMenu.Separator />
												{#each nav.children as sub}
													{@const SubIcon = sub.icon}
													{@const subActive = activeChild === sub.url}
													<DropdownMenu.Item
														onSelect={() => goto(sub.url)}
														class="flex items-center gap-2 text-xs {subActive
															? 'bg-red-50 font-semibold text-red-700'
															: 'text-gray-600'}"
													>
														<SubIcon
															size={16}
															class={subActive ? 'text-red-600' : 'text-gray-400'}
														/>
														<span>{sub.title}</span>
													</DropdownMenu.Item>
												{/each}
											</DropdownMenu.Content>
										</DropdownMenu.Root>
									</Sidebar.MenuItem>
								{:else if nav.children}
									<!-- Expanded: collapsible item with sub-links -->
									<Collapsible.Root open={isActive} class="group/collapsible">
										{#snippet child({ props })}
											<Sidebar.MenuItem {...props}>
												<Collapsible.Trigger>
													{#snippet child({ props: triggerProps })}
														<Sidebar.MenuButton
															{...triggerProps}
															{isActive}
															tooltipContent={nav.title}
														>
															{#snippet child({ props: buttonProps })}
																<button
																	{...buttonProps}
																	type="button"
																	class="group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs transition-all duration-150 ease-in-out {isActive
																		? 'bg-red-50 font-semibold text-red-700 shadow-xs'
																		: 'text-gray-600 hover:bg-amber-50/60 hover:text-red-600'}"
																>
																	{#if isActive}
																		<span
																			class="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-amber-500"
																		></span>
																	{/if}

																	<Icon
																		size={18}
																		class="shrink-0 transition-colors {isActive
																			? 'text-red-600'
																			: 'text-gray-400 group-hover:text-red-600'}"
																	/>
																	<span class="truncate">{nav.title}</span>
																	<ChevronDown
																		class="ms-auto size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180"
																	/>
																</button>
															{/snippet}
														</Sidebar.MenuButton>
													{/snippet}
												</Collapsible.Trigger>

												<Collapsible.Content>
													<Sidebar.MenuSub>
														{#each nav.children as sub}
															{@const subActive = activeChild === sub.url}
															{@const SubIcon = sub.icon}
															<Sidebar.MenuSubItem>
																<Sidebar.MenuSubButton isActive={subActive}>
																	{#snippet child({ props })}
																		<a
																			href={sub.url}
																			{...props}
																			class="group flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors {subActive
																				? 'bg-red-50 font-semibold text-red-700'
																				: 'text-gray-600 hover:bg-amber-50/60 hover:text-red-600'}"
																		>
																			<SubIcon
																				size={16}
																				class="shrink-0 transition-colors {subActive
																					? 'text-red-600'
																					: 'text-gray-400 group-hover:text-red-600'}"
																			/>
																			<span>{sub.title}</span>
																		</a>
																	{/snippet}
																</Sidebar.MenuSubButton>
															</Sidebar.MenuSubItem>
														{/each}
													</Sidebar.MenuSub>
												</Collapsible.Content>
											</Sidebar.MenuItem>
										{/snippet}
									</Collapsible.Root>
								{:else}
									<!-- Regular nav item -->
									<Sidebar.MenuItem>
										<Sidebar.MenuButton {isActive} tooltipContent={nav.title}>
											{#snippet child({ props })}
												<a
													href={nav.url}
													{...props}
													class="group relative flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition-all duration-150 ease-in-out group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 {isActive
														? 'bg-red-50 font-semibold text-red-700 shadow-xs'
														: 'text-gray-600 hover:bg-amber-50/60 hover:text-red-600'}"
												>
													<!-- Active Accent Indicator -->
													{#if isActive}
														<span
															class="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-amber-500"
														></span>
													{/if}

													<Icon
														size={18}
														class="shrink-0 transition-colors {isActive
															? 'text-red-600'
															: 'text-gray-400 group-hover:text-red-600'}"
													/>
													<span class="truncate group-data-[collapsible=icon]:hidden">
														{nav.title}
													</span>
												</a>
											{/snippet}
										</Sidebar.MenuButton>
									</Sidebar.MenuItem>
								{/if}
							{/each}
						</Sidebar.Menu>
					</Sidebar.GroupContent>
				</Sidebar.Group>
			{/each}
		</Sidebar.Content>

		<!-- Footer / Profile -->
		<Sidebar.Footer
			class="border-t border-gray-100 bg-gradient-to-b from-transparent to-amber-50/30 p-3 group-data-[collapsible=icon]:p-2"
		>
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Sidebar.MenuButton
									{...props}
									size="lg"
									class="w-full rounded-xl p-2 transition-colors group-data-[collapsible=icon]:justify-center hover:bg-red-50/80 data-[state=open]:bg-red-50"
								>
									<div class="flex w-full flex-row items-center gap-2.5 overflow-hidden">
										<Avatar.Root class="h-9 w-9 shrink-0 ring-2 ring-amber-400/40">
											<Avatar.Image src="/company_logo.png" alt="Avatar" />
											<Avatar.Fallback class="bg-red-600 font-bold text-white">
												{user?.name?.charAt(0) ?? 'A'}
											</Avatar.Fallback>
										</Avatar.Root>

										<div
											class="flex min-w-0 flex-1 flex-col items-start text-left group-data-[collapsible=icon]:hidden"
										>
											<p class="truncate text-xs font-semibold text-gray-900">
												{user?.name ?? 'User'}
											</p>
											<p class="truncate text-[0.7rem] text-gray-500">
												{user?.email ?? 'user@putingmanok.com'}
											</p>
										</div>

										<ChevronsUpDown
											class="ml-auto size-4 text-gray-400 group-data-[collapsible=icon]:hidden"
										/>
									</div>
								</Sidebar.MenuButton>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content
							side={isCollapsed ? 'right' : 'top'}
							align="end"
							class="w-56 border-amber-100 shadow-lg"
						>
							<DropdownMenu.Group>
								<DropdownMenu.Item onSelect={handleSignOut}>
									<button
										type="button"
										class="flex w-full flex-row items-center gap-2 text-xs font-medium text-red-600 hover:text-red-700"
									>
										<LogOut class="size-4" />
										<span>Log out</span>
									</button>
								</DropdownMenu.Item>
							</DropdownMenu.Group>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Footer>
	</div>

	<!-- Click/drag edge to toggle -->
	<Sidebar.Rail />
</Sidebar.Root>
