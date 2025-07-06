# Claude Code Workflow Instructions

## Git Workflow for Feature Development

When working on this project, I will follow these guidelines to ensure all changes go through PR review:

### Branch Strategy

- **Never commit directly to `main`**
- Create feature branches for each phase or major checkpoint
- Branch naming convention: `feature/phase-X-checkpoint-name`
- Always work from the latest main branch

### My Workflow for Every Major Change

1. **Before starting work**, I'll check the current branch:

   ```bash
   git branch --show-current
   ```

2. **Create a new feature branch** from main:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/description-of-change
   ```

3. **Make the changes** and commit them:

   ```bash
   git add .
   git commit -m "feat: description of change

   - List major changes
   - Include any breaking changes

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

4. **Push to GitHub**:

   ```bash
   git push -u origin feature/description-of-change
   ```

5. **I'll tell you** the branch name and PR URL so you can review

### How You Test Changes Locally

After I push a feature branch, you can test it locally:

1. **Fetch the latest branches**:

   ```bash
   git fetch origin
   ```

2. **Check out the feature branch**:

   ```bash
   git checkout feature/description-of-change
   ```

3. **Install dependencies** (if package.json changed):

   ```bash
   npm install
   ```

4. **Run tests**:

   ```bash
   npm run typecheck    # Check TypeScript
   npm run lint         # Check linting
   npm test -- --run    # Run tests
   npm run build        # Build the app
   ```

5. **Test the app locally**:

   ```bash
   npm run dev
   ```

   Then open http://localhost:5173 in your browser

6. **Review the changes**:
   ```bash
   git diff main...HEAD  # See all changes in this branch
   ```

### After You Approve

Once you've tested and approved the changes:

1. **Merge via GitHub**:
   - Go to the PR on GitHub
   - Click "Merge pull request"
   - Delete the branch after merging

2. **I'll update my local main**:
   ```bash
   git checkout main
   git pull origin main
   ```

### Current Workflow Status

- ✅ Phase 4 branch created: `feature/phase-4-testing-typescript`
- 🔄 Waiting for your review and testing
- Next: Phase 5 will be on a new branch after this is merged

### Testing Checklist for You

Before approving any PR, verify:

- [ ] Code builds without errors: `npm run build`
- [ ] All tests pass: `npm test -- --run`
- [ ] TypeScript has no errors: `npm run typecheck`
- [ ] Linting passes: `npm run lint`
- [ ] App runs locally: `npm run dev`
- [ ] New features work as expected
- [ ] No regressions in existing features

### Important Notes

- I will ALWAYS create a new branch for changes
- I will ALWAYS push to GitHub for your review
- I will NEVER merge or commit directly to main
- Each checkpoint gets its own PR
- You control when changes get merged
