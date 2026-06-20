import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, useMotionValueEvent } from 'framer-motion';
import { UserCheck, Video, Building2, CalendarClock, Smartphone, Lock, User, Stethoscope, HeartPulse } from 'lucide-react';
import '../../styles/landing.css';

/* ═══════════════════════════════════════════════════════════════════════
   LANDING PAGE — Claymorphic Scroll Experience
   ═══════════════════════════════════════════════════════════════════════ */

// ─── Animation Variants ───
const fadeUp = {
  hidden: { opacity: 0, y: 60 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: i * 0.12,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const scaleUp = {
  hidden: { opacity: 0, scale: 0.88, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.15,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const slideFromLeft = {
  hidden: { opacity: 0, x: -80 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const slideFromRight = {
  hidden: { opacity: 0, x: 80 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

// ─── Section IDs for nav highlighting ───
const SECTIONS = [
  { id: 'hero', label: 'Home' },
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'roles', label: 'For You' },
  { id: 'stats', label: 'Security' },
];

// ─── Animated Counter Hook ───
function useCounter(target, duration = 2000, isInView) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return count;
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

// ─── Floating Nav ───
function FloatingNav({ activeSection }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <motion.nav
      className={`landing-nav ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to="/" className="landing-nav__logo">
        <span className="landing-nav__logo-icon">🏥</span>
        ANH
      </Link>

      <div className="landing-nav__links">
        {SECTIONS.map((sec) => (
          <button
            key={sec.id}
            className={`landing-nav__link ${activeSection === sec.id ? 'active' : ''}`}
            onClick={() => scrollTo(sec.id)}
          >
            {sec.label}
          </button>
        ))}
      </div>

      <Link to="/login" className="landing-nav__cta">
        Sign In
      </Link>
    </motion.nav>
  );
}

// ─── Hero Section ───
function HeroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.7], [1, 0.92]);

  return (
    <section id="hero" ref={ref} className="landing-hero landing-section--full">
      <motion.div
        className="landing-hero__content"
        style={{ y, opacity, scale }}
      >
        <motion.div
          className="landing-hero__badge"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <span className="landing-hero__badge-dot" />
          Secure Healthcare Platform — Live
        </motion.div>

        <motion.h1
          className="landing-hero__title"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Expert Healthcare.
          <br />
          <span className="landing-hero__title-gradient">Anytime, Anywhere.</span>
        </motion.h1>

        <motion.p
          className="landing-hero__subtitle"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
        >
          Connect with verified doctors for seamless video consultations or book offline visits.
          Experience healthcare built on trust, convenience, and uncompromising quality.
        </motion.p>

        <motion.div
          className="landing-hero__actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
        >
          <Link to="/patient/register" className="landing-btn landing-btn--primary">
            Get Started Free
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 4 }}>
              <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link to="/login" className="landing-btn landing-btn--secondary">
            I Have an Account
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        className="landing-hero__scroll-indicator"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
      >
        <span>Scroll</span>
        <span className="landing-hero__scroll-line" />
      </motion.div>
    </section>
  );
}

// ─── Features Section ───
const FEATURES = [
  {
    icon: <UserCheck size={32} />,
    iconClass: 'landing-clay-card__icon--indigo',
    title: '100% Verified Doctors',
    desc: 'Every doctor on our platform undergoes a strict verification process. Your health is in trusted, expert hands.',
  },
  {
    icon: <Video size={32} />,
    iconClass: 'landing-clay-card__icon--violet',
    title: 'Instant Video Consultations',
    desc: 'Connect face-to-face with top specialists from the comfort of your home. High-quality, secure video calls without the wait.',
  },
  {
    icon: <Building2 size={32} />,
    iconClass: 'landing-clay-card__icon--cyan',
    title: 'Seamless Offline Visits',
    desc: 'Prefer an in-person checkup? Easily book offline appointments at top clinics and hospitals near you.',
  },
  {
    icon: <CalendarClock size={32} />,
    iconClass: 'landing-clay-card__icon--emerald',
    title: 'Smart Scheduling',
    desc: 'No more waiting in lines. Pick a time that works for you and get instant confirmation for both online and offline visits.',
  },
  {
    icon: <Smartphone size={32} />,
    iconClass: 'landing-clay-card__icon--rose',
    title: 'Digital Prescriptions',
    desc: 'Receive your prescriptions digitally immediately after your consultation. Accessible anytime from your phone.',
  },
  {
    icon: <Lock size={32} />,
    iconClass: 'landing-clay-card__icon--amber',
    title: 'Secure & Private',
    desc: 'Your consultations and medical records are end-to-end encrypted. We prioritize your privacy above all else.',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="landing-section">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        style={{ textAlign: 'center' }}
      >
        <span className="landing-section__label">✦ Core Features</span>
        <h2 className="landing-section__title">
          Expert care,
          <br />
          <span className="landing-hero__title-gradient">your way</span>
        </h2>
        <p className="landing-section__subtitle" style={{ margin: '0 auto' }}>
          Choose between high-definition video consultations or convenient offline clinic visits with our network of strictly verified doctors.
        </p>
      </motion.div>

      <motion.div
        className="landing-features__grid"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        {FEATURES.map((f, i) => (
          <motion.div
            key={i}
            className="landing-clay-card"
            variants={scaleUp}
            custom={i}
            whileHover={{ y: -6, transition: { duration: 0.3 } }}
          >
            <div className={`landing-clay-card__icon ${f.iconClass}`}>{f.icon}</div>
            <h3 className="landing-clay-card__title">{f.title}</h3>
            <p className="landing-clay-card__desc">{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ─── How It Works Section ───
const STEPS = [
  {
    number: '01',
    title: 'Find the Right Doctor',
    desc: 'Browse our network of top-rated, strictly verified doctors and specialists. Filter by expertise, rating, and availability.',
    image: '/images/landing/step1.png',
  },
  {
    number: '02',
    title: 'Choose Online or Offline',
    desc: 'Select what works best for you. Book an instant video consultation for quick care, or schedule an in-person clinic visit.',
    image: '/images/landing/step2.png',
  },
  {
    number: '03',
    title: 'Consult & Get Treated',
    desc: 'Connect over a secure, high-definition video call, or meet your doctor at the clinic without waiting in long queues.',
    image: '/images/landing/step3.png',
  },
  {
    number: '04',
    title: 'Receive Digital Prescriptions',
    desc: 'Get your treatment plan, medical notes, and prescriptions delivered directly to your secure app immediately after the visit.',
    image: '/images/landing/step4.png',
  },
];

function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const containerRef = useRef(null);
  const stepRefs = useRef([]);

  useEffect(() => {
    const observers = [];
    stepRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveStep(i);
        },
        { threshold: 0.6, rootMargin: '-20% 0px -20% 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <section id="how-it-works" className="landing-how" ref={containerRef}>
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        style={{ marginBottom: '3rem' }}
      >
        <span className="landing-section__label">✦ How It Works</span>
        <h2 className="landing-section__title">
          Book. Consult.
          <br />
          <span className="landing-hero__title-gradient">Recover.</span>
        </h2>
      </motion.div>

      <div className="landing-how__container">
        {/* Sticky visual panel */}
        <div className="landing-how__sticky">
          <motion.div
            className="landing-how__visual"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="landing-how__visual-inner"
              key={activeStep}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <img 
                src={STEPS[activeStep].image} 
                alt={STEPS[activeStep].title} 
                className="landing-how__image"
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Scrolling steps */}
        <div className="landing-how__steps">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              ref={(el) => (stepRefs.current[i] = el)}
              className={`landing-how__step ${activeStep === i ? 'active' : ''}`}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              custom={i}
            >
              <div className="landing-how__step-number">{step.number}</div>
              <h3 className="landing-how__step-title">{step.title}</h3>
              <p className="landing-how__step-desc">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Split Panels — For Patients / For Doctors ───
function SplitSection() {
  return (
    <section id="roles" className="landing-split">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        style={{ textAlign: 'center', marginBottom: '1rem' }}
      >
        <span className="landing-section__label">✦ Built For Everyone</span>
        <h2 className="landing-section__title">
          Whether you're a{' '}
          <span className="landing-hero__title-gradient">patient or a doctor</span>
        </h2>
        <p className="landing-section__subtitle" style={{ margin: '0 auto' }}>
          A seamless experience designed for optimal care delivery, online or offline.
        </p>
      </motion.div>

      <div className="landing-split__grid">
        {/* Patient Panel */}
        <motion.div
          className="landing-split__panel"
          variants={slideFromLeft}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <div
            className="landing-split__panel-icon"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))',
              border: '1px solid rgba(99,102,241,0.25)',
              color: '#a78bfa'
            }}
          >
            <User size={28} />
          </div>
          <h3 className="landing-split__panel-title">For Patients</h3>
          <ul className="landing-split__panel-list">
            {[
              'Consult top doctors via HD video',
              'Book priority offline clinic visits',
              '100% verified medical professionals',
              'Zero waiting room time',
              'Instant digital prescriptions',
              'Securely store all your health records',
            ].map((item, i) => (
              <li key={i}>
                <span className="landing-split__check landing-split__check--indigo">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Doctor Panel */}
        <motion.div
          className="landing-split__panel"
          variants={slideFromRight}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <div
            className="landing-split__panel-icon"
            style={{
              background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(6,182,212,0.08))',
              border: '1px solid rgba(6,182,212,0.25)',
              color: '#06b6d4'
            }}
          >
            <Stethoscope size={28} />
          </div>
          <h3 className="landing-split__panel-title">For Doctors</h3>
          <ul className="landing-split__panel-list">
            {[
              'Offer video and offline consultations',
              'Expand your practice digitally',
              'Manage your schedule efficiently',
              'Issue digital prescriptions easily',
              'Join a network of verified peers',
              'Focus on care, not paperwork',
            ].map((item, i) => (
              <li key={i}>
                <span className="landing-split__check landing-split__check--cyan">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Stats Section ───
const STATS = [
  { icon: <UserCheck size={32} />, value: 100, suffix: '%', label: 'Verified Doctors' },
  { icon: <Video size={32} />, value: 10, suffix: 'k+', label: 'Video Consults' },
  { icon: <Building2 size={32} />, value: 500, suffix: '+', label: 'Partner Clinics' },
  { icon: <HeartPulse size={32} />, value: 24, suffix: '/7', label: 'Medical Support' },
];

function StatsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="stats" className="landing-stats" ref={ref}>
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        style={{ textAlign: 'center', marginBottom: '3rem' }}
      >
        <span className="landing-section__label">✦ Verified Network</span>
        <h2 className="landing-section__title">
          Healthcare you can{' '}
          <span className="landing-hero__title-gradient">always trust</span>
        </h2>
      </motion.div>

      <motion.div
        className="landing-stats__grid"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
      >
        {STATS.map((stat, i) => (
          <StatCard key={i} stat={stat} index={i} isInView={isInView} />
        ))}
      </motion.div>
    </section>
  );
}

function StatCard({ stat, index, isInView }) {
  const count = useCounter(stat.value, 1800, isInView);

  return (
    <motion.div className="landing-stat-card" variants={scaleUp} custom={index}>
      <div className="landing-stat-card__icon">{stat.icon}</div>
      <div className="landing-stat-card__value">
        {count}
        {stat.suffix}
      </div>
      <div className="landing-stat-card__label">{stat.label}</div>
    </motion.div>
  );
}

// ─── CTA Section ───
function CTASection() {
  return (
    <section className="landing-cta">
      <motion.div
        className="landing-cta__container"
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="landing-cta__orb landing-cta__orb--1" />
        <div className="landing-cta__orb landing-cta__orb--2" />

        <motion.h2
          className="landing-cta__title"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          Ready to experience
          <br />
          <span className="landing-hero__title-gradient">better healthcare?</span>
        </motion.h2>

        <motion.p
          className="landing-cta__subtitle"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={1}
        >
          Join the platform that puts patients first. Create your profile in minutes and book
          your first video or offline consultation with a verified doctor today.
        </motion.p>

        <motion.div
          className="landing-cta__actions"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={2}
        >
          <Link to="/patient/register" className="landing-btn landing-btn--primary">
            Create Free Account
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 4 }}>
              <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link to="/organization/request" className="landing-btn landing-btn--secondary">
            Register Organization
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── Footer ───
function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer__inner">
        <div className="landing-footer__brand">
          <span>🏥</span> ANH Healthcare
        </div>
        <div className="landing-footer__links">
          <Link to="/login" className="landing-footer__link">Sign In</Link>
          <Link to="/patient/register" className="landing-footer__link">Patient Registration</Link>
          <Link to="/organization/request" className="landing-footer__link">Organization Request</Link>
          <Link to="/emergency" className="landing-footer__link">Emergency Access</Link>
        </div>
        <span className="landing-footer__copy">
          © {new Date().getFullYear()} ANH. All rights reserved.
        </span>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const [activeSection, setActiveSection] = useState('hero');

  // Track active section via Intersection Observer
  useEffect(() => {
    const observers = [];
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { threshold: 0.3, rootMargin: '-10% 0px -40% 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <div className="landing-page">
      {/* Animated gradient mesh background */}
      <div className="landing-bg-mesh">
        <div className="landing-bg-orb landing-bg-orb--1" />
        <div className="landing-bg-orb landing-bg-orb--2" />
        <div className="landing-bg-orb landing-bg-orb--3" />
        <div className="landing-bg-orb landing-bg-orb--4" />
      </div>

      <FloatingNav activeSection={activeSection} />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <SplitSection />
      <StatsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
