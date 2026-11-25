<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Avatar from '#lib/components/ui/avatar/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';

	import {
		User,
		Mail,
		ShieldCheck,
		ShieldAlert,
		KeyRound,
		Monitor,
		Smartphone,
		LogOut,
		Trash2,
		Loader2,
		CheckCircle2,
		AlertCircle,
		Calendar,
		Link2,
		Upload,
		Crown,
		Laptop,
		TriangleAlert
	} from '@lucide/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let name = $state(data.user.name);
	let loading = $state<string | null>(null);

	// avatar upload
	const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
	let avatarForm = $state<HTMLFormElement>();
	let fileInput = $state<HTMLInputElement>();
	let avatarError = $state('');

	function onPickAvatar(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		avatarError = '';
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			avatarError = 'Please choose an image file.';
			input.value = '';
			return;
		}
		if (file.size > MAX_AVATAR_BYTES) {
			avatarError = 'Image must be 2 MB or smaller.';
			input.value = '';
			return;
		}
		avatarForm?.requestSubmit(); // upload immediately after picking
	}
	let active = $state<'profile' | 'security' | 'sessions' | 'danger'>('profile');

	const nav = [
		{ id: 'profile', label: 'Profile', icon: User, group: 'Account' },
		{ id: 'security', label: 'Security', icon: KeyRound, group: 'Account' },
		{ id: 'sessions', label: 'Sessions', icon: Laptop, group: 'Account' },
		{ id: 'danger', label: 'Danger zone', icon: TriangleAlert, group: 'Advanced' }
	] as const;

	const titles: Record<typeof active, { title: string; desc: string }> = {
		profile: {
			title: 'Profile',
			desc: 'Manage your personal details and how you appear in the app.'
		},
		security: { title: 'Security', desc: 'Keep your account safe with a strong password.' },
		sessions: {
			title: 'Sessions',
			desc: 'Review and control the devices signed in to your account.'
		},
		danger: { title: 'Danger zone', desc: 'Irreversible actions. Proceed with care.' }
	};

	const initials = $derived(
		data.user.name
			.split(' ')
			.filter(Boolean)
			.slice(0, 2)
			.map((p) => p[0]?.toUpperCase())
			.join('') || 'U'
	);

	function fmt(date: string, withTime = false) {
		return new Date(date).toLocaleString(undefined, {
			dateStyle: 'medium',
			...(withTime ? { timeStyle: 'short' } : {})
		});
	}

	function parseUA(ua: string | null) {
		if (!ua) return { label: 'Unknown device', mobile: false };
		const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
		const browser = /Edg\//.test(ua)
			? 'Edge'
			: /OPR\//.test(ua)
				? 'Opera'
				: /Chrome\//.test(ua)
					? 'Chrome'
					: /Firefox\//.test(ua)
						? 'Firefox'
						: /Safari\//.test(ua)
							? 'Safari'
							: 'Browser';
		const os = /Windows/.test(ua)
			? 'Windows'
			: /Android/.test(ua)
				? 'Android'
				: /iPhone|iPad|iOS/.test(ua)
					? 'iOS'
					: /Mac OS X/.test(ua)
						? 'macOS'
						: /Linux/.test(ua)
							? 'Linux'
							: 'Unknown OS';
		return { label: `${browser} on ${os}`, mobile };
	}

	function providerLabel(id: string) {
		return id === 'credential' ? 'Email & password' : id.charAt(0).toUpperCase() + id.slice(1);
	}

	// Tracks which action is loading and refreshes data afterwards.
	function run(actionName: string, opts: { reset?: boolean } = {}) {
		return () => {
			loading = actionName;
			return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
				await update({ reset: opts.reset ?? false });
				await invalidateAll();
				loading = null;
			};
		};
	}

	const msg = (action: string) => (form?.action === action ? form : null);
	const otherSessions = $derived(data.sessions.filter((s) => s.token !== data.currentSessionToken));
	const groups = $derived([...new Set(nav.map((n) => n.group))]);
</script>

