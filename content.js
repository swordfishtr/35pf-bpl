(() => {
    // Polyfill for browser compatibility
    if (typeof browser === "undefined") globalThis.browser = chrome;

    if(globalThis.hasRun_35pf) return;
    globalThis.hasRun_35pf = true;

    browser.runtime.sendMessage("35pf");
})();