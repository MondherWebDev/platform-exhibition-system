"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "../../../firebaseConfig";
import { collection, doc, onSnapshot, query, orderBy, getDoc } from "firebase/firestore";
import { auth } from "../../../firebaseConfig";
import AuthSection from "../../AuthSection";

interface Exhibitor { id: string; name: string; company?: string; description?: string; boothId?: string; tags?: string[]; logoUrl?: string; }
interface Sponsor { id: string; name: string; tier: "gold"|"silver"|"bronze"; logoUrl?: string; }
interface Speaker { id: string; name: string; title?: string; company?: string; photoUrl?: string; tags?: string[]; }
interface HostedBuyer { id: string; name: string; company?: string; notes?: string; photoUrl?: string; }
interface Session { id: string; title: string; day: string; start: string; end: string; room?: string; speakerIds?: string[]; }

export default function EventPublicPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const eventId = (params?.eventId || "").toString();

  // Data
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [buyers, setBuyers] = useState<HostedBuyer[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [config, setConfig] = useState<any>({});
  const [eventMeta, setEventMeta] = useState<any>(null);

  // UI state
  const [modalExhibitor, setModalExhibitor] = useState<Exhibitor | null>(null);
  const [activeDay, setActiveDay] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Refs
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const speakersStripRef = useRef<HTMLDivElement>(null);

  // Subscriptions
  useEffect(() => {
    if (!eventId) return;
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(
      collection(db, "Events", eventId, "Exhibitors"),
      (snap) => setExhibitors(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Exhibitor[]),
      () => setExhibitors([])
    ));

    unsubs.push(onSnapshot(
      collection(db, "Events", eventId, "Sponsors"),
      (snap) => setSponsors(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Sponsor[]),
      () => setSponsors([])
    ));

    unsubs.push(onSnapshot(
      collection(db, "Events", eventId, "Speakers"),
      (snap) => setSpeakers(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Speaker[]),
      () => setSpeakers([])
    ));

    unsubs.push(onSnapshot(
      collection(db, "Events", eventId, "HostedBuyers"),
      (snap) => setBuyers(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as HostedBuyer[]),
      () => setBuyers([])
    ));

    unsubs.push(onSnapshot(
      query(collection(db, "Events", eventId, "Sessions"), orderBy("day")),
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Session[];
        setSessions(list);
        const keys = Array.from(new Set(list.map(s => s.day))).sort();
        if (!activeDay && keys.length) setActiveDay(keys[0]);
      },
      () => setSessions([])
    ));

    unsubs.push(onSnapshot(
      doc(db, "Events", eventId, "Config", "default"),
      (snap) => { if (snap.exists()) setConfig(snap.data()); else setConfig({}); },
      () => setConfig({})
    ));

    unsubs.push(onSnapshot(
      doc(db, "Events", eventId),
      async (snap) => {
        if (!snap.exists()) {
          setEventMeta(null);
          return;
        }
        const em = snap.data();
        setEventMeta(em);
        // Event page is now publicly accessible to everyone
        // No permission restrictions - users can view active or inactive events
      },
      () => {
        setEventMeta(null);
      }
    ));

    return () => { unsubs.forEach(u => u()); };
  }, [eventId, activeDay, router]);

  // Floorplan injection + booth hover 3D
  useEffect(() => {
    let cancelled = false;
    async function loadSvg() {
      let svgText: string | null = null;
      try {
        if (config?.floorplanSvg && typeof config.floorplanSvg === 'string' && config.floorplanSvg.includes('<svg')) {
          svgText = config.floorplanSvg as string;
        } else if (config?.floorplanUrl && typeof config.floorplanUrl === 'string' && String(config.floorplanUrl).toLowerCase().includes('.svg')) {
          const res = await fetch(config.floorplanUrl as string);
          svgText = await res.text();
        } else { if (svgContainerRef.current) svgContainerRef.current.innerHTML = ''; return; }
        if (cancelled || !svgText || !svgContainerRef.current) return;
        svgContainerRef.current.innerHTML = svgText;
        const root = svgContainerRef.current.querySelector('svg');
        if (!root) return;
        // Inject gradient for 3D booth depth
        try {
          const svgNS = 'http://www.w3.org/2000/svg';
          let defs = root.querySelector('defs');
          if (!defs) {
            defs = document.createElementNS(svgNS, 'defs');
            root.insertBefore(defs, root.firstChild);
          }
          let grad = root.querySelector('#boothGrad');
          if (!grad) {
            grad = document.createElementNS(svgNS, 'linearGradient');
            grad.setAttribute('id', 'boothGrad');
            grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
            grad.setAttribute('x2', '0%'); grad.setAttribute('y2', '100%');
            const stop1 = document.createElementNS(svgNS, 'stop'); stop1.setAttribute('offset','0%'); stop1.setAttribute('stop-color','#1e293b');
            const stop2 = document.createElementNS(svgNS, 'stop'); stop2.setAttribute('offset','100%'); stop2.setAttribute('stop-color','#0b1020');
            grad.appendChild(stop1); grad.appendChild(stop2);
            defs.appendChild(grad);
          }
        } catch {}
        const rects = root.querySelectorAll('rect[id]');
        rects.forEach((el: any) => {
          try {
            if (!el.getAttribute('rx')) el.setAttribute('rx', '6');
            el.setAttribute('fill','url(#boothGrad)');
            el.style.filter = 'drop-shadow(0 6px 14px rgba(0,0,0,0.45))';
            el.style.transformOrigin = '50% 50%';
            el.style.transition = 'filter 160ms ease, transform 160ms ease';
            el.addEventListener('mouseenter', () => {
              el.dataset._prevStroke = el.getAttribute('stroke') || '';
              el.setAttribute('stroke', '#60a5fa');
              if (!el.getAttribute('stroke-width')) el.setAttribute('stroke-width', '2');
              el.style.filter = 'drop-shadow(0 10px 24px rgba(0,0,0,0.55))';
              el.style.transform = 'scale(1.02)';
            });
            el.addEventListener('mouseleave', () => {
              const prev = el.dataset._prevStroke;
              if (prev) el.setAttribute('stroke', prev); else el.removeAttribute('stroke');
              el.style.filter = 'drop-shadow(0 6px 14px rgba(0,0,0,0.45))';
              el.style.transform = 'scale(1)';
            });
          } catch {}
        });
        svgContainerRef.current.onclick = (e) => {
          const target = e.target as HTMLElement;
          const el = target?.closest('[id]') as HTMLElement | null;
          const bid = el?.id?.trim();
          if (!bid) return;
          const ex = exhibitors.find(x => (x.boothId || '').toLowerCase() === bid.toLowerCase());
          if (ex) setModalExhibitor(ex);
        };
      } catch {}
    }
    loadSvg();
    return () => { cancelled = true; if (svgContainerRef.current) svgContainerRef.current.onclick = null; };
  }, [config, exhibitors]);

  // Apply zoom to floorplan SVG
  useEffect(() => {
    const root = svgContainerRef.current?.querySelector('svg') as SVGSVGElement | null;
    if (root) {
      root.style.transformOrigin = '0 0';
      root.style.transform = `scale(${zoom})`;
    }
  }, [zoom]);

  // Simple animations without ScrollTrigger - only run once on mount
  useEffect(() => {
    let cancelled = false;
    let hasAnimated = false;

    (async () => {
      try {
        const gsapMod: any = await import('gsap');
        const gsap = gsapMod.default || gsapMod;
        if (cancelled || hasAnimated) return;

        // Simple fade-in animations that don't interfere with scrolling
        gsap.from('.animate-hero', {
          y: 16,
          opacity: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: 'power3.out',
          delay: 0.2
        });

        // Simple reveal animations without ScrollTrigger
        gsap.from('.reveal', {
          y: 18,
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.1,
          delay: 0.5
        });

        hasAnimated = true;
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []); // Empty dependency array - only run once on mount

  // Derived
  const sponsorsByTier = useMemo(() => {
    const map: Record<string, Sponsor[]> = { gold: [], silver: [], bronze: [] };
    sponsors.forEach((s) => { (map[s.tier] ||= []).push(s); });
    return map;
  }, [sponsors]);

  const sessionsByDay = useMemo(() => {
    const m: Record<string, Session[]> = {};
    sessions.forEach((s) => { (m[s.day] ||= []).push(s); });
    Object.keys(m).forEach((d) => m[d].sort((a, b) => (a.start || "").localeCompare(b.start || "")));
    return m;
  }, [sessions]);

  const dayKeys = useMemo(() => Object.keys(sessionsByDay).sort(), [sessionsByDay]);
  const primary = (eventMeta?.theme?.primary as string) || '#0d6efd';
  const secondary = (eventMeta?.theme?.secondary as string) || '#fd7e14';

  // Carousel helpers
  const scrollSpeakers = (dir: 1 | -1) => {
    const el = speakersStripRef.current; if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuOpen && !(event.target as Element)?.closest('header')) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  // Smooth scroll function for navigation links
  const smoothScrollTo = (targetId: string) => {
    const target = document.querySelector(targetId);
    if (target) {
      const headerHeight = 80; // Account for fixed header
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white relative overflow-hidden font-sans">
      {/* Enhanced Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 w-[46rem] h-[46rem] rounded-full blur-3xl animate-float" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', opacity: 0.3 }} />
        <div className="absolute top-1/3 -right-24 w-[40rem] h-[40rem] rounded-full blur-3xl animate-float" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', opacity: 0.25, animationDelay: '2s' }} />
        <div className="absolute bottom-[-10rem] left-1/3 w-[52rem] h-[52rem] bg-gradient-to-r from-cyan-400/20 to-purple-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.15),rgba(249,115,22,0.1)_40%,rgba(236,72,153,0.08)_70%,rgba(15,20,25,0.95))]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(103,126,234,0.1),transparent_70%)]" />
      </div>

      {/* Enhanced Sticky header with hamburger menu */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-gradient-to-r from-blue-900/90 via-purple-900/90 to-blue-900/90 border-b border-blue-500/20 shadow-2xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {eventMeta?.bannerLogoUrl ? (
              <img src={eventMeta.bannerLogoUrl} alt="Logo" className="block select-none pointer-events-none" style={{ height: 'auto', width: 'auto', maxHeight: '48px' }} />
            ) : null}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-white/80">
            <button onClick={() => smoothScrollTo('#exhibitors')} className="hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg cursor-pointer transition-colors">Exhibitors</button>
            <button onClick={() => smoothScrollTo('#sponsors')} className="hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg cursor-pointer transition-colors">Sponsors</button>
            <button onClick={() => smoothScrollTo('#buyers')} className="hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg cursor-pointer transition-colors">Hosted Buyers</button>
            <button onClick={() => smoothScrollTo('#speakers')} className="hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg cursor-pointer transition-colors">Speakers</button>
            <button onClick={() => smoothScrollTo('#agenda')} className="hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg cursor-pointer transition-colors">Agenda</button>
            <button onClick={() => smoothScrollTo('#floorplan')} className="hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg cursor-pointer transition-colors">Floorplan</button>
            <a href="/signin" className="bg-[#0d6efd] hover:bg-[#fd7e14] text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Login
            </a>
          </nav>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-3">
            {/* Login Button for Mobile */}
            <button
              onClick={() => router.push('/signin')}
              className="bg-[#0d6efd] hover:bg-[#fd7e14] text-white px-3 py-2 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Login
            </button>

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex flex-col justify-center items-center w-8 h-8 space-y-1 cursor-pointer"
              aria-label="Toggle menu"
            >
              <span className={`w-6 h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`w-6 h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`w-6 h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`md:hidden transition-all duration-300 overflow-hidden ${mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <nav className="px-4 py-4 bg-[#0f1419]/80 backdrop-blur-md border-t border-white/10">
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => { smoothScrollTo('#exhibitors'); setMobileMenuOpen(false); }}
                className="text-white/80 hover:text-white py-2 px-3 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                Exhibitors
              </button>
              <button
                onClick={() => { smoothScrollTo('#sponsors'); setMobileMenuOpen(false); }}
                className="text-white/80 hover:text-white py-2 px-3 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                Sponsors
              </button>
              <button
                onClick={() => { smoothScrollTo('#buyers'); setMobileMenuOpen(false); }}
                className="text-white/80 hover:text-white py-2 px-3 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                Hosted Buyers
              </button>
              <button
                onClick={() => { smoothScrollTo('#speakers'); setMobileMenuOpen(false); }}
                className="text-white/80 hover:text-white py-2 px-3 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                Speakers
              </button>
              <button
                onClick={() => { smoothScrollTo('#agenda'); setMobileMenuOpen(false); }}
                className="text-white/80 hover:text-white py-2 px-3 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                Agenda
              </button>
              <button
                onClick={() => { smoothScrollTo('#floorplan'); setMobileMenuOpen(false); }}
                className="text-white/80 hover:text-white py-2 px-3 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                Floorplan
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 pt-16 md:pt-20">
        <div className="relative overflow-hidden">
          {eventMeta?.bannerImageUrl ? (
            <img src={eventMeta.bannerImageUrl} alt="Event banner" className="absolute inset-0 w-full h-full object-cover opacity-80" />
          ) : null}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(15,20,25,0.7), rgba(15,20,25,0.95))` }} />
          <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-18 text-center">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-clip-text text-transparent animate-hero" style={{ backgroundImage: `linear-gradient(100deg, #fff, rgba(255,255,255,0.85), ${primary}, ${secondary})` }}>
              {eventMeta?.name || 'Event'}
            </h1>
            <div className="mt-3 text-white/80 text-sm md:text-base flex flex-wrap gap-3 justify-center animate-hero">
              <span>
                {[eventMeta?.startDate, eventMeta?.startTime].filter(Boolean).join(' ')}
                {eventMeta?.endDate || eventMeta?.endTime ? (
                  <> — {[eventMeta?.endDate, eventMeta?.endTime].filter(Boolean).join(' ')} </>
                ) : null}
              </span>
              {eventMeta?.location ? <span className="opacity-80">• {eventMeta.location}</span> : null}
            </div>
            {eventMeta?.description ? (
              <p className="mt-4 text-white/70 max-w-3xl mx-auto text-justify animate-hero">{eventMeta.description}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <a href="/register" className="px-5 py-3 rounded-2xl text-white font-semibold animate-hero transition-colors flex items-center gap-2" style={{ background: primary }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Register for Event
              </a>
              <a href="#agenda" className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold animate-hero cursor-pointer transition-colors">View Agenda</a>
            </div>
          </div>
        </div>
      </section>



      {/* Exhibitors */}
      <section id="exhibitors" className="relative z-10 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-6 text-center tracking-wide uppercase">Exhibitors</h2>
          {exhibitors.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {exhibitors.map((x) => (
                <button key={x.id} onClick={() => setModalExhibitor(x)} className="text-left group relative rounded-2xl bg-[#0f1e2e]/70 border border-white/10 p-5 transition hover:bg-[#13263a] hover:shadow-2xl reveal cursor-pointer">
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-full bg-amber-400/90 text-[#0f1419] text-[11px] font-semibold tracking-wide uppercase">
                      Stand No.: {x.boothId || '-'}
                    </span>
                  </div>
                  <div className="pt-6 pb-4">
                    {x.logoUrl ? (
                      <img src={x.logoUrl} alt={x.company || x.name} className="mx-auto h-24 sm:h-28 object-contain" />
                    ) : (
                      <div className="mx-auto h-24 sm:h-28 w-full bg-white/5 rounded flex items-center justify-center">
                        <span className="text-white/60 text-sm">No Logo</span>
                      </div>
                    )}
                  </div>
                  <div className="text-center font-extrabold text-white text-lg leading-snug">{x.company || x.name}</div>
                </button>
              ))}
            </div>
          ) : <div className="text-white/60 text-center">No exhibitors yet.</div>}
        </div>
      </section>

      {/* Sponsors */}
      <section id="sponsors" className="relative z-10 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-6 text-center tracking-wide uppercase">Sponsors</h2>
          {["gold","silver","bronze"].map((tier) => (
            <div key={tier} className="mb-6 reveal">
              <div className="text-center text-lg font-semibold capitalize mb-3">{tier}</div>
              {sponsorsByTier[tier]?.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                  {sponsorsByTier[tier].map((s) => (
                    <div key={s.id} className="rounded-2xl bg-[#0f1e2e]/70 border border-white/10 p-5 min-h-[220px] grid place-items-center hover:bg-[#13263a] transition reveal">
                      {s.logoUrl ? <img src={s.logoUrl} alt={s.name} className="h-24 object-contain" /> : <span className="text-sm text-white/80">{s.name}</span>}
                    </div>
                  ))}
                </div>
              ) : <div className="text-white/60 text-center">No {tier} sponsors.</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Hosted Buyers */}
      <section id="buyers" className="relative z-10 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-6 text-center tracking-wide uppercase">Hosted Buyers</h2>
          {buyers.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {buyers.map((b) => (
                <div key={b.id} className="rounded-2xl bg-[#0f1e2e]/70 border border-white/10 p-5 min-h-[220px] hover:bg-[#13263a] transition reveal">
                  <div className="flex flex-col items-center gap-3">
                    {b.photoUrl ? <img src={b.photoUrl} alt={b.name} className="h-24 w-24 rounded-full object-cover" /> : <div className="h-24 w-24 rounded-full bg-white/10" />}
                    <div className="text-center">
                      <div className="font-semibold text-white">{b.name}</div>
                      <div className="text-white/60 text-sm">{b.company || ''}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-white/60 text-center">No hosted buyers yet.</div>}
        </div>
      </section>

      {/* Speakers carousel */}
      <section id="speakers" className="relative z-10 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-6 text-center tracking-wide uppercase">Speakers</h2>
          {speakers.length ? (
            <div className="relative reveal">
              <div className="hidden">
                <button onClick={() => scrollSpeakers(-1)} className="px-3 py-1.5 rounded bg:white/10 hover:bg-white/20 border border-white/10">Prev</button>
                <button onClick={() => scrollSpeakers(1)} className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 border border-white/10">Next</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {speakers.map((sp) => (
                  <div key={sp.id} className="rounded-2xl bg-[#0f1e2e]/70 border border-white/10 p-5 flex flex-col items-center gap-3 hover:bg-[#13263a] transition">
                    {sp.photoUrl ? <img src={sp.photoUrl} alt={sp.name} className="h-14 w-14 object-cover rounded-full" /> : <div className="h-14 w-14 bg-white/10 rounded-full" />}
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{sp.name}</div>
                      <div className="text-white/60 text-sm truncate">{sp.title} {sp.company ? `@ ${sp.company}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="text-white/60 text-center">No speakers yet.</div>}
        </div>
      </section>

      {/* Agenda with Day tabs */}
      <section id="agenda" className="relative z-10 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-6 text-center tracking-wide uppercase">Agenda</h2>
          {dayKeys.length ? (
            <>
              <div className="flex flex-wrap justify-center gap-2 mb-6 reveal">
                {dayKeys.map((d, idx) => (
                  <button key={d} onClick={() => setActiveDay(d)} className={`px-4 py-2 rounded-full border cursor-pointer transition-colors ${activeDay===d ? 'bg-white/20 border-white/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>Day {idx+1}</button>
                ))}
              </div>
              <div className="space-y-3">
                {(sessionsByDay[activeDay] || []).map((s) => (
                  <div key={s.id} className="rounded-2xl bg-[#0f1e2e]/70 border border-white/10 p-4 reveal">
                    <div className="text-white font-semibold">{s.start}-{s.end} • {s.title}</div>
                    <div className="text-white/60 text-sm">{s.room}</div>
                    {s.speakerIds?.length ? (
                      <div className="text-white/80 text-sm">Speakers: {s.speakerIds.map((id) => speakers.find(sp=>sp.id===id)?.name || id).join(', ')}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : <div className="text-white/60 text-center">Agenda will be announced.</div>}
        </div>
      </section>

      {/* Floorplan */}
      <section id="floorplan" className="relative z-10 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-6 text-center tracking-wide uppercase">Floorplan</h2>
          <div className="flex justify-end gap-2 mb-2">
            <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))} className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 border border-white/10 cursor-pointer transition-colors">-</button>
            <button onClick={() => setZoom(z => Math.min(3, +(z + 0.1).toFixed(2)))} className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 border border-white/10 cursor-pointer transition-colors">+</button>
          </div>
          {config?.floorplanSvg || config?.floorplanUrl ? (
            <div className="rounded-3xl border border-white/10 p-3 bg-gradient-to-br from-white/10 to-white/[0.03] shadow-2xl reveal">
              {(config.floorplanSvg || (config.floorplanUrl?.toLowerCase?.().includes('.svg'))) ? (
                <div ref={svgContainerRef} className="w-full rounded-2xl" style={{ background: '#0b1020', borderRadius: 16, maxHeight: 480, overflowX: 'auto', overflowY: 'hidden' }} />
              ) : (
                <img src={String(config.floorplanUrl)} alt="floorplan" className="w-full h-auto object-contain rounded-2xl" />
              )}
              <div className="text-white/60 text-sm mt-2 text-center">Tap booths to view exhibitor details (SVG only).</div>
            </div>
          ) : <div className="text-white/60 text-center">No floorplan yet.</div>}
        </div>
      </section>

      {/* Exhibitor Modal */}
      {modalExhibitor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setModalExhibitor(null)}>
          <div className="bg-[#1c2331] rounded-xl border border-white/10 p-4 max-w-md w-full" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              {modalExhibitor.logoUrl ? <img src={modalExhibitor.logoUrl} alt="logo" className="h-10 w-10 object-contain" /> : <div className="h-10 w-10 bg-white/10 rounded" />}
              <div>
                <div className="font-bold">{modalExhibitor.name}</div>
                <div className="text-white/60 text-sm">Booth: {modalExhibitor.boothId || "-"}</div>
              </div>
            </div>
            <div className="text-white/80 text-sm mb-3 text-justify">{modalExhibitor.description || ""}</div>
            {modalExhibitor.tags?.length ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {modalExhibitor.tags.map((t, i) => (
                  <span key={i} className="text-xs bg-white/10 text-white px-2 py-1 rounded">{t}</span>
                ))}
              </div>
            ) : null}
            <div className="flex justify-end">
              <button className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/10 cursor-pointer transition-colors" onClick={() => setModalExhibitor(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 text-white/70">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold">{eventMeta?.name || eventId}</span>
            <span className="text-white/40">•</span>
            <span className="text-white/60 text-sm">© {new Date().getFullYear()}</span>
          </div>
          <div className="text-sm">Designed for exceptional event experiences</div>
        </div>
      </footer>
    </div>
  );
}
