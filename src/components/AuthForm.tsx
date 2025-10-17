"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

import LoadingSpinner from './LoadingSpinner';
import GlassCard from './GlassCard';
import { authService, UserProfile } from '../utils/authService';
import { dataValidation, ValidationResult } from '../utils/dataValidation';
import { createUserBadge } from '../utils/badgeService';

const categories = [
  'Organizer',
  'Visitor',
  'Exhibitor',
  'Media',
  'Speaker',
  'Hosted Buyer',
  'VIP',
  'Agent'  // New category for mobile scanning agents
];

interface AuthFormProps {
  redirectPath?: string | null;
  initialEmail?: string | null;
}

export default function AuthForm({ redirectPath, initialEmail }: AuthFormProps) {
  const [inEventPage, setInEventPage] = useState(false);
  const [organizerPasscode, setOrganizerPasscode] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  // Check if we're on an event page after component mounts
  React.useEffect(() => {
    const checkLocation = () => {
      setInEventPage(window.location.pathname.startsWith('/e/'));
      setIsRegister(window.location.pathname.startsWith('/e/'));
    };

    // Only run on client side
    if (typeof window !== 'undefined') {
      checkLocation();
    }
  }, []);

  // Pre-fill email if provided via props (for signin after registration)
  React.useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState('Visitor');
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Enhanced registration fields
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [bio, setBio] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [interests, setInterests] = useState('');
  const [budget, setBudget] = useState('');
  const [boothId, setBoothId] = useState('');
  const [sponsorTier, setSponsorTier] = useState('gold');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUserEmail, setCreatedUserEmail] = useState('');
  const router = useRouter();

  // Cloudinary helper
  const uploadToCloud = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'event_logo_unsigned');
    const res = await fetch('https://api.cloudinary.com/v1_1/dp3fxdxyj/image/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.secure_url) throw new Error('Cloudinary upload failed');
    return data.secure_url as string;
  };

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.subscribe((authState) => {
      setLoading(authState.loading);
      setError(authState.error || '');

      if (authState.profile && !authState.loading) {
        // Don't auto-redirect if we're on an event page - let users stay on the event page
        const isOnEventPage = window.location.pathname.startsWith('/e/');
        if (isOnEventPage) {
          console.log('🔐 AuthForm: User authenticated but staying on event page');
          return;
        }

        // Don't auto-redirect if we're on the signin page - let users manually sign in
        // This prevents infinite redirect loops and allows manual sign in flow
        const isOnSignInPage = window.location.pathname === '/signin';
        if (isOnSignInPage) {
          console.log('🔐 AuthForm: User authenticated but staying on signin page for manual login');
          return;
        }

        // Handle successful authentication and redirect based on user role
        const targetPath = authService.getRedirectPath(authState.profile.category, redirectPath || undefined);
        console.log('🔐 AuthForm: Redirecting user to:', targetPath, 'Category:', authState.profile.category);

        // Use window.location for immediate redirect to appropriate dashboard based on role
        window.location.href = targetPath;
      }
    });

    return unsubscribe;
  }, [redirectPath]); // Include redirectPath as dependency

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      // Handle registration
      const profileData: Partial<UserProfile> = {
        fullName,
        position,
        company,
        category,
        contactEmail: contactEmail || email,
        contactPhone,
        website,
        address,
        industry,
        companySize,
        logoUrl,
        bio,
        linkedin,
        twitter,
        interests,
        budget,
        boothId,
        sponsorTier
      };

      const result = await authService.signUp(email, password, profileData, organizerPasscode);

      if (result.success) {
        // Clear form first
        setEmail('');
        setPassword('');
        setFullName('');
        setPosition('');
        setCompany('');
        setCategory('Visitor');
        setContactEmail('');
        setContactPhone('');
        setWebsite('');
        setAddress('');
        setIndustry('');
        setCompanySize('');
        setLogoUrl('');
        setBio('');
        setLinkedin('');
        setTwitter('');
        setInterests('');
        setBudget('');
        setBoothId('');
        setSponsorTier('gold');
        setOrganizerPasscode('');

        // Don't redirect here - let the auth state subscription handle role-based redirection
        console.log('✅ Registration successful - auth state subscription will handle redirect');
      } else {
        setError(result.error || 'Registration failed');
      }
    } else {
      // Handle sign in
      const result = await authService.signIn(email, password, redirectPath || undefined);

      if (!result.success) {
        setError(result.error || 'Sign in failed');
      }
      // Success handling is done through the auth state subscription
    }
  };

  const handleGoogle = async () => {
    setError('');

    const result = await authService.signInWithGoogle();

    if (!result.success) {
      setError(result.error || 'Google sign in failed');
    }
    // Success handling is done through the auth state subscription
  };



  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-sm sm:max-w-md mx-auto"
    >
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-xl p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Header */}
          <div className="text-center">
            <motion.h2
              key={isRegister ? 'register' : 'signin'}
              initial={{ opacity: 0, x: isRegister ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2"
            >
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </motion.h2>
            <motion.p
              key={isRegister ? 'register-desc' : 'signin-desc'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-gray-600 text-sm sm:text-base"
            >
              {isRegister ? 'Join the event platform' : 'Sign in to your account'}
            </motion.p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="flex flex-col gap-3 sm:gap-4">
            <motion.div
              key="email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                required
                disabled={loading}
              />
            </motion.div>

            <motion.div
              key="password"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                required
                disabled={loading}
              />
            </motion.div>

            <AnimatePresence>
              {isRegister && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-4 overflow-hidden"
                >
                  <motion.input
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    type="text"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                    required
                    disabled={loading}
                  />

                  <motion.input
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    type="text"
                    placeholder="Position"
                    value={position}
                    onChange={e => setPosition(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                    required
                    disabled={loading}
                  />

                  <motion.input
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    type="text"
                    placeholder="Company Name"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                    disabled={loading}
                  />

                  <motion.select
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                    required
                    disabled={loading}
                  >
                    {categories.map(c => (
                      <option key={c} value={c} className="bg-white text-gray-900">{c}</option>
                    ))}
                  </motion.select>

                  {(category === 'Organizer' || category === 'Agent') && (
                    <motion.input
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                      type="password"
                      placeholder="Passcode (Required for Organizer/Agent)"
                      value={organizerPasscode}
                      onChange={e => setOrganizerPasscode(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                      required
                      disabled={loading}
                    />
                  )}

                  {/* Enhanced fields based on category */}
                  {category === 'Exhibitor' && (
                    <>
                      <motion.input
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        type="text"
                        placeholder="Booth Number"
                        value={boothId}
                        onChange={e => setBoothId(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                        disabled={loading}
                      />
                      <motion.input
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 }}
                        type="text"
                        placeholder="Industry"
                        value={industry}
                        onChange={e => setIndustry(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                        disabled={loading}
                      />
                      <motion.input
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 }}
                        type="text"
                        placeholder="Company Size"
                        value={companySize}
                        onChange={e => setCompanySize(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                        disabled={loading}
                      />
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 }}
                        className="flex gap-2"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setUploadingLogo(true);
                              try {
                                const url = await uploadToCloud(f);
                                setLogoUrl(url);
                              } catch (error) {
                                console.error('Logo upload failed:', error);
                              } finally {
                                setUploadingLogo(false);
                              }
                            }
                          }}
                          className="hidden"
                          id="exhibitor-logo-upload"
                        />
                        <input
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900 flex-1"
                          placeholder="Logo URL"
                          value={logoUrl}
                          onChange={e => setLogoUrl(e.target.value)}
                          disabled={loading}
                        />
                        <label
                          htmlFor="exhibitor-logo-upload"
                          className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
                        >
                          {uploadingLogo ? '...' : '📁'}
                        </label>
                      </motion.div>
                    </>
                  )}

                  {category === 'Sponsor' && (
                    <>
                      <motion.select
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        value={sponsorTier}
                        onChange={e => setSponsorTier(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                        disabled={loading}
                      >
                        <option value="gold">Gold Sponsor</option>
                        <option value="silver">Silver Sponsor</option>
                        <option value="bronze">Bronze Sponsor</option>
                      </motion.select>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 }}
                        className="flex gap-2"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setUploadingLogo(true);
                              try {
                                const url = await uploadToCloud(f);
                                setLogoUrl(url);
                              } catch (error) {
                                console.error('Logo upload failed:', error);
                              } finally {
                                setUploadingLogo(false);
                              }
                            }
                          }}
                          className="hidden"
                          id="sponsor-logo-upload"
                        />
                        <input
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900 flex-1"
                          placeholder="Logo URL"
                          value={logoUrl}
                          onChange={e => setLogoUrl(e.target.value)}
                          disabled={loading}
                        />
                        <label
                          htmlFor="sponsor-logo-upload"
                          className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
                        >
                          {uploadingLogo ? '...' : '📁'}
                        </label>
                      </motion.div>
                    </>
                  )}

                  {category === 'Speaker' && (
                    <>
                      <motion.textarea
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        placeholder="Speaker Biography"
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                        rows={3}
                        disabled={loading}
                      />
                      <motion.input
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 }}
                        type="url"
                        placeholder="LinkedIn Profile"
                        value={linkedin}
                        onChange={e => setLinkedin(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                        disabled={loading}
                      />
                      <motion.input
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 }}
                        type="url"
                        placeholder="Twitter Profile"
                        value={twitter}
                        onChange={e => setTwitter(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                        disabled={loading}
                      />
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 }}
                        className="flex gap-2"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setUploadingLogo(true);
                              try {
                                const url = await uploadToCloud(f);
                                setLogoUrl(url);
                              } catch (error) {
                                console.error('Photo upload failed:', error);
                              } finally {
                                setUploadingLogo(false);
                              }
                            }
                          }}
                          className="hidden"
                          id="speaker-photo-upload"
                        />
                        <input
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900 flex-1"
                          placeholder="Photo URL"
                          value={logoUrl}
                          onChange={e => setLogoUrl(e.target.value)}
                          disabled={loading}
                        />
                        <label
                          htmlFor="speaker-photo-upload"
                          className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
                        >
                          {uploadingLogo ? '...' : '📁'}
                        </label>
                      </motion.div>
                    </>
                  )}

                  {category === 'Hosted Buyer' && (
                    <>
                      <motion.input
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        type="text"
                        placeholder="Industry"
                        value={industry}
                        onChange={e => setIndustry(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                        disabled={loading}
                      />
                      <motion.input
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 }}
                        type="text"
                        placeholder="Company Size"
                        value={companySize}
                        onChange={e => setCompanySize(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                        disabled={loading}
                      />
                      <motion.input
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 }}
                        type="text"
                        placeholder="Budget Range"
                        value={budget}
                        onChange={e => setBudget(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                        disabled={loading}
                      />
                      <motion.input
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 }}
                        type="text"
                        placeholder="Interests (comma-separated)"
                        value={interests}
                        onChange={e => setInterests(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                        disabled={loading}
                      />
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.0 }}
                        className="flex gap-2"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setUploadingLogo(true);
                              try {
                                const url = await uploadToCloud(f);
                                setLogoUrl(url);
                              } catch (error) {
                                console.error('Photo upload failed:', error);
                              } finally {
                                setUploadingLogo(false);
                              }
                            }
                          }}
                          className="hidden"
                          id="buyer-photo-upload"
                        />
                        <input
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900 flex-1"
                          placeholder="Photo URL"
                          value={logoUrl}
                          onChange={e => setLogoUrl(e.target.value)}
                          disabled={loading}
                        />
                        <label
                          htmlFor="buyer-photo-upload"
                          className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
                        >
                          {uploadingLogo ? '...' : '📁'}
                        </label>
                      </motion.div>
                    </>
                  )}

                  {/* Common contact fields for all categories */}
                  <motion.input
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: category === 'Exhibitor' ? 1.0 : category === 'Sponsor' ? 0.8 : category === 'Speaker' ? 1.0 : category === 'Hosted Buyer' ? 1.1 : 0.6 }}
                    type="email"
                    placeholder="Contact Email (optional)"
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                    disabled={loading}
                  />

                  <motion.input
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: category === 'Exhibitor' ? 1.1 : category === 'Sponsor' ? 0.9 : category === 'Speaker' ? 1.1 : category === 'Hosted Buyer' ? 1.2 : 0.7 }}
                    type="tel"
                    placeholder="Contact Phone (optional)"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                    disabled={loading}
                  />

                  <motion.input
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: category === 'Exhibitor' ? 1.2 : category === 'Sponsor' ? 1.0 : category === 'Speaker' ? 1.2 : category === 'Hosted Buyer' ? 1.3 : 0.8 }}
                    type="url"
                    placeholder="Website (optional)"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                    disabled={loading}
                  />

                  <motion.textarea
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: category === 'Exhibitor' ? 1.3 : category === 'Sponsor' ? 1.1 : category === 'Speaker' ? 1.3 : category === 'Hosted Buyer' ? 1.4 : 0.9 }}
                    placeholder="Address (optional)"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                    rows={2}
                    disabled={loading}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-red-400 text-sm p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                <>
                  <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </motion.button>


          </form>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSuccessModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Account Created Successfully!</h3>
                  <p className="text-gray-600 text-sm mb-6">
                    Your account has been created and you can now access all event features.
                  </p>
                  <p className="text-gray-500 text-xs mb-6">
                    Account: {createdUserEmail}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowSuccessModal(false);
                      // Stay on current page - do nothing
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium transition-colors"
                  >
                    Stay on Event Page
                  </button>
                  <button
                    onClick={() => {
                      setShowSuccessModal(false);
                      // Redirect to sign in page with email pre-filled
                      router.push(`/signin?email=${encodeURIComponent(createdUserEmail)}`);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                  >
                    Go to Login
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
