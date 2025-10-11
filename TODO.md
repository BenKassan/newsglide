# TODO: Landing Page - Remove Sections

## Plan

Remove two sections from the landing page to simplify the design:

### Tasks

- [ ] Remove "How It Works" section (lines 427-475)
  - Three steps: Aggregate, Synthesize, Interact
  - Section with id="how-it-works"
  - Remove stepsRef from refs

- [ ] Remove "Features" / "Why Choose NewsGlide?" section (lines 477-580)
  - Four features: Defeat Bias, Personalized For You, Interact With Your Content, Adjustable Complexity
  - Includes the example news card mockup
  - Section with id="features"
  - Remove featuresRef from refs

- [ ] Update navigation to remove links
  - Remove "How it works" link from desktop nav (lines 170-176)
  - Remove "Features" link from desktop nav (lines 177-182)
  - Remove "How it works" link from mobile nav (lines 222-227)
  - Remove "Features" link from mobile nav (lines 228-233)
  - Keep "Mission" link

- [ ] Remove unused refs from component
  - Remove `featuresRef` declaration (line 23)
  - Remove `stepsRef` declaration (line 24)

## Changes Summary

### What's Being Removed
1. **"How it works"** section with three-step process
2. **"Why Choose NewsGlide?"** section with four features and example card
3. Navigation links to these sections

### What Stays
- Hero section with rotating words
- "Our news is [rotating word]" animated text section
- "Join the news revolution" CTA section
- Bottom CTA section with dark background
- Footer
- Mission navigation link

## Review

_(To be completed after changes)_
