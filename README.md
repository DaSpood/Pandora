# Pandora

Pandora is a lootbox-opening simulator.

It supports custom loot tables, allowing you to enjoy free gambling for any game you want (as long as you are willing to
write some JSON first).

It offers 3 opening "modes":

- "Unlimited": open the boxes you want one at a time and see what you get
- "Budget": pick a set amount of starting boxes, and open them until you run out (or let the simulator quickly open
  everything to see the results)
- "Until...": set your goal prize(s) and let the simulator purchase boxes one by one until your goal is reached. You can
  run multiple iterations of this simulation in parallel to generate "best case", "average" and "worst case"
  **estimates** (never take these numbers as definite requirements, it's still just statistics, your mileage WILL vary).

The UI lets you easily setup your session, eliminate rewards you already own from the loot pool, see your opening
history and visualize your rewards and other statistics.

Pandora supports common lootbox mechanics like pity, duplicate prevention/compensation, and of course, "tiered" (aka
"recursive" or "matryoshka") lootboxes ! Why is that a thing ? Go ask Wargaming !

## Context

The simulator was originally created to study lootboxes from the game World Of Tanks PC during the OPERATION PANDORA
event in May 2025, which introduced the concept of "tiered" lootboxes. This system caused a lot of confusion and
misinformation in the community regarding drop rates and budgeting estimates.

The goal is to let players experience the lootboxes without spending money (gambling is epic, financial ruin is not),
get a feel for the odds, and get all the information and stats they need to make more informed purchase decisions, with
better accuracy than rough napkin maths and entry-level Excel spreadsheets would provide (especially for the scenario of
tiered lootboxes, that are purposely overly complicated to make mathematical estimations too unreliable).

Some elements of the loot table structure may seem confusing in a different context (mainly the "tiered lootboxes"
system). However, it still aims to be compatible with most common implementations of lootboxes in gaming, including
popular gacha games, but the main focus is for it to work World Of Tanks PC's lootbox events, for which I will keep
providing loot tables myself when possible.

## Where to use

You can try the simulator online at https://daspood.github.io/.

You can also run the code locally by cloning the repository and checking the scripts in the [package.json](package.json)
file.

Note that, in both cases, everything runs in your browser, there is no server, so keep that in mind before launching
tens of thousands of simulations in parallel. Your CPU will scream, not mine.

## How to use

You can find pictures of the interface and explanation for each button in [this directory](docs). The file names are
self explanatory.

## Technical details

### Loot table

The algorithm will use a specified loot table to handle everything in a rolling session. Everything the algorithm does,
including how it handles its configuration, depends on the loaded loot table.

The loot table format is very specific, and well documented in [this file](src/types/lootTable.d.ts), you can find
provided samples in [this directory](src/assets/lootTables). The format should now be stable, any future change will
hopefully be optional and not break existing loot tables. If breaking changes eventually happen, I will try to have
backwards compatibility one way or another.

The loaded loot table will be fully validated and type checked to make sure it will work with the simulator. The
validator, available [here](src/scripts/lootTableValidator.ts), only checks that the expected (documented) fields are
valid, but ignores undocumented fields, so check for typos yourself. Everything else in the app assumes the loaded loot
table is valid, things **will** break if it's not.

If you want to write your own loot table for a game with somewhat complicated lootbox mechanics, take the time to really
think about what these mechanics imply and how you can "translate" them into more common mechanics. For example:

- CS:GO's stat track addon is just a duplicate of a weapon skin drop with the stat track slapped on it. You could
  represent it as an auto-opening recursive lootbox, or you could simply have both variants of the skin in the same loot
  pool and adapt their respective dropRate.

- Some gacha's 50/50 system really just means the 5-star drop is an auto-opening recursive lootbox with a pity of 1,
  where its own main prize is the banner character and the filler slot is a standard character.

- If your duplicate compensation drop contains multiple items (usually specific-shards and generic-shards, or upgrade
  item and a bit of currency), do you *really* need to represent all of it in the loot table, or can you simply allow
  duplicates / only represent the generic currency and let the player do the math on their own for the specific item?

- Genshin Impact's Capturing Radiance ? Your bad luck should have made you quit long before this mechanic becomes
  relevant. *I don't want to think about implementing this one...*

Overall, try to keep it simple. Some mechanics are overly complicated, but can either be dumbed down to a more simple
mechanic, or ignored because the details aren't that important.

### Opening algorithm

The algorithm is simple enough, here is an overview of how it opens one selected lootbox:

1) It checks for the current pity. If soft or hard pity is reached, it artificially increases the drop rate of the
   corresponding prizes accordingly.
2) It opens the box by checking each available loot "slot", rolling the RNG to decide if it should open that slot, and
   rolling the RNG again to pick a random item inside this slot's options.
3) It checks the results to see if an important prize was obtained, and updates the pity accordingly.
4) It updates the various counters used to gather statistics.
5) It applies any anti-duplication rules on the loot table (for example, removing items and replacing them with a
   compensation prize).
6) *Voilà!*, the result can now be displayed.

The code can be found in [this file](src/scripts/openingSessionManager.ts), with `openOneAndUpdateState` as the
entrypoint function. I trust that this file is well documented and organized enough to make understanding the
algorithm easy. If you are not a developer or trying to write your own loot table, you probably don't need to worry
about it too much.

## Contribute

The license is purposely not restrictive at all. Do what you want with the code. I'd appreciate a shoutout if you
publish something that uses my code, but I won't be mad if you don't.

If you want to add your own loot tables to this repo, feel free to open a pull request, and I'll look into it when I
have time. The file name should be `<game_and_platform_if_needed>-<YYYY_MM>-<event_name>.json`. However, note that I am
not familiar with that many games, so I will only accept loot tables where the `source` root field contains a URL to
either an official article or a community-accepted compilation of dropRates (preferably a post on official forums, or on
a dedicated subreddit, so that there is some proof of community acceptance).

When it comes to pull requests about the algorithm itself, I will not accept changes that alter the algorithm too much,
for two reasons:

- I want to keep it working mainly for World Of Tanks PC, or otherwise be as generic as possible, so I am not interested
  in adding extra processing for specific games
- I want to avoid breaking compatibility with existing loot tables, so no structure changes unless absolutely necessary

So if it's a bugfix or QoL stuff, sure, but for anything more complex/specific, you're probably better off forking the
repo and adapting the code to your specific needs.