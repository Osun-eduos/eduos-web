# eduos-web

**Web app for Osun EduOS: the Ministry of Education, schools, teachers and parents.**

Part of [Osun EduOS](https://github.com/Osun-eduos/osun-eduos), the open-source education management and intelligence system for Osun State. It talks to [eduos-api](https://github.com/Osun-eduos/eduos-api).

## Status

| Part | Status |
| --- | --- |
| `src/`: the web app (React + TypeScript) | **Milestone 4: results and report cards** |
| `prototype/`: clickable prototype of every module, sample data | Live at https://osun-eduos.pages.dev |

### Milestone 4: results and report cards

- **Ministry:** set up the three terms of a session with their dates and score split (default CA 1 20, CA 2 20, Exam 60), choose whether report cards show class positions, choose whether senior secondary is graded on the WAEC scale (A1 to F9) or A to F, and see released results by school and by subject.
- **School administrators:** choose each class's subjects (or add the usual ones in one click) and who teaches them; review, approve or return each subject's scores; add the principal's remarks; release a class's results.
- **Subject teachers:** enter scores in a grid with live totals and grades, save drafts, and submit for approval. Returned sheets show the reason.
- **Class teachers:** see the class broadsheet and write a remark for each student.
- **Parents:** see and print their child's report card once it is released, with grades, averages, position, attendance and remarks.

### Milestone 3: attendance

- **Teachers:** take the daily register for their class with one tap per student (present, late, absent, excused), add a reason, and correct registers from the last 7 days. Works on a phone.
- **School administrators:** see which classes have taken today's register and how many students are in school, open any register and correct it.
- **Ministry:** see any school's registers and today's attendance across the state.
- **Parents:** see their child's attendance rate and the days they were absent or late.

### Milestone 2: students and classes

- **Ministry:** open academic sessions and choose the current one; search any student in the state; see every transfer.
- **School administrators:** create classes (`JSS 2A`) with a capacity and class teacher; enrol students with a parent account; place and move students between classes; transfer students to another Osun school, or accept and decline students coming in; withdraw students.
- **Teachers:** see the class they teach, with each student's parent contact.
- **Parents:** see each of their children, their school, class and class teacher.
- Every student gets an Osun **learner ID** for life. When they change school their record, learner ID and history go with them.

### Milestone 1: accounts and sign-in

Every person has their own account and signs in with an email address or a Nigerian phone number.

| Account type | Created by | Can |
| --- | --- | --- |
| Ministry administrator | Another Ministry administrator (the first one by the API seed script) | Register schools, create any account, reset passwords, deactivate accounts and schools, see all activity |
| Ministry officer | Ministry administrator | See all schools and accounts (read only) |
| School administrator | Ministry administrator | Create teacher and parent accounts for their school, reset their passwords, deactivate them, see their school's activity |
| Teacher | School administrator | Take the register, enter scores for their subjects, write remarks for their class |
| Parent | School administrator | See their children's attendance and report cards |

- New accounts get a **temporary password**, shown once to the person who created the account. The new user must choose their own password at first sign-in.
- Forgotten passwords are reset by the level above, which issues a new temporary password.
- Five wrong passwords lock an account for 15 minutes; a reset unlocks it.
- Deactivating an account or a school signs those people out everywhere.
- Every sign-in and account change is recorded in the activity log.

## Run locally

You need Node.js 22 and the API running on port 3000 (see the [eduos-api README](https://github.com/Osun-eduos/eduos-api#run-locally)).

```bash
git clone https://github.com/Osun-eduos/eduos-web.git
cd eduos-web
npm install
npm run dev
# open http://localhost:5173
```

In development, requests to `/api` are forwarded to `http://localhost:3000`, so the sign-in cookie stays on the same origin. Set `API_PROXY_TARGET` to point somewhere else.

To view the prototype only, open `prototype/index.html` in a browser.

## Build and deploy

```bash
npm run build      # type-checks and builds into dist/
```

`dist/` is a static site. It includes `_redirects` (so links like `/accounts` work on Cloudflare Pages) and `_headers`. Set `VITE_API_URL` at build time if the API is not served at `/api` on the same site.

Host the web app and the API on the **same site** (for example `eduos.example.gov.ng` and `api.eduos.example.gov.ng`, or the API under `/api`), because the sign-in cookie uses `SameSite=Strict`. See [docs/deployment.md](docs/deployment.md).

## Layout

```
src/
  api.ts            API client; refreshes the session once when it expires
  auth.tsx          Sign-in state: access token in memory, refresh token in an httpOnly cookie
  roles.ts          Account types and who can create which
  pages/            Login, ChangePassword, Home, Schools, SchoolDetail, Accounts, Activity, Profile
  components/       Layout and shared UI
prototype/          The original clickable prototype (static HTML)
public/             Cloudflare _headers and _redirects
```

## Contributing

See the organisation-wide [contributing guide](https://github.com/Osun-eduos/.github/blob/main/CONTRIBUTING.md). Use fictional data only.

## Licence

[GNU Affero General Public License v3.0](LICENSE). If you run a modified version for users over a network, you must offer them its source code.
