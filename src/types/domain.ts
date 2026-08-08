export type UserRole = "chef" | "server";

export type User = {
  id: string;
  role: UserRole;
  displayName: string;
  title: string;
  accent: string;
};

export type RecipeType =
  | "receta real"
  | "plato del restaurante"
  | "regalo culinario"
  | "experimento";

export type FlavorTag =
  | "dulce"
  | "salado"
  | "bebida"
  | "cocina marroqui"
  | "cocina francesa"
  | "experimental"
  | "favoritos";

export type IngredientCategory =
  | "especias"
  | "frutas"
  | "vegetales"
  | "carnes"
  | "pescados"
  | "chocolates"
  | "harinas"
  | "lacteos"
  | "hierbas"
  | "ingredientes magicos"
  | "otros";

export type Rarity = "comun" | "fino" | "raro" | "secreto";

export type Ingredient = {
  id: string;
  name: string;
  category: IngredientCategory;
  description: string;
  rarity: Rarity;
  icon: string;
  unlocked: boolean;
  origin: string;
  notes: string;
  relatedRecipeIds: string[];
};

export type Client = {
  id: string;
  name: string;
  archetype: string;
  personality: string;
  preferences: string[];
  hatedIngredients: string[];
  demandLevel: 1 | 2 | 3 | 4 | 5;
  reviewStyle: string;
  usualTip: number;
  visits: number;
};

export type Order = {
  id: string;
  clientId: string;
  prompt: string;
  constraints: string[];
  mood: string;
};

export type MysteryBox = {
  principal: Ingredient;
  spice: Ingredient;
  fruit: Ingredient;
  vegetable: Ingredient;
  texture: string;
  unexpected: Ingredient;
  technique: string;
  mood: string;
};

export type Review = {
  id: string;
  clientId: string;
  dishId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  comment: string;
  tipAmount: number;
  complaint?: string;
  willReturn: boolean;
};

export type Dish = {
  id: string;
  name: string;
  creatorId: string;
  clientId?: string;
  orderId?: string;
  date: string;
  image?: string;
  source: "cuisine" | "gift" | "archive";
  ingredients: string[];
  ownIngredients: string[];
  quantities?: string;
  technique: string;
  preparation: string;
  presentation: string;
  chefNote: string;
  serverNote: string;
  story: string;
  pairing: string;
  savedAsRecipe: boolean;
  favorite: boolean;
  rating?: number;
  tipAmount?: number;
};

export type Recipe = {
  id: string;
  name: string;
  authorId: string;
  date: string;
  ingredients: string[];
  quantities: string;
  steps: string[];
  difficulty: "facil" | "media" | "ritual";
  time: string;
  photo?: string;
  notes: string;
  nextChange: string;
  story: string;
  origin: string;
  tags: FlavorTag[];
  favorite: boolean;
  type: RecipeType;
};

export type Tip = {
  id: string;
  from: string;
  to?: string;
  source: "cliente" | "receta regalada" | "reto" | "logro";
  amount: number;
  stars?: number;
  note: string;
  gift?: string;
  date: string;
};

export type RestaurantItem = {
  id: string;
  name: string;
  description: string;
  category: "decoracion" | "vajilla" | "ingrediente" | "utensilio" | "zona";
  cost: number;
  unlocked: boolean;
  visualEffect: string;
};

export type LetterType =
  | "nota"
  | "receta dedicada"
  | "propuesta de plato"
  | "mensaje"
  | "reto culinario";

export type Letter = {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: LetterType;
  title: string;
  body: string;
  date: string;
  linkedRecipeId?: string;
  linkedDishId?: string;
  linkedIngredientId?: string;
  linkedClientId?: string;
};

export type Challenge = {
  id: string;
  title: string;
  prompt: string;
  reward: number;
  completed: boolean;
};

export type RestaurantProgress = {
  level: number;
  levelName: string;
  servedDishes: number;
  savedRecipes: number;
  satisfiedClients: number;
  completedChallenges: number;
  nextLevelAt: number;
};

export type DishDraft = {
  name: string;
  usedIngredients: string;
  quantities: string;
  technique: string;
  preparation: string;
  presentation: string;
  chefNote: string;
  serverNote: string;
  story: string;
  pairing: string;
  saveAsRecipe: boolean;
};
