// Polyfill for browser compatibility
if (typeof browser === "undefined") globalThis.browser = chrome;

browser.webRequest.onBeforeRequest.addListener(
    listener,
    { urls: ["https://play.pokemonshowdown.com/js/search.js*"] },
    [ "blocking" ]
);

function listener(details) {
    let filter = browser.webRequest.filterResponseData(details.requestId);
    let decoder = new TextDecoder("utf-8");
    let encoder = new TextEncoder();
    let data = "";

    filter.ondata = (event) => data += decoder.decode(event.data, { stream: true });

    filter.onstop = (event) => {
        data += decoder.decode(); // end-of-stream (apparently a necessary thing)

        // write diff patch applier here
        console.log(data.split("\n"));

        filter.write(encoder.encode(data));
        filter.disconnect();
    };
}