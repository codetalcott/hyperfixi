/**
 * Tests for Profile Tools
 */
import { describe, it, expect } from 'vitest';
import { handleProfileTool, profileTools } from '../tools/profiles.js';

describe('Profile Tools', () => {
  describe('Tool Definitions', () => {
    it('exports correct number of tools', () => {
      expect(profileTools).toHaveLength(5);
    });

    it('has get_language_profile tool', () => {
      const tool = profileTools.find((t) => t.name === 'get_language_profile');
      expect(tool).toBeDefined();
      expect(tool?.inputSchema.required).toContain('language');
    });

    it('has list_supported_languages tool', () => {
      const tool = profileTools.find((t) => t.name === 'list_supported_languages');
      expect(tool).toBeDefined();
    });

    it('has get_keyword_translations tool', () => {
      const tool = profileTools.find((t) => t.name === 'get_keyword_translations');
      expect(tool).toBeDefined();
      expect(tool?.inputSchema.required).toContain('keyword');
    });

    it('has get_role_markers tool', () => {
      const tool = profileTools.find((t) => t.name === 'get_role_markers');
      expect(tool).toBeDefined();
      expect(tool?.inputSchema.required).toContain('language');
    });

    it('has compare_language_profiles tool', () => {
      const tool = profileTools.find((t) => t.name === 'compare_language_profiles');
      expect(tool).toBeDefined();
      expect(tool?.inputSchema.required).toContain('baseLanguage');
      expect(tool?.inputSchema.required).toContain('targetLanguage');
    });
  });

  describe('get_language_profile', () => {
    it('returns full profile for English', async () => {
      const result = await handleProfileTool('get_language_profile', { language: 'en' });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.code).toBe('en');
      expect(data.name).toBe('English');
      expect(data.wordOrder).toBe('SVO');
      expect(data.keywords).toBeDefined();
    });

    it('returns specific section when requested', async () => {
      const result = await handleProfileTool('get_language_profile', {
        language: 'en',
        section: 'config',
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.code).toBe('en');
      expect(data.wordOrder).toBe('SVO');
      expect(data.keywords).toBeUndefined(); // config section shouldn't include keywords
    });

    it('returns keywords section', async () => {
      const result = await handleProfileTool('get_language_profile', {
        language: 'ja',
        section: 'keywords',
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.toggle).toBeDefined();
    });

    it('returns error for unknown language', async () => {
      const result = await handleProfileTool('get_language_profile', { language: 'xyz' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });
  });

  describe('list_supported_languages', () => {
    it('returns all languages with details', async () => {
      const result = await handleProfileTool('list_supported_languages', {});
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.count).toBeGreaterThanOrEqual(13);
      expect(data.languages).toBeInstanceOf(Array);
      expect(data.languages[0]).toHaveProperty('code');
      expect(data.languages[0]).toHaveProperty('name');
      expect(data.languages[0]).toHaveProperty('nativeName');
    });

    it('returns simple list when includeDetails is false', async () => {
      const result = await handleProfileTool('list_supported_languages', {
        includeDetails: false,
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.count).toBeGreaterThanOrEqual(13);
      expect(data.languages).toBeInstanceOf(Array);
      expect(typeof data.languages[0]).toBe('string');
    });

    it('includes key languages', async () => {
      const result = await handleProfileTool('list_supported_languages', {});
      const data = JSON.parse(result.content[0].text);
      const codes = data.languages.map((l: { code: string }) => l.code);
      expect(codes).toContain('en');
      expect(codes).toContain('ja');
      expect(codes).toContain('es');
      expect(codes).toContain('ar');
    });
  });

  describe('get_keyword_translations', () => {
    it('returns translations for toggle', async () => {
      const result = await handleProfileTool('get_keyword_translations', {
        keyword: 'toggle',
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.keyword).toBe('toggle');
      expect(data.translations).toBeDefined();
      expect(data.translations.en).toBeDefined();
      expect(data.translations.ja).toBeDefined();
    });

    it('filters to specific languages', async () => {
      const result = await handleProfileTool('get_keyword_translations', {
        keyword: 'toggle',
        languages: ['en', 'ja', 'es'],
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(Object.keys(data.translations)).toHaveLength(3);
      expect(data.translations.en).toBeDefined();
      expect(data.translations.ja).toBeDefined();
      expect(data.translations.es).toBeDefined();
    });
  });

  describe('get_role_markers', () => {
    it('returns all markers for a language', async () => {
      const result = await handleProfileTool('get_role_markers', { language: 'en' });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.language).toBe('en');
      expect(data.markers).toBeDefined();
    });

    it('returns specific role marker', async () => {
      const result = await handleProfileTool('get_role_markers', {
        language: 'ja',
        role: 'destination',
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.markers.destination).toBeDefined();
    });

    it('returns error for unknown language', async () => {
      const result = await handleProfileTool('get_role_markers', { language: 'xyz' });
      expect(result.isError).toBe(true);
    });
  });

  describe('compare_language_profiles', () => {
    it('compares English and Japanese', async () => {
      const result = await handleProfileTool('compare_language_profiles', {
        baseLanguage: 'en',
        targetLanguage: 'ja',
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.base.code).toBe('en');
      expect(data.target.code).toBe('ja');
      expect(data.keywords).toBeDefined();
      expect(data.structuralDifferences).toBeDefined();
      expect(data.structuralDifferences.wordOrder).toEqual({
        base: 'SVO',
        target: 'SOV',
      });
    });

    it('compares specific section only', async () => {
      const result = await handleProfileTool('compare_language_profiles', {
        baseLanguage: 'en',
        targetLanguage: 'es',
        section: 'keywords',
      });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.keywords).toBeDefined();
      expect(data.markers).toBeUndefined();
    });

    it('returns error for unknown base language', async () => {
      const result = await handleProfileTool('compare_language_profiles', {
        baseLanguage: 'xyz',
        targetLanguage: 'en',
      });
      expect(result.isError).toBe(true);
    });

    it('returns error for unknown target language', async () => {
      const result = await handleProfileTool('compare_language_profiles', {
        baseLanguage: 'en',
        targetLanguage: 'xyz',
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns error for unknown tool', async () => {
      const result = await handleProfileTool('unknown_profile_tool', {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown profile tool');
    });
  });
});
