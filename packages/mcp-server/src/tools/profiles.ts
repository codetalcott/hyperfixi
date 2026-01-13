/**
 * Profile Tools
 *
 * Language profile inspection tools for viewing keywords, markers,
 * references, and other language-specific configuration.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  getProfile,
  tryGetProfile,
  getRegisteredLanguages,
  type LanguageProfile,
  type KeywordTranslation,
} from '@hyperfixi/semantic';

// =============================================================================
// Tool Definitions
// =============================================================================

export const profileTools: Tool[] = [
  {
    name: 'get_language_profile',
    description:
      'Get the full language profile for a specific language, including keywords, markers, references, and configuration',
    inputSchema: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          description: 'Language code (e.g., "en", "ja", "es", "ar")',
        },
        section: {
          type: 'string',
          description:
            'Optional: specific section to return (keywords, markers, references, possessive, config). If omitted, returns full profile.',
          enum: ['keywords', 'markers', 'references', 'possessive', 'config', 'all'],
        },
      },
      required: ['language'],
    },
  },
  {
    name: 'list_supported_languages',
    description:
      'List all supported languages with their metadata (name, native name, direction, word order)',
    inputSchema: {
      type: 'object',
      properties: {
        includeDetails: {
          type: 'boolean',
          description: 'Include full metadata for each language (default: true)',
          default: true,
        },
      },
    },
  },
  {
    name: 'get_keyword_translations',
    description: 'Get translations of a specific keyword/command across languages',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'The English keyword to look up (e.g., "toggle", "add", "remove", "put")',
        },
        languages: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Optional: specific languages to include. If omitted, returns all languages.',
        },
      },
      required: ['keyword'],
    },
  },
  {
    name: 'get_role_markers',
    description: 'Get role markers (destination, source, patient, etc.) for a language',
    inputSchema: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          description: 'Language code',
        },
        role: {
          type: 'string',
          description:
            'Optional: specific role to get markers for (destination, source, patient, style, instrument, manner)',
          enum: ['destination', 'source', 'patient', 'style', 'instrument', 'manner'],
        },
      },
      required: ['language'],
    },
  },
  {
    name: 'compare_language_profiles',
    description: 'Compare two language profiles to find differences and gaps in translations',
    inputSchema: {
      type: 'object',
      properties: {
        baseLanguage: {
          type: 'string',
          description: 'Base language code (typically "en")',
        },
        targetLanguage: {
          type: 'string',
          description: 'Target language code to compare',
        },
        section: {
          type: 'string',
          description: 'Section to compare (keywords, markers, references, all)',
          enum: ['keywords', 'markers', 'references', 'all'],
          default: 'all',
        },
      },
      required: ['baseLanguage', 'targetLanguage'],
    },
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

function formatKeyword(kw: KeywordTranslation | string | undefined): string {
  if (!kw) return '(not defined)';
  if (typeof kw === 'string') return kw;
  let result = kw.primary;
  if (kw.alternatives?.length) {
    result += ` (alt: ${kw.alternatives.join(', ')})`;
  }
  if (kw.normalized) {
    result += ` [normalized: ${kw.normalized}]`;
  }
  if (kw.form) {
    result += ` [form: ${kw.form}]`;
  }
  return result;
}

function getProfileSection(profile: LanguageProfile, section: string): unknown {
  switch (section) {
    case 'keywords':
      return profile.keywords;
    case 'markers':
      return profile.roleMarkers;
    case 'references':
      return profile.references;
    case 'possessive':
      return profile.possessive;
    case 'config':
      return {
        code: profile.code,
        name: profile.name,
        nativeName: profile.nativeName,
        direction: profile.direction,
        wordOrder: profile.wordOrder,
        markingStrategy: profile.markingStrategy,
        usesSpaces: profile.usesSpaces,
        defaultVerbForm: profile.defaultVerbForm,
        verb: profile.verb,
      };
    case 'all':
    default:
      return profile;
  }
}

// =============================================================================
// Tool Handlers
// =============================================================================

export async function handleProfileTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'get_language_profile':
        return handleGetLanguageProfile(args);
      case 'list_supported_languages':
        return handleListSupportedLanguages(args);
      case 'get_keyword_translations':
        return handleGetKeywordTranslations(args);
      case 'get_role_markers':
        return handleGetRoleMarkers(args);
      case 'compare_language_profiles':
        return handleCompareProfiles(args);
      default:
        return {
          content: [{ type: 'text', text: `Unknown profile tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error in ${name}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

function handleGetLanguageProfile(args: Record<string, unknown>): {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
} {
  const language = args.language as string;
  const section = (args.section as string) || 'all';

  const profile = tryGetProfile(language);
  if (!profile) {
    const available = getRegisteredLanguages();
    return {
      content: [
        {
          type: 'text',
          text: `Language "${language}" not found. Available languages: ${available.join(', ')}`,
        },
      ],
      isError: true,
    };
  }

  const data = getProfileSection(profile, section);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function handleListSupportedLanguages(args: Record<string, unknown>): {
  content: Array<{ type: string; text: string }>;
} {
  const includeDetails = args.includeDetails !== false;
  const languages = getRegisteredLanguages();

  if (!includeDetails) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ count: languages.length, languages }, null, 2),
        },
      ],
    };
  }

  const details = languages.map(code => {
    const profile = tryGetProfile(code);
    if (!profile) return { code, error: 'Profile not found' };

    return {
      code: profile.code,
      name: profile.name,
      nativeName: profile.nativeName,
      direction: profile.direction,
      wordOrder: profile.wordOrder,
      markingStrategy: profile.markingStrategy,
      usesSpaces: profile.usesSpaces,
    };
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ count: details.length, languages: details }, null, 2),
      },
    ],
  };
}

function handleGetKeywordTranslations(args: Record<string, unknown>): {
  content: Array<{ type: string; text: string }>;
} {
  const keyword = args.keyword as string;
  const targetLanguages = args.languages as string[] | undefined;
  const languages = targetLanguages || getRegisteredLanguages();

  const translations: Record<string, string> = {};

  for (const lang of languages) {
    const profile = tryGetProfile(lang);
    if (!profile) continue;

    const kw = profile.keywords?.[keyword as keyof typeof profile.keywords];
    translations[lang] = formatKeyword(kw as KeywordTranslation | string | undefined);
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            keyword,
            translations,
          },
          null,
          2
        ),
      },
    ],
  };
}

function handleGetRoleMarkers(args: Record<string, unknown>): {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
} {
  const language = args.language as string;
  const role = args.role as string | undefined;

  const profile = tryGetProfile(language);
  if (!profile) {
    return {
      content: [
        {
          type: 'text',
          text: `Language "${language}" not found.`,
        },
      ],
      isError: true,
    };
  }

  if (!profile.roleMarkers) {
    return {
      content: [
        {
          type: 'text',
          text: `Language "${language}" has no role markers defined.`,
        },
      ],
    };
  }

  const markers = role
    ? { [role]: profile.roleMarkers[role as keyof typeof profile.roleMarkers] }
    : profile.roleMarkers;

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            language,
            nativeName: profile.nativeName,
            markingStrategy: profile.markingStrategy,
            markers,
          },
          null,
          2
        ),
      },
    ],
  };
}

function handleCompareProfiles(args: Record<string, unknown>): {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
} {
  const baseLanguage = args.baseLanguage as string;
  const targetLanguage = args.targetLanguage as string;
  const section = (args.section as string) || 'all';

  const baseProfile = tryGetProfile(baseLanguage);
  const targetProfile = tryGetProfile(targetLanguage);

  if (!baseProfile) {
    return {
      content: [{ type: 'text', text: `Base language "${baseLanguage}" not found.` }],
      isError: true,
    };
  }
  if (!targetProfile) {
    return {
      content: [{ type: 'text', text: `Target language "${targetLanguage}" not found.` }],
      isError: true,
    };
  }

  const comparison: Record<string, unknown> = {
    base: { code: baseLanguage, name: baseProfile.name },
    target: { code: targetLanguage, name: targetProfile.name },
  };

  // Compare keywords
  if (section === 'keywords' || section === 'all') {
    const baseKeywords = Object.keys(baseProfile.keywords || {});
    const targetKeywords = Object.keys(targetProfile.keywords || {});

    const missing = baseKeywords.filter(k => !targetKeywords.includes(k));
    const extra = targetKeywords.filter(k => !baseKeywords.includes(k));

    comparison.keywords = {
      baseCount: baseKeywords.length,
      targetCount: targetKeywords.length,
      missing: missing.length > 0 ? missing : undefined,
      extra: extra.length > 0 ? extra : undefined,
      coverage: `${((targetKeywords.length / baseKeywords.length) * 100).toFixed(1)}%`,
    };
  }

  // Compare markers
  if (section === 'markers' || section === 'all') {
    const baseMarkers = Object.keys(baseProfile.roleMarkers || {});
    const targetMarkers = Object.keys(targetProfile.roleMarkers || {});

    const missing = baseMarkers.filter(k => !targetMarkers.includes(k));
    comparison.markers = {
      baseCount: baseMarkers.length,
      targetCount: targetMarkers.length,
      missing: missing.length > 0 ? missing : undefined,
    };
  }

  // Compare references
  if (section === 'references' || section === 'all') {
    const baseRefs = Object.keys(baseProfile.references || {});
    const targetRefs = Object.keys(targetProfile.references || {});

    const missing = baseRefs.filter(k => !targetRefs.includes(k));
    comparison.references = {
      baseCount: baseRefs.length,
      targetCount: targetRefs.length,
      missing: missing.length > 0 ? missing : undefined,
    };
  }

  // Structural differences
  comparison.structuralDifferences = {
    wordOrder:
      baseProfile.wordOrder !== targetProfile.wordOrder
        ? { base: baseProfile.wordOrder, target: targetProfile.wordOrder }
        : 'same',
    direction:
      baseProfile.direction !== targetProfile.direction
        ? { base: baseProfile.direction, target: targetProfile.direction }
        : 'same',
    markingStrategy:
      baseProfile.markingStrategy !== targetProfile.markingStrategy
        ? { base: baseProfile.markingStrategy, target: targetProfile.markingStrategy }
        : 'same',
    usesSpaces:
      baseProfile.usesSpaces !== targetProfile.usesSpaces
        ? { base: baseProfile.usesSpaces, target: targetProfile.usesSpaces }
        : 'same',
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(comparison, null, 2),
      },
    ],
  };
}
