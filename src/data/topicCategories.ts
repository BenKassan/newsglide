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
    name: 'Advertising & Marketing',
    slug: 'advertising',
    description: 'Branding, campaigns, and digital marketing',
    imageUrl: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800&h=600&fit=crop',
    icon: '📣'
  },
  {
    name: 'Aerospace',
    slug: 'aerospace',
    description: 'Aircraft engineering and aviation technology',
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
    icon: '✈️'
  },
  {
    name: 'Agriculture',
    slug: 'agriculture',
    description: 'Farming, crops, livestock, and agricultural tech',
    imageUrl: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800&h=600&fit=crop',
    icon: '🌾'
  },
  {
    name: 'Architecture',
    slug: 'architecture',
    description: 'Buildings, urban planning, and design trends',
    imageUrl: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&h=600&fit=crop',
    icon: '🏛️'
  },
  {
    name: 'Artificial Intelligence',
    slug: 'ai',
    description: 'AI, machine learning, and neural networks',
    imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop',
    icon: '🤖'
  },
  {
    name: 'Arts & Culture',
    slug: 'arts',
    description: 'Visual arts, museums, and cultural movements',
    imageUrl: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&h=600&fit=crop',
    icon: '🎨'
  },
  {
    name: 'Automotive',
    slug: 'automotive',
    description: 'Cars, electric vehicles, and auto industry',
    imageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=600&fit=crop',
    icon: '🚙'
  },
  {
    name: 'Aviation',
    slug: 'aviation',
    description: 'Airlines, airports, and flight technology',
    imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=600&fit=crop',
    icon: '🛫'
  },
  {
    name: 'Beauty & Cosmetics',
    slug: 'beauty',
    description: 'Beauty products, skincare, and makeup trends',
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=600&fit=crop',
    icon: '💄'
  },
  {
    name: 'Books & Publishing',
    slug: 'books',
    description: 'Literature, authors, and publishing industry',
    imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&h=600&fit=crop',
    icon: '📖'
  },
  {
    name: 'Broadcasting',
    slug: 'broadcasting',
    description: 'Radio, TV networks, and media production',
    imageUrl: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=800&h=600&fit=crop',
    icon: '📺'
  },
  {
    name: 'Business & Economy',
    slug: 'business',
    description: 'Markets, companies, finance, and economic trends',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    icon: '📈'
  },
  {
    name: 'Construction',
    slug: 'construction',
    description: 'Building projects, infrastructure, and development',
    imageUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&h=600&fit=crop',
    icon: '🏗️'
  },
  {
    name: 'Cryptocurrency',
    slug: 'crypto',
    description: 'Bitcoin, digital currencies, and blockchain tech',
    imageUrl: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&h=600&fit=crop',
    icon: '₿'
  },
  {
    name: 'Cybersecurity',
    slug: 'cybersecurity',
    description: 'Data protection, hacking, and digital security',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=600&fit=crop',
    icon: '🔒'
  },
  {
    name: 'Data & Analytics',
    slug: 'data',
    description: 'Big data, statistics, and data science',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    icon: '📊'
  },
  {
    name: 'Design',
    slug: 'design',
    description: 'Graphic design, UX/UI, and creative trends',
    imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop',
    icon: '✏️'
  },
  {
    name: 'Education',
    slug: 'education',
    description: 'Schools, universities, online learning, and research',
    imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop',
    icon: '📚'
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Consumer electronics, gadgets, and devices',
    imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&h=600&fit=crop',
    icon: '📱'
  },
  {
    name: 'Energy',
    slug: 'energy',
    description: 'Renewable energy, oil, gas, and resource management',
    imageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=600&fit=crop',
    icon: '⚡'
  },
  {
    name: 'Engineering',
    slug: 'engineering',
    description: 'Civil, mechanical, and technical engineering',
    imageUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop',
    icon: '⚙️'
  },
  {
    name: 'Environment & Climate',
    slug: 'environment',
    description: 'Climate change, sustainability, and conservation',
    imageUrl: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&h=600&fit=crop',
    icon: '🌍'
  },
  {
    name: 'Fashion & Style',
    slug: 'fashion',
    description: 'Fashion trends, designers, and style guides',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=600&fit=crop',
    icon: '👗'
  },
  {
    name: 'Film & Television',
    slug: 'film',
    description: 'Movies, TV shows, and streaming content',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=600&fit=crop',
    icon: '🎬'
  },
  {
    name: 'Finance & Banking',
    slug: 'finance',
    description: 'Banking, investments, and financial markets',
    imageUrl: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=800&h=600&fit=crop',
    icon: '💰'
  },
  {
    name: 'Fitness & Training',
    slug: 'fitness',
    description: 'Workouts, athletic training, and exercise',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop',
    icon: '💪'
  },
  {
    name: 'Food & Dining',
    slug: 'food',
    description: 'Cuisine, restaurants, cooking, and food trends',
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
    icon: '🍽️'
  },
  {
    name: 'Gaming & Esports',
    slug: 'gaming',
    description: 'Video games, esports, and gaming culture',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=600&fit=crop',
    icon: '🎮'
  },
  {
    name: 'Health & Wellness',
    slug: 'health',
    description: 'Medical research, fitness, nutrition, and mental health',
    imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=600&fit=crop',
    icon: '💚'
  },
  {
    name: 'Healthcare',
    slug: 'healthcare',
    description: 'Medical care, hospitals, and health systems',
    imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=600&fit=crop',
    icon: '🏥'
  },
  {
    name: 'History',
    slug: 'history',
    description: 'Historical events, artifacts, and cultural heritage',
    imageUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&h=600&fit=crop',
    icon: '📜'
  },
  {
    name: 'Hospitality',
    slug: 'hospitality',
    description: 'Hotels, restaurants, and service industry',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
    icon: '🏨'
  },
  {
    name: 'Human Rights',
    slug: 'humanrights',
    description: 'Civil rights, equality, and social justice',
    imageUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=600&fit=crop',
    icon: '✊'
  },
  {
    name: 'Immigration',
    slug: 'immigration',
    description: 'Migration, visas, and refugee issues',
    imageUrl: 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=800&h=600&fit=crop',
    icon: '🌍'
  },
  {
    name: 'Insurance',
    slug: 'insurance',
    description: 'Insurance policies, coverage, and risk management',
    imageUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop',
    icon: '🛡️'
  },
  {
    name: 'International Trade',
    slug: 'trade',
    description: 'Global commerce, exports, and tariffs',
    imageUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&h=600&fit=crop',
    icon: '🌐'
  },
  {
    name: 'Law & Justice',
    slug: 'law',
    description: 'Legal news, court cases, and justice system',
    imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=600&fit=crop',
    icon: '⚖️'
  },
  {
    name: 'Logistics & Supply Chain',
    slug: 'logistics',
    description: 'Shipping, warehousing, and distribution',
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=600&fit=crop',
    icon: '📦'
  },
  {
    name: 'Manufacturing',
    slug: 'manufacturing',
    description: 'Industrial production, factories, and automation',
    imageUrl: 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=800&h=600&fit=crop',
    icon: '🏭'
  },
  {
    name: 'Maritime',
    slug: 'maritime',
    description: 'Shipping, ports, and ocean transport',
    imageUrl: 'https://images.unsplash.com/photo-1605649487212-47924bf61d50?w=800&h=600&fit=crop',
    icon: '⚓'
  },
  {
    name: 'Military & Defense',
    slug: 'military',
    description: 'Armed forces, defense tech, and security',
    imageUrl: 'https://images.unsplash.com/photo-1541873676-a18131494184?w=800&h=600&fit=crop',
    icon: '🛡️'
  },
  {
    name: 'Mining',
    slug: 'mining',
    description: 'Mining operations, minerals, and extraction',
    imageUrl: 'https://images.unsplash.com/photo-1545259742-25a0d424c82a?w=800&h=600&fit=crop',
    icon: '⛏️'
  },
  {
    name: 'Music & Performing Arts',
    slug: 'music',
    description: 'Music industry, concerts, and performances',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
    icon: '🎵'
  },
  {
    name: 'Nonprofits & Charity',
    slug: 'nonprofits',
    description: 'Charitable organizations and social causes',
    imageUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=600&fit=crop',
    icon: '🤝'
  },
  {
    name: 'Ocean & Marine',
    slug: 'ocean',
    description: 'Ocean conservation, marine life, and seas',
    imageUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop',
    icon: '🌊'
  },
  {
    name: 'Pharmaceuticals',
    slug: 'pharma',
    description: 'Drug development, medicine, and healthcare',
    imageUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&h=600&fit=crop',
    icon: '💊'
  },
  {
    name: 'Politics & Government',
    slug: 'politics',
    description: 'Elections, policy, and political developments',
    imageUrl: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&h=600&fit=crop',
    icon: '🏛️'
  },
  {
    name: 'Psychology',
    slug: 'psychology',
    description: 'Mental health, behavioral science, and wellness',
    imageUrl: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=800&h=600&fit=crop',
    icon: '🧠'
  },
  {
    name: 'Real Estate & Housing',
    slug: 'realestate',
    description: 'Property markets, architecture, and urban development',
    imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop',
    icon: '🏠'
  },
  {
    name: 'Religion & Spirituality',
    slug: 'religion',
    description: 'Faith, worship, and spiritual movements',
    imageUrl: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800&h=600&fit=crop',
    icon: '🕊️'
  },
  {
    name: 'Retail',
    slug: 'retail',
    description: 'Shopping, e-commerce, and consumer trends',
    imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&h=600&fit=crop',
    icon: '🛍️'
  },
  {
    name: 'Robotics & Automation',
    slug: 'robotics',
    description: 'Robots, automation, and industrial tech',
    imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=600&fit=crop',
    icon: '🤖'
  },
  {
    name: 'Science & Research',
    slug: 'science',
    description: 'Discoveries, experiments, and scientific breakthroughs',
    imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop',
    icon: '🔬'
  },
  {
    name: 'Social Media',
    slug: 'socialmedia',
    description: 'Social platforms, digital influence, and viral trends',
    imageUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=600&fit=crop',
    icon: '📱'
  },
  {
    name: 'Space & Astronomy',
    slug: 'space',
    description: 'Space exploration, NASA, and cosmic discoveries',
    imageUrl: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800&h=600&fit=crop',
    icon: '🚀'
  },
  {
    name: 'Sports & Entertainment',
    slug: 'sports',
    description: 'Major sports, movies, music, and pop culture',
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop',
    icon: '⚽'
  },
  {
    name: 'Startups & VC',
    slug: 'startups',
    description: 'Entrepreneurship, funding, and innovation',
    imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=600&fit=crop',
    icon: '🚀'
  },
  {
    name: 'Technology & Innovation',
    slug: 'technology',
    description: 'AI, startups, gadgets, and the future of tech',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop',
    icon: '💻'
  },
  {
    name: 'Telecommunications',
    slug: 'telecom',
    description: 'Mobile networks, 5G, and communications',
    imageUrl: 'https://images.unsplash.com/photo-1563906267088-b029e7101114?w=800&h=600&fit=crop',
    icon: '📡'
  },
  {
    name: 'Transportation & Mobility',
    slug: 'transportation',
    description: 'Cars, public transit, aviation, and mobility',
    imageUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&h=600&fit=crop',
    icon: '🚗'
  },
  {
    name: 'Travel & Tourism',
    slug: 'travel',
    description: 'Destinations, travel tips, and tourism industry',
    imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop',
    icon: '✈️'
  },
  {
    name: 'Weather & Climate',
    slug: 'weather',
    description: 'Forecasts, storms, and atmospheric science',
    imageUrl: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&h=600&fit=crop',
    icon: '🌤️'
  },
  {
    name: 'Wildlife & Nature',
    slug: 'wildlife',
    description: 'Animals, conservation, and natural habitats',
    imageUrl: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&h=600&fit=crop',
    icon: '🦁'
  },
  {
    name: 'World Affairs',
    slug: 'world',
    description: 'International news and global events',
    imageUrl: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&h=600&fit=crop',
    icon: '🌐'
  }
]
