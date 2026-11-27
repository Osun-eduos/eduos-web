import { ReactNode, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/** Small line icons drawn inline, so the page loads nothing from other sites. */
function Icon({ d }: { d: string }) {
  return (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
const I = {
  results: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6M10 9h2',
  learner: 'M12 3l9 4.5-9 4.5L3 7.5zM6.5 9.5V15c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3V9.5M21 7.5V13',
  staff: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.5 3.5 5.2',
  school: 'M3 21h18M5 21V10l7-5 7 5v11M9 21v-5h6v5M12 10.5v.01',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  parents: 'M4 5h16v11H8l-4 4zM8 9h8M8 12h5',
  offline: 'M12 18.5v.01M8.5 15a5 5 0 0 1 7 0M5 11.5a10 10 0 0 1 14 0M3 3l18 18',
  phone: 'M7 2h10v20H7zM11 18h2',
  shield: 'M12 3l8 3v6c0 4.5-3.3 8.3-8 9-4.7-.7-8-4.5-8-9V6zM9 12l2 2 4-4',
  check: 'M20 6L9 17l-5-5',
};

function Pillar({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <article className="pillar">
      <span className="pillar-ic"><Icon d={icon} /></span>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}

/** The public front page: what the Ministry is doing with Osun EduOS, and the way in for each kind of user. */
/** Content that fades up as it scrolls into view. Everything stays visible if the browser can't observe scrolling. */
const REVEAL = '.lp-section .lp-kicker, .lp-section h2, .lp-sub, .pillar, .lp-feature, .lp-who article, .lp-note, .lp-checks li, .lp-band-grid';

function useLandingMotion() {
  const root = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onScroll = () => top.current?.classList.toggle('scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return () => window.removeEventListener('scroll', onScroll);
    }
    const items = Array.from(el.querySelectorAll<HTMLElement>(REVEAL));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    items.forEach((i) => { i.classList.add('reveal'); io.observe(i); });
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, []);
  return { root, top };
}

export function Landing() {
  const { root, top } = useLandingMotion();
  return (
    <div className="lp" ref={root}>
      <header className="lp-top" ref={top}>
        <div className="lp-wrap lp-bar">
          <Link to="/" className="lp-logo" aria-label="Osun EduOS home">
            <span className="lp-mark" aria-hidden="true">EO</span>
            <span>
              <b>Osun EduOS</b>
              <small>Ministry of Education, State of Osun</small>
            </span>
          </Link>
          <nav className="lp-links" aria-label="Sections">
            <a href="#mission">Our mission</a>
            <a href="#how">How it works</a>
            <a href="#who">Who it is for</a>
            <a href="#trust">Data protection</a>
            <Link to="/verify">Check a report card</Link>
          </nav>
          <Link to="/login" className="btn pri">Sign in</Link>
        </div>
        <div className="lp-stripe" aria-hidden="true" />
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-wrap lp-hero-grid">
            <div>
              <p className="lp-kicker">Ministry of Education · State of Osun</p>
              <h1>One trusted record for every school, teacher and learner in Osun.</h1>
              <p className="lp-lead">
                Osun EduOS replaces hand-compiled results with electronic submission, and gives the Ministry current, reliable information
                about education in all 30 local government areas.
              </p>
              <div className="lp-cta">
                <Link to="/login" className="btn pri lg">Sign in to EduOS</Link>
                <Link to="/verify" className="btn lg">Check a report card</Link>
              </div>
              <ul className="lp-facts">
                <li><Icon d={I.check} /> Public and private schools</li>
                <li><Icon d={I.check} /> Works without internet</li>
                <li><Icon d={I.check} /> All 30 local government areas</li>
              </ul>
            </div>
            <div className="lp-flow" aria-label="How a term's results move through Osun EduOS">
              <div className="lp-flow-card">
                <span className="lp-step">1</span>
                <div><b>Teacher enters scores</b><small>On the web or the app, even offline</small></div>
              </div>
              <div className="lp-flow-card">
                <span className="lp-step">2</span>
                <div><b>School approves and releases</b><small>Grades and positions worked out automatically</small></div>
              </div>
              <div className="lp-flow-card">
                <span className="lp-step">3</span>
                <div><b>Parents see the report card</b><small>With a code anyone can verify</small></div>
              </div>
              <div className="lp-flow-card gold">
                <span className="lp-step">4</span>
                <div><b>Ministry sees every LGA</b><small>Pass rates, attendance and needs, as they happen</small></div>
              </div>
            </div>
          </div>
        </section>

        <section id="mission" className="lp-section">
          <div className="lp-wrap">
            <p className="lp-kicker">Our mission</p>
            <h2>What the Ministry is driving with technology</h2>
            <p className="lp-sub">
              Results compiled by hand are slow, error-prone and hard to compare across thousands of schools. Osun EduOS gives every school one
              digital route for its records, and gives the Ministry one place to see them.
            </p>
            <div className="lp-pillars">
              <Pillar icon={I.results} title="Electronic results">
                Teachers enter continuous assessment and exam scores once. Totals, grades and report cards follow automatically, and the school
                submits to the Ministry electronically.
              </Pillar>
              <Pillar icon={I.learner} title="Every learner counted">
                Each pupil has one state-wide learner ID for life, so their attendance and academic history follow them when they change school.
              </Pillar>
              <Pillar icon={I.staff} title="Teachers and staff">
                A staff registry with qualifications, postings, training and daily attendance, so the Ministry can see where teachers are needed.
              </Pillar>
              <Pillar icon={I.school} title="Safe, well-equipped schools">
                Inspectors record classrooms, water, toilets, power and ICT on site, with photos and follow-up actions that are tracked to completion.
              </Pillar>
              <Pillar icon={I.chart} title="Decisions from evidence">
                Dashboards for the State and each LGA: enrolment, gender parity, pupils per teacher, attendance, pass rates and schools needing support.
              </Pillar>
              <Pillar icon={I.parents} title="Parents in the loop">
                Parents see results, attendance and announcements in the parent portal, and get a text message when their child is absent.
              </Pillar>
            </div>
          </div>
        </section>

        <section id="how" className="lp-section alt">
          <div className="lp-wrap">
            <p className="lp-kicker">How it works</p>
            <h2>Built for every school in Osun, not just the connected ones</h2>
            <div className="lp-split">
              <div className="lp-feature">
                <Icon d={I.offline} />
                <div>
                  <h3>Works offline</h3>
                  <p>Teachers take the register and enter scores on a phone with no signal. The app keeps everything encrypted and sends it when a connection returns.</p>
                </div>
              </div>
              <div className="lp-feature">
                <Icon d={I.phone} />
                <div>
                  <h3>Light on data and devices</h3>
                  <p>Designed for older Android phones and slow networks. Parents without smartphones still receive text messages.</p>
                </div>
              </div>
              <div className="lp-feature">
                <Icon d={I.results} />
                <div>
                  <h3>One set of rules</h3>
                  <p>Grading, approval and release follow the same rules in every school, so results from Ilesa and Iwo can be compared fairly.</p>
                </div>
              </div>
              <div className="lp-feature">
                <Icon d={I.check} />
                <div>
                  <h3>Report cards you can trust</h3>
                  <p>Every released report card carries a verification code. Employers, schools and parents can check it online in seconds.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="who" className="lp-section">
          <div className="lp-wrap">
            <p className="lp-kicker">Who it is for</p>
            <h2>One system, the right view for each person</h2>
            <div className="lp-who">
              <article>
                <h3>Ministry and LGA officers</h3>
                <p>State and LGA dashboards, school registration, inspections, staff postings and education indicators.</p>
              </article>
              <article>
                <h3>School administrators</h3>
                <p>Enrolment, class allocation, attendance, staff records, results approval and report cards for your school.</p>
              </article>
              <article>
                <h3>Teachers</h3>
                <p>Daily registers and score entry for your classes, on the web or the EduOS app, with or without internet.</p>
              </article>
              <article>
                <h3>Parents and guardians</h3>
                <p>Your child's results, attendance and school announcements, with text messages when something needs your attention.</p>
              </article>
            </div>
            <p className="lp-note">
              Accounts are issued by your school or the Ministry. Forgot your password? Ask your school administrator; school administrators contact the
              Ministry. <Link to="/login">Sign in</Link>
            </p>
          </div>
        </section>

        <section id="trust" className="lp-section alt">
          <div className="lp-wrap lp-trust">
            <div>
              <p className="lp-kicker">Data protection</p>
              <h2>Children's records, protected to the standard they deserve</h2>
              <p className="lp-sub">
                Osun EduOS is designed around the Nigeria Data Protection Act 2023. Each person sees only what their role needs, and the Ministry
                stays in control of the data.
              </p>
            </div>
            <ul className="lp-checks">
              <li><Icon d={I.shield} /><span><b>Two-step sign-in</b> for Ministry accounts, with an authenticator app</span></li>
              <li><Icon d={I.shield} /><span><b>Encrypted</b> on phones and in transit; passwords are never stored</span></li>
              <li><Icon d={I.shield} /><span><b>Every change recorded</b> in an audit log, so records can be trusted</span></li>
            </ul>
          </div>
        </section>

        <section className="lp-band">
          <div className="lp-wrap lp-band-grid">
            <div>
              <h2>Received an Osun report card?</h2>
              <p>Check that it matches the results the school released, using the code printed at the bottom.</p>
            </div>
            <Link to="/verify" className="btn lg gold">Check a report card</Link>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-stripe" aria-hidden="true" />
        <div className="lp-wrap lp-foot-grid">
          <div>
            <b>Osun EduOS</b>
            <p>Education management and intelligence for the Ministry of Education, State of Osun.</p>
          </div>
          <nav aria-label="Footer">
            <Link to="/login">Sign in</Link>
            <Link to="/verify">Check a report card</Link>
          </nav>
          <p className="lp-legal">© {new Date().getFullYear()} Ministry of Education, State of Osun. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
