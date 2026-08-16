# Settings and Manager Copyright Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a shared, linked copyright footer on the manager and settings pages.

**Architecture:** Add one presentational React component under `src/components/` and import it from both page roots. The component owns the link semantics, localized copyright format, and shared CSS. Page layouts only place it after their existing content and retain their current scrolling and sticky behavior.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, Vite CSS imports.

## Global Constraints

- Company URL: `https://changyetech.com`
- Company name: `Hangzhou Changye Network Technology Co., Ltd.`
- Footer text: `© <current local year> Hangzhou Changye Network Technology Co., Ltd.`
- Only the company name is clickable; the year prefix is plain text.
- External link attributes: `target="_blank"` and `rel="noreferrer noopener"`.
- Year is read with `new Date().getFullYear()` at render time; no timer is added.

---

### Task 1: Shared Copyright Footer

**Files:**

- Modify: `docs/specs/2026-08-16-settings-copyright.md`
- Create: `src/components/CopyrightFooter.tsx`
- Create: `src/components/CopyrightFooter.css`
- Test: `src/components/CopyrightFooter.test.tsx`
- Test: `src/settings/App.test.tsx`
- Test: `src/manager/App.test.tsx`
- Modify: `src/i18n/zh_CN.json`
- Modify: `src/i18n/en.json`
- Modify: `src/settings/App.tsx`
- Modify: `src/settings/styles.css`
- Modify: `src/manager/App.tsx`
- Modify: `src/manager/styles.css`

**Interfaces:**

- Produces: `export function CopyrightFooter(): JSX.Element`
- Consumes: `useT()` from `src/i18n`.

- [x] **Step 1: Write the failing tests**

```tsx
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { CopyrightFooter } from './CopyrightFooter';

afterEach(() => {
  vi.useRealTimers();
});

describe('CopyrightFooter', () => {
  it('renders the current-year company link', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T12:00:00'));

    render(
      <I18nProvider language="en">
        <CopyrightFooter />
      </I18nProvider>,
    );

    const link = screen.getByRole('link', {
      name: '© 2026 Hangzhou Changye Network Technology Co., Ltd.',
    });
    expect(link).toHaveAttribute('href', 'https://changyetech.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer noopener');
  });
});
```

Page tests assert the same accessible link exists after rendering each page root and that the settings About card no longer contains a duplicate copyright line.

- [x] **Step 2: Verify RED**

Run: `pnpm vitest run src/components/CopyrightFooter.test.tsx src/settings/App.test.tsx src/manager/App.test.tsx`

Expected: footer component test fails because `CopyrightFooter` does not exist; page tests fail because the footer link is absent.

- [x] **Step 3: Implement minimally**

- Add `footer.copyright` to both dictionaries.
- Implement `CopyrightFooter` with separate year and company-name copy, `new Date().getFullYear()`, and secure external-link attributes on the company link only.
- Import shared footer CSS in the component.
- Render the footer after `.layout` in both page roots and remove the About-card copyright line.
- Reduce each page layout's bottom padding so the footer sits in normal content flow without a large blank gap.

- [x] **Step 4: Verify GREEN**

Run the same focused Vitest command. Expected: all selected tests pass.

- [x] **Step 5: Verify the project**

Run: `make check`

Expected: formatting, lint, typecheck, and all tests pass.
