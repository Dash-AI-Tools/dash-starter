import { useEffect } from 'react'

type PageMeta = {
  title: string
  description?: string
  ogTitle?: string
  ogDescription?: string
}

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

/**
 * Set the document title and the meta/OG tags of a public page.
 */
export function usePublicPageMeta({ title, description, ogTitle, ogDescription }: PageMeta) {
  useEffect(() => {
    document.title = title

    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description)
    }
    if (ogTitle) {
      setMeta('meta[property="og:title"]', 'property', 'og:title', ogTitle)
    }
    if (ogDescription) {
      setMeta('meta[property="og:description"]', 'property', 'og:description', ogDescription)
    }
  }, [title, description, ogTitle, ogDescription])
}
