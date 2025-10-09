# Infinite Topic Hierarchy Implementation Plan

## Overview
Transform the Discover page into an infinite hierarchical topic exploration system. Users start with broad categories and can drill down indefinitely (Tech → Space → Mars → Water Discovery → Scientific Methods → ...). Each level generates subtopics via AI and aggregates relevant articles.

## Key Concept
- **Example Flow**: Tech → Space → Mars → "Water Discovery" → "Sample Analysis" → ...
- **Two Actions**:
  1. Click card = drill down to subtopics
  2. Click "Get Overview" = see articles + AI summary at current level
- **Infinite Depth**: AI generates subtopics at any depth
- **User Customization**: Users can create custom topic branches

## Architecture

### Data Model
```typescript
interface Topic {
  id: string
  name: string
  path: string // "tech/space/mars"
  depth: number
  parent_id: string | null
  user_id: string | null // null = default/public
  cached_subtopics: Topic[] | null
  cache_expires_at: timestamp
  article_count: number
  created_at: timestamp
}
```

### Database Schema
```sql
CREATE TABLE discover_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  path TEXT NOT NULL, -- "tech/space/mars"
  depth INTEGER NOT NULL DEFAULT 0,
  parent_id UUID REFERENCES discover_topics(id),
  user_id UUID REFERENCES auth.users(id), -- null for default topics
  cached_subtopics JSONB, -- cache generated subtopics
  cache_expires_at TIMESTAMP,
  article_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(path, user_id), -- unique path per user (null user_id for defaults)
  INDEX idx_path (path),
  INDEX idx_parent (parent_id),
  INDEX idx_user (user_id)
);

-- Junction table for article relevance
CREATE TABLE topic_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES discover_topics(id) ON DELETE CASCADE,
  article_id UUID, -- reference to your articles system
  relevance_score FLOAT, -- 0.0-1.0
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(topic_id, article_id)
);

-- Seed with root topics
INSERT INTO discover_topics (name, path, depth) VALUES
  ('Technology', 'technology', 0),
  ('Politics', 'politics', 0),
  ('Science', 'science', 0),
  ('Business', 'business', 0),
  ('Health', 'health', 0),
  ('Sports', 'sports', 0),
  ('Entertainment', 'entertainment', 0),
  ('World News', 'world', 0);
```

## Implementation Tasks

### Phase 1: Core Infrastructure (Week 1)

#### 1.1 Database Setup
- [ ] Create discover_topics table with indexes
- [ ] Create topic_articles junction table
- [ ] Seed root topics (8 default categories)
- [ ] Set up RLS policies for user-created topics

#### 1.2 Service Layer
- [ ] Create `discoverHierarchyService.ts`:
  ```typescript
  // Core functions:
  - getTopicByPath(path: string, userId?: string): Promise<Topic>
  - getSubtopics(parentPath: string, userId?: string): Promise<Topic[]>
  - generateSubtopics(parentTopic: Topic): Promise<Topic[]>
  - getTopicArticles(topicPath: string, limit: number): Promise<Article[]>
  - createCustomTopic(parentPath: string, name: string, userId: string)
  - deleteCustomTopic(topicId: string, userId: string)
  ```

- [ ] Implement caching strategy:
  - Check cache_expires_at before generating
  - Store generated subtopics in cached_subtopics JSON field
  - TTL: 1 hour for subtopics, 24 hours for article lists

### Phase 2: AI Subtopic Generation (Week 1)

#### 2.1 Edge Function
- [ ] Create `supabase/functions/generate-subtopics/index.ts`:
  ```typescript
  // Input: { topicName, parentPath, depth, newsContext }
  // Output: { subtopics: string[] } // 5-8 subtopic names

  // LLM Prompt Strategy:
  - Depth 0-2: Broad categories (AI, Crypto, Software)
  - Depth 3-5: Specific domains (GPT-4, Trading Bots, Python)
  - Depth 6+: Narrow/specific (GPT-4 Jailbreaks, Arbitrage Strategies)
  - Include parent path for context coherence
  - Ensure newsworthy & article coverage
  ```

