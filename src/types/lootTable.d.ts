export type DuplicateHandlingMode = 'allowed' | 'replace_individual' | 'replace_all' | 'remove_even' | 'remove_prop';

export type LootDropType = 'main' | 'secondary' | 'filter';

/**
 * The root of the loot tables contains metadata about the "event" / "lootbox family" for this loot table, mostly for
 * documentation and archiving purposes.
 */
export interface LootTable {
    /**
     * Name of the game this loot table is for.
     */
    game: string;
    /**
     * Display name of the event/banner this loot table is for.
     * If there is no official name, make one of your own, as long as it is uniquely identifiable.
     * If the name is not unique, add a uniquely identifiable suffix, like a game version or date.
     * For example:
     * - "Operation Pandora 2025"
     * - "5.8 Phase 1 Ineffa"
     */
    eventName: string;
    /**
     * Starting date of the event, in YYYY-MM-DD format.
     */
    startDate: string;
    /**
     * Ending date of the event, in YYYY-MM-DD format.
     */
    endDate: string;
    /**
     * Whether this event uses a regular or recursive format for lootboxes (recursive lootboxes may contain other
     * lootboxes in their rewards).
     *
     * This field has no impact on the algorithm, it exists only for documentation purposes and loot table validation.
     */
    recursive: boolean;
    /**
     * Whether recursively-dropped lootboxes are auto-opened instantly.
     *
     * Can only be true if `recursive` is also true.
     *
     * If true, all non-purchasable lootboxes will be hidden from the UI (unless restrictions are bypassed) and
     * auto-opened immediately when dropped (their resulting drops will be included as if they belong to the parent box)
     *
     * This can be used to hide logically-tiered lootboxes that only exist to represent deeper systems. For example,
     * Genshin Impact's 50/50 mechanic means the default lootbox's "5 star" (main prize) drop is a recursive lootbox, in
     * which two slots exist: secondary (permanent banner) rewards and main (event banner) rewards, with a hard pity of
     * 1.
     */
    autoOpenRecursive: boolean;
    /**
     * The author of the loot table. So users know who spent their evening writing a json to open fake lootboxes online.
     */
    author: string;
    /**
     * The source used to create the loot table, ideally a URL to an official article by the game publisher.
     */
    source: string;
    /**
     * Extra info / comments about the loot table (i.e. justifying certain non-officially-confirmed stats).
     */
    notes?: string;
    /**
     * The list of lootboxes available in the event.
     *
     * For non-recursive events, should only contain one element.
     */
    lootboxes: Lootbox[];
}

/**
 * The core object of the loot table, it contains metadata about the lootbox itself, like its pity counter, duplicate
 * prevention rules, duplicate compensation rules, etc.
 */
