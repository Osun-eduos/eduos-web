# Changelog

## [0.6.0] - 2026-11-25

### Added
- Import students from an Excel (.xlsx) or CSV file: a downloadable template, a check of every row before anything is saved, then printable sign-in slips for new parents. Files are read in the browser.
- Holidays panel on the Sessions page, with "Add national holidays". Attendance and home screens name the holiday instead of asking for registers.
- LGA education officer and school inspector accounts: created on the Accounts page with their LGA, with read-only screens limited to that LGA.

## [0.5.1] - 2026-11-25

### Added
- Senior secondary grading setting (WAEC A1 to F9, or A to F) for each term on the Sessions and terms page. Score entry and report cards follow it.

## [0.5.0] - 2026-11-24

### Added
- Terms on the Sessions page, with score split and positions setting.
- Class subjects page, score entry grid, approval and return, class results with broadsheet, remarks and release.
- Printable report card (A4), report cards on the student record, and the Ministry results summary.
- Home screens show the current term, scores waiting for approval, a teacher's subjects and a parent's latest report card.

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