#### 2.2 Integration
- [ ] Call edge function from discoverHierarchyService
- [ ] Handle edge function errors (timeout, rate limits)
- [ ] Implement retry logic (3 attempts with backoff)
- [ ] Store generated subtopics in database

### Phase 3: Frontend Components (Week 2)

#### 3.1 Dynamic Routing
- [ ] Create `/src/pages/discover/[...path].tsx`:
  ```typescript
  // URL: /discover/tech/space/mars
  // Parses path segments: ['tech', 'space', 'mars']
  // Fetches current topic + subtopics
  // Renders TopicHierarchy component
  ```

#### 3.2 TopicHierarchy Component
- [ ] Create `/src/components/discover/TopicHierarchy.tsx`:
  ```tsx
  // Features:
  - Breadcrumb navigation (Tech > Space > Mars)
  - Current topic title + description
  - Grid of subtopic cards (5-8 cards)
  - "Get Overview" button
  - Loading states with skeleton screens
  - Empty states (no subtopics found)
  ```

#### 3.3 TopicCard Enhancement
- [ ] Update existing TopicCard to handle:
  - Click → navigate to /discover/{path}/{subtopic}
  - Show article count badge
  - Loading spinner during navigation
  - Hover effects with preview

#### 3.4 TopicOverview Component
- [ ] Create `/src/components/discover/TopicOverview.tsx`:
  ```tsx
  // Shows when user clicks "Get Overview":
  - AI-generated summary (2-3 paragraphs)
  - Top 10 articles with relevance scores
  - "Related Topics" (siblings + cousins)
  - "Explore Deeper" CTA to go back to subtopics
  - Quick stats: article count, sentiment, freshness
  ```

### Phase 4: Article Relevance Matching (Week 2)

#### 4.1 Semantic Search Integration
- [ ] Implement topic-to-article matching:
  ```typescript
  // Strategy:
  1. Use topic path as context: "tech/space/mars"
  2. Semantic search using OpenAI embeddings
  3. Keyword matching (path segments as keywords)
  4. Recency weighting (boost recent articles)
  5. Calculate relevance score (0.0-1.0)
  6. Store in topic_articles junction table
  ```

#### 4.2 Article Aggregation
- [ ] Create endpoint GET `/api/discover/:path/articles`:
  ```typescript
  // Returns: { articles: Article[], totalCount: number }
  // Cached for 24 hours
  // Sorted by relevance_score * recency_factor
  ```

### Phase 5: Overview Generation (Week 3)

#### 5.1 Edge Function
- [ ] Create `supabase/functions/generate-overview/index.ts`:
  ```typescript
  // Input: { topicPath, articles: Article[] }
  // Output: { summary: string, keyThemes: string[], trending: Article[] }

  // LLM Prompt:
  - Synthesize 2-3 paragraph overview
  - Identify key themes and trends
  - Highlight most important developments
  - Note areas of debate/disagreement
  ```

#### 5.2 API Endpoint
- [ ] Create GET `/api/discover/:path/overview`:
  ```typescript
  // Returns:
  - summary: AI-generated text
  - articles: Top 10 relevant articles
  - relatedTopics: Sibling and cousin topics
  - stats: { articleCount, avgSentiment, lastUpdated }
  ```

### Phase 6: User Customization (Week 3)

#### 6.1 Custom Topic Creation
- [ ] Add "Create Custom Topic" UI:
  ```tsx
  // Button at bottom of subtopic grid
  // Modal with:
  - Parent topic (auto-filled from current path)
  - Custom topic name (text input)
  - Description (optional)
  - Privacy toggle: Private (default) / Public (share with community)
  ```

#### 6.2 API Endpoints
- [ ] POST `/api/discover/custom`:
  ```typescript
  // Creates user-specific topic
  // Sets user_id to current user
  // Generates initial subtopics via AI
  ```

- [ ] DELETE `/api/discover/custom/:topicId`:
  ```typescript
  // Removes user-created topic
  // Only topic owner can delete
  ```

