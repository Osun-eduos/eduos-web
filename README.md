# eduos-web

**Web app for Osun EduOS: the Ministry of Education, schools, teachers and parents.**

Part of [Osun EduOS](https://github.com/Osun-eduos/osun-eduos), the open-source education management and intelligence system for Osun State.

> **Status: clickable prototype.** `site/index.html` demonstrates every module in the concept note with fictional sample data. The production web app will be built here against [eduos-api](https://github.com/Osun-eduos/eduos-api).

**Live demo:** https://osun-eduos.pages.dev

## What the prototype covers

| Area | Screens |
| --- | --- |
| Ministry | State dashboard, indicators and LGA trends, schools and zoomable map, school registration, teachers (postings, training), infrastructure and inspection reports, exam records archive, sessions and terms, grading system |
| School | Results approval, students and student records, enrolment, class allocation, transfers, attendance register, class analysis, exam setup, announcements |
| Teacher | Score entry (web), score entry (mobile app view with offline mode), report cards |
| Parent | Results, attendance, progress, exam timetable, notifications and announcements |

A guided demo runs through the core flow: a teacher enters scores → the principal approves and submits → the Ministry dashboard updates. Offline changes are encrypted on the device with AES-256-GCM (Web Crypto) and synced on reconnect.

## Run locally

No build step. The prototype is one static file.

```bash
git clone https://github.com/Osun-eduos/eduos-web.git
cd eduos-web/site
python3 -m http.server 8000
# open http://localhost:8000
```

Serving over `http://localhost` keeps the Web Crypto API available for the offline mode.

## Deploy

`site/` deploys as-is to any static host. See [docs/deployment.md](docs/deployment.md) for Cloudflare Pages (manual upload or the included GitHub Action).

## Layout

```
site/        index.html (the prototype) and Cloudflare _headers
docs/        Deployment notes
.github/     Deploy workflow
```

## Contributing

See the organisation-wide [contributing guide](https://github.com/Osun-eduos/.github/blob/main/CONTRIBUTING.md). Use fictional data only.

## Licence

[GNU Affero General Public License v3.0](LICENSE). If you run a modified version for users over a network, you must offer them its source code. The prototype links to this repository from its sidebar for that reason.