export interface Lootbox {
    /**
     * Display name of the box, needs to be unique.
     */
    name: string;
    /**
     * Url to an image that represents the lootbox.
     */
    pictureUrl?: string;
    /**
     * Whether this tier of lootboxes can be purchased.
     *
     * By default, in all modes, the simulator will only let you open purchasable boxes, though you can choose to bypass
     * this restriction if wanted.
     */
    purchasable: boolean;
    /**
     * How many of this lootbox can the player open before they are guaranteed that the next one contains a drop from
     * the main prize slot.
     *
     * If provided, must be strictly positive.
     *
     * If missing, no pity will be registered (there is never a guarantee to get the main prize).
     */
    mainPrizeHardPity?: number;
    /**
     * How many of this lootbox can the player open before they are increasingly likely to get a drop from the main
     * prize slot. The drop rate increases linearly starting **at** (including) softPity, so that it reaches 100% at
     * hardPity.
     *
     * If mainPrizeHardPity is not provided, this field is forbidden.
     *
     * If provided, must be strictly positive and strictly inferior to mainPrizeHardPity.
     *
     * If missing, no pity will be registered (the dropRate will remain the same until hardPity, if any).
     */
    mainPrizeSoftPity?: number;
    /**
     * How many of this lootbox can the player open before they are guaranteed that the next one contains a drop from
     * the secondary prize slot.
     *
     * If provided, must be strictly positive.
     *
     * If missing, no pity will be registered (there is never a guarantee to get the main prize).
     */
    secondaryPrizeHardPity?: number;
    /**
     * How many of this lootbox can the player open before they are increasingly likely to get a drop from the secondary
     * prize slot. The drop rate increases linearly starting **at** (including) softPity, so that it reaches 100% at
     * hardPity.
     *
     * If secondaryPrizeHardPity is not provided, this field is forbidden.
     *
     * If provided, must be strictly positive and strictly inferior to secondaryPrizeHardPity.
     *
     * If missing, no pity will be registered (the dropRate will remain the same until hardPity, if any).
     */
    secondaryPrizeSoftPity?: number;
    /**
     * How to handle duplicates of the main prize slot (See `LootSlot structure` part of the documentation).
     *
     * For simplification reasons, duplicates are allowed for all items that are not in the main-prize slot. If your
     * specific use case requires duplicate handling for "filler" rewards, feel free to reconsider your life choices.
     * This should probably be LootTable-level already.
     *
     * If "allowed": no special handling, item can be obtained multiple times.
     *
     * If "replace_individual": future occurrences will be replaced with another item, defined per-item
     *                          (See `LootDrop structure` part of the documentation).
     *
     * If "replace_all": future occurrences will be replaced with another item, defined in the `mainPrizeSubstitute`
     *                   field.
     *
     * If "remove_even": once a LootDrop has dropped, it will be removed from the loot table and its drop rate will be
     *                   redistributed EVENLY to other items of the same group (`See LootGroup structure` part of the
     *                   documentation). Once all items are removed, any new main-prize drop will be replaced with
     *                   `mainPrizeSubstitute` or the LootDrop's `substitute`.
     *
     * If "remove_prop": once a LootDrop has dropped, it will be removed from the loot table and its drop rate will be
     *                   redistributed to other items of the same group PROPORTIONALLY to their current drop rate
     *                   (`See LootGroup structure` part of the documentation). Once all items are removed, any new
     *                   main-prize drop will be replaced with `mainPrizeSubstitute` or the LootDrop's `substitute`.
     *
     * WARNING: The choice of redistribution method for the "remove" scenario will have an impact on the accuracy of
     *          results when opening a small number of boxes, or if there are many other items with varying operates
     *          in the same group. For simulating large numbers of boxes, though, this will not matter, as you are bound
     *          to obtain every reward eventually.
     */
    mainPrizeDuplicates: DuplicateHandlingMode;
    /**
     * Same mechanic as `mainPrizeDuplicates` but applies to secondary prizes. Must exist even if there are no secondary
     * slots.
     */
    secondaryPrizeDuplicates: DuplicateHandlingMode;
    /**
     * The "compensation" / replacement drop after every LootDrop has been dropped already, if duplication is not
     * allowed.
     *
     * If `mainPrizeDuplicates` === 'replace_all', this field is mandatory.
     *
     * If `mainPrizeDuplicates` === 'remove_even' || `mainPrizeDuplicates` === 'remove_prop', this field OR
     * `LootDrop.substitute` are mandatory. Only one of the two can exist simultaneously, and `LootDrop.substitute` must
     * exist for all LootDrops if it is chosen (in case neither are present, validation errors will mention
     * `LootDrop.substitute`).
     */
    mainPrizeSubstitute?: LootDropSubstitute;
    /**
     * Same mechanic as `mainPrizeSubstitute` but applies to secondary prizes. Must exist even if there are no secondary
     * slots.
     */
    secondaryPrizeSubstitute?: LootDropSubstitute;
    /**
     * The list of loot "slots" available in the lootbox.
     */
    lootSlots: LootSlot[];
}

/**
 * LootSlots are reward slots that are rolled independently of each other. This means a single lootbox may drop multiple
 * slots.
 *
 * This is used to handle lootboxes that can contain multiple items, usually a guaranteed "baseline reward" item (a
 * token amount of currency), and one or more chance-based items (including the main prize): a single Lootbox can drop
 * as many slots are it contains in its `lootSlots` list.
 *
 * To avoid scenarios where a lootbox is empty, it is highly recommended (but not enforced, who knows what the game
 * industry is capable of, I didn't expect tiered lootboxes to be a thing in the first place...) that at least one of
 * the slots has a drop rate of 1.
 */
export interface LootSlot {
    /**
     * An internal name used to more easily identify the loot slot for debugging.
     */
    alias: string;
    /**
     * The drop rate of the slot. 0 < dropRate <= 1.
     *
     * For example: `0.055` would mean this slot has a 5.5% chance of dropping.
     */
    dropRate: number;
    /**
     * A tag to help the algorithm identify special slots to handle duplicates, pity and recursive boxes.
     *
     * "main": the slot contains the main prizes of this lootbox. Exactly one LootSlot per Lootbox should have this
     *         contentType value.
     *
     * "secondary": the slot contains a secondary prize, also subject to anti-duplication and pity but separate from the
     *              main prize. Zero or one (for now) LootSlot per Lootbox should have this contentType value.
     *              If no specific handling of duplicates or pity is required, **prefer using "filler" instead**,
     *              regardless of the perceived value of the drop, this label is mostly here for technical reasons.
     *
     * "filler": the slot contains filler rewards that require no special handling.
     */
    contentType: LootDropType;
    /**
     * The list of loot "groups" available in the slot.
     *
     * In most cases, one LootSlot should only contain a single LootGroup, but it may be useful to include multiple
     * groups of similar value inside a single slot.
     *
     * If the value of `contentType` is either "main" or "secondary", this list must only contain a single entry
     * (otherwise it becomes too painful to keep track of dropRates during duplication handling, please have mercy).
     */
    lootGroups: LootGroup[];
}

