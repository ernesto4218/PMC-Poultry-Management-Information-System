<script lang="ts">
	import { authClient } from '#lib/auth-client.ts';
	import { toast } from 'svelte-sonner';

	// shadcn-svelte components
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';

	// Lucide icons
	import {
		ArrowRight,
		Eye,
		EyeOff,
		Loader2,
		Lock,
		Mail,
		ShieldCheck,
		LifeBuoy
	} from '@lucide/svelte';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let loading = $state(false);

	async function handleLogin(
		event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }
	) {
		event.preventDefault();
		loading = true;

		const { error } = await authClient.signIn.email({
			email,
			password,
			callbackURL: '/login'
		});

		if (error) {
			toast.error(error.message || 'An error occurred during login.');
			loading = false;
			return;
		}

		// Success – callbackURL handles the redirect.
		toast.success('Welcome back!');
	}

	const year = new Date().getFullYear();
	const inputCls =
		'h-12 rounded-lg border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-0';
</script>

<svelte:head>
	<title>Login | Puting Manok Corporation</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-gray-50">
	<!-- HEADER -->
	<header class="relative z-20 border-b border-gray-200 bg-white">
		<div class="h-1 w-full bg-gradient-to-r from-red-700 via-red-600 to-yellow-400"></div>
		<div class="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
			<a href="/" class="flex items-center gap-3">
				<img
					src="/company_logo.png"
					alt="Puting Manok Corporation logo"
					class="h-10 w-10 rounded-full object-cover"
				/>
				<span class="flex flex-col leading-tight">
					<span class="text-sm font-bold text-gray-900 sm:text-base">Puting Manok Corporation</span>
					<span class="hidden text-xs text-gray-500 sm:block"
						>Poultry Management Information System</span
					>
				</span>
			</a>

			<div class="flex items-center gap-4">
				<span
					class="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 ring-inset sm:inline-flex"
				>
					<ShieldCheck class="h-3.5 w-3.5" />
					Secure sign-in
				</span>
				<a
					href="#"
					class="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-red-700"
				>
					<LifeBuoy class="h-4 w-4" />
					<span class="hidden sm:inline">Need help?</span>
					<span class="sm:hidden">Help</span>
				</a>
			</div>
		</div>
	</header>

	<!-- MAIN (full red background) -->
	<main
		class="relative grid flex-1 overflow-hidden bg-gradient-to-br from-red-700 via-red-800 to-red-950 lg:grid-cols-2"
	>
		<!-- Subtle dot pattern across the whole area -->
		<div
			class="pointer-events-none absolute inset-0 opacity-[0.06]"
			style="background-image: radial-gradient(circle, #fff 1px, transparent 1px); background-size: 28px 28px;"
		></div>

		<!-- LEFT: Branding (hidden on small screens) -->
		<div class="relative z-10 hidden flex-col items-center justify-center p-12 text-center lg:flex">
			<img
				src="/company_logo.png"
				alt=""
				class="h-56 w-56 rounded-full object-cover shadow-2xl xl:h-64 xl:w-64"
			/>

			<h1 class="mt-8 text-4xl font-bold tracking-tight text-white xl:text-5xl">
				Puting Manok Corporation
			</h1>
			<p class="mt-4 max-w-sm text-base text-red-100/90">Poultry Management Information System</p>
			<div class="mt-5 h-1 w-16 rounded-full bg-yellow-400"></div>
		</div>

		<!-- RIGHT: Login form -->
		<div class="relative z-10 flex items-center justify-center p-6 sm:p-10">
			<div class="w-full max-w-md">
				<div class="rounded-2xl bg-white p-6 shadow-xl shadow-black/20 sm:p-8">
					<div class="mb-7">
						<h2 class="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
							Welcome back
						</h2>
						<p class="mt-2 text-sm text-gray-500">Sign in to your account to continue</p>
					</div>

					<form onsubmit={handleLogin} class="space-y-5">
						<!-- Email -->
						<div class="space-y-2">
							<Label for="email" class="text-sm font-medium text-gray-700">Email</Label>
							<div class="relative">
								<Mail
									class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
								/>
								<Input
									id="email"
									type="email"
									bind:value={email}
									required
									placeholder="you@example.com"
									class="{inputCls} pr-3 pl-10"
									autocomplete="email"
								/>
							</div>
						</div>

						<!-- Password -->
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<Label for="password" class="text-sm font-medium text-gray-700">Password</Label>
								<a
									href="/forgot-password"
									class="text-xs font-medium text-red-600 transition-colors hover:text-red-700"
								>
									Forgot password?
								</a>
							</div>
							<div class="relative">
								<Lock
									class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
								/>
								<Input
									id="password"
									type={showPassword ? 'text' : 'password'}
									bind:value={password}
									required
									placeholder="••••••••"
									class="{inputCls} px-10"
									autocomplete="current-password"
								/>
								<button
									type="button"
									class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
									onclick={() => (showPassword = !showPassword)}
									tabindex={-1}
									aria-label={showPassword ? 'Hide password' : 'Show password'}
								>
									{#if showPassword}
										<EyeOff class="h-4 w-4" />
									{:else}
										<Eye class="h-4 w-4" />
									{/if}
								</button>
							</div>
						</div>

						<!-- Submit -->
						<Button
							type="submit"
							disabled={loading}
							class="h-12 w-full rounded-lg bg-red-700 text-sm font-semibold text-white shadow-lg shadow-red-900/20 transition-all hover:bg-red-600 hover:shadow-xl active:scale-[0.98] disabled:opacity-70"
						>
							{#if loading}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Signing in...
							{:else}
								Sign in
								<ArrowRight class="ml-2 h-4 w-4" />
							{/if}
						</Button>
					</form>
				</div>

				<p class="mt-6 text-center text-sm text-red-100/80">
					Don't have an account? Contact the
					<a href="#" class="font-semibold text-white underline-offset-2 hover:underline">
						System Administrator.
					</a>
				</p>
			</div>
		</div>
	</main>

	<!-- FOOTER -->
	<footer class="border-t border-gray-200 bg-white">
		<div
			class="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-gray-500 sm:flex-row sm:px-6"
		>
			<p>&copy; {year} Puting Manok Corporation. All rights reserved.</p>
			<nav class="flex items-center gap-4" aria-label="Footer">
				<a href="#" class="transition-colors hover:text-red-700">Privacy Policy</a>
				<a href="#" class="transition-colors hover:text-red-700">Terms of Use</a>
				<a href="#" class="transition-colors hover:text-red-700">Support</a>
			</nav>
		</div>
	</footer>
</div>
