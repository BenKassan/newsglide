# NewsGlide Restructuring & Improvement Plan

## Overview

Based on the analysis, we'll keep the Vite SPA architecture but implement significant improvements to code organization, security, performance, and developer experience.

---

## Phase 1: Foundation & Security Setup ✅ Priority: Critical

**Goal**: Estab1lish secure environment configuration and basic project hygiene

### Checkpoint 1.1: Environment Configuration

- [ ] Create `.env.example` file with all required variables
- [ ] Create `.env.local` file for development
- [ ] Update `src/integrations/supabase/client.ts` to use env variables
- [ ] Update any hardcoded API keys in the codebase
- [ ] Add environment validation on app startup
- [ ] Document environment setup in README

### Checkpoint 1.2: Development Tooling

- [ ] Set up Prettier configuration
- [ ] Configure ESLint with stricter rules
- [ ] Add husky for pre-commit hooks
- [ ] Set up lint-staged for staged file linting
- [ ] Configure TypeScript path aliases (@features, @shared, etc.)
- [ ] Add commit message linting (commitlint)

### Checkpoint 1.3: Git Configuration

- [ ] Update .gitignore with comprehensive rules
- [ ] Add .nvmrc for Node version consistency
- [ ] Create .editorconfig for consistent formatting
- [ ] Set up branch protection rules documentation

---

## Phase 2: Code Architecture Restructuring 🏗️ Priority: High

**Goal**: Implement feature-based architecture for better scalability

### Checkpoint 2.1: Create New Directory Structure

- [ ] Create `src/app` directory for app-level components
- [ ] Create `src/features` directory structure
- [ ] Create `src/shared` directory for shared resources
- [ ] Create `src/ui` directory for design system
- [ ] Create `src/lib` directory for external integrations
- [ ] Move `styles` to `src/styles`

### Checkpoint 2.2: Feature Module - Authentication

- [ ] Create `src/features/auth` directory
- [ ] Move auth components from `src/components/auth`
- [ ] Create auth hooks (useAuth, useUser, etc.)
- [ ] Move auth-related services
- [ ] Create auth types/interfaces
- [ ] Update AuthContext location
- [ ] Fix all import paths

### Checkpoint 2.3: Feature Module - Articles

- [ ] Create `src/features/articles` directory
- [ ] Move ArticleViewer component
- [ ] Move SavedArticles page
- [ ] Extract article-related services
- [ ] Create article hooks (useArticles, useSaveArticle)
- [ ] Define article types/interfaces
- [ ] Update import paths

### Checkpoint 2.4: Feature Module - News Synthesis

- [ ] Create `src/features/news-synthesis` directory
- [ ] Move news synthesis components
- [ ] Extract OpenAI service calls
- [ ] Create synthesis hooks
- [ ] Define synthesis types
- [ ] Handle loading/error states properly
- [ ] Update import paths

### Checkpoint 2.5: Feature Module - Debates

- [ ] Create `src/features/debates` directory
- [ ] Move all debate components
- [ ] Move debate personas data
- [ ] Extract debate service
- [ ] Create debate hooks
- [ ] Define debate types
- [ ] Update import paths

### Checkpoint 2.6: Feature Module - Subscription

- [ ] Create `src/features/subscription` directory
- [ ] Move subscription components
- [ ] Move Stripe-related services
- [ ] Create subscription hooks
- [ ] Define subscription types
- [ ] Move SubscriptionContext
- [ ] Update import paths

### Checkpoint 2.7: Feature Module - Search

- [ ] Create `src/features/search` directory
- [ ] Move search-related components
- [ ] Move search history service
- [ ] Create search hooks
- [ ] Define search types
- [ ] Update import paths

### Checkpoint 2.8: Shared Resources Organization

- [ ] Move reusable components to `src/shared/components`
- [ ] Move utility functions to `src/shared/utils`
- [ ] Move shared hooks to `src/shared/hooks`
- [ ] Move shared types to `src/shared/types`
- [ ] Create shared constants file
- [ ] Update all import paths

