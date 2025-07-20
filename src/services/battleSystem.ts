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
        multiplier *= 4
        superEffective = true
      } else if (typeChart[atk]?.weakAgainst.includes(def)) {
        multiplier *= 0.5
        notEffective = true
      }
    }
  }
  let message = ''
  if (superEffective && !notEffective) message = " It's super effective!"
  else if (!superEffective && notEffective) message = " It's not very effective."
  else if (superEffective && notEffective) message = " It has mixed effectiveness."
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
        addBattleLog(`Water Emblem shared ${sharedXp} XP with ${otherPartyMembers.length} party member(s)! (${(shareMultiplier * 100).toFixed(1)}% sharing)`, 'system')
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
  addBattleLog(`${activePokemon.name} attacks ${battle.wildPokemon.name} for ${damage} damage!${effectivenessMsg}`, 'damage')
  battle.isWildPokemonHurt = true
  await new Promise(resolve => setTimeout(resolve, 200))
  if (totalXpPerAttack > 0) {
    let xpLogMessage = ''
    if (baseXpPerAttack > 0) xpLogMessage = `+${baseXpPerAttack} base XP`
    if (xpBoost > 0) xpLogMessage += (xpLogMessage ? ', ' : '') + `+${xpBoost} XP from Toxic Emblem`
    const fireRateState = buffStore.getFireRateState
    if (fireRateState.active && fireRateMultiplier > 1) {
      xpLogMessage += (xpLogMessage ? ', ' : '') + `x${fireRateMultiplier.toFixed(1)} Fire Rate`
      xpLogMessage += ` (tier ${fireRateState.tier})`
    }
    addBattleLog(`${xpLogMessage} = ${totalXpPerAttack} total XP gained!`, 'system')
  }
  battle.isPlayerAttacking = false
  battle.isWildPokemonHurt = false
  if (battle?.wildPokemon?.currentHP === 0) {
    const defeatedPokemon = { ...battle.wildPokemon }
    handleXPGain(activePokemon, defeatedPokemon)
    addDefeatToFearFactor(currentRegion)
    if (phantomContract.guaranteedCaptureAvailable) {
      addBattleLog(`${defeatedPokemon.name} fainted! Phantom Contract activates - guaranteed capture!`, 'system')
      const capturedPokemon = {
        ...defeatedPokemon,
        uniqueId: Math.random().toString(36).slice(2),
        currentHP: defeatedPokemon.maxHP
      }
      addPokemonToInventory(capturedPokemon)
      phantomContract.guaranteedCaptureAvailable = false
      addNotification('Phantom Contract used! Pokemon captured!', 'success')
    } else {
      addBattleLog(`${defeatedPokemon.name} fainted!`, 'system')
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
        addBattleLog(`Rock Emblem activated! Using ${potion.name} to prevent fainting!`, 'system')
        for(let i = 0; i < 4; i++) ctx.useInventoryItem(potion)
        inventoryStore.removeItem(potion.id, 4)
        const newCurrentHP = activePokemon.currentHP ?? 0
        const finalHP = Math.max(0, newCurrentHP - damage)
        updatePokemonHP(activePokemon, finalHP)
        addBattleLog(`${wildPokemon.name} attacks ${activePokemon.name} for ${damage} damage!${effectivenessMsg}`, 'damage')
        if (battle.wildPokemon) battle.wildPokemon.lastAttackTime = now
        if (finalHP === 0) {
          addBattleLog(`${activePokemon.name} fainted!`, 'system')
          handlePokemonFaint()
        }
      } else if (buffStore.shouldResistStun()) {
        const minHP = Math.max(1, Math.floor(activePokemon.maxHP * 0.1))
        addBattleLog(`Rock Emblem protected ${activePokemon.name} from fainting!`, 'system')
        updatePokemonHP(activePokemon, minHP)
        const actualDamage = currentHP - minHP
        addBattleLog(`${wildPokemon.name} attacks ${activePokemon.name} for ${actualDamage} damage (reduced by Rock Emblem)!${effectivenessMsg}`, 'damage')
        if (battle.wildPokemon) battle.wildPokemon.lastAttackTime = now
      } else {
        const finalHP = Math.max(0, currentHP - damage)
        updatePokemonHP(activePokemon, finalHP)
        if (battle.wildPokemon) battle.wildPokemon.lastAttackTime = now
        addBattleLog(`${wildPokemon.name} attacks ${activePokemon.name} for ${damage} damage!${effectivenessMsg}`, 'damage')
        if (finalHP === 0) {
          addBattleLog(`${activePokemon.name} fainted!`, 'system')
          handlePokemonFaint()
        }
      }
    } else {
      const finalHP = Math.max(0, currentHP - damage)
      updatePokemonHP(activePokemon, finalHP)
      if (battle.wildPokemon) {
        battle.wildPokemon.lastAttackTime = now
        addBattleLog(`${wildPokemon.name} attacks ${activePokemon.name} for ${damage} damage!${effectivenessMsg}`, 'damage')
      }
      if (finalHP === 0) {
        addBattleLog(`${activePokemon.name} fainted!`, 'system')
        handlePokemonFaint()
      }
    }
  }
}
