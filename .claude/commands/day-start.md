# Day Start Command

When this command is run:

1. Read CLAUDE.md fully
2. Run `git status` and show what is uncommitted
3. Run `npx tsc --noEmit` in web-app/ — list any type errors
4. Run `npm test` in web-app/ — show pass/fail summary
5. Run `python -m pytest` in ai-backend/ — show pass/fail summary
6. Show the current project structure using `find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.py" | grep -v node_modules | grep -v .next | grep -v __pycache__`
7. Report: what is done, what has errors, what is ready to build next
8. Wait for the block prompt to be provided
