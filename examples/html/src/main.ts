import gql, { client } from '@saltyaom/gql'
import localCache from '@saltyaom/gql-local-cache'

client.config('https://api.opener.studio/graphql', {
  plugins: [localCache()]
})

gql(
  `query GetHentaiById($id: Int!) {
    getHentaiById(id: $id) {
      success
      data {
        title {
          display
          japanese
        }
        metadata {
          tags {
            name
            count
          }
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
