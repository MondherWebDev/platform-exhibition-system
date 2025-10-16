import GlassCard from '../components/GlassCard';
import ProfileEditor from '../components/ProfileEditor';
import { auth, db } from '../firebaseConfig';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

const featureCards = {
  Organizer: {
    icon: '🛠️',
    title: 'Organizer',
    desc: 'Full access: Manage events, view analytics, edit all profiles, export data, etc.'
  },
  Exhibitor: {
    icon: '🏢',
    title: 'Exhibitor',
    desc: 'Lead scanning, booth management, export leads, view floorplan.'
  },
  Media: {
    icon: '🎤',
    title: 'Media',
    desc: 'Access press resources, schedule interviews, view agenda.'
  },
  Speaker: {
    icon: '📢',
    title: 'Speaker',
    desc: 'Session management, upload slides, view attendee list.'
  },
  'Hosted Buyer': {
    icon: '🤝',
    title: 'Hosted Buyer',
    desc: 'Networking, meeting scheduler, view recommended matches.'
  },
  VIP: {
    icon: '⭐',
    title: 'VIP',
    desc: 'Priority access, exclusive sessions, concierge support.'
  },
  Visitor: {
    icon: '👤',
    title: 'Visitor',
    desc: 'View agenda, check-in/out, explore exhibitors.'
  }
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const ref = doc(db, 'Users', u.uid);
        const snap = await getDoc(ref);
        const profileData = snap.exists() ? snap.data() : null;
        setProfile(profileData);

        // Only redirect if we have profile data and it's not already the main dashboard
        if (profileData && window.location.pathname === '/dashboard') {
          const category = profileData.category || 'visitor';
          const categoryRoutes: { [key: string]: string } = {
            'organizer': '/dashboard/organizer',
            'agent': '/dashboard/agent',
            'visitor': '/dashboard/visitor',
            'exhibitor': '/dashboard/exhibitor',
            'media': '/dashboard/media',
            'speaker': '/dashboard/speaker',

            'hostedbuyer': '/dashboard/hostedbuyer',
            'vip': '/dashboard/vip',
            'sponsor': '/dashboard/sponsor'
          };

          const redirectPath = categoryRoutes[category.toLowerCase().replace(/\s+/g, '-')];
          if (redirectPath) {
            router.replace(redirectPath);
            return;
          }
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) return <div className="text-white">Loading dashboard...</div>;
  if (!user || !profile) return <div className="text-white">Please log in to view your dashboard.</div>;

  // Dashboard features by category
  const card = featureCards[profile.category as keyof typeof featureCards] || { icon: '❓', title: 'Unknown', desc: 'No features available.' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-900 via-sky-800 to-sky-950 flex flex-col items-center justify-center p-4">
      <GlassCard className="max-w-xl w-full mx-auto mb-8">
        <h1 className="text-3xl font-bold text-white mb-4 text-center">Welcome to your Dashboard</h1>
        <ProfileEditor />
        <div className="mt-8 w-full flex justify-center">
          <div className="bg-glass backdrop-blur-md rounded-xl shadow-lg border border-white/20 p-6 flex flex-col items-center w-full max-w-md">
            <div className="text-4xl mb-2">{card.icon}</div>
            <div className="text-xl font-bold text-white mb-2">{card.title} Features</div>
            <div className="text-white/80 text-center mb-2">{card.desc}</div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
