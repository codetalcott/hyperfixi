/**
 * Declarative Playwright Code Mappings
 *
 * Maps BehaviorSpec keywords (multilingual) to Playwright code templates.
 * Templates use ${target}, ${value}, ${width}, ${height}, ${ms} placeholders.
 */

// =============================================================================
// Types
// =============================================================================

export interface SetupMapping {
  /** Subject keywords that trigger this mapping (all languages) */
  keywords: string[];
  /** Playwright setup template. Use ${value} placeholder. */
  template: string;
  /** Special handler type */
  type?: 'goto' | 'viewport';
}

export interface InteractionMapping {
  /** Action keywords that trigger this mapping (all languages) */
  keywords: string[];
  /** Playwright action template. Use ${target} and ${value} placeholders. */
  template: string;
}

export interface AssertionMapping {
  /** Assertion keywords that trigger this mapping (all languages) */
  keywords: string[];
  /** Playwright assertion template. Use ${target} and ${value} placeholders. */
  template: string;
  /** Negation template (with .not). If not provided, auto-generated. */
  negationTemplate?: string;
}

// =============================================================================
// GIVEN Setup Mappings
// =============================================================================

export const SETUP_MAPPINGS: SetupMapping[] = [
  {
    keywords: ['page', 'pagina', 'ページ', 'صفحة'],
    template: "  await page.goto('${value}');",
    type: 'goto',
  },
  {
    keywords: ['viewport', 'pantalla', '画面', 'شاشة'],
    template: '  await page.setViewportSize({ width: ${width}, height: ${height} });',
    type: 'viewport',
  },
];

// =============================================================================
// WHEN Interaction Mappings
// =============================================================================

export const INTERACTION_MAPPINGS: InteractionMapping[] = [
  {
    keywords: ['clicks', 'click', 'clic', 'クリック', 'نقر'],
    template: "  await page.locator('${target}').click();",
  },
  {
    keywords: ['types', 'type', 'escribe', '入力', 'كتابة'],
    template: "  await page.locator('${target}').fill('${value}');",
  },
  {
    keywords: ['submits', 'submit', 'envia', '送信', 'إرسال'],
    template: "  await page.locator('${target}').press('Enter');",
  },
  {
    keywords: ['hovers', 'hover', 'sobrevolar', 'ホバー', 'تحويم'],
    template: "  await page.locator('${target}').hover();",
  },
  {
    keywords: ['scrolls', 'scroll', 'desplaza', 'スクロール', 'تمرير'],
    template: "  await page.locator('${target}').scrollIntoViewIfNeeded();",
  },
  {
    keywords: ['drags', 'drag', 'arrastra', 'ドラッグ', 'سحب'],
    template: "  await page.locator('${target}').dragTo(page.locator('${value}'));",
  },
  {
    keywords: ['double-clicks', 'doble-clic', 'ダブルクリック', 'نقر-مزدوج'],
    template: "  await page.locator('${target}').dblclick();",
  },
  {
    keywords: ['right-clicks', 'clic-derecho', '右クリック', 'نقر-يمين'],
    template: "  await page.locator('${target}').click({ button: 'right' });",
  },
  {
    keywords: ['focuses', 'focus', 'enfoca', 'フォーカス', 'تركيز'],
    template: "  await page.locator('${target}').focus();",
  },
  {
    keywords: ['clears', 'clear', 'limpia', 'クリア', 'مسح'],
    template: "  await page.locator('${target}').clear();",
  },
];

// =============================================================================
// EXPECT Assertion Mappings
// =============================================================================

export const ASSERTION_MAPPINGS: AssertionMapping[] = [
  {
    keywords: ['appears', 'visible', 'aparece', '表示', 'يظهر'],
    template: "  await expect(page.locator('${target}')).toBeVisible();",
    negationTemplate: "  await expect(page.locator('${target}')).not.toBeVisible();",
  },
  {
    keywords: ['disappears', 'hidden', 'desaparece', '非表示', 'يختفي'],
    template: "  await expect(page.locator('${target}')).toBeHidden();",
    negationTemplate: "  await expect(page.locator('${target}')).not.toBeHidden();",
  },
  {
    keywords: ['has', 'tiene', '持つ', 'يحتوي'],
    template: "  await expect(page.locator('${target}')).toHaveClass(/${value}/);",
    negationTemplate: "  await expect(page.locator('${target}')).not.toHaveClass(/${value}/);",
  },
  {
    keywords: ['shows', 'muestra', '表示する', 'يعرض', 'saying', 'diciendo'],
    template: "  await expect(page.locator('${target}')).toContainText('${value}');",
    negationTemplate: "  await expect(page.locator('${target}')).not.toContainText('${value}');",
  },
  {
    keywords: ['changes', 'cambia', '変わる', 'يتغير'],
    template: "  await expect(page.locator('${target}')).toHaveText('${value}');",
  },
  {
    keywords: ['increases', 'aumenta', '増加', 'يزيد'],
    template: '  // Assert ${target} increased ${value}',
  },
  {
    keywords: ['decreases', 'disminuye', '減少', 'ينقص'],
    template: '  // Assert ${target} decreased ${value}',
  },
  {
    keywords: ['contains', 'contiene', '含む', 'يحتوي-على'],
    template: "  await expect(page.locator('${target}')).toContainText('${value}');",
  },
  {
    keywords: ['enabled', 'habilitado', '有効', 'مفعل'],
    template: "  await expect(page.locator('${target}')).toBeEnabled();",
    negationTemplate: "  await expect(page.locator('${target}')).not.toBeEnabled();",
  },
  {
    keywords: ['disabled', 'deshabilitado', '無効', 'معطل'],
    template: "  await expect(page.locator('${target}')).toBeDisabled();",
  },
];
