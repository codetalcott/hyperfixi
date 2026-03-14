/**
 * Augment @kitajs/html JSX types to support the `_` attribute
 * used by _hyperscript on all HTML elements.
 */
declare namespace JSX {
  interface HtmlTag {
    /** _hyperscript behavior attribute */
    _?: undefined | string;
  }
}
