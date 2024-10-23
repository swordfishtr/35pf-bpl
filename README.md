# 35 Pokes Filter (block-patch-load)

Intercept [Pokemon Showdown Client](https://github.com/smogon/pokemon-showdown-client) files to implement custom functionality for the 35Pokes community.

This is a diff-utilizing version of [Sam's extension](https://github.com/samuel-peter-chowdhury/PokemonShowdownFilter). There are some benefits in doing so:

- Changes on Showdown's end are reflected in the extension with no need for maintainer involvement.

- Allows cross-extension compatibility with forks from other communities in the future.

There are some drawbacks, too:

- This requires an additional scripting permission (technically only necessary for Chromium users, but we're developing cross-browser).

- Downloads extra files (the patched code and corresponding snapshots to create diffs).

We do this by ... (todo)

Diff patching API: https://github.com/dmsnell/diff-match-patch

Icon: https://github.com/samuel-peter-chowdhury/35PokesShowdownFilter/blob/main/images/35_logo.PNG