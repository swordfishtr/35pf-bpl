/* ROADMAP:
We will use the friends array to determine which extension gets to inject the final script.
IDs are ordered by priority; if all of them are present, friends[0] gets to do it.
Establish currently installed friends via FriendHello.
If all higher priority extensions are absent, perform the injection.
Otherwise message the higher priority extensions with your non-final files.
Our policy will be to add newer extensions further back because older extensions likely won't be aware of the newer ones and want to perform the injection.
It should be possible to have the extensions [A,B,C] where A isn't aware of C, but B is, so A gets passed C's patches regardless. (confirmed this works)
Extensions with compat_external disabled should behave as usual except they should not apply their own patches.

We should reduce fetch usage for cases like several tabs loading Showdown successively/in parallel.
It is also possible to store patches or even patched documents for reuse limited to some arbitrary time TBD. */

import { diff_match_patch } from "./index.js";
const DMP = new diff_match_patch();

// Polyfill for browser compatibility
if (typeof browser === "undefined") globalThis.browser = chrome;

console.log("My id: " + browser.runtime.id);

//const KEY_PATCHES = "patches";
const KEY_COMPAT_EXTERNAL = "compat_external";
//const KEY_EXTERNAL_PREFIX = "patches_";
const KEY_PATCH_ORDER = "patchOrder";

const MSG_HELLO = "FriendHello";
const MSG_ACKNOWLEDGE = "Acknowledge";

// Highest priority to lowest. Make sure for each extension that its IDs for various browsers are adjacent.
const friends = [
    browser.runtime.id,

    "35pf_snort.demirab1@smogon",
    "cfgdlecmafiapibnjbbhidnpbjgoploa"
];

const tabList = [];

// Startup ping, wait a little for the other extensions to load just in case.
setTimeout(sendFriendHello, 50);

browser.runtime.onMessage.addListener(psLoaded);
browser.runtime.onMessageExternal.addListener(receiveMessage);

async function psLoaded(msg, sender, sendResponse) {
    if(msg !== "35pf") return;

    await sendFriendHello();

    const stored = await browser.storage.local.get({
        //[KEY_PATCHES]: null, // TODO: implement (optimization)
        [KEY_COMPAT_EXTERNAL]: true,
        [KEY_PATCH_ORDER]: friends
    });

    if(stored[KEY_PATCH_ORDER][0] === browser.runtime.id) tabList.push(sender.tab.id);

    // If we're the only compatible extension, skip the chain.
    // If we're the last in line, start the chain.
    // If not wait for our turn.
    const len = stored[KEY_PATCH_ORDER].length;
    if(len === 1) {
        const patches = await fetchMods(true);
        browser.scripting.executeScript({
            target: { tabId: tabList.shift() },
            world: "MAIN",
            func: (files) => eval(files),
            args: [patches]
        });
    }
    else if(stored[KEY_PATCH_ORDER][len - 1] === browser.runtime.id) {
        // current default file, full
        const res_def_cur = await fetch("https://play.pokemonshowdown.com/js/search.js");
        const def_cur = await res_def_cur.text();

        if(!stored[KEY_COMPAT_EXTERNAL]) sendPatchedFiles(def_cur);
        else {
            const patches = await fetchMods(false);
            const patchedFiles = DMP.patch_apply(patches, def_cur)[0];
            // possibly do things here with [1]
            sendPatchedFiles(patchedFiles);
        }
    }    
}

// TODO: accept argument for specific file
// (for if/when we modify more than /js/search.js)
// (low priority, requires edits everywhere)
async function fetchMods(solo) {

    // modified file, full
    const res_mod = await fetch("https://samuel-peter-chowdhury.github.io/pokemon-showdown-alt/search.js");
    const mod = await res_mod.text();

    if(solo) return mod;

    // snapshot of default file the modification was based on, full
    const res_def_mod = await fetch("https://swordfishtr.github.io/35pf-bpl/pokemon-showdown-alt/search.js");
    const def_mod = await res_def_mod.text();

    return DMP.patch_make(def_mod, mod);

}

