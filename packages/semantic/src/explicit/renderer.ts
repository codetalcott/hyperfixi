/**
 * Explicit Mode Renderer
 *
 * Renders semantic nodes to explicit [command role:value] syntax.
 * Also renders to natural language syntax for any supported language.
 */

import type {
  SemanticNode,
  EventHandlerSemanticNode,
  CompoundSemanticNode,
  SemanticValue,
  SemanticRenderer as ISemanticRenderer,
  LanguagePattern,
  ReferenceValue,
  PropertyPathValue,
} from '../types';
// Import from registry for tree-shaking (registry uses directly-registered patterns first)
import { getPatternsForLanguageAndCommand, tryGetProfile } from '../registry';
import { getSupportedLanguages as getTokenizerLanguages } from '../tokenizers';

// =============================================================================
// Semantic Renderer Implementation
// =============================================================================

export class SemanticRendererImpl implements ISemanticRenderer {
  /**
   * Render a semantic node in the specified language.
   */
  render(node: SemanticNode, language: string): string {
    // Handle compound nodes specially (e.g., "cmd1 then cmd2")
    if (node.kind === 'compound') {
      return this.renderCompound(node as CompoundSemanticNode, language);
    }

    const patterns = getPatternsForLanguageAndCommand(language, node.action);

    if (patterns.length === 0) {
      // Fall back to explicit syntax if no patterns
      return this.renderExplicit(node);
    }

    // Find the best pattern for rendering (prefer patterns that match our roles)
    const bestPattern = this.findBestPattern(node, patterns);

    if (!bestPattern) {
      return this.renderExplicit(node);
    }

    return this.renderWithPattern(node, bestPattern);
  }

  /**
   * Render a compound node (multiple statements chained with then/and).
   */
  private renderCompound(node: CompoundSemanticNode, language: string): string {
    const renderedStatements = node.statements.map(stmt => this.render(stmt, language));
    const chainWord = this.getChainWord(node.chainType, language);
    return renderedStatements.join(` ${chainWord} `);
  }

  /**
   * Get the translated chain word for the given language.
   */
  private getChainWord(chainType: 'then' | 'and' | 'async', language: string): string {
    const profile = tryGetProfile(language);
    if (!profile?.keywords) {
      // Fall back to English
      return chainType;
    }

    // Map chain types to keyword lookup
    const keyword = profile.keywords[chainType];
    return keyword?.primary ?? chainType;
  }

  /**
   * Render a semantic node in explicit mode.
   */
  renderExplicit(node: SemanticNode): string {
    // Handle compound nodes
    if (node.kind === 'compound') {
      const compoundNode = node as CompoundSemanticNode;
      const renderedStatements = compoundNode.statements.map(stmt => this.renderExplicit(stmt));
      return renderedStatements.join(` ${compoundNode.chainType} `);
    }

    const parts: string[] = [node.action];

    // Add roles
    for (const [role, value] of node.roles) {
      parts.push(`${role}:${this.valueToString(value)}`);
    }

    // Handle event handler body
    if (node.kind === 'event-handler') {
      const eventNode = node as EventHandlerSemanticNode;
      if (eventNode.body && eventNode.body.length > 0) {
        const bodyParts = eventNode.body.map(n => this.renderExplicit(n));
        parts.push(`body:${bodyParts.join(' ')}`);
      }
    }

    return `[${parts.join(' ')}]`;
  }

  /**
   * Get all supported languages.
   */
  supportedLanguages(): string[] {
    return getTokenizerLanguages();
  }

