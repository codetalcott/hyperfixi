#!/usr/bin/env npx tsx
/**
 * Analyze Showcase Examples
 *
 * Outputs all showcase translations in JSON format for analysis.
 * Run: npx tsx scripts/analyze-showcase.ts > showcase-analysis.json
 */

import { render, renderExplicit, parse } from '../src';

// All 13 supported languages
const LANGUAGES = [
  { code: 'en', name: 'English', wordOrder: 'SVO' },
  { code: 'ja', name: 'Japanese', wordOrder: 'SOV' },
  { code: 'ko', name: 'Korean', wordOrder: 'SOV' },
  { code: 'es', name: 'Spanish', wordOrder: 'SVO' },
  { code: 'pt', name: 'Portuguese', wordOrder: 'SVO' },
  { code: 'fr', name: 'French', wordOrder: 'SVO' },
  { code: 'de', name: 'German', wordOrder: 'SVO' },
  { code: 'zh', name: 'Chinese', wordOrder: 'SVO' },
  { code: 'ar', name: 'Arabic', wordOrder: 'VSO' },
  { code: 'tr', name: 'Turkish', wordOrder: 'SOV' },
  { code: 'id', name: 'Indonesian', wordOrder: 'SVO' },
  { code: 'qu', name: 'Quechua', wordOrder: 'SOV' },
  { code: 'sw', name: 'Swahili', wordOrder: 'SVO' },
];

// Showcase examples (English source)
const EXAMPLES = [
  {
    id: 'counter',
    name: 'Counter',
    description: 'Increment and decrement values',
    scripts: {
      increment: 'on click increment #counter-value',
      decrement: 'on click decrement #counter-value',
      reset: 'on click put 0 into #counter-value',
    },
  },
  {
    id: 'toggle',
    name: 'Toggle Class',
    description: 'Add and remove CSS classes',
    scripts: {
      toggle: 'on click toggle .active on me',
    },
  },
  {
    id: 'input-mirror',
    name: 'Input Mirror',
    description: 'Mirror input values in real-time',
    scripts: {
      mirror: 'on input put my value into #mirror-output',
    },
  },
  {
    id: 'tabs',
    name: 'Tabs Navigation',
    description: 'Multi-element coordination with add/remove',
    scripts: {
      tabBtn: 'on click remove .active from .tab-btn then add .active to me',
    },
  },
];

interface TranslationResult {
  language: string;
  languageName: string;
  wordOrder: string;
  output: string;
  isExplicit: boolean;  // True if fell back to explicit syntax
  hasIssues: boolean;   // Heuristic for potential issues
  issues: string[];     // List of detected issues
}

interface ScriptAnalysis {
  scriptId: string;
  englishSource: string;
  explicit: string;
  translations: TranslationResult[];
  summary: {
    successfulNative: number;
    fellBackToExplicit: number;
    withIssues: number;
  };
}

interface ExampleAnalysis {
  id: string;
  name: string;
  description: string;
  scripts: ScriptAnalysis[];
}

function analyzeTranslation(
  english: string,
  langCode: string,
  output: string,
  _explicit: string
): { isExplicit: boolean; hasIssues: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check if output is explicit syntax (starts with '[')
  const isExplicit = output.startsWith('[') && output.endsWith(']');

  if (!isExplicit) {
    // Check for common issues

    // Issue: English words in non-English output (except technical terms)
    const technicalTerms = ['click', 'input', 'value', 'active', '#', '.', 'tab-btn', 'counter-value', 'mirror-output'];
    const englishKeywords = ['on', 'put', 'into', 'from', 'to', 'then', 'add', 'remove', 'toggle', 'increment', 'decrement', 'my'];

    if (langCode !== 'en') {
      for (const keyword of englishKeywords) {
        // Check for isolated English keywords (not part of selectors)
        const regex = new RegExp(`(^|\\s)${keyword}(\\s|$)`, 'i');
        if (regex.test(output) && !technicalTerms.some(t => output.includes(t + keyword) || output.includes(keyword + t))) {
          issues.push(`Contains English keyword "${keyword}"`);
        }
      }
    }

    // Issue: "me's" instead of possessive form
    if (output.includes("me's")) {
      issues.push('Contains "me\'s" instead of proper possessive');
    }

    // Issue: "it's" (contraction) instead of "its" (possessive)
    if (output.includes("it's ")) {
      issues.push('Contains "it\'s" instead of "its"');
    }

    // Issue: Double spaces
    if (output.includes('  ')) {
      issues.push('Contains double spaces');
    }

    // Issue: Very long output (might indicate verbose fallback)
    if (output.length > english.length * 3) {
      issues.push('Output unusually long');
    }
  }

  return {
    isExplicit,
    hasIssues: isExplicit || issues.length > 0,
    issues: isExplicit ? ['Fell back to explicit syntax'] : issues,
  };
}

function analyzeScript(scriptId: string, english: string): ScriptAnalysis {
  const node = parse(english, 'en');
  const explicit = renderExplicit(node);

  const translations: TranslationResult[] = [];
  let successfulNative = 0;
  let fellBackToExplicit = 0;
  let withIssues = 0;

  for (const lang of LANGUAGES) {
    const output = render(node, lang.code);
    const analysis = analyzeTranslation(english, lang.code, output, explicit);

    translations.push({
      language: lang.code,
      languageName: lang.name,
      wordOrder: lang.wordOrder,
      output,
      isExplicit: analysis.isExplicit,
      hasIssues: analysis.hasIssues,
      issues: analysis.issues,
    });

    if (analysis.isExplicit) {
      fellBackToExplicit++;
    } else {
      successfulNative++;
    }

    if (analysis.hasIssues) {
      withIssues++;
    }
  }

  return {
    scriptId,
    englishSource: english,
    explicit,
    translations,
    summary: {
      successfulNative,
      fellBackToExplicit,
      withIssues,
    },
  };
}

function analyzeExample(example: typeof EXAMPLES[0]): ExampleAnalysis {
  const scripts: ScriptAnalysis[] = [];

  for (const [scriptId, english] of Object.entries(example.scripts)) {
    scripts.push(analyzeScript(scriptId, english));
  }

  return {
    id: example.id,
    name: example.name,
    description: example.description,
    scripts,
  };
}

function generateReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    languages: LANGUAGES,
    examples: EXAMPLES.map(analyzeExample),
    globalSummary: {
      totalScripts: 0,
      totalTranslations: 0,
      successfulNative: 0,
      fellBackToExplicit: 0,
      withIssues: 0,
      byLanguage: {} as Record<string, { native: number; explicit: number; issues: number }>,
    },
  };

  // Calculate global summary
  for (const lang of LANGUAGES) {
    report.globalSummary.byLanguage[lang.code] = { native: 0, explicit: 0, issues: 0 };
  }

  for (const example of report.examples) {
    for (const script of example.scripts) {
      report.globalSummary.totalScripts++;
      report.globalSummary.totalTranslations += script.translations.length;
      report.globalSummary.successfulNative += script.summary.successfulNative;
      report.globalSummary.fellBackToExplicit += script.summary.fellBackToExplicit;
      report.globalSummary.withIssues += script.summary.withIssues;

      for (const trans of script.translations) {
        const langStats = report.globalSummary.byLanguage[trans.language];
        if (trans.isExplicit) {
          langStats.explicit++;
        } else {
          langStats.native++;
        }
        if (trans.hasIssues) {
          langStats.issues++;
        }
      }
    }
  }

  return report;
}

// Generate and output report
const report = generateReport();
console.log(JSON.stringify(report, null, 2));
