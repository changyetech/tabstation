# Settings Page Copyright

## Goal

Show the extension copyright owner on the manager and settings pages.

## Scope

- Add a shared page footer to both surfaces.
- Text: `© <current local year> Hangzhou Changye Network Technology Co., Ltd.`
- The year prefix is plain, non-interactive text.
- Only the company name links to `https://changyetech.com` in a new browser context with `noreferrer noopener`.
- Keep the official company name in English for both supported interface languages.
- Read the year with `new Date().getFullYear()` when the footer renders; do not add a timer.
- Keep the existing settings About card free of a duplicate copyright line.
- Do not change settings behavior, navigation, sticky sections, or scrolling behavior.

## Verification

- Component and page tests assert the accessible link text, URL, and link safety attributes.
- The focused test suites and `make check` pass.
