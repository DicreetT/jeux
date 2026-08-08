import { clients, ingredients, orders } from "@/src/data/mock-data";
import type {
  Client,
  Dish,
  DishDraft,
  MysteryBox,
  Order,
  RestaurantProgress,
  Review,
} from "@/src/types/domain";

const textures = [
  "crujiente fino",
  "cremoso templado",
  "glaseado brillante",
  "hojaldre quebradizo",
  "salsa sedosa",
  "miga tostada",
];

const techniques = [
  "caramelizar",
  "asar lentamente",
  "infusionar",
  "flambear con prudencia",
  "confitar",
  "sellar y reposar",
];

const moods = [
  "noche de tormenta",
  "verano tardio",
  "secreto de sobremesa",
  "viaje al atardecer",
  "romance contenido",
  "memoria antigua",
];

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

function hash(input: string): number {
  return input.split("").reduce((sum, char, index) => {
    return sum + char.charCodeAt(0) * (index + 7);
  }, 0);
}

function byCategory(category: string) {
  return ingredients.filter((ingredient) => ingredient.category === category && ingredient.unlocked);
}

export function getTodaysClient(rotation = 0): Client {
  return clients[Math.abs(rotation) % clients.length];
}

export function getOrderForClient(clientId: string): Order {
  return orders.find((order) => order.clientId === clientId) ?? orders[0];
}

export function generateMysteryBox(clientId: string): MysteryBox {
  const seed = hash(clientId);
  const unlocked = ingredients.filter((ingredient) => ingredient.unlocked);

  return {
    principal: pick(unlocked, seed + 1),
    spice: pick(byCategory("especias"), seed + 2),
    fruit: pick(byCategory("frutas"), seed + 3),
    vegetable: pick(byCategory("vegetales"), seed + 4),
    texture: pick(textures, seed + 5),
    unexpected: pick(unlocked, seed + 6),
    technique: pick(techniques, seed + 7),
    mood: pick(moods, seed + 8),
  };
}

export function generateReview(client: Client, dish: Dish, draft: DishDraft): Review {
  const ingredientText = [...dish.ingredients, ...dish.ownIngredients, draft.preparation]
    .join(" ")
    .toLowerCase();
  const preferenceHits = client.preferences.filter((preference) =>
    ingredientText.includes(preference.toLowerCase()),
  ).length;
  const hatedHits = client.hatedIngredients.filter((ingredient) =>
    ingredientText.includes(ingredient.toLowerCase()),
  ).length;
  const hasStory = draft.story.trim().length > 24;
  const hasPresentation = draft.presentation.trim().length > 18;
  const base = 3 + Math.min(2, preferenceHits) - hatedHits + (hasStory ? 1 : 0) + (hasPresentation ? 1 : 0);
  const stars = Math.max(1, Math.min(5, base - (client.demandLevel >= 5 ? 1 : 0))) as Review["stars"];
  const tipAmount = Math.max(0, client.usualTip + (stars - 3) * 8 - hatedHits * 10);

  const praise = {
    celeste: "Buen equilibrio. La fruta esta bien asada y el crujiente no estorba.",
    basil: "La salsa tiene fondo y el amargo esta controlado. Aun falta un poco de precision.",
    samir: "Ligero, bien condimentado y con acidez suficiente. Pediria pan aparte.",
    lys: "Buen postre: chocolate presente, dulzor medido y textura clara.",
    nadir: "La combinacion funciona. La especia amarga queda mejor de lo esperado.",
    fantome: "Sopa caliente, textura lisa y ahumado discreto. Correcto.",
  }[client.id];

  const complaint =
    hatedHits > 0
      ? `Detecte ${client.hatedIngredients[0]}. Conviene revisar la restriccion antes del pase.`
      : stars < 4
        ? "La idea es buena, pero falta ajustar tecnica o sazon."
        : undefined;

  return {
    id: `review-${dish.id}`,
    clientId: client.id,
    dishId: dish.id,
    stars,
    comment: praise ?? "La mesa quedo en silencio, que aqui suele ser buena senal.",
    tipAmount,
    complaint,
    willReturn: stars >= 4 || client.visits > 2,
  };
}

export function makeDishFromDraft(params: {
  draft: DishDraft;
  client: Client;
  order: Order;
  boxIngredients: string[];
  ownIngredients: string[];
  creatorId: string;
}): Dish {
  const { draft, client, order, boxIngredients, ownIngredients, creatorId } = params;
  const id = `dish-${Date.now()}`;

  return {
    id,
    name: draft.name.trim() || "Plato sin nombre, pero con intenciones",
    creatorId,
    clientId: client.id,
    orderId: order.id,
    date: new Date().toISOString().slice(0, 10),
    source: "cuisine",
    ingredients: boxIngredients,
    ownIngredients,
    quantities: draft.quantities,
    technique: draft.technique,
    preparation: draft.preparation,
    presentation: draft.presentation,
    chefNote: draft.chefNote,
    serverNote: draft.serverNote,
    story: draft.story,
    pairing: draft.pairing,
    savedAsRecipe: draft.saveAsRecipe,
    favorite: false,
  };
}

export function calculateProgress(base: RestaurantProgress, dishesCount: number, recipesCount: number) {
  const points =
    base.servedDishes +
    dishesCount +
    base.savedRecipes +
    recipesCount +
    base.satisfiedClients +
    base.completedChallenges * 2;
  const level = points >= 28 ? 4 : points >= 20 ? 3 : points >= 10 ? 2 : 1;
  const names = {
    1: "Cocina secreta",
    2: "Petit Bistrot",
    3: "Atelier Culinaire",
    4: "Maison des Saveurs",
    5: "Restaurant des Deux Alchimistes",
  };

  return {
    level,
    levelName: names[level as keyof typeof names],
    points,
    nextLevelAt: level === 1 ? 10 : level === 2 ? 20 : level === 3 ? 28 : 40,
  };
}
