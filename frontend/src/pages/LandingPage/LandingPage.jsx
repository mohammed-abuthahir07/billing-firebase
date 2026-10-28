import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  Receipt,
  Package,
  BarChart3,
  ShieldCheck,
  Users,
  Zap,
  Star,
  Menu,
  X,
  TrendingUp,
  FileText,
  Globe,
  Store,
  Factory,
  Briefcase,
  Smartphone,
  Percent,
  Clock,
  Headphones,
  ChevronDown,
  IndianRupee,
  Building2,
  BookOpen,
  Mail,
  MapPin,
  Cookie,
  Scale,
} from "lucide-react";
import "./LandingPage.css";

const HERO_AVATARS = ["RK", "PA", "SM", "VD", "AN"];
const CTA_PERKS = [
  "Free to start",
  "No setup fees",
  "Cancel anytime",
  "Dedicated support",
];

const socialLinks = [
  {
    name: "Twitter",
    href: "https://twitter.com",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.822L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"
        />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
        />
      </svg>
    ),
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
        />
      </svg>
    ),
  },
];

const features = [
  {
    icon: <Receipt size={32} />,
    title: "Invoice Management",
    desc: "Generate professional GST-ready invoices in seconds. Customize templates, share them instantly, and track payment status in real time.",
  },
  {
    icon: <Package size={32} />,
    title: "Inventory Control",
    desc: "Manage your entire product catalog, track stock levels, set reorder alerts, and avoid stockouts with smart inventory dashboards.",
  },
  {
    icon: <BarChart3 size={32} />,
    title: "Revenue Analytics",
    desc: "Visualize sales trends, monthly revenue, top-selling products, and customer behavior with clear charts and downloadable reports.",
  },
  {
    icon: <ShieldCheck size={32} />,
    title: "Bank-Grade Security",
    desc: "Your business data is encrypted end-to-end, backed up automatically, and protected with role-based access controls.",
  },
  {
    icon: <Users size={32} />,
    title: "Customer CRM",
    desc: "Maintain a complete customer ledger, track purchase history, outstanding dues, and build lasting business relationships.",
  },
  {
    icon: <Globe size={32} />,
    title: "Cloud Access",
    desc: "Work from anywhere — your shop, home, or phone. Your data stays in sync across every device you use.",
  },
];

const steps = [
  {
    number: "01",
    icon: <Zap size={28} />,
    title: "Sign Up Free",
    desc: "Create your account in 60 seconds. No credit card required. Your workspace is ready to use immediately.",
  },
  {
    number: "02",
    icon: <Package size={28} />,
    title: "Add Your Products",
    desc: "Add packed variants with prices, weights, and GST rates. Import your catalog in bulk when you are ready to scale.",
  },
  {
    number: "03",
    icon: <FileText size={28} />,
    title: "Send Invoices",
    desc: "Create and share professional invoices in one click. Collect payments faster and keep every rupee accounted for.",
  },
];

const testimonials = [
  {
    initials: "RK",
    name: "Rajesh Kumar",
    role: "Owner",
    company: "Kumar Electronics",
    rating: 5,
    quote:
      "Billing SaaS cut my invoicing time by 70%. I used to spend hours on billing — now it takes minutes. The GST reports alone saved me ₹15,000 in chartered accountant fees.",
  },
  {
    initials: "PA",
    name: "Priya Agarwal",
    role: "Director",
    company: "Agarwal Traders",
    rating: 5,
    quote:
        "The inventory and billing flow is seamless. I always know my stock levels, and invoices go out instantly. It's the best investment I have made for my business.",
  },
  {
    initials: "SM",
    name: "Suresh Mehta",
    role: "Founder",
    company: "Mehta Wholesale",
    rating: 5,
    quote:
      "We switched from manual Excel billing. The analytics dashboard showed us which products were actually profitable. Revenue is up 40% in three months.",
  },
];

