const LOCAL_ARENA_HOST = 'localhost:8787';
const LIVE_ARENA_HOST = 'arena.briine.com';

function normalizeArenaHost(host: string): string {
    return host
        .trim()
        .replace(/^https?:\/\//i, '')
        .replace(/^wss?:\/\//i, '')
        .replace(/\/+$/, '');
}

export function resolveArenaHost(env: NodeJS.ProcessEnv = process.env): string {
    const explicitHost = env.API_HOST?.trim();
    if (explicitHost) {
        return normalizeArenaHost(explicitHost);
    }

    const mode = (env.BRIINE_ENV ?? 'live').trim().toLowerCase();
    if (mode === 'local') {
        return LOCAL_ARENA_HOST;
    }

    return LIVE_ARENA_HOST;
}
