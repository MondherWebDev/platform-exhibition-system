"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../../../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import ProfileEditor from "../../../components/ProfileEditor";
import EnhancedBadgeGenerator from "../../../components/EnhancedBadgeGenerator";

function normalizeCategory(cat: string) {
  return cat.toLowerCase().replace(/\s+/g, "-");
}

const allowedRoles = new Set([
  "visitor",
  "exhibitor",
  "media",
  "speaker",
  "hostedbuyer",
  "vip",
]);

export default function RoleDashboardPage() {
  const params = useParams<{ role: string }>();
  const router = useRouter();
  const role = useMemo(() => (params?.role || "").toString().toLowerCase(), [params]);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Global branding (online in Firestore; logo from Cloudinary URL)
  const [appName, setAppName] = useState<string>("EventPlatform");
  const [logoUrl, setLogoUrl] = useState<string>("/logo.svg");
  const [logoSize, setLogoSize] = useState<number>(32);
  const [brandingLoading, setBrandingLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/?signin=true");
        return;
      }
      setUser(u);

      const snap = await getDoc(doc(db, "Users", u.uid));
      const data = snap.exists() ? snap.data() : null;

      if (!data) {
        router.replace("/dashboard");
        return;
      }

      setProfile(data);

      const category = (data as any).category || "visitor";
      const normalized = normalizeCategory(category);

      // Map categories to their dashboard routes
      const categoryRoutes: { [key: string]: string } = {
        "organizer": "/dashboard/organizer",
        "agent": "/dashboard/agent",
        "visitor": "/dashboard/visitor",
        "exhibitor": "/dashboard/exhibitor",
        "media": "/dashboard/media",
        "speaker": "/dashboard/speaker",

        "vip": "/dashboard/vip",
        "sponsor": "/dashboard/sponsor"
      };

      // If user is trying to access a different role than their category, redirect them
      if (role && allowedRoles.has(role) && role !== normalized) {
        const correctRoute = categoryRoutes[normalized];
        if (correctRoute) {
          router.replace(correctRoute);
          return;
        }
      }

      // If user doesn't have permission for this role, redirect to their correct dashboard
      if (!allowedRoles.has(role)) {
        const correctRoute = categoryRoutes[normalized];
        if (correctRoute) {
          router.replace(correctRoute);
          return;
        }
      }

      // If everything is correct, proceed with loading
      setLoading(false);
    });
    return () => unsub();
  }, [role, router]);

  // Load global app settings from Firestore (source of truth)
  useEffect(() => {
    async function loadBranding() {
      try {
        const sDoc = await getDoc(doc(db, "AppSettings", "global"));
        if (sDoc.exists()) {
          const s = sDoc.data() as any;
          if (s.appName) setAppName(s.appName);
          if (s.logoUrl) setLogoUrl(s.logoUrl);
          if (typeof s.logoSize === "number") setLogoSize(s.logoSize);
        }
      } finally {
        setBrandingLoading(false);
      }
    }
    loadBranding();
  }, []);

  if (loading || brandingLoading) {
    return (
      <div className="min-h-screen bg-[#181f2a] flex items-center justify-center">
        <div className="text-white/80">Loading your dashboard...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-[#181f2a] flex items-center justify-center">
        <div className="text-white/80">Please sign in to continue.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#181f2a]">
      {/* Global header branding from Firestore */}
      <header className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1c2331] to-[#232b3e] border-b border-[#0d6efd]/20 shadow-lg flex-shrink-0 h-16">
        <div className="flex items-center gap-4">
          <img
            src={logoUrl}
            alt="Logo"
            className="object-contain flex-shrink-0"
            style={{ height: `${logoSize}px`, width: "auto", maxHeight: "40px", maxWidth: "120px" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/logo.svg";
            }}
          />
          <div className="flex items-center gap-2">
            <span className="text-white text-xl font-bold tracking-tight hidden sm:block">{appName}</span>
            <div className="w-1 h-6 bg-[#0d6efd]/50 rounded-full"></div>
            <span className="text-[#6c757d] text-sm font-medium hidden md:block">
              {profile?.fullName || user.email}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 bg-gradient-to-br from-sky-900 via-sky-800 to-sky-950">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-black text-white">{profile.category || "Dashboard"}</h1>
            <p className="text-white/70 mt-1">Welcome, {profile.fullName || user.email}</p>
          </div>

          {/* Profile */}
          <div className="bg-[#232b3e]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-[#232b3e]/40 p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">My Profile</h2>
            <ProfileEditor />
          </div>

          {/* Badge */}
          <div className="bg-[#232b3e]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-[#232b3e]/40 p-6">
            <h2 className="text-xl font-bold text-white mb-4">My Badge</h2>
            <div className="flex items-center justify-center">
              <EnhancedBadgeGenerator
                attendee={{
                  id: user.uid,
                  fullName: profile.fullName || profile.email || "User",
                  email: profile.email || "",
                  company: profile.company || "",
                  position: profile.position || "Attendee",
                  category: profile.category || "Visitor"
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
