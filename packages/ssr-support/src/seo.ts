import { SEOData } from './types';

/**
 * SEO metadata generator for server-side rendering
 */
export class SEOGenerator {
  /**
   * Generate meta tags from SEO data
   */
  generateTags(seoData: SEOData): Array<{ name?: string; property?: string; content: string }> {
    const tags: Array<{ name?: string; property?: string; content: string }> = [];

    // Basic meta tags
    if (seoData.title) {
      tags.push({ name: 'title', content: seoData.title });
    }

    if (seoData.description) {
      tags.push({ name: 'description', content: seoData.description });
    }

    if (seoData.keywords && seoData.keywords.length > 0) {
      tags.push({ name: 'keywords', content: seoData.keywords.join(', ') });
    }

    // Open Graph tags
    if (seoData.openGraph.title) {
      tags.push({ property: 'og:title', content: seoData.openGraph.title });
    }

    if (seoData.openGraph.description) {
      tags.push({ property: 'og:description', content: seoData.openGraph.description });
    }

    if (seoData.openGraph.image) {
      tags.push({ property: 'og:image', content: seoData.openGraph.image });
    }

    if (seoData.openGraph.url) {
      tags.push({ property: 'og:url', content: seoData.openGraph.url });
    }

    if (seoData.openGraph.type) {
      tags.push({ property: 'og:type', content: seoData.openGraph.type });
    }

    if (seoData.openGraph.siteName) {
      tags.push({ property: 'og:site_name', content: seoData.openGraph.siteName });
    }

    // Twitter Card tags
    tags.push({ name: 'twitter:card', content: seoData.twitter.card });

    if (seoData.twitter.title) {
      tags.push({ name: 'twitter:title', content: seoData.twitter.title });
    }

    if (seoData.twitter.description) {
      tags.push({ name: 'twitter:description', content: seoData.twitter.description });
    }

    if (seoData.twitter.image) {
      tags.push({ name: 'twitter:image', content: seoData.twitter.image });
    }

    if (seoData.twitter.site) {
      tags.push({ name: 'twitter:site', content: seoData.twitter.site });
    }

    if (seoData.twitter.creator) {
      tags.push({ name: 'twitter:creator', content: seoData.twitter.creator });
    }

    // Additional SEO tags
    tags.push({ name: 'robots', content: 'index, follow' });
    tags.push({ name: 'viewport', content: 'width=device-width, initial-scale=1.0' });

    return tags;
  }

  /**
   * Generate structured data JSON-LD script
   */
  generateStructuredData(structuredData: SEOData['structuredData']): string {
    if (!structuredData || structuredData.length === 0) {
      return '';
    }

    const scripts = structuredData.map(data => JSON.stringify(data, null, 2));

    return scripts
      .map(script => `<script type="application/ld+json">${script}</script>`)
      .join('\n');
  }

  /**
   * Generate canonical link tag
   */
  generateCanonical(url: string): { rel: string; href: string } {
    return {
      rel: 'canonical',
      href: url,
    };
  }

  /**
   * Generate alternate language links
   */
  generateAlternateLinks(
    alternatives: Array<{ hreflang: string; href: string }>
  ): Array<{ rel: string; hreflang: string; href: string }> {
    return alternatives.map(alt => ({
      rel: 'alternate',
      hreflang: alt.hreflang,
      href: alt.href,
    }));
  }

