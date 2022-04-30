import type { Plugin } from '@saltyaom/gql'

const isServer = typeof window === 'undefined'

const prefix = '_gqc_'
const dateTag = 'd'

const getItem = (k: string) => localStorage.getItem(k)
const setItem = (k: string, v: string) => localStorage.setItem(k, v)
const removeItem = (k: string) => localStorage.removeItem(k)

let invalidatingCache = false

// Making run behind after scope end by marking it as async
export const invalidateCaches = async () => {
	if (isServer || invalidateCaches) return

	invalidatingCache = true

	Object.entries(localStorage).forEach(([k, v]) => {
		const expires = +v
		if (!k.startsWith('_gqc_') || !k.endsWith('d') || Number.isNaN(expires))
			return

		if (Date.now() > expires) {
			removeItem(k)
			removeItem(k.slice(0, -1))
		}
	})

	invalidatingCache = false
}

interface GqlLocalCacheConfig {
	/**
	 * Time to Live
	 * @default 86400 (1 day)
	 *
	 * How long should the cache live in seconds.
	 */
	ttl?: number
}

// https://stackoverflow.com/a/52171480
const tsh = (s: string) => {
	for (var i = 0, h = 9; i < s.length; )
		h = Math.imul(h ^ s.charCodeAt(i++), 9 ** 9)

	return '_gqc_' + (h ^ (h >>> 9))
}

const { stringify: str } = JSON

type Resolver = (v: Object | null) => void
type Pending = [Promise<Object | null>, Resolver]

const pendings: Record<string, Pending> = {}

const createPending = (key: number) => {
	let resolver: Resolver = () => {}
	const pending = new Promise<Object | null>((resolve) => {
		resolver = resolve
	})

	pendings[key] = [pending, resolver]
}

/**
 * gql local cache plugins
 *
 * @example
 * ```typescript
 * import LocalCache from '@saltyaom/gql-local-cache'
 *
 * client.config('/graphql', {
 *   plugins: [LocalCache()]
 * })
 * ```
 */
const gqlLocalCache = ({ ttl = 86400 }: GqlLocalCacheConfig = {}): Plugin => ({
	middlewares: [
		async ({ hash, variables, query }) => {
			if (isServer) return

			let expiresKey = hash + dateTag
			let expires = getItem(expiresKey) || 0

			let pending = pendings[hash]
			if (pending) {
				const cache = await pending[0]
				if (cache) return cache
			}

			if (Date.now() > +expires) {
				createPending(hash)

				removeItem(prefix + hash)
				removeItem(expiresKey)

				invalidateCaches()

				return
			}

			let persisted = getItem(prefix + hash)
			invalidateCaches()

			if (persisted) return JSON.parse(persisted)

			createPending(hash)
		}
	],
	afterwares: [
		({ data, hash, variables, query, fromCache }) => {
			if (isServer) return

			let expiresKey = hash + dateTag

			let pending = pendings[hash]
			if (pending) {
				delete pendings[hash]
				pending[1](data)
			}

			if (!data || fromCache) return

			setItem(expiresKey, Date.now() + ttl * 1000 + '')
			setItem(prefix + hash, str(data))
		}
	]
})

export default gqlLocalCache
