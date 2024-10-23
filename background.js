import { diff_match_patch } from "./index.js";
const DMP = new diff_match_patch();

// Polyfill for browser compatibility
if (typeof browser === "undefined") globalThis.browser = chrome;

const KEY_PATCHES = "patches";
const KEY_COMPAT_EXTERNAL = "compat_external";
const KEY_EXTERNAL_PREFIX = "patches_";

// TODO: (roadmap)
// We will use this array to determine which extension gets to inject the final script.
// IDs are ordered by priority; if all of them are present, friends[0] gets to do it.
// Establish currently installed friends via FriendHello.
// If all higher priority extensions are absent, perform the injection.
// Otherwise message the higher priority extensions with your non-final files.
// Our policy will be to add newer extensions further back because older extensions likely won't be aware of the newer ones and want to perform the injection.
// It should be possible to have the extensions [A,B,C] where A isn't aware of C, but B is, so A gets passed C's patches regardless.
// Extensions with compat_external disabled should behave as usual except they should not apply their own patches.
// We must take the messaging api very seriously.
const friends = [browser.runtime.id, "35pf_snort.demirab1@smogon"];
const badResponse = "uwu . * (huuuhh?)";

browser.runtime.onMessage.addListener(psLoaded);
browser.runtime.onMessageExternal.addListener(receiveFriendHello);

async function psLoaded(msg, sender, sendResponse) {
    if(msg !== "35pf") {
        sendResponse(badResponse);
        return;
    }

    const stored = await browser.storage.local.get({
        [KEY_PATCHES]: null,
        [KEY_COMPAT_EXTERNAL]: true // TODO: flip before full release
    });
    
    // current default file, full
    const res_def_cur = await fetch("https://play.pokemonshowdown.com/js/search.js");
    const def_cur = await res_def_cur.text();

    if(!stored[KEY_PATCHES]) {
        const patches = await getPatches();
        browser.storage.local.set({ [KEY_PATCHES]: patches });
        stored[KEY_PATCHES] = patches;
    }

    sendFriendHello(stored[KEY_PATCHES]);

    let injection = DMP.patch_apply(stored[KEY_PATCHES], def_cur)[0];

    if(stored[KEY_COMPAT_EXTERNAL]) {
        const external = await browser.storage.local.get(friends);
        for( let x in external ) {
            console.log("Applying patch from " + x);
            const application = DMP.patch_apply(external[x], injection);
            injection = application.shift();
            console.log(application);
        }
    }

    browser.scripting.executeScript({
        target: { tabId: sender.tab.id },
        world: "MAIN",
        func: (searchjs) => eval(searchjs),
        args: [injection]
    }); //.then() message any additional diff senders informing them of the injection result.
    // if our injection fails and there were additional diffs, send our diff to one of them and rely on their code.
}

// TODO: accept argument for which file
//(currently we only modify /js/search.js but that won't necessarily be true in the future)
async function getPatches() {

    // modified file, full
    const res_mod = await fetch("https://samuel-peter-chowdhury.github.io/pokemon-showdown-alt/search.js");
    const mod = await res_mod.text();

    // snapshot of default file the modification was based on, full
    const res_def_mod = await fetch("https://swordfishtr.github.io/35pf-bpl/pokemon-showdown-alt/search.js");
    const def_mod = await res_def_mod.text();

    return DMP.patch_make(def_mod, mod);

}

// FriendHello functionality below is harmless and can be used as much as you want.

function sendFriendHello(patches) {
    friends.forEach((id) => {
        // Don't send message to self (what would happen?) (they will find you)
        if(id === browser.runtime.id) return;
        browser.runtime.sendMessage(id, patches).then((answer) => {
            // TODO: handle responses
            if(answer) console.log("Hello acknowledged by " + id);
            else console.log("Hello ignored by " + id);
        }).catch((err) => {
            console.log("Compatible extension is not installed: " + id);
        });
    });
}

// Expected message: DMP.patch_obj[]
async function receiveFriendHello(patches, sender, sendResponse) {

    // We only accept patches from a hardcoded list of extensions for security reasons.
    if(!friends.includes(sender.id)) {
        sendResponse(badResponse);
        return;
    }

    // TODO: actually check contents
    if(!Array.isArray(patches)) {
        sendResponse(badResponse);
        return;
    }

    browser.storage.local.set({ [KEY_EXTERNAL_PREFIX + sender.id]: stored[KEY_EXTERNAL] });

}
