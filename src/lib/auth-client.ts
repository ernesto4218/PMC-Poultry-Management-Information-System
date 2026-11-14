// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
	// baseURL can be omitted if client and server are same domain
});
