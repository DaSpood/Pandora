# Pandora

Pandora is a lootbox-opening simulator.

It supports custom loot tables, allowing you to enjoy free gambling for any game you want (as long as you are willing to
write some JSON first if that game is not World Of Tanks).

It offers 3 opening "modes":

- "unlimited": open the boxes you want one at a time and see what you get
- "budget": pick a set amount of starting boxes, and open them until you run out (or let the simulator quickly open
  everything to see the results)
- "until": set your goal prize(s) and let the simulator purchase boxes one by one until your goal is reached. You can
  run thousands of iterations of this simulation to generate "best case", "average" and "worst case" **estimates**
  (never take these numbers as definite requirements, it's still just statistics, your mileage WILL vary).

The UI lets you easily setup your session, eliminate rewards you already own from the loot pool, see your opening
history and visualize your rewards and other statistics.

Pandora supports common lootbox mechanics like pity, duplicate prevention/compensation, and of course, "tiered" (aka
"recursive" or "matryoshka") lootboxes ! Why is that a thing ? Go ask Wargaming !

Current status of planned features:

- Loot table loading: **OK**
- "Unlimited" mode: **OK**
- "Budget" mode: **OK**
- "Until" mode: **not implemented yet**
- Settings: mode selector and pre-owned rewards **OK**, import/export **not implemented yet**
- Session stats: **raw JSON dump**
- Opening history: **raw JSON dump**

Next WIP (in order):

- prettier session stats and JSON export (v0.4.0)
- prettier opening history and JSON export (v0.4.0)
- "Until" mode in single-iteration (v0.5.0)
- "Until" mode in multi-iterations (v1.0.0)
- Dedicated stats for "Until" mode in multi-iterations (v1.0.0)
- Settings import/export as JSON (v1.0.0)
- Improve mobile experience (after v1.0.0)

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

You can also run the code locally by cloning the repository and check the scripts in the [package.json](package.json)
file.

Note that, in both cases, everything runs on your browser, there is no server, so keep that in mind before launching
tens of thousands of simulations in parallel. Your CPU will scream, not mine.

## How to use

I hope the UI is clear enough for now. I will add a more detailed explanation once it is closer to completion.

## Technical details

### Loot table

The algorithm will use a specified loot table to handle everything in a rolling session. The loot table format is very
specific, and well documented in [this file](src/types/lootTable.d.ts), you can find provided samples in
[this directory](src/assets/lootTables). Everything the algorithm does, including how it handles its configuration,
depends on the loaded loot table.

The loaded loot table will be fully validated and type checked to make sure it will work with the simulator. The
validator, available [here](src/scripts/lootTableValidator.ts), only checks that the expected (documented) fields are
valid, but ignores undocumented fields, so check for typos yourself.

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

***WARNING: THE LOOT TABLE FORMAT IS NOT YET FINALIZED AND MAY STILL CHANGE UNEXPECTEDLY AS I FIGURE OUT HOW TO PROPERLY
HANDLE EVERYTHING. THIS WARNING WILL BE REMOVED ONCE IT'S STABLE.***

### Config

The simulator will let you save and load configs to not have to manually pick every parameter every time. This section
will be expanded when that feature is ready.

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