{#snippet feedback(action: string)}
	{@const f = msg(action)}
	{#if f?.message}
		<div
			class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm
			{f.success
				? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
				: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'}"
			role="status"
		>
			{#if f.success}<CheckCircle2 class="size-4 shrink-0" />{:else}<AlertCircle
					class="size-4 shrink-0"
				/>{/if}
			{f.message}
		</div>
	{/if}
{/snippet}

<div class="theme relative min-h-screen bg-muted/30">
	<!-- soft brand glow -->
	<div
		class="pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-red-500/10 via-orange-400/5 to-transparent"
	></div>

	<div class="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[260px_1fr]">
		<!-- SIDEBAR -->
		<aside class="lg:sticky lg:top-8 lg:self-start">
			<div class="rounded-2xl border border-gray-100/80 bg-white p-3 text-gray-800 shadow-sm">
				<!-- user mini card -->
				<div class="flex items-center gap-3 rounded-xl p-2">
					<Avatar.Root class="size-10 shrink-0 ring-2 ring-amber-400/40">
						{#if data.user.image}<Avatar.Image src={data.user.image} alt={data.user.name} />{/if}
						<Avatar.Fallback class="bg-red-600 text-sm font-bold text-white">
							{initials}
						</Avatar.Fallback>
					</Avatar.Root>
					<div class="min-w-0">
						<p class="truncate text-xs font-semibold text-gray-900">{data.user.name}</p>
						<p class="truncate text-[0.7rem] text-gray-500">{data.user.email}</p>
					</div>
				</div>

				<Separator class="my-3 bg-gray-100" />

				<nav class="flex gap-1.5 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible">
					{#each groups as g (g)}
						<p
							class="mt-3 mb-1 hidden px-3 text-[0.65rem] font-bold tracking-widest text-amber-900/60 uppercase first:mt-0 lg:block"
						>
							{g}
						</p>
						{#each nav.filter((n) => n.group === g) as item (item.id)}
							{@const isActive = active === item.id}
							{@const isDanger = item.id === 'danger'}
							<button
								type="button"
								onclick={() => (active = item.id)}
								aria-current={isActive ? 'page' : undefined}
								class="group relative flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-xs transition-all duration-150 ease-in-out
								{isActive
									? isDanger
										? 'bg-red-50 font-semibold text-red-700 shadow-xs'
										: 'bg-red-50 font-semibold text-red-700 shadow-xs'
									: 'text-gray-600 hover:bg-amber-50/60 hover:text-red-600'}"
							>
								{#if isActive}
									<span
										class="absolute top-1/2 left-0 hidden h-5 w-1 -translate-y-1/2 rounded-r-full bg-amber-500 lg:block"
									></span>
								{/if}
								<item.icon
									size={18}
									class="shrink-0 transition-colors {isActive
										? 'text-red-600'
										: 'text-gray-400 group-hover:text-red-600'}"
								/>
								<span class="truncate">{item.label}</span>
							</button>
						{/each}
					{/each}
				</nav>

				<Separator class="my-3 hidden bg-gray-100 lg:block" />

				<form method="POST" action="?/signOut" class="hidden lg:block">
					<button
						type="submit"
						class="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-red-600 transition-all duration-150 ease-in-out hover:bg-red-50/80 hover:text-red-700"
					>
						<LogOut
							size={18}
							class="shrink-0 text-red-600 transition-colors group-hover:text-red-700"
						/>
						<span>Sign out</span>
					</button>
				</form>
			</div>
		</aside>

		<!-- MAIN -->
		<main class="min-w-0 space-y-6">
			<!-- page header -->
			<div class="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 class="text-2xl font-semibold tracking-tight">{titles[active].title}</h1>
					<p class="text-sm text-muted-foreground">{titles[active].desc}</p>
				</div>
				<form method="POST" action="?/signOut" class="lg:hidden">
					<Button type="submit" variant="outline" size="sm">
						<LogOut class="mr-2 size-4" /> Sign out
					</Button>
				</form>
			</div>

			{#if !data.user.emailVerified}
				<div
					class="flex flex-col gap-3 rounded-xl border border-yellow-500/40 bg-yellow-400/10 p-4 sm:flex-row sm:items-center sm:justify-between"
				>
					<div class="flex items-start gap-3 text-sm">
						<div class="rounded-lg bg-yellow-400/25 p-1.5 text-yellow-700 dark:text-yellow-400">
							<ShieldAlert class="size-4" />
						</div>
						<div>
							<p class="font-medium text-yellow-900 dark:text-yellow-300">Verify your email</p>
							<p class="text-yellow-800/80 dark:text-yellow-400/80">
								Confirm {data.user.email} to secure your account.
							</p>
						</div>
					</div>
					<form method="POST" action="?/resendVerification" use:enhance={run('resendVerification')}>
						<Button
							type="submit"
							size="sm"
							variant="outline"
							class="border-yellow-500/50 bg-transparent hover:bg-yellow-400/20"
							disabled={loading === 'resendVerification'}
						>
							{#if loading === 'resendVerification'}<Loader2
									class="mr-2 size-4 animate-spin"
								/>{/if}
							Resend email
						</Button>
					</form>
				</div>
				{@render feedback('resendVerification')}
			{/if}

			<!-- ============ PROFILE ============ -->
			{#if active === 'profile'}
				<!-- hero card -->
				<Card.Root class="gap-0 overflow-hidden py-0">
					<div
						class="h-28 bg-linear-to-r from-red-600 via-orange-500 to-yellow-400"
						style="background-image: radial-gradient(circle at 20% 120%, rgb(255 255 255 / 0.25), transparent 50%), linear-gradient(to right, var(--tw-gradient-stops));"
					></div>
					<div class="px-6 pb-6">
						<div class="-mt-10 flex flex-wrap items-end justify-between gap-4">
							<Avatar.Root class="size-20 ring-4 ring-card">
								{#if data.user.image}<Avatar.Image
										src={data.user.image}
										alt={data.user.name}
									/>{/if}
								<Avatar.Fallback
									class="bg-linear-to-br from-red-600 to-orange-500 text-xl font-semibold text-white"
								>
									{initials}
								</Avatar.Fallback>
							</Avatar.Root>
							<Badge class="mb-1 gap-1.5"><Crown class="size-3" />{data.user.role}</Badge>
						</div>
						<div class="mt-3">
							<h2 class="text-xl font-semibold">{data.user.name}</h2>
							<p class="flex items-center gap-1.5 text-sm text-muted-foreground">
								<Mail class="size-3.5" />
								{data.user.email}
							</p>
						</div>
					</div>
				</Card.Root>

				<!-- stat tiles -->
				<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
					<div class="rounded-xl border bg-card p-4 shadow-sm">
						<div class="mb-3 inline-flex rounded-lg bg-red-500/10 p-2 text-red-600">
							<Crown class="size-4" />
						</div>
						<p class="text-xs text-muted-foreground">Role</p>
						<p class="font-semibold">{data.user.role}</p>
					</div>
					<div class="rounded-xl border bg-card p-4 shadow-sm">
						<div
							class="mb-3 inline-flex rounded-lg p-2 {data.user.emailVerified
								? 'bg-emerald-500/10 text-emerald-600'
								: 'bg-yellow-400/20 text-yellow-600'}"
						>
							{#if data.user.emailVerified}<ShieldCheck class="size-4" />{:else}<ShieldAlert
									class="size-4"
								/>{/if}
						</div>
						<p class="text-xs text-muted-foreground">Email status</p>
						<p class="font-semibold">{data.user.emailVerified ? 'Verified' : 'Unverified'}</p>
					</div>
					<div class="rounded-xl border bg-card p-4 shadow-sm">
						<div class="mb-3 inline-flex rounded-lg bg-orange-500/10 p-2 text-orange-600">
							<Calendar class="size-4" />
						</div>
						<p class="text-xs text-muted-foreground">Member since</p>
						<p class="font-semibold">{fmt(data.user.createdAt)}</p>
					</div>
					<div class="rounded-xl border bg-card p-4 shadow-sm">
						<div class="mb-3 inline-flex rounded-lg bg-yellow-400/20 p-2 text-yellow-600">
							<Monitor class="size-4" />
						</div>
						<p class="text-xs text-muted-foreground">Active sessions</p>
						<p class="font-semibold">{data.sessions.length}</p>
					</div>
				</div>

				<!-- profile photo -->
				<Card.Root class="gap-0 overflow-hidden py-0">
					<Card.Header class="border-b bg-muted/30 py-5">
						<Card.Title>Profile photo</Card.Title>
						<Card.Description>Shown on your profile and across the app.</Card.Description>
					</Card.Header>
					<Card.Content class="py-6">
						<div class="flex flex-wrap items-center gap-5">
							<Avatar.Root class="size-20 ring-2 ring-orange-400/60">
								{#if data.user.image}<Avatar.Image
										src={data.user.image}
										alt={data.user.name}
									/>{/if}
								<Avatar.Fallback
									class="bg-linear-to-br from-red-600 to-orange-500 text-xl font-semibold text-white"
								>
									{initials}
								</Avatar.Fallback>
							</Avatar.Root>

							<div class="space-y-2.5">
								<div class="flex flex-wrap items-center gap-2">
									<form
										bind:this={avatarForm}
										method="POST"
										action="?/uploadAvatar"
										enctype="multipart/form-data"
										use:enhance={run('uploadAvatar', { reset: true })}
									>
										<input
											bind:this={fileInput}
											type="file"
											name="avatar"
											accept="image/png,image/jpeg,image/webp,image/gif"
											class="sr-only"
											tabindex="-1"
											onchange={onPickAvatar}
										/>
										<Button
											type="button"
											onclick={() => fileInput?.click()}
											disabled={loading === 'uploadAvatar'}
										>
											{#if loading === 'uploadAvatar'}<Loader2
													class="mr-2 size-4 animate-spin"
												/>{:else}<Upload class="mr-2 size-4" />{/if}
											Upload photo
										</Button>
									</form>

									{#if data.user.image}
										<form method="POST" action="?/removeAvatar" use:enhance={run('removeAvatar')}>
											<Button
												type="submit"
												variant="ghost"
												class="text-red-600 hover:bg-red-500/10 hover:text-red-700"
												disabled={loading === 'removeAvatar'}
											>
												{#if loading === 'removeAvatar'}<Loader2
														class="mr-2 size-4 animate-spin"
													/>{/if}
												Remove
											</Button>
										</form>
									{/if}
								</div>
								<p class="text-xs text-muted-foreground">PNG, JPG, WebP or GIF. Max 2 MB.</p>
							</div>
						</div>

						{#if avatarError || msg('uploadAvatar') || msg('removeAvatar')}
							<div class="mt-4 space-y-2">
								{#if avatarError}
									<div
										class="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400"
										role="status"
									>
										<AlertCircle class="size-4 shrink-0" />
										{avatarError}
									</div>
								{/if}
								{@render feedback('uploadAvatar')}
								{@render feedback('removeAvatar')}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- personal info -->
				<Card.Root class="gap-0 overflow-hidden py-0">
					<form method="POST" action="?/updateProfile" use:enhance={run('updateProfile')}>
						<Card.Header class="border-b bg-muted/30 py-5">
							<Card.Title>Personal information</Card.Title>
							<Card.Description>This is shown across the app.</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-5 py-6">
							<div class="grid gap-5 sm:grid-cols-2">
								<div class="space-y-2">
									<Label for="name">Full name</Label>
									<Input
										id="name"
										name="name"
										bind:value={name}
										required
										minlength={2}
										maxlength={255}
									/>
								</div>
								<div class="space-y-2">
									<Label>Role</Label>
									<Input value={data.user.role} disabled />
								</div>
							</div>
							{@render feedback('updateProfile')}
						</Card.Content>
						<Card.Footer class="flex items-center justify-between gap-3 border-t bg-muted/30 py-4">
							<p class="text-xs text-muted-foreground">
								Last updated {fmt(data.user.updatedAt, true)}
							</p>
							<Button type="submit" disabled={loading === 'updateProfile'}>
								{#if loading === 'updateProfile'}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
								Save changes
							</Button>
						</Card.Footer>
					</form>
				</Card.Root>

				<!-- email -->
				<Card.Root class="gap-0 overflow-hidden py-0">
					<form
						method="POST"
						action="?/changeEmail"
						use:enhance={run('changeEmail', { reset: true })}
					>
						<Card.Header class="border-b bg-muted/30 py-5">
							<Card.Title>Email address</Card.Title>
							<Card.Description>
								Current: <span class="font-medium text-foreground">{data.user.email}</span>
							</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-2 py-6">
							<Label for="newEmail">New email</Label>
							<Input
								id="newEmail"
								name="newEmail"
								type="email"
								placeholder="you@example.com"
								required
							/>
							{#if msg('changeEmail')}<div class="pt-2">{@render feedback('changeEmail')}</div>{/if}
						</Card.Content>
						<Card.Footer class="flex items-center justify-between gap-3 border-t bg-muted/30 py-4">
							<p class="text-xs text-muted-foreground">We'll email you to confirm the change.</p>
							<Button type="submit" variant="outline" disabled={loading === 'changeEmail'}>
								{#if loading === 'changeEmail'}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
								Change email
							</Button>
						</Card.Footer>
					</form>
				</Card.Root>

				<!-- sign-in methods -->
				<Card.Root class="gap-0 overflow-hidden py-0">
					<Card.Header class="border-b bg-muted/30 py-5">
						<Card.Title>Sign-in methods</Card.Title>
						<Card.Description>Ways you can access your account.</Card.Description>
					</Card.Header>
					<Card.Content class="divide-y p-0">
						{#each data.accounts as acc (acc.id)}
							<div class="flex items-center gap-3 px-6 py-4">
								<div class="rounded-lg bg-orange-500/10 p-2 text-orange-600">
									<Link2 class="size-4" />
								</div>
								<div class="flex-1">
									<p class="text-sm font-medium">{providerLabel(acc.providerId)}</p>
									<p class="text-xs text-muted-foreground">Added {fmt(acc.createdAt)}</p>
								</div>
								<Badge variant="secondary">Connected</Badge>
							</div>
						{/each}
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- ============ SECURITY ============ -->
			{#if active === 'security'}
				<Card.Root class="gap-0 overflow-hidden py-0">
					<form
						method="POST"
						action="?/changePassword"
						use:enhance={run('changePassword', { reset: true })}
					>
						<Card.Header class="border-b bg-muted/30 py-5">
							<Card.Title>Change password</Card.Title>
							<Card.Description>Use at least 8 characters.</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-5 py-6">
							<div class="space-y-2">
								<Label for="currentPassword">Current password</Label>
								<Input
									id="currentPassword"
									name="currentPassword"
									type="password"
									autocomplete="current-password"
									required
								/>
							</div>
							<div class="grid gap-5 sm:grid-cols-2">
								<div class="space-y-2">
									<Label for="newPassword">New password</Label>
									<Input
										id="newPassword"
										name="newPassword"
										type="password"
										autocomplete="new-password"
										minlength={8}
										required
									/>
								</div>
								<div class="space-y-2">
									<Label for="confirmPassword">Confirm new password</Label>
									<Input
										id="confirmPassword"
										name="confirmPassword"
										type="password"
										autocomplete="new-password"
										minlength={8}
										required
									/>
								</div>
							</div>
							<label class="flex items-center gap-2.5 rounded-lg border bg-muted/30 p-3 text-sm">
								<input
									type="checkbox"
									name="revokeOtherSessions"
									checked
									class="size-4 accent-primary"
								/>
								Sign out of all other devices after changing
							</label>
							{@render feedback('changePassword')}
						</Card.Content>
						<Card.Footer class="flex justify-end border-t bg-muted/30 py-4">
							<Button type="submit" disabled={loading === 'changePassword'}>
								{#if loading === 'changePassword'}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
								Update password
							</Button>
						</Card.Footer>
					</form>
				</Card.Root>
			{/if}

			<!-- ============ SESSIONS ============ -->
			{#if active === 'sessions'}
				<Card.Root class="gap-0 overflow-hidden py-0">
					<Card.Header
						class="flex flex-row items-center justify-between gap-4 border-b bg-muted/30 py-5"
					>
						<div class="space-y-1.5">
							<Card.Title>Active sessions</Card.Title>
							<Card.Description>Devices currently signed in to your account.</Card.Description>
						</div>
						{#if otherSessions.length > 0}
							<form
								method="POST"
								action="?/revokeOtherSessions"
								use:enhance={run('revokeOtherSessions')}
							>
								<Button
									type="submit"
									variant="outline"
									size="sm"
									disabled={loading === 'revokeOtherSessions'}
								>
									{#if loading === 'revokeOtherSessions'}<Loader2
											class="mr-2 size-4 animate-spin"
										/>{/if}
									Sign out others
								</Button>
							</form>
						{/if}
					</Card.Header>
					<Card.Content class="divide-y p-0">
						{#each data.sessions as s (s.id)}
							{@const ua = parseUA(s.userAgent)}
							{@const isCurrent = s.token === data.currentSessionToken}
							<div class="flex items-center gap-4 px-6 py-4">
								<div
									class="rounded-lg p-2.5 {isCurrent
										? 'bg-linear-to-br from-red-600 to-orange-500 text-white'
										: 'bg-muted text-muted-foreground'}"
								>
									{#if ua.mobile}<Smartphone class="size-5" />{:else}<Monitor class="size-5" />{/if}
								</div>
								<div class="min-w-0 flex-1">
									<p class="flex flex-wrap items-center gap-2 text-sm font-medium">
										{ua.label}
										{#if isCurrent}
											<Badge class="gap-1">
												<span class="size-1.5 rounded-full bg-yellow-300"></span> This device
											</Badge>
										{/if}
									</p>
									<p class="truncate text-xs text-muted-foreground">
										{s.ipAddress ?? 'Unknown IP'} · Signed in {fmt(s.createdAt, true)}
									</p>
								</div>
								{#if !isCurrent}
									<form method="POST" action="?/revokeSession" use:enhance={run('revokeSession')}>
										<input type="hidden" name="token" value={s.token} />
										<Button
											type="submit"
											variant="ghost"
											size="sm"
											class="text-red-600 hover:bg-red-500/10 hover:text-red-700"
										>
											Revoke
										</Button>
									</form>
								{/if}
							</div>
						{/each}
					</Card.Content>
					{#if msg('revokeSession') || msg('revokeOtherSessions')}
						<div class="space-y-2 border-t px-6 py-4">
							{@render feedback('revokeSession')}
							{@render feedback('revokeOtherSessions')}
						</div>
					{/if}
				</Card.Root>
			{/if}

			<!-- ============ DANGER ============ -->
			{#if active === 'danger'}
				<Card.Root class="gap-0 overflow-hidden border-red-500/40 py-0">
					<form method="POST" action="?/deleteAccount" use:enhance={run('deleteAccount')}>
						<Card.Header class="border-b border-red-500/20 bg-red-500/5 py-5">
							<Card.Title class="flex items-center gap-2 text-red-700 dark:text-red-400">
								<Trash2 class="size-5" /> Delete account
							</Card.Title>
							<Card.Description>
								Permanently deletes your account, sessions and linked data. This can't be undone.
							</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-5 py-6">
							<div class="space-y-2">
								<Label for="delPassword">Password</Label>
								<Input
									id="delPassword"
									name="password"
									type="password"
									autocomplete="current-password"
									required
								/>
							</div>
							<div class="space-y-2">
								<Label for="confirm"
									>Type <span
										class="rounded bg-red-500/10 px-1.5 py-0.5 font-mono font-semibold text-red-700 dark:text-red-400"
										>DELETE</span
									> to confirm</Label
								>
								<Input id="confirm" name="confirm" autocomplete="off" required />
							</div>
							{@render feedback('deleteAccount')}
						</Card.Content>
						<Card.Footer
							class="flex items-center justify-between gap-3 border-t border-red-500/20 bg-red-500/5 py-4"
						>
							<p class="text-xs text-muted-foreground">This action is permanent.</p>
							<Button
								type="submit"
								class="bg-red-600 text-white hover:bg-red-700"
								disabled={loading === 'deleteAccount'}
							>
								{#if loading === 'deleteAccount'}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
								Delete my account
							</Button>
						</Card.Footer>
					</form>
				</Card.Root>
			{/if}
		</main>
	</div>
</div>

<style>
	/* Re-skins shadcn tokens (buttons, inputs, badges, focus rings) for this page only. */
	.theme {
		--primary: oklch(0.577 0.245 27.325); /* red-600 */
		--primary-foreground: oklch(0.985 0 0);
		--ring: oklch(0.705 0.213 47.604); /* orange-500 */
		--accent: oklch(0.97 0.03 70);
		--accent-foreground: oklch(0.4 0.12 30);
	}
	:global(.dark) .theme {
		--primary: oklch(0.637 0.237 25.331); /* red-500 */
		--primary-foreground: oklch(0.985 0 0);
		--ring: oklch(0.75 0.183 55.934); /* orange-400 */
		--accent: oklch(0.27 0.05 40);
		--accent-foreground: oklch(0.95 0.05 80);
	}
</style>
