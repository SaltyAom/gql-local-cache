import type { Plugin } from '@saltyaom/gql'

const isServer = typeof window === 'undefined'

const plugin = '_gqc_'
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

	return plugin + (h ^ (h >>> 9))
}

const { stringify: str } = JSON

type Resolver = (v: Object | PromiseLike<Object>) => void
type Pending = [Promise<Object>, Resolver]

const pendings: Record<string, Pending> = {}

const createPending = (): Pending => {
	let resolver: Resolver = () => {}
	const pending = new Promise<Object>((resolve) => {
		resolver = resolve
	})

	return [pending, resolver]
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
		async ({ operationName, variables, query }) => {
			if (isServer) return null

			let key = tsh(plugin + operationName + str(variables) + query)
			let expiresKey = key + dateTag
			let expires = getItem(expiresKey) || 0

			let pending = pendings[key]
			if (pending) return await pending[0]

			if (Date.now() > +expires) {
				pendings[key] = createPending()

				removeItem(key)
				removeItem(expiresKey)

				invalidateCaches()

				return null
			}

			let persisted = getItem(key)
			invalidateCaches()

			if (persisted) return JSON.parse(persisted)

			pendings[key] = createPending()
		}
	],
	afterwares: [
		({ data, operationName, variables, query }) => {
			if (isServer || !data) return null

			let key = tsh(plugin + operationName + str(variables) + query)
			let expiresKey = key + dateTag

			setItem(expiresKey, Date.now() + ttl * 1000 + '')
			setItem(key, str(data))

			let pending = pendings[key]
			if (pending) {
				pending[1](data)
				delete pendings[key]
			}
		}
	]
})

export default gqlLocalCache
