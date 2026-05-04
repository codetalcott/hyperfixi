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
      modifiers: Object.assign({}, base.modifiers || {}, ext.modifiers || {}),
    };
  }

  function normalizeElement(elt) {
    var dict = dictFor(elt);
    if (!dict) return;
    // Pass 1: explicit fx-* attribute renames + fx-trigger value translation
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
    // Pass 2: generic on-<event>[.<modifier>...] rewrite (moxi-family).
    // Translates the event name via the values map and each dot-separated
    // modifier via the modifiers map, independently.
    var mods = dict.modifiers || {};
    var onRenames = [];
    for (var k = 0; k < elt.attributes.length; k++) {
      var b = elt.attributes[k];
      if (b.name.indexOf('on-') !== 0) continue;
      var parts = b.name.slice(3).split('.');
      var ev = parts[0];
      var canonEv = dict.values[ev] || ev;
      var canonParts = parts.slice(1).map(function (p) { return mods[p] || p; });
      var newName = 'on-' + canonEv + (canonParts.length ? '.' + canonParts.join('.') : '');
      if (newName !== b.name) onRenames.push([b.name, newName, b.value]);
    }
    for (var m = 0; m < onRenames.length; m++) {
      elt.removeAttribute(onRenames[m][0]);
      elt.setAttribute(onRenames[m][1], onRenames[m][2]);
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
      modifiers: (data && data.modifiers) || {},
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
