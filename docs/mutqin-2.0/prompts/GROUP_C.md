# Group C — Audience pages (teachers, students, parents)

**Depends on:** Group B.

## Goal

Add protected editorial pages under:

- `/preview/teachers`
- `/preview/students`
- `/preview/parents`

Each page uses the Notion-inspired marketing shell (shared layout partial or Vue page), authentic UI captures where relevant, and benefit-led British English copy.

## Deliverables

1. Routes with `auth`, `verified`, `landing.preview`
2. Vue or Blade views with `noindex`
3. Locale namespaces `previewTeachers.*`, `previewStudents.*`, `previewParents.*` (or nested under `homepage.preview.pages`)
4. Cross-links from `/preview` ecosystem section
5. Feature tests for access gate and robots headers

## Acceptance criteria

- Three pages render for allowlisted users only
- Copy matches implemented product behaviour (cross-check audit doc)
- No public sitemap or nav links until launch approval (Group H)

## Out of scope

Institutions and personal learning deep pages (Group D), billing changes (Group E).