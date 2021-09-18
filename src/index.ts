import type { Plugin } from '@saltyaom/gql'

const isServer = typeof window === 'undefined'

const plugin = '_gqc_'
const dateTag = 'd'

const getItem = (k: string) => localStorage.getItem(k)
const setItem = (k: string, v: string) => localStorage.setItem(k, v)
const removeItem = (k: string) => localStorage.removeItem(k)

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

/**
 * gql local cache plugins
 * 
 * @example
 * ```typescript
 * import localCache from '@saltyaom/gql-local-cache'
 * 
 * client.config('/graphql', {
 *   plugins: [localCache()]
 * })
 * ```
 */
const gqlLocalCache = ({ ttl = 86400 }: GqlLocalCacheConfig = {}): Plugin => ({
	middlewares: [
		({ operationName, variables, query }) => {
			if (isServer) return null

			let key = tsh(
				plugin + operationName + str(variables) + query
			)
			let expiresKey = key + dateTag

			let expires = getItem(expiresKey) || 0

			if (Date.now() > +expires) {
				removeItem(key)
				removeItem(expiresKey)

				return null
			}

			let persisted = getItem(key)
			if (persisted) return JSON.parse(persisted)
		}
	],
	afterwares: [
		({ data, operationName, variables, query }) => {
			if (isServer || !data) return null

			let key = tsh(
				plugin + operationName + str(variables) + query
			)

			let expiresKey = key + dateTag

			setItem(expiresKey, (Date.now() + ttl * 1000) + '')
			setItem(key, str(data))
		}
	]
})

export default gqlLocalCache
