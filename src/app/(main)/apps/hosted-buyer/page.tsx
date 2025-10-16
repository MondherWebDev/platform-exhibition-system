"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../../firebaseConfig';
import { doc, getDoc, getDocs, onSnapshot, collection, query, where, orderBy, addDoc, serverTimestamp, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';

// Use FontAwesome CDN - icons are now loaded globally from layout.tsx
// No need to import individual icons anymore

interface User {
  uid: string;
  email: string;
  role: string;
  [key: string]: any;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  exhibitorId: string;
  exhibitorName: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

interface Exhibitor {
  id: string;
  name: string;
  company: string;
  booth: string;
  category: string;
  description: string;
}

const HostedBuyerPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'meetings' | 'exhibitors' | 'messages'>('dashboard');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUser(userData);
          if (userData.category !== 'Hosted Buyer') {
            router.push('/apps');
            return;
          }
        }
      } else {
        router.push('/signin');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user) {
      // Load meetings
      const meetingsQuery = query(
        collection(db, 'meetings'),
        where('hostedBuyerId', '==', user.uid),
        orderBy('date', 'asc')
      );

      const unsubscribeMeetings = onSnapshot(meetingsQuery, (snapshot) => {
        const meetingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Meeting[];
        setMeetings(meetingsData);
      });

      // Load exhibitors
      const exhibitorsQuery = query(collection(db, 'exhibitors'));
      const unsubscribeExhibitors = onSnapshot(exhibitorsQuery, (snapshot) => {
        const exhibitorsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Exhibitor[];
        setExhibitors(exhibitorsData);
      });

      return () => {
        unsubscribeMeetings();
        unsubscribeExhibitors();
      };
    }
  }, [user]);

  const handleScheduleMeeting = async (exhibitorId: string) => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'meetings'), {
        hostedBuyerId: user.uid,
        exhibitorId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      alert('Meeting request sent!');
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      alert('Failed to schedule meeting');
    }
  };

  const filteredExhibitors = exhibitors.filter(exhibitor =>
    exhibitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exhibitor.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <i className="fas fa-crown h-8 w-8 text-yellow-500 mr-3"></i>
              <h1 className="text-2xl font-bold text-gray-900">Hosted Buyer Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.email}</span>
              <button
                onClick={() => auth.signOut()}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'fa-crown' },
              { id: 'meetings', label: 'My Meetings', icon: 'fa-calendar' },
              { id: 'exhibitors', label: 'Exhibitors', icon: 'fa-building' },
              { id: 'messages', label: 'Messages', icon: 'fa-message' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className={`fas ${tab.icon} mr-2 h-4 w-4`}></i>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <i className="fas fa-calendar h-6 w-6 text-gray-400"></i>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Meetings</dt>
                      <dd className="text-lg font-medium text-gray-900">{meetings.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <i className="fas fa-check-circle h-6 w-6 text-gray-400"></i>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Confirmed</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {meetings.filter(m => m.status === 'confirmed').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <i className="fas fa-clock h-6 w-6 text-gray-400"></i>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {meetings.filter(m => m.status === 'pending').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <i className="fas fa-building h-6 w-6 text-gray-400"></i>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Available Exhibitors</dt>
                      <dd className="text-lg font-medium text-gray-900">{exhibitors.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'meetings' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">My Meetings</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage your scheduled meetings</p>
            </div>
            <ul className="divide-y divide-gray-200">
              {meetings.map((meeting) => (
                <li key={meeting.id} className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{meeting.title}</p>
                      <p className="text-sm text-gray-500">{meeting.date} at {meeting.time}</p>
                      <p className="text-sm text-gray-500">with {meeting.exhibitorName}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        meeting.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        meeting.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        meeting.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {meeting.status}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'exhibitors' && (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="bg-white p-4 shadow rounded-lg">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <i className="fas fa-search absolute left-3 top-3 h-4 w-4 text-gray-400"></i>
                    <input
                      type="text"
                      placeholder="Search exhibitors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-filter h-4 w-4 text-gray-400"></i>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="technology">Technology</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="finance">Finance</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Exhibitors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExhibitors.map((exhibitor) => (
                <div key={exhibitor.id} className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-6">
                    <div className="flex items-center">
                      <i className="fas fa-building h-8 w-8 text-gray-400"></i>
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-gray-900">{exhibitor.name}</h3>
                        <p className="text-sm text-gray-500">{exhibitor.company}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">{exhibitor.description}</p>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <i className="fas fa-map-marker-alt mr-1 h-4 w-4"></i>
                        Booth {exhibitor.booth}
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-sm text-gray-500">{exhibitor.category}</span>
                      <button
                        onClick={() => handleScheduleMeeting(exhibitor.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                      >
                        <i className="fas fa-plus mr-2 h-4 w-4"></i>
                        Schedule Meeting
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Messages</h3>
              <div className="mt-4">
                <p className="text-gray-500">Message system coming soon...</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HostedBuyerPage;
