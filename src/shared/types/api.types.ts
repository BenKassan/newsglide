// OpenAI API Response Types
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenAIChoice {
  index: number
  message: OpenAIMessage
  finish_reason: string
}

export interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: OpenAIChoice[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// News API Response Types
export interface NewsSearchResult {
  title: string
  url: string
  snippet: string
  date?: string
  source?: string
}

export interface BraveSearchResponse {
  results?: Array<{
    title: string
    url: string
    description?: string
    published?: string
  }>
}

export interface SerperSearchResponse {
  organic?: Array<{
    title: string
    link: string
    snippet?: string
    date?: string
  }>
}

// Debate Types
export interface DebatePersona {
  name: string
  stance: string
  style: string
  arguments: string[]
  avatar: string
}

export interface DebateMessage {
  id: string
  speaker: string
  content: string
  timestamp: Date
}

export interface DebateHistory {
  id: string
  topic: string
  participants: string[]
  created_at: string
  messages: DebateMessage[]
}

// Subscription Types
export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
}

export interface UserSubscription {
  id: string
  user_id: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  current_period_end: string
  cancel_at_period_end: boolean
  plan: SubscriptionPlan
}
