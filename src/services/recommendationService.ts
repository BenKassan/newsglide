// Fallback recommendation service that works without Edge Functions
export interface SurveyAnswers {
  field?: string[]
  role?: string[]
  interests?: string[]
  depth?: string[]
  goals?: string[]
  // New format
  usage?: string[]
  style?: string[]
}

const topicsByCategory = {
  // Technology & AI
  'AI & Machine Learning': [
    'Latest AI regulations and policy updates',
    'Breakthrough in generative AI applications',
    'Open source AI model developments',
    'AI ethics and bias prevention strategies',
    'Machine learning in healthcare diagnostics',
    'Natural language processing advancements',
    'Computer vision applications in industry',
    'AI-powered automation trends',
  ],
  
  'Technology & Cybersecurity': [
    'Cybersecurity threats and data privacy in 2025',
    'Zero-trust security architecture trends',
    'Ransomware prevention strategies',
    'Cloud security best practices',
    'IoT device security challenges',
    'Quantum computing impact on encryption',
    'Mobile app security vulnerabilities',
    'Blockchain security applications',
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
  
  // Business & Finance
  'Business & Finance': [
    'Central bank policy decisions and market impact',
    'Corporate earnings reports and guidance updates',
    'Private equity and venture capital trends',
    'Financial technology disrupting traditional banking',
    'Global trade agreements and tariff developments',
    'Stock market volatility and investment strategies',
    'Cryptocurrency adoption by financial institutions',
    'Consumer spending patterns and economic indicators',
  ],
  
  // Climate & Environment
  'Climate & Environment': [
    'COP summit outcomes and climate commitments',
    'Carbon capture technology breakthroughs',
    'Renewable energy infrastructure investments',
    'Biodiversity conservation success stories',
    'Extreme weather patterns and adaptation strategies',
    'Sustainable agriculture innovations',
    'Ocean cleanup initiatives progress',
    'Green building and sustainable architecture trends',
  ],
  
  // Healthcare Innovation
  'Healthcare Innovation': [
    'mRNA technology beyond vaccines',
    'AI-powered drug discovery breakthroughs',
    'Wearable health monitoring advances',
    'Precision medicine and genomics progress',
    'Mental health technology solutions',
    'Robotic surgery innovations',
    'Healthcare accessibility in underserved areas',
    'Aging population care innovations',
  ],
  
  // Space & Science
  'Space & Science': [
    'James Webb telescope latest discoveries',
    'SpaceX Starship development updates',
    'Lunar base construction progress',
    'Exoplanet discoveries and habitability',
    'Quantum computing milestones',
    'Nuclear fusion energy breakthroughs',
    'Dark matter research developments',
    'International space station experiments',
  ],
  
  // Economics & Markets
  'Economics & Markets': [
    'Federal Reserve policy impact analysis',
    'Global inflation trends and predictions',
    'Emerging market opportunities and risks',
    'Supply chain resilience strategies',
    'Real estate market dynamics',
    'Commodity prices and geopolitical factors',
    'Labor market transformation trends',
    'Economic inequality solutions debate',
  ],
  
  // Politics & Policy
  'Politics & Policy': [
    'Election outcomes and policy implications',
    'International relations and diplomacy updates',
    'Technology regulation developments',
    'Healthcare policy reforms debate',
    'Climate policy implementation progress',
    'Immigration policy changes worldwide',
    'Trade policy and economic partnerships',
    'Defense and security policy shifts',
  ],
  
  // Education & Research
  'Education & Research': [
    'AI in education transformation',
    'Remote learning effectiveness studies',
    'STEM education initiatives worldwide',
    'University research breakthroughs',
    'Educational equity programs success',
    'Skills gap and workforce training',
    'Open access research movement',
    'Education technology startups growth',
  ],
  
  // Arts & Entertainment
  'Arts & Entertainment': [
    'AI-generated art and creativity debate',
    'Streaming industry consolidation trends',
    'Virtual reality entertainment evolution',
    'Independent creators economy growth',
    'Cultural festivals and events revival',
    'Gaming industry technological advances',
    'Music industry transformation insights',
    'Film production innovation trends',
  ],
  
  // Engineering & Innovation
  'Engineering & Innovation': [
    'Sustainable materials engineering breakthroughs',
    'Robotics and automation advances',
    'Smart city infrastructure developments',
    '3D printing in manufacturing evolution',
    'Bioengineering applications expansion',
    'Transportation innovation updates',
    'Energy storage technology progress',
    'Civil engineering megaprojects',
  ],
  
  // Cryptocurrency & Web3
  'Cryptocurrency & Web3': [
    'Bitcoin institutional adoption trends',
    'Ethereum upgrades and scalability',
    'Central bank digital currency developments',
    'DeFi protocol innovations and risks',
    'NFT market evolution and use cases',
    'Web3 infrastructure building progress',
    'Cryptocurrency regulation updates globally',
    'Blockchain enterprise adoption cases',
  ],
  
  // Sports & Fitness
  'Sports & Fitness': [
    'Sports technology and performance analytics',
    'Mental health in professional sports',
    'Fitness wearables and health tracking',
    'Esports industry growth and recognition',
    'Sports medicine breakthroughs',
    'Sustainable sports venues initiatives',
    'Women\'s sports investment surge',
    'Virtual fitness platform innovations',
  ],
  
  // Social Issues
  'Social Issues': [
    'Digital privacy rights developments',
    'Social media impact on mental health',
    'Workplace diversity and inclusion progress',
    'Housing affordability crisis solutions',
    'Criminal justice reform initiatives',
    'Food security and sustainability efforts',
    'Gender equality advancement globally',
    'Community-driven social innovations',
  ],
  
  // Global Affairs
  'Global Affairs': [
    'UN sustainable development goals progress',
    'International conflict resolution efforts',
    'Global health initiatives coordination',
    'Refugee crisis and humanitarian response',
    'International trade negotiations updates',
    'Climate diplomacy and cooperation',
    'Global economic forum key outcomes',
    'Cross-border collaboration innovations',
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
  'Technology & Cybersecurity': [
    'Zero-day vulnerability discoveries',
    'Quantum-resistant encryption development',
    'IoT security best practices',
    'Cloud security architecture trends',
    'Privacy-preserving technologies',
  ],
  'Business & Finance': [
    'Market volatility trading strategies',
    'Fintech disruption in banking',
    'ESG investing performance metrics',
    'Merger and acquisition trends',
    'Digital payment innovations',
  ],
  'Climate & Environment': [
    'Carbon capture technology advances',
    'Renewable energy grid integration',
    'Climate adaptation strategies for cities',
    'Green finance and sustainable investing',
    'Ocean acidification solutions',
  ],
  'Healthcare Innovation': [
    'CRISPR gene editing applications',
    'Telemedicine adoption trends',
    'Mental health tech solutions',
    'Preventive care innovations',
    'Medical robotics advances',
  ],
  'Space & Science': [
    'Mars colonization progress updates',
    'Commercial space tourism developments',
    'Asteroid mining feasibility studies',
    'James Webb telescope discoveries',
    'International space collaboration',
  ],
  'Economics & Markets': [
    'Inflation impact on global markets',
    'Cryptocurrency regulation updates',
    'Supply chain resilience strategies',
    'Gig economy growth patterns',
    'International trade developments',
  ],
  'Politics & Policy': [
    'Election technology and security',
    'Policy impacts on innovation',
    'International diplomacy shifts',
    'Regulatory framework changes',
    'Political economy analysis',
  ],
  'Education & Research': [
    'EdTech platform innovations',
    'Research funding landscape',
    'STEM education initiatives',
    'Academic collaboration tools',
    'Learning science breakthroughs',
  ],
  'Arts & Entertainment': [
    'Digital art market trends',
    'Entertainment technology advances',
    'Creative AI applications',
    'Streaming platform strategies',
    'Cultural innovation projects',
  ],
  'Engineering & Innovation': [
    'Green engineering solutions',
    'Infrastructure modernization',
    'Materials science breakthroughs',
    'Automation in manufacturing',
    'Smart city implementations',
  ],
  'Cryptocurrency & Web3': [
    'DeFi protocol developments',
    'NFT utility applications',
    'Blockchain scalability solutions',
    'Web3 social platforms',
    'Crypto regulatory clarity',
  ],
  'Sports & Fitness': [
    'Sports analytics revolution',
    'Fitness technology integration',
    'Athletic performance optimization',
    'Esports ecosystem growth',
    'Health tracking innovations',
  ],
  'Social Issues': [
    'Digital rights advocacy',
    'Social innovation projects',
    'Community resilience building',
    'Equity in technology access',
    'Social impact measurement',
  ],
  'Global Affairs': [
    'International cooperation initiatives',
    'Global crisis response systems',
    'Cross-border innovation',
    'Diplomatic technology use',
    'Global development progress',
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
    answers.field.forEach((field: string) => {
      const fieldTopics = topicsByCategory[field as keyof typeof topicsByCategory] || topicsByCategory['General']
      // Add 2-3 topics from each selected field
      fieldTopics.slice(0, 3).forEach((topic: string) => recommendations.add(topic))
    })
  }
  
  // Add recommendations based on specific interests
  if (answers.interests && answers.interests.length > 0) {
    answers.interests.forEach((interest: string) => {
      const interestTopics = topicsByInterest[interest as keyof typeof topicsByInterest] || []
      // Add 1-2 topics from each interest
      interestTopics.slice(0, 2).forEach((topic: string) => recommendations.add(topic))
    })
  }
  
  // Add recommendations based on role
  if (answers.role && answers.role.length > 0) {
    const role = answers.role[0]
    const roleTopics = topicsByRole[role as keyof typeof topicsByRole] || []
    // Add 1-2 role-specific topics
    roleTopics.slice(0, 2).forEach((topic: string) => recommendations.add(topic))
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

// Usage-based topic refinements
const usageBasedTopics = {
  'Professional development & career growth': {
    modifier: 'career impact',
    topics: [
      'How {topic} is reshaping job markets',
      'Skills needed for {topic} professionals',
      'Career opportunities in {topic}',
      '{topic} certifications and training',
    ]
  },
  'Investment & financial decisions': {
    modifier: 'investment outlook',
    topics: [
      '{topic} market analysis and predictions',
      'Investment opportunities in {topic}',
      '{topic} stock performance and trends',
      'Financial impact of {topic} developments',
    ]
  },
  'Academic research & learning': {
    modifier: 'research focus',
    topics: [
      'Latest research papers on {topic}',
      'Academic breakthroughs in {topic}',
      '{topic} methodology and best practices',
      'Future research directions in {topic}',
    ]
  },
  'Business strategy & entrepreneurship': {
    modifier: 'business opportunity',
    topics: [
      '{topic} startup opportunities',
      'Business models leveraging {topic}',
      '{topic} market disruption analysis',
      'Competitive advantages through {topic}',
    ]
  },
}

// Generate recommendations with context about why they were chosen
export function generateContextualRecommendations(answers: SurveyAnswers): {
  recommendations: string[]
  context: string
} {
  // Handle both old and new survey formats
  const interests = answers.interests || []
  const usage = answers.usage || answers.goals || []
  const style = answers.style?.[0] || answers.depth?.[0] || 'Balanced mix'
  
  const recommendations = new Set<string>()
  
  // Generate recommendations based on interests + usage combinations
  interests.forEach((interest: string) => {
    // Add base topics for each interest
    const categoryTopics = topicsByCategory[interest as keyof typeof topicsByCategory] || topicsByCategory['General']
    
    // Add 2-3 base topics per interest
    categoryTopics.slice(0, 3).forEach((topic: string) => recommendations.add(topic))
    
    // Add usage-specific variations
    usage.forEach((use: string) => {
      const usageTopics = usageBasedTopics[use as keyof typeof usageBasedTopics]
      if (usageTopics && recommendations.size < 15) {
        // Create personalized topic based on interest + usage
        const template = usageTopics.topics[Math.floor(Math.random() * usageTopics.topics.length)]
        const personalizedTopic = template.replace('{topic}', interest.toLowerCase())
        recommendations.add(personalizedTopic)
      }
    })
  })
  
  // Add style-based recommendations
  if (style === 'Technical deep-dives') {
    recommendations.add('Technical analysis: Advanced concepts explained')
    recommendations.add('Research paper breakdowns and implications')
  } else if (style === 'Simple explanations') {
    recommendations.add('Beginner\'s guide to trending topics')
    recommendations.add('Complex news simplified')
  }
  
  // Ensure we have at least 5 recommendations
  if (recommendations.size < 5) {
    topicsByCategory['General'].forEach(topic => {
      if (recommendations.size < 5) {
        recommendations.add(topic)
      }
    })
  }
  
  // Build context message
  const contextParts = []
  
  if (interests.length > 0) {
    contextParts.push(`your interest in ${interests.slice(0, 2).join(' and ')}`)
  }
  
  if (usage.length > 0) {
    contextParts.push(`your focus on ${usage[0].toLowerCase()}`)
  }
  
  const context = contextParts.length > 0 
    ? `Based on ${contextParts.join(' and ')}, here are your personalized recommendations:`
    : 'Here are some trending topics we think you\'ll find interesting:'
  
  return { 
    recommendations: Array.from(recommendations).slice(0, 10),
    context 
  }
}