const metrics = [
  { value: "₹50Cr+", label: "Revenue processed" },
  { value: "50K+", label: "Invoices generated" },
  { value: "5,000+", label: "Happy businesses" },
  { value: "99.9%", label: "Uptime this year" },
];

const benefits = [
  "Unlimited GST-ready bills",
  "Full customer management",
  "Real-time inventory tracking",
  "Multi-device cloud access",
  "Automated payment reminders",
  "Daily data backups",
  "Export to PDF and Excel",
  "Dedicated support team",
];

const audiences = [
  {
    icon: <Store size={26} />,
    title: "Retail shops",
    desc: "Bill packed goods quickly, keep stock accurate, and print a clean invoice for every customer.",
  },
  {
    icon: <Factory size={26} />,
    title: "Wholesalers",
    desc: "Handle high-volume orders, packed variants, and repeat buyers without losing track of payments.",
  },
  {
    icon: <Briefcase size={26} />,
    title: "Growing teams",
    desc: "Give your staff one shared workspace for products, invoices, reports, and customer history.",
  },
  {
    icon: <Smartphone size={26} />,
    title: "On-the-go owners",
    desc: "Check today’s sales, low stock, and unpaid bills from any device, whenever you need them.",
  },
];

const gstPoints = [
  {
    icon: <Percent size={22} />,
    title: "GST on every line",
    desc: "Apply GST rates per product, see tax amounts clearly, and keep invoices ready for compliance.",
  },
  {
    icon: <IndianRupee size={22} />,
    title: "Rupee-first billing",
    desc: "Prices, totals, and reports are built around Indian rupees — no awkward currency conversions.",
  },
  {
    icon: <FileText size={22} />,
    title: "Monthly reports",
    desc: "Download a month’s sales, invoice list, and best-selling products whenever you need them.",
  },
  {
    icon: <Clock size={22} />,
    title: "Faster closing",
    desc: "Stop rebuilding Excel sheets at month-end. Your numbers are already organized in one place.",
  },
];

const industries = [
  "Kirana & groceries",
  "Masala & spices",
  "Electronics",
  "Wholesale trading",
  "Pharmacy",
  "Apparel",
  "Hardware",
  "School supplies",
  "Restaurants",
  "Home goods",
];

const faqs = [
  {
    q: "Is Billing SaaS free to start?",
    a: "Yes. You can create an account and start billing without a credit card. There are no setup fees, and you can cancel whenever you like.",
  },
  {
    q: "Does it create GST-ready invoices?",
    a: "Yes. Each product can carry its own GST rate. Invoices show tax clearly, and you can download professional PDFs for your customers.",
  },
  {
    q: "Can I use it on my phone?",
    a: "Yes. Billing SaaS is cloud-based, so you can create bills, check stock, and view reports from a computer, tablet, or phone.",
  },
  {
    q: "How is my business data protected?",
    a: "Your data is encrypted in transit, stored with automatic backups, and isolated to your account. Only you and the people you invite can access it.",
  },
  {
    q: "Can I export invoices and reports?",
    a: "Yes. You can download invoice PDFs and monthly reports so your accountant — or your own records — stay up to date.",
  },
  {
    q: "Do I need training to use it?",
    a: "No. Add products, create a bill, and you are live. The dashboard, reports, and analytics are designed for busy owners, not software experts.",
  },
];

const companyPages = [
  {
    id: "about",
    icon: <Building2 size={26} />,
    title: "About Us",
    body: "Billing SaaS is built for Indian shops, wholesalers, and growing teams who need GST-ready invoices without messy spreadsheets. We keep products, stock, bills, and reports in one calm workspace so owners can close the day faster.",
  },
  {
    id: "blog",
    icon: <BookOpen size={26} />,
    title: "Blog",
    body: "Guides on GST billing, packed variants, monthly reports, and keeping books clean. New notes are added as we ship features — start with invoice PDFs, stock by pack size, and month-end closing.",
  },
  {
    id: "careers",
    icon: <Briefcase size={26} />,
    title: "Careers",
    body: "We hire people who care about clear software for real counters. Roles we look for: product, customer success, and GST-aware support. Create an account and write to us if you want to help Indian businesses bill with less friction.",
  },
  {
    id: "contact",
    icon: <Mail size={26} />,
    title: "Contact",
    body: "Questions about billing, GST on variants, or your account? Email hello@billingsaas.com or start a free workspace and explore the dashboard. We reply on business days.",
  },
];

