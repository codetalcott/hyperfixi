/*
 * dixi — i18n for fixi-family attribute names.
 * BSD-0 licensed. Load BEFORE fixi/moxi/ssexi.
 *
 * Locale resolution ported from @lokascript/hyperscript-adapter (MIT).
 */
(function (root) {
  'use strict';

  var registry = {};

  function normLang(s) { return s.split('-')[0].toLowerCase(); }

  function resolveLang(elt) {
    if (!elt.closest) return null;
    var v = elt.getAttribute('data-lang');
    if (v) return normLang(v);
    var dxAnc = elt.closest('[data-dixi-lang]');
    if (dxAnc) return normLang(dxAnc.getAttribute('data-dixi-lang'));
    var langAnc = elt.closest('[lang]');
    if (langAnc) {
      var l = normLang(langAnc.getAttribute('lang'));
      return l === 'en' ? null : l;
    }
    var cfg = root.dixiCfg;
    return (cfg && cfg.locale) ? normLang(cfg.locale) : null;
  }

  function dictFor(elt) {
    var lang = resolveLang(elt);
    if (!lang || lang === 'en') return null;
    var base = registry[lang];
    if (!base) return null;
    var ext = root.dixiCfg && root.dixiCfg.extend && root.dixiCfg.extend[lang];
    if (!ext) return base;
    return {
      attrs: Object.assign({}, base.attrs, ext.attrs || {}),
      values: Object.assign({}, base.values, ext.values || {}),
    };
  }

  function normalizeElement(elt) {
    var dict = dictFor(elt);
    if (!dict) return;
    var renames = [];
    for (var i = 0; i < elt.attributes.length; i++) {
      var a = elt.attributes[i];
      var canonical = dict.attrs[a.name];
      if (canonical) renames.push([a.name, canonical, a.value]);
    }
    for (var j = 0; j < renames.length; j++) {
      var oldName = renames[j][0], canon = renames[j][1], val = renames[j][2];
      elt.removeAttribute(oldName);
      var newVal = (canon === 'fx-trigger' && dict.values[val]) ? dict.values[val] : val;
      elt.setAttribute(canon, newVal);
    }
  }

  function rewrite(rootEl) {
    if (!rootEl) rootEl = document.body;
    if (rootEl.nodeType === 1) normalizeElement(rootEl);
    var walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_ELEMENT);
    var node = walker.nextNode();
    while (node) { normalizeElement(node); node = walker.nextNode(); }
    document.dispatchEvent(new CustomEvent('dx:rewrote', { detail: { root: rootEl } }));
  }

  function register(locale, data) {
    registry[normLang(locale)] = {
      attrs: (data && data.attrs) || {},
      values: (data && data.values) || {},
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { rewrite(document.body); });
  } else {
    rewrite(document.body);
  }

  new MutationObserver(function (muts) {
    for (var m = 0; m < muts.length; m++) {
      var added = muts[m].addedNodes;
      for (var n = 0; n < added.length; n++) {
        if (added[n].nodeType === 1) rewrite(added[n]);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  root.dixi = { register: register, rewrite: rewrite };
})(typeof globalThis !== 'undefined' ? globalThis : this);
