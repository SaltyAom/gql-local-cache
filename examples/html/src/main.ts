import gql, { client } from '@saltyaom/gql'
import localCache from '@saltyaom/gql-local-cache'

client.config('https://api.opener.studio/graphql', undefined, [localCache()])

gql(
	`query GetHentaiById($id: Int!) {
      getHentaiById(id: $id) {
        success
        data {
          title {
            display
			japanese
          }
        }
      }
    }
  `,
	{
		variables: {
			id: 177013
		}
	}
).then((data) => {
	console.log(data)
})
