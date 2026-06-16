import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import PublicHeader, { Footer } from "../components/Layout/Header";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { newsTopics } from "../data/newsTopics";
import { siteImages } from "../data/images";
import { apiFetch } from "../api/client";

function SmartImage({ src, fallback, alt, className }) {
  const [current, setCurrent] = useState(src);
  return (
    <img
      src={current}
      alt={alt}
      className={className}
      onError={() => {
        if (current !== fallback) setCurrent(fallback);
      }}
    />
  );
}

const steps = [
  { title: "Report", desc: "Capture local issues with photos, location, and description.", icon: "📍" },
  { title: "Track", desc: "Follow status updates as admins and communities resolve problems.", icon: "📊" },
  { title: "Connect", desc: "Join groups with similar interests in cleanliness and civic action.", icon: "🤝" },
  { title: "Improve", desc: "Rate public services and drive accountability.", icon: "⭐" },
];

export default function LandingPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    apiFetch("/stats/public")
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <>
      <PublicHeader />
      <section className="relative overflow-hidden bg-civic-900 text-white">
        <SmartImage
          src={siteImages.hero.src}
          fallback={siteImages.hero.fallback}
          alt={siteImages.hero.alt}
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-civic-900/95 via-civic-800/90 to-civic-700/80" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-civic-200">
            For a cleaner country
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
            Building a cleaner society, one community at a time
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-civic-100">
            Report local issues, join groups with similar interests, and work together for the
            betterment of society and cleanliness of our surroundings.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button to="/register" size="lg" className="!bg-white !text-civic-900 hover:!bg-civic-50">
              Get Started
            </Button>
            <a
              href="#about"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Learn More
            </a>
          </div>
          {stats && (
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Issues Reported", value: stats.issuesTotal },
                { label: "In Progress", value: stats.issuesInProgress },
                { label: "Resolved", value: stats.issuesResolved },
                { label: "Communities", value: stats.communitiesTotal },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-2xl font-bold">{s.value ?? 0}</p>
                  <p className="text-xs text-civic-200">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-slate-900">How It Works</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            From reporting to resolution — a path to a cleaner community.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Card key={s.title} className="text-center">
                <span className="text-3xl">{s.icon}</span>
                <p className="mt-2 text-xs font-bold uppercase text-civic-600">Step {i + 1}</p>
                <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="bg-civic-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">About Civic Review Portal</h2>
              <p className="mt-4 leading-relaxed text-slate-600">
                We exist for the <strong>betterment of society</strong> and the{" "}
                <strong>cleanliness of our country</strong>. Connect with cleaning communities,
                gated societies, and people who share similar interests in civic improvement.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-slate-700">
                <li className="flex gap-2"><span className="text-civic-600">✓</span> Transparent issue tracking</li>
                <li className="flex gap-2"><span className="text-civic-600">✓</span> Communities with shared interests</li>
                <li className="flex gap-2"><span className="text-civic-600">✓</span> Citizen feedback on public services</li>
                <li className="flex gap-2"><span className="text-civic-600">✓</span> Profiles to connect with neighbors</li>
              </ul>
            </div>
            <SmartImage
              src={siteImages.about.src}
              fallback={siteImages.about.fallback}
              alt={siteImages.about.alt}
              className="rounded-2xl shadow-xl"
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Civic News & Topics</h2>
              <p className="mt-2 text-slate-600">Cleanliness and civic initiatives near you.</p>
            </div>
            <Link to="/news" className="text-sm font-semibold text-civic-600 hover:text-civic-800">
              View all →
            </Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {newsTopics.slice(0, 3).map((t) => (
              <Link
                key={t.id}
                to={`/news/${t.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <SmartImage
                  src={t.image}
                  fallback={t.imageFallback}
                  alt={t.title}
                  className="h-40 w-full object-cover transition group-hover:scale-105"
                />
                <div className="p-4">
                  <h3 className="font-bold text-slate-900">{t.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{t.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-civic-800 py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to make a difference?</h2>
          <p className="mt-3 text-civic-100">Join communities with similar interests today.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button to="/register" size="lg" className="!bg-white !text-civic-900">Create Account</Button>
            <Button to="/login" size="lg" variant="secondary" className="!border-white !text-white hover:!bg-white/10">Login</Button>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
