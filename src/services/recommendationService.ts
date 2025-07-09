// Fallback recommendation service that works without Edge Functions
export interface SurveyAnswers {
  field?: string[]
  role?: string[]
  interests?: string[]
  depth?: string[]
  goals?: string[]
}

const topicsByCategory = {
  // Technology
  'Technology': [
    'Latest AI regulations and policy updates',
    'Breakthrough in quantum computing applications',
    'Cybersecurity threats and data privacy in 2025',
    'Tech startup funding rounds this quarter',
    'Open source AI model developments',
    'Cloud computing cost optimization strategies',
    'Mobile app development trends',
    'Blockchain adoption in enterprise',
  ],
  
  // Business
  'Business': [
    'Global supply chain disruptions and solutions',
    'Remote work policy changes in major corporations',
    'Startup ecosystem growth in emerging markets',
    'ESG investing trends and impact',
    'Corporate merger and acquisition activity',
    'Small business digital transformation',
    'Economic indicators and market predictions',
    'Leadership strategies in uncertain times',
  ],
  
  // Science
  'Science': [
    'Climate change mitigation breakthroughs',
    'Space exploration missions update',
    'Medical research advances in gene therapy',
    'Renewable energy technology innovations',
    'Ocean conservation efforts worldwide',
    'Archaeological discoveries this year',
    'Quantum physics research developments',
    'Environmental restoration projects',
  ],
  
  // Medicine/Healthcare
  'Medicine': [
    'New cancer treatment breakthroughs',
    'Mental health support innovations',
    'Vaccine development updates',
    'Healthcare accessibility improvements',
    'Medical AI diagnostic tools',
    'Aging research and longevity science',
    'Pandemic preparedness strategies',
    'Personalized medicine advances',
  ],
  
  // Default/Mixed
  'General': [
    'Breaking news in technology and innovation',
    'Global economic trends and analysis',
    'Scientific breakthroughs changing our world',
    'Healthcare advances improving lives',
    'Climate action and sustainability efforts',
    'Education technology transforming learning',
    'Social innovation and community impact',
    'Future of work and career trends',
  ],
}

const topicsByInterest = {
  'AI & Machine Learning': [
    'GPT-5 capabilities and enterprise adoption',
    'AI regulation frameworks globally',
    'Machine learning in healthcare diagnostics',
    'Ethical AI development guidelines',
    'Computer vision breakthroughs',
  ],
  'Climate Change': [
    'Carbon capture technology advances',
    'Renewable energy grid integration',
    'Climate adaptation strategies for cities',
    'Green finance and sustainable investing',
    'Ocean acidification solutions',
  ],
  'Space Exploration': [
    'Mars colonization progress updates',
    'Commercial space tourism developments',
    'Asteroid mining feasibility studies',
    'James Webb telescope discoveries',
    'International space collaboration',
  ],
  'Healthcare Innovation': [
    'CRISPR gene editing applications',
    'Telemedicine adoption trends',
    'Mental health tech solutions',
    'Preventive care innovations',
    'Medical robotics advances',
  ],
  'Economic Trends': [
    'Inflation impact on global markets',
    'Cryptocurrency regulation updates',
    'Supply chain resilience strategies',
    'Gig economy growth patterns',
    'International trade developments',
  ],
}

const topicsByRole = {
  'Student': [
    'Career preparation in tech industry',
    'Student loan policy changes',
    'Online learning effectiveness studies',
    'Internship opportunities in growing fields',
    'Academic research breakthroughs',
  ],
  'Professional': [
    'Industry disruption and adaptation',
    'Professional development trends',
    'Remote work productivity tools',
    'Leadership in digital transformation',
    'Career pivot strategies',
  ],
  'Researcher': [
    'Research funding opportunities',
    'Open science initiatives',
    'Peer review system innovations',
    'Research collaboration tools',
    'Academic publishing changes',
  ],
  'Entrepreneur': [
    'Startup funding landscape 2025',
    'Business model innovations',
    'Scaling strategies for growth',
    'Entrepreneurial ecosystems globally',
    'Tech stack for modern startups',
  ],
}

export function generateMockRecommendations(answers: SurveyAnswers): string[] {
  const recommendations = new Set<string>()
  
  // Add recommendations based on field of interest
  if (answers.field && answers.field.length > 0) {
    answers.field.forEach(field => {
      const fieldTopics = topicsByCategory[field] || topicsByCategory['General']
      // Add 2-3 topics from each selected field
      fieldTopics.slice(0, 3).forEach(topic => recommendations.add(topic))
    })
  }
  
  // Add recommendations based on specific interests
  if (answers.interests && answers.interests.length > 0) {
    answers.interests.forEach(interest => {
      const interestTopics = topicsByInterest[interest] || []
      // Add 1-2 topics from each interest
      interestTopics.slice(0, 2).forEach(topic => recommendations.add(topic))
    })
  }
  
  // Add recommendations based on role
  if (answers.role && answers.role.length > 0) {
    const role = answers.role[0]
    const roleTopics = topicsByRole[role] || []
    // Add 1-2 role-specific topics
    roleTopics.slice(0, 2).forEach(topic => recommendations.add(topic))
  }
  
  // Customize based on depth preference
  if (answers.depth && answers.depth[0] === 'Technical details') {
    recommendations.add('Deep dive: Technical architecture patterns')
    recommendations.add('Research paper analysis: Latest findings')
  } else if (answers.depth && answers.depth[0] === 'Simple explanations') {
    recommendations.add('ELI5: Complex topics made simple')
    recommendations.add('Beginner\'s guide to emerging technologies')
  }
  
  // If we don't have enough recommendations, add some general ones
  if (recommendations.size < 8) {
    topicsByCategory['General'].forEach(topic => {
      if (recommendations.size < 10) {
        recommendations.add(topic)
      }
    })
  }
  
  // Convert to array and return top 10-15
  return Array.from(recommendations).slice(0, 15)
}

// Generate recommendations with context about why they were chosen
export function generateContextualRecommendations(answers: SurveyAnswers): {
  recommendations: string[]
  context: string
} {
  const recommendations = generateMockRecommendations(answers)
  
  // Build context message
  const contextParts = []
  
  if (answers.field && answers.field.length > 0) {
    contextParts.push(`your interest in ${answers.field.join(' and ')}`)
  }
  
  if (answers.role && answers.role.length > 0) {
    contextParts.push(`your role as ${answers.role[0].toLowerCase()}`)
  }
  
  if (answers.interests && answers.interests.length > 0) {
    contextParts.push(`your focus on ${answers.interests.slice(0, 2).join(' and ')}`)
  }
  
  const context = contextParts.length > 0 
    ? `Based on ${contextParts.join(', ')}, here are your personalized recommendations:`
    : 'Here are some trending topics we think you\'ll find interesting:'
  
  return { recommendations, context }
}