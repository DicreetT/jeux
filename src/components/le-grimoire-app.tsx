"use client";

import Image from "next/image";
import { FormEvent, ReactNode, useMemo, useState } from "react";
import {
  dishes as mockDishes,
  ingredients,
  letters,
  progress as baseProgress,
  recipes as mockRecipes,
  restaurantItems,
  tips as mockTips,
  users,
} from "@/src/data/mock-data";
import {
  calculateProgress,
  generateMysteryBox,
  generateReview,
  getOrderForClient,
  getTodaysClient,
  makeDishFromDraft,
} from "@/src/lib/game";
import type { Dish, DishDraft, FlavorTag, Ingredient, Recipe, Review, Tip } from "@/src/types/domain";

type SectionId =
  | "home"
  | "comptoir"
  | "cuisine"
  | "grimoire"
  | "reserve"
  | "caisse"
  | "lettres"
  | "evaluation";

type Hotspot = {
  id: string;
  label: string;
  tooltip: string;
  x: number;
  y: number;
  target?: SectionId;
  onClick?: () => void;
  variant?: "book" | "door" | "object" | "quiet";
};

const roomLabels: Record<SectionId, string> = {
  home: "Salon",
  comptoir: "Le Comptoir",
  cuisine: "Cuisine",
  grimoire: "Le Grimoire",
  reserve: "La Reserve",
  caisse: "La Caisse",
  lettres: "Les Lettres",
  evaluation: "Evaluation",
};

const emptyDraft: DishDraft = {
  name: "",
  usedIngredients: "",
  quantities: "",
  technique: "",
  preparation: "",
  presentation: "",
  chefNote: "",
  serverNote: "",
  story: "",
  pairing: "",
  saveAsRecipe: true,
};

const recipeFilters: Array<FlavorTag | "todos"> = [
  "todos",
  "dulce",
  "salado",
  "bebida",
  "cocina marroqui",
  "cocina francesa",
  "experimental",
  "favoritos",
];

function userName(userId: string) {
  return users.find((user) => user.id === userId)?.displayName ?? "La casa";
}

