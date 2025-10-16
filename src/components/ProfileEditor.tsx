"use client";
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
// Removed BadgeGenerator import as it's not needed

const categories = [
  'Organizer',
  'Visitor',
  'Exhibitor',
  'Media',
  'Speaker',
  'Hosted Buyer',
  'VIP'
];

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Education',
  'Energy',
  'Transportation',
  'Real Estate',
  'Food & Beverage',
  'Entertainment',
  'Other'
];

const companySizes = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1000 employees',
  '1000+ employees'
];

export default function ProfileEditor() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const ref = doc(db, 'Users', u.uid);
        const snap = await getDoc(ref);
        setProfile(snap.exists() ? snap.data() : null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (user) {
        // Handle avatar upload if file selected
        if (profile.avatarFile) {
          // Upload to Cloudinary
          const formData = new FormData();
          formData.append('file', profile.avatarFile);
          formData.append('upload_preset', 'event_avatar_unsigned');
          const res = await fetch('https://api.cloudinary.com/v1_1/dp3fxdxyj/image/upload', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.secure_url) {
            profile.avatar = data.secure_url;
          } else {
            throw new Error('Cloudinary upload failed');
          }
          delete profile.avatarFile;
        }

        // Update profile in database first
        const userRef = doc(db, 'Users', user.uid);
        await updateDoc(userRef, {
          ...profile,
          updatedAt: new Date()
        });

        setEditing(false);

        // Show success message
        alert('✅ Profile updated successfully!');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="text-gray-600">Loading...</div>;
  if (!user || !profile) return <div className="text-gray-600">Please log in to edit your profile.</div>;

  return (
    <div className="bg-white rounded-2xl shadow-lg w-full max-w-4xl mx-auto border border-gray-200">
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-gray-800 mb-2 break-words max-w-xs mx-auto">
            {profile.fullName || user.displayName || user.email || 'User'}
          </div>
          <div className="text-gray-600 break-words max-w-xs mx-auto">
            {profile.position || ''} {profile.company ? `@ ${profile.company}` : ''}
          </div>
          <div className="text-sm text-gray-500 mt-1 break-words max-w-xs mx-auto">
            {profile.category || 'No category'} • {profile.industry || 'No industry'}
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={profile.fullName || ''}
                  onChange={e => setProfile({ ...profile, fullName: e.target.value })}
                  className="p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  required
                />
                <input
                  type="email"
                  placeholder="Email *"
                  value={profile.email || user.email || ''}
                  onChange={e => setProfile({ ...profile, email: e.target.value })}
                  className="p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Position/Job Title *"
                  value={profile.position || ''}
                  onChange={e => setProfile({ ...profile, position: e.target.value })}
                  className="p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Company Name *"
                  value={profile.company || ''}
                  onChange={e => setProfile({ ...profile, company: e.target.value })}
                  className="p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  required
                />
                <select
                  value={profile.category || categories[2]}
                  onChange={e => setProfile({ ...profile, category: e.target.value })}
                  className="p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  required
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={profile.industry || ''}
                  onChange={e => setProfile({ ...profile, industry: e.target.value })}
                  className="p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                >
                  <option value="">Select Industry</option>
                  {industries.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={profile.phone || ''}
                  onChange={e => setProfile({ ...profile, phone: e.target.value })}
                  className="p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Website"
                  value={profile.website || ''}
                  onChange={e => setProfile({ ...profile, website: e.target.value })}
                  className="p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Company Details */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Company Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={profile.companySize || ''}
                  onChange={e => setProfile({ ...profile, companySize: e.target.value })}
                  className="p-2.5 rounded-lg bg-white text-gray-900 border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none text-sm"
                >
                  <option value="">Company Size</option>
                  {companySizes.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Booth Number (if applicable)"
                  value={profile.boothNumber || ''}
                  onChange={e => setProfile({ ...profile, boothNumber: e.target.value })}
                  className="p-2.5 rounded-lg bg-white text-gray-900 border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none text-sm"
                />
                <input
                  type="text"
                  placeholder="LinkedIn Profile"
                  value={profile.linkedin || ''}
                  onChange={e => setProfile({ ...profile, linkedin: e.target.value })}
                  className="p-2.5 rounded-lg bg-white text-gray-900 border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none text-sm"
                />
                <input
                  type="number"
                  placeholder="Years in Business"
                  value={profile.yearsInBusiness || ''}
                  onChange={e => setProfile({ ...profile, yearsInBusiness: parseInt(e.target.value) })}
                  className="p-2.5 rounded-lg bg-white text-gray-900 border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none text-sm"
                  min="0"
                  max="100"
                />
              </div>
              <div className="mt-3">
                <textarea
                  placeholder="Company Description / Products & Services"
                  value={profile.description || ''}
                  onChange={e => setProfile({ ...profile, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-white text-gray-900 border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none text-sm"
                  rows={2}
                />
              </div>
            </div>

            {/* Business Focus */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Business Focus</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Target Markets (e.g., Middle East, Europe)"
                  value={profile.targetMarkets || ''}
                  onChange={e => setProfile({ ...profile, targetMarkets: e.target.value })}
                  className="p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Key Products/Services"
                  value={profile.keyProducts || ''}
                  onChange={e => setProfile({ ...profile, keyProducts: e.target.value })}
                  className="p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                onClick={handleUpdate}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                Save Profile
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-lg border border-gray-300 transition-all duration-300"
              >
                Cancel
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <div className="text-red-600 text-sm font-semibold">Error: {error}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Profile Display */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Contact Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Email:</span>
                    <span className="text-gray-800 break-words max-w-[60%] text-right">{profile.email || user.email || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Phone:</span>
                    <span className="text-gray-800 break-words max-w-[60%] text-right">{profile.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Website:</span>
                    <span className="text-gray-800 break-words max-w-[60%] text-right">{profile.website ? (
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                        Visit Website
                      </a>
                    ) : 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">LinkedIn:</span>
                    <span className="text-gray-800 break-words max-w-[60%] text-right">{profile.linkedin ? (
                      <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                        View Profile
                      </a>
                    ) : 'Not provided'}</span>
                  </div>
                </div>
              </div>

              {/* Only show Company Details if there's meaningful data */}
              {(profile.industry || profile.companySize || profile.boothNumber || profile.yearsInBusiness) && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Company Details</h3>
                  <div className="space-y-2 text-sm">
                    {profile.industry && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Industry:</span>
                        <span className="text-gray-800">{profile.industry}</span>
                      </div>
                    )}
                    {profile.companySize && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Company Size:</span>
                        <span className="text-gray-800">{profile.companySize}</span>
                      </div>
                    )}
                    {profile.boothNumber && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Booth Number:</span>
                        <span className="text-gray-800">{profile.boothNumber}</span>
                      </div>
                    )}
                    {profile.yearsInBusiness && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Years in Business:</span>
                        <span className="text-gray-800">{profile.yearsInBusiness}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Description */}
            {profile.description && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">About</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{profile.description}</p>
              </div>
            )}

            {/* Business Focus */}
            {(profile.targetMarkets || profile.keyProducts) && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Business Focus</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600 block mb-1">Target Markets:</span>
                    <span className="text-gray-800">{profile.targetMarkets || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">Key Products/Services:</span>
                    <span className="text-gray-800">{profile.keyProducts || 'Not specified'}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center pt-2">
              <button
                onClick={() => setEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-lg transition-all duration-300 transform hover:scale-105 text-sm"
              >
                Edit Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
