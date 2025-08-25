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
