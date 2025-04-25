import { fetchPokemonList, fetchPokemonDetails, fetchPokemonSpecies } from '../src/services/pokeApiService';
import fs from 'fs';
import path from 'path';

interface SimplifiedPokemon {
  id: number;
  name: string;
  types: string[];
  sprite: string;
  description: string;
}

async function preloadPokemonData() {
  console.log('Starting Pokémon data preload...');
  
  try {
    // Fetch first 151 Pokémon (1st generation)
    const list = await fetchPokemonList(151);
    const pokemonData: SimplifiedPokemon[] = [];

    for (const pokemon of list.results) {
      console.log(`Processing ${pokemon.name}...`);
      
      try {
        const details = await fetchPokemonDetails(pokemon.name);
        const species = await fetchPokemonSpecies(details.id);

        // Get English description, defaulting to first available if no English
        const description = species.flavor_text_entries.find(
          entry => entry.language.name === 'en'
        )?.flavor_text.replace(/[\f\n\r]/g, ' ') // Clean up formatting
          ?? species.flavor_text_entries[0].flavor_text;

        const simplifiedPokemon: SimplifiedPokemon = {
          id: details.id,
          name: details.name,
          types: details.types.map(t => t.type.name),
          sprite: details.sprites.other['official-artwork'].front_default,
          description
        };

        pokemonData.push(simplifiedPokemon);
      } catch (error) {
        console.error(`Error processing ${pokemon.name}:`, error);
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Sort by ID
    pokemonData.sort((a, b) => a.id - b.id);

    // Ensure the public directory exists
    const publicDir = path.resolve(__dirname, '../public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Write the data file
    const outputPath = path.resolve(publicDir, 'pokemon-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(pokemonData, null, 2));
    
    console.log(`Successfully saved ${pokemonData.length} Pokémon to pokemon-data.json`);
  } catch (error) {
    console.error('Failed to preload Pokémon data:', error);
    process.exit(1);
  }
}

preloadPokemonData();