/**
 * LootGroups are reward groups contained within a slot.
 *
 * A single LootSlot can only drop a single LootGroup. This means the sum of the `dropRate` field of each LootGroup in a
 * LootSlot MUST equal 1.
 */
export interface LootGroup {
    /**
     * An internal name used to more easily identify the loot group for debugging.
     */
    alias: string;
    /**
     * The drop rate of the slot. 0 < dropRate <= 1.
     *
     * For example: `0.055` would mean this group has a 5.5% chance of dropping.
     *
     * The sum of the dropRates of all groups contained in a single LootSlot must equal 1.
     */
    dropRate: number;
    /**
     * The list of items available in this group. Items should be of the same nature.
     */
    lootDrops: LootDrop[];
}

/**
 * LootDrops are the final layer of the loot table and represent the actual reward.
 *
 * A single LootGroup can only drop a single LootDrop. This means the sum of the `droprate` field of each LootDrop in a
 * LootGroup MUST equal 1.
 *
 * Note that a LootDrop describes a unique drop, not an unique item. In case your lootbox may drop multiple
 * amounts of the same resource, for example, either 1000 gold or 2000 gold, you would have a single LootGroup
 * encompassing all "gold" drops, and one LootDrop for each gold amount available (same `name`, different `mount` and
 * `droprate`).
 */
export interface LootDrop {
    /**
     * Display name of the dropped item.
     *
     * All items of the same nature MUST share the same name, for example all tier 1 boxes, all tier 2 boxes, all
     * "gold" drops, etc.
     *
     * This will be important to properly aggregate results in the final recap of the simulator (one single "1000 gold"
     * line instead of ten "100 gold" ones).
     *
     * This will also be used to properly handle recursive lootbox drops, as each lootbox is identified by its `name`.
     * So be careful with typos and case sensitivity !
     */
    name: string;
    /**
     * Url to an image that represents the dropped item.
     */
    pictureUrl?: string;
    /**
     * Url to a background image to display behind the item's picture (for example a special color to really insist that
     * the drop is amazing and you deserve extra dopamine for it !)
     */
    backgroundUrl?: string;
    /**
     * The drop rate of the slot. 0 < dropRate <= 1.
     *
     * For example: `0.055` would mean this item has a 5.5% chance of dropping.
     *
     * The sum of the dropRates of all items contained in a single LootGroup must equal 1.
     */
    dropRate: number;
    /**
     * How many of the item is included in a drop, strictly positive integer.
     */
    amount: number;
    /**
     * The "compensation" / replacement drop after every LootDrop has been dropped already, if duplication is not
     * allowed.
     *
     * If not part of the "main" or "secondary" sots, this field is **not** mandatory.
     *
     * If `*PrizeDuplicates` === 'replace_individual', this field is mandatory.
     *
     * If `Lootbox.*PrizeDuplicates` === 'remove_even' || `Lootbox.*PrizeDuplicates` === 'remove_prop', this field
     * OR `Lootbox.*PrizeSubstitute` are mandatory. Only one of the two can exist simultaneously, and `substitute`
     * must exist for all LootDrops in order to be valid  (in case none are present, validation errors will mention
     * `substitute`).
     *
     * In all cases where `substitute` is not mandatory, it is forbidden.
     */
    substitute?: LootDropSubstitute;
}

/**
 * LootDropSubstitutes are identical to LootDrops, except they are "fixed": they do not drop randomly and do not contain
 * another substitute.
 */
export interface LootDropSubstitute {
    /**
     * Display name of the dropped item.
     *
     * All items of the same nature MUST share the same name, for example all tier 1 boxes, all tier 2 boxes, all
     * "gold" drops, etc.
     *
     * This will be important to properly aggregate results in the final recap of the simulator (one single "1000 gold"
     * line instead of ten "100 gold" ones).
     *
     * This will also be used to properly handle recursive lootbox drops, as each lootbox is identified by its `name`.
     * So be careful with typos and case sensitivity !
     */
    name: string;
    /**
     * Url to an image that represents the dropped item.
     */
    pictureUrl?: string;
    /**
     * Url to a background image to display behind the item's picture (for example a special color to really insist that
     * the drop is amazing and you deserve extra dopamine for it !)
     */
    backgroundUrl?: string;
    /**
     * How many of the item is included in a drop, strictly positive integer.
     */
    amount: number;
}
