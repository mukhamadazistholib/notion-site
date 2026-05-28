import { CONFIG } from "site.config"
import { NotionAPI } from "notion-client"
import { idToUuid } from "notion-utils"

import getAllPageIds from "src/libs/utils/notion/getAllPageIds"
import getPageProperties from "src/libs/utils/notion/getPageProperties"
import { TPosts } from "src/types"

/**
 * @param {{ includePages: boolean }} - false: posts only / true: include pages
 */

export const getPosts = async () => {
  let id = CONFIG.notionConfig.pageId as string
  const api = new NotionAPI()

  const response = await api.getPage(id)
  id = idToUuid(id)
  const collection =
    (Object.values(response.collection)[0] as any)?.value?.value ||
    (Object.values(response.collection)[0] as any)?.value
  const block = response.block
  const schema = collection?.schema

  let rawMetadata = block[id]?.value as any
  if (rawMetadata?.value) {
    rawMetadata = rawMetadata.value
  }

  // Check Type
  if (
    rawMetadata?.type !== "collection_view_page" &&
    rawMetadata?.type !== "collection_view"
  ) {
    return []
  } else {
    // collection_query is empty from getPage() alone — explicitly fetch collection data
    const collectionId = Object.keys(response.collection || {})[0]
    const collectionViewId = Object.keys(response.collection_view || {})[0]
    if (collectionId && collectionViewId) {
      const colData = await (api as any).getCollectionData(
        collectionId,
        collectionViewId,
        { limit: 999 }
      )
      const reducerResults = colData?.result?.reducerResults
      if (reducerResults) {
        response.collection_query[collectionId] = reducerResults
      }
    }

    // Construct Data
    const pageIds = getAllPageIds(response)

    // response.block only contains the root page — fetch each post's block so
    // getPageProperties can read its properties.
    // Use batched requests to avoid hitting Notion's rate limit (429).
    const fetchedBlocks: any = { ...block }
    const BATCH_SIZE = 5
    const BATCH_DELAY_MS = 1000
    for (let i = 0; i < pageIds.length; i += BATCH_SIZE) {
      const batch = pageIds.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map(async (pageId) => {
          try {
            const pageResponse = await api.getPage(pageId)
            Object.assign(fetchedBlocks, pageResponse.block)
          } catch {
            // skip inaccessible pages
          }
        })
      )
      if (i + BATCH_SIZE < pageIds.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
      }
    }

    const data = []
    for (let i = 0; i < pageIds.length; i++) {
      const postId = pageIds[i]
      const properties =
        (await getPageProperties(postId, fetchedBlocks, schema)) || null
      let blockValue = fetchedBlocks[postId]?.value as any
      if (blockValue?.value) {
        blockValue = blockValue.value
      }
      properties.createdTime = new Date(blockValue?.created_time).toString()
      properties.fullWidth =
        (blockValue?.format as any)?.page_full_width ?? false

      data.push(properties)
    }

    // Sort by date
    data.sort((a: any, b: any) => {
      const dateA: any = new Date(a?.date?.start_date || a.createdTime)
      const dateB: any = new Date(b?.date?.start_date || b.createdTime)
      return dateB - dateA
    })

    // Sanitize: replace all undefined with null for Next.js JSON serialization
    const posts = JSON.parse(
      JSON.stringify(data, (_, v) => (v === undefined ? null : v))
    ) as TPosts
    return posts
  }
}
