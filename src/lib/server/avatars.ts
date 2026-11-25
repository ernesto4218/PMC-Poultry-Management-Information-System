// Place at: src/lib/server/avatars.ts
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

/** Where uploaded avatars are stored on disk. Keep this OUTSIDE build/static output. */
export const AVATAR_DIR = path.resolve(process.env.AVATAR_DIR ?? 'uploads/avatars');

/** Public URL prefix served by src/routes/avatars/[file]/+server.ts */
export const AVATAR_URL_PREFIX = '/avatars/';

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

export type AvatarExt = 'png' | 'jpg' | 'webp' | 'gif';

export const AVATAR_MIME: Record<AvatarExt, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	webp: 'image/webp',
	gif: 'image/gif'
};

export const AVATAR_FILE_RE = /^[A-Za-z0-9_-]+\.(png|jpg|webp|gif)$/;

export class InvalidImageError extends Error {}

/** Detect the real image type from magic bytes (never trust the client MIME type or file name). */
export function detectImageType(b: Uint8Array): AvatarExt | null {
	if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
		return 'png';
	if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
	if (b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38)
		return 'gif';
	if (
		b.length >= 12 &&
		b[0] === 0x52 &&
		b[1] === 0x49 &&
		b[2] === 0x46 &&
		b[3] === 0x46 && // RIFF
		b[8] === 0x57 &&
		b[9] === 0x45 &&
		b[10] === 0x42 &&
		b[11] === 0x50 // WEBP
	)
		return 'webp';
	return null;
}

/** Validates and stores the file. Returns the public URL to save in `user.image`. */
export async function saveAvatar(userId: string, file: File): Promise<string> {
	if (file.size > MAX_AVATAR_BYTES) throw new InvalidImageError('Image must be 2 MB or smaller.');

	const bytes = new Uint8Array(await file.arrayBuffer());
	const ext = detectImageType(bytes);
	if (!ext) throw new InvalidImageError('Unsupported image. Use PNG, JPG, WebP or GIF.');

	const safeId = userId.replace(/[^A-Za-z0-9_-]/g, '');
	// Unique name per upload = safe to cache forever + no stale avatars after changing photo.
	const filename = `${safeId}-${Date.now()}.${ext}`;

	await mkdir(AVATAR_DIR, { recursive: true });
	await writeFile(path.join(AVATAR_DIR, filename), bytes);
	return AVATAR_URL_PREFIX + filename;
}

/** Deletes a previously uploaded avatar. Ignores external URLs and missing files. */
export async function deleteAvatarByUrl(url: string | null | undefined) {
	if (!url || !url.startsWith(AVATAR_URL_PREFIX)) return;
	const filename = path.basename(url.slice(AVATAR_URL_PREFIX.length));
	if (!AVATAR_FILE_RE.test(filename)) return;
	try {
		await unlink(path.join(AVATAR_DIR, filename));
	} catch {
		/* already gone */
	}
}
