# Review Command

When this command is run:

1. Run `npx tsc --noEmit` — report all type errors
2. Run `npm test` — report all failing tests
3. Run `python -m pytest` — report all failing tests
4. Check for any `any` types: `grep -r ": any" web-app/src --include="*.ts" --include="*.tsx"`
5. Check for hardcoded colors: `grep -r "text-gray\|bg-gray\|text-white\|bg-white" web-app/components --include="*.tsx"`
6. Check for console.log in production files: `grep -r "console.log" web-app/app web-app/components web-app/hooks web-app/services --include="*.ts" --include="*.tsx"`
7. Check for missing 'use client' issues: look for useState/useEffect in files without 'use client'
8. Show git log --oneline -10 to see recent commits
9. Give a health summary: what is clean, what needs attention
