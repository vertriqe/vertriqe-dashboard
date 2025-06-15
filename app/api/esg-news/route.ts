import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { parseRssFeed, type RssFeed, type RssItem } from "@/lib/rss-parser"

const ESG_NEWS_CACHE_KEY = "vertrique:esg_news"
const CACHE_TTL = 10 * 60 // 10 minutes in seconds
const RSS_FEED_URL = "https://esgnews.com/feed/"

async function fetchAndCacheEsgNews(): Promise<RssItem[]> {
  try {
    console.log("Fetching fresh ESG news from source")
    const items = await parseRssFeed(RSS_FEED_URL)

    if (items.length > 0) {
      const feedData: RssFeed = {
        items,
        lastFetched: Date.now(),
      }

      // Cache the feed data in Redis with expiration
      await redis.set(ESG_NEWS_CACHE_KEY, JSON.stringify(feedData), { ex: CACHE_TTL })
      console.log(`Cached ${items.length} ESG news items in Redis`)
    }

    return items
  } catch (error) {
    console.error("Error fetching and caching ESG news:", error)
    return []
  }
}

export async function GET() {
  try {
    // Try to get cached news first
    const cachedData = await redis.get(ESG_NEWS_CACHE_KEY)

    if (cachedData) {
      try {
        const parsedData: RssFeed = JSON.parse(cachedData as string)
        const lastFetchedTime = parsedData.lastFetched
        const currentTime = Date.now()
        const timeDiff = (currentTime - lastFetchedTime) / 1000 / 60 // in minutes

        // If cache is still fresh (less than 10 minutes old)
        if (timeDiff < 10) {
          console.log(`Using cached ESG news (${timeDiff.toFixed(2)} minutes old)`)
          return NextResponse.json({ news: parsedData.items })
        }

        console.log("Cached ESG news expired, fetching fresh data")
      } catch (error) {
        console.error("Error parsing cached ESG news:", error)
      }
    } else {
      console.log("No cached ESG news found")
    }

    // If we reach here, we need to fetch fresh data
    const freshItems = await fetchAndCacheEsgNews()
    return NextResponse.json({ news: freshItems })
  } catch (error) {
    console.error("Error in ESG news API route:", error)
    return NextResponse.json({ news: [] }, { status: 500 })
  }
}
