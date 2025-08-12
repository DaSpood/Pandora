import collections
import json
import numpy

RNG = numpy.random.default_rng()

def load_loot_table():
    with open("loot_table.json", "r") as loot_table_json:
        return json.loads(loot_table_json.read())


def get_tier_pity(tier, loot_table):
    return next(box["pity"] for box in loot_table if box["tier"] == tier)


def convert_box_to_tier(box_name, loot_table):
    return next(box["tier"] for box in loot_table if box["name"] == box_name)


def remove_tank_from_loot_pool(tank_name, tier, loot_table):
    box = next(box for box in loot_table if box["tier"] == tier)
    slot = next(slot for slot in box["loot_slots"] if slot["special"] == "tank")
    group = slot["loot_groups"][0]

    rate_to_distribute = next(item["rate"] for item in group["loot_items"] if item["name"] == tank_name)
    group["loot_items"] = [item for item in group["loot_items"] if item["name"] != tank_name]

    if len(group["loot_items"]) == 0:
        slot["special"] = "compensation"
        group["loot_items"].append({
            "name": "Raumphalt Prime",
            "amount": 1,
            "rate": 1,
        })
    else:
        # the total probability of remaining tanks must still equal 1 so I'm distributing the missing part equally between them
        # It really doesnt matter what each individual tank goes for considering the low drop rate of that loot group anyway
        added_rate_each = rate_to_distribute / len(group["loot_items"])
        for item in group["loot_items"]:
            item["rate"] += added_rate_each


def is_tier_complete(tier, loot_table):
    box = next(box for box in loot_table if box["tier"] == tier)
    return len([slot for slot in box["loot_slots"] if slot["special"] == "compensation"]) > 0


def open_one_from_tier(tier, loot_table, is_pity):
    box = next(box for box in loot_table if box["tier"] == tier)
    result = []
    for slot in box["loot_slots"]:
        picked_group = None
        picked_item = None
        rate = 1 if (slot["special"] == "tank" or slot["special"] == "compensation") and is_pity else float(slot["rate"])
        if RNG.choice(2, p=[rate, 1-rate], replace=False) == 0:
            try:
                picked_group = slot["loot_groups"][RNG.choice(len(slot["loot_groups"]), p=[float(group["rate"]) for group in slot["loot_groups"]], replace=False)]
                picked_item = picked_group["loot_items"][RNG.choice(len(picked_group["loot_items"]), p=[float(item["rate"]) for item in picked_group["loot_items"]], replace=False)]
                result.append({
                    "slot_no": slot["slot_no"],
                    "group": picked_group["alias"],
                    "special": slot["special"],
                    "name": picked_item["name"],
                    "amount": picked_item["amount"],
                })
            except:
                print("########## ERROR ##########")
                print(f"Tier: {tier}")
                print(f"Slot: {slot['slot_no']}")
                if picked_group is None:
                    print("Group not picked")
                    print(f"Group len = {len(slot['loot_groups'])}, p = {[float(group['rate']) for group in slot['loot_groups']]}, sum = {sum([float(group['rate']) for group in slot['loot_groups']])}")
                elif picked_item is None:
                    print("Item not picked")
                    print(f"Item len = {len(picked_group['loot_items'])}, p = {[float(item['rate']) for item in picked_group['loot_items']]}, sum = {sum([float(item['rate']) for item in picked_group['loot_items']])}")
                else:
                    print("Other error, refine catch!")

                raw = loot_table[0]['loot_slots'][slot['slot_no'] - 1]
                print(json.dumps(raw, indent=4))

                target = raw['loot_groups'][0]['loot_items']
                print(json.dumps(target, indent=4))
                print(len(target))
                raise

    return result


def open_all_from_tier(tier, rewards, remaining, next_pity, opened, loot_table):
    while remaining[tier] > 0:
        result = open_one_from_tier(tier, loot_table, next_pity[tier] == 1)
        opened[tier] += 1
        remaining[tier] -= 1

        if next_pity[tier] == 0:
            #print(f"\tTier {tier} Box #{opened[tier]} has hit pity !")
            pass

        contains_tank = False
        for slot in result:
            if slot["name"] not in rewards.keys():
                rewards[slot["name"]] = 0
            rewards[slot["name"]] += slot["amount"]
            if slot["special"] == "box" or slot["special"] == "compensation":
                extra_box_tier = convert_box_to_tier(slot["name"], loot_table)
                remaining[extra_box_tier] += 1
            if slot["special"] == "tank" or slot["special"] == "compensation":
                #print(f"\tTier {tier} Box #{opened[tier]} contained a tank ({slot['name'] if slot['special'] == 'tank' else 'compensation'})")
                contains_tank = True
                next_pity[tier] = get_tier_pity(tier, loot_table)
            if slot["special"] == "tank":
                remove_tank_from_loot_pool(slot["name"], tier, loot_table)

        if not contains_tank:
            next_pity[tier] -= 1