#### 6.3 Tier System Integration
- [ ] Implement topic creation limits:
  - Free: 5 custom topics max
  - Premium: Unlimited custom topics
  - Check limit before creation
  - Show upgrade prompt when limit reached

### Phase 7: Performance Optimization (Week 4)

#### 7.1 Caching Strategy
- [ ] Implement multi-level caching:
  ```typescript
  // Level 1: Supabase cached_subtopics field (1 hour TTL)
  // Level 2: Database cache for article lists (24 hour TTL)
  // Level 3: Browser sessionStorage for navigation history
  ```

#### 7.2 Prefetching
- [ ] Prefetch next level:
  ```typescript
  // When showing subtopics:
  - Prefetch first 3 subtopics' children in background
  - Store in browser cache
  - Instant navigation when user clicks
  ```

#### 7.3 Lazy Loading
- [ ] Implement progressive loading:
  - Show skeleton cards immediately
  - Load topic metadata first (fast)
  - Lazy load article counts (slower)
  - Load topic images last (optional)

#### 7.4 Skeleton Screens
- [ ] Create loading states:
  - BreadcrumbSkeleton
  - TopicCardSkeleton
  - OverviewSkeleton
  - Smooth transitions when data loads

### Phase 8: Edge Cases & Error Handling (Week 4)

#### 8.1 Dead-End Topics
- [ ] Detect when no subtopics can be generated:
  ```typescript
  // If LLM returns < 3 subtopics:
  - Auto-switch to overview mode
  - Show "No further subtopics" message
  - Offer "Create Custom Topic" option
  - Suggest related topics from siblings
  ```

#### 8.2 Topic Drift Prevention
- [ ] Validate subtopic coherence:
  ```typescript
  // Check if subtopic is still related to root:
  - Calculate semantic similarity to ancestors
  - Warn if similarity < threshold
  - Allow user to flag inappropriate subtopics
  ```

#### 8.3 Empty Topics
- [ ] Handle topics with no articles:
  ```typescript
  // If article_count === 0:
  - Show "No recent news" message
  - Suggest related topics with articles
  - Offer to set up alert for future articles
  ```

#### 8.4 Duplicate Detection
- [ ] Handle cross-category duplicates:
  ```typescript
  // If topic appears in multiple paths:
  - Show "Also in:" section
  - Link to alternate paths
  - Merge article lists
  ```

### Phase 9: Analytics & Monitoring (Week 4)

#### 9.1 Tracking
- [ ] Implement PostHog events:
  ```typescript
  - topic_viewed: { path, depth, articleCount }
  - subtopic_expanded: { parentPath, subtopic, depth }
  - overview_requested: { path, articleCount }
  - custom_topic_created: { parentPath, name }
  - dead_end_reached: { path, depth }
  ```

#### 9.2 Performance Metrics
- [ ] Track key metrics:
  - Average exploration depth per user
  - Most popular paths
  - Cache hit rates
  - LLM generation latency
  - Dead-end rate by depth
  - Custom topic creation rate

#### 9.3 Optimization
- [ ] Use analytics to improve:
  - Pre-generate popular paths
  - Improve LLM prompts for low-quality subtopics
  - Identify content gaps (topics with no articles)
  - A/B test subtopic count (5 vs 8)

### Phase 10: Personalization Integration (Week 5)

#### 10.1 Learning from Exploration
- [ ] Update personalizationService:
  ```typescript
  // Track user's exploration patterns:
  - Frequently visited topic categories
  - Average depth of exploration
  - Topics where they request overviews
  - Custom topics created

  // Use to:
  - Boost related articles in main feed
  - Suggest similar topics in hierarchy
  - Personalize subtopic generation
  ```

#### 10.2 AI Chat Integration
- [ ] Connect with existing chat feature:
  ```typescript
  // User can ask: "Show me topics about renewable energy"
  // Chat navigates to: /discover/science/environment/renewable-energy
  // Or creates custom topic if doesn't exist
  ```

## Technical Stack

