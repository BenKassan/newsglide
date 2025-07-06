# Claude Code Workflow Instructions

## Git Workflow for Feature Development

When working on this project, follow these guidelines for committing changes:

### Branch Strategy

- **Never commit directly to `main`**
- Create feature branches for each phase or major checkpoint
- Branch naming convention: `feature/phase-X-checkpoint-name`

### Commit Process

After completing each major checkpoint:

1. **Create a new feature branch**

   ```bash
   git checkout -b feature/phase-X-checkpoint-name
   ```

2. **Stage and commit all changes**

   ```bash
   git add .
   git commit -m "feat: Complete Phase X - Checkpoint Name

   - List major changes
   - Include any breaking changes
   - Reference the phase from TODO.md

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

3. **Push to GitHub**

   ```bash
   git push -u origin feature/phase-X-checkpoint-name
   ```

4. **Create a Pull Request**

   ```bash
   gh pr create --title "Phase X: Checkpoint Name" --body "## Summary

   Completed Phase X checkpoint as outlined in TODO.md

   ### Changes
   - List key changes

   ### Testing
   - Describe what was tested
   - Note any new tests added

   ### Next Steps
   - What comes next in the plan"
   ```

### Testing Before Commit

Always run these checks before committing:

```bash
npm run typecheck
npm run lint
npm test -- --run
npm run build
```

### Current Project Status

- Phase 1: Foundation & Security Setup ✅
- Phase 2: Code Architecture Restructuring ✅
- Phase 3: Performance Optimizations ✅ (Partial)
- Phase 4: Code Quality & Testing ✅
- Phase 5: Developer Experience (Next)
- Phase 6: Infrastructure & Deployment
- Phase 7: Future Enhancements

### Important Notes

- Each phase can be its own PR
- User can test the branch locally before approving merge
- Keep commits atomic and focused on specific checkpoints
- Always ensure tests pass before pushing
