import { idToUuid } from "notion-utils"
import { ExtendedRecordMap, ID } from "notion-types"

export default function getAllPageIds(
  response: ExtendedRecordMap,
  viewId?: string
) {
  const collectionQuery = response.collection_query
  if (!collectionQuery || Object.keys(collectionQuery).length === 0) {
    return []
  }
  let views = Object.values(collectionQuery)[0] as any
  if (views?.value) {
    views = views.value
  }
  if (!views || typeof views !== "object") {
    return []
  }

  let pageIds: ID[] = []
  if (viewId) {
    const vId = idToUuid(viewId)
    pageIds = views[vId]?.blockIds
  } else {
    const pageSet = new Set<ID>()
    Object.values(views).forEach((view: any) => {
      // Non-grouped view (gallery, table, list): blockIds sits directly on the view
      view?.blockIds?.forEach((id: ID) => pageSet.add(id))
      // Grouped view: blockIds is nested under collection_group_results
      view?.collection_group_results?.blockIds?.forEach((id: ID) =>
        pageSet.add(id)
      )
    })
    pageIds = [...pageSet]
  }
  return pageIds
}
