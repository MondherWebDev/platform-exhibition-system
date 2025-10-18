import { auth, db } from '../firebaseConfig';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { createUserBadge } from './badgeService';
import { UserProfile, UserRole, BadgeCategory, SponsorTier } from '../types/models';
import {
  createValidationError,
  createServiceError,
  sanitizeUserProfile,
  isValidEmail,
  isValidUserRole,
  dateToTimestamp,
  timestampToDate
} from '../types/utils';

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

export type { UserProfile };

class AuthService {
  private static instance: AuthService;
  private authState: AuthState = {
    user: null,
    profile: null,
    loading: true,
    error: null,
    initialized: false
  };
  private listeners: ((state: AuthState) => void)[] = [];

  private constructor() {
    this.initializeAuthListener();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private initializeAuthListener() {
    onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, 'Users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as Omit<UserProfile, 'uid'>;
            this.authState = {
              user,
              profile: { uid: user.uid, ...userData },
              loading: false,
              error: null,
              initialized: true
            };
          } else {
            // Create default profile if none exists
            const defaultProfile: Omit<UserProfile, 'uid'> = {
              email: user.email || '',
              fullName: user.displayName || user.email?.split('@')[0] || 'User',
              position: 'Attendee',
              company: '',
              category: 'Visitor',
              createdAt: new Date().toISOString(),
              isAgent: false,
              contactEmail: user.email || '',
              contactPhone: '',
              website: '',
              address: '',
              industry: '',
              companySize: '',
              logoUrl: '',
              bio: '',
              linkedin: '',
              twitter: '',
              interests: [],
              budget: '',
              boothId: '',
              sponsorTier: 'gold'
            };

            await setDoc(doc(db, 'Users', user.uid), defaultProfile);
            this.authState = {
              user,
              profile: { uid: user.uid, ...defaultProfile },
              loading: false,
              error: null,
              initialized: true
            };
          }
        } else {
          this.authState = {
            user: null,
            profile: null,
            loading: false,
            error: null,
            initialized: true
          };
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        this.authState = {
          user,
          profile: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Authentication error',
          initialized: true
        };
      }

