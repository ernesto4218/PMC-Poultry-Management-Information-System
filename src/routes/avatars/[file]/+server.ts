// Place at: src/routes/avatars/[file]/+server.ts
import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { AVATAR_DIR, AVATAR_FILE_RE, AVATAR_MIME, type AvatarExt } from '#lib/server/avatars.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const file = params.file;
	if (!AVATAR_FILE_RE.test(file)) throw error(404, 'Not found');

	try {
		const buf = await readFile(path.join(AVATAR_DIR, file));
		const ext = file.split('.').pop() as AvatarExt;
		return new Response(new Uint8Array(buf), {
			headers: {
				'Content-Type': AVATAR_MIME[ext],
				// filenames are unique per upload, so they can be cached forever
				'Cache-Control': 'public, max-age=31536000, immutable',
				'X-Content-Type-Options': 'nosniff'
			}
		});
	} catch {
		throw error(404, 'Not found');
	}
};
