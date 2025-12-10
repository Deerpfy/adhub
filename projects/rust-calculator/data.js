/**
 * Rust Calculator - Game Data
 * Data extracted from analysis: buildings HP, explosives costs, crafting recipes
 * Source: RustLabs-style data, manually compiled
 */

const GAME_DATA = {
    version: "1.0.0",
    lastUpdate: "2025-01-01",

    // Building tiers with HP values
    buildings: {
        // Walls
        twig_wall: {
            name: "Twig Wall",
            nameCs: "Dřevěná zeď (Twig)",
            hp: 10,
            tier: "twig",
            category: "wall",
            icon: "🪵",
            buildCost: { wood: 10 }
        },
        wood_wall: {
            name: "Wood Wall",
            nameCs: "Dřevěná zeď",
            hp: 250,
            tier: "wood",
            category: "wall",
            icon: "🪵",
            buildCost: { wood: 200 }
        },
        stone_wall: {
            name: "Stone Wall",
            nameCs: "Kamenná zeď",
            hp: 500,
            tier: "stone",
            category: "wall",
            icon: "🧱",
            buildCost: { stones: 300 }
        },
        metal_wall: {
            name: "Sheet Metal Wall",
            nameCs: "Plechová zeď",
            hp: 1000,
            tier: "sheet_metal",
            category: "wall",
            icon: "🔩",
            buildCost: { metal_fragments: 200 }
        },
        armored_wall: {
            name: "Armored Wall",
            nameCs: "Pancéřová zeď",
            hp: 2000,
            tier: "armored",
            category: "wall",
            icon: "🛡️",
            buildCost: { hqm: 25 }
        },

        // Doors
        wood_door: {
            name: "Wooden Door",
            nameCs: "Dřevěné dveře",
            hp: 200,
            tier: "wood",
            category: "door",
            icon: "🚪",
            buildCost: { wood: 300 }
        },
        metal_door: {
            name: "Sheet Metal Door",
            nameCs: "Plechové dveře",
            hp: 250,
            tier: "sheet_metal",
            category: "door",
            icon: "🚪",
            buildCost: { metal_fragments: 150 }
        },
        garage_door: {
            name: "Garage Door",
            nameCs: "Garážová vrata",
            hp: 600,
            tier: "sheet_metal",
            category: "door",
            icon: "🚗",
            buildCost: { metal_fragments: 300, gears: 2 }
        },
        armored_door: {
            name: "Armored Door",
            nameCs: "Pancéřové dveře",
            hp: 800,
            tier: "armored",
            category: "door",
            icon: "🚪",
            buildCost: { hqm: 20, gears: 5 }
        },

        // Foundations
        stone_foundation: {
            name: "Stone Foundation",
            nameCs: "Kamenný základ",
            hp: 500,
            tier: "stone",
            category: "foundation",
            icon: "⬜",
            buildCost: { stones: 300 }
        },
        metal_foundation: {
            name: "Sheet Metal Foundation",
            nameCs: "Plechový základ",
            hp: 1000,
            tier: "sheet_metal",
            category: "foundation",
            icon: "⬜",
            buildCost: { metal_fragments: 200 }
        },
        armored_foundation: {
            name: "Armored Foundation",
            nameCs: "Pancéřový základ",
            hp: 2000,
            tier: "armored",
            category: "foundation",
            icon: "⬜",
            buildCost: { hqm: 25 }
        },

        // Floors/Ceilings
        stone_floor: {
            name: "Stone Floor",
            nameCs: "Kamenná podlaha",
            hp: 500,
            tier: "stone",
            category: "floor",
            icon: "⬜",
            buildCost: { stones: 300 }
        },
        metal_floor: {
            name: "Sheet Metal Floor",
            nameCs: "Plechová podlaha",
            hp: 1000,
            tier: "sheet_metal",
            category: "floor",
            icon: "⬜",
            buildCost: { metal_fragments: 200 }
        },
        armored_floor: {
            name: "Armored Floor",
            nameCs: "Pancéřová podlaha",
            hp: 2000,
            tier: "armored",
            category: "floor",
            icon: "⬜",
            buildCost: { hqm: 25 }
        },

        // Windows
        metal_window_bars: {
            name: "Metal Window Bars",
            nameCs: "Kovové mříže",
            hp: 500,
            tier: "sheet_metal",
            category: "window",
            icon: "🪟",
            buildCost: { metal_fragments: 75 }
        },
        reinforced_window: {
            name: "Reinforced Glass Window",
            nameCs: "Zpevněné skleněné okno",
            hp: 350,
            tier: "sheet_metal",
            category: "window",
            icon: "🪟",
            buildCost: { metal_fragments: 150, hqm: 25 }
        },

        // Other structures
        tool_cupboard: {
            name: "Tool Cupboard",
            nameCs: "Skříňka na nářadí (TC)",
            hp: 250,
            tier: "wood",
            category: "deployable",
            icon: "📦",
            buildCost: { wood: 1000 }
        },
        workbench_t1: {
            name: "Workbench Level 1",
            nameCs: "Pracovní stůl 1",
            hp: 250,
            tier: "wood",
            category: "deployable",
            icon: "🔧",
            buildCost: { wood: 500, metal_fragments: 100, scrap: 50 }
        },
        workbench_t2: {
            name: "Workbench Level 2",
            nameCs: "Pracovní stůl 2",
            hp: 500,
            tier: "sheet_metal",
            category: "deployable",
            icon: "🔧",
            buildCost: { metal_fragments: 500, hqm: 20, scrap: 500 }
        },
        workbench_t3: {
            name: "Workbench Level 3",
            nameCs: "Pracovní stůl 3",
            hp: 1000,
            tier: "armored",
            category: "deployable",
            icon: "🔧",
            buildCost: { metal_fragments: 1000, hqm: 100, scrap: 1250 }
        }
    },

    // Explosives with damage values per tier and costs
    explosives: {
        c4: {
            name: "Timed Explosive Charge (C4)",
            nameCs: "Časovaná nálož (C4)",
            icon: "💣",
            sulfurCost: 2200,
            workbench: 3,
            damage: {
                twig: 10000,
                wood: 275,
                stone: 275,
                sheet_metal: 385,
                armored: 550
            }
        },
        rocket: {
            name: "Rocket",
            nameCs: "Raketa",
            icon: "🚀",
            sulfurCost: 1400,
            workbench: 3,
            damage: {
                twig: 10000,
                wood: 137,
                stone: 137,
                sheet_metal: 192,
                armored: 275
            }
        },
        satchel: {
            name: "Satchel Charge",
            nameCs: "Satchel bomba",
            icon: "🎒",
            sulfurCost: 480,
            workbench: 1,
            damage: {
                twig: 10000,
                wood: 65,
                stone: 51,
                sheet_metal: 63,
                armored: 65
            },
            // Satchels have random dud chance
            dudChance: 0.2
        },
        explo_ammo: {
            name: "Explosive 5.56 Ammo",
            nameCs: "Výbušná munice 5.56",
            icon: "🔫",
            sulfurCost: 25, // per round
            workbench: 3,
            damage: {
                twig: 100,
                wood: 3,
                stone: 2,
                sheet_metal: 2.6,
                armored: 4
            }
        },
        beancan: {
            name: "Beancan Grenade",
            nameCs: "Beancan granát",
            icon: "🥫",
            sulfurCost: 120,
            workbench: 1,
            damage: {
                twig: 1000,
                wood: 20,
                stone: 15,
                sheet_metal: 18,
                armored: 20
            },
            dudChance: 0.5
        },
        f1_grenade: {
            name: "F1 Grenade",
            nameCs: "F1 Granát",
            icon: "💥",
            sulfurCost: 60,
            workbench: 2,
            damage: {
                twig: 500,
                wood: 12,
                stone: 8,
                sheet_metal: 10,
                armored: 12
            }
        },
        high_velocity_rocket: {
            name: "High Velocity Rocket (HV)",
            nameCs: "Vysokorychlostní raketa",
            icon: "🎯",
            sulfurCost: 200,
            workbench: 2,
            damage: {
                twig: 200,
                wood: 30,
                stone: 25,
                sheet_metal: 32,
                armored: 40
            }
        },
        incendiary_rocket: {
            name: "Incendiary Rocket",
            nameCs: "Zápalná raketa",
            icon: "🔥",
            sulfurCost: 610,
            workbench: 3,
            damage: {
                twig: 2000,
                wood: 150, // burns wood effectively
                stone: 50,
                sheet_metal: 70,
                armored: 100
            }
        }
    },

    // Melee weapons damage (for soft-side raiding)
    meleeWeapons: {
        rock: {
            name: "Rock",
            nameCs: "Kámen",
            icon: "🪨",
            damage: {
                twig: 2,
                wood: 1
            }
        },
        bone_club: {
            name: "Bone Club",
            nameCs: "Kostěná palice",
            icon: "🦴",
            damage: {
                twig: 4,
                wood: 2
            }
        },
        salvaged_axe: {
            name: "Salvaged Axe",
            nameCs: "Sběrná sekera",
            icon: "🪓",
            damage: {
                twig: 8,
                wood: 4
            }
        },
        jackhammer: {
            name: "Jackhammer",
            nameCs: "Sbíječka",
            icon: "⛏️",
            damage: {
                twig: 12,
                wood: 6,
                stone: 3 // soft side
            }
        }
    },

    // Crafting recipes (simplified dependency tree)
    recipes: {
        // Basic materials
        gunpowder: {
            name: "Gunpowder",
            nameCs: "Střelný prach",
            icon: "💨",
            output: 10,
            workbench: 0,
            ingredients: {
                sulfur: 20,
                charcoal: 30
            },
            // Mixing table recipe (more efficient)
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
            nameCs: "Palivo nízké kvality",
            icon: "⛽",
            output: 4,
            workbench: 0,
            ingredients: {
                animal_fat: 3,
                cloth: 1
            }
        },

        // Explosives crafting
        explosives: {
            name: "Explosives",
            nameCs: "Výbušnina",
            icon: "💣",
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
            nameCs: "Časovaná nálož (C4)",
            icon: "💣",
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
            icon: "🚀",
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
            icon: "🎒",
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
            nameCs: "Beancan granát",
            icon: "🥫",
            output: 1,
            workbench: 1,
            ingredients: {
                gunpowder: 60,
                metal_fragments: 20
            }
        },
        explo_ammo: {
            name: "Explosive 5.56 Ammo",
            nameCs: "Výbušná munice 5.56",
            icon: "🔫",
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
            nameCs: "F1 Granát",
            icon: "💥",
            output: 1,
            workbench: 2,
            ingredients: {
                gunpowder: 30,
                metal_fragments: 40
            }
        },

        // Intermediate items
        small_stash: {
            name: "Small Stash",
            nameCs: "Malá skrýš",
            icon: "📦",
            output: 1,
            workbench: 0,
            ingredients: {
                cloth: 10
            }
        },
        rope: {
            name: "Rope",
            nameCs: "Lano",
            icon: "🪢",
            output: 1,
            workbench: 0,
            ingredients: {
                cloth: 50
            }
        },
        metal_pipes: {
            name: "Metal Pipe",
            nameCs: "Kovová trubka",
            icon: "🔧",
            output: 1,
            workbench: 1,
            ingredients: {
                hqm: 2,
                metal_fragments: 100
            }
        },

        // HV Rocket
        high_velocity_rocket: {
            name: "High Velocity Rocket",
            nameCs: "Vysokorychlostní raketa",
            icon: "🎯",
            output: 1,
            workbench: 2,
            ingredients: {
                gunpowder: 100,
                metal_pipes: 1
            }
        },

        // Incendiary Rocket
        incendiary_rocket: {
            name: "Incendiary Rocket",
            nameCs: "Zápalná raketa",
            icon: "🔥",
            output: 1,
            workbench: 3,
            ingredients: {
                explosives: 2,
                gunpowder: 250,
                metal_pipes: 1,
                low_grade_fuel: 250
            }
        },

        // Rocket Launcher
        rocket_launcher: {
            name: "Rocket Launcher",
            nameCs: "Raketomet",
            icon: "🎇",
            output: 1,
            workbench: 3,
            ingredients: {
                hqm: 40,
                metal_pipes: 4
            }
        }
    },

    // Raw materials (not craftable - must be gathered)
    rawMaterials: {
        sulfur: { name: "Sulfur", nameCs: "Síra", icon: "🟡", gatherable: true },
        charcoal: { name: "Charcoal", nameCs: "Dřevěné uhlí", icon: "⚫", gatherable: true },
        wood: { name: "Wood", nameCs: "Dřevo", icon: "🪵", gatherable: true },
        stones: { name: "Stones", nameCs: "Kameny", icon: "🪨", gatherable: true },
        metal_fragments: { name: "Metal Fragments", nameCs: "Kovové úlomky", icon: "⚙️", gatherable: true },
        hqm: { name: "High Quality Metal", nameCs: "Kvalitní kov (HQM)", icon: "✨", gatherable: true },
        cloth: { name: "Cloth", nameCs: "Látka", icon: "🧵", gatherable: true },
        animal_fat: { name: "Animal Fat", nameCs: "Živočišný tuk", icon: "🍖", gatherable: true },
        low_grade_fuel: { name: "Low Grade Fuel", nameCs: "Palivo", icon: "⛽", gatherable: false },
        scrap: { name: "Scrap", nameCs: "Šrot", icon: "🔩", gatherable: true },
        tech_trash: { name: "Tech Trash", nameCs: "Tech odpad", icon: "💾", lootOnly: true },
        gears: { name: "Gears", nameCs: "Ozubená kola", icon: "⚙️", lootOnly: true }
    },

    // Utility functions
    calculateRawMaterials(recipeId, quantity = 1) {
        const raw = {};
        const recipe = this.recipes[recipeId];

        if (!recipe) return raw;

        const multiplier = quantity / recipe.output;

        for (const [ingredientId, amount] of Object.entries(recipe.ingredients)) {
            const neededAmount = amount * multiplier;

            if (this.rawMaterials[ingredientId]) {
                // This is a raw material
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

    // Calculate explosives needed to destroy a building
    calculateExplosivesNeeded(buildingId, explosiveId) {
        const building = this.buildings[buildingId];
        const explosive = this.explosives[explosiveId];

        if (!building || !explosive) return null;

        const damage = explosive.damage[building.tier] || 0;
        if (damage === 0) return Infinity;

        const count = Math.ceil(building.hp / damage);
        const totalSulfur = count * explosive.sulfurCost;

        return {
            count,
            totalSulfur,
            building,
            explosive,
            efficiency: totalSulfur / building.hp // Lower is better
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GAME_DATA;
}