### Checkpoint 2.9: UI Components Organization

- [ ] Keep shadcn components in `src/ui`
- [ ] Create component documentation
- [ ] Add Storybook for UI components (optional)
- [ ] Ensure consistent theming
- [ ] Update import paths

### Checkpoint 2.10: External Libraries Configuration

- [ ] Create `src/lib/supabase` with client and helpers
- [ ] Create `src/lib/openai` with configuration
- [ ] Create `src/lib/stripe` with configuration
- [ ] Add proper error handling for each service
- [ ] Create service interfaces
- [ ] Update import paths

---

## Phase 3: Performance Optimizations 🚀 Priority: High

**Goal**: Improve app performance and user experience

### Checkpoint 3.1: Bundle Optimization

- [ ] Analyze bundle size with rollup-plugin-visualizer
- [ ] Implement dynamic imports for heavy components
- [ ] Optimize images with proper formats and sizes
- [ ] Implement proper code splitting strategies
- [ ] Remove unused dependencies
- [ ] Tree-shake icon libraries

### Checkpoint 3.2: Runtime Performance

- [ ] Implement React.memo for expensive components
- [ ] Add useMemo/useCallback where appropriate
- [ ] Implement virtual scrolling for long lists
- [ ] Add skeleton loaders for better perceived performance
- [ ] Optimize re-renders with React DevTools Profiler
- [ ] Implement proper error boundaries

### Checkpoint 3.3: Data Fetching Optimization

- [ ] Configure React Query for optimal caching
- [ ] Implement prefetching for predictable user flows
- [ ] Add optimistic updates where appropriate
- [ ] Implement proper loading states
- [ ] Add retry logic with exponential backoff
- [ ] Cache synthesis results locally

### Checkpoint 3.4: SEO & Meta Tags

- [ ] Install and configure react-helmet-async
- [ ] Add dynamic meta tags for pages
- [ ] Implement Open Graph tags
- [ ] Add structured data for rich snippets
- [ ] Create dynamic sitemap generation
- [ ] Add robots.txt configuration

---

## Phase 4: Code Quality & Testing 🧪 Priority: Medium

**Goal**: Ensure code reliability and maintainability

### Checkpoint 4.1: TypeScript Improvements

- [ ] Enable stricter TypeScript rules
- [ ] Remove all 'any' types
- [ ] Add proper type definitions for API responses
- [ ] Create type guards for runtime validation
- [ ] Document complex types
- [ ] Use discriminated unions where appropriate

### Checkpoint 4.2: Testing Setup

- [ ] Set up Vitest for unit testing
- [ ] Configure React Testing Library
- [ ] Add MSW for API mocking
- [ ] Create test utilities and helpers
- [ ] Write tests for critical hooks
- [ ] Write tests for utility functions

### Checkpoint 4.3: Integration Tests

- [ ] Test authentication flows
- [ ] Test payment flows
- [ ] Test news synthesis flow
- [ ] Test error scenarios
- [ ] Test loading states
- [ ] Add accessibility tests

### Checkpoint 4.4: E2E Testing (Optional)

- [ ] Set up Playwright
- [ ] Create critical user journey tests
- [ ] Test cross-browser compatibility
- [ ] Add visual regression tests
- [ ] Configure CI/CD integration

---

## Phase 5: Developer Experience 👩‍💻 Priority: Medium

**Goal**: Improve development workflow and documentation

### Checkpoint 5.1: Documentation

- [ ] Update README with new structure
- [ ] Create CONTRIBUTING.md
- [ ] Document API integration patterns
- [ ] Create architecture decision records (ADRs)
- [ ] Add JSDoc comments for complex functions
- [ ] Create onboarding guide for new developers

### Checkpoint 5.2: Development Scripts

- [ ] Add script for generating feature modules
- [ ] Create component generation script
- [ ] Add database migration helpers
- [ ] Create environment setup script
- [ ] Add bundle analysis script
- [ ] Create release automation

### Checkpoint 5.3: Debugging Tools