// This is ping. Determine which compatible extensions are present.
function sendFriendHello() {

    return Promise.all(friends.map(async (id, index) => {

        // No need to message self
        if(id === browser.runtime.id) return id;

        try {
            const answer = await browser.runtime.sendMessage(id, MSG_HELLO);
            if(answer === MSG_ACKNOWLEDGE) {
                console.log("Hello acknowledged by " + id);
                return id;
            }
            else if(answer) {
                console.log("Received unknown response from " + id + "\nThis is probably for a feature that we don't support.");
            }
            else console.warn("No response from " + id + "\nAn attacker might be impersonating this extension!");
        } catch(err) {
            console.log("Compatible extension is not installed: " + id);
        }  

    })).then((patchOrder) => {
        // This is friends but with the absent ones removed. Use it to determine:
        // 1. if we are the one to perform injection (if we are index 0)
        // 2. who to accept patches from (our index + 1 if that exists, otherwise start the chain with our modified files)
        browser.storage.local.set({ [KEY_PATCH_ORDER]: patchOrder.filter(n => n) });
    });
    
}

// TODO: Use [KEY_PATCH_ORDER]:friends here instead of friends
function sendPatchedFiles(files) {
    //           string for now ^

    friends.forEach((id) => {

        // No need to message self
        if(id === browser.runtime.id) return;

        browser.runtime.sendMessage(id, files).then((answer) => {
            if(answer === MSG_ACKNOWLEDGE) {
                // Low priority: It would be good to know whether this extension chose us to receive files from.
                console.log("Patched files acknowledged by " + id);
            }
            else if(answer) {
                console.log("Received unknown response from " + id + "\nThis is probably for a feature that we don't support.");
            }
            else console.warn("No response from " + id + "\nAn attacker might be impersonating this extension!");
        }).catch((err) => {
            console.log("Compatible extension is not installed: " + id);
        });

    });
}

// Expected message: MSG_HELLO or patched files (string) (later string[])
function receiveMessage(msg, sender, sendResponse) {(async () => {

    // We don't talk to strangers for security reasons.
    if(!friends.includes(sender.id)) return;

    if(msg === MSG_HELLO) {
        console.log("Received hello from " + sender.id);
        sendResponse(MSG_ACKNOWLEDGE);
    }
    else if(typeof(msg) === "string") {
        console.log("Received patched files from " + sender.id);

        const stored = await browser.storage.local.get({
            [KEY_COMPAT_EXTERNAL]: true,
            [KEY_PATCH_ORDER]: friends
        });
        
        const myIndex = stored[KEY_PATCH_ORDER].indexOf(browser.runtime.id);
        if(stored[KEY_PATCH_ORDER].indexOf(sender.id) === myIndex + 1) {

            let injection;
            if(stored[KEY_COMPAT_EXTERNAL]) {
                const patches = await fetchMods(false);
                injection = DMP.patch_apply(patches, msg)[0];
                // possibly do things here with [1]
            }
            else injection = msg;

            if(myIndex === 0) {

                const result = await browser.scripting.executeScript({
                    target: { tabId: tabList.shift() },
                    world: "MAIN",
                    func: (files) => eval(files),
                    args: [injection]
                });
                // possibly do things here with result
                // TODO: if our injection fails and there were external patches,
                // send our injection to the newest known compatible extension and rely on their code.
                // They should then do the same in case of fail.

            }
            else sendPatchedFiles(injection);

            sendResponse(MSG_ACKNOWLEDGE); // would-be "chose your files"
        } else sendResponse(MSG_ACKNOWLEDGE); // would-be "didnt choose u"
        
    }
    else console.log("Received unknown message from " + sender.id + "\nThis is probably for a feature that we don't support.");
    
})(); return true;}
