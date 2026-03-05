import { addons } from 'storybook/internal/preview-api';
import type { DecoratorFunction } from 'storybook/internal/types';
import { EVENTS } from './constants.js';

// Track highlighted elements and overlays for cleanup
let highlightedElements: HTMLElement[] = [];
let overlayElements: HTMLElement[] = [];
let blinkTimeoutId: ReturnType<typeof setTimeout> | null = null;

// CSS for highlight and blink animation
const HIGHLIGHT_OUTLINE = '3px dashed #8b5cf6';
const BLINK_CLASS = 'design-token-highlight-blink';

// Inject blink animation styles (3 iterations then stop)
function injectBlinkStyles() {
  if (document.getElementById('design-token-blink-styles')) return;
  const style = document.createElement('style');
  style.id = 'design-token-blink-styles';
  style.textContent = `
    @keyframes design-token-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.2; }
    }
    .${BLINK_CLASS} {
      animation: design-token-blink 0.4s ease-in-out 3;
    }
  `;
  document.head.appendChild(style);
}

// Check if a token name suggests it's a spacing/dimension token
function isSpacingToken(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes('space') ||
    lower.includes('gap') ||
    lower.includes('padding') ||
    lower.includes('margin') ||
    lower.includes('width') ||
    lower.includes('height') ||
    lower.includes('size')
  );
}

// Create a ruler overlay for spacing visualization
function createRulerOverlay(element: HTMLElement, tokenName: string, value: string): HTMLElement {
  const rect = element.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  const overlay = document.createElement('div');
  overlay.className = `design-token-ruler ${BLINK_CLASS}`;

  // Determine if it's horizontal or vertical based on token name
  const isVertical =
    tokenName.toLowerCase().includes('height') ||
    tokenName.toLowerCase().includes('block') ||
    tokenName.toLowerCase().includes('top') ||
    tokenName.toLowerCase().includes('bottom');

  const isHorizontal = !isVertical;

  if (isHorizontal) {
    // Horizontal ruler (for width, padding-inline, margin-left/right, gap)
    overlay.style.cssText = `
      position: absolute;
      top: ${rect.top + scrollY + rect.height / 2 - 12}px;
      left: ${rect.left + scrollX}px;
      width: ${rect.width}px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 10000;
    `;
    overlay.innerHTML = `
      <svg width="100%" height="24" style="position: absolute; top: 0; left: 0;">
        <line x1="0" y1="12" x2="100%" y2="12" stroke="#8b5cf6" stroke-width="2"/>
        <line x1="0" y1="6" x2="0" y2="18" stroke="#8b5cf6" stroke-width="2"/>
        <line x1="100%" y1="6" x2="100%" y2="18" stroke="#8b5cf6" stroke-width="2"/>
        <polygon points="0,12 8,8 8,16" fill="#8b5cf6"/>
        <polygon points="100%,12 calc(100% - 8px),8 calc(100% - 8px),16" fill="#8b5cf6" transform="translate(-8, 0)"/>
      </svg>
      <span style="
        background: #8b5cf6;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-family: ui-monospace, monospace;
        position: relative;
        z-index: 1;
        white-space: nowrap;
      ">${value}</span>
    `;
  } else {
    // Vertical ruler (for height, padding-block, margin-top/bottom)
    overlay.style.cssText = `
      position: absolute;
      top: ${rect.top + scrollY}px;
      left: ${rect.left + scrollX + rect.width / 2 - 12}px;
      width: 24px;
      height: ${rect.height}px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 10000;
    `;
    overlay.innerHTML = `
      <svg width="24" height="100%" style="position: absolute; top: 0; left: 0;">
        <line x1="12" y1="0" x2="12" y2="100%" stroke="#8b5cf6" stroke-width="2"/>
        <line x1="6" y1="0" x2="18" y2="0" stroke="#8b5cf6" stroke-width="2"/>
        <line x1="6" y1="100%" x2="18" y2="100%" stroke="#8b5cf6" stroke-width="2"/>
        <polygon points="12,0 8,8 16,8" fill="#8b5cf6"/>
        <polygon points="12,100% 8,calc(100% - 8px) 16,calc(100% - 8px)" fill="#8b5cf6"/>
      </svg>
      <span style="
        background: #8b5cf6;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-family: ui-monospace, monospace;
        position: relative;
        z-index: 1;
        white-space: nowrap;
        writing-mode: vertical-rl;
        text-orientation: mixed;
      ">${value}</span>
    `;
  }

  document.body.appendChild(overlay);
  return overlay;
}

