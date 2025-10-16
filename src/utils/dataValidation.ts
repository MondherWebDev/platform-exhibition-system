import { UserProfile } from './authService';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EventData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  capacity?: number;
  category: string;
  tags?: string[];
}

export interface LeadData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  notes?: string;
  source: string;
  eventId?: string;
}

class DataValidationService {
  private static instance: DataValidationService;

  private constructor() {}

  public static getInstance(): DataValidationService {
    if (!DataValidationService.instance) {
      DataValidationService.instance = new DataValidationService();
    }
    return DataValidationService.instance;
  }

  public validateUserProfile(profile: Partial<UserProfile>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!profile.email || !this.isValidEmail(profile.email)) {
      errors.push('Valid email address is required');
    }

    if (!profile.fullName || profile.fullName.trim().length < 2) {
      errors.push('Full name must be at least 2 characters long');
    }

    if (!profile.category) {
      errors.push('User category is required');
    }

    // Category-specific validation
    if (profile.category === 'Exhibitor') {
      if (!profile.company || profile.company.trim().length < 2) {
        errors.push('Company name is required for exhibitors');
      }
      if (!profile.boothId) {
        warnings.push('Booth ID is recommended for exhibitors');
      }
    }

    if (profile.category === 'Speaker') {
      if (!profile.bio || profile.bio.trim().length < 10) {
        errors.push('Speaker biography is required (minimum 10 characters)');
      }
      if (!profile.position) {
        warnings.push('Speaker position/title is recommended');
      }
    }

    if (profile.category === 'Hosted Buyer') {
      if (!profile.company || profile.company.trim().length < 2) {
        errors.push('Company name is required for hosted buyers');
      }
      if (!profile.budget) {
        warnings.push('Budget range is recommended for hosted buyers');
      }
    }

    // Optional fields validation
    if (profile.contactPhone && !this.isValidPhone(profile.contactPhone)) {
      errors.push('Please enter a valid phone number');
    }

    if (profile.website && !this.isValidUrl(profile.website)) {
      errors.push('Please enter a valid website URL');
    }

    if (profile.linkedin && !this.isValidUrl(profile.linkedin)) {
      errors.push('Please enter a valid LinkedIn URL');
    }

    if (profile.twitter && !this.isValidUrl(profile.twitter)) {
      errors.push('Please enter a valid Twitter URL');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  public validateEventData(eventData: Partial<EventData>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!eventData.title || eventData.title.trim().length < 3) {
      errors.push('Event title must be at least 3 characters long');
    }

    if (!eventData.description || eventData.description.trim().length < 10) {
      errors.push('Event description must be at least 10 characters long');
    }

    if (!eventData.startDate) {
      errors.push('Start date is required');
    }

    if (!eventData.endDate) {
      errors.push('End date is required');
    }

    if (!eventData.location || eventData.location.trim().length < 3) {
      errors.push('Event location is required');
    }

    if (!eventData.category) {
      errors.push('Event category is required');
    }

    // Date validation
    if (eventData.startDate && eventData.endDate) {
      const startDate = new Date(eventData.startDate);
      const endDate = new Date(eventData.endDate);

      if (startDate >= endDate) {
        errors.push('End date must be after start date');
      }

      if (startDate < new Date()) {
        warnings.push('Event start date is in the past');
      }
    }

    // Capacity validation
    if (eventData.capacity !== undefined) {
      if (eventData.capacity < 1) {
        errors.push('Event capacity must be at least 1');
      } else if (eventData.capacity > 100000) {
        warnings.push('Very large capacity - please verify this number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  public validateLeadData(leadData: Partial<LeadData>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!leadData.name || leadData.name.trim().length < 2) {
      errors.push('Lead name must be at least 2 characters long');
    }

    if (!leadData.email || !this.isValidEmail(leadData.email)) {
      errors.push('Valid email address is required');
    }

    if (!leadData.source) {
      errors.push('Lead source is required');
    }

    // Optional fields validation
    if (leadData.phone && !this.isValidPhone(leadData.phone)) {
      errors.push('Please enter a valid phone number');
    }

    if (leadData.company && leadData.company.trim().length < 2) {
      warnings.push('Company name seems too short');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  public sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  public sanitizeHtml(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    // Basic phone validation - allows various formats
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanPhone) && cleanPhone.length >= 10;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  public checkForDuplicates(dataArray: any[], field: string): any[] {
    const seen = new Set();
    const duplicates = [];

    for (const item of dataArray) {
      const value = item[field];
      if (seen.has(value)) {
        duplicates.push(item);
      } else {
        seen.add(value);
      }
    }

    return duplicates;
  }

  public validateFileUpload(file: File, maxSizeMB: number = 5, allowedTypes: string[] = []): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Size validation
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      errors.push(`File size must be less than ${maxSizeMB}MB`);
    }

    // Type validation
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
    }

    // Image-specific validation
    if (file.type.startsWith('image/')) {
      if (file.size > 2 * 1024 * 1024) {
        warnings.push('Large image file may affect performance');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export const dataValidation = DataValidationService.getInstance();
