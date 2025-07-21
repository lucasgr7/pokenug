import { defineStore } from 'pinia'
import { computed, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import type { Pokemon } from '../types/pokemon'
import { useGameStore } from './gameStore'

interface IdleJobProgress {
  jobId: string
  assignedPokemon: Pokemon[]
  startTime: number | null
  duration: number | null
  progress: number
  completedCount: number
  failedCount: number
}

export const useIdleJobStore = defineStore('idleJob', () => {
  // Persistent state for all jobs
  const jobs = useStorage<Record<string, IdleJobProgress>>(
    'idle-job-progress',
    {},
    localStorage,
    { mergeDefaults: true }
  )

  // Reference to gameStore for Pokémon ownership
  const gameStore = useGameStore()

  // Get all jobs from gameStore (static config)
  const jobConfigs = computed(() => gameStore.idleJobs)

  // Get a job's progress state
  function getJob(jobId: string): IdleJobProgress | undefined {
    return jobs.value[jobId]
  }

  // Assign Pokémon to a job
  function assignPokemonToJob(jobId: string, pokemon: Pokemon) {
    if (!jobs.value[jobId]) {
      jobs.value[jobId] = {
        jobId,
        assignedPokemon: [],
        startTime: null,
        duration: null,
        progress: 0,
        completedCount: 0,
        failedCount: 0,
      }
    }
    // Prevent duplicates
    if (!jobs.value[jobId].assignedPokemon.find((p: Pokemon) => p.uniqueId === pokemon.uniqueId)) {
      jobs.value[jobId].assignedPokemon.push(pokemon)
      resetJobTimer(jobId)
    }
  }

  // Remove Pokémon from a job
  function removePokemonFromJob(jobId: string, pokemon: Pokemon) {
    if (!jobs.value[jobId]) return
    jobs.value[jobId].assignedPokemon = jobs.value[jobId].assignedPokemon.filter((p: Pokemon) => p.uniqueId !== pokemon.uniqueId)
    resetJobTimer(jobId)
  }

  // Reset job timer and progress
  function resetJobTimer(jobId: string) {
    const config = jobConfigs.value[jobId]
    if (!config) return
    const assigned = jobs.value[jobId]?.assignedPokemon || []
    if (assigned.length === 0) {
      jobs.value[jobId].startTime = null
      jobs.value[jobId].duration = null
      jobs.value[jobId].progress = 0
      return
    }
    // Calculate duration using gameStore logic
    const duration = gameStore.getJobRemainingTime(jobId)
    jobs.value[jobId].startTime = Date.now()
    jobs.value[jobId].duration = duration
    jobs.value[jobId].progress = 0
  }

  // Calculate live progress for a job
  function getJobProgress(jobId: string): number {
    const job = jobs.value[jobId]
    if (!job?.startTime || !job?.duration) return 0
    const elapsed = Date.now() - job.startTime
    return Math.min(100, (elapsed / job.duration) * 100)
  }

  // Complete a job
  function completeJob(jobId: string) {
    if (!jobs.value[jobId]) return
    jobs.value[jobId].completedCount++
    jobs.value[jobId].progress = 100
    // Reward logic: call gameStore.completeJob(jobId)
    gameStore.completeJob(jobId)
    resetJobTimer(jobId)
  }

  // Background timer to update progress
  setInterval(() => {
    Object.keys(jobs.value).forEach(jobId => {
      const job = jobs.value[jobId]
      if (job?.startTime && job?.duration && job.assignedPokemon.length > 0) {
        const progress = getJobProgress(jobId)
        job.progress = progress
        if (progress >= 100) {
          completeJob(jobId)
        }
      } else if (job) {
        job.progress = 0
      }
    })
  }, 1000)

  // Watch for Pokémon removal from gameStore and clean up assignments
  watch(
    () => gameStore.getAllPokemon,
    (allPokemon: Pokemon[]) => {
      Object.values(jobs.value).forEach(job => {
        job.assignedPokemon = job.assignedPokemon.filter((p: Pokemon) => allPokemon.some((ap: Pokemon) => ap.uniqueId === p.uniqueId))
      })
    },
    { deep: true }
  )

  return {
    jobs,
    getJob,
    assignPokemonToJob,
    removePokemonFromJob,
    getJobProgress,
    completeJob,
    resetJobTimer,
  }
})
