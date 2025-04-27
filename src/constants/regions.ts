// Region definitions
const regions = {
  'viridian-forest': {
    name: 'Viridian Forest',
    minLevel: 3,
    maxLevel: 7,
    encounterRate: 30,
    spawnTimer: 1, // 10 seconds
    pool: [
      { id: 10, name: 'Caterpie', probability: 25 },   // Common (25%)
      { id: 11, name: 'Metapod', probability: 15 },    // Uncommon (15%)
      { id: 13, name: 'Weedle', probability: 25 },     // Common (25%)
      { id: 14, name: 'Kakuna', probability: 15 },     // Uncommon (15%)
      { id: 25, name: 'Pikachu', probability: 0.5 },     // Very rare (3%)
      { id: 133, name: 'Eevee', probability: 0.5 },     // Very rare (3%)
      { id: 16, name: 'Pidgey', probability: 5 },       // Uncommon (7%)
      { id: 43, name: 'oddish', probability: 5 }, // Very rare (2%)
      { id: 69, name: 'Bellsprout', probability: 7 }, // Very rare (2%)
      { id: 102, name: 'exeggcute', probability: 7 }, // Very rare (2%)
    ]
  },
  'cerulean-cave (10-15)': {
    name: 'Cerulean Cave',
    minLevel: 10,
    maxLevel: 15,
    encounterRate: 40,
    spawnTimer: 4, // 20 seconds
    pool: [
      { id: 41, name: 'Zubat', probability: 30 },      // Very common (30%)
      { id: 42, name: 'Golbat', probability: 15 },     // Common (15%)
      { id: 74, name: 'Geodude', probability: 25 },    // Common (25%)
      { id: 75, name: 'Graveler', probability: 15 },   // Uncommon (15%)
      { id: 95, name: 'Onix', probability: 10 },       // Rare (10%)
      { id: 104, name: 'Cubone', probability: 5 },      // Very rare (5%)
      { id: 12, name: 'Butterfree', probability: 5 },  // Rare (5%)
      { id: 15, name: 'Beedrill', probability: 5 }    // Rare (5%)
    ]
  },
  'beach-zone (15-25)': {
    name: 'Beach Zone',
    minLevel: 15,
    maxLevel: 25,
    encounterRate: 35,
    spawnTimer: 10, // 30 seconds
    pool: [
      { id: 15, name: 'Beedrill', probability: 5 },     // Rare (5%)
      { id: 25, name: 'Pikachu', probability: 5 },      // Rare (5%)
      { id: 16, name: 'Pidgey', probability: 10 },      // Uncommon (10%)
      { id: 41, name: 'Zubat', probability: 10 },       // Uncommon (10%)
      { id: 42, name: 'Golbat', probability: 5 },       // Rare (5%)
      { id: 72, name: 'Tentacool', probability: 20 },   // Common (20%)
      { id: 86, name: 'Seel', probability: 15 },        // Common (15%)
      { id: 98, name: 'Krabby', probability: 15 },      // Common (15%)
      { id: 120, name: 'Staryu', probability: 10 },     // Uncommon (10%)
      { id: 129, name: 'Magikarp', probability: 4 },    // Very rare (4%)
      { id: 90, name: 'Shellder', probability: 1 },      // Super rare (1%)
      { id: 43, name: 'Oddish', probability: 15 },       // Common (15%)
      { id: 69, name: 'Bellsprout', probability: 15 },   // Common (15%)
      { id: 114, name: 'Tangela', probability: 5 },       // Rare (5%)
      { id: 1, name: 'Squirtle', probability: 4 }, // Super rare (1%)
    ]
  },
  'Mountains (30-50)': {
    name: 'Mountains (Lvl 30-50)',
    minLevel: 30,
    maxLevel: 50,
    encounterRate: 20,
    spawnTimer: 14, // 30 seconds
    pool: [
      //bulbasaur
      {id: 1, name: 'Bulbasaur', probability: 5},
      {id: 2, name: 'Ivysaur', probability: 2.5},
      {id: 147, name: 'Dratini', probability: 1},
      {id: 148, name: 'Dragonair', probability: 0.5},
      {id: 4, name: 'Charmander', probability: 5},
      {id: 5, name: 'Charmeleon', probability: 2.5},
      {id: 58, name: 'Growlithe', probability: 10},
      {id: 59, name: 'Arcanine', probability: 5},
      {id: 126, name: 'Magmar', probability: 7.5}
    ]
  },
} as const;
export default regions;