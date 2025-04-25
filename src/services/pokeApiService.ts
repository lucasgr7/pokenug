interface PokemonListResponse {
  count: number;
  results: Array<{
    name: string;
    url: string;
  }>;
}

interface PokemonDetails {
  id: number;
  name: string;
  types: Array<{
    slot: number;
    type: {
      name: string;
    };
  }>;
  sprites: {
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
}

interface PokemonSpecies {
  flavor_text_entries: Array<{
    flavor_text: string;
    language: {
      name: string;
    };
  }>;
}

const BASE_URL = 'https://pokeapi.co/api/v2';

export async function fetchPokemonList(limit: number): Promise<PokemonListResponse> {
  const response = await fetch(`${BASE_URL}/pokemon?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch Pokemon list');
  return response.json();
}

export async function fetchPokemonDetails(name: string): Promise<PokemonDetails> {
  const response = await fetch(`${BASE_URL}/pokemon/${name}`);
  if (!response.ok) throw new Error(`Failed to fetch Pokemon details for ${name}`);
  return response.json();
}

export async function fetchPokemonSpecies(id: number): Promise<PokemonSpecies> {
  const response = await fetch(`${BASE_URL}/pokemon-species/${id}`);
  if (!response.ok) throw new Error(`Failed to fetch Pokemon species for ID ${id}`);
  return response.json();
}