  /**
   * Find the best pattern for rendering a semantic node.
   *
   * For rendering, we prefer "standard" patterns (e.g., "on click") over
   * native idiom patterns (e.g., "when clicked") because standard patterns
   * are more recognizable and closer to the original hyperscript syntax.
   */
  private findBestPattern(node: SemanticNode, patterns: LanguagePattern[]): LanguagePattern | null {
    // Score patterns by how well they match our roles
    const scored = patterns.map(pattern => {
      let score = pattern.priority;

      // Check each role token in the pattern
      for (const token of pattern.template.tokens) {
        if (token.type === 'role') {
          if (node.roles.has(token.role)) {
            // Bonus for patterns that use roles we have
            score += 10;
          } else if (!(token as any).optional) {
            // Heavy penalty for patterns that require roles we DON'T have
            // This prevents selecting "source" patterns when there's no source
            score -= 50;
          }
        }
      }

      // For English rendering, prefer "standard" patterns over "native idiom" patterns
      // This ensures "on click" is preferred over "when clicked" for English output
      // Only apply this boost for English - other languages should use their native idioms
      if (pattern.language === 'en') {
        if (pattern.id.includes('standard') || pattern.id.includes('en-source')) {
          score += 20; // Boost standard patterns for English rendering
        }
        // Penalize English "when", "if", "upon" variants (good for parsing, not output)
        if (
          pattern.id.includes('-when') ||
          pattern.id.includes('-if') ||
          pattern.id.includes('-upon')
        ) {
          score -= 15;
        }
      }

      return { pattern, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].pattern : null;
  }

  /**
   * Render a semantic node using a specific pattern.
   */
  private renderWithPattern(node: SemanticNode, pattern: LanguagePattern): string {
    const parts: string[] = [];
    const language = pattern.language;

    for (const token of pattern.template.tokens) {
      const rendered = this.renderPatternToken(token, node, language);
      if (rendered !== null) {
        parts.push(rendered);
      }
    }

    // Handle event handler body (render separately after pattern)
    if (node.kind === 'event-handler') {
      const eventNode = node as EventHandlerSemanticNode;
      if (eventNode.body && eventNode.body.length > 0) {
        const bodyParts = eventNode.body.map(n => this.render(n, language));
        parts.push(bodyParts.join(' '));
      }
    }

    return parts.join(' ');
  }

  /**
   * Render a single pattern token.
   */
  private renderPatternToken(token: any, node: SemanticNode, language: string): string | null {
    switch (token.type) {
      case 'literal':
        return token.value;

      case 'role': {
        const value = node.roles.get(token.role);
        if (!value) {
          if (token.optional) return null;
          // Use default if available
          return null;
        }
        return this.valueToNaturalString(value, language);
      }

      case 'group': {
        // Check if we have all required roles in the group
        const hasRequired = token.tokens
          .filter((t: any) => t.type === 'role' && !t.optional)
          .every((t: any) => node.roles.has(t.role));

        if (!hasRequired && token.optional) {
          return null;
        }

        // For optional groups with destination role, skip if destination is "me" (the default)
        // This avoids rendering "on me" / "en yo" when it's implicit
        if (token.optional) {
          const destToken = token.tokens.find(
            (t: any) => t.type === 'role' && t.role === 'destination'
          );
          if (destToken) {
            const destValue = node.roles.get('destination');
            if (destValue?.type === 'reference' && destValue.value === 'me') {
              return null; // Skip rendering default "me" destination
            }
          }
        }

        const groupParts: string[] = [];
        for (const subToken of token.tokens) {
          const rendered = this.renderPatternToken(subToken, node, language);
          if (rendered !== null) {
            groupParts.push(rendered);
          }
        }

        return groupParts.length > 0 ? groupParts.join(' ') : null;
      }

      default:
        return null;
    }
  }

  /**
   * Convert a semantic value to a string for explicit syntax.
   */
  private valueToString(value: SemanticValue): string {
    switch (value.type) {
      case 'literal':
        if (typeof value.value === 'string') {
          // Check if it needs quoting
          if (value.dataType === 'string' || /\s/.test(value.value)) {
            return `"${value.value}"`;
          }
          return value.value;
        }
        return String(value.value);

      case 'selector':
        return value.value;

      case 'reference':
        return value.value;

      case 'property-path':
        return `${this.valueToString(value.object)}'s ${value.property}`;

      case 'expression':
        return value.raw;
    }
  }

  /**
   * Convert a semantic value to natural language string.
   * Uses language-specific possessive rendering when language is provided.
   */
  private valueToNaturalString(value: SemanticValue, language: string = 'en'): string {
    switch (value.type) {
      case 'literal':
        if (typeof value.value === 'string' && value.dataType === 'string') {
          return `"${value.value}"`;
        }
        return String(value.value);

      case 'selector':
        return value.value;

      case 'reference':
        return this.renderReference(value, language);

      case 'property-path':
        return this.renderPropertyPath(value, language);

      case 'expression':
        return value.raw;
    }
  }

  /**
   * Render a reference value in the target language.
   */
  private renderReference(value: ReferenceValue, language: string): string {
    const profile = tryGetProfile(language);
    if (!profile?.references) {
      return value.value; // Fall back to English reference
    }
    return profile.references[value.value] ?? value.value;
  }

  /**
   * Render a property-path value (possessive expression) in the target language.
   *
   * Examples by language:
   * - English: "my value", "its opacity", "#el's value"
   * - Japanese: "自分の value", "それの opacity"
   * - Korean: "내 value", "그것의 opacity"
   * - Spanish: "mi value", "su opacity"
   * - Chinese: "我的 value", "它的 opacity"
   */
  private renderPropertyPath(value: PropertyPathValue, language: string): string {
    const profile = tryGetProfile(language);
    const property = value.property;

    // Get the object reference
    const objectRef = value.object.type === 'reference' ? value.object.value : null;

    // Check for special possessive forms (e.g., me → my, it → its)
    if (profile?.possessive?.specialForms && objectRef) {
      const specialForm = profile.possessive.specialForms[objectRef];
      if (specialForm) {
        const { markerPosition, usePossessiveAdjectives } = profile.possessive;

        // Handle different word orders based on marker position
        if (usePossessiveAdjectives && markerPosition === 'after-object') {
          // Languages like Arabic, Indonesian: "value لي", "value saya"
          // Possessive pronoun comes after the property
          return `${property} ${specialForm}`;
        }
        // Languages like Spanish, German, French, Korean: "mi value", "mein value", "내 value"
        // Possessive pronoun comes before the property
        return `${specialForm} ${property}`;
      }
    }

    // Get the rendered object string
    const objectStr = this.valueToNaturalString(value.object, language);

    // Use language-specific possessive construction
    if (profile?.possessive) {
      const { marker, markerPosition, usePossessiveAdjectives } = profile.possessive;

      // Languages that use possessive adjectives without explicit object reference
      if (usePossessiveAdjectives && objectRef) {
        // Fall back to generic construction if no special form
        // e.g., Indonesian: "value saya" (property + possessor)
        if (markerPosition === 'after-object') {
          return `${property} ${objectStr}`;
        }
      }

      // Particle/marker-based languages
      if (marker) {
        switch (markerPosition) {
          case 'between':
            // Japanese: "自分の value", Chinese: "我的 value", Korean: "나의 value"
            return profile.usesSpaces
              ? `${objectStr}${marker} ${property}`
              : `${objectStr}${marker}${property}`;

          case 'after-object':
            // Quechua: "ñuqapa value"
            return `${objectStr}${marker} ${property}`;

          case 'before-property':
            // Spanish (with de): "value de yo" (rarely used, usually special forms)
            return `${objectStr} ${marker} ${property}`;
        }
      }
    }

    // Default: English-style possessive "'s"
    // Handle special English cases
    if (language === 'en' || !profile?.possessive) {
      if (objectStr === 'me') {
        return `my ${property}`;
      }
      if (objectStr === 'it') {
        return `its ${property}`;
      }
      return `${objectStr}'s ${property}`;
    }

    // Generic fallback
    return `${objectStr} ${property}`;
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Singleton renderer instance.
 */
export const semanticRenderer = new SemanticRendererImpl();

/**
 * Render a semantic node in the specified language.
 */
export function render(node: SemanticNode, language: string): string {
  return semanticRenderer.render(node, language);
}

/**
 * Render a semantic node in explicit mode.
 */
export function renderExplicit(node: SemanticNode): string {
  return semanticRenderer.renderExplicit(node);
}
