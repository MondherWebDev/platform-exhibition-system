"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp, doc, setDoc, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { createUserBadge } from "../../../utils/badgeService";

export default function Registration() {
  const [formData, setFormData] = useState({
    category: "",
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
    companyDescription: "",
    logoFile: null as File | null,
    logoPreview: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const baseRequiredFields = ['category', 'firstName', 'lastName', 'email', 'password', 'confirmPassword', 'mobile'];

    // For Exhibitor category, "hearAbout" is not required
    const requiredFields = formData.category === 'Exhibitor'
      ? baseRequiredFields
      : [...baseRequiredFields, 'hearAbout'];

    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        return `Please fill in all required fields. Missing: ${field}`;
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return "Please enter a valid email address";
    }

    // Password validation
    if (formData.password.length < 6) {
      return "Password must be at least 6 characters long";
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

      // Determine position based on category if not provided
      let position = 'Attendee';
      if (formData.category === 'Exhibitor') {
        position = 'Exhibitor Representative';
      } else if (formData.category === 'Sponsor') {
        position = 'Sponsor Representative';
      } else if (formData.category === 'Speaker') {
        position = 'Speaker';
      } else if (formData.category === 'Hosted Buyer') {
        position = 'Hosted Buyer';
      } else if (formData.category === 'Agent') {
        position = 'Event Agent';
      } else if (formData.category === 'Organizer') {
        position = 'Event Organizer';
      } else if (formData.category === 'Admin') {
        position = 'Administrator';
      } else if (formData.category === 'VIP') {
        position = 'VIP Guest';
      } else if (formData.category === 'Media') {
        position = 'Media Representative';
      }

      // Prepare user data for Firestore
      const userData = {
        uid: firebaseUser.uid,
        email: formData.email,
        fullName: `${formData.firstName} ${formData.lastName}`,
        position: position,
        company: formData.company || '',
        category: formData.category,
        mobile: formData.mobile,
        countryCode: formData.countryCode,
        nationality: formData.nationality || '',
        country: formData.country || '',
        hearAbout: formData.hearAbout,
        createdAt: new Date().toISOString(),
        isAgent: formData.category === 'Agent',
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

      // Create badge for the new user
      try {
        console.log('🎫 Creating badge for new user:', firebaseUser.uid, 'Category:', userData.category);
        const badgeResult = await createUserBadge(firebaseUser.uid, {
          name: userData.fullName,
          role: userData.position,
          company: userData.company,
          category: userData.category
        });

        if (badgeResult) {
          console.log('✅ Badge created successfully for new user');
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
        console.error('❌ Error creating badge for new user:', badgeError);
        // Clean up the auth user if badge creation fails
        await firebaseUser.delete();
        throw new Error('Badge creation failed. Please try again.');
      }

      console.log("User registered successfully:", firebaseUser.uid);
      setSubmitMessage("Registration successful! Redirecting to sign in...");

      // Reset form after successful submission
      setFormData({
        category: "",
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
        companyDescription: "",
        logoFile: null,
        logoPreview: ""
      });

      // Sign out the user and redirect to signin page after successful registration
      setTimeout(async () => {
        try {
          await auth.signOut();
          router.push('/signin?message=Registration successful! Please sign in with your email and password.');
        } catch (signOutError) {
          console.error('Error signing out after registration:', signOutError);
          // Even if sign out fails, redirect to signin page
          router.push('/signin?message=Registration successful! Please sign in with your email and password.');
        }
      }, 2000);

    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-600 py-1">
        <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/QTM 2025 Logo-04.png"
              alt="QTM 2024 Logo"
              className="w-48 sm:w-56 lg:w-64 h-auto"
            />
          </div>
          <div className="flex space-x-2 sm:space-x-3">
            <button
              onClick={() => router.push('/register')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-semibold transition-colors"
            >
              Register
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


        {/* Form */}
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white p-4 sm:p-6 lg:p-8 shadow-lg rounded-lg">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Do you want to register as Visitor or Media? *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Select Category</option>
                  <option value="Visitor">Visitor</option>
                  <option value="Exhibitor">Exhibitor</option>
                  <option value="Speaker">Speaker</option>
                  <option value="Media">Media</option>
                  <option value="Hosted Buyer">Hosted Buyer</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Enter your last name"
                />
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
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Enter your password"
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
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Confirm your password"
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
                    className="w-32 flex-shrink-0 p-3 border border-gray-300 rounded-l focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="+1">🇺🇸 +1 (US)</option>
                    <option value="+7">🇷🇺 +7 (Russia)</option>
                    <option value="+20">🇪🇬 +20 (Egypt)</option>
                    <option value="+27">🇿🇦 +27 (South Africa)</option>
                    <option value="+30">🇬🇷 +30 (Greece)</option>
                    <option value="+31">🇳🇱 +31 (Netherlands)</option>
                    <option value="+32">🇧🇪 +32 (Belgium)</option>
                    <option value="+33">🇫🇷 +33 (France)</option>
                    <option value="+34">🇪🇸 +34 (Spain)</option>
                    <option value="+36">🇭🇺 +36 (Hungary)</option>
                    <option value="+39">🇮🇹 +39 (Italy)</option>
                    <option value="+40">🇷🇴 +40 (Romania)</option>
                    <option value="+41">🇨🇭 +41 (Switzerland)</option>
                    <option value="+43">🇦🇹 +43 (Austria)</option>
                    <option value="+44">🇬🇧 +44 (UK)</option>
                    <option value="+45">🇩🇰 +45 (Denmark)</option>
                    <option value="+46">🇸🇪 +46 (Sweden)</option>
                    <option value="+47">🇳🇴 +47 (Norway)</option>
                    <option value="+48">🇵🇱 +48 (Poland)</option>
                    <option value="+49">🇩🇪 +49 (Germany)</option>
                    <option value="+51">🇵🇪 +51 (Peru)</option>
                    <option value="+52">🇲🇽 +52 (Mexico)</option>
                    <option value="+53">🇨🇺 +53 (Cuba)</option>
                    <option value="+54">🇦🇷 +54 (Argentina)</option>
                    <option value="+55">🇧🇷 +55 (Brazil)</option>
                    <option value="+56">🇨🇱 +56 (Chile)</option>
                    <option value="+57">🇨🇴 +57 (Colombia)</option>
                    <option value="+58">🇻🇪 +58 (Venezuela)</option>
                    <option value="+60">🇲🇾 +60 (Malaysia)</option>
                    <option value="+61">🇦🇺 +61 (Australia)</option>
                    <option value="+62">🇮🇩 +62 (Indonesia)</option>
                    <option value="+63">🇵🇭 +63 (Philippines)</option>
                    <option value="+64">🇳🇿 +64 (New Zealand)</option>
                    <option value="+65">🇸🇬 +65 (Singapore)</option>
                    <option value="+66">🇹🇭 +66 (Thailand)</option>
                    <option value="+81">🇯🇵 +81 (Japan)</option>
                    <option value="+82">🇰🇷 +82 (South Korea)</option>
                    <option value="+84">🇻🇳 +84 (Vietnam)</option>
                    <option value="+86">🇨🇳 +86 (China)</option>
                    <option value="+90">🇹🇷 +90 (Turkey)</option>
                    <option value="+91">🇮🇳 +91 (India)</option>
                    <option value="+92">🇵🇰 +92 (Pakistan)</option>
                    <option value="+93">🇦🇫 +93 (Afghanistan)</option>
                    <option value="+94">🇱🇰 +94 (Sri Lanka)</option>
                    <option value="+95">🇲🇲 +95 (Myanmar)</option>
                    <option value="+98">🇮🇷 +98 (Iran)</option>
                    <option value="+212">🇲🇦 +212 (Morocco)</option>
                    <option value="+213">🇩🇿 +213 (Algeria)</option>
                    <option value="+216">🇹🇳 +216 (Tunisia)</option>
                    <option value="+218">🇱🇾 +218 (Libya)</option>
                    <option value="+220">🇬🇲 +220 (Gambia)</option>
                    <option value="+221">🇸🇳 +221 (Senegal)</option>
                    <option value="+222">🇲🇷 +222 (Mauritania)</option>
                    <option value="+223">🇲🇱 +223 (Mali)</option>
                    <option value="+224">🇬🇳 +224 (Guinea)</option>
                    <option value="+225">🇨🇮 +225 (Ivory Coast)</option>
                    <option value="+226">🇧🇫 +226 (Burkina Faso)</option>
                    <option value="+227">🇳🇪 +227 (Niger)</option>
                    <option value="+228">🇹🇬 +228 (Togo)</option>
                    <option value="+229">🇧🇯 +229 (Benin)</option>
                    <option value="+230">🇲🇺 +230 (Mauritius)</option>
                    <option value="+231">🇱🇷 +231 (Liberia)</option>
                    <option value="+232">🇸🇱 +232 (Sierra Leone)</option>
                    <option value="+233">🇬🇭 +233 (Ghana)</option>
                    <option value="+234">🇳🇬 +234 (Nigeria)</option>
                    <option value="+235">🇹🇩 +235 (Chad)</option>
                    <option value="+236">🇨🇫 +236 (Central African Republic)</option>
                    <option value="+237">🇨🇲 +237 (Cameroon)</option>
                    <option value="+238">🇨🇻 +238 (Cape Verde)</option>
                    <option value="+239">🇸🇹 +239 (São Tomé and Príncipe)</option>
                    <option value="+240">🇬🇶 +240 (Equatorial Guinea)</option>
                    <option value="+241">🇬🇦 +241 (Gabon)</option>
                    <option value="+242">🇨🇬 +242 (Republic of the Congo)</option>
                    <option value="+243">🇨🇩 +243 (Democratic Republic of the Congo)</option>
                    <option value="+244">🇦🇴 +244 (Angola)</option>
                    <option value="+245">🇬🇼 +245 (Guinea-Bissau)</option>
                    <option value="+246">🇮🇴 +246 (British Indian Ocean Territory)</option>
                    <option value="+248">🇸🇨 +248 (Seychelles)</option>
                    <option value="+249">🇸🇩 +249 (Sudan)</option>
                    <option value="+250">🇷🇼 +250 (Rwanda)</option>
                    <option value="+251">🇪🇹 +251 (Ethiopia)</option>
                    <option value="+252">🇸🇴 +252 (Somalia)</option>
                    <option value="+253">🇩🇯 +253 (Djibouti)</option>
                    <option value="+254">🇰🇪 +254 (Kenya)</option>
                    <option value="+255">🇹🇿 +255 (Tanzania)</option>
                    <option value="+256">🇺🇬 +256 (Uganda)</option>
                    <option value="+257">🇧🇮 +257 (Burundi)</option>
                    <option value="+258">🇲🇿 +258 (Mozambique)</option>
                    <option value="+260">🇿🇲 +260 (Zambia)</option>
                    <option value="+261">🇲🇬 +261 (Madagascar)</option>
                    <option value="+262">🇾🇹 +262 (Mayotte)</option>
                    <option value="+263">🇿🇼 +263 (Zimbabwe)</option>
                    <option value="+264">🇳🇦 +264 (Namibia)</option>
                    <option value="+265">🇲🇼 +265 (Malawi)</option>
                    <option value="+266">🇱🇸 +266 (Lesotho)</option>
                    <option value="+267">🇧🇼 +267 (Botswana)</option>
                    <option value="+268">🇸🇿 +268 (Eswatini)</option>
                    <option value="+269">🇰🇲 +269 (Comoros)</option>
                    <option value="+290">🇸🇭 +290 (Saint Helena)</option>
                    <option value="+291">🇪🇷 +291 (Eritrea)</option>
                    <option value="+297">🇦🇼 +297 (Aruba)</option>
                    <option value="+298">🇫🇴 +298 (Faroe Islands)</option>
                    <option value="+299">🇬🇱 +299 (Greenland)</option>
                    <option value="+350">🇬🇮 +350 (Gibraltar)</option>
                    <option value="+351">🇵🇹 +351 (Portugal)</option>
                    <option value="+352">🇱🇺 +352 (Luxembourg)</option>
                    <option value="+353">🇮🇪 +353 (Ireland)</option>
                    <option value="+354">🇮🇸 +354 (Iceland)</option>
                    <option value="+355">🇦🇱 +355 (Albania)</option>
                    <option value="+356">🇲🇹 +356 (Malta)</option>
                    <option value="+357">🇨🇾 +357 (Cyprus)</option>
                    <option value="+358">🇫🇮 +358 (Finland)</option>
                    <option value="+359">🇧🇬 +359 (Bulgaria)</option>
                    <option value="+370">🇱🇹 +370 (Lithuania)</option>
                    <option value="+371">🇱🇻 +371 (Latvia)</option>
                    <option value="+372">🇪🇪 +372 (Estonia)</option>
                    <option value="+373">🇲🇩 +373 (Moldova)</option>
                    <option value="+374">🇦🇲 +374 (Armenia)</option>
                    <option value="+375">🇧🇾 +375 (Belarus)</option>
                    <option value="+376">🇦🇩 +376 (Andorra)</option>
                    <option value="+377">🇲🇨 +377 (Monaco)</option>
                    <option value="+378">🇸🇲 +378 (San Marino)</option>
                    <option value="+380">🇺🇦 +380 (Ukraine)</option>
                    <option value="+381">🇷🇸 +381 (Serbia)</option>
                    <option value="+382">🇲🇪 +382 (Montenegro)</option>
                    <option value="+383">🇽🇰 +383 (Kosovo)</option>
                    <option value="+385">🇭🇷 +385 (Croatia)</option>
                    <option value="+386">🇸🇮 +386 (Slovenia)</option>
                    <option value="+387">🇧🇦 +387 (Bosnia and Herzegovina)</option>
                    <option value="+389">🇲🇰 +389 (North Macedonia)</option>
                    <option value="+420">🇨🇿 +420 (Czech Republic)</option>
                    <option value="+421">🇸🇰 +421 (Slovakia)</option>
                    <option value="+423">🇱🇮 +423 (Liechtenstein)</option>
                    <option value="+500">🇫🇰 +500 (Falkland Islands)</option>
                    <option value="+501">🇧🇿 +501 (Belize)</option>
                    <option value="+502">🇬🇹 +502 (Guatemala)</option>
                    <option value="+503">🇸🇻 +503 (El Salvador)</option>
                    <option value="+504">🇭🇳 +504 (Honduras)</option>
                    <option value="+505">🇳🇮 +505 (Nicaragua)</option>
                    <option value="+506">🇨🇷 +506 (Costa Rica)</option>
                    <option value="+507">🇵🇦 +507 (Panama)</option>
                    <option value="+508">🇵🇲 +508 (Saint Pierre and Miquelon)</option>
                    <option value="+509">🇭🇹 +509 (Haiti)</option>
                    <option value="+590">🇬🇵 +590 (Guadeloupe)</option>
                    <option value="+591">🇧🇴 +591 (Bolivia)</option>
                    <option value="+592">🇬🇾 +592 (Guyana)</option>
                    <option value="+593">🇪🇨 +593 (Ecuador)</option>
                    <option value="+594">🇬🇫 +594 (French Guiana)</option>
                    <option value="+595">🇵🇾 +595 (Paraguay)</option>
                    <option value="+596">🇲🇶 +596 (Martinique)</option>
                    <option value="+597">🇸🇷 +597 (Suriname)</option>
                    <option value="+598">🇺🇾 +598 (Uruguay)</option>
                    <option value="+599">🇨🇼 +599 (Curaçao)</option>
                    <option value="+670">🇹🇱 +670 (East Timor)</option>
                    <option value="+672">🇦🇶 +672 (Antarctica)</option>
                    <option value="+673">🇧🇳 +673 (Brunei)</option>
                    <option value="+674">🇳🇷 +674 (Nauru)</option>
                    <option value="+675">🇵🇬 +675 (Papua New Guinea)</option>
                    <option value="+676">🇹🇴 +676 (Tonga)</option>
                    <option value="+677">🇸🇧 +677 (Solomon Islands)</option>
                    <option value="+678">🇻🇺 +678 (Vanuatu)</option>
                    <option value="+679">🇫🇯 +679 (Fiji)</option>
                    <option value="+680">🇵🇼 +680 (Palau)</option>
                    <option value="+681">🇼🇫 +681 (Wallis and Futuna)</option>
                    <option value="+682">🇨🇰 +682 (Cook Islands)</option>
                    <option value="+683">🇳🇺 +683 (Niue)</option>
                    <option value="+684">🇦🇸 +684 (American Samoa)</option>
                    <option value="+685">🇼🇸 +685 (Samoa)</option>
                    <option value="+686">🇰🇮 +686 (Kiribati)</option>
                    <option value="+687">🇳🇨 +687 (New Caledonia)</option>
                    <option value="+688">🇹🇻 +688 (Tuvalu)</option>
                    <option value="+689">🇵🇫 +689 (French Polynesia)</option>
                    <option value="+690">🇹🇰 +690 (Tokelau)</option>
                    <option value="+691">🇫🇲 +691 (Federated States of Micronesia)</option>
                    <option value="+692">🇲🇭 +692 (Marshall Islands)</option>
                    <option value="+850">🇰🇵 +850 (North Korea)</option>
                    <option value="+852">🇭🇰 +852 (Hong Kong)</option>
                    <option value="+853">🇲🇴 +853 (Macau)</option>
                    <option value="+855">🇰🇭 +855 (Cambodia)</option>
                    <option value="+856">🇱🇦 +856 (Laos)</option>
                    <option value="+880">🇧🇩 +880 (Bangladesh)</option>
                    <option value="+886">🇹🇼 +886 (Taiwan)</option>
                    <option value="+960">🇲🇻 +960 (Maldives)</option>
                    <option value="+961">🇱🇧 +961 (Lebanon)</option>
                    <option value="+962">🇯🇴 +962 (Jordan)</option>
                    <option value="+963">🇸🇾 +963 (Syria)</option>
                    <option value="+964">🇮🇶 +964 (Iraq)</option>
                    <option value="+965">🇰🇼 +965 (Kuwait)</option>
                    <option value="+966">🇸🇦 +966 (Saudi Arabia)</option>
                    <option value="+967">🇾🇪 +967 (Yemen)</option>
                    <option value="+968">🇴🇲 +968 (Oman)</option>
                    <option value="+970">🇵🇸 +970 (Palestine)</option>
                    <option value="+971">🇦🇪 +971 (UAE)</option>

                    <option value="+973">🇧🇭 +973 (Bahrain)</option>
                    <option value="+974">🇶🇦 +974 (Qatar)</option>
                    <option value="+975">🇧🇹 +975 (Bhutan)</option>
                    <option value="+976">🇲🇳 +976 (Mongolia)</option>
                    <option value="+977">🇳🇵 +977 (Nepal)</option>
                    <option value="+992">🇹🇯 +992 (Tajikistan)</option>
                    <option value="+993">🇹🇲 +993 (Turkmenistan)</option>
                    <option value="+994">🇦🇿 +994 (Azerbaijan)</option>
                    <option value="+995">🇬🇪 +995 (Georgia)</option>
                    <option value="+996">🇰🇬 +996 (Kyrgyzstan)</option>
                    <option value="+998">🇺🇿 +998 (Uzbekistan)</option>
                  </select>
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    className="flex-1 p-3 border border-gray-300 rounded-r focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="3312 3456"
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Enter your job title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nationality
                </label>
                <select
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Select Nationality</option>
                  <option value="afghan">Afghan</option>
                  <option value="albanian">Albanian</option>
                  <option value="algerian">Algerian</option>
                  <option value="american">American</option>
                  <option value="andorran">Andorran</option>
                  <option value="angolan">Angolan</option>
                  <option value="argentine">Argentine</option>
                  <option value="armenian">Armenian</option>
                  <option value="australian">Australian</option>
                  <option value="austrian">Austrian</option>
                  <option value="azerbaijani">Azerbaijani</option>
                  <option value="bahamian">Bahamian</option>
                  <option value="bahraini">Bahraini</option>
                  <option value="bangladeshi">Bangladeshi</option>
                  <option value="barbadian">Barbadian</option>
                  <option value="belarusian">Belarusian</option>
                  <option value="belgian">Belgian</option>
                  <option value="belizean">Belizean</option>
                  <option value="beninese">Beninese</option>
                  <option value="bhutanese">Bhutanese</option>
                  <option value="bolivian">Bolivian</option>
                  <option value="bosnian">Bosnian</option>
                  <option value="brazilian">Brazilian</option>
                  <option value="british">British</option>
                  <option value="bruneian">Bruneian</option>
                  <option value="bulgarian">Bulgarian</option>
                  <option value="burkinabé">Burkinabé</option>
                  <option value="burmese">Burmese</option>
                  <option value="burundian">Burundian</option>
                  <option value="cambodian">Cambodian</option>
                  <option value="cameroonian">Cameroonian</option>
                  <option value="canadian">Canadian</option>
                  <option value="cape_verdean">Cape Verdean</option>
                  <option value="chadian">Chadian</option>
                  <option value="chilean">Chilean</option>
                  <option value="chinese">Chinese</option>
                  <option value="colombian">Colombian</option>
                  <option value="comoran">Comoran</option>
                  <option value="congolese">Congolese</option>
                  <option value="costa_rican">Costa Rican</option>
                  <option value="croatian">Croatian</option>
                  <option value="cuban">Cuban</option>
                  <option value="cypriot">Cypriot</option>
                  <option value="czech">Czech</option>
                  <option value="danish">Danish</option>
                  <option value="djiboutian">Djiboutian</option>
                  <option value="dominican">Dominican</option>
                  <option value="dutch">Dutch</option>
                  <option value="east_timorese">East Timorese</option>
                  <option value="ecuadorean">Ecuadorean</option>
                  <option value="egyptian">Egyptian</option>
                  <option value="emirian">Emirian</option>
                  <option value="english">English</option>
                  <option value="eritrean">Eritrean</option>
                  <option value="estonian">Estonian</option>
                  <option value="ethiopian">Ethiopian</option>
                  <option value="fijian">Fijian</option>
                  <option value="filipino">Filipino</option>
                  <option value="finnish">Finnish</option>
                  <option value="french">French</option>
                  <option value="gabonese">Gabonese</option>
                  <option value="gambian">Gambian</option>
                  <option value="georgian">Georgian</option>
                  <option value="german">German</option>
                  <option value="ghanaian">Ghanaian</option>
                  <option value="greek">Greek</option>
                  <option value="grenadian">Grenadian</option>
                  <option value="guatemalan">Guatemalan</option>
                  <option value="guinea_bissauan">Guinea-Bissauan</option>
                  <option value="guinean">Guinean</option>
                  <option value="guyanese">Guyanese</option>
                  <option value="haitian">Haitian</option>
                  <option value="honduran">Honduran</option>
                  <option value="hungarian">Hungarian</option>
                  <option value="indian">Indian</option>
                  <option value="indonesian">Indonesian</option>
                  <option value="iranian">Iranian</option>
                  <option value="iraqi">Iraqi</option>
                  <option value="irish">Irish</option>

                  <option value="italian">Italian</option>
                  <option value="jamaican">Jamaican</option>
                  <option value="japanese">Japanese</option>
                  <option value="jordanian">Jordanian</option>
                  <option value="kazakhstani">Kazakhstani</option>
                  <option value="kenyan">Kenyan</option>
                  <option value="kittian_and_nevisian">Kittian and Nevisian</option>
                  <option value="kuwaiti">Kuwaiti</option>
                  <option value="kyrgyz">Kyrgyz</option>
                  <option value="laotian">Laotian</option>
                  <option value="latvian">Latvian</option>
                  <option value="lebanese">Lebanese</option>
                  <option value="liberian">Liberian</option>
                  <option value="libyan">Libyan</option>
                  <option value="liechtensteiner">Liechtensteiner</option>
                  <option value="lithuanian">Lithuanian</option>
                  <option value="luxembourgish">Luxembourgish</option>
                  <option value="macedonian">Macedonian</option>
                  <option value="malagasy">Malagasy</option>
                  <option value="malawian">Malawian</option>
                  <option value="malaysian">Malaysian</option>
                  <option value="maldivan">Maldivan</option>
                  <option value="malian">Malian</option>
                  <option value="maltese">Maltese</option>
                  <option value="marshallese">Marshallese</option>
                  <option value="mauritanian">Mauritanian</option>
                  <option value="mauritian">Mauritian</option>
                  <option value="mexican">Mexican</option>
                  <option value="micronesian">Micronesian</option>
                  <option value="moldovan">Moldovan</option>
                  <option value="monacan">Monacan</option>
                  <option value="mongolian">Mongolian</option>
                  <option value="moroccan">Moroccan</option>
                  <option value="mosotho">Mosotho</option>
                  <option value="motswana">Motswana</option>
                  <option value="mozambican">Mozambican</option>
                  <option value="namibian">Namibian</option>
                  <option value="nauruan">Nauruan</option>
                  <option value="nepalese">Nepalese</option>
                  <option value="new_zealander">New Zealander</option>
                  <option value="nicaraguan">Nicaraguan</option>
                  <option value="nigerien">Nigerien</option>
                  <option value="nigerian">Nigerian</option>
                  <option value="north_korean">North Korean</option>
                  <option value="northern_irish">Northern Irish</option>
                  <option value="norwegian">Norwegian</option>
                  <option value="omani">Omani</option>
                  <option value="pakistani">Pakistani</option>
                  <option value="palauan">Palauan</option>
                  <option value="palestinian">Palestinian</option>
                  <option value="panamanian">Panamanian</option>
                  <option value="papua_new_guinean">Papua New Guinean</option>
                  <option value="paraguayan">Paraguayan</option>
                  <option value="peruvian">Peruvian</option>
                  <option value="polish">Polish</option>
                  <option value="portuguese">Portuguese</option>
                  <option value="qatari">Qatari</option>
                  <option value="romanian">Romanian</option>
                  <option value="russian">Russian</option>
                  <option value="rwandan">Rwandan</option>
                  <option value="saint_lucian">Saint Lucian</option>
                  <option value="salvadoran">Salvadoran</option>
                  <option value="samoan">Samoan</option>
                  <option value="san_marinese">San Marinese</option>
                  <option value="sao_tomean">São Toméan</option>
                  <option value="saudi">Saudi</option>
                  <option value="scottish">Scottish</option>
                  <option value="senegalese">Senegalese</option>
                  <option value="serbian">Serbian</option>
                  <option value="seychellois">Seychellois</option>
                  <option value="sierra_leonean">Sierra Leonean</option>
                  <option value="singaporean">Singaporean</option>
                  <option value="slovak">Slovak</option>
                  <option value="slovenian">Slovenian</option>
                  <option value="solomon_islander">Solomon Islander</option>
                  <option value="somali">Somali</option>
                  <option value="south_african">South African</option>
                  <option value="south_korean">South Korean</option>
                  <option value="spanish">Spanish</option>
                  <option value="sri_lankan">Sri Lankan</option>
                  <option value="sudanese">Sudanese</option>
                  <option value="surinamese">Surinamese</option>
                  <option value="swazi">Swazi</option>
                  <option value="swedish">Swedish</option>
                  <option value="swiss">Swiss</option>
                  <option value="syrian">Syrian</option>
                  <option value="taiwanese">Taiwanese</option>
                  <option value="tajik">Tajik</option>
                  <option value="tanzanian">Tanzanian</option>
                  <option value="thai">Thai</option>
                  <option value="togolese">Togolese</option>
                  <option value="tongan">Tongan</option>
                  <option value="trinidadian_or_tobagonian">Trinidadian or Tobagonian</option>
                  <option value="tunisian">Tunisian</option>
                  <option value="turkish">Turkish</option>
                  <option value="tuvaluan">Tuvaluan</option>
                  <option value="ugandan">Ugandan</option>
                  <option value="ukrainian">Ukrainian</option>
                  <option value="uruguayan">Uruguayan</option>
                  <option value="uzbekistani">Uzbekistani</option>
                  <option value="venezuelan">Venezuelan</option>
                  <option value="vietnamese">Vietnamese</option>
                  <option value="welsh">Welsh</option>
                  <option value="yemenite">Yemenite</option>
                  <option value="zambian">Zambian</option>
                  <option value="zimbabwean">Zimbabwean</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country of residence
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Select Country</option>
                  <option value="afghanistan">Afghanistan</option>
                  <option value="albania">Albania</option>
                  <option value="algeria">Algeria</option>
                  <option value="andorra">Andorra</option>
                  <option value="angola">Angola</option>
                  <option value="argentina">Argentina</option>
                  <option value="armenia">Armenia</option>
                  <option value="australia">Australia</option>
                  <option value="austria">Austria</option>
                  <option value="azerbaijan">Azerbaijan</option>
                  <option value="bahrain">Bahrain</option>
                  <option value="bangladesh">Bangladesh</option>
                  <option value="belarus">Belarus</option>
                  <option value="belgium">Belgium</option>
                  <option value="belize">Belize</option>
                  <option value="benin">Benin</option>
                  <option value="bhutan">Bhutan</option>
                  <option value="bolivia">Bolivia</option>
                  <option value="bosnia_and_herzegovina">Bosnia and Herzegovina</option>
                  <option value="botswana">Botswana</option>
                  <option value="brazil">Brazil</option>
                  <option value="brunei">Brunei</option>
                  <option value="bulgaria">Bulgaria</option>
                  <option value="burkina_faso">Burkina Faso</option>
                  <option value="burundi">Burundi</option>
                  <option value="cambodia">Cambodia</option>
                  <option value="cameroon">Cameroon</option>
                  <option value="canada">Canada</option>
                  <option value="chad">Chad</option>
                  <option value="chile">Chile</option>
                  <option value="china">China</option>
                  <option value="colombia">Colombia</option>
                  <option value="comoros">Comoros</option>
                  <option value="costa_rica">Costa Rica</option>
                  <option value="croatia">Croatia</option>
                  <option value="cuba">Cuba</option>
                  <option value="cyprus">Cyprus</option>
                  <option value="czech_republic">Czech Republic</option>
                  <option value="denmark">Denmark</option>
                  <option value="djibouti">Djibouti</option>
                  <option value="dominican_republic">Dominican Republic</option>
                  <option value="ecuador">Ecuador</option>
                  <option value="egypt">Egypt</option>
                  <option value="el_salvador">El Salvador</option>
                  <option value="estonia">Estonia</option>
                  <option value="ethiopia">Ethiopia</option>
                  <option value="fiji">Fiji</option>
                  <option value="finland">Finland</option>
                  <option value="france">France</option>
                  <option value="gabon">Gabon</option>
                  <option value="georgia">Georgia</option>
                  <option value="germany">Germany</option>
                  <option value="ghana">Ghana</option>
                  <option value="greece">Greece</option>
                  <option value="guatemala">Guatemala</option>
                  <option value="guinea">Guinea</option>
                  <option value="guyana">Guyana</option>
                  <option value="haiti">Haiti</option>
                  <option value="honduras">Honduras</option>
                  <option value="hungary">Hungary</option>
                  <option value="iceland">Iceland</option>
                  <option value="india">India</option>
                  <option value="indonesia">Indonesia</option>
                  <option value="iran">Iran</option>
                  <option value="iraq">Iraq</option>
                  <option value="ireland">Ireland</option>

                  <option value="italy">Italy</option>
                  <option value="jamaica">Jamaica</option>
                  <option value="japan">Japan</option>
                  <option value="jordan">Jordan</option>
                  <option value="kazakhstan">Kazakhstan</option>
                  <option value="kenya">Kenya</option>
                  <option value="kuwait">Kuwait</option>
                  <option value="kyrgyzstan">Kyrgyzstan</option>
                  <option value="laos">Laos</option>
                  <option value="latvia">Latvia</option>
                  <option value="lebanon">Lebanon</option>
                  <option value="liberia">Liberia</option>
                  <option value="libya">Libya</option>
                  <option value="liechtenstein">Liechtenstein</option>
                  <option value="lithuania">Lithuania</option>
                  <option value="luxembourg">Luxembourg</option>
                  <option value="macedonia">Macedonia</option>
                  <option value="madagascar">Madagascar</option>
                  <option value="malawi">Malawi</option>
                  <option value="malaysia">Malaysia</option>
                  <option value="maldives">Maldives</option>
                  <option value="mali">Mali</option>
                  <option value="malta">Malta</option>
                  <option value="mauritania">Mauritania</option>
                  <option value="mauritius">Mauritius</option>
                  <option value="mexico">Mexico</option>
                  <option value="micronesia">Micronesia</option>
                  <option value="moldova">Moldova</option>
                  <option value="monaco">Monaco</option>
                  <option value="mongolia">Mongolia</option>
                  <option value="montenegro">Montenegro</option>
                  <option value="morocco">Morocco</option>
                  <option value="mozambique">Mozambique</option>
                  <option value="myanmar">Myanmar</option>
                  <option value="namibia">Namibia</option>
                  <option value="nepal">Nepal</option>
                  <option value="netherlands">Netherlands</option>
                  <option value="new_zealand">New Zealand</option>
                  <option value="nicaragua">Nicaragua</option>
                  <option value="niger">Niger</option>
                  <option value="nigeria">Nigeria</option>
                  <option value="north_korea">North Korea</option>
                  <option value="norway">Norway</option>
                  <option value="oman">Oman</option>
                  <option value="pakistan">Pakistan</option>
                  <option value="palau">Palau</option>
                  <option value="palestine">Palestine</option>
                  <option value="panama">Panama</option>
                  <option value="paraguay">Paraguay</option>
                  <option value="peru">Peru</option>
                  <option value="philippines">Philippines</option>
                  <option value="poland">Poland</option>
                  <option value="portugal">Portugal</option>
                  <option value="qatar">Qatar</option>
                  <option value="romania">Romania</option>
                  <option value="russia">Russia</option>
                  <option value="rwanda">Rwanda</option>
                  <option value="saint_lucia">Saint Lucia</option>
                  <option value="samoa">Samoa</option>
                  <option value="san_marino">San Marino</option>
                  <option value="saudi_arabia">Saudi Arabia</option>
                  <option value="senegal">Senegal</option>
                  <option value="serbia">Serbia</option>
                  <option value="seychelles">Seychelles</option>
                  <option value="singapore">Singapore</option>
                  <option value="slovakia">Slovakia</option>
                  <option value="slovenia">Slovenia</option>
                  <option value="somalia">Somalia</option>
                  <option value="south_africa">South Africa</option>
                  <option value="south_korea">South Korea</option>
                  <option value="spain">Spain</option>
                  <option value="sudan">Sudan</option>
                  <option value="suriname">Suriname</option>
                  <option value="sweden">Sweden</option>
                  <option value="switzerland">Switzerland</option>
                  <option value="syria">Syria</option>
                  <option value="taiwan">Taiwan</option>
                  <option value="tajikistan">Tajikistan</option>
                  <option value="tanzania">Tanzania</option>
                  <option value="thailand">Thailand</option>
                  <option value="togo">Togo</option>
                  <option value="tonga">Tonga</option>
                  <option value="tunisia">Tunisia</option>
                  <option value="turkey">Turkey</option>
                  <option value="turkmenistan">Turkmenistan</option>
                  <option value="uae">UAE</option>
                  <option value="uganda">Uganda</option>
                  <option value="uk">UK</option>
                  <option value="ukraine">Ukraine</option>
                  <option value="uruguay">Uruguay</option>
                  <option value="usa">USA</option>
                  <option value="uzbekistan">Uzbekistan</option>
                  <option value="venezuela">Venezuela</option>
                  <option value="vietnam">Vietnam</option>
                  <option value="yemen">Yemen</option>
                  <option value="zambia">Zambia</option>
                  <option value="zimbabwe">Zimbabwe</option>
                </select>
              </div>

              {formData.category !== 'Exhibitor' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How did you hear about us? *
                  </label>
                  <select
                    name="hearAbout"
                    value={formData.hearAbout}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">Select Option</option>
                    <option value="exhibitor">Exhibitor</option>
                    <option value="word_of_mouth">Word of Mouth</option>
                    <option value="website">Website</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="twitter">Twitter</option>
                    <option value="youtube">YouTube</option>
                    <option value="newspaper_ads">Newspaper Ads</option>
                  </select>
                </div>
              )}

              {/* Exhibitor-specific fields */}
              {formData.category === 'Exhibitor' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Description
                    </label>
                    <textarea
                      name="companyDescription"
                      value={formData.companyDescription}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Brief description of your company and what you do..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Logo
                    </label>
                    <div className="space-y-3">
                      <input
                        type="file"
                        name="logoFile"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setFormData(prev => ({
                            ...prev,
                            logoFile: file
                          }));

                          // Create preview URL
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              setFormData(prev => ({
                                ...prev,
                                logoPreview: e.target?.result as string
                              }));
                            };
                            reader.readAsDataURL(file);
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              logoPreview: ""
                            }));
                          }
                        }}
                        className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />

                      {formData.logoPreview && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600 mb-2">Logo Preview:</p>
                          <img
                            src={formData.logoPreview}
                            alt="Logo preview"
                            className="max-w-32 max-h-32 object-contain border border-gray-300 rounded"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}


            </div>
          </div>

          {/* Submit Messages */}
          {submitError && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {submitError}
            </div>
          )}

          {submitMessage && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
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
                  : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              } text-white`}
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Fields marked with an asterisk (*) are required.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-600 py-4 mt-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-white text-sm opacity-90">
            © 2025 Qatar Travel Mart. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
