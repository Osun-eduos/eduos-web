# Changelog

## [0.9.1] - 2026-11-26

### Added
- Examination records page: search and filter every approved score, with totals, pages and a CSV download. The old archive is now "Past sessions".
- Move students between arms from the class allocation page.
- "Action needed" on inspection reports, on the form, the report and the list.

## [0.9.0] - 2026-11-26

Everything in the original prototype is now in the product.

### Added
- Sidebar grouped by area, as in the prototype.
- Dashboard overview: results submitted against the deadline, staff present today, training, average score by term, latest submissions, LGA status, schools needing support, LGA comparisons over terms, and access figures (GER, NER, out of school, transition) with a population estimates page.
- School profiles with a map (OpenStreetMap), a map view of all schools, and a School profile page for school administrators.
- Grading system editor with a score checker; sessions created with their terms; results due dates, closing score entry and telling parents when a term begins.
- Results: submission status for every school, "Approve all awaiting", and a class and subject analysis page.
- Exam timetable, class allocation with auto-allocation, students list with attendance and term average, previous school and entry class on enrolment.
- Report cards with overall grade, promotion and verification code, and a public "Check a report card" page at /verify.
- Staff register with clock-in, staffing insights (training, subject shortages), inspection reports from the website, minimum standards by LGA and follow-up on reports.
- Parent portal: each child's term average, attendance, position, progress over terms, exam timetable, recent attendance and school announcements.
- Announcements to staff as well as parents.

## [0.8.0] - 2026-11-26

### Added
- Dashboard for the Ministry, LGA officers and inspectors: headline indicators, a comparison chart with benchmarks, attendance by month, trend by session, a sortable LGA or school table, and Excel, PDF and CSV downloads. Chart colours are checked for colour-blind readers in light and dark mode.
- Notifications page with an unread count in the sidebar, for everyone.
- Notices to parents for school administrators, to all parents or one class, with an optional text.
- Report card texts switch on the Text messages page.
- Archive of past sessions: each class's results by term and attendance, and the session's indicators.

## [0.7.0] - 2026-11-26

### Added
- Staff pages: the registry with search and filters, adding staff, each person's record with qualifications, training, postings and a linked account, and staff transfer requests and approvals.
- Inspections: every visit with its overall grade and main issues, and a full report with the checklist answers and photos.
- Text messages: today's absence texts, the school's on/off switch, the message log, and for the Ministry the provider status and a test send.
- Home screens show teaching and non-teaching staff and pupils per teacher; My account shows your own staff record.

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
