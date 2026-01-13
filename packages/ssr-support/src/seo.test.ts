import { describe, it, expect, beforeEach } from 'vitest';
import { SEOGenerator } from './seo';
import { SEOData } from './types';

describe('SEOGenerator', () => {
  let seo: SEOGenerator;

  beforeEach(() => {
    seo = new SEOGenerator();
  });

  const createMinimalSEOData = (overrides: Partial<SEOData> = {}): SEOData => ({
    title: 'Test Page',
    description: 'Test description',
    keywords: ['test', 'page'],
    canonical: 'https://example.com/test',
    openGraph: {
      title: 'OG Title',
      description: 'OG Description',
      image: 'https://example.com/og.jpg',
      url: 'https://example.com/test',
      type: 'website',
      siteName: 'Test Site',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Twitter Title',
      description: 'Twitter Description',
      image: 'https://example.com/twitter.jpg',
      site: '@testsite',
      creator: '@testcreator',
    },
    structuredData: [],
    ...overrides,
  });

  describe('generateTags', () => {
    it('should generate basic meta tags', () => {
      const seoData = createMinimalSEOData();
      const tags = seo.generateTags(seoData);

      expect(tags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'title', content: 'Test Page' }),
          expect.objectContaining({ name: 'description', content: 'Test description' }),
          expect.objectContaining({ name: 'keywords', content: 'test, page' }),
        ])
      );
    });

    it('should generate Open Graph tags', () => {
      const seoData = createMinimalSEOData();
      const tags = seo.generateTags(seoData);

      expect(tags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: 'og:title', content: 'OG Title' }),
          expect.objectContaining({ property: 'og:description', content: 'OG Description' }),
          expect.objectContaining({ property: 'og:image', content: 'https://example.com/og.jpg' }),
          expect.objectContaining({ property: 'og:url', content: 'https://example.com/test' }),
          expect.objectContaining({ property: 'og:type', content: 'website' }),
          expect.objectContaining({ property: 'og:site_name', content: 'Test Site' }),
        ])
      );
    });

    it('should generate Twitter Card tags', () => {
      const seoData = createMinimalSEOData();
      const tags = seo.generateTags(seoData);

      expect(tags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'twitter:card', content: 'summary_large_image' }),
          expect.objectContaining({ name: 'twitter:title', content: 'Twitter Title' }),
          expect.objectContaining({ name: 'twitter:description', content: 'Twitter Description' }),
          expect.objectContaining({
            name: 'twitter:image',
            content: 'https://example.com/twitter.jpg',
          }),
          expect.objectContaining({ name: 'twitter:site', content: '@testsite' }),
          expect.objectContaining({ name: 'twitter:creator', content: '@testcreator' }),
        ])
      );
    });

    it('should include robots and viewport tags', () => {
      const seoData = createMinimalSEOData();
      const tags = seo.generateTags(seoData);

      expect(tags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'robots', content: 'index, follow' }),
          expect.objectContaining({
            name: 'viewport',
            content: 'width=device-width, initial-scale=1.0',
          }),
        ])
      );
    });

    it('should handle empty keywords', () => {
      const seoData = createMinimalSEOData({ keywords: [] });
      const tags = seo.generateTags(seoData);

      const keywordTag = tags.find(t => t.name === 'keywords');
      expect(keywordTag).toBeUndefined();
    });

    it('should handle missing optional Open Graph fields', () => {
      const seoData = createMinimalSEOData({
        openGraph: {
          title: 'OG Title',
          description: '',
          image: '',
          url: '',
          type: '',
          siteName: '',
        },
      });
      const tags = seo.generateTags(seoData);

      // Should still have og:title
      expect(tags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: 'og:title', content: 'OG Title' }),
        ])
      );

      // Should not have empty OG fields
      const ogDescription = tags.find(t => t.property === 'og:description');
      expect(ogDescription).toBeUndefined();
    });
  });

  describe('generateStructuredData', () => {
    it('should generate JSON-LD script tags', () => {
      const structuredData = [
        {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Test Page',
        },
      ];

      const result = seo.generateStructuredData(structuredData);

      expect(result).toContain('<script type="application/ld+json">');
      expect(result).toContain('"@context": "https://schema.org"');
      expect(result).toContain('"@type": "WebPage"');
      expect(result).toContain('"name": "Test Page"');
    });

    it('should handle multiple structured data items', () => {
      const structuredData = [
        { '@type': 'WebPage', name: 'Page 1' },
        { '@type': 'Article', headline: 'Article 1' },
      ];

      const result = seo.generateStructuredData(structuredData);

      // Should have two script tags
      const scriptCount = (result.match(/<script type="application\/ld\+json">/g) || []).length;
      expect(scriptCount).toBe(2);
    });

    it('should return empty string for empty array', () => {
      const result = seo.generateStructuredData([]);
      expect(result).toBe('');
    });

    it('should return empty string for undefined', () => {
      const result = seo.generateStructuredData(undefined);
      expect(result).toBe('');
    });
  });

  describe('generateCanonical', () => {
    it('should generate canonical link', () => {
      const result = seo.generateCanonical('https://example.com/page');

      expect(result).toEqual({
        rel: 'canonical',
        href: 'https://example.com/page',
      });
    });
  });

  describe('generateAlternateLinks', () => {
    it('should generate hreflang alternate links', () => {
      const alternatives = [
        { hreflang: 'en', href: 'https://example.com/en/page' },
        { hreflang: 'es', href: 'https://example.com/es/page' },
        { hreflang: 'x-default', href: 'https://example.com/page' },
      ];

      const result = seo.generateAlternateLinks(alternatives);

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        { rel: 'alternate', hreflang: 'en', href: 'https://example.com/en/page' },
        { rel: 'alternate', hreflang: 'es', href: 'https://example.com/es/page' },
        { rel: 'alternate', hreflang: 'x-default', href: 'https://example.com/page' },
      ]);
    });

    it('should handle empty alternatives', () => {
      const result = seo.generateAlternateLinks([]);
      expect(result).toEqual([]);
    });
  });

  describe('generateBreadcrumbSchema', () => {
    it('should generate breadcrumb structured data', () => {
      const breadcrumbs = [
        { name: 'Home', url: 'https://example.com/' },
        { name: 'Products', url: 'https://example.com/products' },
        { name: 'Widget' },
      ];

      const result = seo.generateBreadcrumbSchema(breadcrumbs);

      expect(result['@context']).toBe('https://schema.org');
      expect(result['@type']).toBe('BreadcrumbList');
      expect(result.itemListElement).toHaveLength(3);
      expect(result.itemListElement[0]).toEqual({
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://example.com/',
      });
      expect(result.itemListElement[2]).toEqual({
        '@type': 'ListItem',
        position: 3,
        name: 'Widget',
      });
    });

    it('should handle single breadcrumb', () => {
      const result = seo.generateBreadcrumbSchema([{ name: 'Home' }]);

      expect(result.itemListElement).toHaveLength(1);
      expect(result.itemListElement[0].position).toBe(1);
    });
  });

  describe('generateArticleSchema', () => {
    it('should generate article structured data', () => {
      const article = {
        headline: 'Test Article',
        author: 'John Doe',
        datePublished: '2024-01-15',
        publisher: {
          name: 'Test Publisher',
        },
      };

      const result = seo.generateArticleSchema(article);

      expect(result['@context']).toBe('https://schema.org');
      expect(result['@type']).toBe('Article');
      expect(result.headline).toBe('Test Article');
      expect(result.author).toEqual({
        '@type': 'Person',
        name: 'John Doe',
      });
      expect(result.datePublished).toBe('2024-01-15');
      expect(result.publisher).toEqual({
        '@type': 'Organization',
        name: 'Test Publisher',
      });
    });

    it('should include optional fields when provided', () => {
      const article = {
        headline: 'Test Article',
        author: 'John Doe',
        datePublished: '2024-01-15',
        dateModified: '2024-01-20',
        image: 'https://example.com/article.jpg',
        publisher: {
          name: 'Test Publisher',
          logo: 'https://example.com/logo.png',
        },
      };

      const result = seo.generateArticleSchema(article);

      expect(result.dateModified).toBe('2024-01-20');
      expect(result.image).toBe('https://example.com/article.jpg');
      expect(result.publisher.logo).toEqual({
        '@type': 'ImageObject',
        url: 'https://example.com/logo.png',
      });
    });
  });

  describe('generateOrganizationSchema', () => {
    it('should generate organization structured data', () => {
      const org = {
        name: 'Test Company',
        url: 'https://example.com',
      };

      const result = seo.generateOrganizationSchema(org);

      expect(result['@context']).toBe('https://schema.org');
      expect(result['@type']).toBe('Organization');
      expect(result.name).toBe('Test Company');
      expect(result.url).toBe('https://example.com');
    });

    it('should include logo when provided', () => {
      const org = {
        name: 'Test Company',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png',
      };

      const result = seo.generateOrganizationSchema(org);

      expect(result.logo).toEqual({
        '@type': 'ImageObject',
        url: 'https://example.com/logo.png',
      });
    });

    it('should include contact points when provided', () => {
      const org = {
        name: 'Test Company',
        url: 'https://example.com',
        contactPoints: [
          { telephone: '+1-800-555-1234', contactType: 'customer service' },
          { telephone: '+1-800-555-5678', contactType: 'technical support' },
        ],
      };

      const result = seo.generateOrganizationSchema(org);

      expect(result.contactPoint).toHaveLength(2);
      expect(result.contactPoint[0]).toEqual({
        '@type': 'ContactPoint',
        telephone: '+1-800-555-1234',
        contactType: 'customer service',
      });
    });

    it('should include address when provided', () => {
      const org = {
        name: 'Test Company',
        url: 'https://example.com',
        address: {
          streetAddress: '123 Main St',
          addressLocality: 'San Francisco',
          addressRegion: 'CA',
          postalCode: '94102',
          addressCountry: 'US',
        },
      };

      const result = seo.generateOrganizationSchema(org);

      expect(result.address).toEqual({
        '@type': 'PostalAddress',
        streetAddress: '123 Main St',
        addressLocality: 'San Francisco',
        addressRegion: 'CA',
        postalCode: '94102',
        addressCountry: 'US',
      });
    });
  });

  describe('generateProductSchema', () => {
    it('should generate product structured data', () => {
      const product = {
        name: 'Test Product',
        description: 'A great product',
        image: 'https://example.com/product.jpg',
        brand: 'Test Brand',
        offers: {
          price: '99.99',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          seller: 'Test Seller',
        },
      };

      const result = seo.generateProductSchema(product);

      expect(result['@context']).toBe('https://schema.org');
      expect(result['@type']).toBe('Product');
      expect(result.name).toBe('Test Product');
      expect(result.description).toBe('A great product');
      expect(result.image).toBe('https://example.com/product.jpg');
      expect(result.brand).toEqual({
        '@type': 'Brand',
        name: 'Test Brand',
      });
      expect(result.offers).toEqual({
        '@type': 'Offer',
        price: '99.99',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        seller: {
          '@type': 'Organization',
          name: 'Test Seller',
        },
      });
    });

    it('should include aggregate rating when provided', () => {
      const product = {
        name: 'Test Product',
        description: 'A great product',
        image: 'https://example.com/product.jpg',
        brand: 'Test Brand',
        offers: {
          price: '99.99',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          seller: 'Test Seller',
        },
        aggregateRating: {
          ratingValue: 4.5,
          reviewCount: 100,
        },
      };

      const result = seo.generateProductSchema(product);

      expect(result.aggregateRating).toEqual({
        '@type': 'AggregateRating',
        ratingValue: 4.5,
        reviewCount: 100,
      });
    });
  });

  describe('validateSEOData', () => {
    it('should validate complete SEO data', () => {
      // Title: 30-60 chars, Description: 120-160 chars for no warnings/suggestions
      const seoData = createMinimalSEOData({
        title: 'A well-optimized page title for SEO use', // 40 chars
        description:
          'This is a comprehensive meta description that provides users and search engines with a clear understanding of the page content here.', // 133 chars
        keywords: ['seo', 'optimization', 'search'],
        structuredData: [{ '@type': 'WebPage' }],
      });

      const result = seo.validateSEOData(seoData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about missing title', () => {
      const seoData = createMinimalSEOData({
        title: '',
      });

      const result = seo.validateSEOData(seoData);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('Missing page title');
    });

    it('should warn about title too long', () => {
      const seoData = createMinimalSEOData({
        title:
          'This is an extremely long page title that exceeds the recommended limit of sixty characters and will likely be truncated',
      });

      const result = seo.validateSEOData(seoData);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain(
        'Title is too long (over 60 characters), may be truncated in search results'
      );
    });

    it('should suggest longer title', () => {
      const seoData = createMinimalSEOData({
        title: 'Short title',
      });

      const result = seo.validateSEOData(seoData);

      expect(result.suggestions).toContain(
        'Title is quite short, consider making it more descriptive'
      );
    });

    it('should warn about missing description', () => {
      const seoData = createMinimalSEOData({
        description: '',
      });

      const result = seo.validateSEOData(seoData);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('Missing meta description');
    });

    it('should warn about description too long', () => {
      const seoData = createMinimalSEOData({
        description:
          'This is an extremely long meta description that exceeds the recommended limit of one hundred and sixty characters and will likely be truncated in search engine results pages which is not ideal for user experience.',
      });

      const result = seo.validateSEOData(seoData);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain(
        'Description is too long (over 160 characters), may be truncated'
      );
    });

    it('should suggest longer description', () => {
      const seoData = createMinimalSEOData({
        description: 'Short description',
      });

      const result = seo.validateSEOData(seoData);

      expect(result.suggestions).toContain('Description is short, consider adding more detail');
    });

    it('should suggest adding keywords', () => {
      const seoData = createMinimalSEOData({
        keywords: [],
      });

      const result = seo.validateSEOData(seoData);

      expect(result.suggestions).toContain('Consider adding relevant keywords');
    });

    it('should suggest fewer keywords when too many', () => {
      const seoData = createMinimalSEOData({
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9', 'k10', 'k11'],
      });

      const result = seo.validateSEOData(seoData);

      expect(result.suggestions).toContain('Too many keywords, focus on the most relevant ones');
    });

    it('should suggest adding Open Graph metadata', () => {
      const seoData = createMinimalSEOData({
        openGraph: {
          title: '',
          description: '',
          image: '',
          url: '',
          type: '',
          siteName: '',
        },
      });

      const result = seo.validateSEOData(seoData);

      expect(result.suggestions).toContain('Add Open Graph title for better social media sharing');
      expect(result.suggestions).toContain('Add Open Graph description for social media');
      expect(result.suggestions).toContain('Add Open Graph image for social media preview');
    });

    it('should suggest adding structured data', () => {
      const seoData = createMinimalSEOData({
        structuredData: [],
      });

      const result = seo.validateSEOData(seoData);

      expect(result.suggestions).toContain(
        'Consider adding structured data for better search engine understanding'
      );
    });
  });
});
