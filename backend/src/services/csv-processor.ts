import { parse } from 'csv-parse/sync';
import type { Lead } from '../types/index.js';

interface CSVRow {
  [key: string]: string;
}

class CSVProcessorService {
  /**
   * Parse CSV file and extract lead data
   */
  async extractLeads(fileBuffer: Buffer): Promise<Lead[]> {
    try {
      const records = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true // Handle UTF-8 BOM
      }) as CSVRow[];

      console.log(`Parsed ${records.length} records from CSV`);

      // Map CSV columns to Lead format
      const leads = records.map(row => this.normalizeLeadData(row));

      // Remove duplicates by email
      const deduplicatedLeads = this.removeDuplicates(leads);

      // Filter leads with required fields
      const validLeads = deduplicatedLeads.filter(lead => this.validateLead(lead));

      console.log(`Extracted ${validLeads.length} valid leads after deduplication and validation`);

      return validLeads;
    } catch (error) {
      console.error('CSV parsing error:', error);
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Normalize CSV row data to Lead format
   * Handles various column name formats
   */
  private normalizeLeadData(row: CSVRow): Lead {
    const getField = (...possibleKeys: string[]): string => {
      for (const key of possibleKeys) {
        const value = row[key] || row[key.toLowerCase()] || row[key.toUpperCase()];
        if (value && value.trim()) {
          return value.trim();
        }
      }
      return '';
    };

    return {
      first_name: getField('First Name', 'first_name', 'firstName', 'fname'),
      last_name: getField('Last Name', 'last_name', 'lastName', 'lname'),
      email: getField('Email', 'email', 'personal_emails', 'work_email'),
      company: getField('Company Name', 'company', 'Company', 'organization'),
      company_url: getField('Company Website', 'company_url', 'website'),
      linkedin_url: getField('LinkedIn', 'linkedin_url', 'LinkedIn URL'),
      job_title: getField('Title', 'job_title', 'Job Title', 'position'),
      company_industry: getField('Industry', 'company_industry'),
      headline: getField('Headline', 'headline'),
      company_headcount: getField('Employees Count', 'Employee Count', 'company_headcount'),
      keywords: getField('Keywords', 'keywords'),
      company_annual_revenue: getField('Company Annual Revenue Clean', 'company_annual_revenue'),
      company_seo_description: getField('Company SEO Description', 'company_seo_description'),
      company_short_description: getField('Company Short Description', 'company_short_description'),
      company_linkedin_url: getField('Company Linkedin', 'Company LinkedIn', 'company_linkedin_url'),
      company_total_funding: getField('Company Total Funding Clean', 'company_total_funding'),
      company_technologies: getField('Company Technologies', 'company_technologies'),
      email_domain_catchall: getField('Email Domain Catchall', 'email_domain_catchall'),
      twitter_url: getField('Twitter URL', 'twitter_url'),
      facebook_url: getField('Facebook URL', 'facebook_url'),
      person_id: getField('Person ID', 'person_id'),
      company_id: getField('Company ID', 'company_id'),
      company_phone_number: getField('Company Phone Number', 'company_phone_number'),
      company_twitter: getField('Company Twitter', 'company_twitter'),
      company_facebook: getField('Company Facebook', 'company_facebook'),
      company_market_cap: getField('Company Market Cap', 'company_market_cap'),
      company_founded_year: getField('Company Founded Year', 'company_founded_year'),
      company_domain: getField('Company Domain', 'company_domain'),
      company_raw_address: getField('Company Raw Address', 'company_raw_address'),
      company_street_address: getField('Company Street Address', 'company_street_address'),
      company_city: getField('Company City', 'company_city'),
      company_state: getField('Company State', 'company_state'),
      company_country: getField('Company Country', 'company_country'),
      company_postal_code: getField('Company Postal Code', 'company_postal_code'),
      // Legacy fields
      location: getField('Location', 'location'),
      phone_number: getField('Phone Number', 'phone_number'),
      linkedin_post: getField('LinkedIn Post', 'linkedin_post'),
      creator_name: getField('Creator Name', 'creator_name')
    };
  }

  /**
   * Remove duplicate leads based on email
   */
  private removeDuplicates(leads: Lead[]): Lead[] {
    const seen = new Set<string>();
    const unique: Lead[] = [];

    for (const lead of leads) {
      const email = lead.email.toLowerCase().trim();
      if (email && !seen.has(email)) {
        seen.add(email);
        unique.push(lead);
      }
    }

    const duplicateCount = leads.length - unique.length;
    if (duplicateCount > 0) {
      console.log(`Removed ${duplicateCount} duplicate leads`);
    }

    return unique;
  }

  /**
   * Validate that lead has required fields
   */
  private validateLead(lead: Lead): boolean {
    // Must have email at minimum
    const hasEmail = lead.email && lead.email.includes('@');

    if (!hasEmail) {
      console.warn('Lead missing email:', lead);
      return false;
    }

    // If no company provided, try to extract from email domain
    if (!lead.company || lead.company.length === 0) {
      const domain = lead.email.split('@')[1];
      if (domain) {
        // Remove common TLDs and use domain as company name
        const companyName = domain.split('.')[0];
        lead.company = companyName.charAt(0).toUpperCase() + companyName.slice(1);
        lead.company_url = `https://${domain}`;
        console.log(`Extracted company from email: ${lead.company}`);
      } else {
        console.warn('Lead missing company and could not extract from email:', lead.email);
        return false;
      }
    }

    return true;
  }

  /**
   * Apply demo mode limiting if enabled
   */
  applyDemoLimit(leads: Lead[], isDemo: boolean, limit: number = 20): Lead[] {
    if (isDemo && leads.length > limit) {
      console.log(`Demo mode: Limiting to ${limit} leads`);
      return leads.slice(0, limit);
    }
    return leads;
  }

  /**
   * Convert leads to CSV format for export
   */
  leadsToCSV(leads: Lead[]): string {
    if (leads.length === 0) {
      return 'No leads to export';
    }

    // Get all unique keys from all leads
    const headers = Object.keys(leads[0]);
    const csvHeaders = headers.join(',');

    const csvRows = leads.map(lead => {
      return headers.map(header => {
        const value = lead[header as keyof Lead] || '';
        // Escape commas and quotes
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }
}

export const csvProcessorService = new CSVProcessorService();
