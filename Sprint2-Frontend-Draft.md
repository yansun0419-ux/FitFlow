# Sprint 2 Frontend Draft

## Scope

This file is a standalone frontend draft for Sprint 2 reporting.
It does not modify `Sprint 2.md` and is intended for later merge.

## Frontend Work Completed (Sprint 1 Gap Closure)

### 1. Authentication UX and Validation

- Added real-time form validation for email/password in login and registration flows.
- Added password show/hide toggle in login and registration forms.
- Added password strength indicator and rule checklist in registration page.
- Added registration success confirmation modal while preserving auto-login behavior.

### 2. Profile Editing Flow Completion

- Added profile field-level validation and inline error messages.
- Added avatar URL input and live avatar preview with fallback image.
- Added phone input formatting and validation (`(XXX) XXX-XXXX`).
- Added date of birth age validation (minimum age 13).
- Added save confirmation modal before profile update.
- Added cancel changes action to restore last loaded profile state.
- Added profile refresh after successful save to keep client state aligned with backend data.

### 3. Frontend Quality and Stability

- Added centralized validation utilities for reuse and consistency.
- Fixed frontend lint/build blockers in affected components.
- Verified project compiles and passes lint after changes.

## Current Deferred Item

- Upgrade-to-manager profile action remains a placeholder because backend flow is not fully available yet.

## Frontend Test Implementation

### Instructor-Aligned Test Strategy (Show Both)

- Cypress is required and is used for browser-level E2E/smoke verification.
- Framework-specific unit tests are also required and are implemented with Vitest + Testing Library.
- Demo order recommendation: show Cypress first, then unit tests.

### Cypress Specs Added

- `cypress/e2e/auth-smoke.cy.ts`
  - Login page input interaction and password show/hide toggle

- `cypress/e2e/login-validation.cy.ts`
  - Empty login submit shows required field errors
  - Invalid email format shows validation error

- `cypress/e2e/register-validation.cy.ts`
  - Empty register submit shows required field errors
  - Password strength indicator updates while typing
  - Manager registration requires invitation code

- `cypress/e2e/auth-guard.cy.ts`
  - Protected route redirects unauthenticated users to login

### Cypress Execution Result (Latest)

- Specs: 4 passed
- Tests: 7 passed
- Status: all Cypress specs passed

## Frontend Unit Test Implementation (Engineering Layer)

### Test Framework Setup

- Added Vitest and React Testing Library for frontend unit testing.
- Added test scripts in package scripts:
  - `npm test`
  - `npm run test:watch`
- Configured test runtime in `vite.config.ts` (`jsdom` environment + setup file).
- Added `src/test/setup.ts` to enable `jest-dom` and automatic cleanup after each test.

### Unit Test Files Added

- `src/lib/validation.test.ts`
  - Email validation
  - Password policy checks and strength labels
  - Phone formatter and phone validator
  - Avatar URL validator
  - Minimum age validator

- `src/pages/Login.test.tsx`
  - Empty submit shows field validation errors
  - Password show/hide toggle behavior

- `src/pages/Register.test.tsx`
  - Empty submit shows required field errors
  - Password strength indicator updates when user types

- `src/pages/Profile.test.tsx`
  - Invalid avatar URL blocks save and shows inline validation
  - Cancel changes restores original profile values
  - Save confirmation flow calls profile update API on confirm

- `src/lib/api.test.ts`
  - Backend role-id mapping to frontend role
  - JWT payload user-id extraction
  - Invalid token fallback behavior

- `src/store/authStore.test.ts`
  - Login writes state and localStorage
  - Login without user id removes stale `user_id`
  - Logout clears store state and localStorage

### Test Execution Result

- Test files: 6 passed
- Tests: 20 passed

### Cypress Commands

- Open Cypress UI:
  - `npm run cypress:open`
- Run Cypress in headless mode:
  - `npm run cypress:run`

### Notes For Submission Strategy

- Final presentation should include both Cypress results and unit test results.
- Keep Cypress output and unit test output screenshots or terminal logs for evidence.

## Testing Scope Guidance

### Assignment Full-Score Practical Target

- At least one valid Cypress E2E flow is implemented and runnable.
- Unit tests cover core frontend logic and key user interactions (auth, validation, profile edit flow).
- Test commands are documented and test results are reproducible.
- Frontend build and lint remain green after test additions.

## Frontend Submission Checklist

- Cypress tests run successfully in front of instructor or with recorded output.
- Unit tests run successfully in front of instructor or with recorded output.
- Frontend lint and build are green.
- Sprint 2 report includes:
  - Frontend completed work summary
  - Cypress test list
  - Unit test list
  - Test run commands
  - Test pass results
- Git commits are pushed (grading checks commit history).

## Demo-Day Execution Plan (Frontend Owner)

- Step 1: Run `npm run cypress:run` and show passing specs.
- Step 2: Run `npm test` and show passing unit tests.
- Step 3: Run `npm run lint` and `npm run build` as quality proof.
- Step 4: Demo key integrated flow in UI (login/register/profile update or course browse).

### Industry Baseline Target (Team Product Stage)

- Keep smoke E2E tests for critical user journeys (login/register/browse/profile update).
- Unit tests should prioritize deterministic business logic and state transitions.
- PR gate should include `lint + test + build` checks.
- Expand tests gradually around regressions and bug-prone areas instead of chasing raw test count.

### Commands Used

- Run all unit tests:
  - `npm test`
- Run tests in watch mode:
  - `npm run test:watch`
- Validate code quality and build:
  - `npm run lint`
  - `npm run build`

## Suggested Test Placement Convention

- Place reusable utility tests next to utility files (`src/lib/*.test.ts`).
- Place page/component tests next to page/component files (`src/pages/*.test.tsx`, `src/components/*.test.tsx`).
- Keep a shared test setup under `src/test/setup.ts`.
