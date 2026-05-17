# Block Run Command

When this command is run followed by a block prompt:

1. Read the block prompt completely before writing any code
2. Check which files already exist that the block touches
3. Check CLAUDE.md rules before starting
4. Implement everything in the prompt in order
5. After each file is written: run `npx tsc --noEmit` to catch type errors immediately
6. Fix all type errors before moving to the next file
7. After all files are written: run the relevant tests
8. Fix any failing tests
9. Run `git add . && git commit -m "day{N}-block{N}: {description}"` when complete
10. Report what was built, what tests pass, and any decisions made
