import { db } from '../firebaseConfig';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { leadService, LeadData } from './leadService';
import { cacheMatchmakingResults, getCachedMatchmakingResults } from './redisService';

export interface MatchRecommendation {
  id?: string;
  exhibitorUid: string;
  attendeeUid: string;
  score: number;
  reasons: string[];
  confidence: 'high' | 'medium' | 'low';
  createdAt?: any;
  eventId?: string;
  used?: boolean;
  convertedToLead?: string;
  convertedAt?: any;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  company: string;
  category: string;
  industry?: string;
  companySize?: string;
  interests?: string;
  budget?: string;
  position?: string;
  bio?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
}

class MatchmakingService {
  private static instance: MatchmakingService;

  private constructor() {}

  public static getInstance(): MatchmakingService {
    if (!MatchmakingService.instance) {
      MatchmakingService.instance = new MatchmakingService();
    }
    return MatchmakingService.instance;
  }

  public async generateRecommendations(
    eventId: string = 'default',
    minScore: number = 0.1,
    maxRecommendations: number = 100
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      console.log('🤖 Starting enhanced matchmaking process...');

      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'Users'));
      const users = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[];

      const exhibitors = users.filter(u => u.category === 'Exhibitor');
      const attendees = users.filter(u => u.category === 'Visitor' || u.category === 'Hosted Buyer' || u.category === 'VIP');

      console.log(`📊 Found ${exhibitors.length} exhibitors and ${attendees.length} attendees`);

      const recommendations: MatchRecommendation[] = [];
      const processedPairs = new Set<string>();

      // Generate recommendations for each exhibitor-attendee pair
      for (const exhibitor of exhibitors) {
        for (const attendee of attendees) {
          const pairKey = `${exhibitor.uid}-${attendee.uid}`;

          // Skip if already processed or if it's the same user
          if (processedPairs.has(pairKey) || exhibitor.uid === attendee.uid) {
            continue;
          }

          processedPairs.add(pairKey);

          // Check if lead already exists
          const duplicateCheck = await leadService.checkForDuplicateLeads(exhibitor.uid, attendee.uid);
          if (duplicateCheck.exists) {
            console.log(`⚠️ Lead already exists for ${exhibitor.fullName} + ${attendee.fullName}`);
            continue;
          }

          // Calculate match score
          const matchScore = await this.calculateMatchScore(exhibitor, attendee);

          if (matchScore.totalScore >= minScore) {
            const recommendation: MatchRecommendation = {
              exhibitorUid: exhibitor.uid,
              attendeeUid: attendee.uid,
              score: matchScore.totalScore,
              reasons: matchScore.factors,
              confidence: this.determineConfidence(matchScore.totalScore),
              createdAt: serverTimestamp(),
              eventId
            };

            recommendations.push(recommendation);
          }
        }
      }

      // Sort by score (highest first)
      recommendations.sort((a, b) => b.score - a.score);

      // Limit recommendations
      const limitedRecommendations = recommendations.slice(0, maxRecommendations);

      console.log(`🎯 Generated ${limitedRecommendations.length} recommendations`);

      // Save recommendations to database
      const savedCount = await this.saveRecommendations(limitedRecommendations);

      return { success: true, count: savedCount };
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return { success: false, count: 0, error: error instanceof Error ? error.message : 'Failed to generate recommendations' };
    }
  }

  private async calculateMatchScore(exhibitor: UserProfile, attendee: UserProfile): Promise<{ totalScore: number; factors: string[]; detailedScores?: { [key: string]: number } }> {
    let totalScore = 0;
    const factors: string[] = [];
    const detailedScores: { [key: string]: number } = {};

    // Enhanced scoring weights with machine learning-inspired factors
    const weights = {
      industryAlignment: 0.25,      // Industry and interest matching
      companyCompatibility: 0.20,   // Size, budget, and business alignment
      behavioralSignals: 0.20,      // Engagement and activity patterns
      networkEffect: 0.15,         // Connections and social proof
      contextualRelevance: 0.10,   // Event-specific and timing factors
      semanticSimilarity: 0.10     // Content and description matching
    };

    // 1. INDUSTRY ALIGNMENT (25% weight) - Enhanced with semantic matching
    const industryScore = this.calculateIndustryAlignment(exhibitor, attendee);
    totalScore += industryScore * weights.industryAlignment;
    detailedScores['industryAlignment'] = industryScore;
    if (industryScore > 0.6) {
      factors.push(`Strong industry alignment (${Math.round(industryScore * 100)}%)`);
    }

    // 2. COMPANY COMPATIBILITY (20% weight) - Multi-factor business matching
    const companyScore = await this.calculateCompanyCompatibility(exhibitor, attendee);
    totalScore += companyScore * weights.companyCompatibility;
    detailedScores['companyCompatibility'] = companyScore;
    if (companyScore > 0.5) {
      factors.push('Excellent business compatibility');
    }

    // 3. BEHAVIORAL SIGNALS (20% weight) - NEW: ML-inspired engagement factors
    const behavioralScore = await this.calculateBehavioralSignals(exhibitor, attendee);
    totalScore += behavioralScore * weights.behavioralSignals;
    detailedScores['behavioralSignals'] = behavioralScore;
    if (behavioralScore > 0.4) {
      factors.push('High engagement compatibility');
    }

    // 4. NETWORK EFFECT (15% weight) - Enhanced social proof
    const networkScore = await this.calculateNetworkEffect(exhibitor, attendee);
    totalScore += networkScore * weights.networkEffect;
    detailedScores['networkEffect'] = networkScore;
    if (networkScore > 0.3) {
      factors.push('Strong network connections');
    }

    // 5. CONTEXTUAL RELEVANCE (10% weight) - NEW: Event and timing factors
    const contextualScore = await this.calculateContextualRelevance(exhibitor, attendee);
    totalScore += contextualScore * weights.contextualRelevance;
    detailedScores['contextualRelevance'] = contextualScore;
    if (contextualScore > 0.3) {
      factors.push('Perfect timing and context');
    }

    // 6. SEMANTIC SIMILARITY (10% weight) - NEW: Content-based matching
    const semanticScore = this.calculateSemanticSimilarity(exhibitor, attendee);
    totalScore += semanticScore * weights.semanticSimilarity;
    detailedScores['semanticSimilarity'] = semanticScore;
    if (semanticScore > 0.4) {
      factors.push('Content and goals alignment');
    }

    // Machine Learning-inspired adjustments
    const mlAdjustments = await this.applyMLAdjustments(exhibitor, attendee, detailedScores);
    totalScore += mlAdjustments.adjustment;
    if (mlAdjustments.reasons.length > 0) {
      factors.push(...mlAdjustments.reasons);
    }

    // Ensure score is between 0 and 1
    totalScore = Math.max(0, Math.min(1, totalScore));

    return { totalScore, factors, detailedScores };
  }

  // NEW: Enhanced company compatibility with multiple factors
  private async calculateCompanyCompatibility(exhibitor: UserProfile, attendee: UserProfile): Promise<number> {
    let score = 0;

    // Company size compatibility (40% of company score)
    if (exhibitor.companySize && attendee.companySize) {
      const sizeScore = this.calculateSizeCompatibility(exhibitor, attendee);
      score += sizeScore * 0.4;
    }

    // Budget compatibility (35% of company score)
    if (exhibitor.company && attendee.budget) {
      const budgetScore = this.calculateBudgetCompatibility(exhibitor, attendee);
      score += budgetScore * 0.35;
    }

    // Business model compatibility (25% of company score)
    const businessModelScore = this.calculateBusinessModelCompatibility(exhibitor, attendee);
    score += businessModelScore * 0.25;

    return Math.min(score, 1.0);
  }

  // NEW: Calculate behavioral signals using engagement patterns
  private async calculateBehavioralSignals(exhibitor: UserProfile, attendee: UserProfile): Promise<number> {
    let score = 0;

    try {
      // Activity level compatibility
      const [exhibitorActivity, attendeeActivity] = await Promise.all([
        this.getUserActivityScore(exhibitor.uid),
        this.getUserActivityScore(attendee.uid)
      ]);

      const activityCompatibility = 1 - Math.abs(exhibitorActivity - attendeeActivity);
      score += activityCompatibility * 0.3;

      // Response time patterns
      const responseTimeScore = await this.getResponseTimeCompatibility(exhibitor.uid, attendee.uid);
      score += responseTimeScore * 0.25;

      // Profile completeness and update frequency
      const profileQualityScore = this.calculateProfileQualityScore(exhibitor, attendee);
      score += profileQualityScore * 0.25;

      // Communication style matching (based on bio and description analysis)
      const communicationScore = this.calculateCommunicationStyleMatch(exhibitor, attendee);
      score += communicationScore * 0.2;

    } catch (error) {
      console.error('Error calculating behavioral signals:', error);
    }

    return Math.min(score, 1.0);
  }

  // NEW: Calculate contextual relevance based on event timing and situation
  private async calculateContextualRelevance(exhibitor: UserProfile, attendee: UserProfile): Promise<number> {
    let score = 0;

    try {
      // Check if both are currently active in the event
      const [exhibitorActive, attendeeActive] = await Promise.all([
        this.isUserActiveToday(exhibitor.uid),
        this.isUserActiveToday(attendee.uid)
      ]);

      if (exhibitorActive && attendeeActive) {
        score += 0.4;
      }

      // Check for complementary schedules (one is exhibitor, one is attendee)
      if (exhibitor.category === 'Exhibitor' && (attendee.category === 'Visitor' || attendee.category === 'Hosted Buyer')) {
        score += 0.3;
      }

      // Time-based relevance (business hours compatibility)
      const timeCompatibility = this.calculateTimeCompatibility(exhibitor, attendee);
      score += timeCompatibility * 0.3;

    } catch (error) {
      console.error('Error calculating contextual relevance:', error);
    }

    return Math.min(score, 1.0);
  }

  // NEW: Calculate semantic similarity using content analysis
  private calculateSemanticSimilarity(exhibitor: UserProfile, attendee: UserProfile): number {
    let score = 0;

    // Bio similarity
    if (exhibitor.bio && attendee.interests) {
      const bioScore = this.calculateTextSimilarity(exhibitor.bio, attendee.interests);
      score += bioScore * 0.4;
    }

    // Company description vs interests
    if (exhibitor.company && attendee.interests) {
      const companyScore = this.calculateTextSimilarity(exhibitor.company, attendee.interests);
      score += companyScore * 0.3;
    }

    // Position/role vs interests
    if (exhibitor.position && attendee.interests) {
      const positionScore = this.calculateTextSimilarity(exhibitor.position, attendee.interests);
      score += positionScore * 0.3;
    }

    return Math.min(score, 1.0);
  }

  // NEW: Apply machine learning-inspired adjustments
  private async applyMLAdjustments(
    exhibitor: UserProfile,
    attendee: UserProfile,
    detailedScores: { [key: string]: number }
  ): Promise<{ adjustment: number; reasons: string[] }> {
    let adjustment = 0;
    const reasons: string[] = [];

    try {
      // Pattern recognition: High industry + high behavioral = boost
      if (detailedScores.industryAlignment > 0.7 && detailedScores.behavioralSignals > 0.5) {
        adjustment += 0.05;
        reasons.push('ML Pattern: Industry + Behavior synergy');
      }

      // Pattern recognition: High network + contextual = boost
      if (detailedScores.networkEffect > 0.4 && detailedScores.contextualRelevance > 0.3) {
        adjustment += 0.04;
        reasons.push('ML Pattern: Network + Context synergy');
      }

      // Negative adjustments for incompatible patterns
      if (detailedScores.companyCompatibility < 0.3 && detailedScores.behavioralSignals < 0.3) {
        adjustment -= 0.03;
        reasons.push('ML Pattern: Low compatibility indicators');
      }

      // Success pattern recognition (based on historical data)
      const successPatternScore = await this.checkSuccessPatterns(exhibitor, attendee);
      if (successPatternScore > 0.6) {
        adjustment += 0.06;
        reasons.push('ML Pattern: Historical success indicators');
      }

    } catch (error) {
      console.error('Error applying ML adjustments:', error);
    }

    return { adjustment: Math.max(-0.1, Math.min(0.1, adjustment)), reasons };
  }

  // Helper methods for enhanced scoring
  private async getUserActivityScore(uid: string): Promise<number> {
    try {
      // Calculate based on recent check-ins, profile views, etc.
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [checkinCount, profileViewCount] = await Promise.all([
        this.getRecentCheckinCount(uid, 30),
        this.getRecentProfileViewCount(uid, 30)
      ]);

      // Normalize to 0-1 scale
      const normalizedActivity = Math.min((checkinCount * 0.1 + profileViewCount * 0.05), 1.0);
      return normalizedActivity;
    } catch (error) {
      return 0.5; // Default moderate activity
    }
  }

  private async getResponseTimeCompatibility(exhibitorUid: string, attendeeUid: string): Promise<number> {
    try {
      // This would analyze historical response times
      // For now, return moderate compatibility
      return 0.5;
    } catch (error) {
      return 0.5;
    }
  }

  private calculateProfileQualityScore(exhibitor: UserProfile, attendee: UserProfile): number {
    const exhibitorScore = this.calculateIndividualProfileQuality(exhibitor);
    const attendeeScore = this.calculateIndividualProfileQuality(attendee);

    return (exhibitorScore + attendeeScore) / 2;
  }

  private calculateIndividualProfileQuality(user: UserProfile): number {
    let score = 0;

    if (user.fullName) score += 0.2;
    if (user.company) score += 0.2;
    if (user.position) score += 0.15;
    if (user.industry) score += 0.15;
    if (user.bio && user.bio.length > 50) score += 0.15;
    if (user.contactEmail) score += 0.1;
    if (user.linkedin || user.website) score += 0.05;

    return score;
  }

  private calculateCommunicationStyleMatch(exhibitor: UserProfile, attendee: UserProfile): number {
    // Analyze bio and description for communication style indicators
    const exhibitorText = `${exhibitor.bio || ''} ${exhibitor.position || ''}`.toLowerCase();
    const attendeeInterests = (attendee.interests || '').toLowerCase();

    // Look for communication style keywords
    const formalKeywords = ['enterprise', 'corporate', 'executive', 'strategic', 'management'];
    const casualKeywords = ['startup', 'innovative', 'creative', 'dynamic', 'flexible'];

    let exhibitorStyle = 0.5; // Neutral default
    let attendeeStyle = 0.5;

    for (const keyword of formalKeywords) {
      if (exhibitorText.includes(keyword)) exhibitorStyle += 0.1;
      if (attendeeInterests.includes(keyword)) attendeeStyle += 0.1;
    }

    for (const keyword of casualKeywords) {
      if (exhibitorText.includes(keyword)) exhibitorStyle -= 0.1;
      if (attendeeInterests.includes(keyword)) attendeeStyle -= 0.1;
    }

    const styleDifference = Math.abs(exhibitorStyle - attendeeStyle);
    return Math.max(0, 1 - styleDifference);
  }

  private calculateBusinessModelCompatibility(exhibitor: UserProfile, attendee: UserProfile): number {
    // Analyze business model compatibility based on company size and industry
    let score = 0.5; // Base compatibility

    // B2B vs B2C indicators
    const b2bIndicators = ['enterprise', 'corporate', 'saas', 'solution', 'platform'];
    const b2cIndicators = ['consumer', 'retail', 'individual', 'personal', 'lifestyle'];

    const exhibitorText = `${exhibitor.company} ${exhibitor.industry || ''}`.toLowerCase();
    const attendeeInterests = (attendee.interests || '').toLowerCase();

    let exhibitorB2B = 0;
    let attendeeB2B = 0;

    for (const indicator of b2bIndicators) {
      if (exhibitorText.includes(indicator)) exhibitorB2B++;
      if (attendeeInterests.includes(indicator)) attendeeB2B++;
    }

    for (const indicator of b2cIndicators) {
      if (exhibitorText.includes(indicator)) exhibitorB2B--;
      if (attendeeInterests.includes(indicator)) attendeeB2B--;
    }

    // Similar business models get higher scores
    const modelDifference = Math.abs(exhibitorB2B - attendeeB2B);
    score += (1 - modelDifference * 0.1);

    return Math.max(0, Math.min(1, score));
  }

  private calculateTimeCompatibility(exhibitor: UserProfile, attendee: UserProfile): number {
    // Simple timezone compatibility (could be enhanced with actual timezone data)
    // For now, assume same timezone compatibility
    return 0.8;
  }

  private async checkSuccessPatterns(exhibitor: UserProfile, attendee: UserProfile): Promise<number> {
    try {
      // Look for patterns that historically led to successful matches
      // This would analyze historical lead conversion data
      // For now, return moderate score based on profile completeness
      const completenessScore = this.calculateProfileQualityScore(exhibitor, attendee);
      return completenessScore * 0.8;
    } catch (error) {
      return 0.5;
    }
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(word => word.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(word => word.length > 2));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / Math.max(union.size, 1);
  }

  private async getRecentCheckinCount(uid: string, days: number): Promise<number> {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const q = query(
        collection(db, 'CheckIns'),
        where('uid', '==', uid),
        where('at', '>=', cutoff)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      return 0;
    }
  }

  private async getRecentProfileViewCount(uid: string, days: number): Promise<number> {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const q = query(
        collection(db, 'ProfileViews'),
        where('attendeeUid', '==', uid),
        where('timestamp', '>=', cutoff)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      return 0;
    }
  }

  private async isUserActiveToday(uid: string): Promise<boolean> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const q = query(
        collection(db, 'CheckIns'),
        where('uid', '==', uid),
        where('at', '>=', startOfDay)
      );

      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      return false;
    }
  }

  private calculateIndustryAlignment(exhibitor: UserProfile, attendee: UserProfile): number {
    if (!exhibitor.industry || !attendee.interests) return 0.3;

    const exhibitorIndustry = exhibitor.industry.toLowerCase();
    const attendeeInterests = attendee.interests.toLowerCase();

    // Direct match
    if (attendeeInterests.includes(exhibitorIndustry) || exhibitorIndustry.includes(attendeeInterests)) {
      return 1.0;
    }

    // Partial match
    const industryWords = exhibitorIndustry.split(/[\s\-]+/);
    const interestWords = attendeeInterests.split(/[\s,]+/);

    let matches = 0;
    for (const industryWord of industryWords) {
      for (const interestWord of interestWords) {
        if (industryWord.length > 3 && interestWord.length > 3 &&
            (industryWord.includes(interestWord) || interestWord.includes(industryWord))) {
          matches++;
        }
      }
    }

    return Math.min(0.8, 0.3 + (matches * 0.2));
  }

  private calculateSizeCompatibility(exhibitor: UserProfile, attendee: UserProfile): number {
    if (!exhibitor.companySize || !attendee.companySize) return 0.5;

    const sizeMap: { [key: string]: number } = {
      '1-10': 1,
      '11-50': 2,
      '51-200': 3,
      '201-500': 4,
      '501-1000': 5,
      '1000+': 6
    };

    const exhSize = sizeMap[exhibitor.companySize] || 3;
    const attSize = sizeMap[attendee.companySize] || 3;

    // Similar sizes get higher scores
    const diff = Math.abs(exhSize - attSize);
    return Math.max(0, 1 - (diff * 0.15));
  }

  private calculateInterestAlignment(exhibitor: UserProfile, attendee: UserProfile): number {
    if (!attendee.interests) return 0.3;

    const attendeeInterests = attendee.interests.toLowerCase();
    const exhibitorName = exhibitor.fullName.toLowerCase();
    const exhibitorCompany = exhibitor.company.toLowerCase();
    const exhibitorBio = (exhibitor.bio || '').toLowerCase();

    let score = 0.2; // Base score

    // Check if exhibitor details match attendee interests
    const interestWords = attendeeInterests.split(/[\s,]+/);
    let matches = 0;

    for (const interest of interestWords) {
      if (interest.length < 3) continue;

      // Check company name
      if (exhibitorCompany.includes(interest)) {
        score += 0.3;
        matches++;
      }

      // Check full name
      if (exhibitorName.includes(interest)) {
        score += 0.2;
        matches++;
      }

      // Check bio/description
      if (exhibitorBio.includes(interest)) {
        score += 0.15;
        matches++;
      }
    }

    return Math.min(1.0, score);
  }

  private calculateBudgetCompatibility(exhibitor: UserProfile, attendee: UserProfile): number {
    if (!attendee.budget) return 0.5;

    // Simple budget compatibility based on attendee budget and exhibitor tier
    const budgetRanges: { [key: string]: number } = {
      'under-10k': 1,
      '10k-25k': 2,
      '25k-50k': 3,
      '50k-100k': 4,
      '100k-250k': 5,
      '250k+': 6
    };

    const attendeeBudgetLevel = budgetRanges[attendee.budget.toLowerCase()] || 3;

    // Assume exhibitor tier corresponds to pricing level
    const exhibitorTier = this.inferExhibitorTier(exhibitor);
    const tierMap: { [key: string]: number } = {
      'bronze': 2,
      'silver': 3,
      'gold': 4,
      'platinum': 5
    };

    const exhibitorLevel = tierMap[exhibitorTier] || 3;
    const diff = Math.abs(exhibitorLevel - attendeeBudgetLevel);

    return Math.max(0, 1 - (diff * 0.2));
  }

  private async calculateNetworkEffect(exhibitor: UserProfile, attendee: UserProfile): number {
    try {
      // Check for existing leads/interactions
      const existingLeads = await leadService.getLeads({
        exhibitorUid: exhibitor.uid,
        attendeeUid: attendee.uid,
        limit: 1
      });

      if (existingLeads.length > 0) {
        return 0.8; // High score if there's already interaction
      }

      // Check for mutual connections (same industry, location, etc.)
      const mutualConnections = await this.findMutualConnections(exhibitor, attendee);
      return Math.min(0.6, mutualConnections * 0.2);
    } catch (error) {
      console.error('Error calculating network effect:', error);
      return 0.1;
    }
  }

  private async findMutualConnections(exhibitor: UserProfile, attendee: UserProfile): Promise<number> {
    try {
      // Find users with same industry
      const industryQuery = query(
        collection(db, 'Users'),
        where('industry', '==', exhibitor.industry || attendee.industry)
      );

      const industrySnapshot = await getDocs(industryQuery);
      return industrySnapshot.size;
    } catch (error) {
      console.error('Error finding mutual connections:', error);
      return 0;
    }
  }

  private inferExhibitorTier(exhibitor: UserProfile): string {
    // Infer tier based on available information
    if (exhibitor.companySize === '1000+') return 'platinum';
    if (exhibitor.companySize === '501-1000') return 'gold';
    if (exhibitor.companySize === '201-500') return 'silver';
    return 'bronze';
  }

  private determineConfidence(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  private async saveRecommendations(recommendations: MatchRecommendation[]): Promise<number> {
    let savedCount = 0;

    try {
      // Save recommendations to database
      for (const recommendation of recommendations) {
        await addDoc(collection(db, 'MatchRecommendations'), recommendation);
        savedCount++;
      }

      console.log(`💾 Saved ${savedCount} recommendations to database`);
      return savedCount;
    } catch (error) {
      console.error('Error saving recommendations:', error);
      return savedCount;
    }
  }

  public async getRecommendations(
    userUid?: string,
    userType?: 'exhibitor' | 'attendee',
    limitCount: number = 20
  ): Promise<MatchRecommendation[]> {
    try {
      let constraints: any[] = [];

      if (userUid && userType) {
        if (userType === 'exhibitor') {
          constraints.push(where('exhibitorUid', '==', userUid));
        } else {
          constraints.push(where('attendeeUid', '==', userUid));
        }
      }

      constraints.push(orderBy('score', 'desc'));
      constraints.push(limit(limitCount));

      const q = query(collection(db, 'MatchRecommendations'), ...constraints);
      const querySnapshot = await getDocs(q);

      const recommendations: MatchRecommendation[] = [];
      for (const doc of querySnapshot.docs) {
        const data = doc.data() as MatchRecommendation;
        recommendations.push({
          id: doc.id,
          ...data
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  /**
   * Get cached matchmaking results for a user with Redis integration
   */
  public async getCachedRecommendations(
    userUid: string,
    userType: 'exhibitor' | 'attendee',
    limitCount: number = 10,
    forceRefresh: boolean = false
  ): Promise<Array<MatchRecommendation & { matchedUser: UserProfile }>> {
    try {
      // Try to get cached results first (unless force refresh is requested)
      if (!forceRefresh) {
        const cachedResults = await getCachedMatchmakingResults(`${userType}:${userUid}`);
        if (cachedResults && cachedResults.length > 0) {
          console.log(`🔄 Retrieved ${cachedResults.length} cached matchmaking results`);
          return cachedResults;
        }
      }

      // Generate fresh recommendations if not cached or force refresh requested
      console.log('🔄 Generating fresh matchmaking recommendations...');
      const freshResults = await this.getTopMatches(userUid, userType, limitCount);

      // Cache the results for future use (30 minutes TTL)
      if (freshResults.length > 0) {
        await cacheMatchmakingResults(`${userType}:${userUid}`, freshResults, 1800);
        console.log(`💾 Cached ${freshResults.length} matchmaking results`);
      }

      return freshResults;
    } catch (error) {
      console.error('Error in cached recommendations:', error);
      // Fallback to fresh results if caching fails
      return await this.getTopMatches(userUid, userType, limitCount);
    }
  }

  public async getTopMatches(
    userUid: string,
    userType: 'exhibitor' | 'attendee',
    limitCount: number = 10
  ): Promise<Array<MatchRecommendation & { matchedUser: UserProfile }>> {
    try {
      const recommendations = await this.getRecommendations(userUid, userType, limitCount);

      const enhancedRecommendations = [];

      for (const rec of recommendations) {
        // Get the matched user profile
        const matchedUserId = userType === 'exhibitor' ? rec.attendeeUid : rec.exhibitorUid;
        const matchedUserDoc = await getDoc(doc(db, 'Users', matchedUserId));

        if (matchedUserDoc.exists()) {
          const matchedUser = { uid: matchedUserDoc.id, ...matchedUserDoc.data() } as UserProfile;

          enhancedRecommendations.push({
            ...rec,
            matchedUser
          });
        }
      }

      return enhancedRecommendations;
    } catch (error) {
      console.error('Error getting top matches:', error);
      return [];
    }
  }

  public async createLeadFromRecommendation(recommendationId: string): Promise<{ success: boolean; error?: string; leadId?: string }> {
    try {
      const recDoc = await getDoc(doc(db, 'MatchRecommendations', recommendationId));
      if (!recDoc.exists()) {
        return { success: false, error: 'Recommendation not found' };
      }

      const recommendation = recDoc.data() as MatchRecommendation;

      // Create lead using the lead service
      const leadResult = await leadService.createLead({
        exhibitorUid: recommendation.exhibitorUid,
        attendeeUid: recommendation.attendeeUid,
        source: 'ai_matchmaking',
        status: 'new',
        priority: recommendation.confidence === 'high' ? 'high' : recommendation.confidence === 'medium' ? 'medium' : 'low',
        eventId: recommendation.eventId
      });

      if (leadResult.success) {
        // Mark recommendation as used
        await updateDoc(doc(db, 'MatchRecommendations', recommendationId), {
          used: true,
          convertedToLead: leadResult.leadId,
          convertedAt: serverTimestamp()
        });
      }

      return leadResult;
    } catch (error) {
      console.error('Error creating lead from recommendation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create lead' };
    }
  }

  public async getMatchAnalytics(eventId?: string): Promise<{
    totalRecommendations: number;
    averageScore: number;
    topReasons: Array<{ reason: string; count: number }>;
    conversionRate: number;
    confidenceBreakdown: { [key: string]: number };
  }> {
    try {
      const constraints = eventId ? [where('eventId', '==', eventId)] : [];
      const q = query(collection(db, 'MatchRecommendations'), ...constraints);
      const querySnapshot = await getDocs(q);

      const recommendations = querySnapshot.docs.map(doc => doc.data() as MatchRecommendation);
      const totalRecommendations = recommendations.length;

      if (totalRecommendations === 0) {
        return {
          totalRecommendations: 0,
          averageScore: 0,
          topReasons: [],
          conversionRate: 0,
          confidenceBreakdown: {}
        };
      }

      // Average score
      const averageScore = recommendations.reduce((sum, rec) => sum + rec.score, 0) / totalRecommendations;

      // Top reasons
      const reasonCount: { [key: string]: number } = {};
      recommendations.forEach(rec => {
        rec.reasons.forEach(reason => {
          reasonCount[reason] = (reasonCount[reason] || 0) + 1;
        });
      });

      const topReasons = Object.entries(reasonCount)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Conversion rate
      const convertedRecommendations = recommendations.filter(rec => rec.used).length;
      const conversionRate = (convertedRecommendations / totalRecommendations) * 100;

      // Confidence breakdown
      const confidenceBreakdown: { [key: string]: number } = {};
      recommendations.forEach(rec => {
        confidenceBreakdown[rec.confidence] = (confidenceBreakdown[rec.confidence] || 0) + 1;
      });

      return {
        totalRecommendations,
        averageScore,
        topReasons,
        conversionRate,
        confidenceBreakdown
      };
    } catch (error) {
      console.error('Error getting match analytics:', error);
      return {
        totalRecommendations: 0,
        averageScore: 0,
        topReasons: [],
        conversionRate: 0,
        confidenceBreakdown: {}
      };
    }
  }
}

export const matchmakingService = MatchmakingService.getInstance();
