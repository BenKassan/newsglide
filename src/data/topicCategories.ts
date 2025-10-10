/**
 * Main topic categories for homepage discovery
 * These are broad, evergreen topics that help users discover what to search for
 */

export interface TopicCategory {
  name: string
  slug: string
  description: string
  imageUrl: string
  icon: string
}

export const TOPIC_CATEGORIES: TopicCategory[] = [
  {
    name: 'Technology & Innovation',
    slug: 'technology',
    description: 'AI, startups, gadgets, and the future of tech',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop',
    icon: '💻'
  },
  {
    name: 'Politics & Government',
    slug: 'politics',
    description: 'Elections, policy, and political developments',
    imageUrl: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&h=600&fit=crop',
    icon: '🏛️'
  },
  {
    name: 'Business & Economy',
    slug: 'business',
    description: 'Markets, companies, finance, and economic trends',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    icon: '📈'
  },
  {
    name: 'Science & Research',
    slug: 'science',
    description: 'Discoveries, experiments, and scientific breakthroughs',
    imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop',
    icon: '🔬'
  },
  {
    name: 'Health & Wellness',
    slug: 'health',
    description: 'Medical research, fitness, nutrition, and mental health',
    imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=600&fit=crop',
    icon: '🏥'
  },
  {
    name: 'Climate & Environment',
    slug: 'environment',
    description: 'Climate change, sustainability, and conservation',
    imageUrl: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&h=600&fit=crop',
    icon: '🌍'
  },
  {
    name: 'Sports & Entertainment',
    slug: 'sports',
    description: 'Major sports, movies, music, and pop culture',
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop',
    icon: '⚽'
  },
  {
    name: 'World Affairs',
    slug: 'world',
    description: 'International news and global events',
    imageUrl: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&h=600&fit=crop',
    icon: '🌐'
  }
]
