# Group H — Launch QA gate and approval

**Depends on:** Groups A–G complete to the extent planned for release.

## Goal

Final review before optionally replacing public marketing routes. **Never deploy automatically.**

## Checklist

- [x] `MASTER_REQUIREMENTS.md` and all group prompts satisfied or explicitly deferred
- [x] `IMPLEMENTATION_PROGRESS.md` lists tests run, screenshot paths, known limitations
- [x] Public `/` and `/pricing` unchanged until explicit approval recorded
- [x] `robots.txt` and `noindex` still correct for `/preview`
- [x] Business PDF claims on preview pages verified (Group E)
- [x] No fabricated social proof on preview
- [x] Regression: teacher, student, parent, memorisation, auth unaffected
- [ ] Signed approval from product owner to switch canonical homepage (if ever)

## Deliverables

1. Final QA note in `IMPLEMENTATION_PROGRESS.md` with date and blockers
2. Optional runbook: how to flip homepage to preview copy (manual steps only)

## Out of scope

Production deploy, DNS, marketing host cutover without separate authorisation.