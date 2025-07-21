// src/services/battleSystem.ts
// Type effectiveness chart for all standard Pokémon types
// Each type has 'strongAgainst' (super effective) and 'weakAgainst' (not very effective)
const typeChart: Record<string, { strongAgainst: string[]; weakAgainst: string[] }> = {
  normal: { strongAgainst: [], weakAgainst: ['rock', 'steel'] },
  fire: { strongAgainst: ['grass', 'ice', 'bug', 'steel'], weakAgainst: ['fire', 'water', 'rock', 'dragon'] },
  water: { strongAgainst: ['fire', 'ground', 'rock'], weakAgainst: ['water', 'grass', 'dragon'] },
  electric: { strongAgainst: ['water', 'flying'], weakAgainst: ['electric', 'grass', 'dragon', 'ground'] },
  grass: { strongAgainst: ['water', 'ground', 'rock'], weakAgainst: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'] },
  ice: { strongAgainst: ['grass', 'ground', 'flying', 'dragon'], weakAgainst: ['fire', 'water', 'ice', 'steel'] },
  fighting: { strongAgainst: ['normal', 'ice', 'rock', 'dark', 'steel'], weakAgainst: ['poison', 'flying', 'psychic', 'bug', 'fairy'] },
  poison: { strongAgainst: ['grass', 'fairy'], weakAgainst: ['poison', 'ground', 'rock', 'ghost'] },
  ground: { strongAgainst: ['fire', 'electric', 'poison', 'rock', 'steel'], weakAgainst: ['grass', 'bug'] },
  flying: { strongAgainst: ['grass', 'fighting', 'bug'], weakAgainst: ['electric', 'rock', 'steel'] },
  psychic: { strongAgainst: ['fighting', 'poison'], weakAgainst: ['psychic', 'steel'] },
  bug: { strongAgainst: ['grass', 'psychic', 'dark'], weakAgainst: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'] },
  rock: { strongAgainst: ['fire', 'ice', 'flying', 'bug'], weakAgainst: ['fighting', 'ground', 'steel'] },
  ghost: { strongAgainst: ['psychic', 'ghost'], weakAgainst: ['dark'] },
  dragon: { strongAgainst: ['dragon'], weakAgainst: ['steel', 'fairy'] },
  dark: { strongAgainst: ['psychic', 'ghost'], weakAgainst: ['fighting', 'dark', 'fairy'] },
  steel: { strongAgainst: ['ice', 'rock', 'fairy'], weakAgainst: ['fire', 'water', 'electric', 'steel'] },
  fairy: { strongAgainst: ['fighting', 'dragon', 'dark'], weakAgainst: ['fire', 'poison', 'steel'] },
}

// Returns { multiplier, message } for effectiveness
export function getTypeEffectiveness(attackerTypes: string[], defenderTypes: string[]): { multiplier: number, message: string } {
  let multiplier = 1
  let superEffective = false
  let notEffective = false
  for (const atk of attackerTypes) {
    for (const def of defenderTypes) {
      if (typeChart[atk]?.strongAgainst.includes(def)) {
        multiplier *= 2
        superEffective = true
      } else if (typeChart[atk]?.weakAgainst.includes(def)) {
        multiplier *= 0.5
        notEffective = true
      }
    }
  }
  let message = ''
  if (superEffective && !notEffective) message = ' <span class="text-purple-400">It\'s super effective!</span>'
  else if (!superEffective && notEffective) message = ' <span class="text-gray-400">It\'s not very effective.</span>'
  else if (superEffective && notEffective) message = ' <span class="text-green-400">It has mixed effectiveness.</span>'
  else message = ''
  return { multiplier, message }
}

// Context type for battle functions
export interface BattleContext {
  battle: any
  playerPokemon: any[]
  activePokemon: any
  currentRegion: string
  player: any
  phantomContract: any
  addBattleLog: Function
  addNotification: Function
  updatePokemonHP: Function
  useInventoryItem: Function
  removeItem: Function
  handlePokemonFaint: Function
  handleXPGain: Function
  addDefeatToFearFactor: Function
  startSpawnTimer: Function
  markStateForSaving: Function
  levelUpPokemon: Function
  addPokemonToInventory: Function
  calculateDamage: Function
  getBuffStore: () => any
  getInventoryStore: () => any
}

export async function playerAttack(ctx: BattleContext): Promise<boolean> {
  const { battle, activePokemon, playerPokemon, currentRegion, phantomContract, addBattleLog, addNotification, updatePokemonHP, handleXPGain, addDefeatToFearFactor, startSpawnTimer, markStateForSaving, levelUpPokemon, addPokemonToInventory, calculateDamage, getBuffStore } = ctx
  if (!battle.wildPokemon || !activePokemon) return false
  if (battle.isPlayerAttacking) return false
  battle.isPlayerAttacking = true
  const buffStore = getBuffStore()
  buffStore.registerFireRateAttack(activePokemon.id, activePokemon.level || 1, currentRegion)
  const xpBoost = buffStore.getTotalXPBonus
  const fireRateMultiplier = buffStore.getFireRateMultiplier
  const baseXpPerAttack = 1
  const boostedXp = baseXpPerAttack + xpBoost
  const totalXpPerAttack = Math.floor(boostedXp * fireRateMultiplier)
  activePokemon.experience = (activePokemon.experience || 0) + totalXpPerAttack
  const nextLevelXP = activePokemon.experienceToNextLevel || Math.floor(100 * Math.pow(activePokemon.level || 1, 1.5))
  if (activePokemon.experience >= nextLevelXP) levelUpPokemon(activePokemon)
  // Water Emblem XP sharing
  if (buffStore.hasWaterEmblem) {
    const shareMultiplier = buffStore.getWaterEmblemShareMultiplier
    const sharedXp = Math.floor(totalXpPerAttack * shareMultiplier)
    if (sharedXp > 0) {
      const otherPartyMembers = playerPokemon.filter(p => p !== activePokemon && !p.faintedAt)
      otherPartyMembers.forEach(pokemon => {
        if (pokemon.experience !== undefined) {
          pokemon.experience += sharedXp
          const memberNextLevelXP = pokemon.experienceToNextLevel || Math.floor(100 * Math.pow(pokemon.level || 1, 1.5))
          if (pokemon.experience >= memberNextLevelXP) levelUpPokemon(pokemon)
        }
      })
      if (otherPartyMembers.length > 0) {
        addBattleLog(`<span class="text-blue-400">Water Emblem</span> shared <span class="text-green-400 font-bold">${sharedXp} XP</span> with <span class="text-blue-400 font-bold">${otherPartyMembers.length}</span> party member(s)! (<span class="text-green-400">${(shareMultiplier * 100).toFixed(1)}% sharing</span>)`, 'system')
      }
    }
  }
  // Calculate type effectiveness
  const atkTypes = activePokemon.types || []
  const defTypes = battle.wildPokemon.types || []
  const { multiplier: effectiveness, message: effectivenessMsg } = getTypeEffectiveness(atkTypes, defTypes)
  let damage = 0
  try {
    damage = calculateDamage(
      activePokemon.attack,
      battle.wildPokemon.defense,
      activePokemon.level,
      battle.wildPokemon.level
    )
    damage = Math.floor(damage * effectiveness)
  } catch (ex) {
    console.error('Error calculating damage:', ex)
    battle.isPlayerAttacking = false
    return false
  }
  battle.wildPokemon.currentHP = Math.max(0, battle.wildPokemon.currentHP - damage)
  addBattleLog(`<span class="text-blue-400 font-bold">${activePokemon.name}</span> attacks <span class="text-yellow-400 font-bold">${battle.wildPokemon.name}</span> for <span class="text-red-400 font-bold">${damage}</span> damage!${effectivenessMsg}`, 'player')
  battle.isWildPokemonHurt = true
  await new Promise(resolve => setTimeout(resolve, 200))
  battle.isPlayerAttacking = false
  battle.isWildPokemonHurt = false
  if (battle?.wildPokemon?.currentHP === 0) {
    const defeatedPokemon = { ...battle.wildPokemon }
    handleXPGain(activePokemon, defeatedPokemon)
    addDefeatToFearFactor(currentRegion)
    if (phantomContract.guaranteedCaptureAvailable) {
      addBattleLog(`<span class="text-yellow-400 font-bold">${defeatedPokemon.name}</span> fainted! <span class="text-purple-400">Phantom Contract activates - guaranteed capture!</span>`, 'system')
      const capturedPokemon = {
        ...defeatedPokemon,
        uniqueId: Math.random().toString(36).slice(2),
        currentHP: defeatedPokemon.maxHP
      }
      addPokemonToInventory(capturedPokemon)
      phantomContract.guaranteedCaptureAvailable = false
      addNotification('Phantom Contract used! Pokemon captured!', 'success')
    } else {
      addBattleLog(`<span class="text-yellow-400 font-bold">${defeatedPokemon.name}</span> fainted!`, 'system')
    }
    battle.wildPokemon = null
    startSpawnTimer()
  }
  markStateForSaving()
  return true
}

export function enemyAttack(ctx: BattleContext): void {
  const { battle, activePokemon, addBattleLog, updatePokemonHP, handlePokemonFaint, getBuffStore, getInventoryStore } = ctx
  const wildPokemon = battle.wildPokemon
  if (!wildPokemon || !activePokemon || wildPokemon.isRunning) return
  if (battle.isEnemyAttacking) return
  if (!wildPokemon.lastAttackTime) {
    wildPokemon.lastAttackTime = Date.now() - 5000 - 1000
  }
  const now = Date.now()
  if (now - wildPokemon.lastAttackTime >= 5000) {
    battle.isEnemyAttacking = true
    // Calculate type effectiveness
    const atkTypes = wildPokemon.types || []
    const defTypes = activePokemon.types || []
    const { multiplier: effectiveness, message: effectivenessMsg } = getTypeEffectiveness(atkTypes, defTypes)
    const buffStore = getBuffStore()
    const inventoryStore = getInventoryStore()
    const damage = Math.floor(ctx.calculateDamage(
      wildPokemon.attack ?? 0,
      activePokemon.defense ?? 0,
      wildPokemon.level ?? 1,
      activePokemon.level ?? 1,
      true
    ) * effectiveness)
    const currentHP = activePokemon.currentHP ?? 0
    const wouldFaint = currentHP <= damage
    if (!battle.wildPokemon || !activePokemon) {
      battle.isEnemyAttacking = false
      return
    }
    battle.enemyAttackAnimationEndTime = Date.now() + 300
    // effectivenessMsg already set by getTypeEffectiveness
    if (wouldFaint && buffStore.hasRockEmblem) {
      const potions = inventoryStore.getItemsByType('potion')
      const totalPotions = potions.reduce((sum: number, potion: any) => sum + potion.quantity, 0)
      if (potions.length >= 1 && totalPotions >= 4) {
        const sortedPotions = [...potions].sort((a, b) => {
          const healA = a.effect?.type === 'heal' ? a.effect.value : 0
          const healB = b.effect?.type === 'heal' ? b.effect.value : 0
          return healA - healB
        })
        const potion = sortedPotions[0]
        addBattleLog(`<span class="text-purple-400">Rock Emblem activated!</span> Using <span class="text-blue-400">${potion.name}</span> to prevent fainting!`, 'system')
        for(let i = 0; i < 4; i++) ctx.useInventoryItem(potion)
        inventoryStore.removeItem(potion.id, 4)
        const newCurrentHP = activePokemon.currentHP ?? 0
        const finalHP = Math.max(0, newCurrentHP - damage)
        updatePokemonHP(activePokemon, finalHP)
        addBattleLog(`<span class="text-yellow-400 font-bold">${wildPokemon.name}</span> attacks <span class="text-blue-400 font-bold">${activePokemon.name}</span> for <span class="text-red-400 font-bold">${damage}</span> damage!${effectivenessMsg}`, 'damage')
        if (battle.wildPokemon) battle.wildPokemon.lastAttackTime = now
        if (finalHP === 0) {
          addBattleLog(`<span class="text-blue-400 font-bold">${activePokemon.name}</span> fainted!`, 'system')
          handlePokemonFaint()
        }
      } else if (buffStore.shouldResistStun()) {
        const minHP = Math.max(1, Math.floor(activePokemon.maxHP * 0.1))
        addBattleLog(`<span class="text-purple-400">Rock Emblem protected <span class="text-blue-400 font-bold">${activePokemon.name}</span> from fainting!</span>`, 'system')
        updatePokemonHP(activePokemon, minHP)
        const actualDamage = currentHP - minHP
        addBattleLog(`<span class="text-yellow-400 font-bold">${wildPokemon.name}</span> attacks <span class="text-blue-400 font-bold">${activePokemon.name}</span> for <span class="text-red-400 font-bold">${actualDamage}</span> damage <span class="text-purple-400">(reduced by Rock Emblem)</span>!${effectivenessMsg}`, 'damage')
        if (battle.wildPokemon) battle.wildPokemon.lastAttackTime = now
      } else {
        const finalHP = Math.max(0, currentHP - damage)
        updatePokemonHP(activePokemon, finalHP)
        if (battle.wildPokemon) battle.wildPokemon.lastAttackTime = now
        addBattleLog(`<span class="text-yellow-400 font-bold">${wildPokemon.name}</span> attacks <span class="text-blue-400 font-bold">${activePokemon.name}</span> for <span class="text-red-400 font-bold">${damage}</span> damage!${effectivenessMsg}`, 'damage')
        if (finalHP === 0) {
          addBattleLog(`<span class="text-blue-400 font-bold">${activePokemon.name}</span> fainted!`, 'system')
          handlePokemonFaint()
        }
      }
    } else {
      const finalHP = Math.max(0, currentHP - damage)
      updatePokemonHP(activePokemon, finalHP)
      if (battle.wildPokemon) {
        battle.wildPokemon.lastAttackTime = now
      addBattleLog(`<span class="text-yellow-400 font-bold">${wildPokemon.name}</span> attacks <span class="text-blue-400 font-bold">${activePokemon.name}</span> for <span class="text-red-400 font-bold">${damage}</span> damage!${effectivenessMsg}`, 'damage')
      }
      if (finalHP === 0) {
      addBattleLog(`<span class="text-blue-400 font-bold">${activePokemon.name}</span> fainted!`, 'system')
        handlePokemonFaint()
      }
    }
  }
}