  /**
   * Generate breadcrumb structured data
   */
  generateBreadcrumbSchema(
    breadcrumbs: Array<{ name: string; url?: string }>
  ): Record<string, any> {
    const itemListElements = breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(crumb.url && { item: crumb.url }),
    }));

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: itemListElements,
    };
  }

  /**
   * Generate article structured data
   */
  generateArticleSchema(article: {
    headline: string;
    author: string;
    datePublished: string;
    dateModified?: string;
    image?: string;
    publisher: {
      name: string;
      logo?: string;
    };
  }): Record<string, any> {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.headline,
      author: {
        '@type': 'Person',
        name: article.author,
      },
      datePublished: article.datePublished,
      ...(article.dateModified && { dateModified: article.dateModified }),
      ...(article.image && { image: article.image }),
      publisher: {
        '@type': 'Organization',
        name: article.publisher.name,
        ...(article.publisher.logo && {
          logo: {
            '@type': 'ImageObject',
            url: article.publisher.logo,
          },
        }),
      },
    };
  }

  /**
   * Generate organization structured data
   */
  generateOrganizationSchema(organization: {
    name: string;
    url: string;
    logo?: string;
    contactPoints?: Array<{
      telephone: string;
      contactType: string;
    }>;
    address?: {
      streetAddress: string;
      addressLocality: string;
      addressRegion: string;
      postalCode: string;
      addressCountry: string;
    };
  }): Record<string, any> {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: organization.name,
      url: organization.url,
      ...(organization.logo && {
        logo: {
          '@type': 'ImageObject',
          url: organization.logo,
        },
      }),
      ...(organization.contactPoints && {
        contactPoint: organization.contactPoints.map(contact => ({
          '@type': 'ContactPoint',
          telephone: contact.telephone,
          contactType: contact.contactType,
        })),
      }),
      ...(organization.address && {
        address: {
          '@type': 'PostalAddress',
          streetAddress: organization.address.streetAddress,
          addressLocality: organization.address.addressLocality,
          addressRegion: organization.address.addressRegion,
          postalCode: organization.address.postalCode,
          addressCountry: organization.address.addressCountry,
        },
      }),
    };
  }

  /**
   * Generate product structured data
   */
  generateProductSchema(product: {
    name: string;
    description: string;
    image: string;
    brand: string;
    offers: {
      price: string;
      priceCurrency: string;
      availability: string;
      seller: string;
    };
    aggregateRating?: {
      ratingValue: number;
      reviewCount: number;
    };
  }): Record<string, any> {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: product.image,
      brand: {
        '@type': 'Brand',
        name: product.brand,
      },
      offers: {
        '@type': 'Offer',
        price: product.offers.price,
        priceCurrency: product.offers.priceCurrency,
        availability: product.offers.availability,
        seller: {
          '@type': 'Organization',
          name: product.offers.seller,
        },
      },
      ...(product.aggregateRating && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: product.aggregateRating.ratingValue,
          reviewCount: product.aggregateRating.reviewCount,
        },
      }),
    };
  }

  /**
   * Validate SEO data completeness
   */
  validateSEOData(seoData: SEOData): {
    isValid: boolean;
    warnings: string[];
    suggestions: string[];
  } {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Title validation
    if (!seoData.title) {
      warnings.push('Missing page title');
    } else {
      if (seoData.title.length < 30) {
        suggestions.push('Title is quite short, consider making it more descriptive');
      }
      if (seoData.title.length > 60) {
        warnings.push('Title is too long (over 60 characters), may be truncated in search results');
      }
    }

    // Description validation
    if (!seoData.description) {
      warnings.push('Missing meta description');
    } else {
      if (seoData.description.length < 120) {
        suggestions.push('Description is short, consider adding more detail');
      }
      if (seoData.description.length > 160) {
        warnings.push('Description is too long (over 160 characters), may be truncated');
      }
    }

    // Keywords validation
    if (!seoData.keywords || seoData.keywords.length === 0) {
      suggestions.push('Consider adding relevant keywords');
    } else if (seoData.keywords.length > 10) {
      suggestions.push('Too many keywords, focus on the most relevant ones');
    }

    // Open Graph validation
    if (!seoData.openGraph.title) {
      suggestions.push('Add Open Graph title for better social media sharing');
    }
    if (!seoData.openGraph.description) {
      suggestions.push('Add Open Graph description for social media');
    }
    if (!seoData.openGraph.image) {
      suggestions.push('Add Open Graph image for social media preview');
    }

    // Structured data validation
    if (!seoData.structuredData || seoData.structuredData.length === 0) {
      suggestions.push('Consider adding structured data for better search engine understanding');
    }

    const isValid = warnings.length === 0;

    return {
      isValid,
      warnings,
      suggestions,
    };
  }
}
