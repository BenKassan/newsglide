/**
 * Service for fetching person images from Wikipedia/Wikimedia
 */

interface WikipediaPage {
  pageid: number
  title: string
  thumbnail?: {
    source: string
    width: number
    height: number
  }
  original?: {
    source: string
    width: number
    height: number
  }
}

interface WikipediaSearchResponse {
  query?: {
    pages?: Record<string, WikipediaPage>
  }
}

/**
 * Fetch a person's image from Wikipedia
 * @param personName - Full name of the person (e.g., "Donald Trump", "Xi Jinping")
 * @returns Image URL or null if not found
 */
export async function fetchPersonImage(personName: string): Promise<string | null> {
  try {
    // Wikipedia API endpoint for searching and getting page images
    const apiUrl = new URL('https://en.wikipedia.org/w/api.php')
    apiUrl.searchParams.append('action', 'query')
    apiUrl.searchParams.append('format', 'json')
    apiUrl.searchParams.append('titles', personName)
    apiUrl.searchParams.append('prop', 'pageimages')
    apiUrl.searchParams.append('pithumbsize', '200')
    apiUrl.searchParams.append('pilicense', 'any')
    apiUrl.searchParams.append('origin', '*') // Enable CORS

    const response = await fetch(apiUrl.toString())

    if (!response.ok) {
      console.error(`Wikipedia API error: ${response.status}`)
      return null
    }

    const data: WikipediaSearchResponse = await response.json()

    // Extract the first (and usually only) page
    const pages = data.query?.pages
    if (!pages) {
      console.warn(`No Wikipedia page found for: ${personName}`)
      return null
    }

    const page = Object.values(pages)[0]

    // Return thumbnail source if available
    if (page.thumbnail?.source) {
      console.log(`Found Wikipedia image for ${personName}:`, page.thumbnail.source)
      return page.thumbnail.source
    }

    console.warn(`No image found on Wikipedia page for: ${personName}`)
    return null
  } catch (error) {
    console.error(`Error fetching Wikipedia image for ${personName}:`, error)
    return null
  }
}

/**
 * Fetch images for multiple people in parallel
 * @param names - Array of person names
 * @returns Map of name to image URL
 */
export async function fetchMultiplePersonImages(
  names: string[]
): Promise<Map<string, string | null>> {
  const results = await Promise.all(
    names.map(async (name) => ({
      name,
      imageUrl: await fetchPersonImage(name),
    }))
  )

  return new Map(results.map((r) => [r.name, r.imageUrl]))
}