const legalPages = [
  {
    id: "privacy",
    title: "Privacy Policy",
    body: "We collect the details you enter — name, email, company, products, and invoices — to run your billing workspace. Data is stored for your account only, encrypted in transit, and is not sold. You can update or delete profile details from your account, and you can ask us to close the workspace.",
  },
  {
    id: "terms",
    title: "Terms of Service",
    body: "By creating an account you agree to use Billing SaaS for lawful business billing. You are responsible for the accuracy of GST rates, stock, and invoices you issue. Do not share your password. We may suspend accounts that abuse the service. Features may change as we improve the product.",
  },
  {
    id: "refund",
    title: "Refund Policy",
    body: "You can start free, with no setup fee and no credit card required. If you later choose a paid plan, unused prepaid time may be refunded according to the plan terms shown at checkout. Invoice PDFs you already generated remain yours. Contact us if a charge looks wrong.",
  },
  {
    id: "cookies",
    title: "Cookie Policy",
    body: "We use essential cookies to keep you signed in and remember basic preferences. We do not use advertising cookies. Analytics cookies, if enabled, only help us see which pages are used so we can improve the product. You can block non-essential cookies in your browser.",
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 20);
        ticking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const nodes = document.querySelectorAll(".landing-page .reveal");
    if (!nodes.length) return undefined;
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page">
      {/* ── Navbar ── */}
      <nav className={`landing-navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="landing-logo">
          <span className="logo-icon">
            <Receipt size={22} />
          </span>
          Billing<span className="logo-accent">SaaS</span>
        </div>
        <div className={`landing-nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How It Works</a>
          <a href="#industries" onClick={() => setMenuOpen(false)}>Industries</a>
          <a href="#testimonials" onClick={() => setMenuOpen(false)}>Reviews</a>
          <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
          <a href="#pricing-cta" onClick={() => setMenuOpen(false)}>Pricing</a>
        </div>
        <div className="landing-nav-buttons">
          <button className="login-btn" onClick={() => navigate("/login")}>
            Login
          </button>
          <button className="register-btn" onClick={() => navigate("/register")}>
            Get Started <ArrowRight size={16} />
          </button>
        </div>
        <button
          className="hamburger-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>
      {/* Mobile nav overlay */}
      {menuOpen && (
        <div className="mobile-nav-overlay">
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How It Works</a>
          <a href="#industries" onClick={() => setMenuOpen(false)}>Industries</a>
          <a href="#testimonials" onClick={() => setMenuOpen(false)}>Reviews</a>
          <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
          <a href="#pricing-cta" onClick={() => setMenuOpen(false)}>Pricing</a>
          <button className="login-btn" onClick={() => { navigate("/login"); setMenuOpen(false); }}>Login</button>
          <button className="register-btn" onClick={() => { navigate("/register"); setMenuOpen(false); }}>
            Get Started <ArrowRight size={16} />
          </button>
        </div>
      )}
      {/* ── Hero ── */}
      <section className="hero-section">
        <div className="hero-orbs" aria-hidden="true">
          <span className="hero-orb hero-orb-a" />
          <span className="hero-orb hero-orb-b" />
        </div>
        <div className="hero-left">
          <span className="hero-badge">
            <Star size={14} fill="currentColor" />
            Trusted by 5,000+ businesses across India
          </span>
          <h1>
            Manage your billing{" "}
            <span className="hero-highlight">10× faster</span>
            {" "}— all from one dashboard.
          </h1>
          <p>
            Create GST-ready invoices, track packed inventory, monitor revenue,
            and manage customers from a single platform built for Indian businesses.
          </p>
          <div className="hero-buttons">
            <button
              className="get-started-btn"
              onClick={() => navigate("/register")}
            >
              Start Free — No Card Needed
              <ArrowRight size={18} />
            </button>
            <button
              className="demo-btn"
              onClick={() => navigate("/login")}
            >
              Log in to Dashboard
            </button>
          </div>
          <div className="hero-social-proof">
            <div className="avatar-stack">
              {HERO_AVATARS.map((init, i) => (
                <div key={i} className="avatar-chip" style={{ zIndex: 5 - i }}>
                  {init}
                </div>
              ))}
            </div>
            <span>
              <strong>5,000+</strong> businesses trust us
            </span>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-blob" />
          <div className="dashboard-card1">
            <div className="dashboard-card-header">
              <h3>Live Dashboard</h3>
              <span className="live-badge">● LIVE</span>
            </div>

            <div className="dashboard-item">
              <div className="dash-item-left">
                <Receipt size={18} />
                <span>Invoices Created</span>
              </div>
              <strong>1,248</strong>
            </div>

            <div className="dashboard-item">
              <div className="dash-item-left">
                <Package size={18} />
                <span>Products</span>
              </div>
              <strong>458</strong>
            </div>

            <div className="dashboard-item">
              <div className="dash-item-left">
                <BarChart3 size={18} />
                <span>Revenue</span>
              </div>
              <strong className="revenue-value">₹2,45,000</strong>
            </div>

            <div className="dashboard-item no-border">
              <div className="dash-item-left">
                <TrendingUp size={18} />
                <span>Growth</span>
              </div>
              <strong className="growth-badge">↑ 24%</strong>
            </div>

            <div className="mini-chart">
              {[40, 65, 50, 80, 70, 90, 85].map((h, i) => (
                <div
                  key={i}
                  className="chart-bar"
                  style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* ── Metrics Strip ── */}
      <section className="metrics-strip reveal">
        {metrics.map((m, i) => (
          <div key={i} className="metric-tile reveal-child" style={{ "--reveal-delay": `${i * 0.1}s` }}>
            <span className="metric-value">{m.value}</span>
            <span className="metric-label">{m.label}</span>
          </div>
        ))}
      </section>
      {/* ── Industries marquee ── */}
      <section className="industry-marquee reveal" id="industries" aria-label="Industries we serve">
        <p className="marquee-kicker">Built for everyday Indian businesses</p>
        <div className="marquee-track-wrap">
          <div className="marquee-track">
            {[...industries, ...industries].map((name, i) => (
              <span className="marquee-chip" key={`${name}-${i}`}>{name}</span>
            ))}
          </div>
        </div>
      </section>
      {/* ── Features ── */}
      <section className="features reveal" id="features">
        <div className="section-header reveal-child">
          <span className="section-badge">Features</span>
          <h2>Everything your business needs</h2>
          <p>
            One platform to replace scattered spreadsheets and billing tools —
            built specifically for Indian small and medium businesses.
          </p>
        </div>
        <div className="feature-grid">
          {features.map((f, i) => (
            <div
              key={i}
              className="feature-card reveal-child"
              style={{ "--reveal-delay": `${0.08 + i * 0.08}s` }}
            >
              <div className="feature-icon-wrap">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      {/* ── How It Works ── */}
      <section className="how-it-works reveal" id="how-it-works">
        <div className="section-header reveal-child">
          <span className="section-badge">Process</span>
          <h2>Up and running in minutes</h2>
          <p>No complicated setup. No technical expertise required. Sign up and start billing.</p>
        </div>
        <div className="steps-grid">
          {steps.map((s, i) => (
            <div key={i} className="step-card reveal-child" style={{ "--reveal-delay": `${0.08 + i * 0.1}s` }}>
              <div className="step-number">{s.number}</div>
              <div className="step-icon">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              {i < steps.length - 1 && <div className="step-connector" />}
            </div>
          ))}
        </div>
      </section>
      {/* ── Who it is for ── */}
      <section className="audiences reveal" id="who">
        <div className="section-header reveal-child">
          <span className="section-badge">Who it is for</span>
          <h2>A billing desk that fits your day</h2>
          <p>
            Whether you run a counter, a warehouse, or a growing team, Billing SaaS
            keeps products, invoices, and customers in one calm workspace.
          </p>
        </div>
        <div className="audience-grid">
          {audiences.map((item, i) => (
            <article
              className="audience-card reveal-child"
              key={item.title}
              style={{ "--reveal-delay": `${0.08 + i * 0.08}s` }}
            >
              <div className="audience-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>
      {/* ── Benefits / Checklist ── */}
      <section className="benefits reveal">
        <div className="benefits-inner">
          <div className="benefits-left reveal-child">
            <span className="section-badge light">Why Us</span>
            <h2>All the tools, none of the complexity</h2>
            <p>
              Billing SaaS is designed for busy business owners — not accountants.
              There is no training course, no setup fee, and no long-term contract.
            </p>
            <button
              className="get-started-btn"
              onClick={() => navigate("/register")}
            >
              Try It Free <ArrowRight size={18} />
            </button>
          </div>
          <div className="benefits-right">
            <div className="benefits-grid">
              {benefits.map((b, i) => (
                <div key={i} className="benefit-item reveal-child" style={{ "--reveal-delay": `${0.1 + i * 0.06}s` }}>
                  <CheckCircle size={20} />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* ── GST & India ── */}
      <section className="gst-section reveal">
        <div className="gst-inner">
          <div className="gst-copy reveal-child">
            <span className="section-badge">Made for India</span>
            <h2>GST-ready billing without the spreadsheet scramble</h2>
            <p>
              Apply tax rates per packed variant, see GST on every invoice, and
              download monthly reports when it is time to file. Designed for shops
              that bill in rupees, not for generic overseas tools.
            </p>
            <ul className="gst-list">
              <li><CheckCircle size={18} /> Packed variants with their own price and GST</li>
              <li><CheckCircle size={18} /> Clear invoice PDFs your customers can keep</li>
              <li><CheckCircle size={18} /> Month and year analytics for your own books</li>
            </ul>
          </div>
          <div className="gst-grid">
            {gstPoints.map((point, i) => (
              <article
                className="gst-card reveal-child"
                key={point.title}
                style={{ "--reveal-delay": `${0.1 + i * 0.08}s` }}
              >
                <span className="gst-icon">{point.icon}</span>
                <h3>{point.title}</h3>
                <p>{point.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      {/* ── Testimonials ── */}
      <section className="testimonials reveal" id="testimonials">
        <div className="section-header reveal-child">
          <span className="section-badge">Reviews</span>
          <h2>Loved by 5,000+ business owners</h2>
          <p>Don't take our word for it — here's what real customers say.</p>
        </div>
        <div className="testimonials-grid">
          {testimonials.map((t, i) => (
            <div key={i} className="testimonial-card reveal-child" style={{ "--reveal-delay": `${0.08 + i * 0.1}s` }}>
              <div className="stars">
                {[...Array(t.rating)].map((_, si) => (
                  <Star key={si} size={16} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
              <p className="testimonial-quote">"{t.quote}"</p>
              <div className="testimonial-author">
                <div className="author-avatar">{t.initials}</div>
                <div>
                  <strong>{t.name}</strong>
                  <span>
                    {t.role}, {t.company}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* ── FAQ ── */}
      <section className="faq-section reveal" id="faq">
        <div className="section-header reveal-child">
          <span className="section-badge">FAQ</span>
          <h2>Questions owners ask before they switch</h2>
          <p>Short answers so you can decide with confidence.</p>
        </div>
        <div className="faq-list">
          {faqs.map((item, i) => {
            const open = openFaq === i;
            return (
              <div
                className={`faq-item reveal-child ${open ? "open" : ""}`}
                key={item.q}
                style={{ "--reveal-delay": `${0.06 + i * 0.06}s` }}
              >
                <button
                  type="button"
                  className="faq-question"
                  aria-expanded={open}
                  onClick={() => setOpenFaq(open ? -1 : i)}
                >
                  <span>{item.q}</span>
                  <ChevronDown size={20} />
                </button>
                <div className="faq-answer">
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="faq-help">
          <Headphones size={16} />
          Still unsure? Create a free account and explore the dashboard at your own pace.
        </p>
      </section>
      {/* ── Pricing CTA Banner ── */}
      <section className="pricing-cta reveal" id="pricing-cta">
        <div className="pricing-cta-inner">
          <span className="section-badge light">Get Started</span>
          <h2>Start billing smarter today</h2>
          <p>
            Join 5,000+ businesses already saving time with Billing SaaS.
            Get started free — no credit card required.
          </p>
          <div className="cta-features">
            {CTA_PERKS.map((item, i) => (
              <span key={i} className="cta-feature-chip">
                <CheckCircle size={14} /> {item}
              </span>
            ))}
          </div>
          <button
            className="cta-main-btn"
            onClick={() => navigate("/register")}
          >
            Create Free Account <ArrowRight size={20} />
          </button>
        </div>
      </section>
      {/* ── Company ── */}
      <section className="company-pages reveal" id="company">
        <div className="section-header reveal-child">
          <span className="section-badge">Company</span>
          <h2>Who we are and how to reach us</h2>
          <p>About the product, notes for owners, open roles, and a direct way to get in touch.</p>
        </div>
        <div className="company-page-grid">
          {companyPages.map((item, i) => (
            <article
              className="company-page-card reveal-child"
              id={item.id}
              key={item.id}
              style={{ "--reveal-delay": `${0.08 + i * 0.08}s` }}
            >
              <div className="company-page-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              {item.id === "contact" && (
                <div className="contact-meta">
                  <span><Mail size={16} /> hello@billingsaas.com</span>
                  <span><MapPin size={16} /> India — support on business days</span>
                  <button
                    type="button"
                    className="company-page-btn"
                    onClick={() => navigate("/register")}
                  >
                    Start a free account <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      {/* ── Legal ── */}
      <section className="legal-pages reveal" id="legal">
        <div className="section-header reveal-child">
          <span className="section-badge">Legal</span>
          <h2>Policies in plain language</h2>
          <p>How we handle your data, account use, refunds, and cookies.</p>
        </div>
        <div className="legal-page-list">
          {legalPages.map((item, i) => (
            <article
              className="legal-page-card reveal-child"
              id={item.id}
              key={item.id}
              style={{ "--reveal-delay": `${0.06 + i * 0.06}s` }}
            >
              <div className="legal-page-head">
                {item.id === "cookies" ? <Cookie size={20} /> : <Scale size={20} />}
                <h3>{item.title}</h3>
              </div>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>
      {/* ── Footer ── */}
      <footer className="landing-footer reveal">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="landing-logo footer-logo">
              <span className="logo-icon">
                <Receipt size={20} />
              </span>
              Billing<span className="logo-accent">SaaS</span>
            </div>
            <p>Modern billing and invoicing, built for Indian businesses.</p>
            <div className="footer-social">
              {socialLinks.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon-btn"
                  aria-label={s.name}
                  title={s.name}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#testimonials">Reviews</a>
              <a href="#faq">FAQ</a>
              <a href="#pricing-cta">Pricing</a>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <a href="#about">About Us</a>
              <a href="#blog">Blog</a>
              <a href="#careers">Careers</a>
              <a href="#contact">Contact</a>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
              <a href="#refund">Refund Policy</a>
              <a href="#cookies">Cookie Policy</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
            <p>
              © {new Date().getFullYear()} BillingSaaS. Built for modern businesses. All rights reserved.
            </p>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;