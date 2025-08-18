# Pandora

Pandora is a lootbox-opening simulator.

It supports custom loot tables, allowing you to enjoy free gambling for any game you want (as long as you are willing to
write some JSON first).

It offers 3 opening "modes":

- "single": opens one box at a time
- "budget": opens a given number of boxes rapidly and gives you a recap of the rewards obtained
- "until": opens boxes one by one until a given goal is achieved (a specific reward, all rewards...) and gives you a
  recap of rewards obtained, as well as how many boxes were required. You can run thousands of iterations of
  this simulation to generate "best case", "average" and "worst case" **estimates**.

Pandora supports common lootbox mechanics like pity, duplicate prevention/compensation, and of course, "tiered" (aka
"recursive" or "matryoshka") lootboxes ! Why is that a thing ? Go ask Wargaming !

## Context

The simulator was originally created to study lootboxes from the game World Of Tanks PC, specifically for the OPERATION
PANDORA event in May 2025 which introduced the concept of "tiered" lootboxes. This system caused a lot of confusion and
misinformation in the community regarding drop rates and budgeting estimates.

Some elements of the loot table structure may seem confusing in a different context (mainly the "tiered lootboxes"
system). However, it still aims to be compatible with most common implementations of lootboxes in gaming, including
popular gacha games, but the main focus is for it to work World Of Tanks PC's lootbox events.

There are three main goals here:

- let people experience infinite gambling for their favorite game without spending their real money (gambling is epic,
  financial ruin is not)
- let people simulate a certain amount of openings, so they can get a better picture of what their odds are and make
  better informed decisions
- let people simulate large numbers of box openings to get estimates of "how many boxes are needed to obtain X reward",
  with better accuracy than rough napkin maths and entry-level Excel spreadsheets would provide (especially for the
  scenario of tiered lootboxes, that are purposely overly complicated to make mathematical estimations too unreliable)

That being said, I do not claim to have the perfect simulator and it is very possible (likely, even) that I missed some
steps or misidentified what's actually going on in the algorithm. This is the result of a lot of educated guesses based
on the very complete and suspiciously specific format of the officially published drop rates for OPERATION PANDORA
(information that is legally required to be public in Korea, which is why I decided to trust the format).

I will try to keep providing loot tables for future (and maybe past) lootbox events for World Of Tanks PC, and maybe
add one or two events from a different game as an example for anyone who wishes to try it for different scenarios.

## Where to use

*Right now, nothing is ready, this is a work in progress and I am in the process of porting the original Python code.*

You can try the simulator online at https://daspood.github.io/.

You can also run the code locally by cloning the repository and check the scripts in the [package.json](package.json)
file.

Note that, in both cases, everything runs on your browser, there is no server, so keep that in mind before launching
tens of thousands of simulations in parallel. Your CPU will scream, not mine.

## How to use

TODO: no point in writing this section until the UI is somewhat final. Until then, I trust that the UI will be intuitive
enough.

## The Algorithm

### Loot table

The algorithm will use a specified loot table to handle everything in a rolling session. The loot table format is very
specific, and well documented in [this file](src/types/lootTable.d.ts), you can find provided samples in
[this directory](src/assets/lootTables). Everything the algorithm does, including how it handles its configuration,
depends on the loaded loot table.

The loaded loot table will be fully validated and type checked to make sure it will work with the simulator.

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

TODO: still need to clarify how this will work.

The simulator will let you save and load configs to not have to manually pick every parameter every time.

### RNG rolls

During a `Lootbox` opening, the algorithm will iterate over each element of the `lootSlots` list and, for each slot, do
a roll to see if the slot "drops". Once a `LootSlot` has "dropped", the algorithm will then do another roll to pick a
single group amongst the slot's `lootGroups`. And finally, it does another roll to pick a single reward amongst the
`LootGroup`'s `lootItems`.

### Pity

After a box is opened, the algorithm will check that one of the reward belongs to the "main" or "secondary" prize slot.
If a special prize is found, the pity counter for this lootbox and this special prize is reset. If not, the pity counter
is updated.

Once a player "reaches hardPity" (the pity counter is equal to the hardPity setting), the dropRate of the "main prize"
slot will be artificially increased to 100% for the next opening.

If a "soft" pity mechanic exists, the special prize slot's dropRate will linearly increase starting when the softPity is
reached, and until it reaches 100% when hardPity is reached. For example, if the base dropRate is 1%, softPity is at 65,
and hardPity is at 90, it means the slot's dropRate will be equal to 4.96% on box number 65, and will keep increasing by
3.96% (additively) every further box until the main prize drops.

### Duplicates

The extra logic used to handle duplicates is a bit tough to word properly, as it depends a lot on what "mode" was
chosen for specific lootboxes and items, so I will let you read the code directly. It's not actually that complicated
and you don't need to worry about it too much until you are writing your own loot table.

### Tiered boxes

The "tiered boxes" mechanic has little impact on individual box openings. They matter when simulating multiple openings,
whether in "budget" or "until" mode, to properly handle the extra drops generated by recursive lootboxes.

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