import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './landing.css';

/** Line icons drawn inline, so the page loads nothing from other sites. */
function Icon({ d, size = '', stroke = 1.8 }: { d: string; size?: '' | 'sm' | 'xs'; stroke?: number }) {
  return (
    <svg className={`lp-ic ${size}`} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
const I = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  tick: 'M20 6L9 17l-5-5',
  cross: 'M6 6l12 12M18 6L6 18',
  bars: 'M4 20V10M10 20V4M16 20v-7',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5',
  results: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  chat: 'M4 5h16v11H8l-4 4z',
  chatLines: 'M4 5h16v11H8l-4 4zM8 9h8M8 12h5',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  learner: 'M12 3l9 4.5-9 4.5L3 7.5zM6.5 9.5V15c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3V9.5',
  school: 'M3 21h18M5 21V10l7-5 7 5v11M9 21v-5h6v5',
  shield: 'M12 3l8 3v6c0 4.5-3.3 8.3-8 9-4.7-.7-8-4.5-8-9V6zM9 12l2 2 4-4',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
  audit: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9',
  person: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c.8-4 4-6 8-6s7.2 2 8 6',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  turn: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
};

function Arrow() {
  return <span className="lp-arrow" aria-hidden="true"><Icon d={I.arrow} size="sm" stroke={2.2} /></span>;
}

const LGAS = ['Aiyedaade', 'Aiyedire', 'Atakumosa East', 'Atakumosa West', 'Boluwaduro', 'Boripe', 'Ede North', 'Ede South', 'Egbedore', 'Ejigbo',
  'Ife Central', 'Ife East', 'Ife North', 'Ife South', 'Ifedayo', 'Ifelodun', 'Ila', 'Ilesa East', 'Ilesa West', 'Irepodun',
  'Irewole', 'Isokan', 'Iwo', 'Obokun', 'Odo Otin', 'Ola Oluwa', 'Olorunda', 'Oriade', 'Orolu', 'Osogbo'];

const DAY = [
  {
    tab: '7:45 am · Register', when: '7:45 am · Register',
    title: 'The register is taken before the bell, even with no signal.',
    text: 'Mrs Adeyemi marks Primary 4A on her phone. EduOS keeps the register safely on the device and sends it as soon as a connection returns.',
    img: '/landing/teacher.webp', alt: 'A teacher reading with her class',
  },
  {
    tab: '11:00 am · Scores', when: '11:00 am · Scores',
    title: 'Scores go in once. Totals and grades work themselves out.',
    text: "Continuous assessment and exam scores are entered for each subject. EduOS applies the Ministry's grading rules, so every school grades the same way.",
    img: '/landing/secondary.webp', alt: 'Secondary school students at their desks in a classroom',
  },
  {
    tab: '2:00 pm · Approval', when: '2:00 pm · Approval',
    title: 'The principal approves. The Ministry sees the whole LGA.',
    text: 'Results are checked and released by the school, then counted straight into the State and LGA dashboards. No forms to collect, no figures to retype.',
    img: '/landing/classroom.webp', alt: 'Secondary school students standing in a classroom',
  },
  {
    tab: '6:00 pm · Home', when: '6:00 pm · Home',
    title: "Tolu's mum knows how the day went, on any phone.",
    text: 'Parents see results and attendance in the parent portal, and families without smartphones get a text message. Every report card carries a code anyone can verify.',
    img: '/landing/parent.webp', alt: 'A mother helping her young daughter get ready',
  },
];

function DayCard({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="lp-ui lp-fade">
        <h4>Primary 4A · Register <span className="lp-tag">Saved offline</span></h4>
        <ul>
          {['Adebayo Kehinde', 'Fatima Oladipo', 'Tolu Adeyemi'].map((n) => (
            <li key={n}><span>{n}</span><span className="lp-tick"><Icon d={I.tick} size="xs" stroke={3} /></span></li>
          ))}
          <li><span>Chidi Okon</span><span className="lp-tick no"><Icon d={I.cross} size="xs" stroke={3} /></span></li>
        </ul>
      </div>
    );
  }
  if (step === 1) {
    const rows: [string, number, number, string][] = [['Tolu Adeyemi', 32, 46, '78 B2'], ['Bisi Ogunleye', 35, 51, '86 A1'], ['Musa Ibrahim', 28, 39, '67 C4'], ['Ngozi Eze', 30, 44, '74 B3']];
    return (
      <div className="lp-ui lp-fade">
        <h4>JSS 2B · Mathematics <span className="lp-tag">Auto-graded</span></h4>
        <ul>
          {rows.map(([n, ca, ex, g]) => (
            <li key={n}><span>{n}</span><span>CA {ca} · Exam {ex} · <span className="lp-grade">{g}</span></span></li>
          ))}
        </ul>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="lp-ui lp-fade">
        <h4>First term results <span className="lp-tag">Approved</span></h4>
        <ul>
          <li><span>Released to parents</span><b>Today, 2:04 pm</b></li>
          <li><span>Pass rate by subject (example)</span></li>
        </ul>
        <div className="lp-minibar" aria-hidden="true"><span /><span /><span /><span /><span /></div>
      </div>
    );
  }
  return (
    <div className="lp-ui lp-fade">
      <h4>Text message <span className="lp-tag">Delivered</span></h4>
      <div className="lp-typing" aria-hidden="true"><i /><i /><i /></div>
      <p className="lp-sms">Osun EduOS: Tolu&apos;s first term report card is ready. Mathematics 78 (B2). Verify any printed copy with code OSE-4K7Q-9MPA.</p>
    </div>
  );
}

