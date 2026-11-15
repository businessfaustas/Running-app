import { useEffect } from 'react'
import { SITE_DESCRIPTION, SITE_NAME } from './seo'

interface PageMeta {
  /** Page title without the site name; the home page passes none. */
  title?: string
  description?: string
  /** Path to report as canonical, e.g. "/races/trail-kursiu-nerija". Defaults to the current path. */
  path?: string
  /** Structured data for the page (one object or several). */
  jsonLd?: object | object[] | null
  /** For pages that shouldn't appear in search results (not found, account screens). */
  noindex?: boolean
}

const DEFAULT_TITLE = 'PaceMates – bėk ir mink kartu'

function setMeta(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

const meta = (key: 'name' | 'property', name: string) => () => {
  const el = document.createElement('meta')
  el.setAttribute(key, name)
  return el
}

/**
 * Per-page title, description, canonical link, robots and structured data. The app is a
 * single page, so without this every URL would share the home page's tags; crawlers that run
 * JavaScript (Google, Bing and most answer engines) pick these up. Everything is put back when
 * the page is left.
 */
export function usePageMeta({ title, description, path, jsonLd, noindex }: PageMeta) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : ''
  useEffect(() => {
    const full = title ? `${title} – ${SITE_NAME}` : DEFAULT_TITLE
    const desc = description ?? SITE_DESCRIPTION
    const canonical = `${window.location.origin}${path ?? window.location.pathname}`
    const before = {
      title: document.title,
      description: document.head.querySelector('meta[name="description"]')?.getAttribute('content'),
      canonical: document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    }

    document.title = full
    setMeta('meta[name="description"]', meta('name', 'description'), 'content', desc)
    setMeta('meta[property="og:title"]', meta('property', 'og:title'), 'content', full)
    setMeta('meta[property="og:description"]', meta('property', 'og:description'), 'content', desc)
    setMeta('meta[property="og:url"]', meta('property', 'og:url'), 'content', canonical)
    setMeta(
      'link[rel="canonical"]',
      () => Object.assign(document.createElement('link'), { rel: 'canonical' }),
      'href',
      canonical,
    )
    if (noindex) setMeta('meta[name="robots"]', meta('name', 'robots'), 'content', 'noindex')

    let script: HTMLScriptElement | null = null
    if (ld) {
      script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.pageMeta = ''
      script.textContent = ld
      document.head.appendChild(script)
    }

    return () => {
      document.title = before.title
      if (before.description != null)
        setMeta(
          'meta[name="description"]',
          meta('name', 'description'),
          'content',
          before.description,
        )
      if (before.canonical != null)
        setMeta(
          'link[rel="canonical"]',
          () => document.createElement('link'),
          'href',
          before.canonical,
        )
      document.head.querySelector('meta[name="robots"]')?.remove()
      script?.remove()
    }
  }, [title, description, path, ld, noindex])
}
