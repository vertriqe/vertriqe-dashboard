import { XMLParser } from "fast-xml-parser"

export interface RssItem {
  title: string
  link: string
  pubDate: string
  description?: string
  guid?: string
  id: string
}

export interface RssFeed {
  items: RssItem[]
  lastFetched: number
}

export async function parseRssFeed(url: string): Promise<RssItem[]> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Vertrique ESG News Reader/1.0",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`)
    }

    const xml = await response.text()
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    })

    const result = parser.parse(xml)
    const channel = result.rss?.channel

    if (!channel || !channel.item) {
      throw new Error("Invalid RSS feed format")
    }

    // Handle both single item and array of items
    const items = Array.isArray(channel.item) ? channel.item : [channel.item]

    return items.map((item: any, index: number) => ({
      title: item.title || "No title",
      link: item.link || "",
      pubDate: item.pubDate || "",
      description: item.description || "",
      guid: item.guid?.["#text"] || item.guid || "",
      id: item.guid?.["#text"] || item.guid || `esg-news-${index}`,
    }))
  } catch (error) {
    console.error("Error parsing RSS feed:", error)
    return []
  }
}
