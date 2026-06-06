# Go-Live Risk Register - March 2026

## R1 - Data mismatch between PRL and current stock
- Probability: High
- Impact: High
- Trigger:
  - shortage report shows unreasonable values
  - planner disputes stock basis
- Mitigation:
  - freeze shortage formula for UAT
  - validate 10 sample items manually
  - document stock source per report
- Owner: Backend + Planner

## R2 - Additive schema startup fails on production data
- Probability: Medium
- Impact: High
- Trigger:
  - app startup fails after deploy
  - migration step hangs or errors
- Mitigation:
  - backup before deploy
  - dry run on database snapshot
  - avoid destructive ALTER in go-live sprint
- Owner: Backend / DBA

## R3 - API base URL mismatch after hosting
- Probability: Medium
- Impact: High
- Trigger:
  - frontend cannot reach backend
  - users see offline banner
- Mitigation:
  - validate hosted URL before release
  - document fallback behavior
  - smoke test on same network and hosted endpoint
- Owner: Frontend / IT

## R4 - Reservation schema exists but business logic not yet enforced
- Probability: High
- Impact: Medium
- Trigger:
  - users assume `Available` is fully reliable before allocation logic is live
- Mitigation:
  - mark phase as foundation only
  - enable UI only after backend formula is complete
  - communicate staged rollout
- Owner: Product / Backend

## R5 - Report performance degradation on large data
- Probability: Medium
- Impact: Medium
- Trigger:
  - report loading over 10 seconds
  - database CPU spikes during summary report
- Mitigation:
  - add indexes on new schema
  - cap filters to month/year default
  - log slow queries during UAT
- Owner: Backend

## R6 - UAT coverage not representative
- Probability: Medium
- Impact: High
- Trigger:
  - only happy path tested
  - no validation on real shortage edge cases
- Mitigation:
  - prepare sample cases:
    - no supplier mapping
    - zero share percent
    - low stock but no PRL
    - multi-supplier split
  - require cross-functional sign-off
- Owner: QA Lead / Business Owner

## R7 - Hosting rollback is undefined
- Probability: Low
- Impact: High
- Trigger:
  - deployment needs reversal
  - old frontend/backend bundle unavailable
- Mitigation:
  - keep previous build package
  - snapshot database before deploy
  - write rollback SOP before go-live
- Owner: IT / Dev

## R8 - Access control regression
- Probability: Medium
- Impact: Medium
- Trigger:
  - non-admin sees `Audit Trail`
  - supplier sees restricted reports
- Mitigation:
  - role smoke test before release
  - verify menu and API permission both enforced
- Owner: Frontend + Backend
