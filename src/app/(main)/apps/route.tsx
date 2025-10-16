"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

// Application definitions
const APPLICATIONS = {
  REGISTRATION_COUNTER: {
    id: 'registration-counter',
    name: 'Registration Counter',
    description: 'Multi-agent registration and badge management',
    icon: 'faUsers',
    roles: ['Agent', 'Organizer'],
    path: '/apps/registration-counter',
    color: 'blue'
  },
  EXHIBITOR_APP: {
    id: 'exhibitor-app',
    name: 'Exhibitor Portal',
    description: 'Lead management and badge scanning',
    icon: 'faBuilding',
    roles: ['Exhibitor'],
    path: '/apps/exhibitor',
    color: 'purple'
  },
  HOSTED_BUYER_APP: {
    id: 'hosted-buyer-app',
    name: 'VIP Buyer Portal',
    description: 'AI matchmaking and meeting management',
    icon: 'faCrown',
    roles: ['Hosted Buyer'],
    path: '/apps/hosted-buyer',
    color: 'gold'
  },
  VISITOR_APP: {
    id: 'visitor-app',
    name: 'Visitor Portal',
    description: 'E-badge and event access',
    icon: 'faIdBadge',
    roles: ['Visitor'],
    path: '/apps/visitor',
    color: 'green'
  },
  ORGANIZER_CENTRAL: {
    id: 'organizer-central',
    name: 'Central Command',
    description: 'Complete platform oversight and analytics',
    icon: 'faChartBar',
    roles: ['Organizer', 'Admin'],
    path: '/dashboard/organizer',
    color: 'red'
  }
};

export default function AppsRouter() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'Users', u.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading applications...</div>
      </div>
    );
  }

  if (!user) {
    router.push('/?signin=true');
    return null;
  }

  // Find user's primary application
  const userCategory = userProfile?.category || 'Visitor';
  const userApp = Object.values(APPLICATIONS).find(app =>
    app.roles.includes(userCategory)
  );

  if (userApp) {
    router.push(userApp.path);
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-center">
        <h2>Application Access Error</h2>
        <p>Unable to determine your application access. Please contact support.</p>
      </div>
    </div>
  );
}
