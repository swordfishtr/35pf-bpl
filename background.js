// Polyfill for browser compatibility
if (typeof browser === "undefined") globalThis.browser = chrome;

const externalDiffs = {};

browser.runtime.onMessageExternal.addListener(receivedDiff);
browser.runtime.onMessage.addListener(psLoaded);

// Expected message: "entirety of a diff file here"
// We prefer diffs with 3 lines of unified context (diff -u)
function receivedDiff(diff, sender, sendResponse) {
    if(typeof(diff) !== "string") {
        sendResponse("uwu . * (huuuhh?)");
        return;
    }
    externalDiffs[sender.id] = {
        diff: diff,
        sendResponse: sendResponse
    };
}

async function psLoaded(msg, sender, sendResponse) {
    if(msg !== "35pf") {
        sendResponse("uwu . * (huuuhh?)");
        return;
    }
    
    /* const resource_searchjs = await fetch("https://play.pokemonshowdown.com/js/search.js");
    const searchjs = await resource_searchjs.text();

    console.log(searchjs);

    const resource_diff = await fetch("https://swordfishtr.github.io/35pf-bpl/pokemon-showdown-alt/diff1.patch");
    const diff = await resource_diff.text();

    console.log(resource_diff);

    const injection = patch(searchjs, diff);

    console.log(injection); */

    const altsearchjs = await fetch("https://samuel-peter-chowdhury.github.io/pokemon-showdown-alt/search.js");
    const injection = await altsearchjs.text();

    browser.scripting.executeScript({
        target: { tabId: sender.tab.id },
        world: "MAIN",
        func: (searchjs) => eval(searchjs),
        args: [injection]
    }); //.then() message any additional diff senders informing them of the injection result.
    // if our injection fails and there were additional diffs, send our diff to one of them and rely on their code.
}


function patch(src, diff) {
    // diff: + additions, - removals, @ expected lines, (space) context

    const srcArray = src.split("\n");
    const diffArray = diff.split("\n");

    // starting from the end going backwards for performance reasons (also easier on my brain)
    for(let i = diffArray.length - 1; i > 0; i--) {
        if(diffArray[i].charAt(0) === "@") {

            // "@@ -259,7 +389,35 @@" to 259
            const position = Number(diffArray[i].split(" ")[1].slice(1).split(",")[0]) - 1;

            // j references line number in src, k references line number in diff
            for(let j = position, k = i + 1; diffArray[k]; k++, j++) {
                const operation = diffArray[k].charAt(0);
                diffArray[k] = diffArray[k].slice(1);

                if(operation === "@") break;

                else if(operation === " ") {
                    // to be implemented
                    continue;
                }

                else if(operation === "-") {
                    // leave the smart stuff to context functionality for now

                    const modified = srcArray.splice(j, 1);

                    // mismatch error (src modified or diff is wrong)
                    if(modified[0] !== diffArray[k]) {
                        console.log("mismatch error! j:" + j + " k:" + k);
                        console.log(srcArray[j]);
                        console.log(diffArray[k]);
                        //return src;
                    }

                    continue;
                }

                else if(operation === "+") {
                    srcArray.splice(j, 0, diffArray[k]);
                    j++; // FIXME: smth is going wrong around here

                    continue;
                }

                // syntax error in diff
                return src;
            }
        }
    }

    // success
    return srcArray.join("\n");
}