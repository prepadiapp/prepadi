"use client";

import { useEffect, useState } from "react";
import { Mail, Phone } from "lucide-react";
import { SITE_SETTING_DEFAULTS } from "@/lib/site-settings";

export function SiteFooter() {
  const [contactPhone, setContactPhone] = useState(
    SITE_SETTING_DEFAULTS.contactPhone
  );
  const [contactEmail, setContactEmail] = useState(
    SITE_SETTING_DEFAULTS.contactEmail
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/site-settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          if (typeof data.contactPhone === "string" && data.contactPhone.trim()) {
            setContactPhone(data.contactPhone);
          }
          if (typeof data.contactEmail === "string" && data.contactEmail.trim()) {
            setContactEmail(data.contactEmail);
          }
        }
      })
      .catch(() => {
        // Offline / not migrated yet: keep defaults.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand */}
          <div className="space-y-4 md:col-span-3">
            <div className="flex items-center gap-3">
              <img
                src="/prepadi_logo.png"
                alt="Prepadi logo"
                className="h-10 w-10 rounded-xl object-cover"
              />
              <div>
                <span className="block text-lg font-bold leading-none tracking-tight">
                  Prepadi
                </span>
                <span className="text-xs font-medium text-slate-400">
                  CBT prep for Nigerian learners
                </span>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-slate-400">
              Real JAMB &amp; WAEC timed practice for students. One-click CBT exams for Nigerian schools—online or offline.
            </p>
          </div>

          {/* Product */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Product
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm font-medium text-slate-300">
              <li>
                <a href="#v1-simulator" className="transition hover:text-white">
                  CBT Simulator
                </a>
              </li>
              <li>
                <a href="#v1-bento" className="transition hover:text-white">
                  Platform Features
                </a>
              </li>
              <li>
                <a href="#v1-workflow" className="transition hover:text-white">
                  For Schools
                </a>
              </li>
              <li>
                <a href="#v1-pricing" className="transition hover:text-white">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Contact — editable by admins at /admin/settings */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Contact
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm font-medium text-slate-300">
              <li>
                <a
                  href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                  className="flex items-center gap-2 transition hover:text-white"
                >
                  <Phone className="h-4 w-4 shrink-0 text-[#FF6600]" />
                  <span className="break-all">{contactPhone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${contactEmail}`}
                  className="flex items-center gap-2 transition hover:text-white"
                >
                  <Mail className="h-4 w-4 shrink-0 text-[#FF6600]" />
                  <span className="break-all">{contactEmail}</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Exams */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Exams
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm font-medium text-slate-300">
              <li>JAMB UTME</li>
              <li>WASSCE</li>
              <li>NECO SSCE</li>
            </ul>
          </div>

          {/* Account */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Account
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm font-medium text-slate-300">
              <li>
                <button
                  onClick={() => window.location.assign("/signup")}
                  className="transition hover:text-white"
                >
                  Sign Up
                </button>
              </li>
              <li>
                <button
                  onClick={() => window.location.assign("/login")}
                  className="transition hover:text-white"
                >
                  Log In
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs font-medium text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Prepadi by Caltech Innovations, Lagos Nigeria. All rights reserved.</span>
          <span>Works online and offline · Low-data friendly</span>
        </div>
      </div>
    </footer>
  );
}
