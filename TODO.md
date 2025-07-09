# TODO: Fix Navigation and UI Issues

## Issues to Fix

### 1. Remove Duplicate Navigation Bar ✅
- [x] Remove the `Navbar1` component from Routes.tsx that's causing the duplicate navigation
- The pages already have their own navigation (UnifiedNavigation or built-in navigation)

### 2. Fix Profile Icon Cut-off ✅
- [x] Add right padding/margin to the UserMenu component in UnifiedNavigation
- The profile icon appears to be too close to the edge

### 3. Fix White Text on White Background in Discover Survey ✅
- [x] Update the Discover page survey question options to use proper text colors
- Currently using `text-white` on glass-card backgrounds which makes text invisible

## Plan
1. First, I'll remove the duplicate navbar by removing `<Navbar1 />` from Routes.tsx ✅
2. Then, I'll check and fix the profile icon spacing in UnifiedNavigation ✅
3. Finally, I'll fix the text color issue in the Discover page survey questions ✅

## Review
All three issues have been successfully fixed:

1. **Duplicate Navigation**: Removed Navbar1 from Routes.tsx (lines 3 and 24)
2. **Profile Icon**: Updated UnifiedNavigation container padding to `sm:pr-8`
3. **Survey Text**: Changed text colors from `text-white` to `text-gray-700` and `text-blue-300` to `text-blue-700` in Discover.tsx