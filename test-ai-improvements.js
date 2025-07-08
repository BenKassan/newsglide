// Test script for AI improvements
// Run this after starting Supabase locally

const SUPABASE_URL = 'http://localhost:54321'
const ANON_KEY = 'YOUR_ANON_KEY_HERE' // Get this from 'supabase start' output

async function testNewsSynthesis(topic, includePhdAnalysis = false) {
  console.log(`\n🔍 Testing news synthesis for: "${topic}"`)
  console.log(`PhD Analysis: ${includePhdAnalysis ? 'Yes' : 'No'}\n`)
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/news-synthesis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, includePhdAnalysis })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    const newsData = JSON.parse(data.output[0].content[0].text)
    
    console.log('📰 Headline:', newsData.headline)
    console.log('\n📝 Base Article:')
    console.log(newsData.article.base)
    console.log('\n👶 ELI5 Version:')
    console.log(newsData.article.eli5)
    
    if (includePhdAnalysis && newsData.article.phd) {
      console.log('\n🎓 PhD Analysis:')
      console.log(newsData.article.phd)
    }
    
    // Check for AI phrases
    console.log('\n✅ Quality Checks:')
    const aiPhrases = [
      'It\'s important to note',
      'Furthermore',
      'Moreover',
      'In conclusion',
      'Delve into',
      'Tapestry',
      'Landscape'
    ]
    
    const baseArticle = newsData.article.base.toLowerCase()
    const foundPhrases = aiPhrases.filter(phrase => 
      baseArticle.includes(phrase.toLowerCase())
    )
    
    if (foundPhrases.length === 0) {
      console.log('✅ No common AI phrases detected!')
    } else {
      console.log('⚠️  Found AI phrases:', foundPhrases)
    }
    
    return newsData
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

async function testQA(topic, question, context) {
  console.log(`\n💬 Testing Q&A for: "${question}"`)
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/news-qa`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, question, context })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('\n💭 Answer:', data.answer)
    
    // Check for robotic phrases
    const roboticPhrases = ['Certainly!', 'Indeed!', 'I\'d be happy to']
    const answer = data.answer
    const foundRobotic = roboticPhrases.filter(phrase => 
      answer.startsWith(phrase)
    )
    
    if (foundRobotic.length === 0) {
      console.log('✅ Natural response style!')
    } else {
      console.log('⚠️  Starts with:', foundRobotic[0])
    }
    
    return data.answer
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

async function testDebate(topic, participant1Id, participant2Id, newsContext) {
  console.log(`\n🎭 Testing debate: ${participant1Id} vs ${participant2Id}`)
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-debate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, participant1Id, participant2Id, newsContext })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const debate = await response.json()
    console.log(`\n📊 Generated ${debate.exchanges.length} exchanges`)
    
    // Show first few exchanges
    debate.exchanges.slice(0, 3).forEach((exchange, i) => {
      console.log(`\n${exchange.speaker}:`)
      console.log(exchange.text)
    })
    
    console.log('\n...')
    console.log('\n📋 Summary:', debate.summary)
    
    return debate
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Run tests
async function runAllTests() {
  console.log('🚀 Starting AI Improvement Tests')
  console.log('================================\n')
  
  // Test 1: News Synthesis
  const newsData = await testNewsSynthesis('OpenAI GPT-5 rumors', false)
  
  if (newsData) {
    // Test 2: Q&A with the news context
    await testQA(
      newsData.topic,
      'What are the main improvements expected?',
      {
        headline: newsData.headline,
        summaryPoints: newsData.summaryPoints,
        sources: newsData.sources
      }
    )
    
    // Test 3: Debate
    await testDebate(
      newsData.topic,
      'musk',
      'aoc',
      {
        headline: newsData.headline,
        summaryPoints: newsData.summaryPoints,
        article: newsData.article.base
      }
    )
  }
  
  // Test 4: PhD Analysis
  console.log('\n\n🎓 Testing with PhD Analysis...')
  await testNewsSynthesis('Climate change policy debate', true)
}

// Check if running in Node.js
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  console.log('⚠️  Note: This script is designed to run after you start Supabase locally.')
  console.log('📝 Instructions:')
  console.log('1. Install Supabase CLI: brew install supabase/tap/supabase')
  console.log('2. Run: supabase start')
  console.log('3. Copy the anon key from the output and update ANON_KEY in this script')
  console.log('4. Run: supabase functions serve --env-file ./supabase/functions/.env.local')
  console.log('5. Run this script: node test-ai-improvements.js\n')
} else {
  // Run tests if in browser or after setup
  runAllTests()
}