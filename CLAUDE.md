1. First think through the problem, read the codebase for relevant files, and write a plan to TODO.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the TODO.md file with a summary of the changes you made and any other relevant information.

## Checkpoint System

To ensure comprehensive documentation of major changes and prevent loss of information:

### When to Create a Checkpoint

Create a new checkpoint file (CHECKPOINT-XXX.md) after:
- Major feature implementations
- Significant architectural changes
- Large-scale refactoring
- Migration or upgrade processes
- Any session with 10+ file modifications
- Before starting a new major task that might override previous work

### Checkpoint File Format

Each checkpoint should include:
1. **Date and Session Info** - When the checkpoint was created
2. **Summary** - Brief description of what was accomplished
3. **Current State** - Overview of the codebase state
4. **Files Modified** - List of all files created/modified/deleted
5. **Architecture Changes** - Any structural modifications
6. **Dependencies** - New packages added or removed
7. **Configuration Changes** - Build, environment, or tool configs
8. **Known Issues** - Problems discovered or introduced
9. **Next Steps** - Planned future work
10. **Rollback Instructions** - How to revert if needed

### Checkpoint Naming Convention

- Format: `CHECKPOINT-XXX.md` where XXX is a zero-padded number
- Examples: CHECKPOINT-001.md, CHECKPOINT-002.md, etc.
- Increment sequentially, never reuse numbers

### Integration with TODO.md

- Reference checkpoint files in TODO.md review sections
- Link: "See CHECKPOINT-XXX.md for detailed changes"
- Keep TODO.md focused on task tracking, checkpoints for comprehensive documentation

### Example Checkpoint Creation

After completing major work:
1. Create new checkpoint file: `CHECKPOINT-002.md`
2. Document all changes comprehensively
3. Update TODO.md review to reference the checkpoint
4. Commit both files together

This system ensures no work is lost and provides a complete history of the codebase evolution.

### Current Checkpoints

- **CHECKPOINT-001.md** - Post-migration state documentation
- **CHECKPOINT-002.md** - Landing page implementation and architecture analysis
- **CHECKPOINT-003.md** - Gamification planning and error resolution