const PEOPLE = [
  { title: 'Pupils', img: '/landing/student.webp', alt: 'A smiling pupil at his desk', cta: 'How it works', to: '#day',
    text: 'One learner ID from first day to final exam. Results, attendance and report cards follow every child, even when they change school.' },
  { title: 'Teachers', img: '/landing/teacher.webp', alt: 'A teacher reading with her class', cta: 'Sign in as a teacher', to: '/login',
    text: 'Registers and score sheets for your classes, on the web or the EduOS app, with or without internet. Grades are worked out for you.' },
  { title: 'Parents', img: '/landing/family.webp', alt: 'Two people looking at a phone together', cta: 'Sign in as a parent', to: '/login',
    text: "Your child's results, attendance and school notices in the parent portal, and a text message when something needs your attention." },
  { title: 'Ministry & LGAs', img: '/landing/hands.webp', alt: 'A full classroom of pupils raising their hands', cta: 'Sign in as an officer', to: '/login',
    text: 'State and LGA dashboards, school registration, inspections and staff postings, built from records schools keep every day.' },
];

const GOALS = [
  { num: '4', name: 'Quality education', cls: 'sdg4', back: 'Every pupil counted and every result recorded, so learning gaps show up early.' },
  { num: '5', name: 'Gender equality', cls: 'sdg5', back: 'Gender parity tracked school by school and LGA by LGA.' },
  { num: '10', name: 'Reduced inequalities', cls: 'sdg10', back: 'Facility and staffing gaps made visible, so support goes where it is needed.' },
  { num: '16', name: 'Strong institutions', cls: 'sdg16', back: 'Verifiable report cards and an audit trail the public can trust.' },
];

/** Things that fade up as they scroll into view. Everything stays visible if the browser can't observe scrolling. */
const REVEAL = '.lp-sec-head, .lp-card, .lp-step, .lp-goals, .lp-shields li, .lp-dark-grid > div:first-child, .lp-band, .lp-people-head';

function usePageMotion() {
  const root = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLElement>(null);
  const [reduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const onScroll = () => top.current?.classList.toggle('scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const el = root.current;
    let io: IntersectionObserver | undefined;
    if (el && !reduced && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('in'); io?.unobserve(e.target); }
        }),
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
      );
      el.querySelectorAll<HTMLElement>(REVEAL).forEach((n) => { n.classList.add('lp-reveal'); io?.observe(n); });
    }
    return () => { io?.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, [reduced]);
  return { root, top, reduced };
}