// Strip pseudo-selectors from a CSS selector to match base elements
// e.g., ".control:hover:not([data-disabled])" -> ".control"
function stripPseudoSelectors(selector: string): string {
  // Single pass: remove pseudo-classes, pseudo-elements, and their arguments
  return (
    selector
      // Remove functional pseudo-classes with arguments: :not(...), :has(...), :where(...), :is(...)
      .replaceAll(/:(?:not|has|where|is)\([^)]+\)/g, '')
      // Remove all remaining pseudo-classes and pseudo-elements
      .replaceAll(/::?[\w-]+/g, '')
      // Clean up empty attribute selectors
      .replaceAll(/\[\s*\]/g, '')
      .trim()
  );
}

// Result type for findElementsUsingToken
interface ElementMatch {
  element: HTMLElement;
  cssSelector: string; // The original CSS selector (may include pseudo-selectors)
}

// Match elements using known CSS selectors from TokenEntry
function matchElementsBySelectors(root: Element, selectors: string[]): ElementMatch[] {
  const matches: ElementMatch[] = [];
  const seenElements = new Set<HTMLElement>();

  for (const selector of selectors) {
    const baseSelector = stripPseudoSelectors(selector);
    const querySelector = baseSelector || selector;
    try {
      const elements = root.querySelectorAll(querySelector);
      elements.forEach((el) => {
        if (el instanceof HTMLElement && !seenElements.has(el)) {
          seenElements.add(el);
          matches.push({ element: el, cssSelector: selector });
        }
      });
    } catch {
      // Invalid selector, skip
    }
  }

  return matches;
}

// Find elements that use a specific CSS variable
function findElementsUsingToken(root: Element, tokenName: string): ElementMatch[] {
  const matches: ElementMatch[] = [];
  const seenElements = new Set<HTMLElement>();
  const varName = `--${tokenName}`;
  const varUsage = `var(${varName})`;
  const varUsageAlt = `var(${varName},`; // var with fallback

  // Get all elements in the root
  const allElements = root.querySelectorAll('*');

  // Build a map of selectors that use this token
  // Map from base selector -> original selector (with pseudo-selectors)
  const selectorMap: Map<string, string> = new Map();
  const exactSelectors: Set<string> = new Set();

  // First pass: find all CSS rules that use this token
  try {
    const sheets = Array.from(document.styleSheets);
    for (const sheet of sheets) {
      try {
        const cssRuleList = sheet.cssRules;
        if (!cssRuleList) continue;

        const processRule = (rule: CSSRule) => {
          if (rule instanceof CSSStyleRule) {
            if (rule.cssText.includes(varUsage) || rule.cssText.includes(varUsageAlt)) {
              // Split compound selectors and add each part
              rule.selectorText.split(',').forEach((selector) => {
                const trimmed = selector.trim();
                exactSelectors.add(trimmed);
                // Map stripped version to original for pseudo-selector cases
                const stripped = stripPseudoSelectors(trimmed);
                if (stripped) {
                  // Store original selector, prefer one with more pseudo-selectors
                  const existing = selectorMap.get(stripped);
                  if (!existing || trimmed.length > existing.length) {
                    selectorMap.set(stripped, trimmed);
                  }
                }
              });
            }
          } else if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule) {
            // Handle nested rules in @media and @supports
            Array.from(rule.cssRules).forEach(processRule);
          }
        };

        Array.from(cssRuleList).forEach(processRule);
      } catch {
        // Cross-origin stylesheet access denied, skip
      }
    }
  } catch {
    // Stylesheet access failed, skip
  }

  allElements.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    if (seenElements.has(el)) return;

    // Check if the element's inline style uses the token
    const inlineStyle = el.getAttribute('style') ?? '';
    if (inlineStyle.includes(varName)) {
      seenElements.add(el);
      matches.push({ element: el, cssSelector: '[inline style]' });
      return;
    }

    // Check if any of the selectors that use this token match this element
    // First try exact selectors
    for (const selector of exactSelectors) {
      try {
        if (el.matches(selector)) {
          seenElements.add(el);
          matches.push({ element: el, cssSelector: selector });
          return;
        }
      } catch {
        // Invalid selector, skip
      }
    }

    // Then try base selectors (with pseudo-selectors stripped)
    // This handles :hover, :focus, etc. states
    for (const [baseSelector, originalSelector] of selectorMap.entries()) {
      try {
        if (el.matches(baseSelector)) {
          seenElements.add(el);
          // Use the original selector with pseudo-selectors for display
          matches.push({ element: el, cssSelector: originalSelector });
          return;
        }
      } catch {
        // Invalid selector, skip
      }
    }
  });

  return matches;
}

