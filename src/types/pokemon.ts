export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  sprite: string;
  description: string;
  currentHP?: number;
  maxHP?: number;
  experience?: number;
  level?: number;
  attack?: number;
  defense?: number;
  lastAttackTime?: number;
  isRunning?: boolean;
}