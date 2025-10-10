# TODO: Custom Debate Participants with Images

## Overview
Enable users to search for and debate with ANY person (not just 8 presets), with automatic Wikipedia image fetching. Remove emotion/tone indicators from the debate display.

## Plan Summary
1. Remove emotion/tone badges from debate viewer
2. Add custom name input fields to debate selector
3. Update service layer to use names instead of IDs
4. Modify edge function to handle custom persons with dynamic prompts
5. Update TypeScript types throughout

## Tasks

### Phase 1: UI Updates - DebateViewer (Remove Emotions)
- [ ] Remove `getToneEmoji()` function (lines 78-91 in DebateViewer.tsx)
- [ ] Remove tone badge display from exchanges (lines 209-214 in DebateViewer.tsx)
- [ ] Keep speaker name display
- [ ] Keep avatar/image display
- [ ] Test debate viewer displays cleanly without emotion indicators

### Phase 2: UI Updates - DebateSelector (Add Custom Input)
- [ ] Add two text input fields above preset grid (Participant 1 & Participant 2)
- [ ] Label preset grid as "Quick Select" or "Suggestions"
- [ ] Clicking preset auto-fills the corresponding text input
- [ ] User can type any custom name directly
- [ ] Validate both fields have names before enabling "Generate Debate" button
- [ ] Update UI to show selected names (custom or preset)

### Phase 3: Service Layer Updates
- [ ] Update `GenerateDebateRequest` interface to use `participant1Name` and `participant2Name` (instead of IDs)
- [ ] Modify `generateDebate()` in debateService.ts to accept names directly
- [ ] Keep Wikipedia image fetching for custom names (already works)
- [ ] Update `saveDebateToHistory()` to store participant names
- [ ] Update `DebateHistoryItem` type to use names
- [ ] Test with both preset and custom names

### Phase 4: Edge Function Updates
- [ ] Change edge function to accept `participant1Name` and `participant2Name`
- [ ] For preset personas: lookup systemPrompt from DEBATE_PERSONAS array by name
- [ ] For custom persons: generate generic systemPrompt
- [ ] Optionally remove `tone` from required response format
- [ ] Test edge function with custom names
- [ ] Deploy updated edge function: `npx supabase functions deploy generate-debate`

### Phase 5: Type System Updates
- [ ] Update TypeScript interfaces throughout codebase
- [ ] Change all `participantId` references to `participantName` where appropriate
- [ ] Update component props in DebateSection.tsx and other parent components
- [ ] Fix any type errors across the app

### Phase 6: Testing & Validation
- [ ] Test preset selection (should still work)
- [ ] Test custom name input (new functionality)
- [ ] Test Wikipedia image fetching for various names
- [ ] Test debate generation with unknown persons
- [ ] Verify no emotion/tone badges appear
- [ ] Test edge cases (empty names, special characters, etc.)
- [ ] Test saving to history works with names

## Technical Notes

### Generic System Prompt for Unknown Persons
```
You are [Name]. Based on your public statements, expertise, and known positions, debate this topic authentically. Stay true to your documented perspectives and speaking style. If you're not well-known, debate from a knowledgeable, balanced perspective.
```

### Files to Modify
1. `/src/features/debates/components/DebateViewer.tsx` - Remove emotions
2. `/src/features/debates/components/DebateSelector.tsx` - Add custom inputs
3. `/src/features/debates/services/debateService.ts` - Use names not IDs
4. `/supabase/functions/generate-debate/index.ts` - Handle custom persons
5. Parent components that pass participant IDs

### Existing Infrastructure
✅ Wikipedia image service already handles any person name
✅ Image fetching happens in parallel with debate generation
✅ Fallback to emoji if image not found

## Review
_To be completed after implementation_
