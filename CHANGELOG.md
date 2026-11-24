# Changelog

## [0.2.0] - 2026-11-24

### Added
- React + TypeScript web app (`src/`) with sign-in for Ministry administrators and officers, school administrators, teachers and parents.
- Sign-in with email or Nigerian phone number; forced password change on first sign-in; password change in My account.
- Role-based home screens, school registration with Osun school numbers, account creation with one-time temporary passwords, password resets, deactivation, and an activity log.
- CI workflow that type-checks and builds the app.

### Changed
- The clickable prototype moved from `site/` to `prototype/`; the deploy workflow now publishes `prototype/`.

## [0.1.0] - 2026-11-23

### Added
- Clickable prototype covering all modules in the Osun EduOS concept note, with fictional sample data.
- Offline score entry with on-device AES-256-GCM encryption and sync.
- Cloudflare Pages deployment at https://osun-eduos.pages.dev and a GitHub Actions deploy workflow.
