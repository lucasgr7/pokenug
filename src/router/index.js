import { createRouter, createWebHistory } from 'vue-router'
import Explore from '../pages/Explore.vue'
import IdleJobs from '../pages/IdleJobs.vue'
import Inventory from '../pages/Inventory.vue'
import Pokedex from '../pages/Pokedex.vue'
import PokemonDebug from '../components/PokemonDebug.vue'

const routes = [
  {
    path: '/',
    name: 'explore',
    component: Explore
  },
  {
    path: '/idle-jobs',
    name: 'idleJobs',
    component: IdleJobs
  },
  {
    path: '/inventory',
    name: 'inventory',
    component: Inventory
  },
  {
    path: '/pokedex',
    name: 'pokedex',
    component: Pokedex
  },
  {
    path: '/debug',
    name: 'debug',
    component: PokemonDebug,
    beforeEnter: (to, from, next) => {
      if (import.meta.env.DEV) {
        next()
      } else {
        next('/')
      }
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router