- [ ] Configure React DevTools
- [ ] Add Redux DevTools for React Query
- [ ] Set up proper error logging
- [ ] Add performance monitoring
- [ ] Configure source maps properly
- [ ] Add debug mode for development

---

## Phase 6: Infrastructure & Deployment 🚢 Priority: Low

**Goal**: Prepare for production deployment

### Checkpoint 6.1: Build Optimization

- [ ] Configure production build optimizations
- [ ] Set up CDN for static assets
- [ ] Implement proper caching headers
- [ ] Add compression for assets
- [ ] Configure security headers
- [ ] Add Content Security Policy

### Checkpoint 6.2: Monitoring & Analytics

- [ ] Set up error tracking (Sentry)
- [ ] Add performance monitoring
- [ ] Implement user analytics (privacy-friendly)
- [ ] Add custom event tracking
- [ ] Create monitoring dashboards
- [ ] Set up alerts for critical issues

### Checkpoint 6.3: CI/CD Pipeline

- [ ] Set up GitHub Actions for testing
- [ ] Add build verification
- [ ] Configure automated deployments
- [ ] Add branch preview deployments
- [ ] Set up dependency updates (Renovate)
- [ ] Add security scanning

---

## Phase 7: Future Enhancements 🔮 Priority: Low

**Goal**: Prepare for future features and scaling

### Checkpoint 7.1: Progressive Web App

- [ ] Add service worker
- [ ] Implement offline functionality
- [ ] Add app manifest
- [ ] Enable push notifications
- [ ] Add install prompts
- [ ] Cache strategies for offline reading

### Checkpoint 7.2: Accessibility

- [ ] Audit with axe DevTools
- [ ] Add ARIA labels where needed
- [ ] Ensure keyboard navigation
- [ ] Test with screen readers
- [ ] Add focus management
- [ ] Implement skip links

### Checkpoint 7.3: Internationalization (if needed)

- [ ] Set up i18n framework
- [ ] Extract hardcoded strings
- [ ] Add language switcher
- [ ] Configure RTL support
- [ ] Add locale-specific formatting
- [ ] Create translation workflow

### Checkpoint 7.4: Advanced Features

- [ ] Add real-time collaboration
- [ ] Implement advanced search filters
- [ ] Add social sharing features
- [ ] Create public article pages
- [ ] Add commenting system
- [ ] Implement content recommendations

---

## Migration Strategy (If Ever Needed)

### Next.js Migration Path (Future Option)

If you ever need SSR for specific use cases:

1. Keep current app as-is
2. Create separate Next.js app for public content
3. Share component library between apps
4. Use micro-frontend architecture
5. Gradually migrate features if needed

---

## Success Metrics

- [ ] Bundle size < 200KB (gzipped)
- [ ] Lighthouse score > 90
- [ ] TypeScript coverage > 95%
- [ ] Test coverage > 80%
- [ ] Zero accessibility violations
- [ ] Build time < 30 seconds
- [ ] No hardcoded secrets
- [ ] All features working in restructured code

---

## Notes

- Each phase can be completed independently
- Prioritize Phase 1 & 2 for immediate impact
- Phase 3-7 can be done in parallel by different team members
- Keep the app functional throughout the restructuring
- Commit frequently with clear messages
- Create feature branches for each major change

---

## Implementation Progress & Details (Updated: 2025-01-06)

### Session Summary

This document tracks the comprehensive 7-phase restructuring plan for NewsGlide (fact-fuse-news-forge). The plan was created to improve code organization, security, performance, and developer experience while maintaining the existing Vite SPA architecture.

### Completed Work in This Session

#### Phase 1: Foundation & Security

1. **Prettier Configuration**
   - Created `.prettierrc` with standard settings (no semicolons, single quotes, etc.)
   - Created `.prettierignore` for build outputs and generated files
   - Removed duplicate `.prettierrc.json` file

2. **Husky & Git Hooks**
   - Initialized Husky for git hooks
   - Configured commit-msg hook for commitlint
   - Updated pre-commit hook to use lint-staged instead of npm test

3. **Lint-Staged Configuration**
   - Already had `.lintstagedrc.json` configured
   - Runs ESLint and Prettier on staged files

