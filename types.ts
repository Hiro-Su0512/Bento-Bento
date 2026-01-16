
export type Mode = 'week' | 'five';

export interface BentoItem {
  name: string;
  recipeUrl: string;
}

export interface BentoDay {
  day: string;
  mains: BentoItem[];
  sides: BentoItem[];
  point: string;
}

export interface BentoIdea {
  name: string;
  mains: BentoItem[];
  sides: BentoItem[];
  description: string;
  point: string;
  makeAhead: '可' | '不可';
}

export interface ApiResponse {
  weekData?: {
    days: BentoDay[];
    prepList: string[];
    shoppingList?: string[];
  };
  fiveData?: BentoIdea[];
}

export interface AppState {
  mode: Mode;
  ingredients: string;
  grandma_vegetables: string;
  usual_ingredients: string;
  loading: boolean;
  result: ApiResponse | null;
  error: string | null;
}
