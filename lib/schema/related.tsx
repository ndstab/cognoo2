import { DeepPartial } from 'ai'
import { z } from 'zod'

export const relatedSchema = z.object({
  items: z
    .array(
      z.object({
        query: z.string()
      })
    )
    .length(2)
})
export type PartialRelated = DeepPartial<typeof relatedSchema>
