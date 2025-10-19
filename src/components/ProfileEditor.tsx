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

const countryCodes = [
  { code: '+1', country: 'US', name: 'United States' },
  { code: '+7', country: 'RU', name: 'Russia' },
  { code: '+20', country: 'EG', name: 'Egypt' },
  { code: '+27', country: 'ZA', name: 'South Africa' },
  { code: '+30', country: 'GR', name: 'Greece' },
  { code: '+31', country: 'NL', name: 'Netherlands' },
  { code: '+32', country: 'BE', name: 'Belgium' },
  { code: '+33', country: 'FR', name: 'France' },
  { code: '+34', country: 'ES', name: 'Spain' },
  { code: '+36', country: 'HU', name: 'Hungary' },
  { code: '+39', country: 'IT', name: 'Italy' },
  { code: '+40', country: 'RO', name: 'Romania' },
  { code: '+41', country: 'CH', name: 'Switzerland' },
  { code: '+43', country: 'AT', name: 'Austria' },
  { code: '+44', country: 'GB', name: 'United Kingdom' },
  { code: '+45', country: 'DK', name: 'Denmark' },
  { code: '+46', country: 'SE', name: 'Sweden' },
  { code: '+47', country: 'NO', name: 'Norway' },
  { code: '+48', country: 'PL', name: 'Poland' },
  { code: '+49', country: 'DE', name: 'Germany' },
  { code: '+51', country: 'PE', name: 'Peru' },
  { code: '+52', country: 'MX', name: 'Mexico' },
  { code: '+53', country: 'CU', name: 'Cuba' },
  { code: '+54', country: 'AR', name: 'Argentina' },
  { code: '+55', country: 'BR', name: 'Brazil' },
  { code: '+56', country: 'CL', name: 'Chile' },
  { code: '+57', country: 'CO', name: 'Colombia' },
  { code: '+58', country: 'VE', name: 'Venezuela' },
  { code: '+60', country: 'MY', name: 'Malaysia' },
  { code: '+61', country: 'AU', name: 'Australia' },
  { code: '+62', country: 'ID', name: 'Indonesia' },
  { code: '+63', country: 'PH', name: 'Philippines' },
  { code: '+64', country: 'NZ', name: 'New Zealand' },
  { code: '+65', country: 'SG', name: 'Singapore' },
  { code: '+66', country: 'TH', name: 'Thailand' },
  { code: '+81', country: 'JP', name: 'Japan' },
  { code: '+82', country: 'KR', name: 'South Korea' },
  { code: '+84', country: 'VN', name: 'Vietnam' },
  { code: '+86', country: 'CN', name: 'China' },
  { code: '+90', country: 'TR', name: 'Turkey' },
  { code: '+91', country: 'IN', name: 'India' },
  { code: '+92', country: 'PK', name: 'Pakistan' },
  { code: '+93', country: 'AF', name: 'Afghanistan' },
  { code: '+94', country: 'LK', name: 'Sri Lanka' },
  { code: '+95', country: 'MM', name: 'Myanmar' },
  { code: '+98', country: 'IR', name: 'Iran' },
  { code: '+212', country: 'MA', name: 'Morocco' },
  { code: '+213', country: 'DZ', name: 'Algeria' },
  { code: '+216', country: 'TN', name: 'Tunisia' },
  { code: '+218', country: 'LY', name: 'Libya' },
  { code: '+220', country: 'GM', name: 'Gambia' },
  { code: '+221', country: 'SN', name: 'Senegal' },
  { code: '+222', country: 'MR', name: 'Mauritania' },
  { code: '+223', country: 'ML', name: 'Mali' },
  { code: '+224', country: 'GN', name: 'Guinea' },
  { code: '+225', country: 'CI', name: 'Ivory Coast' },
  { code: '+226', country: 'BF', name: 'Burkina Faso' },
  { code: '+227', country: 'NE', name: 'Niger' },
  { code: '+228', country: 'TG', name: 'Togo' },
  { code: '+229', country: 'BJ', name: 'Benin' },
  { code: '+230', country: 'MU', name: 'Mauritius' },
  { code: '+231', country: 'LR', name: 'Liberia' },
  { code: '+232', country: 'SL', name: 'Sierra Leone' },
  { code: '+233', country: 'GH', name: 'Ghana' },
  { code: '+234', country: 'NG', name: 'Nigeria' },
  { code: '+235', country: 'TD', name: 'Chad' },
  { code: '+236', country: 'CF', name: 'Central African Republic' },
  { code: '+237', country: 'CM', name: 'Cameroon' },
  { code: '+238', country: 'CV', name: 'Cape Verde' },
  { code: '+239', country: 'ST', name: 'São Tomé and Príncipe' },
  { code: '+240', country: 'GQ', name: 'Equatorial Guinea' },
  { code: '+241', country: 'GA', name: 'Gabon' },
  { code: '+242', country: 'CG', name: 'Republic of the Congo' },
  { code: '+243', country: 'CD', name: 'Democratic Republic of the Congo' },
  { code: '+244', country: 'AO', name: 'Angola' },
  { code: '+245', country: 'GW', name: 'Guinea-Bissau' },
  { code: '+246', country: 'IO', name: 'British Indian Ocean Territory' },
  { code: '+248', country: 'SC', name: 'Seychelles' },
  { code: '+249', country: 'SD', name: 'Sudan' },
  { code: '+250', country: 'RW', name: 'Rwanda' },
  { code: '+251', country: 'ET', name: 'Ethiopia' },
  { code: '+252', country: 'SO', name: 'Somalia' },
  { code: '+253', country: 'DJ', name: 'Djibouti' },
  { code: '+254', country: 'KE', name: 'Kenya' },
  { code: '+255', country: 'TZ', name: 'Tanzania' },
  { code: '+256', country: 'UG', name: 'Uganda' },
  { code: '+257', country: 'BI', name: 'Burundi' },
  { code: '+258', country: 'MZ', name: 'Mozambique' },
  { code: '+260', country: 'ZM', name: 'Zambia' },
  { code: '+261', country: 'MG', name: 'Madagascar' },
  { code: '+262', country: 'RE', name: 'Réunion' },
  { code: '+263', country: 'ZW', name: 'Zimbabwe' },
  { code: '+264', country: 'NA', name: 'Namibia' },
  { code: '+265', country: 'MW', name: 'Malawi' },
  { code: '+266', country: 'LS', name: 'Lesotho' },
  { code: '+267', country: 'BW', name: 'Botswana' },
  { code: '+268', country: 'SZ', name: 'Eswatini' },
  { code: '+269', country: 'KM', name: 'Comoros' },
  { code: '+290', country: 'SH', name: 'Saint Helena' },
  { code: '+291', country: 'ER', name: 'Eritrea' },
  { code: '+297', country: 'AW', name: 'Aruba' },
  { code: '+298', country: 'FO', name: 'Faroe Islands' },
  { code: '+299', country: 'GL', name: 'Greenland' },
  { code: '+350', country: 'GI', name: 'Gibraltar' },
  { code: '+351', country: 'PT', name: 'Portugal' },
  { code: '+352', country: 'LU', name: 'Luxembourg' },
  { code: '+353', country: 'IE', name: 'Ireland' },
  { code: '+354', country: 'IS', name: 'Iceland' },
  { code: '+355', country: 'AL', name: 'Albania' },
  { code: '+356', country: 'MT', name: 'Malta' },
  { code: '+357', country: 'CY', name: 'Cyprus' },
  { code: '+358', country: 'FI', name: 'Finland' },
  { code: '+359', country: 'BG', name: 'Bulgaria' },
  { code: '+370', country: 'LT', name: 'Lithuania' },
  { code: '+371', country: 'LV', name: 'Latvia' },
  { code: '+372', country: 'EE', name: 'Estonia' },
  { code: '+373', country: 'MD', name: 'Moldova' },
  { code: '+374', country: 'AM', name: 'Armenia' },
  { code: '+375', country: 'BY', name: 'Belarus' },
  { code: '+376', country: 'AD', name: 'Andorra' },
  { code: '+377', country: 'MC', name: 'Monaco' },
  { code: '+378', country: 'SM', name: 'San Marino' },
  { code: '+380', country: 'UA', name: 'Ukraine' },
  { code: '+381', country: 'RS', name: 'Serbia' },
  { code: '+382', country: 'ME', name: 'Montenegro' },
  { code: '+383', country: 'XK', name: 'Kosovo' },
  { code: '+385', country: 'HR', name: 'Croatia' },
  { code: '+386', country: 'SI', name: 'Slovenia' },
  { code: '+387', country: 'BA', name: 'Bosnia and Herzegovina' },
  { code: '+389', country: 'MK', name: 'North Macedonia' },
  { code: '+420', country: 'CZ', name: 'Czech Republic' },
  { code: '+421', country: 'SK', name: 'Slovakia' },
  { code: '+423', country: 'LI', name: 'Liechtenstein' },
  { code: '+500', country: 'FK', name: 'Falkland Islands' },
  { code: '+501', country: 'BZ', name: 'Belize' },
  { code: '+502', country: 'GT', name: 'Guatemala' },
  { code: '+503', country: 'SV', name: 'El Salvador' },
  { code: '+504', country: 'HN', name: 'Honduras' },
  { code: '+505', country: 'NI', name: 'Nicaragua' },
  { code: '+506', country: 'CR', name: 'Costa Rica' },
  { code: '+507', country: 'PA', name: 'Panama' },
  { code: '+508', country: 'PM', name: 'Saint Pierre and Miquelon' },
  { code: '+509', country: 'HT', name: 'Haiti' },
  { code: '+590', country: 'GP', name: 'Guadeloupe' },
  { code: '+591', country: 'BO', name: 'Bolivia' },
  { code: '+592', country: 'GY', name: 'Guyana' },
  { code: '+593', country: 'EC', name: 'Ecuador' },
  { code: '+594', country: 'GF', name: 'French Guiana' },
  { code: '+595', country: 'PY', name: 'Paraguay' },
  { code: '+596', country: 'MQ', name: 'Martinique' },
  { code: '+597', country: 'SR', name: 'Suriname' },
  { code: '+598', country: 'UY', name: 'Uruguay' },
  { code: '+599', country: 'CW', name: 'Curaçao' },
  { code: '+670', country: 'TL', name: 'East Timor' },
  { code: '+672', country: 'AQ', name: 'Antarctica' },
  { code: '+673', country: 'BN', name: 'Brunei' },
  { code: '+674', country: 'NR', name: 'Nauru' },
  { code: '+675', country: 'PG', name: 'Papua New Guinea' },
  { code: '+676', country: 'TO', name: 'Tonga' },
  { code: '+677', country: 'SB', name: 'Solomon Islands' },
  { code: '+678', country: 'VU', name: 'Vanuatu' },
  { code: '+679', country: 'FJ', name: 'Fiji' },
  { code: '+680', country: 'PW', name: 'Palau' },
  { code: '+681', country: 'WF', name: 'Wallis and Futuna' },
  { code: '+682', country: 'CK', name: 'Cook Islands' },
  { code: '+683', country: 'NU', name: 'Niue' },
  { code: '+684', country: 'AS', name: 'American Samoa' },
  { code: '+685', country: 'WS', name: 'Samoa' },
  { code: '+686', country: 'KI', name: 'Kiribati' },
  { code: '+687', country: 'NC', name: 'New Caledonia' },
  { code: '+688', country: 'TV', name: 'Tuvalu' },
  { code: '+689', country: 'PF', name: 'French Polynesia' },
  { code: '+690', country: 'TK', name: 'Tokelau' },
  { code: '+691', country: 'FM', name: 'Federated States of Micronesia' },
  { code: '+692', country: 'MH', name: 'Marshall Islands' },
  { code: '+850', country: 'KP', name: 'North Korea' },
  { code: '+852', country: 'HK', name: 'Hong Kong' },
  { code: '+853', country: 'MO', name: 'Macau' },
  { code: '+855', country: 'KH', name: 'Cambodia' },
  { code: '+856', country: 'LA', name: 'Laos' },
  { code: '+880', country: 'BD', name: 'Bangladesh' },
  { code: '+886', country: 'TW', name: 'Taiwan' },
  { code: '+960', country: 'MV', name: 'Maldives' },
  { code: '+961', country: 'LB', name: 'Lebanon' },
  { code: '+962', country: 'JO', name: 'Jordan' },
  { code: '+963', country: 'SY', name: 'Syria' },
  { code: '+964', country: 'IQ', name: 'Iraq' },
  { code: '+965', country: 'KW', name: 'Kuwait' },
  { code: '+966', country: 'SA', name: 'Saudi Arabia' },
  { code: '+967', country: 'YE', name: 'Yemen' },
  { code: '+968', country: 'OM', name: 'Oman' },
  { code: '+970', country: 'PS', name: 'Palestine' },
  { code: '+971', country: 'AE', name: 'United Arab Emirates' },
  { code: '+972', country: 'IL', name: 'Israel' },
  { code: '+973', country: 'BH', name: 'Bahrain' },
  { code: '+974', country: 'QA', name: 'Qatar' },
  { code: '+975', country: 'BT', name: 'Bhutan' },
  { code: '+976', country: 'MN', name: 'Mongolia' },
  { code: '+977', country: 'NP', name: 'Nepal' },
  { code: '+992', country: 'TJ', name: 'Tajikistan' },
  { code: '+993', country: 'TM', name: 'Turkmenistan' },
  { code: '+994', country: 'AZ', name: 'Azerbaijan' },
  { code: '+995', country: 'GE', name: 'Georgia' },
  { code: '+996', country: 'KG', name: 'Kyrgyzstan' },
  { code: '+998', country: 'UZ', name: 'Uzbekistan' }
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
                <div className="flex gap-2">
                  <select
                    value={profile.countryCode || '+974'}
                    onChange={e => setProfile({ ...profile, countryCode: e.target.value })}
                    className="p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none min-w-[120px]"
                  >
                    {countryCodes.map(country => (
                      <option key={`${country.country}-${country.code}`} value={country.code}>
                        {country.code} ({country.country})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={profile.phone || profile.mobile || ''}
                    onChange={e => setProfile({ ...profile, phone: e.target.value, mobile: e.target.value })}
                    className="p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none flex-1"
                  />
                </div>
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
                  value={profile.description || profile.companyDescription || ''}
                  onChange={e => setProfile({ ...profile, description: e.target.value, companyDescription: e.target.value })}
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
                    <span className="text-gray-800 break-words max-w-[60%] text-right">
                      {profile.countryCode && (profile.mobile || profile.phone)
                        ? `+${profile.countryCode} ${profile.mobile || profile.phone}`
                        : (profile.mobile || profile.phone || 'Not provided')}
                    </span>
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
            {(profile.description || profile.companyDescription) && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">About</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{profile.description || profile.companyDescription}</p>
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
