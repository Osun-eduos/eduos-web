# Changelog

## [0.4.0] - 2026-11-24

### Added
- Attendance screen: daily register with present, late, absent and excused buttons, notes and "mark the rest present"; school day overview; class attendance summary.
- Attendance card on the student record, today's register status on the teacher's home screen, attendance today on school and Ministry home screens, and each child's attendance on the parent's home screen.

## [0.3.0] - 2026-11-24

### Added
- Academic sessions screen for the Ministry.
- Classes screen for school administrators: create classes, set capacity and class teacher, see how full each class is.
- Students list with search and class filters, enrolment form with parent account creation and duplicate warning, and the student record (details, class, parents, schools attended, transfers).
- Transfers screen: accept into a class or decline incoming students, cancel outgoing requests, history.
- Home screens show student, class and transfer counts; teachers see their class and parents see their children.

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
