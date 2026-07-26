(() => {
  const CONTROLLER_KEY = '__usdAutoConverterController';
  if (globalThis[CONTROLLER_KEY]) return;

  const { DEFAULTS } = globalThis.UsdAutoConverterCurrencies;
  const { findPrices } = globalThis.UsdAutoConverterPriceParser;
  const { findSplitPriceMatches } = globalThis.UsdAutoConverterSplitPrice;
  const {
    WRAPPER_CLASS,
    ANNOTATION_CLASS,
    isExcludedElement,
    buildAnnotationText,
    buildAnnotationTitle,
  } = globalThis.UsdAutoConverterContentLogic;

  const ORIGINAL_ATTRIBUTE = 'data-usd-auto-converter-original';
  const SPLIT_ATTRIBUTE = 'data-usd-auto-converter-split';
  const DEBOUNCE_MS = 150;
  const MAX_SPLIT_TEXT_LENGTH = 160;
  const MAX_SPLIT_TEXT_NODES = 12;
  const MAX_SPLIT_ANCESTOR_DEPTH = 4;

  let enabled = false;
  let rateData = null;
  let observer = null;
  let scanTimer = null;
  let initialised = false;
  const pendingRoots = new Set();

  const controller = Object.freeze({
    initialise,
    setEnabled,
    get enabled() { return enabled; },
  });
  globalThis[CONTROLLER_KEY] = controller;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message) return undefined;

    if (message.type === 'USD_AUTO_CONVERTER_PING') {
      sendResponse({ ready: true, enabled });
      return undefined;
    }

    if (message.type === 'USD_AUTO_CONVERTER_SET_ENABLED') {
      setEnabled(Boolean(message.enabled))
        .then(() => sendResponse({ ready: true, enabled }))
        .catch(() => sendResponse({ ready: true, enabled: false }));
      return true;
    }

    return undefined;
  });

  async function initialise() {
    if (initialised) return;
    initialised = true;

    chrome.storage.onChanged.addListener(handleStorageChange);
    const preferences = await chrome.storage.sync.get(DEFAULTS);
    const shouldEnable = typeof preferences.autoConvert === 'boolean'
      ? preferences.autoConvert
      : DEFAULTS.autoConvert;
    await setEnabled(shouldEnable);
  }

  async function setEnabled(nextEnabled) {
    if (!nextEnabled) {
      deactivate();
      return;
    }
    await activate();
  }

  async function activate() {
    enabled = true;
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_RATES' });
      if (!response?.ok) {
        rateData = null;
        return;
      }
      rateData = response.data;
      scanRoot(document.body);
      startObserver();
    } catch {
      rateData = null;
    }
  }

  function deactivate() {
    enabled = false;
    rateData = null;
    stopObserver();
    clearTimeout(scanTimer);
    pendingRoots.clear();
    removeAnnotations();
  }

  function handleStorageChange(changes, areaName) {
    if (areaName !== 'sync' || !changes.autoConvert) return;
    setEnabled(Boolean(changes.autoConvert.newValue));
  }

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver((records) => {
      if (!enabled || !rateData) return;

      for (const record of records) {
        if (record.type === 'characterData') {
          if (isConverterOwnedNode(record.target)) continue;
          if (record.target.parentElement) pendingRoots.add(record.target.parentElement);
          continue;
        }

        for (const node of record.addedNodes) {
          if (isConverterOwnedNode(node)) continue;
          if (node.nodeType === Node.TEXT_NODE && node.parentElement) pendingRoots.add(node.parentElement);
          if (node.nodeType === Node.ELEMENT_NODE) pendingRoots.add(node);
        }
      }

      schedulePendingScan();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function stopObserver() {
    observer?.disconnect();
    observer = null;
  }

  function schedulePendingScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      const roots = [...pendingRoots];
      pendingRoots.clear();
      for (const root of roots) {
        if (root.isConnected) scanRoot(root);
      }
    }, DEBOUNCE_MS);
  }

  function scanRoot(root) {
    if (!enabled || !rateData || !root) return;

    if (root.nodeType === Node.TEXT_NODE) {
      processTextNode(root);
      scanSplitAncestors(root.parentElement);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || isExcludedElement(root)) return;

    const textNodes = collectEligibleTextNodes(root);
    for (const textNode of textNodes) processTextNode(textNode);
    processSplitCandidates(root, textNodes);
  }

  function collectEligibleTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
        if (isExcludedElement(node.parentElement)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    return textNodes;
  }

  function processTextNode(textNode) {
    if (!textNode.parentElement || isExcludedElement(textNode.parentElement)) return;
    const text = textNode.nodeValue;
    const matches = findPrices(text).filter(({ currency }) => Number.isFinite(rateData.rates?.[currency]));
    if (!matches.length) return;

    const fragment = document.createDocumentFragment();
    let cursor = 0;

    for (const match of matches) {
      fragment.append(document.createTextNode(text.slice(cursor, match.start)));
      const wrapper = document.createElement('span');
      wrapper.className = WRAPPER_CLASS;
      wrapper.setAttribute(ORIGINAL_ATTRIBUTE, match.raw);
      wrapper.append(document.createTextNode(match.raw));

      const annotation = createAnnotation(match);
      if (annotation) wrapper.append(annotation);

      fragment.append(wrapper);
      cursor = match.end;
    }

    fragment.append(document.createTextNode(text.slice(cursor)));
    textNode.replaceWith(fragment);
  }

  function processSplitCandidates(root, originalTextNodes) {
    const candidates = new Set();
    for (const textNode of originalTextNodes) addCandidateAncestors(textNode.parentElement, candidates, root);

    const ordered = [...candidates].sort((a, b) => elementDepth(b) - elementDepth(a));
    for (const element of ordered) processSplitElement(element);
  }

  function scanSplitAncestors(startElement) {
    const candidates = new Set();
    addCandidateAncestors(startElement, candidates, document.body);
    const ordered = [...candidates].sort((a, b) => elementDepth(b) - elementDepth(a));
    for (const element of ordered) processSplitElement(element);
  }

  function addCandidateAncestors(startElement, candidates, boundary) {
    let current = startElement;
    let depth = 0;
    while (current && depth < MAX_SPLIT_ANCESTOR_DEPTH) {
      if (current === document.body || current === document.documentElement) break;
      if (isExcludedElement(current)) break;
      if ((current.textContent || '').trim().length <= MAX_SPLIT_TEXT_LENGTH) candidates.add(current);
      if (current === boundary) break;
      current = current.parentElement;
      depth += 1;
    }
  }

  function processSplitElement(element) {
    if (!element?.isConnected || isExcludedElement(element)) return;
    if (element.hasAttribute(SPLIT_ATTRIBUTE)) return;
    if (element.querySelector(`.${WRAPPER_CLASS}, .${ANNOTATION_CLASS}`)) return;

    const textNodes = collectEligibleTextNodes(element);
    if (textNodes.length < 2 || textNodes.length > MAX_SPLIT_TEXT_NODES) return;

    const matches = findSplitPriceMatches(textNodes.map((node) => node.nodeValue))
      .filter(({ currency }) => Number.isFinite(rateData.rates?.[currency]));
    if (matches.length !== 1) return;

    const annotation = createAnnotation(matches[0]);
    if (!annotation) return;

    element.setAttribute(SPLIT_ATTRIBUTE, 'true');
    element.append(annotation);
  }

  function createAnnotation(match) {
    const annotationText = buildAnnotationText(match.amount, rateData.rates[match.currency]);
    if (!annotationText) return null;

    const annotation = document.createElement('span');
    annotation.className = ANNOTATION_CLASS;
    annotation.textContent = ` ${annotationText}`;
    annotation.title = buildAnnotationTitle(
      match.currency,
      rateData.rates[match.currency],
      rateData.dates?.[match.currency],
    );
    return annotation;
  }

  function isConverterOwnedNode(node) {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return Boolean(element?.closest?.(`.${WRAPPER_CLASS}, .${ANNOTATION_CLASS}`));
  }

  function elementDepth(element) {
    let depth = 0;
    let current = element;
    while (current?.parentElement) {
      depth += 1;
      current = current.parentElement;
    }
    return depth;
  }

  function removeAnnotations() {
    for (const annotation of document.querySelectorAll(`.${ANNOTATION_CLASS}`)) annotation.remove();

    for (const wrapper of document.querySelectorAll(`.${WRAPPER_CLASS}`)) {
      const parent = wrapper.parentNode;
      if (!parent) continue;
      while (wrapper.firstChild) parent.insertBefore(wrapper.firstChild, wrapper);
      wrapper.remove();
      parent.normalize?.();
    }

    for (const element of document.querySelectorAll(`[${SPLIT_ATTRIBUTE}]`)) {
      element.removeAttribute(SPLIT_ATTRIBUTE);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else {
    initialise();
  }
})();
