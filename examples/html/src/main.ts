import gql, { client } from '@saltyaom/gql'
import LocalCache from '@saltyaom/gql-local-cache'

client.config('https://api.hifumin.app/graphql', {
	plugins: [LocalCache()]
})

const runQuery = () =>
	gql(
		`query GQLInMemoryCacheSample($id: Int!) {
    nhql {
      by(id: $id) {
        success
        error
        data {
          id
          title {
            display
          }
        }
      }
    }
  }`,
		{
			variables: {
				id: 177013
			}
		}
	)

const waterfall = async () => {
	for (let i = 0; i <= 1; i++) {
		const t = performance.now()
		await runQuery()
	}
}

waterfall()

// const parallel = async () => {
// 	for (let i = 0; i <= 3; i++) {
// 		const t = performance.now()

// 		runQuery().then((v) => {
// 			console.log(`${i} operation take: ${performance.now() - t}ms`, v)
// 		})
// 	}
// }

// parallel()