      this.notifyListeners();
    });
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.authState));
  }

  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    listener(this.authState);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public getAuthState(): AuthState {
    return this.authState;
  }

  public async signUp(
    email: string,
    password: string,
    profileData: Partial<UserProfile>,
    passcode?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.authState.loading = true;
      this.authState.error = null;
      this.notifyListeners();

      // Validate passcode for Organizer/Agent
      if ((profileData.category === 'Organizer' || profileData.category === 'Agent')) {
        if (passcode !== 'EVENT-ADMIN-2025') {
          throw new Error('Invalid passcode for Organizer/Agent registration.');
        }
      }

      // Validate required fields for all account types
      if (!profileData.fullName || !profileData.category) {
        throw new Error('Full name and category are required for all account types.');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address.');
      }

      // Check for duplicate email before creating account
      const existingUsersQuery = query(
        collection(db, 'Users'),
        where('email', '==', email)
      );
      const existingUsersSnapshot = await getDocs(existingUsersQuery);

      if (!existingUsersSnapshot.empty) {
        const existingUser = existingUsersSnapshot.docs[0].data();
        throw new Error(`An account with email ${email} already exists (${existingUser.category}). Please use a different email address.`);
      }

      const userCred = await createUserWithEmailAndPassword(auth, email, password);

      // Determine position based on category if not provided
      let position = profileData.position || 'Attendee';
      if (profileData.category === 'Exhibitor' && !profileData.position) {
        position = 'Exhibitor Representative';
      } else if (profileData.category === 'Sponsor' && !profileData.position) {
        position = 'Sponsor Representative';
      } else if (profileData.category === 'Speaker' && !profileData.position) {
        position = 'Speaker';
      } else if (profileData.category === 'Hosted Buyer' && !profileData.position) {
        position = 'Hosted Buyer';
      } else if (profileData.category === 'Agent' && !profileData.position) {
        position = 'Event Agent';
      } else if (profileData.category === 'Organizer' && !profileData.position) {
        position = 'Event Organizer';
      }

      // Prepare user data with category-specific fields only
      const baseUserData = {
        email,
        fullName: profileData.fullName,
        position: position,
        company: profileData.company || '',
        category: profileData.category,
        createdAt: new Date().toISOString(),
        isAgent: profileData.category === 'Agent',
        generatedPassword: password,
        loginEmail: email,
        contactEmail: profileData.contactEmail || email,
        contactPhone: profileData.contactPhone || '',
        website: profileData.website || '',
        address: profileData.address || ''
      };

      // Add category-specific fields with proper typing
      let categorySpecificData: Record<string, string | number | boolean | string[]> = {};

      switch (profileData.category) {
        case 'Exhibitor':
          categorySpecificData = {
            boothId: profileData.boothId || '',
            industry: profileData.industry || '',
            companySize: profileData.companySize || '',
            logoUrl: profileData.logoUrl || ''
          };
          break;
        case 'Sponsor':
          categorySpecificData = {
            sponsorTier: profileData.sponsorTier || 'gold',
            logoUrl: profileData.logoUrl || ''
          };
          break;
        case 'Speaker':
          categorySpecificData = {
            bio: profileData.bio || '',
            linkedin: profileData.linkedin || '',
            twitter: profileData.twitter || '',
            logoUrl: profileData.logoUrl || '' // Using logoUrl for speaker photo
          };
          break;
        case 'Hosted Buyer':
          categorySpecificData = {
            industry: profileData.industry || '',
            companySize: profileData.companySize || '',
            budget: profileData.budget || '',
            interests: Array.isArray(profileData.interests) ? profileData.interests : [],
            logoUrl: profileData.logoUrl || '' // Using logoUrl for buyer photo
          };
          break;
        case 'Organizer':
        case 'Agent':
          categorySpecificData = {
            // No additional fields needed for these categories
          };
          break;
        default: // Visitor, Media, VIP
          categorySpecificData = {
            // No additional fields needed for these categories
          };
      }

      const userData: Omit<UserProfile, 'uid'> = {
        ...baseUserData,
        ...categorySpecificData
      };

      await setDoc(doc(db, 'Users', userCred.user.uid), userData);

      // Add to event collection if applicable
      await this.addToEventCollection(userCred.user.uid, userData);

      // Create badge for the new user (required for all users)
      try {
        console.log('🎫 Creating badge for new user:', userCred.user.uid, 'Category:', userData.category);
        const badgeResult = await createUserBadge(userCred.user.uid, {
          name: userData.fullName || 'User',
          role: userData.position || 'Attendee',
          company: userData.company || '',
          category: userData.category || 'Visitor'
        });

        if (badgeResult) {
          console.log('✅ Badge created successfully for new user');
          // Update user document with badge reference
          await setDoc(doc(db, 'Users', userCred.user.uid), {
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
        // Fail registration if badge creation fails
        await userCred.user.delete(); // Clean up the auth user
        throw new Error('Badge creation failed. Please try again.');
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      this.authState.error = errorMessage;
      return { success: false, error: errorMessage };
    } finally {
      this.authState.loading = false;
      this.notifyListeners();
    }
  }

  public async signIn(
    email: string,
    password: string,
    redirectPath?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.authState.loading = true;
      this.authState.error = null;
      this.notifyListeners();

      console.log('🔐 AuthService: Attempting sign in for:', email);
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      console.log('🔐 AuthService: Firebase sign in successful for:', userCred.user.email || email);

      // The auth state listener will handle profile loading and redirection
      // No need to wait here - the AuthForm component is already subscribed
      console.log('🔐 AuthService: Sign in process completed successfully');
      return { success: true };
    } catch (error) {
      console.error('🔐 AuthService: Sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      this.authState.error = errorMessage;
      this.authState.loading = false;
      this.notifyListeners();
      return { success: false, error: errorMessage };
    }
  }

  public async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    try {
      this.authState.loading = true;
      this.authState.error = null;
      this.notifyListeners();

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore, if not create with default values
      const userDoc = await getDoc(doc(db, 'Users', user.uid));
      if (!userDoc.exists()) {
        const defaultProfile: Omit<UserProfile, 'uid'> = {
          email: user.email || '',
          fullName: user.displayName || user.email?.split('@')[0] || 'User',
          position: 'Attendee',
          company: '',
          category: 'Visitor',
          createdAt: new Date().toISOString(),
          isAgent: false,
          contactEmail: user.email || '',
          contactPhone: '',
          website: '',
          address: '',
          industry: '',
          companySize: '',
          logoUrl: '',
          bio: '',
          linkedin: '',
          twitter: '',
          interests: [],
          budget: '',
          boothId: '',
          sponsorTier: 'gold'
        };

        await setDoc(doc(db, 'Users', user.uid), defaultProfile);

        // Create badge for new Google user
        try {
          console.log('🎫 Creating badge for new Google user:', user.uid);
          const badgeResult = await createUserBadge(user.uid, {
            name: defaultProfile.fullName || 'User',
            role: defaultProfile.position || 'Attendee',
            company: defaultProfile.company || '',
            category: defaultProfile.category || 'Visitor'
          });

          if (badgeResult) {
            console.log('✅ Badge created successfully for new Google user');
            // Update user document with badge reference
            await setDoc(doc(db, 'Users', user.uid), {
              badgeId: badgeResult.id,
              badgeCreated: true,
              badgeCreatedAt: new Date()
            }, { merge: true });
          }
        } catch (badgeError) {
          console.error('❌ Error creating badge for new Google user:', badgeError);
        }
      } else {
        // Check if existing Google user has a badge
        const userData = userDoc.data() as Omit<UserProfile, 'uid'>;
        if (!userData.badgeId || !userData.badgeCreated) {
          try {
            console.log('🎫 Creating badge for existing Google user without badge:', user.uid);
            const badgeResult = await createUserBadge(user.uid, {
              name: userData.fullName || 'User',
              role: userData.position || 'Attendee',
              company: userData.company || '',
              category: userData.category || 'Visitor'
            });

            if (badgeResult) {
              console.log('✅ Badge created successfully for existing Google user');
              // Update user document with badge reference
              await setDoc(doc(db, 'Users', user.uid), {
                badgeId: badgeResult.id,
                badgeCreated: true,
                badgeCreatedAt: new Date()
              }, { merge: true });
            }
          } catch (badgeError) {
            console.error('❌ Error creating badge for existing Google user:', badgeError);
          }
        }
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google sign in failed';
      this.authState.error = errorMessage;
      return { success: false, error: errorMessage };
    } finally {
      this.authState.loading = false;
      this.notifyListeners();
    }
  }

  public async signOutUser(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  public getRedirectPath(category: string, redirectPath?: string): string {
    if (redirectPath) {
      return redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;
    }

    switch (category) {
      case 'Organizer':
      case 'Administrator':
        return '/dashboard'; // Both Organizer and Administrator go to main dashboard
      case 'Agent':
        return '/checkin'; // Redirect agents directly to check-in system
      case 'Hosted Buyer':
        return '/dashboard/hostedbuyer';
      case 'Exhibitor':
        return '/dashboard/exhibitor';
      case 'Visitor':
        return '/dashboard/visitor';
      case 'Media':
        return '/dashboard/media';
      case 'Speaker':
        return '/dashboard/speaker';
      case 'Sponsor':
        return '/dashboard/sponsor';
      case 'VIP':
        return '/dashboard/vip';
      default:
        return `/dashboard/${category.toLowerCase().replace(/\s+/g, '-')}`;
    }
  }

  private async addToEventCollection(uid: string, userData: Omit<UserProfile, 'uid'>) {
    const eventId = 'default'; // Make this dynamic based on current event
    let collectionName = '';

    switch (userData.category) {
      case 'Exhibitor':
        collectionName = 'Exhibitors';
        break;
      case 'Sponsor':
        collectionName = 'Sponsors';
        break;
      case 'Speaker':
        collectionName = 'Speakers';
        break;
      case 'Hosted Buyer':
        collectionName = 'HostedBuyers';
        break;
      default:
        return;
    }

    if (collectionName) {
      await setDoc(doc(db, 'Events', eventId, collectionName, uid), {
        ...userData,
        userId: uid,
        createdAt: new Date().toISOString()
      });
    }
  }

  public async updateProfile(updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.authState.user || !this.authState.profile) {
        throw new Error('No authenticated user');
      }

      await updateDoc(doc(db, 'Users', this.authState.user.uid), updates);

      // Update local state
      this.authState.profile = { ...this.authState.profile, ...updates };
      this.notifyListeners();

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      return { success: false, error: errorMessage };
    }
  }
}

export const authService = AuthService.getInstance();
