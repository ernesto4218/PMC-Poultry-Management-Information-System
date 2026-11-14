<!-- src/routes/(auth)/register/+page.svelte -->
<script lang="ts">
	import { authClient } from '#lib/auth-client.ts';
	import { goto } from '$app/navigation';

	let name = '';
	let email = '';
	let password = '';
	let confirmPassword = '';
	let errorMessage = '';
	let loading = false;

	async function handleRegister() {
		loading = true;
		errorMessage = '';

		// Basic client-side validation
		if (password !== confirmPassword) {
			errorMessage = 'Passwords do not match.';
			loading = false;
			return;
		}

		if (password.length < 8) {
			errorMessage = 'Password must be at least 8 characters long.';
			loading = false;
			return;
		}

		const { data, error } = await authClient.signUp.email({
			email,
			password,
			name,
			// callbackURL is crucial; Better Auth will redirect here automatically on success
			callbackURL: '/dashboard'
		});

		if (error) {
			errorMessage = error.message || 'An error occurred during registration.';
			loading = false;
		}
		// If data exists, the redirect happens automatically via callbackURL
	}
</script>

<svelte:head>
	<title>Register | My App</title>
</svelte:head>

<main class="register-container">
	<form on:submit|preventDefault={handleRegister} class="register-form">
		<h1>Create Account</h1>

		{#if errorMessage}
			<p class="error">{errorMessage}</p>
		{/if}

		<div class="input-group">
			<label for="name">Full Name</label>
			<input type="text" id="name" bind:value={name} required placeholder="Jane Doe" />
		</div>

		<div class="input-group">
			<label for="email">Email</label>
			<input type="email" id="email" bind:value={email} required placeholder="you@example.com" />
		</div>

		<div class="input-group">
			<label for="password">Password</label>
			<input type="password" id="password" bind:value={password} required placeholder="••••••••" />
		</div>

		<div class="input-group">
			<label for="confirmPassword">Confirm Password</label>
			<input
				type="password"
				id="confirmPassword"
				bind:value={confirmPassword}
				required
				placeholder="••••••••"
			/>
		</div>

		<button type="submit" disabled={loading}>
			{#if loading}
				Registering...
			{:else}
				Register
			{/if}
		</button>

		<p class="login-link">
			Already have an account? <a href="/login">Login</a>
		</p>
	</form>
</main>

<style>
	:global(body) {
		background-color: #f4f4f9;
		margin: 0;
		font-family: sans-serif;
	}
	.register-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
	}
	.register-form {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		width: 100%;
		max-width: 400px;
	}
	h1 {
		text-align: center;
		margin-bottom: 1.5rem;
		color: #333;
	}
	.error {
		background-color: #ffebee;
		color: #c62828;
		padding: 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		border: 1px solid #ef9a9a;
	}
	.input-group {
		margin-bottom: 1rem;
	}
	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: bold;
		color: #555;
	}
	input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		box-sizing: border-box;
	}
	button {
		width: 100%;
		padding: 0.75rem;
		background-color: #28a745; /* Success Green for Register */
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	button:hover:not(:disabled) {
		background-color: #218838;
	}
	button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
	.login-link {
		text-align: center;
		margin-top: 1rem;
		font-size: 0.9rem;
	}
</style>