#### Phase 2: Code Architecture

- **Note**: Most of Phase 2 was already completed in previous sessions
- Directory structure already follows feature-based architecture
- All features properly organized in `src/features/`

#### Phase 3: Performance Optimizations

1. **Bundle Optimization (vite.config.ts)**
   - Added manual chunk splitting for vendor libraries
   - Configured separate chunks for: react-vendor, ui-vendor, form-vendor, date-vendor, utils
   - Set chunk size warning limit to 1000KB
   - Enabled source maps for development only
   - Configured terser minification with console/debugger removal in production
   - Added optimizeDeps configuration

2. **Runtime Performance**
   - **SavedArticles.tsx**: Added React.memo, useCallback for all handlers, useMemo for getAllTags
   - **DebateViewer.tsx**: Added React.memo, moved pure functions outside component, useCallback for handleShare, useMemo for word count calculation
   - **SearchHistory.tsx**: Identified for optimization but not completed

3. **Data Fetching with React Query**
   - Configured QueryClient with optimal defaults (5min stale time, 10min cache time)
   - Created `useSavedArticles` hook with React Query integration
   - Created `useSearchHistory` hook with React Query integration
   - Both hooks include proper error handling and toast notifications

4. **SEO Implementation**
   - Installed react-helmet-async
   - Added HelmetProvider to App.tsx
   - Created reusable SEO component with Open Graph and Twitter meta tags
   - Added SEO component to Index page

### Important Technical Decisions

1. **React Query Configuration**
   - Disabled refetch on window focus to prevent unnecessary API calls
   - Set retry attempts to 1 with exponential backoff
   - Separate stale times for different data types

2. **Performance Patterns**
   - Used React.memo for components with expensive renders
   - Moved pure functions outside components to prevent recreations
   - Applied useCallback to event handlers passed as props
   - Used useMemo for expensive computations (getAllTags, word counts)

3. **Code Splitting Strategy**
   - All pages use lazy loading with Suspense
   - Vendor chunks organized by functionality
   - Terser removes console/debugger in production

### Potential Issues & Considerations

1. **Missing Terser Dependency**
   - vite.config.ts references terser but it may not be installed
   - Vite might include it by default, needs verification

2. **TypeScript Path Aliases**
   - Already configured in vite.config.ts
   - All imports use @ aliases correctly

3. **React Query Migration**
   - Created hooks but components still use direct API calls
   - Future work: Update components to use the new hooks

4. **Performance Monitoring**
   - No tools currently set up to measure impact of optimizations
   - Consider adding React DevTools Profiler integration

### Next Steps for Future Sessions

1. **Complete Phase 3**
   - Add skeleton loaders
   - Implement virtual scrolling for long lists
   - Add structured data for SEO
   - Analyze bundle with rollup-plugin-visualizer

2. **Phase 4: Testing**
   - Set up Vitest
   - Write tests for new React Query hooks
   - Add integration tests for critical flows

3. **Phase 5: Developer Experience**
   - Update README with new patterns
   - Document React Query usage
   - Create component generation scripts

4. **Update Components to Use New Hooks**
   - Migrate SavedArticles to use useSavedArticles hook
   - Migrate SearchHistory to use useSearchHistory hook
   - This will complete the React Query integration

### File Structure Context

The project follows this structure:

```
src/
├── app/          # App-level components (App.tsx, Routes.tsx)
├── features/     # Feature modules (auth, articles, debates, etc.)
├── shared/       # Shared resources (components, hooks, utils)
├── ui/           # shadcn UI components
├── lib/          # External integrations (env.ts, supabase)
├── pages/        # Page components
└── services/     # API services
```

### Dependencies Added

- react-helmet-async@2.0.5 (for SEO)
- @tanstack/react-query (already installed)

### Configuration Files Modified

- vite.config.ts (bundle optimization)
- .prettierrc (code formatting)
- .husky/pre-commit (lint-staged integration)
- src/app/App.tsx (QueryClient config, HelmetProvider)
