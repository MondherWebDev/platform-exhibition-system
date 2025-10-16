"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp, doc, setDoc, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../../../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { createUserBadge } from "../../../../utils/badgeService";

export default function AdministratorRegistration() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    countryCode: "+974",
    password: "",
    confirmPassword: "",
    company: "",
    jobTitle: "",
    nationality: "",
    country: "",
    hearAbout: "",
    organizerCode: "" // Special organizer registration code
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const requiredFields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'mobile', 'organizerCode'];
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        return `Please fill in all required fields. Missing: ${field}`;
      }
    }

    // Organizer code validation (you can customize this)
    if (formData.organizerCode !== 'ORGANIZER-QTM-2025') {
      return "Invalid organizer registration code";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return "Please enter a valid email address";
    }

    // Password validation
    if (formData.password.length < 8) {
      return "Administrator password must be at least 8 characters long";
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      return "Passwords do not match";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitMessage("");

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setSubmitError(validationError);
      setIsSubmitting(false);
      return;
    }

    try {
      // Check for duplicate email before creating account
      const existingUsersQuery = query(
        collection(db, 'Users'),
        where('email', '==', formData.email)
      );
      const existingUsersSnapshot = await getDocs(existingUsersQuery);

      if (!existingUsersSnapshot.empty) {
        const existingUser = existingUsersSnapshot.docs[0].data();
        throw new Error(`An account with email ${formData.email} already exists (${existingUser.category}). Please use a different email address.`);
      }

      // Create Firebase Authentication user
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const firebaseUser = userCredential.user;

      // Prepare user data for Firestore (Administrator role)
      const userData = {
        uid: firebaseUser.uid,
        email: formData.email,
        fullName: `${formData.firstName} ${formData.lastName}`,
        position: 'Administrator',
        company: formData.company || '',
        category: 'Admin',
        mobile: formData.mobile,
        countryCode: formData.countryCode,
        nationality: formData.nationality || '',
        country: formData.country || '',
        hearAbout: formData.hearAbout,
        createdAt: new Date().toISOString(),
        isAdmin: true,
        adminLevel: 'full',
        generatedPassword: formData.password,
        loginEmail: formData.email,
        contactEmail: formData.email,
        contactPhone: formData.mobile,
        website: '',
        address: '',
        industry: '',
        companySize: '',
        logoUrl: '',
        bio: '',
        linkedin: '',
        twitter: '',
        interests: '',
        budget: '',
        boothId: '',
        sponsorTier: 'gold'
      };

      // Save user profile to Firestore
      await setDoc(doc(db, 'Users', firebaseUser.uid), userData);

      // Create badge for the new administrator
      try {
        console.log('🎫 Creating badge for new administrator:', firebaseUser.uid);
        const badgeResult = await createUserBadge(firebaseUser.uid, {
          name: userData.fullName,
          role: userData.position,
          company: userData.company,
          category: userData.category
        });

        if (badgeResult) {
          console.log('✅ Badge created successfully for administrator');
          // Update user document with badge reference
          await setDoc(doc(db, 'Users', firebaseUser.uid), {
            badgeId: badgeResult.id,
            badgeCreated: true,
            badgeCreatedAt: new Date(),
            badgeStatus: 'active'
          }, { merge: true });
        } else {
          throw new Error('Badge creation failed - registration cannot proceed');
        }
      } catch (badgeError) {
        console.error('❌ Error creating badge for administrator:', badgeError);
        // Clean up the auth user if badge creation fails
        await firebaseUser.delete();
        throw new Error('Badge creation failed. Please try again.');
      }

      console.log("Administrator registered successfully:", firebaseUser.uid);
      setSubmitMessage("Administrator registration successful! You now have full system access.");

      // Reset form after successful submission
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        mobile: "",
        countryCode: "+974",
        password: "",
        confirmPassword: "",
        company: "",
        jobTitle: "",
        nationality: "",
        country: "",
        hearAbout: "",
        organizerCode: ""
      });

    } catch (error) {
      console.error("Administrator registration error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 py-1">
        <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/QTM 2025 Logo-04.png"
              alt="QTM 2025 Logo"
              className="w-48 sm:w-56 lg:w-64 h-auto"
            />
          </div>
          <div className="flex space-x-2 sm:space-x-3">
            <button
              onClick={() => router.push('/register')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-semibold transition-colors"
            >
              Main Register
            </button>
            <button
              onClick={() => router.push('/signin')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-semibold transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">Administrator Registration</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Register as a System Administrator to access full platform management and control features.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white p-4 sm:p-6 lg:p-8 shadow-lg rounded-lg">
          <div className="space-y-4 sm:space-y-6">
            {/* Hidden category field for Administrator */}
            <input type="hidden" name="category" value="Admin" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter your first name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter your password (min 8 characters)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Confirm your password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organizer Code *
              </label>
              <input
                type="password"
                name="organizerCode"
                value={formData.organizerCode}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter organizer registration code"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile number *
              </label>
              <div className="flex">
                <select
                  name="countryCode"
                  value={formData.countryCode || "+974"}
                  onChange={handleInputChange}
                  className="w-32 flex-shrink-0 p-3 border border-gray-300 rounded-l focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="+974">🇶🇦 +974 (Qatar)</option>
                  <option value="+971">🇦🇪 +971 (UAE)</option>
                  <option value="+966">🇸🇦 +966 (Saudi Arabia)</option>
                  <option value="+973">🇧🇭 +973 (Bahrain)</option>
                  <option value="+968">🇴🇲 +968 (Oman)</option>
                  <option value="+965">🇰🇼 +965 (Kuwait)</option>
                </select>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  className="flex-1 p-3 border border-gray-300 rounded-r focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="3312 3456"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter your company"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter your job title"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How did you hear about us? *
              </label>
              <select
                name="hearAbout"
                value={formData.hearAbout}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Select Option</option>
                <option value="internal">Internal</option>
                <option value="management">Management</option>
                <option value="official">Official</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Submit Messages */}
          {submitError && (
            <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {submitError}
            </div>
          )}

          {submitMessage && (
            <div className="mt-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              {submitMessage}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-center mt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`font-bold py-3 px-8 rounded-lg transition-all duration-200 flex items-center ${
                isSubmitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              } text-white`}
            >
              {isSubmitting ? "Creating Administrator Account..." : "Register as Administrator"}
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Fields marked with an asterisk (*) are required.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Already have an account? <button onClick={() => router.push('/signin')} className="text-purple-600 hover:text-purple-700 font-semibold">Sign In</button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 py-4 mt-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-white text-sm opacity-90">
            © 2025 Qatar Travel Mart. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
