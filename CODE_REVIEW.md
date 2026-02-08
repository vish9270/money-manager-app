# Code Review Notes

## High-priority issues

1. **Critical route/layout file is corrupted**  
   `app/(tabs)/(home)/_layout.tsx` contains JSON app config instead of a React layout component. This will break TypeScript parsing and Expo Router route registration for the home tab.

2. **Tab layout file contains a full screen component**  
   `app/(tabs)/_layout.tsx` exports `TransactionsScreen` and includes transaction-screen logic, but this file should define the tab navigator layout. This likely causes routing/navigation structure issues and makes tab configuration impossible.

3. **Budgets layout file contains accounts screen logic**  
   `app/(tabs)/budgets/_layout.tsx` appears to include account-management UI instead of a budgets stack layout. This indicates file-content mixups that can break route boundaries and headers.

4. **Utility import path mismatch**  
   Many files import from `@/utils/helpers`, but only `utils/helper.ts` exists. This mismatch will fail module resolution unless there is an untracked file or custom resolver alias not present in this repo.

5. **Potential route name mismatch in root stack**  
   In `app/_layout.tsx`, the root stack registers `investments`, while the route file appears to be `app/investment.tsx` (singular). This can lead to navigation to a missing route.

## Recommendations

- Restore route files from a known-good commit and re-separate layout files from screen files.
- Add a CI check for `tsc --noEmit` and route linting to catch corrupted file content early.
- Standardize utilities path naming (`helper.ts` vs `helpers.ts`) and enforce via lint rule/import path conventions.
- Add a smoke test script that validates all `app/**/_layout.tsx` files export navigator components.
