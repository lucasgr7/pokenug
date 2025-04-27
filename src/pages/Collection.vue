<script lang="ts" setup>
import PokemonGrid from '@/components/PokemonGrid.vue'
import { ref } from 'vue'

const showParty = ref(true)
const verticalMode = ref(false)
const columnSize = ref(6)
</script>
<template>
    <div>
        <!-- Configuration Panel -->
        <div class="bg-white shadow rounded-lg p-4 mb-4">
            <h2 class="text-lg font-medium mb-3">Grid Display Options</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="flex items-center">
                    <input 
                        id="show-party" 
                        type="checkbox" 
                        v-model="showParty"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    >
                    <label for="show-party" class="ml-2 block text-sm text-gray-700">
                        Show Party Section
                    </label>
                </div>
                
                <div class="flex items-center">
                    <input 
                        id="vertical-mode" 
                        type="checkbox" 
                        v-model="verticalMode"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    >
                    <label for="vertical-mode" class="ml-2 block text-sm text-gray-700">
                        Vertical Mode
                    </label>
                </div>
                
                <div class="flex items-center space-x-2">
                    <label for="column-size" class="block text-sm text-gray-700">
                        Column Size:
                    </label>
                    <select 
                        id="column-size" 
                        v-model="columnSize"
                        class="mt-1 block w-full pl-3 pr-10 py-1 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                        <option v-for="n in 12" :key="n" :value="n">{{ n }}</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Pokemon Grid with configuration options passed as props -->
        <PokemonGrid 
            :show-party="showParty" 
            :vertical-mode="verticalMode"
            :column-size="columnSize"
        />
    </div>
</template>