function Section({ id, className, children }: { id?: string; className: string; children: ReactNode }) {
  return <section id={id} className={className}>{children}</section>;
}

/** The public front page: what the Ministry is doing with Osun EduOS, and the way in for each kind of user. */
export function Landing() {
  const { root, top, reduced } = usePageMotion();
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(!reduced);
  const [person, setPerson] = useState(1);
  const [flipped, setFlipped] = useState<number | null>(null);

  // The school day moves on by itself every five seconds until someone picks a time.
  useEffect(() => {
    if (!auto) return;
    const t = window.setTimeout(() => setStep((s) => (s + 1) % DAY.length), 5000);
    return () => window.clearTimeout(t);
  }, [auto, step]);

  const day = DAY[step];
  const half = LGAS.length / 2;
  const rowA = LGAS.slice(0, half);
  const rowB = LGAS.slice(half);

  return (
    <div className="lp" ref={root}>
      <header className="lp-top" ref={top}>
        <div className="lp-wrap">
          <div className="lp-bar">
            <Link to="/" className="lp-logo" aria-label="Osun EduOS home">
              <span className="lp-mark" aria-hidden="true">EO</span>
              <span><b>Osun EduOS</b><small>Ministry of Education, State of Osun</small></span>
            </Link>
            <nav className="lp-nav" aria-label="Sections">
              <a href="#day">A school day</a>
              <a href="#platform">The platform</a>
              <a href="#people">Who it serves</a>
              <a href="#trust">Data protection</a>
              <Link to="/verify">Check a report card</Link>
            </nav>
            <Link to="/login" className="lp-btn pri">Sign in <Arrow /></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <svg className="lp-adire" aria-hidden="true">
            <defs>
              <pattern id="lp-adire" width="96" height="96" patternUnits="userSpaceOnUse">
                <circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="24" cy="24" r="5" fill="currentColor" />
                <path d="M58 10l28 28M86 10L58 38" stroke="currentColor" strokeWidth="2" />
                <path d="M8 74l8-12 8 12 8-12 8 12" fill="none" stroke="currentColor" strokeWidth="2" />
                {[64, 72, 80].flatMap((y) => [64, 72, 80].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="currentColor" />))}
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#lp-adire)" />
          </svg>
          <div className="lp-wrap lp-hero-grid">
            <div>
              <span className="lp-pill lp-rise"><span className="dot" aria-hidden="true"><Icon d={I.spark} size="xs" stroke={2.4} /></span>Ministry of Education · State of Osun</span>
              <h1 className="lp-rise lp-d1">
                Built for every<br />
                <span className="lp-rot" aria-hidden="true">
                  {['pupil', 'teacher', 'parent', 'school'].map((w) => <span key={w} className="lp-accent">{w}</span>)}
                </span>
                <span className="sr-only">pupil, teacher, parent and school</span> in Osun.
              </h1>
              <p className="lp-lead lp-rise lp-d2">
                One trusted record for results, attendance, staff and school facilities, so every child is counted and every decision starts from real
                information across all 30 local government areas.
              </p>
              <div className="lp-cta lp-rise lp-d3">
                <Link to="/login" className="lp-btn pri">Sign in to EduOS <Arrow /></Link>
                <Link to="/verify" className="lp-btn ghost">Check a report card</Link>
              </div>
              <div className="lp-facts lp-rise lp-d4">
                <div><b>30</b><span>local government areas</span></div>
                <div><b>1</b><span>learner ID for every child</span></div>
                <div><b>0</b><span>signal needed to take a register</span></div>
              </div>
            </div>

            <div className="lp-visual">
              <figure className="lp-photo-main">
                <img src="/landing/pupils.webp" alt="Smiling primary school pupils in green and yellow uniforms" width="1100" height="729" />
                <figcaption className="lp-photo-tag"><i aria-hidden="true" />Present today · Primary 4A</figcaption>
              </figure>
              <div className="lp-phone" role="img" aria-label="A parent's view of the EduOS app: present today, a mathematics result, a released report card and a school notice">
                <div className="lp-screen" aria-hidden="true">
                  <div className="lp-notch" />
                  <span className="lp-hi">Good evening, Mrs Adeyemi</span>
                  <div className="lp-kid"><span className="lp-av">TA</span><div><b>Tolu Adeyemi</b><small>JSS 2B · Learner ID OS-24-0917</small></div></div>
                  <div className="lp-feed">
                    <div className="lp-feed-item"><span className="lp-fi g"><Icon d={I.tick} size="sm" stroke={2.4} /></span><div><b>Present today</b><small>Marked 7:52 am</small></div></div>
                    <div className="lp-feed-item"><span className="lp-fi y"><Icon d={I.bars} size="sm" stroke={2} /></span><div><b>Mathematics: 78 (B2)</b><small>First term result</small></div></div>
                    <div className="lp-feed-item"><span className="lp-fi b"><Icon d={I.doc} size="sm" stroke={2} /></span><div><b>Report card released</b><small>Tap to view and download</small></div></div>
                    <div className="lp-feed-item"><span className="lp-fi r"><Icon d={I.chat} size="sm" stroke={2} /></span><div><b>PTA meeting, Friday</b><small>From the principal</small></div></div>
                  </div>
                </div>
              </div>
              <span className="lp-chip c1" aria-hidden="true"><span className="ci"><Icon d={I.tick} size="sm" stroke={2.2} /></span>Attendance</span>
              <span className="lp-chip c2" aria-hidden="true"><span className="ci"><Icon d={I.doc} size="sm" stroke={2} /></span>Report cards</span>
              <span className="lp-chip c3" aria-hidden="true"><span className="ci"><Icon d={I.bars} size="sm" stroke={2} /></span>Results</span>
            </div>
          </div>
        </section>

        <section className="lp-trust" aria-label="About Osun EduOS">
          <div className="lp-wrap lp-trust-row">
            <p>An initiative of the Ministry of Education, State of Osun, for public and private schools across the state.</p>
            <span className="lp-badge"><Icon d={I.shield} />Designed around the Nigeria Data Protection Act 2023</span>
          </div>
          <div className="lp-stripe" aria-hidden="true" />
          <div className="lp-marq">
            <h2>Serving schools in all 30 local government areas</h2>
            <p className="sr-only">{LGAS.join(', ')}.</p>
            <ul className="lp-track" aria-hidden="true">
              {[...rowA, ...rowA, ...rowA, ...rowA].map((l, i) => <li key={i} className="lp-lga">{l}</li>)}
            </ul>
            <ul className="lp-track rev" aria-hidden="true">
              {[...rowB, ...rowB, ...rowB, ...rowB].map((l, i) => <li key={i} className="lp-lga">{l}</li>)}
            </ul>
          </div>
        </section>

        <Section id="day" className="lp-story">
          <div className="lp-wrap">
            <p className="lp-kicker">A school day in Osun · example</p>
            <h2 className="lp-h2">From the morning register to a <span className="lp-accent">parent&apos;s phone</span>.</h2>
            <div className="lp-story-grid">
              <div>
                <div className="lp-copy lp-fade" key={`copy-${step}`} aria-live="polite">
                  <span className="lp-when"><Icon d={I.clock} />{day.when}</span>
                  <h3>{day.title}</h3>
                  <p>{day.text}</p>
                </div>
                <div className="lp-tabs" role="tablist" aria-label="Times of the school day">
                  {DAY.map((d, i) => (
                    <button
                      key={d.tab}
                      type="button"
                      role="tab"
                      aria-selected={i === step}
                      className={i === step ? 'lp-tab on' : 'lp-tab'}
                      onClick={() => { setStep(i); setAuto(false); }}
                    >
                      <span className="bar">
                        {i === step && <span key={`run-${step}`} className={auto ? 'fill run' : 'fill paused'} />}
                        {i < step && <span className="fill paused" />}
                      </span>
                      {d.tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="lp-stage" key={`stage-${step}`}>
                <figure className="lp-photo-sm lp-fade"><img src={day.img} alt={day.alt} loading="lazy" /></figure>
                <DayCard step={step} />
              </div>
            </div>
          </div>
        </Section>

        <Section id="platform" className="lp-sec">
          <div className="lp-wrap">
            <div className="lp-sec-head">
              <div>
                <p className="lp-kicker">One platform, every record</p>
                <h2 className="lp-h2">Everything a school <span className="lp-accent">runs on</span>.</h2>
              </div>
              <p className="lp-sub">Each part replaces a paper process the Ministry and schools handle today.</p>
            </div>
            <div className="lp-bento">
              <article className="lp-card wide">
                <span className="lp-card-ic"><Icon d={I.results} /></span>
                <h3>Electronic results</h3>
                <p>Scores entered once become totals, grades, positions and report cards, submitted to the Ministry without a single form.</p>
                <div className="lp-demo lp-bars" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={i} />)}</div>
              </article>
              <article className="lp-card green">
                <span className="lp-card-ic"><Icon d={I.tick} /></span>
                <h3>Daily attendance</h3>
                <p>Registers taken on any phone, offline or online.</p>
                <div className="lp-demo lp-dots" aria-hidden="true">{Array.from({ length: 30 }, (_, i) => <i key={i} />)}</div>
              </article>
              <article className="lp-card gold">
                <span className="lp-card-ic"><Icon d={I.learner} /></span>
                <h3>A learner ID for life</h3>
                <p>One state-wide ID follows each child from school to school.</p>
                <div className="lp-demo lp-idcard" aria-hidden="true"><span className="lp-av">TA</span><div><b>Tolu Adeyemi</b><small>OS-24-0917 · JSS 2B</small></div></div>
              </article>
              <article className="lp-card red">
                <span className="lp-card-ic"><Icon d={I.school} /></span>
                <h3>School inspections</h3>
                <p>Facilities recorded on site, with follow-up tracked.</p>
                <ul className="lp-checks" aria-hidden="true">
                  {['Classrooms', 'Clean water', 'Toilets', 'Power and ICT'].map((c) => (
                    <li key={c}><span className="lp-box"><Icon d={I.tick} size="xs" stroke={3.5} /></span>{c}</li>
                  ))}
                </ul>
              </article>
              <article className="lp-card black">
                <span className="lp-card-ic"><Icon d={I.chart} /></span>
                <h3>Education dashboards</h3>
                <p>Enrolment, gender parity and pass rates by LGA.</p>
                <svg className="lp-demo lp-line" viewBox="0 0 300 110" width="100%" height="110" aria-hidden="true">
                  <path d="M0 100H300" stroke="#e5dbcf" strokeWidth="1" />
                  <path className="draw" d="M0 90 C40 80 60 60 100 64 S160 30 200 38 S260 14 300 10" fill="none" stroke="#7b5229" strokeWidth="3" strokeLinecap="round" />
                  <path className="draw late" d="M0 96 C50 92 80 80 120 78 S190 60 230 58 S280 44 300 40" fill="none" stroke="#08633a" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </article>
              <article className="lp-card wide green">
                <span className="lp-card-ic"><Icon d={I.chatLines} /></span>
                <h3>Parents kept in the loop</h3>
                <p>Results, attendance and school notices in the parent portal, with text messages for families without smartphones.</p>
                <div className="lp-demo lp-sms-row" aria-hidden="true">
                  <div className="lp-typing"><i /><i /><i /></div>
                  <p className="lp-sms">Osun EduOS: Tolu was marked absent today. Please contact the school if this is unexpected.</p>
                </div>
              </article>
            </div>
          </div>
        </Section>

        <Section id="people" className="lp-sec flush">
          <div className="lp-wrap">
            <div className="lp-people-head">
              <p className="lp-kicker">Who it serves</p>
              <h2 className="lp-h2">One system, the right view <span className="lp-accent">for each person</span>.</h2>
            </div>
            <div className="lp-people">
              {PEOPLE.map((p, i) => (
                <div key={p.title} className={i === person ? 'lp-person on' : 'lp-person'} onMouseEnter={() => setPerson(i)}>
                  <img src={p.img} alt={p.alt} loading="lazy" />
                  <button
                    type="button"
                    className="lp-person-btn"
                    aria-expanded={i === person}
                    aria-label={`Show more about ${p.title}`}
                    onClick={() => setPerson(i)}
                    onFocus={() => setPerson(i)}
                  />
                  <div className="lp-p-body">
                    <span className="lp-p-num">0{i + 1}</span>
                    <h3>{p.title}</h3>
                    {i === person && (
                      <>
                        <p className="lp-p-more">{p.text}</p>
                        {p.to.startsWith('#')
                          ? <a className="lp-p-link" href={p.to}>{p.cta} →</a>
                          : <Link className="lp-p-link" to={p.to}>{p.cta} →</Link>}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section className="lp-sec white">
          <div className="lp-wrap">
            <div className="lp-sec-head">
              <div>
                <p className="lp-kicker">Getting a school started</p>
                <h2 className="lp-h2">From paper registers to <span className="lp-accent">live records</span> in three steps.</h2>
              </div>
            </div>
            <div className="lp-steps">
              <article className="lp-step">
                <div className="lp-mini" aria-hidden="true">
                  <div className="lp-field"><span>School number</span><b>OS/0412</b></div>
                  <div className="lp-field"><span>LGA</span><b>Ilesa East</b></div>
                  <div className="lp-field ok">Registered by the Ministry</div>
                </div>
                <div className="lp-n">STEP 01 <span className="lp-tag">Ministry</span></div>
                <h3>The school is registered</h3>
                <p>The Ministry registers the school and issues its administrator account.</p>
                <div className="lp-prog" aria-hidden="true"><i /></div>
              </article>
              <article className="lp-step">
                <div className="lp-mini row" aria-hidden="true">
                  <svg className="lp-ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="#e5dbcf" strokeWidth="6" /><circle className="p" cx="32" cy="32" r="28" fill="none" stroke="#7b5229" strokeWidth="6" strokeLinecap="round" transform="rotate(-90 32 32)" /></svg>
                  <div><b>Learners imported</b><br />From the school&apos;s existing spreadsheet. Each child gets a learner ID.</div>
                </div>
                <div className="lp-n">STEP 02 <span className="lp-tag">School</span></div>
                <h3>Classes and learners added</h3>
                <p>Staff, classes and pupils come in from a spreadsheet, not by retyping.</p>
                <div className="lp-prog" aria-hidden="true"><i /></div>
              </article>
              <article className="lp-step">
                <div className="lp-mini dark" aria-hidden="true">
                  <div className="t1">FIRST TERM</div>
                  <div className="t2">Results released</div>
                  <div className="pills"><span>Registers daily</span><span>Scores each term</span></div>
                </div>
                <div className="lp-n">STEP 03 <span className="lp-tag">Teachers</span></div>
                <h3>Teaching staff take over</h3>
                <p>Teachers take registers and enter scores; parents and the Ministry see the results.</p>
                <div className="lp-prog" aria-hidden="true"><i /></div>
              </article>
            </div>
          </div>
        </Section>

        <Section className="lp-sec">
          <div className="lp-wrap">
            <div className="lp-goals">
              <div>
                <p className="lp-kicker">Bigger than a database</p>
                <h2 className="lp-h2">Helping Osun deliver on the <span className="lp-accent">global goals</span> for education.</h2>
                <p className="lp-sub">Reliable records show where children are missing out, so support reaches the schools that need it most.</p>
                <p className="lp-turn"><Icon d={I.turn} size="sm" stroke={2} />Hover, tap or tab to a goal to turn it over</p>
              </div>
              <ul className="lp-flip-grid">
                {GOALS.map((g, i) => (
                  <li key={g.num} className={flipped === i ? 'lp-flip on' : 'lp-flip'}>
                    <button type="button" className="lp-flip-btn" aria-pressed={flipped === i} onClick={() => setFlipped(flipped === i ? null : i)}>
                      <span className="sr-only">Goal {g.num}, {g.name}: {g.back}</span>
                    </button>
                    <span className="lp-flip-in" aria-hidden="true">
                      <span className={`lp-face ${g.cls}`}><b>{g.num}</b><span>{g.name}</span></span>
                      <span className="lp-face back">{g.back}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section id="trust" className="lp-sec lp-dark">
          <div className="lp-rings" aria-hidden="true"><i /><i /><i /></div>
          <div className="lp-wrap lp-dark-grid">
            <div>
              <p className="lp-kicker">Data protection</p>
              <h2 className="lp-h2">Children&apos;s records, protected to the <span className="lp-accent">standard they deserve</span>.</h2>
              <p className="lp-sub">
                Osun EduOS is designed around the Nigeria Data Protection Act 2023. Each person sees only what their role needs, and the Ministry stays in
                control of the data.
              </p>
            </div>
            <ul className="lp-shields">
              <li><Icon d={I.shield} /><span><b>Two-step sign-in</b> for Ministry accounts, with an authenticator app</span></li>
              <li><Icon d={I.lock} /><span><b>Encrypted</b> on phones and in transit; passwords are never stored</span></li>
              <li><Icon d={I.audit} /><span><b>Every change recorded</b> in an audit log, so records can be trusted</span></li>
              <li><Icon d={I.person} /><span><b>Role-based access</b>: a teacher sees their classes, a parent sees their own child</span></li>
            </ul>
          </div>
        </Section>

        <Section className="lp-sec">
          <div className="lp-wrap">
            <div className="lp-band">
              <div className="lp-rings" aria-hidden="true"><i /><i /><i /></div>
              <div>
                <h2>Received an Osun report card? <span className="lp-accent">Check it in seconds.</span></h2>
                <p>Enter the code printed at the bottom to confirm it matches the results the school released.</p>
              </div>
              <div className="lp-cta">
                <Link to="/verify" className="lp-btn gold">Check a report card</Link>
                <Link to="/login" className="lp-btn line">Sign in</Link>
              </div>
            </div>
          </div>
        </Section>
      </main>

      <footer className="lp-foot">
        <div className="lp-wrap">
          <div className="lp-foot-grid">
            <div>
              <Link to="/" className="lp-logo" aria-label="Osun EduOS home">
                <span className="lp-mark" aria-hidden="true">EO</span>
                <span><b>Osun EduOS</b><small>Ministry of Education, State of Osun</small></span>
              </Link>
              <p>Education management and intelligence for every school in the State of Osun.</p>
            </div>
            <nav aria-label="Use EduOS">
              <h2>Use EduOS</h2>
              <Link to="/login">Sign in</Link>
              <Link to="/verify">Check a report card</Link>
              <a href="#day">A school day</a>
            </nav>
            <nav aria-label="Learn more">
              <h2>Learn more</h2>
              <a href="#platform">The platform</a>
              <a href="#people">Who it serves</a>
              <a href="#trust">Data protection</a>
            </nav>
          </div>
          <div className="lp-giant" aria-hidden="true">Osun EduOS</div>
          <div className="lp-legal">
            <span>© {new Date().getFullYear()} Ministry of Education, State of Osun. All rights reserved.</span>
            <span>Photos: Unsplash (Abubakar Balogun, Emmanuel Ikwuegbu, Dike Darion, Ben White, Sipho Ngondo, David Rotimi)</span>
            <a className="lp-totop" href="#root" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); }}>Back to top ↑</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