function Stars({ value }: { value: number }) {
  return (
    <span className="stars" aria-label={`${value} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} aria-hidden="true">
          {index < value ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

function Scene({
  title,
  subtitle,
  image,
  alt,
  active,
  hotspots,
  onNavigate,
  showTitle = true,
  children,
}: {
  title: string;
  subtitle?: string;
  image: string;
  alt: string;
  active: boolean;
  hotspots?: Hotspot[];
  onNavigate: (section: SectionId) => void;
  showTitle?: boolean;
  children?: ReactNode;
}) {
  if (!active) return null;

  return (
    <section className="room-stage" aria-label={title}>
      <div className="scene-frame">
        <Image src={image} alt={alt} fill priority={title === "Salon"} unoptimized sizes="100vw" className="scene-image" />
        <div className="scene-vignette" />
        {showTitle ? (
          <header className="room-title">
            <p>{subtitle}</p>
            <h1>{title}</h1>
          </header>
        ) : null}
        {hotspots?.map((hotspot) => (
          <button
            key={hotspot.id}
            type="button"
            className={`hotspot ${hotspot.variant ?? "object"}`}
            style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
            onClick={() => (hotspot.onClick ? hotspot.onClick() : hotspot.target ? onNavigate(hotspot.target) : undefined)}
            aria-label={hotspot.tooltip}
          >
            <span>{hotspot.label}</span>
            <small>{hotspot.tooltip}</small>
          </button>
        ))}
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      )}
    </label>
  );
}

export function LeGrimoireApp() {
  const [activeSection, setActiveSection] = useState<SectionId>("home");
  const clientIndex = 1;
  const [creatorId, setCreatorId] = useState("chef");
  const [ownIngredient, setOwnIngredient] = useState("");
  const [ownIngredients, setOwnIngredients] = useState<string[]>(["Yogur salado", "Tomillo"]);
  const [draft, setDraft] = useState<DishDraft>({
    ...emptyDraft,
    name: "Agneau citron, legumes rotis",
    technique: "saisir, rotir, terminer avec une sauce courte",
    preparation:
      "Sellar la carne, asar los vegetales y montar una salsa con limon confitado. Ajustar sal y acidez al final.",
    presentation: "Plato blanco, salsa en el fondo, guarnicion a un lado y hierbas frescas al pase.",
    chefNote: "Controlar el picante. El cliente pidio citrico, no fuego.",
    serverNote: "Recomendar agua con menta o vino blanco seco.",
    story: "Plato de servicio: claro, caliente y bien equilibrado.",
    pairing: "Vino blanco seco o te verde con menta",
  });
  const [savedDishes, setSavedDishes] = useState<Dish[]>(mockDishes);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>(mockRecipes);
  const [tips, setTips] = useState<Tip[]>(mockTips);
  const [lastReview, setLastReview] = useState<Review | null>(null);
  const [recipeFilter, setRecipeFilter] = useState<FlavorTag | "todos">("todos");
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient>(ingredients[0]);
  const [bookIndex, setBookIndex] = useState(0);

  const activeClient = getTodaysClient(clientIndex);
  const activeOrder = getOrderForClient(activeClient.id);
  const mysteryBox = generateMysteryBox(activeClient.id);
  const challengeIngredients = [
    mysteryBox.principal.name,
    mysteryBox.spice.name,
    mysteryBox.fruit.name,
    mysteryBox.vegetable.name,
    mysteryBox.unexpected.name,
  ];
  const balance = tips.reduce((sum, tip) => sum + tip.amount, 0);
  const unlockedItems = restaurantItems.filter((item) => item.unlocked).length;
  const progress = calculateProgress(baseProgress, savedDishes.length, savedRecipes.length);
  const activeRecipe = savedRecipes[bookIndex % savedRecipes.length];

  const filteredRecipes = useMemo(() => {
    if (recipeFilter === "todos") return savedRecipes;
    if (recipeFilter === "favoritos") return savedRecipes.filter((recipe) => recipe.favorite);
    return savedRecipes.filter((recipe) => recipe.tags.includes(recipeFilter));
  }, [recipeFilter, savedRecipes]);

  function updateDraft<K extends keyof DishDraft>(key: K, value: DishDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function addOwnIngredient() {
    const next = ownIngredient.trim();
    if (!next || ownIngredients.includes(next)) return;
    setOwnIngredients((current) => [...current, next]);
    setOwnIngredient("");
  }

  function completeService() {
    const dish = makeDishFromDraft({
      draft,
      client: activeClient,
      order: activeOrder,
      boxIngredients: challengeIngredients,
      ownIngredients,
      creatorId,
    });
    const review = generateReview(activeClient, dish, draft);
    const completedDish = { ...dish, rating: review.stars, tipAmount: review.tipAmount };

    setSavedDishes((current) => [completedDish, ...current]);
    setLastReview(review);
    setTips((current) => [
      {
        id: `tip-${dish.id}`,
        from: activeClient.name,
        source: "cliente",
        amount: review.tipAmount,
        stars: review.stars,
        note: review.comment,
        date: dish.date,
      },
      ...current,
    ]);
    setActiveSection("evaluation");

    if (draft.saveAsRecipe) {
      setSavedRecipes((current) => [
        {
          id: `rec-${dish.id}`,
          name: dish.name,
          authorId: creatorId,
          date: dish.date,
          ingredients: [...challengeIngredients, ...ownIngredients],
          quantities: draft.quantities || "cantidades pendientes de afinar",
          steps: [draft.technique || "Elegir tecnica", draft.preparation || "Preparar y ajustar"],
          difficulty: activeClient.demandLevel >= 4 ? "ritual" : "media",
          time: "por medir",
          notes: [draft.chefNote, draft.serverNote].filter(Boolean).join(" / "),
          nextChange: "Anotar tiempo real y ajustar emplatado.",
          story: draft.story,
          origin: "Le Comptoir",
          tags: ["experimental", activeOrder.prompt.includes("postre") ? "dulce" : "salado"],
          favorite: false,
          type: "plato del restaurante",
        },
        ...current,
      ]);
    }
  }

  function serveDish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    completeService();
  }

  const salonHotspots: Hotspot[] = [
    { id: "doors-cuisine", label: "Cuisine", tooltip: "Entrar sin comanda", x: 61, y: 28, target: "cuisine", variant: "quiet" },
    { id: "book-caisse", label: "La Caisse", tooltip: "Abrir recibo y saldo", x: 54, y: 73, target: "caisse", variant: "book" },
    { id: "book-lettres", label: "Les Lettres", tooltip: "Correspondencia privada", x: 61, y: 83, target: "lettres", variant: "book" },
  ];

  const cuisineHotspots: Hotspot[] = [
    { id: "prep", label: "Mesa central", tooltip: "Continuar plato", x: 45, y: 63, variant: "object" },
    { id: "bell", label: "Pedido activo", tooltip: "Revisar comanda", x: 31, y: 39, variant: "quiet" },
    { id: "reserve-door", label: "Reserve", tooltip: "Ir a la despensa", x: 74, y: 33, target: "reserve", variant: "door" },
    { id: "service-door", label: "Pause", tooltip: "Sortie de service", x: 17, y: 48, target: "lettres", variant: "quiet" },
    { id: "pass", label: "Pase", tooltip: "Servir cuando este listo", x: 80, y: 72, onClick: completeService, variant: "object" },
  ];

  return (
    <main className="restaurant-world">
      <Scene
        title="Le Grimoire"
        subtitle="restaurant prive pour deux"
        image="/scenes/salon/salon.png"
        alt="Salon elegante de restaurante con libro de reservas y puertas de cocina al fondo"
        active={activeSection === "home"}
        hotspots={salonHotspots}
        onNavigate={setActiveSection}
        showTitle={false}
      >
        <button className="closed-grimoire" type="button" onClick={() => setActiveSection("grimoire")} aria-label="Abrir el libro de recetas">
          <span>Le Grimoire</span>
        </button>
        <aside className="reservation-note">
          <span>Libro de reservas</span>
          <strong>{activeClient.name}</strong>
          <div className="reservation-details">
            <small>Mesa 3 · 21:00 · dificultad {activeClient.demandLevel}/5</small>
            <p>{activeOrder.prompt}</p>
            <small>Condiciones: {activeOrder.constraints.join(" · ")}</small>
          </div>
          <button type="button" onClick={() => setActiveSection("comptoir")}>
            Voir la commande
          </button>
        </aside>
      </Scene>

      <Scene
        title="Le Comptoir"
        subtitle="un cliente, una comanda"
        image="/scenes/comptoir/comptoir.png"
        alt="Comptoir de restaurante con un cliente esperando su pedido"
        active={activeSection === "comptoir"}
        onNavigate={setActiveSection}
      >
        <aside className="client-docket">
          <div className="docket-top">
            <span>{activeClient.archetype}</span>
            <Stars value={activeClient.demandLevel} />
          </div>
          <h2>{activeClient.name}</h2>
          <p>{activeClient.personality}</p>
          <dl>
            <div>
              <dt>Pide</dt>
              <dd>{activeOrder.prompt}</dd>
            </div>
            <div>
              <dt>Prefiere</dt>
              <dd>{activeClient.preferences.join(", ")}</dd>
            </div>
            <div>
              <dt>Ingredientes prohibidos</dt>
              <dd>{activeClient.hatedIngredients.join(", ")}</dd>
            </div>
            <div>
              <dt>Condiciones</dt>
              <dd>{activeOrder.constraints.join(", ")}</dd>
            </div>
          </dl>
          <button className="scene-action" type="button" onClick={() => setActiveSection("cuisine")}>
            Accepter la commande
          </button>
        </aside>
      </Scene>

      <Scene
        title="La Cuisine"
        subtitle="reto culinario en servicio"
        image="/scenes/cuisine/cuisine.png"
        alt="Cocina profesional con cobre, especias, fuego y mesa de preparacion"
        active={activeSection === "cuisine"}
        hotspots={cuisineHotspots}
        onNavigate={setActiveSection}
      >
        <form className="kitchen-workbench" onSubmit={serveDish}>
          <section className="order-ticket">
            <span>Comanda</span>
            <strong>{activeClient.name}</strong>
            <p>{activeOrder.prompt}</p>
            <small>Tiempo estimado: 45 min · Tecnica sugerida: {mysteryBox.technique}</small>
          </section>

          <section className="challenge-tray">
            <h2>Ingredientes del reto</h2>
            <div className="ingredient-lines">
              {challengeIngredients.map((ingredient) => (
                <span key={ingredient}>{ingredient}</span>
              ))}
            </div>
            <h2>Ingredientes añadidos por el Chef</h2>
            <div className="add-ingredient">
              <input
                value={ownIngredient}
                onChange={(event) => setOwnIngredient(event.target.value)}
                placeholder="añadir ingrediente"
                aria-label="Ingrediente añadido"
              />
              <button type="button" onClick={addOwnIngredient}>
                +
              </button>
            </div>
            <div className="ingredient-lines own">
              {ownIngredients.map((ingredient) => (
                <button key={ingredient} type="button" onClick={() => setOwnIngredients((items) => items.filter((item) => item !== ingredient))}>
                  {ingredient}
                </button>
              ))}
            </div>
          </section>

          <section className="prep-sheet">
            <div className="form-row">
              <Field label="Nombre del plato" value={draft.name} onChange={(value) => updateDraft("name", value)} />
              <label className="field">
                <span>Creador principal</span>
                <select value={creatorId} onChange={(event) => setCreatorId(event.target.value)}>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Field label="Cantidades" value={draft.quantities} onChange={(value) => updateDraft("quantities", value)} />
            <Field label="Tecnica" value={draft.technique} onChange={(value) => updateDraft("technique", value)} />
            <Field label="Preparacion" value={draft.preparation} onChange={(value) => updateDraft("preparation", value)} multiline />
            <Field label="Presentacion" value={draft.presentation} onChange={(value) => updateDraft("presentation", value)} multiline />
            <div className="form-row">
              <Field label="Nota del Chef" value={draft.chefNote} onChange={(value) => updateDraft("chefNote", value)} multiline />
              <Field label="Nota de la Mesera" value={draft.serverNote} onChange={(value) => updateDraft("serverNote", value)} multiline />
            </div>
            <Field label="Historia breve" value={draft.story} onChange={(value) => updateDraft("story", value)} multiline />
            <Field label="Maridaje" value={draft.pairing} onChange={(value) => updateDraft("pairing", value)} />
            <label className="check-row">
              <input type="checkbox" checked={draft.saveAsRecipe} onChange={(event) => updateDraft("saveAsRecipe", event.target.checked)} />
              Guardar en Le Grimoire
            </label>
            <button className="scene-action" type="button" onClick={completeService}>
              Servir plato
            </button>
          </section>

        </form>
      </Scene>

      <Scene
        title="Evaluation"
        subtitle="le client goute le plat"
        image="/scenes/salon/salon.png"
        alt="Salon del restaurante durante la evaluacion del plato"
        active={activeSection === "evaluation"}
        onNavigate={setActiveSection}
      >
        <aside className="evaluation-sheet">
          <span>Evaluation</span>
          {lastReview ? (
            <>
              <h2>{draft.name}</h2>
              <Stars value={lastReview.stars} />
              <p>{lastReview.comment}</p>
              {lastReview.complaint ? <small>{lastReview.complaint}</small> : <small>Commande respetada sin queja formal.</small>}
              <dl>
                <div>
                  <dt>Respect de la commande</dt>
                  <dd>{lastReview.stars >= 4 ? "bien" : "a revisar"}</dd>
                </div>
                <div>
                  <dt>Propina</dt>
                  <dd>{lastReview.tipAmount} monedas</dd>
                </div>
              </dl>
              <button className="scene-action" type="button" onClick={() => setActiveSection("home")}>
                Volver al salon
              </button>
            </>
          ) : (
            <p>Primero hay que servir un plato.</p>
          )}
        </aside>
      </Scene>

      <Scene
        title="La Reserve"
        subtitle="despensa del restaurante"
        image="/scenes/reserve/reserve.png"
        alt="Despensa antigua con estanterias, frascos, especias y ceramica"
        active={activeSection === "reserve"}
        onNavigate={setActiveSection}
        hotspots={[
          { id: "back-kitchen", label: "Cuisine", tooltip: "Volver a cocina", x: 51, y: 43, target: "cuisine", variant: "door" },
        ]}
      >
        <div className="reserve-shelf">
          <div className="shelf-items" aria-label="Ingredientes de La Reserve">
            {ingredients.slice(0, 12).map((ingredient) => (
              <button
                key={ingredient.id}
                type="button"
                className={selectedIngredient.id === ingredient.id ? "jar active" : "jar"}
                onClick={() => setSelectedIngredient(ingredient)}
              >
                <span>{ingredient.icon}</span>
                {ingredient.name}
              </button>
            ))}
          </div>
          <aside className="ingredient-file">
            <span>{selectedIngredient.category}</span>
            <h2>{selectedIngredient.name}</h2>
            <p>{selectedIngredient.description}</p>
            <dl>
              <div>
                <dt>Origen</dt>
                <dd>{selectedIngredient.origin}</dd>
              </div>
              <div>
                <dt>Rareza</dt>
                <dd>{selectedIngredient.rarity}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{selectedIngredient.unlocked ? "desbloqueado" : "bloqueado"}</dd>
              </div>
            </dl>
            <small>{selectedIngredient.notes}</small>
          </aside>
        </div>
      </Scene>

      <Scene
        title="Le Grimoire"
        subtitle="libro abierto"
        image="/scenes/grimoire/grimoire.png"
        alt="Grimorio culinario abierto sobre una mesa"
        active={activeSection === "grimoire"}
        onNavigate={setActiveSection}
        hotspots={[
          { id: "prev-page", label: "‹", tooltip: "Pagina anterior", x: 24, y: 87, onClick: () => setBookIndex((index) => Math.max(0, index - 1)), variant: "quiet" },
          { id: "next-page", label: "›", tooltip: "Pagina siguiente", x: 76, y: 87, onClick: () => setBookIndex((index) => index + 1), variant: "quiet" },
        ]}
      >
        <div className="book-overlay">
          <section className="book-page left">
            <span>{activeRecipe.type}</span>
            <h2>{activeRecipe.name}</h2>
            <p>Autor: {userName(activeRecipe.authorId)} · {activeRecipe.time}</p>
            <h3>Ingredientes</h3>
            <ul>
              {activeRecipe.ingredients.map((ingredient) => (
                <li key={ingredient}>{ingredient}</li>
              ))}
            </ul>
          </section>
          <section className="book-page right">
            <h3>Preparacion</h3>
            <ol>
              {activeRecipe.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <h3>Notas</h3>
            <p>{activeRecipe.notes}</p>
            <small>Proxima vez: {activeRecipe.nextChange}</small>
          </section>
        </div>
        <div className="bookmark-strip">
          {recipeFilters.map((filter) => (
            <button key={filter} type="button" className={recipeFilter === filter ? "active" : ""} onClick={() => setRecipeFilter(filter)}>
              {filter}
            </button>
          ))}
        </div>
        <div className="index-drawer">
          {filteredRecipes.slice(0, 4).map((recipe, index) => (
            <button key={recipe.id} type="button" onClick={() => setBookIndex(index)}>
              {recipe.name}
            </button>
          ))}
        </div>
      </Scene>

      <Scene
        title="La Caisse"
        subtitle="registro y propinas"
        image="/scenes/caisse/caisse.png"
        alt="Caja registradora antigua abierta con monedas, joyas y recibo"
        active={activeSection === "caisse"}
        onNavigate={setActiveSection}
      >
        <aside className="receipt">
          <span>Saldo</span>
          <strong>{balance} monedas</strong>
          <p>{unlockedItems} objetos instalados</p>
          {tips.slice(0, 5).map((tip) => (
            <div className="receipt-row" key={tip.id}>
              <b>+{tip.amount}</b>
              <span>{tip.note}</span>
            </div>
          ))}
        </aside>
        <div className="purchase-tabs">
          {restaurantItems.slice(0, 6).map((item) => (
            <button key={item.id} type="button">
              {item.name}
              <span>{item.cost}</span>
            </button>
          ))}
        </div>
      </Scene>

      {activeSection === "lettres" ? (
        <section className="paper-room letters-room">
          <RoomToolbar active={activeSection} onNavigate={setActiveSection} />
          <h1>Les Lettres</h1>
          <p>Bandeja privada de notas, retos y recetas dedicadas.</p>
          <div className="letter-board">
            {letters.map((letter) => (
              <article className="folded-letter" key={letter.id}>
                <span>{letter.type}</span>
                <h2>{letter.title}</h2>
                <p>{letter.body}</p>
                <small>
                  De {userName(letter.fromUserId)} para {userName(letter.toUserId)}
                </small>
              </article>
            ))}
            <aside className="write-letter">
              <h2>Nueva nota</h2>
              <p>Chef, quedan 3 frascos de cardamomo. Alguien ha vuelto a esconder la canela.</p>
              <button type="button">Dejar sobre el comptoir</button>
            </aside>
          </div>
        </section>
      ) : null}

      <aside className="progress-rail" aria-label="Progreso del restaurante">
        <span>Nivel {progress.level}</span>
        <strong>{progress.levelName}</strong>
        <div className="progress-track">
          <div style={{ width: `${Math.min(100, (progress.points / progress.nextLevelAt) * 100)}%` }} />
        </div>
        <small>{progress.points}/{progress.nextLevelAt} puntos</small>
      </aside>
    </main>
  );
}

function RoomToolbar({ active, onNavigate }: { active: SectionId; onNavigate: (section: SectionId) => void }) {
  return (
    <div className="room-toolbar">
      <button type="button" onClick={() => onNavigate("home")}>
        Salon
      </button>
      <span>{roomLabels[active]}</span>
    </div>
  );
}