def open_amount(base_amount):
    loot_table = load_loot_table()
    rewards = {}
    remaining = {
        1: base_amount,
        2: 0,
        3: 0,
    }
    next_pity = {
        1: get_tier_pity(1, loot_table),
        2: get_tier_pity(2, loot_table),
        3: get_tier_pity(3, loot_table),
    }
    opened = {
        1: 0,
        2: 0,
        3: 0,
    }

    current_tier = 1
    while remaining[current_tier] > 0:
        open_all_from_tier(current_tier, rewards, remaining, next_pity, opened, loot_table)
        current_tier = 1 if remaining[1] > 0 else 2 if remaining[2] > 0 else 3

    print("Opening done.")
    print("Total boxes opened:")
    print(json.dumps(opened, indent=4))
    print("Final results:")
    print(json.dumps(collections.OrderedDict(sorted(rewards.items())), indent=4))


def open_until(tier):
    loot_table = load_loot_table()
    rewards = {}
    purchased = 1
    remaining = {
        1: 1,
        2: 0,
        3: 0,
    }
    next_pity = {
        1: get_tier_pity(1, loot_table),
        2: get_tier_pity(2, loot_table),
        3: get_tier_pity(3, loot_table),
    }
    opened = {
        1: 0,
        2: 0,
        3: 0,
    }

    current_tier = 1
    while remaining[current_tier] > 0:
        open_all_from_tier(current_tier, rewards, remaining, next_pity, opened, loot_table)
        current_tier = 1 if remaining[1] > 0 else 2 if remaining[2] > 0 else 3 if remaining[3] > 0 else 1

        if current_tier == 1 and remaining[1] == 0:
            obtained_all = {
                1: is_tier_complete(1, loot_table),
                2: is_tier_complete(2, loot_table),
                3: is_tier_complete(3, loot_table),
            }
            if tier == 0 and obtained_all[1] and obtained_all[2] and obtained_all[3]:
                #print("Opening done, all tanks obtained.")
                break
            if tier == 1 and obtained_all[1]:
                #print("Opening done, all tier 1 tanks obtained.")
                break
            if tier == 2 and obtained_all[2]:
                #print("Opening done, all tier 2 tanks obtained.")
                break
            if tier == 3 and obtained_all[3]:
                #print("Opening done, all tier 3 tanks obtained.")
                break
            remaining[1] = 1
            purchased += 1

    #print(f"Total boxes purchased: {purchased}")
    #print("Total boxes opened:")
    #print(json.dumps(opened, indent=4))
    #print("Final results:")
    #print(json.dumps(collections.OrderedDict(sorted(rewards.items())), indent=4))
    return purchased


def run_batch(iterations):
    min = 999999
    max = 0
    total = 0
    for i in range(iterations):
        boxes_needed = open_until(0)  # Run simulation until all tanks from all tiers are obtained. Change 0 to 1/2/3 to run until all tanks from tier 1/2/3 boxes are obtained.
        total += boxes_needed
        if boxes_needed < min:
            min = boxes_needed
        if boxes_needed > max:
            max = boxes_needed
    return min, max, total


if __name__ == '__main__':
    print("Number of boxes ? (<=0 to run simulations until all tanks are obtained, tweak the script if you want")
    answer = int(input())
    if answer > 0:
        open_amount(answer)
        exit(0)

    T = 4  # Number of simulation batches in parallel (usually delegated to one CPU thread, so don't go higher than what your CPU can handle)
    N = 100  # Number of simulation iterations in each batch (multiply with T to get the total number of simulations run)

    # Results for T = 16, N = 2000 (it = 32000): Avg=530, Min=169, Max=1184

    from multiprocessing import Pool
    pool = Pool(processes=T)
    promises = []
    for i in range(T):
        promises.append(pool.apply_async(run_batch, [N]))

    results = [promise.get() for promise in promises]
    full_total = 0
    full_min = 999999
    full_max = 0
    for min, max, total in results:
        full_total += total
        if min < full_min:
            full_min = min
        if max > full_max:
            full_max = max

    print(f"Target: All tanks from all box tiers assuming none pre-owned")  # That is with '0' at line 208
    print(f"Iterations: {N * T}")
    print(f"Avg: {full_total / (N * T)}")
    print(f"Min: {full_min}")
    print(f"Max: {full_max}")
