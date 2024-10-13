// Polyfill for browser compatibility
if (typeof browser === "undefined") globalThis.browser = chrome;

//const externalPatches = {}; // for x in externalPatches

browser.runtime.onMessage.addListener(psLoaded);

//browser.runtime.onMessageExternal.addListener();


async function psLoaded(msg, sender) {
    if(msg !== "35pf") return;
    
    //const searchjs = await fetch("https://play.pokemonshowdown.com/js/search.js");
    //const diff = await fetch("https://swordfishtr.github.io/35pf-webrequest/pokemon-showdown-alt/diff2.patch");

    const altsearchjs = await fetch("https://samuel-peter-chowdhury.github.io/pokemon-showdown-alt/search.js");
    const injection = await altsearchjs.text();

    browser.scripting.executeScript({
        target: { tabId: sender.tab.id },
        world: "MAIN",
        func: injectSearchjs,
        args: [injection]
    });
}

function injectSearchjs(searchjs) {
    eval(searchjs);
}

// We'll prefer diffs with 3 lines of unified context (diff -u)
