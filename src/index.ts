import type { Plugin } from '@saltyaom/gql'

const isServer = typeof window === 'undefined'

const plugin = '_gqlCache_'
const dateTag = 'date'

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

const gqlLocalCache = ({ ttl = 86400 }: GqlLocalCacheConfig = {}): Plugin => ({
	middlewares: [
		({ operationName, variables, query }) => {
			if (isServer) return null

			let key =
				plugin +
				operationName +
				JSON.stringify(variables) +
				query.length
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

			let key =
				plugin +
				operationName +
				JSON.stringify(variables) +
				query.length

			let expiresKey = key + dateTag

			setItem(expiresKey, (Date.now() + ttl * 1000).toString())
			setItem(key, JSON.stringify(data))
		}
	]
})

export default gqlLocalCache
