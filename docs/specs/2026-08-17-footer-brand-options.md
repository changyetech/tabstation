# Footer Brand Link & Options Entry

## Goal

Give the shared page footer two entries next to the copyright line: the product brand name linking to the official site, and an entry that opens the settings page.

## Scope

- Footer content becomes one centered line, segments separated by a middot: `Tab Station · 设置 · © <year> Hangzhou Changye Network Technology Co., Ltd.`
- Brand segment: text `Tab Station` (English in both interface languages, per [naming.md](../naming.md)), links to `https://tabstation.omnikit.run` in a new browser context with `noreferrer noopener`.
- Options segment: a button (not a link) that calls `chrome.runtime.openOptionsPage()`; label reuses the settings page title (`设置` / `Settings`).
- The options segment renders only where it is not self-referential — manager page and new tab page show it, the settings page does not.
- Copyright segment keeps today's behavior: plain year prefix, company name links to `https://changyetech.com`.
- Brand link and options button share the existing footer link styling (muted, hover to foreground, visible focus ring).
- Do not change footer placement, page layout, or any other page behavior.

## Verification

- Component tests assert the brand link URL/safety attributes, that the options button invokes `chrome.runtime.openOptionsPage`, and that it is absent by default.
- `make check` passes.
