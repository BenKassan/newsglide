/**
 * Script to seed the topic cache with pre-generated topics
 * Run this after deploying to populate the cache for instant serving
 *
 * Usage:
 *   npx tsx scripts/seed-topic-cache.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function seedCache() {
  console.log('🌱 Starting topic cache seeding...\n')
  console.log(`Target: ${SUPABASE_URL}`)
  console.log('Generating 5 sets for each category...\n')

  const startTime = Date.now()

  try {
    const { data, error } = await supabase.functions.invoke('seed-topic-cache', {
      body: {
        generations_count: 5,
        parallel: true
      }
    })

    if (error) {
      console.error('❌ Seeding failed:', error)
      process.exit(1)
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('\n✅ Seeding complete!')
    console.log(`📊 Results:`)
    console.log(`   - Categories seeded: ${data.categories_seeded.length}`)
    console.log(`   - Total generations: ${data.total_generations}`)
    console.log(`   - Total topics: ${data.total_topics}`)
    console.log(`   - Duration: ${duration}s`)

    if (data.errors && data.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`)
      data.errors.forEach((err: string) => console.log(`   - ${err}`))
    }

    console.log('\n🎉 Cache is ready for instant serving!')
  } catch (err) {
    console.error('❌ Exception:', err)
    process.exit(1)
  }
}

// Run the seeding
seedCache()
