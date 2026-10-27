import type { SerializedLinkNode } from '@payloadcms/richtext-lexical'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { type JSXConvertersFunction, RichText } from '@payloadcms/richtext-lexical/react'

// Builds are user-generated: mark external links as such for search engines.
const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  link: ({ node, nodesToJSX }) => {
    const { fields } = node as SerializedLinkNode
    const children = nodesToJSX({ nodes: node.children })
    if (fields.linkType === 'internal') return <span>{children}</span>
    return (
      <a href={fields.url} rel="ugc nofollow noopener" target={fields.newTab ? '_blank' : undefined}>
        {children}
      </a>
    )
  },
})

export function BuildContent({ data }: { data: SerializedEditorState }) {
  return (
    <RichText
      data={data}
      converters={converters}
      className="prose max-w-none dark:prose-invert prose-a:text-accent prose-img:rounded-lg"
    />
  )
}
