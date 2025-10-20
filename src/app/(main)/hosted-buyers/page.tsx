"use client";
import React, { useState, useEffect } from "react";
import { db, auth } from "../../../firebaseConfig";
import AuthForm from "../../../components/AuthForm";
import { collection, getDocs, doc, updateDoc, serverTimestamp, getDoc, setDoc, query, where, orderBy, limit, onSnapshot, addDoc, deleteDoc, increment } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { authService, UserProfile } from "../../../utils/authService";
import { sendWelcomeEmail, sendAccountCreatedNotification } from "../../../utils/emailService";
import ClientOnly from '../../../components/ClientOnly';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faUserPlus,
  faEdit,
  faTrash,
  faEye,
  faCalendar,
  faBuilding,
  faEnvelope,
  faPhone,
  faStar,
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faCrown,
  faHandshake,
  faChartLine,
  faFilter,
  faSearch,
  faDownload,
  faUpload,
  faCog,
  faBars,
  faSignOutAlt,
  faBell,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

export default function HostedBuyersApp() {
  const [user, setUser] = React.useState<any>(null);
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [hostedBuyers, setHostedBuyers] = React.useState<any[]>([]);
  const [currentEventId, setCurrentEventId] = React.useState<string>('default');
  const [isClient, setIsClient] = React.useState(false);

  // Filter and search state
  const [buyerFilter, setBuyerFilter] = React.useState<{search: string; industry: string; companySize: string}>({
    search: '',
    industry: 'All',
    companySize: 'All'
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = React.useState<boolean>(false);
  const [showEditModal, setShowEditModal] = React.useState<boolean>(false);
  const [editingBuyer, setEditingBuyer] = React.useState<any>(null);

  // Form state
  const [buyerForm, setBuyerForm] = React.useState<any>({
    name: '',
    company: '',
    email: '',
    phone: '',
    industry: '',
    companySize: '',
    interests: '',
    budget: '',
    notes: '',
    photoUrl: ''
  });

  const [editForm, setEditForm] = React.useState<any>({
    name: '',
    company: '',
    email: '',
    phone: '',
    industry: '',
    companySize: '',
    interests: '',
    budget: '',
    notes: '',
    photoUrl: ''
  });

  // Authentication check
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'Users', u.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.category === 'Organizer' || data.category === 'Admin') {
            setUserProfile(data);
          }
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load hosted buyers
  React.useEffect(() => {
    if (!currentEventId) return;

    const unsubscribe = onSnapshot(
      collection(db, 'Events', currentEventId, 'HostedBuyers'),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setHostedBuyers(data);
      }
    );

    return () => unsubscribe();
  }, [currentEventId]);

  // Load global settings
  React.useEffect(() => {
    async function loadGlobalSettings() {
      const sDoc = await getDoc(doc(db, 'AppSettings', 'global'));
      if (sDoc.exists()) {
        const s = sDoc.data() as any;
        if (s.eventId) {
          setCurrentEventId(s.eventId);
        }
      }
    }
    loadGlobalSettings();
  }, []);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Filter hosted buyers
  const filteredBuyers = React.useMemo(() => {
    return hostedBuyers.filter((buyer: any) => {
      const matchesSearch = !buyerFilter.search ||
        (buyer.name || '').toLowerCase().includes(buyerFilter.search.toLowerCase()) ||
        (buyer.company || '').toLowerCase().includes(buyerFilter.search.toLowerCase()) ||
        (buyer.email || '').toLowerCase().includes(buyerFilter.search.toLowerCase());

      const matchesIndustry = buyerFilter.industry === 'All' || buyer.industry === buyerFilter.industry;
      const matchesCompanySize = buyerFilter.companySize === 'All' || buyer.companySize === buyerFilter.companySize;

      return matchesSearch && matchesIndustry && matchesCompanySize;
    });
  }, [hostedBuyers, buyerFilter]);

  // Create hosted buyer
  const createHostedBuyer = async () => {
    if (!buyerForm.name || !buyerForm.company || !buyerForm.email) {
      alert('Please fill in required fields: Name, Company, and Email');
      return;
    }

    try {
      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8);

      // Create user account for hosted buyer
      const result = await authService.signUp(
        buyerForm.email,
        tempPassword,
        {
          fullName: buyerForm.name,
          category: 'Hosted Buyer',
          company: buyerForm.company,
          position: 'Hosted Buyer',
          contactPhone: buyerForm.phone,
          industry: buyerForm.industry,
          companySize: buyerForm.companySize,
          interests: buyerForm.interests,
          budget: buyerForm.budget,
          logoUrl: buyerForm.photoUrl
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Registration failed');
      }

      // Get the current user after successful registration
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Store hosted buyer data in event collection
        await setDoc(doc(db, 'Events', currentEventId, 'HostedBuyers', currentUser.uid), {
          name: buyerForm.name,
          company: buyerForm.company,
          email: buyerForm.email,
          phone: buyerForm.phone,
          industry: buyerForm.industry,
          companySize: buyerForm.companySize,
          interests: buyerForm.interests,
          budget: buyerForm.budget,
          notes: buyerForm.notes,
          photoUrl: buyerForm.photoUrl,
          userId: currentUser.uid,
          status: 'invited',
          createdAt: serverTimestamp(),
          createdBy: user?.uid,
          tempPassword: tempPassword
        });

        // Send welcome email
        try {
          await sendWelcomeEmail(buyerForm.email);
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
        }

        setBuyerForm({
          name: '',
          company: '',
          email: '',
          phone: '',
          industry: '',
          companySize: '',
          interests: '',
          budget: '',
          notes: '',
          photoUrl: ''
        });
        setShowCreateModal(false);
      }
    } catch (error: any) {
      console.error('Error creating hosted buyer:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Edit hosted buyer
  const editHostedBuyer = async () => {
    if (!editingBuyer || !editForm.name) return;

    try {
      await setDoc(doc(db, 'Events', currentEventId, 'HostedBuyers', editingBuyer.id), {
        name: editForm.name,
        company: editForm.company,
        email: editForm.email,
        phone: editForm.phone,
        industry: editForm.industry,
        companySize: editForm.companySize,
        interests: editForm.interests,
        budget: editForm.budget,
        notes: editForm.notes,
        photoUrl: editForm.photoUrl,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      }, { merge: true });

      setShowEditModal(false);
      setEditingBuyer(null);
      setEditForm({
        name: '',
        company: '',
        email: '',
        phone: '',
        industry: '',
        companySize: '',
        interests: '',
        budget: '',
        notes: '',
        photoUrl: ''
      });
    } catch (error) {
      console.error('Error updating hosted buyer:', error);
    }
  };

  // Delete hosted buyer
  const deleteHostedBuyer = async (buyerId: string, buyerName: string) => {
    if (!confirm(`Delete hosted buyer "${buyerName}"?`)) return;

    try {
      await deleteDoc(doc(db, 'Events', currentEventId, 'HostedBuyers', buyerId));
    } catch (error) {
      console.error('Error deleting hosted buyer:', error);
    }
  };

  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white">Loading Hosted Buyers...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <AuthForm />
      </div>
    );
  }

  if (!userProfile || (userProfile.category !== 'Organizer' && userProfile.category !== 'Admin')) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <FontAwesomeIcon icon={faTimesCircle} className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p>Only organizers can access the hosted buyers system.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Header */}
      <header className="bg-blue-900/80 backdrop-blur-md border-b border-blue-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faCrown} className="text-yellow-400 text-2xl" />
            <div>
              <h1 className="text-xl font-bold text-white">Hosted Buyers Management</h1>
              <p className="text-blue-200 text-sm">VIP buyer invitation and management system</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={async () => {
                await auth.signOut();
                window.location.href = '/signin';
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-600/20 rounded-xl p-6 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm">Total Hosted Buyers</p>
                <p className="text-3xl font-bold text-white">{hostedBuyers.length}</p>
              </div>
              <FontAwesomeIcon icon={faCrown} className="text-blue-400 text-3xl" />
            </div>
          </div>

          <div className="bg-green-600/20 rounded-xl p-6 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm">Confirmed</p>
                <p className="text-3xl font-bold text-white">
                  {hostedBuyers.filter((b: any) => b.status === 'confirmed').length}
                </p>
              </div>
              <FontAwesomeIcon icon={faCheckCircle} className="text-green-400 text-3xl" />
            </div>
          </div>

          <div className="bg-yellow-600/20 rounded-xl p-6 border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-300 text-sm">Pending</p>
                <p className="text-3xl font-bold text-white">
                  {hostedBuyers.filter((b: any) => b.status === 'invited').length}
                </p>
              </div>
              <FontAwesomeIcon icon={faSpinner} className="text-yellow-400 text-3xl" />
            </div>
          </div>

          <div className="bg-purple-600/20 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm">Industries</p>
                <p className="text-3xl font-bold text-white">
                  {new Set(hostedBuyers.map((b: any) => b.industry).filter(Boolean)).size}
                </p>
              </div>
              <FontAwesomeIcon icon={faBuilding} className="text-purple-400 text-3xl" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white/5 rounded-xl p-6 mb-6 border border-white/10">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search hosted buyers..."
                value={buyerFilter.search}
                onChange={(e) => setBuyerFilter({...buyerFilter, search: e.target.value})}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <select
                value={buyerFilter.industry}
                onChange={(e) => setBuyerFilter({...buyerFilter, industry: e.target.value})}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Industries</option>
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Retail">Retail</option>
                <option value="Energy">Energy</option>
              </select>
              <select
                value={buyerFilter.companySize}
                onChange={(e) => setBuyerFilter({...buyerFilter, companySize: e.target.value})}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Sizes</option>
                <option value="1-50">1-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-1000">201-1000 employees</option>
                <option value="1000+">1000+ employees</option>
              </select>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faUserPlus} className="w-4 h-4" />
                Add Buyer
              </button>
            </div>
          </div>
        </div>

        {/* Hosted Buyers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBuyers.map((buyer) => (
            <div key={buyer.id} className="bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-start gap-4">
                {buyer.photoUrl ? (
                  <img
                    src={buyer.photoUrl}
                    alt={buyer.name}
                    className="h-16 w-16 object-cover rounded-full"
                  />
                ) : (
                  <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
                    <FontAwesomeIcon icon={faCrown} className="text-white text-xl" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-lg truncate">{buyer.name}</h3>
                  <p className="text-blue-300 font-semibold truncate">{buyer.company}</p>
                  <p className="text-gray-400 text-sm truncate">{buyer.position}</p>

                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <FontAwesomeIcon icon={faEnvelope} className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-300 truncate">{buyer.email}</span>
                    </div>
                    {buyer.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <FontAwesomeIcon icon={faPhone} className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-300">{buyer.phone}</span>
                      </div>
                    )}
                    {buyer.industry && (
                      <div className="flex items-center gap-2 text-sm">
                        <FontAwesomeIcon icon={faBuilding} className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-300">{buyer.industry}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      buyer.status === 'confirmed' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {buyer.status || 'invited'}
                    </span>
                    {buyer.userId && (
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300">
                        Account Created
                      </span>
                    )}
                  </div>

                  {buyer.tempPassword && (
                    <div className="mt-2 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs">
                      <span className="text-yellow-300">Temp Password: </span>
                      <span className="font-mono text-yellow-200">{buyer.tempPassword}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingBuyer(buyer);
                      setEditForm({
                        name: buyer.name || '',
                        company: buyer.company || '',
                        email: buyer.email || '',
                        phone: buyer.phone || '',
                        industry: buyer.industry || '',
                        companySize: buyer.companySize || '',
                        interests: buyer.interests || '',
                        budget: buyer.budget || '',
                        notes: buyer.notes || '',
                        photoUrl: buyer.photoUrl || ''
                      });
                      setShowEditModal(true);
                    }}
                    className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                    title="Edit buyer"
                  >
                    <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteHostedBuyer(buyer.id, buyer.name)}
                    className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                    title="Delete buyer"
                  >
                    <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredBuyers.length === 0 && (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faCrown} className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Hosted Buyers Yet</h3>
            <p className="text-gray-400 mb-6">Start by inviting your first VIP buyer to the event.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 mx-auto"
            >
              <FontAwesomeIcon icon={faUserPlus} className="w-4 h-4" />
              Invite First Buyer
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Invite Hosted Buyer</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <FontAwesomeIcon icon={faTimesCircle} className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Full Name *"
                value={buyerForm.name}
                onChange={(e) => setBuyerForm({...buyerForm, name: e.target.value})}
              />
              <input
                className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Company *"
                value={buyerForm.company}
                onChange={(e) => setBuyerForm({...buyerForm, company: e.target.value})}
              />
              <input
                className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Email *"
                type="email"
                value={buyerForm.email}
                onChange={(e) => setBuyerForm({...buyerForm, email: e.target.value})}
              />
              <input
                className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Phone"
                value={buyerForm.phone}
                onChange={(e) => setBuyerForm({...buyerForm, phone: e.target.value})}
              />
              <input
                className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Industry"
                value={buyerForm.industry}
                onChange={(e) => setBuyerForm({...buyerForm, industry: e.target.value})}
              />
              <input
                className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Company Size"
                value={buyerForm.companySize}
                onChange={(e) => setBuyerForm({...buyerForm, companySize: e.target.value})}
              />
              <input
                className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Budget Range"
                value={buyerForm.budget}
                onChange={(e) => setBuyerForm({...buyerForm, budget: e.target.value})}
              />
              <input
                className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Photo URL"
                value={buyerForm.photoUrl}
                onChange={(e) => setBuyerForm({...buyerForm, photoUrl: e.target.value})}
              />
            </div>

            <textarea
              className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none mb-4"
              placeholder="Interests and Requirements"
              rows={3}
              value={buyerForm.interests}
              onChange={(e) => setBuyerForm({...buyerForm, interests: e.target.value})}
            />

            <textarea
              className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none mb-4"
              placeholder="Internal Notes"
              rows={2}
              value={buyerForm.notes}
              onChange={(e) => setBuyerForm({...buyerForm, notes: e.target.value})}
            />

            <div className="flex gap-3">
              <button
                onClick={createHostedBuyer}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faUserPlus} className="w-4 h-4" />
                Create & Invite Buyer
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingBuyer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Edit Hosted Buyer</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <FontAwesomeIcon icon={faTimesCircle} className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Full Name *"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
              />
              <input
                className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Company *"
                value={editForm.company}
                onChange={(e) => setEditForm({...editForm, company: e.target.value})}
              />
              <input
                className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Email *"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
              />
              <input
                className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
              />
              <input
                className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Industry"
                value={editForm.industry}
                onChange={(e) => setEditForm({...editForm, industry: e.target.value})}
              />
              <input
                className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Company Size"
                value={editForm.companySize}
                onChange={(e) => setEditForm({...editForm, companySize: e.target.value})}
              />
              <input
                className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Budget Range"
                value={editForm.budget}
                onChange={(e) => setEditForm({...editForm, budget: e.target.value})}
              />
              <input
                className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Photo URL"
                value={editForm.photoUrl}
                onChange={(e) => setEditForm({...editForm, photoUrl: e.target.value})}
              />
            </div>

            <textarea
              className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none mb-4"
              placeholder="Interests and Requirements"
              rows={3}
              value={editForm.interests}
              onChange={(e) => setEditForm({...editForm, interests: e.target.value})}
            />

            <textarea
              className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none mb-4"
              placeholder="Internal Notes"
              rows={2}
              value={editForm.notes}
              onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
            />

            <div className="flex gap-3">
              <button
                onClick={editHostedBuyer}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                Update Buyer
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
