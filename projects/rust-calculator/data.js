/**
 * Rust Calculator - Game Data
 * Data extracted from analysis: buildings HP, explosives costs, crafting recipes
 * Using local SVG icons for offline support
 */

// Local game icons path (SVG for offline support)
const GAME_ICONS_PATH = 'icons/game/';

// Helper to get local game icon URL
function getRustIcon(shortname) {
    return `${GAME_ICONS_PATH}${shortname}.svg`;
}

const GAME_DATA = {
    version: "1.0.1",
    lastUpdate: "2025-12-10",

    // Building tiers with HP values
    buildings: {
        // Walls
        twig_wall: {
            name: "Twig Wall",
            nameCs: "Drevena zed (Twig)",
            hp: 10,
            tier: "twig",
            category: "wall",
            icon: getRustIcon('wood'),
            buildCost: { wood: 10 }
        },
        wood_wall: {
            name: "Wood Wall",
            nameCs: "Drevena zed",
            hp: 250,
            tier: "wood",
            category: "wall",
            icon: getRustIcon('wood'),
            buildCost: { wood: 200 }
        },
        stone_wall: {
            name: "Stone Wall",
            nameCs: "Kamenna zed",
            hp: 500,
            tier: "stone",
            category: "wall",
            icon: getRustIcon('stones'),
            buildCost: { stones: 300 }
        },
        metal_wall: {
            name: "Sheet Metal Wall",
            nameCs: "Plechova zed",
            hp: 1000,
            tier: "sheet_metal",
            category: "wall",
            icon: getRustIcon('metal.fragments'),
            buildCost: { metal_fragments: 200 }
        },
        armored_wall: {
            name: "Armored Wall",
            nameCs: "Pancerova zed",
            hp: 2000,
            tier: "armored",
            category: "wall",
            icon: getRustIcon('metal.refined'),
            buildCost: { hqm: 25 }
        },

        // Doors - have explicit raidCosts since damage multipliers differ from walls
        wood_door: {
            name: "Wooden Door",
            nameCs: "Drevene dvere",
            hp: 200,
            tier: "wood",
            category: "door",
            icon: getRustIcon('door.hinged.wood'),
            buildCost: { wood: 300 },
            raidCosts: {
                c4: 1,
                rocket: 1,
                satchel: 2,
                explo_ammo: 18
            }
        },
        metal_door: {
            name: "Sheet Metal Door",
            nameCs: "Plechove dvere",
            hp: 250,
            tier: "sheet_metal",
            category: "door",
            icon: getRustIcon('door.hinged.metal'),
            buildCost: { metal_fragments: 150 },
            raidCosts: {
                c4: 1,
                rocket: 2,
                satchel: 4,
                explo_ammo: 63
            }
        },
        garage_door: {
            name: "Garage Door",
            nameCs: "Garazova vrata",
            hp: 600,
            tier: "sheet_metal",
            category: "door",
            icon: getRustIcon('door.double.hinged.metal'),
            buildCost: { metal_fragments: 300, gears: 2 },
            raidCosts: {
                c4: 2,
                rocket: 3,
                satchel: 9,
                explo_ammo: 150
            }
        },
        armored_door: {
            name: "Armored Door",
            nameCs: "Pancerove dvere",
            hp: 800,
            tier: "armored",
            category: "door",
            icon: getRustIcon('door.hinged.toptier'),
            buildCost: { hqm: 20, gears: 5 },
            raidCosts: {
                c4: 2,
                rocket: 4,
                satchel: 12,
                explo_ammo: 200
            }
        },

        // Foundations
        stone_foundation: {
            name: "Stone Foundation",
            nameCs: "Kamenny zaklad",
            hp: 500,
            tier: "stone",
            category: "foundation",
            icon: getRustIcon('stones'),
            buildCost: { stones: 300 }
        },
        metal_foundation: {
            name: "Sheet Metal Foundation",
            nameCs: "Plechovy zaklad",
            hp: 1000,
            tier: "sheet_metal",
            category: "foundation",
            icon: getRustIcon('metal.fragments'),
            buildCost: { metal_fragments: 200 }
        },
        armored_foundation: {
            name: "Armored Foundation",
            nameCs: "Pancerovy zaklad",
            hp: 2000,
            tier: "armored",
            category: "foundation",
            icon: getRustIcon('metal.refined'),
            buildCost: { hqm: 25 }
        },

        // Floors/Ceilings
        stone_floor: {
            name: "Stone Floor",
            nameCs: "Kamenna podlaha",
            hp: 500,
            tier: "stone",
            category: "floor",
            icon: getRustIcon('stones'),
            buildCost: { stones: 300 }
        },
        metal_floor: {
            name: "Sheet Metal Floor",
            nameCs: "Plechova podlaha",
            hp: 1000,
            tier: "sheet_metal",
            category: "floor",
            icon: getRustIcon('metal.fragments'),
            buildCost: { metal_fragments: 200 }
        },
        armored_floor: {
            name: "Armored Floor",
            nameCs: "Pancerova podlaha",
            hp: 2000,
            tier: "armored",
            category: "floor",
            icon: getRustIcon('metal.refined'),
            buildCost: { hqm: 25 }
        },

        // Windows
        metal_window_bars: {
            name: "Metal Window Bars",
            nameCs: "Kovove mrize",
            hp: 500,
            tier: "sheet_metal",
            category: "window",
            icon: getRustIcon('wall.frame.cell'),
            buildCost: { metal_fragments: 75 }
        },
        reinforced_window: {
            name: "Reinforced Glass Window",
            nameCs: "Zpevnene sklenene okno",
            hp: 350,
            tier: "sheet_metal",
            category: "window",
            icon: getRustIcon('wall.window.bars.metal'),
            buildCost: { metal_fragments: 150, hqm: 25 }
        },

        // Other structures
        tool_cupboard: {
            name: "Tool Cupboard",
            nameCs: "Skrinka na naradi (TC)",
            hp: 250,
            tier: "wood",
            category: "deployable",
            icon: getRustIcon('cupboard.tool'),
            buildCost: { wood: 1000 }
        },
        workbench_t1: {
            name: "Workbench Level 1",
            nameCs: "Pracovni stul 1",
            hp: 250,
            tier: "wood",
            category: "deployable",
            icon: getRustIcon('workbench1'),
            buildCost: { wood: 500, metal_fragments: 100, scrap: 50 }
        },
        workbench_t2: {
            name: "Workbench Level 2",
            nameCs: "Pracovni stul 2",
            hp: 500,
            tier: "sheet_metal",
            category: "deployable",
            icon: getRustIcon('workbench2'),
            buildCost: { metal_fragments: 500, hqm: 20, scrap: 500 }
        },
        workbench_t3: {
            name: "Workbench Level 3",
            nameCs: "Pracovni stul 3",
            hp: 1000,
            tier: "armored",
            category: "deployable",
            icon: getRustIcon('workbench3'),
            buildCost: { metal_fragments: 1000, hqm: 100, scrap: 1250 }
        },

        // Additional raid targets
        large_wooden_box: {
            name: "Large Wood Box",
            nameCs: "Velka drevena bedna",
            hp: 250,
            tier: "wood",
            category: "deployable",
            icon: getRustIcon('box.wooden.large'),
            buildCost: { wood: 250, metal_fragments: 50 }
        },
        vending_machine: {
            name: "Vending Machine",
            nameCs: "Prodejni automat",
            hp: 500,
            tier: "sheet_metal",
            category: "deployable",
            icon: getRustIcon('vending.machine'),
            buildCost: { metal_fragments: 200, gears: 2 }
        },
        auto_turret: {
            name: "Auto Turret",
            nameCs: "Automaticka vez",
            hp: 1000,
            tier: "sheet_metal",
            category: "deployable",
            icon: getRustIcon('autoturret'),
            buildCost: { hqm: 40, cctv_camera: 1, targeting_computer: 1 }
        },
        sam_site: {
            name: "SAM Site",
            nameCs: "SAM Site",
            hp: 1000,
            tier: "sheet_metal",
            category: "deployable",
            icon: getRustIcon('samsite'),
            buildCost: { hqm: 75, gears: 3, tech_trash: 1 }
        }
    },

    // Explosives with damage values per tier and costs
    // NOTE: Damage values are approximate. For accurate raid costs, use raidCosts on buildings.
    // Values verified against RustLabs/community data as of 2025.
    explosives: {
        c4: {
            name: "Timed Explosive Charge (C4)",
            nameCs: "Casovana naloz (C4)",
            icon: getRustIcon('explosive.timed'),
            sulfurCost: 2200,
            workbench: 3,
            damage: {
                twig: 10000,
                wood: 275,
                stone: 275,
                sheet_metal: 260,
                armored: 250
            }
        },
        rocket: {
            name: "Rocket",
            nameCs: "Raketa",
            icon: getRustIcon('ammo.rocket.basic'),
            sulfurCost: 1400,
            workbench: 3,
            damage: {
                twig: 10000,
                wood: 137,
                stone: 137,
                sheet_metal: 128,
                armored: 137
            }
        },
        satchel: {
            name: "Satchel Charge",
            nameCs: "Satchel bomba",
            icon: getRustIcon('explosive.satchel'),
            sulfurCost: 480,
            workbench: 1,
            damage: {
                twig: 10000,
                wood: 65,
                stone: 51,
                sheet_metal: 44,
                armored: 44
            },
            dudChance: 0.2
        },
        explo_ammo: {
            name: "Explosive 5.56 Ammo",
            nameCs: "Vybusna munice 5.56",
            icon: getRustIcon('ammo.rifle.explosive'),
            sulfurCost: 25,
            workbench: 3,
            damage: {
                twig: 100,
                wood: 3,
                stone: 2.7,
                sheet_metal: 2.5,
                armored: 2.5
            }
        },
        beancan: {
            name: "Beancan Grenade",
            nameCs: "Beancan granat",
            icon: getRustIcon('grenade.beancan'),
            sulfurCost: 120,
            workbench: 1,
            damage: {
                twig: 1000,
                wood: 20,
                stone: 15,
                sheet_metal: 12,
                armored: 12
            },
            dudChance: 0.5
        },
        f1_grenade: {
            name: "F1 Grenade",
            nameCs: "F1 Granat",
            icon: getRustIcon('grenade.f1'),
            sulfurCost: 60,
            workbench: 2,
            damage: {
                twig: 500,
                wood: 12,
                stone: 8,
                sheet_metal: 6,
                armored: 6
            }
        },
        high_velocity_rocket: {
            name: "High Velocity Rocket (HV)",
            nameCs: "Vysokorychlostni raketa",
            icon: getRustIcon('ammo.rocket.hv'),
            sulfurCost: 200,
            workbench: 2,
            damage: {
                twig: 200,
                wood: 30,
                stone: 25,
                sheet_metal: 20,
                armored: 20
            }
        },
        incendiary_rocket: {
            name: "Incendiary Rocket",
            nameCs: "Zapalna raketa",
            icon: getRustIcon('ammo.rocket.fire'),
            sulfurCost: 610,
            workbench: 3,
            damage: {
                twig: 2000,
                wood: 150,
                stone: 50,
                sheet_metal: 35,
                armored: 35
            }
        }
    },

    // Melee weapons damage (for soft-side raiding)
    meleeWeapons: {
        rock: {
            name: "Rock",
            nameCs: "Kamen",
            icon: getRustIcon('rock'),
            damage: {
                twig: 2,
                wood: 1
            }
        },
        bone_club: {
            name: "Bone Club",
            nameCs: "Kostena palice",
            icon: getRustIcon('bone.club'),
            damage: {
                twig: 4,
                wood: 2
            }
        },
        salvaged_axe: {
            name: "Salvaged Axe",
            nameCs: "Sberna sekera",
            icon: getRustIcon('axe.salvaged'),
            damage: {
                twig: 8,
                wood: 4
            }
        },
        jackhammer: {
            name: "Jackhammer",
            nameCs: "Sbijecka",
            icon: getRustIcon('jackhammer'),
            damage: {
                twig: 12,
                wood: 6,
                stone: 3
            }
        }
    },

    // Crafting recipes
    recipes: {
        gunpowder: {
            name: "Gunpowder",
            nameCs: "Strelny prach",
            icon: getRustIcon('gunpowder'),
            output: 10,
            workbench: 0,
            ingredients: {
                sulfur: 20,
                charcoal: 30
            },
            mixingTable: {
                output: 10,
                ingredients: {
                    sulfur: 20,
                    charcoal: 20
                }
            }
        },
        low_grade_fuel: {
            name: "Low Grade Fuel",
            nameCs: "Palivo nizke kvality",
            icon: getRustIcon('lowgradefuel'),
            output: 4,
            workbench: 0,
            ingredients: {
                animal_fat: 3,
                cloth: 1
            }
        },
        explosives: {
            name: "Explosives",
            nameCs: "Vybusnina",
            icon: getRustIcon('explosives'),
            output: 1,
            workbench: 3,
            ingredients: {
                gunpowder: 50,
                low_grade_fuel: 3,
                sulfur: 10,
                metal_fragments: 10
            }
        },
        c4: {
            name: "Timed Explosive Charge",
            nameCs: "Casovana naloz (C4)",
            icon: getRustIcon('explosive.timed'),
            output: 1,
            workbench: 3,
            ingredients: {
                explosives: 20,
                cloth: 5,
                tech_trash: 2
            }
        },
        rocket: {
            name: "Rocket",
            nameCs: "Raketa",
            icon: getRustIcon('ammo.rocket.basic'),
            output: 1,
            workbench: 3,
            ingredients: {
                explosives: 10,
                gunpowder: 150,
                metal_pipes: 2
            }
        },
        satchel: {
            name: "Satchel Charge",
            nameCs: "Satchel bomba",
            icon: getRustIcon('explosive.satchel'),
            output: 1,
            workbench: 1,
            ingredients: {
                beancan: 4,
                rope: 1,
                small_stash: 1
            }
        },
        beancan: {
            name: "Beancan Grenade",
            nameCs: "Beancan granat",
            icon: getRustIcon('grenade.beancan'),
            output: 1,
            workbench: 1,
            ingredients: {
                gunpowder: 60,
                metal_fragments: 20
            }
        },
        explo_ammo: {
            name: "Explosive 5.56 Ammo",
            nameCs: "Vybusna munice 5.56",
            icon: getRustIcon('ammo.rifle.explosive'),
            output: 2,
            workbench: 3,
            ingredients: {
                gunpowder: 10,
                metal_fragments: 5,
                sulfur: 10
            }
        },
        f1_grenade: {
            name: "F1 Grenade",
            nameCs: "F1 Granat",
            icon: getRustIcon('grenade.f1'),
            output: 1,
            workbench: 2,
            ingredients: {
                gunpowder: 30,
                metal_fragments: 40
            }
        },
        small_stash: {
            name: "Small Stash",
            nameCs: "Mala skrys",
            icon: getRustIcon('stash.small'),
            output: 1,
            workbench: 0,
            ingredients: {
                cloth: 10
            }
        },
        rope: {
            name: "Rope",
            nameCs: "Lano",
            icon: getRustIcon('rope'),
            output: 1,
            workbench: 0,
            ingredients: {
                cloth: 50
            }
        },
        metal_pipes: {
            name: "Metal Pipe",
            nameCs: "Kovova trubka",
            icon: getRustIcon('metalpipe'),
            output: 1,
            workbench: 1,
            ingredients: {
                hqm: 2,
                metal_fragments: 100
            }
        },
        high_velocity_rocket: {
            name: "High Velocity Rocket",
            nameCs: "Vysokorychlostni raketa",
            icon: getRustIcon('ammo.rocket.hv'),
            output: 1,
            workbench: 2,
            ingredients: {
                gunpowder: 100,
                metal_pipes: 1
            }
        },
        incendiary_rocket: {
            name: "Incendiary Rocket",
            nameCs: "Zapalna raketa",
            icon: getRustIcon('ammo.rocket.fire'),
            output: 1,
            workbench: 3,
            ingredients: {
                explosives: 2,
                gunpowder: 250,
                metal_pipes: 1,
                low_grade_fuel: 250
            }
        },
        rocket_launcher: {
            name: "Rocket Launcher",
            nameCs: "Raketomet",
            icon: getRustIcon('rocket.launcher'),
            output: 1,
            workbench: 3,
            ingredients: {
                hqm: 40,
                metal_pipes: 4
            }
        }
    },

    // Raw materials
    rawMaterials: {
        sulfur: { name: "Sulfur", nameCs: "Sira", icon: getRustIcon('sulfur'), gatherable: true },
        charcoal: { name: "Charcoal", nameCs: "Drevene uhli", icon: getRustIcon('charcoal'), gatherable: true },
        wood: { name: "Wood", nameCs: "Drevo", icon: getRustIcon('wood'), gatherable: true },
        stones: { name: "Stones", nameCs: "Kameny", icon: getRustIcon('stones'), gatherable: true },
        metal_fragments: { name: "Metal Fragments", nameCs: "Kovove ulomky", icon: getRustIcon('metal.fragments'), gatherable: true },
        hqm: { name: "High Quality Metal", nameCs: "Kvalitni kov (HQM)", icon: getRustIcon('metal.refined'), gatherable: true },
        cloth: { name: "Cloth", nameCs: "Latka", icon: getRustIcon('cloth'), gatherable: true },
        animal_fat: { name: "Animal Fat", nameCs: "Zivocisny tuk", icon: getRustIcon('fat.animal'), gatherable: true },
        low_grade_fuel: { name: "Low Grade Fuel", nameCs: "Palivo", icon: getRustIcon('lowgradefuel'), gatherable: false },
        scrap: { name: "Scrap", nameCs: "Srot", icon: getRustIcon('scrap'), gatherable: true },
        tech_trash: { name: "Tech Trash", nameCs: "Tech odpad", icon: getRustIcon('techparts'), lootOnly: true },
        gears: { name: "Gears", nameCs: "Ozubena kola", icon: getRustIcon('gears'), lootOnly: true },
        rope: { name: "Rope", nameCs: "Lano", icon: getRustIcon('rope'), gatherable: false },
        small_stash: { name: "Small Stash", nameCs: "Mala skrys", icon: getRustIcon('stash.small'), gatherable: false },
        metal_pipes: { name: "Metal Pipe", nameCs: "Kovova trubka", icon: getRustIcon('metalpipe'), gatherable: false },
        beancan: { name: "Beancan Grenade", nameCs: "Beancan granat", icon: getRustIcon('grenade.beancan'), gatherable: false },
        gunpowder: { name: "Gunpowder", nameCs: "Strelny prach", icon: getRustIcon('gunpowder'), gatherable: false },
        explosives: { name: "Explosives", nameCs: "Vybusnina", icon: getRustIcon('explosives'), gatherable: false }
    },

    // Utility functions
    calculateRawMaterials(recipeId, quantity = 1) {
        const raw = {};
        const recipe = this.recipes[recipeId];

        if (!recipe) return raw;

        const multiplier = quantity / recipe.output;

        for (const [ingredientId, amount] of Object.entries(recipe.ingredients)) {
            const neededAmount = amount * multiplier;

            // Check if it's a truly raw material (gatherable or loot-only)
            const rawMat = this.rawMaterials[ingredientId];
            if (rawMat && (rawMat.gatherable || rawMat.lootOnly)) {
                raw[ingredientId] = (raw[ingredientId] || 0) + neededAmount;
            } else if (this.recipes[ingredientId]) {
                // This is a craftable item - recurse
                const subRaw = this.calculateRawMaterials(ingredientId, neededAmount);
                for (const [subId, subAmount] of Object.entries(subRaw)) {
                    raw[subId] = (raw[subId] || 0) + subAmount;
                }
            } else {
                // Unknown item - treat as raw
                raw[ingredientId] = (raw[ingredientId] || 0) + neededAmount;
            }
        }

        return raw;
    },

    calculateExplosivesNeeded(buildingId, explosiveId) {
        const building = this.buildings[buildingId];
        const explosive = this.explosives[explosiveId];

        if (!building || !explosive) return null;

        let count;

        // Use explicit raidCosts if available (more accurate for doors/deployables)
        if (building.raidCosts && building.raidCosts[explosiveId] !== undefined) {
            count = building.raidCosts[explosiveId];
        } else {
            // Fall back to damage-based calculation for walls
            const damage = explosive.damage[building.tier] || 0;
            if (damage === 0) return { count: Infinity, totalSulfur: Infinity, building, explosive, efficiency: Infinity };
            count = Math.ceil(building.hp / damage);
        }

        const totalSulfur = count * explosive.sulfurCost;

        return {
            count,
            totalSulfur,
            building,
            explosive,
            efficiency: totalSulfur / building.hp
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GAME_DATA;
}
