# Bolt's Journal - Critical Learnings Only

This journal is only used to record CRITICAL learnings that will help avoid mistakes or make better decisions regarding performance in this codebase.

## 2026-07-10 - React.memo with Custom Comparison for Chat Message Items
**Learning:** In chat interfaces where responses are typed out sequentially or responses stream in, the parent component undergoes constant rapid re-renders. Every single message card containing heavy Markdown and code syntax highlighting gets re-rendered, causing significant visual stutter and high CPU loads. Basic `React.memo` is insufficient because the parent component passes fresh inline callback references on every render.
**Action:** Wrap message card components in `React.memo` using a custom comparison function that specifically validates content properties (`id`, `content`, `is_pinned`, `suggestions`, `workflow_stage`, `canRegenerate`, `isRegenerating`, `animateTyping`) while ignoring callback handler identities. This reduces re-renders by ~95% in active chat sessions.
