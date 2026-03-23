"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Show, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Droplets } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

/* ─── Water Drop Logo ─── */
function DropLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M16 3l8.49 8.49a12 12 0 11-16.97 0L16 3z" fill="url(#dg)" />
      <path d="M16 3l8.49 8.49a12 12 0 11-16.97 0L16 3z" fill="url(#ds)" fillOpacity="0.3" />
      <ellipse cx="12" cy="17" rx="2.5" ry="3.5" fill="white" opacity="0.35" />
      <ellipse cx="11" cy="15.5" rx="1" ry="1.5" fill="white" opacity="0.5" />
      <defs>
        <linearGradient id="dg" x1="8" y1="5" x2="24" y2="28">
          <stop stopColor="#4DD9FF" />
          <stop offset="0.5" stopColor="#00A3CC" />
          <stop offset="1" stopColor="#006B8F" />
        </linearGradient>
        <radialGradient id="ds" cx="0.3" cy="0.3" r="0.7">
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/* ─── Floating Sparkles ─── */
function Sparkles() {
  const [dots] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 6,
      duration: 3 + Math.random() * 4,
    }))
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d) => (
        <div
          key={d.id}
          className="absolute rounded-full bg-[#00BFFF]"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
            animation: `sparkle ${d.duration}s ease-in-out ${d.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Rising Bubbles ─── */
function Bubbles() {
  const [bubbles] = useState(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: 5 + Math.random() * 90,
      size: 8 + Math.random() * 40,
      delay: Math.random() * 12,
      duration: 8 + Math.random() * 14,
    }))
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="absolute rounded-full"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            border: "1px solid rgba(0, 191, 255, 0.12)",
            background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5), rgba(0,191,255,0.04))",
            boxShadow: "inset 0 -2px 6px rgba(0,191,255,0.06)",
            animation: `bubbleFloat ${b.duration}s ease-in-out ${b.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Wave Divider ─── */
function WaveDivider({ flip = false, color = "#F0FAFF" }: { flip?: boolean; color?: string }) {
  return (
    <div className={`relative z-10 -my-px ${flip ? "rotate-180" : ""}`}>
      <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" className="block w-full h-[50px] sm:h-[80px]">
        <path
          d="M0,40 C180,80 360,0 540,40 C720,80 900,0 1080,40 C1260,80 1440,20 1440,40 L1440,80 L0,80 Z"
          fill={color}
        />
        <path
          d="M0,50 C200,70 400,20 600,50 C800,80 1000,10 1200,50 C1350,75 1440,30 1440,50 L1440,80 L0,80 Z"
          fill={color}
          opacity="0.5"
        />
      </svg>
    </div>
  );
}

/* ─── Water Ripple on Hover ─── */
function RippleCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; show: boolean }>({
    x: 0, y: 0, show: false,
  });

  const handleMouse = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top, show: true });
  };

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={handleMouse}
      onMouseLeave={() => setRipple((r) => ({ ...r, show: false }))}
    >
      {ripple.show && (
        <div
          className="pointer-events-none absolute z-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-300"
          style={{
            left: ripple.x,
            top: ripple.y,
            background: "radial-gradient(circle, rgba(0,191,255,0.08) 0%, transparent 70%)",
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const t = useTranslations("landing");

  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const steps = [
    { step: "01", title: t("howItWorks.step01.title"), desc: t("howItWorks.step01.desc"), icon: "M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h.386a.75.75 0 00.707-.497l1.063-3.192A1.5 1.5 0 016.948 9.5h6.105a1.5 1.5 0 011.416 1.061l1.063 3.192a.75.75 0 00.707.497h.386" },
    { step: "02", title: t("howItWorks.step02.title"), desc: t("howItWorks.step02.desc"), icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" },
    { step: "03", title: t("howItWorks.step03.title"), desc: t("howItWorks.step03.desc"), icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" },
    { step: "04", title: t("howItWorks.step04.title"), desc: t("howItWorks.step04.desc"), icon: "M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316zM16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" },
  ];

  const features = [
    { key: "photoEvidence", c: "#0099CC" },
    { key: "damageDoc", c: "#007A99" },
    { key: "liveChat", c: "#00BFFF" },
    { key: "liveTracking", c: "#00A3CC" },
    { key: "qualityRated", c: "#005F73" },
    { key: "flexPayments", c: "#0099CC" },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white text-[#1A2B3C] selection:bg-[#00BFFF]/20 selection:text-[#006B8F]">
      {/* ─── Atmospheric Background ─── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,#D6F2FF_0%,white_60%)]" />

        {/* Floating color orbs */}
        <div
          className="absolute -right-32 top-20 h-[500px] w-[500px] rounded-full opacity-40"
          style={{
            background: "radial-gradient(circle, #B3ECFF 0%, transparent 65%)",
            transform: `translateY(${scrollY * 0.04}px)`,
          }}
        />
        <div
          className="absolute -left-40 top-[60%] h-[600px] w-[600px] rounded-full opacity-25"
          style={{
            background: "radial-gradient(circle, #CCF5FF 0%, transparent 65%)",
            transform: `translateY(${-scrollY * 0.03}px)`,
          }}
        />
        <div
          className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #99E6FF 0%, transparent 70%)",
            transform: `translateY(${-scrollY * 0.02}px)`,
          }}
        />

        <Sparkles />
        <Bubbles />
      </div>

      {/* ─── Navigation ─── */}
      <header
        className="fixed left-0 right-0 top-0 z-50 transition-all duration-500"
        style={{
          backgroundColor: scrollY > 60 ? "rgba(255,255,255,0.82)" : "transparent",
          backdropFilter: scrollY > 60 ? "blur(24px) saturate(180%)" : "none",
          boxShadow: scrollY > 60 ? "0 1px 0 rgba(0,153,204,0.06), 0 4px 20px rgba(0,153,204,0.04)" : "none",
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6">
          <Link href="/" className="group flex items-center gap-2">
            <Droplets className="h-6 w-6 text-[#0099CC]" />
            <span className="text-lg font-bold tracking-tight sm:text-xl">
              my<span className="text-[#0099CC]">Wash</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <Show when="signed-out">
              <SignInButton mode="redirect">
                <button className="rounded-full px-3 py-2 text-sm font-medium text-[#1A2B3C]/55 transition-colors hover:text-[#1A2B3C] sm:px-5">
                  {t("nav.login")}
                </button>
              </SignInButton>
              <SignUpButton mode="redirect">
                <button className="group relative overflow-hidden rounded-full bg-gradient-to-br from-[#00CFFF] via-[#00A3CC] to-[#007A99] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(0,191,255,0.25)] transition-all hover:shadow-[0_6px_30px_rgba(0,191,255,0.35)] active:scale-[0.97] sm:px-6">
                  <span className="relative z-10">{t("nav.register")}</span>
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link href="/dashboard" className="rounded-full px-5 py-2 text-sm font-medium text-[#0099CC] transition-colors hover:text-[#007A99]">
                Mi cuenta
              </Link>
              <UserButton signInUrl="/login" />
            </Show>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative z-10 flex min-h-screen items-center px-4 sm:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            {/* Eyebrow pill */}
            <div className="mb-7 inline-flex animate-[fadeUp_0.7s_ease-out_0.2s_both] items-center gap-2.5 rounded-full border border-[#00BFFF]/12 bg-white/80 px-4 py-2 shadow-[0_2px_12px_rgba(0,191,255,0.06)] backdrop-blur-sm">
              <DropLogo size={16} />
              <span className="text-xs font-semibold tracking-wide text-[#007A99]">
                {t("hero.eyebrow")}
              </span>
            </div>

            {/* Headline */}
            <h1 className="animate-[fadeUp_0.7s_ease-out_0.35s_both] text-[2rem] font-extrabold leading-[1.08] tracking-tight min-[375px]:text-[2.5rem] sm:text-7xl lg:text-[5.5rem]">
              {t("hero.title1")}
              <br />
              {t("hero.title2")}{" "}
              <span className="relative">
                <span className="text-[#0099CC]">{t("hero.titleHighlight")}</span>
                {/* Subtle accent */}
              </span>
            </h1>

            {/* Sub */}
            <p className="mt-5 max-w-lg animate-[fadeUp_0.7s_ease-out_0.5s_both] text-base leading-relaxed text-[#1A2B3C]/45 sm:mt-7 sm:text-xl">
              {t("hero.subtitle")}{" "}
              <span className="font-medium text-[#1A2B3C]/75">{t("hero.subtitleBold")}</span>
            </p>

            {/* CTAs */}
            <div className="mt-8 flex animate-[fadeUp_0.7s_ease-out_0.65s_both] flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
              <Link href="/register" className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-br from-[#00CFFF] via-[#00A3CC] to-[#007A99] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_6px_24px_rgba(0,191,255,0.3)] transition-all hover:shadow-[0_8px_36px_rgba(0,191,255,0.4)] active:scale-[0.97] sm:px-9 sm:py-4 sm:text-base">
                <span className="relative z-10">{t("hero.ctaPrimary")}</span>
                <svg className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                <div className="absolute inset-0 bg-white opacity-0 transition-opacity group-hover:opacity-15" />
              </Link>
              <Link href="#como-funciona" className="group inline-flex items-center justify-center gap-2 rounded-full border border-[#1A2B3C]/8 bg-white/70 px-6 py-3.5 text-sm font-medium text-[#1A2B3C]/60 shadow-sm backdrop-blur-sm transition-all hover:border-[#00BFFF]/25 hover:text-[#007A99] hover:shadow-md sm:px-8 sm:py-4 sm:text-base">
                {t("hero.ctaSecondary")}
                <svg className="h-4 w-4 transition-transform group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" /></svg>
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-10 flex animate-[fadeUp_0.7s_ease-out_0.8s_both] items-center gap-3 sm:mt-14 sm:gap-4">
              <div className="flex -space-x-2.5">
                {["#0099CC", "#00BFFF", "#007A99", "#00A3CC", "#005F73"].map((c, i) => (
                  <div key={i} className="flex h-8 w-8 items-center justify-center rounded-full border-[2.5px] border-white text-[9px] font-bold text-white shadow-sm sm:h-9 sm:w-9 sm:text-[10px]" style={{ backgroundColor: c }}>
                    {["JR", "MA", "LC", "PG", "DF"][i]}
                  </div>
                ))}
              </div>
              <div className="text-xs text-[#1A2B3C]/35 sm:text-sm">
                <span className="font-bold text-[#1A2B3C]/65">200+</span> {t("hero.socialProof")}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll arrow */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="h-8 w-8 text-[#00BFFF]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* ─── Wave transition ─── */}
      <WaveDivider color="#F4FBFF" />

      {/* ─── How it works ─── */}
      <section id="como-funciona" className="relative z-10 bg-[#F4FBFF] px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-1">
              <DropLogo size={22} />
              <svg className="h-3 w-3 opacity-40" viewBox="0 0 32 32" fill="#00BFFF"><path d="M16 3l8.49 8.49a12 12 0 11-16.97 0L16 3z" /></svg>
              <svg className="h-2 w-2 opacity-20" viewBox="0 0 32 32" fill="#00BFFF"><path d="M16 3l8.49 8.49a12 12 0 11-16.97 0L16 3z" /></svg>
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-5xl">
              {t("howItWorks.title")} <span className="text-[#0099CC]">{t("howItWorks.titleHighlight")}</span>
            </h2>
            <p className="mt-3 text-[#1A2B3C]/35">{t("howItWorks.subtitle")}</p>
          </div>

          <div className="mt-10 grid gap-3 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {steps.map((item) => (
              <RippleCard
                key={item.step}
                className="group rounded-2xl border border-white/80 bg-white/70 p-6 shadow-[0_2px_16px_rgba(0,153,204,0.04)] backdrop-blur-sm transition-all duration-300 hover:border-[#00BFFF]/15 hover:shadow-[0_8px_32px_rgba(0,153,204,0.08)]"
              >
                <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#00BFFF]/40">{item.step}</span>
                <div className="mt-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#E8F7FF] to-[#D0F0FF] text-[#007A99] shadow-inner transition-all group-hover:from-[#D0F0FF] group-hover:to-[#B8E6FF]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
                </div>
                <h3 className="mt-3 text-[15px] font-semibold">{item.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[#1A2B3C]/35">{item.desc}</p>
              </RippleCard>
            ))}
          </div>
        </div>
      </section>

      <WaveDivider flip color="#F4FBFF" />

      {/* ─── Features ─── */}
      <section className="relative z-10 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-5xl">
                {t("features.title")} <span className="text-[#0099CC]">{t("features.titleHighlight")}</span>
              </h2>
              <p className="mt-4 max-w-md text-base text-[#1A2B3C]/40 sm:text-lg">
                {t("features.subtitle")}
              </p>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              {features.map((f) => (
                <RippleCard
                  key={f.key}
                  className="group rounded-xl border border-[#E0F0FA] bg-white/80 p-5 shadow-sm backdrop-blur-sm transition-all hover:border-[#00BFFF]/20 hover:shadow-[0_4px_20px_rgba(0,153,204,0.06)]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-2 w-2 rounded-full shadow-[0_0_6px_rgba(0,191,255,0.3)]" style={{ backgroundColor: f.c }} />
                    <h3 className="text-sm font-semibold">{t(`features.${f.key}.title`)}</h3>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#1A2B3C]/30">{t(`features.${f.key}.desc`)}</p>
                </RippleCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Wave ─── */}
      <WaveDivider color="#F0FAFF" />

      {/* ─── Pricing ─── */}
      <section className="relative z-10 bg-[#F0FAFF] px-4 py-16 sm:px-6 sm:py-24">
        <Sparkles />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#00BFFF]/10 bg-white/80 px-4 py-2 shadow-sm backdrop-blur-sm">
            <DropLogo size={14} />
            <span className="text-xs font-semibold tracking-wide text-[#007A99]">{t("pricing.badge")}</span>
          </div>
          <div className="mt-6 text-5xl font-extrabold tracking-tight sm:text-8xl">
            <span className="text-[#1A2B3C]">{t("pricing.price")}</span>
            <span className="ml-1 text-xl font-medium text-[#1A2B3C]/25 sm:text-2xl">{t("pricing.period")}</span>
          </div>
          <p className="mt-4 text-[#1A2B3C]/40">{t("pricing.desc")}</p>
          <Link href="/register" className="group relative mt-9 inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-br from-[#00CFFF] via-[#00A3CC] to-[#007A99] px-8 py-3.5 text-base font-semibold text-white shadow-[0_6px_30px_rgba(0,191,255,0.3)] transition-all hover:shadow-[0_10px_40px_rgba(0,191,255,0.4)] active:scale-[0.97] sm:px-10 sm:py-4 sm:text-lg">
            <span className="relative z-10">{t("pricing.cta")}</span>
            <svg className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            <div className="absolute inset-0 bg-white opacity-0 transition-opacity group-hover:opacity-15" />
          </Link>
        </div>
      </section>

      <WaveDivider flip color="#F0FAFF" />

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-[#E0F0FA] px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-[#0099CC]" />
            <span className="text-sm font-bold tracking-tight">my<span className="text-[#0099CC]">Wash</span></span>
          </div>
          <p className="text-xs text-[#1A2B3C]/20">&copy; {new Date().getFullYear()} myWash. {t("footer.rights")}</p>
        </div>
      </footer>

      {/* ─── Animations ─── */}
      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 0.6; transform: scale(1); }
        }
        @keyframes bubbleFloat {
          0% { bottom: -8%; opacity: 0; transform: translateX(0) scale(0.8); }
          8% { opacity: 0.7; }
          50% { transform: translateX(20px) scale(1); }
          92% { opacity: 0.7; }
          100% { bottom: 105%; opacity: 0; transform: translateX(-10px) scale(0.9); }
        }
        @keyframes dropFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(8deg); }
        }
        @keyframes scrollPulse {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(5px); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