### Backend
- **Database**: Supabase Postgres with JSONB caching
- **Edge Functions**: Deno-based Supabase Functions
- **LLM**: OpenAI GPT-4 for subtopic generation
- **Search**: Brave Search API for article discovery
- **Caching**: Supabase + Browser sessionStorage

### Frontend
- **Routing**: Next.js dynamic routes (/discover/[...path])
- **Components**: React with TypeScript
- **Styling**: Tailwind CSS + glassmorphism
- **State**: React hooks + navigation state
- **Animations**: Tailwind transitions + Framer Motion

## User Flows

### Flow 1: Explore Broad to Narrow
1. User visits `/discover`
2. Sees 8 root topics (Tech, Politics, Science, etc.)
3. Clicks "Technology"
4. Navigates to `/discover/technology`
5. Sees subtopics: AI, Crypto, Software, Space, Robotics
6. Clicks "Space"
7. Navigates to `/discover/technology/space`
8. Sees: NASA, SpaceX, Mars, Moon, Satellites
9. Clicks "Mars"
10. Sees: Water Discovery, Perseverance Rover, Mars Missions
11. Clicks "Water Discovery" → Gets overview with articles

### Flow 2: Create Custom Topic
1. User at `/discover/technology/space`
2. Clicks "Create Custom Topic"
3. Types "Private Space Tourism"
4. Saves as private topic
5. AI generates subtopics: Virgin Galactic, SpaceX Starship, Blue Origin, Ticket Prices
6. Topic appears in their personal discover tree
7. Can share or keep private

### Flow 3: Get Overview at Any Level
1. User at `/discover/technology`
2. Clicks "Get Overview" (instead of drilling down)
3. Sees AI summary of all tech news
4. Views top 10 tech articles
5. Sees related topics: Business/Tech, Science/Tech
6. Can either drill down to subtopics or explore related

## Success Metrics

### Engagement
- Average exploration depth: Target 3-4 levels
- Topics per session: Target 5-8
- Custom topics created: Target 10% of users
- Return rate: Target 60% within 7 days

### Performance
- Page load time: < 500ms (cached)
- Subtopic generation: < 2s (new paths)
- Cache hit rate: > 80%
- Error rate: < 2%

### Content Quality
- Relevant articles: > 90% relevance score > 0.6
- Dead-end rate: < 10% of paths
- User satisfaction: > 4.2/5 stars

## Risks & Mitigation

### Risk 1: LLM Generates Poor Subtopics
- **Mitigation**:
  - Extensive prompt engineering
  - A/B test different prompts
  - Allow users to flag bad subtopics
  - Pre-generate and curate popular paths

### Risk 2: No Articles for Deep Topics
- **Mitigation**:
  - Check article count before showing topic
  - Gracefully handle empty topics
  - Suggest related topics with content
  - Offer alerts for future articles

### Risk 3: Topic Drift at Deep Levels
- **Mitigation**:
  - Include ancestor context in LLM prompts
  - Validate semantic similarity
  - Show breadcrumbs to show path coherence
  - Allow users to report drift

### Risk 4: Performance Degradation
- **Mitigation**:
  - Aggressive caching at multiple levels
  - Prefetch likely next topics
  - Lazy load non-critical data
  - Monitor and optimize slow queries

## Timeline Summary

- **Week 1**: Database + Service Layer + AI Generation
- **Week 2**: Frontend Components + Article Matching
- **Week 3**: Overview Generation + User Customization
- **Week 4**: Performance + Edge Cases + Analytics
- **Week 5**: Personalization Integration + Testing

**Total**: 5 weeks to full feature

## Next Steps

1. ✅ Review and approve this plan
2. ⏳ Begin Phase 1: Database setup
3. ⏳ Create discover_topics table
4. ⏳ Implement discoverHierarchyService
5. ⏳ Build subtopic generation edge function
6. ⏳ Create TopicHierarchy component
7. ⏳ Test with real user flows

---

*This plan provides a complete roadmap for implementing an infinite topic hierarchy system that positions NewsGlide as a unique news discovery platform. The system balances AI power (subtopic generation) with user control (custom topics) while maintaining excellent performance through intelligent caching.*
