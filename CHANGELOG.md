# v1.0.0

- Add `until` opening mode and associated settings
- Add JSON export / import of settings
    - Importing settings with a loot table checksum mismatch will cause a warning but won't block the import
    - Incompatible settings will simply be ignored. Re-exporting loaded settings will update them to "fit" the current
      loot table
- Add support for "logical" recursive boxes (auto-opening them immediately when dropped, and adding their content to the
  original box's result)
- Add loot table for WoT PC's Holiday Ops 2024 event
- Add loot table for WoT PC's Paint It GREEN! event
- Loot table format is now considered stable. If it needs to be modified, the modification should be new optional fields
  only, and breaking changes should be handled with backwards compatibility.

# v0.4.0

- Rework stats panel
    - Prettier layout with collapsable categories
        - Lootboxes stats: session state for each lootbox (pity, amount opened, amount purchased, amount in
          inventory...)
        - Obtained rewards: self-explanatory (can include unobtained rewards)
        - Opening history: self-explanatory
    - Button to download JSON containing a dump of the session state object, in case anyone would want it
- Remove history panel (merged with stats panel)
- Return github-redirect button to replace history panel button
- Fix opening history bug where the wrong box name was used
- Fix auto-open-everything bug where opening would end without looping back on "previous tier" boxes first

# v0.3.0

- Add purchase modal
    - User can "purchase" a set number of lootboxes when in `budget` opening mode
    - Purchased boxes will be added to the inventory for opening
    - User can choose to bypass loot table rules and still purchase non-purchasable boxes
- Add "Auto-open 1 by 1" and "Auto-open everything" options for `budget` opening mode
    - "Auto-open everything" will open the stats after completion, there is no special result screen for now

# v0.2.0

- Add settings modal
    - User can select opening mode
        - `budget` is available but purchase modal is not ready
        - `unlimited` is locked for now
    - User can select pre-owned prizes for which duplication rules will be pre-applied

# v0.1.1

- Display warning to low-width users because mobile browsers will fuck up the page.

# v0.1.0

- Default UI available
    - Can load loot tables from provided list or user upload. Validation errors will be listed
    - Default mode is "unlimited", no way to change currently
    - Can select which lootbox to open from bottom box list
    - Can open selected box from bottom-center button
    - Can reset session from bottom-right
    - Can show session stats from top-left button panel
    - Can access github repository from top-right button panel
    - Last opening result is displayed in the center
    - Pity countdown of currently selected box is displayed above the box selector
    - Names of game and event are displayed at the top
- Opening algorithm is pretty much complete
    - Still does not support "auto-open-recursive" scenarios