const clearHighlights = () => {
  // Clear blink timeout
  if (blinkTimeoutId) {
    clearTimeout(blinkTimeoutId);
    blinkTimeoutId = null;
  }

  // Remove highlight styles from elements
  highlightedElements.forEach((el) => {
    el.style.outline = '';
    el.style.outlineOffset = '';
    el.classList.remove(BLINK_CLASS);
  });
  highlightedElements = [];

  // Remove overlay elements
  overlayElements.forEach((el) => el.remove());
  overlayElements = [];
};

const highlightToken = (payload: { tokenName: string; tokenValue?: string; selectors?: string[] }) => {
  const { tokenName, tokenValue, selectors } = payload;

  injectBlinkStyles();
  clearHighlights();

  // Find the story root
  const storyRoot = document.querySelector('#storybook-root') ?? document.body;

  // Use selectors from TokenEntry when available, fall back to full DOM scan
  let matches: ElementMatch[];
  if (selectors && selectors.length > 0) {
    matches = matchElementsBySelectors(storyRoot, selectors);
  } else {
    matches = findElementsUsingToken(storyRoot, tokenName);
  }

  // Highlight ALL matching elements
  if (matches.length > 0) {
    matches.forEach((match, index) => {
      const el = match.element;
      // Apply highlight outline
      el.style.outline = HIGHLIGHT_OUTLINE;
      el.style.outlineOffset = '2px';
      el.classList.add(BLINK_CLASS);
      highlightedElements.push(el);

      // For spacing tokens, add ruler overlay to the first element only
      if (index === 0 && isSpacingToken(tokenName) && tokenValue) {
        const overlay = createRulerOverlay(el, tokenName, tokenValue);
        overlayElements.push(overlay);

        // Also remove blink from overlay after animation
        setTimeout(() => {
          overlay.classList.remove(BLINK_CLASS);
        }, 1200);
      }
    });

    // Remove blink class after animation completes (3 iterations * 0.4s = 1.2s)
    blinkTimeoutId = setTimeout(() => {
      highlightedElements.forEach((el) => el.classList.remove(BLINK_CLASS));
    }, 1200);

    // Use CSS selectors from the matches (includes pseudo-selectors)
    const elementSelectors = matches.map((match) => match.cssSelector);

    // Emit element info back to panel
    const channel = addons.getChannel();
    channel.emit(EVENTS.ELEMENT_INFO, {
      tokenName,
      elementSelector: elementSelectors[0],
      elementSelectors,
      elementCount: matches.length,
    });
  } else {
    // Fallback: first child of story root
    const children = storyRoot.children;
    if (children.length > 0 && children[0] instanceof HTMLElement) {
      const targetElement = children[0];
      targetElement.style.outline = HIGHLIGHT_OUTLINE;
      targetElement.style.outlineOffset = '2px';
      targetElement.classList.add(BLINK_CLASS);
      highlightedElements.push(targetElement);

      blinkTimeoutId = setTimeout(() => {
        targetElement.classList.remove(BLINK_CLASS);
      }, 1200);

      const channel = addons.getChannel();
      channel.emit(EVENTS.ELEMENT_INFO, {
        tokenName,
        elementSelector: targetElement.tagName.toLowerCase(),
        elementSelectors: [targetElement.tagName.toLowerCase()],
        elementCount: 1,
      });
    }
  }
};

// Register event listeners once at module level
let listenersRegistered = false;
function registerHighlightListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  const channel = addons.getChannel();
  channel.on(EVENTS.HIGHLIGHT, highlightToken);
  channel.on(EVENTS.CLEAR_HIGHLIGHT, clearHighlights);
}

// Export default to avoid duplicate const declarations with npm link
export default {
  decorators: [
    ((Story) => {
      // Register highlight listeners once
      registerHighlightListeners();

      // Clear any existing highlights when story changes
      clearHighlights();

      return Story();
    }) as DecoratorFunction,
  ],
};
