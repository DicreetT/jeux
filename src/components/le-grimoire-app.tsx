"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { loadSharedState, saveSharedState } from "@/src/lib/shared-state";
import { isSupabaseConfigured, PRIVATE_MEDIA_BUCKET, supabase } from "@/src/lib/supabase";
import type { Session } from "@supabase/supabase-js";

type Place = "cuisine" | "grimoire" | "caisse" | "pause";
type SceneName = "cuisine" | "pause";
type UserRole = "chef" | "serveuse";
type ProfileRole = "chef" | "serveuse";
type ChefStatus = "en_cuisine" | "en_pause" | "service_termine" | "hors_service";
type ServeuseStatus = "absente" | "dans_les_parages" | "embeter_le_chef";
type CaisseMode = "overview" | "tip" | "shop";
type PlacedItemType =
  | "note"
  | "lettre"
  | "bisou"
  | "viande"
  | "beurre"
  | "cafe"
  | "the"
  | "patisserie"
  | "fleur"
  | "betise"
  | "surveillance"
  | "rappel"
  | "tough_love"
  | "petit_mot"
  | "cigarette"
  | "paquet_cigarettes"
  | "chocolat";

type SceneHotspot = {
  id: string;
  label: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  action: () => void;
  state?: "quiet" | "object" | "exit" | "secret";
};

type KitchenEvent = {
  id: string;
  from: UserRole;
  to?: UserRole;
  title: string;
  message: string;
  date: string;
  mediaPath?: string;
  mediaExpiresAt?: string;
  mediaType?: string;
};

type PrivateMediaPayload = Pick<KitchenEvent, "mediaPath" | "mediaExpiresAt" | "mediaType">;

type PrivateProfile = {
  id: string;
  role: ProfileRole;
  display_name: string | null;
};

type ScenePlacedItem = {
  id: string;
  scene: SceneName;
  xPercent: number;
  yPercent: number;
  type: PlacedItemType;
  authorId: UserRole;
  recipientId: UserRole;
  message: string;
  createdAt: string;
  collectedAt?: string;
  mediaPath?: string;
  mediaExpiresAt?: string;
  mediaType?: string;
};

type Wallets = Record<UserRole, number>;

type CaisseEntry = {
  id: string;
  from: UserRole;
  to?: UserRole;
  type: "tip" | "gift" | "shop";
  amount: number;
  item?: string;
  message: string;
  date: string;
};

type GrimoireSection = "index" | "chef" | "pour_toi";
type PourToiKind = "envie" | "ferais";
type PourToiStatus = "envoyé" | "en_cours" | "servi";
type PourToiLiberty = "Totale" | "Quelques indications" | "Très précise";

type GrimoireEntry = {
  id: string;
  section: Exclude<GrimoireSection, "index">;
  kind: "recipe" | PourToiKind;
  title: string;
  from: UserRole;
  to?: UserRole;
  date: string;
  ingredients: string;
  quantities: string;
  time: string;
  temperatures: string;
  preparation: string;
  techniques: string;
  notes: string;
  next?: string;
  portions?: string;
  dressage?: string;
  status?: PourToiStatus;
  envie?: string;
  flavors?: string;
  avoid?: string;
  mood?: string;
  liberty?: PourToiLiberty;
  petitMot?: string;
  dishIdea?: string;
  description?: string;
  whyYou?: string;
  chefDecision?: string;
  chefNote?: string;
  reaction?: string;
};

type GrimoireDraft = Pick<
  GrimoireEntry,
  | "section"
  | "kind"
  | "title"
  | "ingredients"
  | "preparation"
  | "notes"
  | "quantities"
  | "time"
  | "temperatures"
  | "techniques"
  | "next"
  | "portions"
  | "dressage"
  | "envie"
  | "flavors"
  | "avoid"
  | "mood"
  | "liberty"
  | "petitMot"
  | "dishIdea"
  | "description"
  | "whyYou"
>;

type SharedKitchenItem = {
  id: string;
  name: string;
  cost: number;
  boughtBy: UserRole;
  date: string;
};

type ImagePoint = {
  xPercent: number;
  yPercent: number;
};

type CssPoint = {
  left: string;
  top: string;
};

const IMAGE_WIDTH = 1672;
const IMAGE_HEIGHT = 941;
const IMAGE_ASPECT = IMAGE_WIDTH / IMAGE_HEIGHT;

const roleLabels: Record<UserRole, string> = {
  chef: "Chef",
  serveuse: "Serveuse",
};

const chefStatuses: Array<{ id: ChefStatus; label: string; line: string }> = [
  { id: "en_cuisine", label: "🔥 En cuisine", line: "🔥 En cuisine" },
  { id: "en_pause", label: "🚬 En pause", line: "🚬 En pause" },
  { id: "service_termine", label: "🍷 Service terminé", line: "🍷 Service terminé" },
  { id: "hors_service", label: "🌙 Hors service", line: "🌙 Hors service" },
];

const serveuseStatuses: Array<{ id: ServeuseStatus; label: string; line: string }> = [
  { id: "absente", label: "🌙 Absente", line: "🌙 Absente" },
  { id: "dans_les_parages", label: "👀 Dans les parages", line: "👀 Dans les parages" },
  { id: "embeter_le_chef", label: "💋 Embêter le Chef", line: "💋 En train d’embêter le Chef" },
];

const chefResponses = [
  { title: "🚪 Chasser la Serveuse", message: "Dehors de ma cuisine." },
  { title: "🍰 Promettre un dessert", message: "Dessert promis. Conditions inconnues. Intentions sérieuses." },
  { title: "🪙 Donner un pourboire", message: "Pourboire symbolique accordé. Service dangereux, mais charmant." },
  { title: "💋 Répondre au bisou", message: "Le Chef répond au bisou. Productivité officiellement compromise." },
];

const cuisineItemTypes: Array<{ id: PlacedItemType; label: string; short: string }> = [
  { id: "note", label: "💌 Note", short: "note" },
  { id: "bisou", label: "💋 Bisou", short: "bisou" },
  { id: "viande", label: "🥩 Viande", short: "viande" },
  { id: "beurre", label: "🧈 Beurre", short: "beurre" },
  { id: "cafe", label: "☕ Café", short: "café" },
  { id: "the", label: "🍵 Thé", short: "thé" },
  { id: "patisserie", label: "🍰 Pâtisserie", short: "pâtisserie" },
  { id: "fleur", label: "🌹 Fleur", short: "fleur" },
  { id: "chocolat", label: "🍫 Chocolat", short: "chocolat" },
  { id: "surveillance", label: "👀 Je te surveille", short: "surveillance" },
  { id: "tough_love", label: "😼 Tough love", short: "tough love" },
];

const pauseItemTypes: Array<{ id: PlacedItemType; label: string; short: string }> = [
  { id: "lettre", label: "💌 Lettre", short: "lettre" },
  { id: "bisou", label: "💋 Bisou", short: "bisou" },
  { id: "cigarette", label: "🚬 Cigarette", short: "cigarette" },
  { id: "paquet_cigarettes", label: "🚬 Paquet de cigarettes", short: "paquet" },
  { id: "cafe", label: "☕ Café", short: "café" },
  { id: "the", label: "🍵 Thé", short: "thé" },
  { id: "viande", label: "🥩 Viande", short: "viande" },
  { id: "beurre", label: "🧈 Beurre", short: "beurre" },
  { id: "chocolat", label: "🍫 Chocolat", short: "chocolat" },
  { id: "fleur", label: "🌹 Fleur", short: "fleur" },
  { id: "petit_mot", label: "📌 Petit mot", short: "mot" },
];

const itemMeta: Record<PlacedItemType, { label: string; mark: string }> = {
  note: { label: "Note", mark: "💌" },
  lettre: { label: "Lettre", mark: "💌" },
  bisou: { label: "Bisou", mark: "💋" },
  viande: { label: "Viande", mark: "🥩" },
  beurre: { label: "Beurre", mark: "🧈" },
  cafe: { label: "Café", mark: "☕" },
  the: { label: "Thé", mark: "🍵" },
  patisserie: { label: "Pâtisserie", mark: "🍰" },
  fleur: { label: "Fleur", mark: "🌹" },
  betise: { label: "Bêtise", mark: "🔥" },
  surveillance: { label: "Je te surveille", mark: "👀" },
  rappel: { label: "Rappel", mark: "📌" },
  tough_love: { label: "Tough love", mark: "😼" },
  petit_mot: { label: "Petit mot", mark: "📌" },
  cigarette: { label: "Cigarette", mark: "🚬" },
  paquet_cigarettes: { label: "Paquet de cigarettes", mark: "🚬" },
  chocolat: { label: "Chocolat", mark: "🍫" },
};

const boutiqueItems = [
  { id: "teapot", name: "Tetera", cost: 35 },
  { id: "flowers", name: "Flores", cost: 18 },
  { id: "lamp", name: "Lámpara", cost: 42 },
  { id: "cup", name: "Nueva taza", cost: 16 },
  { id: "rosemary", name: "Romero", cost: 14 },
  { id: "bottle", name: "Botella especial", cost: 28 },
  { id: "radio", name: "Radio antigua", cost: 55 },
  { id: "plates", name: "Nueva vajilla", cost: 48 },
  { id: "candle", name: "Vela", cost: 11 },
  { id: "linen", name: "Mantel", cost: 24 },
];

const grimoireSections: Array<{ id: GrimoireSection; label: string; description: string }> = [
  { id: "index", label: "Index", description: "La primera doble página del libro." },
  { id: "chef", label: "Recettes du Chef", description: "Ce qu’il ne veut pas oublier." },
  { id: "pour_toi", label: "Pour toi ❤️", description: "Ce qu’on cuisine l’un pour l’autre." },
];

const initialGrimoireEntries: GrimoireEntry[] = [];

const initialEvents: KitchenEvent[] = [];

const initialPlacedItems: ScenePlacedItem[] = [];

const initialWallets: Wallets = { chef: 120, serveuse: 120 };
const initialEntries: CaisseEntry[] = [];
const initialSharedItems: SharedKitchenItem[] = [];
const initialSeenEvents: string[] = [];

function createEmptyGrimoireDraft(section: Exclude<GrimoireSection, "index"> = "chef"): GrimoireDraft {
  return {
    section,
    kind: section === "pour_toi" ? "envie" : "recipe",
    title: "",
    ingredients: "",
    quantities: "",
    time: "",
    temperatures: "",
    preparation: "",
    techniques: "",
    notes: "",
    next: "",
    portions: "",
    dressage: "",
    envie: "",
    flavors: "",
    avoid: "",
    mood: "",
    liberty: "Totale",
    petitMot: "",
    dishIdea: "",
    description: "",
    whyYou: "",
  };
}

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function useSharedState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);
  const valueRef = useRef(value);
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const localValue = readStored(key, fallback);
      const remoteValue = await loadSharedState<T>(key);
      if (cancelled) return;

      const nextValue = remoteValue ?? localValue;
      setValue(nextValue);
      window.localStorage.setItem(key, JSON.stringify(nextValue));
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [fallback, key]);

  useEffect(() => {
    if (!ready) return;
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    void saveSharedState(key, value);
  }, [key, ready, value]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    const channel = client
      .channel(`le-grimoire-state:${key}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "le_grimoire_state",
          filter: `key=eq.${key}`,
        },
        (payload) => {
          const row = payload.new as { value?: T } | null;
          if (!row || !("value" in row)) return;

          const nextValue = row.value as T;
          const nextSerialized = JSON.stringify(nextValue);
          if (nextSerialized === JSON.stringify(valueRef.current)) return;

          skipNextSaveRef.current = true;
          valueRef.current = nextValue;
          window.localStorage.setItem(key, nextSerialized);
          setValue(nextValue);
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [key]);

  return [value, setValue] as const;
}

function statusLine<T extends string>(items: Array<{ id: T; line: string }>, active: T) {
  return items.find((item) => item.id === active)?.line ?? "";
}

function otherRole(role: UserRole): UserRole {
  return role === "chef" ? "serveuse" : "chef";
}

function profileRoleToUserRole(role: ProfileRole): UserRole {
  return role === "chef" ? "chef" : "serveuse";
}

function userRoleToProfileRole(role: UserRole): ProfileRole {
  return role === "chef" ? "chef" : "serveuse";
}

function nowIso() {
  return new Date().toISOString();
}

function expirationFromDuration(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function isFutureDate(date?: string) {
  return !date || Date.parse(date) > Date.now();
}

function safeStorageName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function stripImageMetadata(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob ?? file), "image/webp", 0.86);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function PrivateDoor(props: {
  state: "loading" | "login" | "claim";
  mode: "signin" | "signup";
  email: string;
  password: string;
  displayName: string;
  claimRole: ProfileRole;
  claimCode: string;
  error: string;
  busy: boolean;
  onModeChange: (mode: "signin" | "signup") => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onClaimRoleChange: (value: ProfileRole) => void;
  onClaimCodeChange: (value: string) => void;
  onSubmitAuth: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitClaim: (event: FormEvent<HTMLFormElement>) => void;
  onSignOut?: () => void;
}) {
  return (
    <main className="private-kitchen">
      <section className="staff-door" aria-label="Entrée privée">
        <div className="staff-door-card">
          <span>Réservé au personnel</span>
          <h1>Notre Restaurant</h1>
          {props.state === "loading" ? <p>On cherche la clé sous le paillasson...</p> : null}
          {props.state === "login" ? (
            <>
              <div className="auth-switch" aria-label="Mode d’accès">
                <button type="button" className={props.mode === "signin" ? "active" : ""} onClick={() => props.onModeChange("signin")}>
                  Entrer
                </button>
                <button type="button" className={props.mode === "signup" ? "active" : ""} onClick={() => props.onModeChange("signup")}>
                  Créer ma clé
                </button>
              </div>
              <form className="staff-form" onSubmit={props.onSubmitAuth}>
                <label>
                  Email
                  <input type="email" value={props.email} onChange={(event) => props.onEmailChange(event.target.value)} required />
                </label>
                <label>
                  Mot de passe
                  <input type="password" value={props.password} onChange={(event) => props.onPasswordChange(event.target.value)} required minLength={6} />
                </label>
                <button type="submit" disabled={props.busy}>
                  {props.busy ? "..." : props.mode === "signin" ? "Entrer" : "Créer"}
                </button>
              </form>
            </>
          ) : null}
          {props.state === "claim" ? (
            <>
              <p>Compte reconnu. Maintenant choisis la seule clé qui t’appartient.</p>
              <form className="staff-form" onSubmit={props.onSubmitClaim}>
                <label>
                  Nom affiché
                  <input value={props.displayName} onChange={(event) => props.onDisplayNameChange(event.target.value)} placeholder="Chef, Serveuse..." />
                </label>
                <label>
                  Rôle
                  <select value={props.claimRole} onChange={(event) => props.onClaimRoleChange(event.target.value as ProfileRole)}>
                    <option value="chef">Chef</option>
                    <option value="serveuse">Serveuse</option>
                  </select>
                </label>
                <label>
                  Code privé
                  <input value={props.claimCode} onChange={(event) => props.onClaimCodeChange(event.target.value)} required />
                </label>
                <button type="submit" disabled={props.busy}>
                  {props.busy ? "..." : "Réclamer ma place"}
                </button>
              </form>
              {props.onSignOut ? (
                <button className="door-quiet-button" type="button" onClick={props.onSignOut}>
                  Changer de compte
                </button>
              ) : null}
            </>
          ) : null}
          {props.error ? <p className="staff-error">{props.error}</p> : null}
        </div>
      </section>
    </main>
  );
}

function EventPrivateMedia({ event }: { event: PrivateMediaPayload }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase || !event.mediaPath || !isFutureDate(event.mediaExpiresAt)) return;
    let cancelled = false;

    void (async () => {
      const { data, error: signedError } = await supabase.storage
        .from(PRIVATE_MEDIA_BUCKET)
        .createSignedUrl(event.mediaPath as string, 60 * 5);

      if (cancelled) return;
      if (signedError) {
        setError(signedError.message);
        return;
      }
      setUrl(data.signedUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [event.mediaExpiresAt, event.mediaPath]);

  if (!event.mediaPath) return null;
  if (!isFutureDate(event.mediaExpiresAt)) return <p>Ce média a disparu.</p>;
  if (error) return <p>{error}</p>;
  if (!url) return <p>Le média apparaît doucement...</p>;

  const isVideo = event.mediaType?.startsWith("video/");

  return (
    <figure className="private-photo">
      {isVideo ? (
        <video src={url} controls playsInline preload="metadata" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Photo privée temporaire" />
      )}
      {event.mediaExpiresAt ? <figcaption>Disparaît à {eventTime(event.mediaExpiresAt)}</figcaption> : null}
    </figure>
  );
}

function eventTime(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(date));
}

function entryDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Madrid",
  }).format(new Date(date));
}

function getCoverMetrics(width: number, height: number) {
  const viewportAspect = width / height;
  if (viewportAspect > IMAGE_ASPECT) {
    const renderedHeight = width / IMAGE_ASPECT;
    return { renderedWidth: width, renderedHeight, offsetX: 0, offsetY: (height - renderedHeight) / 2 };
  }

  const renderedWidth = height * IMAGE_ASPECT;
  return { renderedWidth, renderedHeight: height, offsetX: (width - renderedWidth) / 2, offsetY: 0 };
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function scenePointerToImagePoint(event: PointerEvent<HTMLElement>, rect: DOMRect): ImagePoint {
  const metrics = getCoverMetrics(rect.width, rect.height);
  const localX = event.clientX - rect.left - metrics.offsetX;
  const localY = event.clientY - rect.top - metrics.offsetY;

  return {
    xPercent: clampPercent((localX / metrics.renderedWidth) * 100),
    yPercent: clampPercent((localY / metrics.renderedHeight) * 100),
  };
}

function imagePointToCssPoint(point: ImagePoint, size: { width: number; height: number }): CssPoint {
  const cssPoint = imagePointToCssPercent(point, size);

  return {
    left: `clamp(1.1rem, ${cssPoint.leftPercent}%, calc(100% - 1.1rem))`,
    top: `clamp(1.1rem, ${cssPoint.topPercent}%, calc(100% - 1.1rem))`,
  };
}

function imagePointToCssPercent(point: ImagePoint, size: { width: number; height: number }) {
  if (size.width === 0 || size.height === 0) {
    return { leftPercent: point.xPercent, topPercent: point.yPercent };
  }

  const metrics = getCoverMetrics(size.width, size.height);
  const left = ((metrics.offsetX + metrics.renderedWidth * (point.xPercent / 100)) / size.width) * 100;
  const top = ((metrics.offsetY + metrics.renderedHeight * (point.yPercent / 100)) / size.height) * 100;

  return { leftPercent: left, topPercent: top };
}

function contextPaperStyle(point: ImagePoint, size: { width: number; height: number }) {
  const cssPoint = imagePointToCssPercent(point, size);
  const shiftX = cssPoint.leftPercent > 68 ? "-100%" : cssPoint.leftPercent < 32 ? "0" : "-50%";
  const shiftY = cssPoint.topPercent > 64 ? "-100%" : cssPoint.topPercent < 30 ? "0" : "-50%";

  return {
    left: `clamp(0.75rem, ${cssPoint.leftPercent}%, calc(100% - 0.75rem))`,
    top: `clamp(0.75rem, ${cssPoint.topPercent}%, calc(100% - 0.75rem))`,
    transform: `translate(${shiftX}, ${shiftY})`,
  };
}

function lines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function isSeededPourToiEntry(entry: GrimoireEntry) {
  return entry.id === "pour-toi-pistache" || entry.id === "ferais-entrecote";
}

function isSeededChefRecipe(entry: GrimoireEntry) {
  return entry.id === "recipe-aubergine" || entry.id === "recipe-grenade";
}

export function LeGrimoireApp() {
  const sceneRef = useRef<HTMLElement | null>(null);
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [sceneSize, setSceneSize] = useState({ width: 0, height: 0 });
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PrivateProfile | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [claimRole, setClaimRole] = useState<ProfileRole>("serveuse");
  const [claimCode, setClaimCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [place, setPlace] = useState<Place>("cuisine");
  const [role, setRole] = useSharedState<UserRole>("le-grimoire:role", "serveuse");
  const [chefStatus, setChefStatus] = useSharedState<ChefStatus>("le-grimoire:chef-status", "en_cuisine");
  const [serveuseStatus, setServeuseStatus] = useSharedState<ServeuseStatus>("le-grimoire:serveuse-status", "dans_les_parages");
  const [events, setEvents] = useSharedState<KitchenEvent[]>("le-grimoire:events", initialEvents);
  const [seenEventIds, setSeenEventIds] = useSharedState<string[]>("le-grimoire:seen-events", initialSeenEvents);
  const [placedItems, setPlacedItems] = useSharedState<ScenePlacedItem[]>("le-grimoire:placed-items", initialPlacedItems);
  const [grimoireEntries, setGrimoireEntries] = useSharedState<GrimoireEntry[]>("le-grimoire:grimoire-entries", initialGrimoireEntries);
  const [wallets, setWallets] = useSharedState<Wallets>("le-grimoire:wallets", initialWallets);
  const [caisseEntries, setCaisseEntries] = useSharedState<CaisseEntry[]>("le-grimoire:caisse-entries", initialEntries);
  const [sharedItems, setSharedItems] = useSharedState<SharedKitchenItem[]>("le-grimoire:shared-items", initialSharedItems);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [objectTrayOpen, setObjectTrayOpen] = useState(false);
  const [statusDockOpen, setStatusDockOpen] = useState(false);
  const [placingType, setPlacingType] = useState<PlacedItemType | null>(null);
  const [previewPoint, setPreviewPoint] = useState<ImagePoint | null>(null);
  const [draftPlacement, setDraftPlacement] = useState<(ImagePoint & { scene: SceneName; type: PlacedItemType }) | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [passageOpen, setPassageOpen] = useState(false);
  const [distractionOpen, setDistractionOpen] = useState(false);
  const [placingDistraction, setPlacingDistraction] = useState(false);
  const [distractionPlacement, setDistractionPlacement] = useState<(ImagePoint & { scene: SceneName }) | null>(null);
  const [distractionText, setDistractionText] = useState("");
  const [distractionFile, setDistractionFile] = useState<File | null>(null);
  const [distractionDurationHours, setDistractionDurationHours] = useState(12);
  const [distractionBusy, setDistractionBusy] = useState(false);
  const [caisseMode, setCaisseMode] = useState<CaisseMode>("overview");
  const [tipTo, setTipTo] = useState<UserRole>("chef");
  const [tipAmount, setTipAmount] = useState(10);
  const [tipMessage, setTipMessage] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [grimoireSection, setGrimoireSection] = useState<GrimoireSection>("index");
  const [activeGrimoireId, setActiveGrimoireId] = useState<string | null>(null);
  const [grimoireDraftOpen, setGrimoireDraftOpen] = useState(false);
  const [grimoireDraft, setGrimoireDraft] = useState<GrimoireDraft>(createEmptyGrimoireDraft());
  const [pourToiReply, setPourToiReply] = useState("");

  const isChef = role === "chef";
  const passageEvents = events.filter(
    (event) => event.from !== role && (!event.to || event.to === role) && isFutureDate(event.mediaExpiresAt),
  );
  const newestEvent = passageEvents[0];
  const activeScene: SceneName = place === "pause" ? "pause" : "cuisine";
  const sceneImage = place === "pause" ? "/scenes/back-alley.webp" : "/scenes/cuisine-main.png";
  const sceneAlt =
    place === "pause"
      ? "Callejón trasero nocturno con puerta de cocina, escalones, lata y papel escondido"
      : "Cuisine professionnelle intime avec cuivre, table centrale, grimoire, caisse et porte EXIT";
  const hasWaitingPauseItem = placedItems.some(
    (item) => item.scene === "pause" && item.recipientId === role && !item.collectedAt,
  );
  const activeItem = activeItemId ? placedItems.find((item) => item.id === activeItemId) : undefined;
  const newestEventSeen = newestEvent ? seenEventIds.includes(newestEvent.id) : false;

  useEffect(() => {
    const node = sceneRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setSceneSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    async function loadProfile(activeSession: Session | null) {
      if (!supabase || !activeSession) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, display_name")
        .eq("id", activeSession.user.id)
        .maybeSingle<PrivateProfile>();

      if (cancelled) return;

      if (error) {
        setAuthError(error.message);
        setProfile(null);
        return;
      }

      setProfile(data ?? null);
      if (data?.role) {
        setRole(profileRoleToUserRole(data.role));
      }
    }

    void (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error) setAuthError(error.message);
      setSession(data.session);
      await loadProfile(data.session);
      if (!cancelled) setAuthReady(true);
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthError("");
      void loadProfile(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [setRole]);

  useEffect(() => {
    setGrimoireEntries((current) => {
      const filtered = current.filter((entry) => !isSeededPourToiEntry(entry) && !isSeededChefRecipe(entry));
      return filtered.length === current.length ? current : filtered;
    });
  }, [setGrimoireEntries]);

  useEffect(() => {
    setEvents((current) => {
      const filtered = current.filter((event) => event.id !== "event-welcome");
      return filtered.length === current.length ? current : filtered;
    });
  }, [setEvents]);

  async function reloadProfile() {
    if (!supabase || !session) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, display_name")
      .eq("id", session.user.id)
      .maybeSingle<PrivateProfile>();

    if (error) {
      setAuthError(error.message);
      return;
    }

    setProfile(data ?? null);
    if (data?.role) setRole(profileRoleToUserRole(data.role));
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthBusy(true);
    setAuthError("");

    const credentials = { email: authEmail.trim(), password: authPassword };
    const result =
      authMode === "signup"
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);

    if (result.error) {
      setAuthError(result.error.message);
    } else if (authMode === "signup" && !result.data.session) {
      setAuthError("Compte créé. Si Supabase demande confirmation, vérifie l’email avant d’entrer.");
    }

    setAuthBusy(false);
  }

  async function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthBusy(true);
    setAuthError("");

    const { error } = await supabase.rpc("claim_private_role", {
      requested_role: claimRole,
      invite_code: claimCode,
      display_name: authDisplayName,
    });

    if (error) {
      setAuthError(error.message);
    } else {
      setClaimCode("");
      await reloadProfile();
    }

    setAuthBusy(false);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  function addEvent(
    from: UserRole,
    title: string,
    message: string,
    to?: UserRole,
    media?: Pick<KitchenEvent, "mediaPath" | "mediaExpiresAt" | "mediaType">,
  ) {
    setEvents((current) => [
      {
        id: `event-${Date.now()}`,
        from,
        to,
        title,
        message,
        date: nowIso(),
        ...media,
      },
      ...current,
    ]);
    setPassageOpen(false);
  }

  function beginPlacement(type: PlacedItemType) {
    setPlacingType(type);
    setPlacingDistraction(false);
    setDraftPlacement(null);
    setDraftMessage("");
    setDrawerOpen(false);
    setObjectTrayOpen(false);
  }

  function beginDistractionPlacement() {
    if (activeScene !== "cuisine") return;
    setPlacingType("tough_love");
    setPlacingDistraction(true);
    setDraftPlacement(null);
    setDraftMessage("");
    setDistractionPlacement(null);
    setDistractionOpen(false);
    setDrawerOpen(false);
    setObjectTrayOpen(false);
  }

  function handleScenePointerMove(event: PointerEvent<HTMLElement>) {
    if (!placingType || !sceneRef.current || (place !== "cuisine" && place !== "pause")) return;
    setPreviewPoint(scenePointerToImagePoint(event, sceneRef.current.getBoundingClientRect()));
  }

  function handleSceneClick(event: PointerEvent<HTMLElement>) {
    if (!placingType || !sceneRef.current || (place !== "cuisine" && place !== "pause")) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, textarea, input, select, .paper-modal, .action-drawer, .caisse-drawer")) return;

    const point = scenePointerToImagePoint(event, sceneRef.current.getBoundingClientRect());
    if (placingDistraction) {
      setDistractionPlacement({ ...point, scene: activeScene });
      setPreviewPoint(point);
      setPlacingType(null);
      setPlacingDistraction(false);
      setDistractionOpen(true);
      return;
    }

    setDraftPlacement({ ...point, scene: activeScene, type: placingType });
    setPreviewPoint(point);
    setPlacingType(null);
  }

  function cancelPlacement() {
    setPlacingType(null);
    setDraftPlacement(null);
    setDistractionPlacement(null);
    setPreviewPoint(null);
    setPlacingDistraction(false);
    setDraftMessage("");
  }

  function placeDraftItem() {
    if (!draftPlacement) return;
    const message = draftMessage.trim();

    setPlacedItems((current) => [
      {
        id: `placed-${Date.now()}`,
        scene: draftPlacement.scene,
        xPercent: draftPlacement.xPercent,
        yPercent: draftPlacement.yPercent,
        type: draftPlacement.type,
        authorId: role,
        recipientId: otherRole(role),
        message,
        createdAt: nowIso(),
      },
      ...current,
    ]);
    addEvent(role, `${roleLabels[role]} a laissé quelque chose.`, "Quelque chose attend quelque part. Il faut regarder.", otherRole(role));
    setDraftPlacement(null);
    setPreviewPoint(null);
    setDraftMessage("");
  }

  function collectItem(id: string) {
    setPlacedItems((current) => current.map((item) => (item.id === id ? { ...item, collectedAt: nowIso() } : item)));
    setActiveItemId(null);
  }

  async function uploadPrivateMedia(file: File, expiresAt: string, scene: SceneName, message: string) {
    if (!supabase || !session) {
      throw new Error("Supabase Auth est nécessaire pour envoyer une photo privée.");
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      throw new Error("Choisis une photo ou une petite vidéo.");
    }

    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error("La vidéo est trop lourde. Essaie un extrait plus court.");
    }

    const mediaBlob = isImage ? await stripImageMetadata(file) : file;
    const extension = isImage ? "webp" : safeStorageName(file.name.split(".").pop() ?? "video");
    const storageName = safeStorageName(file.name.replace(/\.[^.]+$/, "")) || (isImage ? "photo" : "video");
    const contentType = isImage ? "image/webp" : file.type || "video/mp4";
    const path = `${session.user.id}/${Date.now()}-${storageName}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(PRIVATE_MEDIA_BUCKET)
      .upload(path, mediaBlob, {
        contentType,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { error: rowError } = await supabase.from("private_media").insert({
      sender_id: session.user.id,
      recipient_role: userRoleToProfileRole(otherRole(role)),
      storage_path: path,
      scene,
      kind: isImage ? "image" : "video",
      message,
      expires_at: expiresAt,
    });

    if (rowError) throw rowError;

    return { path, contentType };
  }

  async function submitDistraction() {
    const message = distractionText.trim();
    if ((!message && !distractionFile) || !distractionPlacement) return;

    setDistractionBusy(true);
    try {
      const expiresAt = expirationFromDuration(distractionDurationHours);
      const media = distractionFile ? await uploadPrivateMedia(distractionFile, expiresAt, distractionPlacement.scene, message) : undefined;
      setPlacedItems((current) => [
        {
          id: `distraction-${Date.now()}`,
          scene: distractionPlacement.scene,
          xPercent: distractionPlacement.xPercent,
          yPercent: distractionPlacement.yPercent,
          type: "tough_love",
          authorId: "serveuse",
          recipientId: "chef",
          message,
          createdAt: nowIso(),
          mediaPath: media?.path,
          mediaExpiresAt: distractionFile ? expiresAt : undefined,
          mediaType: media?.contentType,
        },
        ...current,
      ]);
      addEvent(
        "serveuse",
        "😈 La Serveuse est passée.",
        "Une distraction attend quelque part dans la cuisine.",
        "chef",
      );
      setDistractionText("");
      setDistractionFile(null);
      setDistractionPlacement(null);
      setPreviewPoint(null);
      setDistractionOpen(false);
      setDrawerOpen(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Impossible d’envoyer la photo privée.");
    } finally {
      setDistractionBusy(false);
    }
  }

  function sendTip() {
    const amount = Math.max(1, Math.floor(tipAmount));
    if (tipTo === role || wallets[role] < amount) return;
    const message = tipMessage.trim() || "Pour avoir survécu au service.";

    setWallets((current) => ({
      ...current,
      [role]: current[role] - amount,
      [tipTo]: current[tipTo] + amount,
    }));
    setCaisseEntries((current) => [
      {
        id: `entry-${Date.now()}`,
        from: role,
        to: tipTo,
        type: "tip",
        amount,
        message,
        date: nowIso(),
      },
      ...current,
    ]);
    addEvent(role, `🪙 +${amount} pour ${roleLabels[tipTo]}`, message, tipTo);
    setTipAmount(10);
    setTipMessage("");
    setCaisseMode("overview");
  }

  function buyKitchenItem(item: (typeof boutiqueItems)[number]) {
    if (wallets[role] < item.cost || sharedItems.some((owned) => owned.id === item.id)) return;

    setWallets((current) => ({
      ...current,
      [role]: current[role] - item.cost,
    }));
    setSharedItems((current) => [
      ...current,
      {
        id: item.id,
        name: item.name,
        cost: item.cost,
        boughtBy: role,
        date: nowIso(),
      },
    ]);
    setCaisseEntries((current) => [
      {
        id: `entry-${Date.now()}`,
        from: role,
        type: "shop",
        amount: item.cost,
        item: item.name,
        message: `${item.name} rejoint la cuisine partagée.`,
        date: nowIso(),
      },
      ...current,
    ]);
    addEvent(role, "Objet installé", `${item.name} rejoint la cuisine partagée.`);
  }

  function openGrimoireSection(section: GrimoireSection) {
    setGrimoireSection(section);
    setGrimoireDraftOpen(false);
    if (section === "index") {
      setActiveGrimoireId(null);
      return;
    }

    const firstEntry = grimoireEntries.find((entry) => entry.section === section);
    setActiveGrimoireId(firstEntry?.id ?? null);
    setGrimoireDraft(createEmptyGrimoireDraft(section));
  }

  function updateGrimoireStatus(id: string, status: GrimoireEntry["status"]) {
    setGrimoireEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, status } : entry)));
  }

  function updatePourToiReply(id: string, reply: string) {
    const cleanReply = reply.trim();
    if (!cleanReply) return;

    setGrimoireEntries((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              reaction: cleanReply,
              chefDecision: role === "chef" && entry.kind === "envie" ? cleanReply : entry.chefDecision,
            }
          : entry,
      ),
    );
    setPourToiReply("");
    addEvent(role, "Réponse dans Pour toi", "Une page du Grimoire a reçu une réponse.", otherRole(role));
  }

  function addPourToiToChefRecipes(entry: GrimoireEntry) {
    if (!isChef) return;

    const recipe: GrimoireEntry = {
      id: `recipe-from-pour-toi-${Date.now()}`,
      section: "chef",
      kind: "recipe",
      title: entry.dishIdea || entry.chefDecision || entry.title,
      from: "chef",
      date: nowIso(),
      ingredients: entry.flavors || entry.ingredients || "À préciser",
      quantities: "À préciser",
      time: "À préciser",
      temperatures: "À préciser",
      preparation: entry.chefDecision || entry.description || entry.preparation || "À compléter.",
      techniques: "À préciser",
      notes: `Né dans Pour toi. ${entry.petitMot || entry.notes || ""}`.trim(),
      next: "Compléter les détails techniques après service.",
      portions: "À préciser",
      dressage: "",
    };

    setGrimoireEntries((current) => [recipe, ...current]);
    setGrimoireSection("chef");
    setActiveGrimoireId(recipe.id);
    addEvent("chef", "Une idée devient recette", "Une page Pour toi a rejoint les Recettes du Chef.", otherRole("chef"));
  }

  function addGrimoireEntry() {
    const isPourToiDraft = grimoireDraft.section === "pour_toi";
    const title =
      grimoireDraft.title.trim() ||
      grimoireDraft.dishIdea?.trim() ||
      grimoireDraft.envie?.trim() ||
      (grimoireDraft.kind === "ferais" ? "Je te ferais..." : "J’ai envie de...");
    const preparation = isPourToiDraft
      ? grimoireDraft.kind === "ferais"
        ? grimoireDraft.description?.trim() || grimoireDraft.dishIdea?.trim() || title
        : grimoireDraft.envie?.trim() || grimoireDraft.flavors?.trim() || title
      : grimoireDraft.preparation.trim();
    if (!title || !preparation) return;

    const entry: GrimoireEntry = {
      id: `grimoire-${Date.now()}`,
      section: grimoireDraft.section,
      kind: grimoireDraft.kind,
      title,
      from: role,
      to: grimoireDraft.section === "pour_toi" ? otherRole(role) : undefined,
      date: nowIso(),
      ingredients: grimoireDraft.ingredients.trim() || grimoireDraft.flavors?.trim() || "À préciser",
      quantities: grimoireDraft.quantities.trim() || "À préciser",
      time: grimoireDraft.time.trim() || "À préciser",
      temperatures: grimoireDraft.temperatures.trim() || "À préciser",
      preparation,
      techniques: grimoireDraft.techniques.trim() || "À préciser",
      notes: grimoireDraft.notes.trim(),
      next: grimoireDraft.next?.trim() ?? "",
      portions: grimoireDraft.portions?.trim(),
      dressage: grimoireDraft.dressage?.trim(),
      status: grimoireDraft.section === "pour_toi" ? "envoyé" : undefined,
      envie: grimoireDraft.envie?.trim(),
      flavors: grimoireDraft.flavors?.trim(),
      avoid: grimoireDraft.avoid?.trim(),
      mood: grimoireDraft.mood?.trim(),
      liberty: grimoireDraft.liberty,
      petitMot: grimoireDraft.petitMot?.trim(),
      dishIdea: grimoireDraft.dishIdea?.trim(),
      description: grimoireDraft.description?.trim(),
      whyYou: grimoireDraft.whyYou?.trim(),
    };

    setGrimoireEntries((current) => [entry, ...current]);
    setActiveGrimoireId(entry.id);
    setGrimoireSection(entry.section);
    setGrimoireDraft(createEmptyGrimoireDraft(entry.section));
    setGrimoireDraftOpen(false);
    addEvent(role, "Page ajoutée au Grimoire", title, grimoireDraft.section === "pour_toi" ? otherRole(role) : undefined);
  }

  if (isSupabaseConfigured && !authReady) {
    return (
      <PrivateDoor
        state="loading"
        mode={authMode}
        email={authEmail}
        password={authPassword}
        displayName={authDisplayName}
        claimRole={claimRole}
        claimCode={claimCode}
        error={authError}
        busy={authBusy}
        onModeChange={setAuthMode}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onDisplayNameChange={setAuthDisplayName}
        onClaimRoleChange={setClaimRole}
        onClaimCodeChange={setClaimCode}
        onSubmitAuth={submitAuth}
        onSubmitClaim={submitClaim}
      />
    );
  }

  if (isSupabaseConfigured && !session) {
    return (
      <PrivateDoor
        state="login"
        mode={authMode}
        email={authEmail}
        password={authPassword}
        displayName={authDisplayName}
        claimRole={claimRole}
        claimCode={claimCode}
        error={authError}
        busy={authBusy}
        onModeChange={setAuthMode}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onDisplayNameChange={setAuthDisplayName}
        onClaimRoleChange={setClaimRole}
        onClaimCodeChange={setClaimCode}
        onSubmitAuth={submitAuth}
        onSubmitClaim={submitClaim}
      />
    );
  }

  if (isSupabaseConfigured && session && !profile) {
    return (
      <PrivateDoor
        state="claim"
        mode={authMode}
        email={authEmail}
        password={authPassword}
        displayName={authDisplayName}
        claimRole={claimRole}
        claimCode={claimCode}
        error={authError}
        busy={authBusy}
        onModeChange={setAuthMode}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onDisplayNameChange={setAuthDisplayName}
        onClaimRoleChange={setClaimRole}
        onClaimCodeChange={setClaimCode}
        onSubmitAuth={submitAuth}
        onSubmitClaim={submitClaim}
        onSignOut={signOut}
      />
    );
  }

  const baseObjectHotspots: SceneHotspot[] = [
    {
      id: "grimoire",
      label: "Grimoire",
      xPercent: 80,
      yPercent: 82,
      widthPercent: 17,
      heightPercent: 11,
      action: () => setPlace("grimoire"),
      state: "object",
    },
    {
      id: "caisse",
      label: "Caisse",
      xPercent: 91,
      yPercent: 55,
      widthPercent: 12,
      heightPercent: 17,
      action: () => {
        setCaisseMode("overview");
        setTipTo(otherRole(role));
        setPlace("caisse");
      },
      state: "object",
    },
    {
      id: "exit",
      label: "Sortie",
      xPercent: 61,
      yPercent: 17,
      widthPercent: 6,
      heightPercent: 9,
      action: () => setPlace("pause"),
      state: hasWaitingPauseItem ? "exit" : "quiet",
    },
  ];

  const pauseHotspots: SceneHotspot[] = [
    {
      id: "pause-door",
      label: "Cuisine",
      xPercent: 19,
      yPercent: 37,
      widthPercent: 22,
      heightPercent: 54,
      action: () => setPlace("cuisine"),
      state: "object",
    },
    {
      id: "old-letters",
      label: "Boîte",
      xPercent: 22,
      yPercent: 84,
      widthPercent: 12,
      heightPercent: 12,
      action: () => beginPlacement("lettre"),
      state: "secret",
    },
  ];

  const visibleHotspots = place === "cuisine" ? baseObjectHotspots : place === "pause" ? pauseHotspots : [];
  const visibleItems = placedItems.filter((item) => item.scene === activeScene && !item.collectedAt);
  const previewCss = previewPoint ? imagePointToCssPoint(previewPoint, sceneSize) : null;
  const draftCss = draftPlacement ? contextPaperStyle(draftPlacement, sceneSize) : null;
  const distractionCss = distractionPlacement ? contextPaperStyle(distractionPlacement, sceneSize) : null;
  const currentGrimoireEntries =
    grimoireSection === "index"
      ? []
      : grimoireEntries.filter((entry) => entry.section === grimoireSection && !isSeededPourToiEntry(entry));
  const activeGrimoireEntry =
    currentGrimoireEntries.find((entry) => entry.id === activeGrimoireId) ?? currentGrimoireEntries[0];
  const canRespondToActiveGrimoireEntry =
    activeGrimoireEntry?.section === "pour_toi" && activeGrimoireEntry.to === role;

  return (
    <main className="private-kitchen">
      <aside className="rotate-phone-note" aria-label="Consejo para móvil">
        <span>Tourne ton téléphone</span>
        <p>La Cuisine se ve mejor en horizontal. Puedes deslizar la escena si sigues en vertical.</p>
      </aside>
      <section
        ref={sceneRef}
        className={place === "pause" ? "world-scene pause-scene" : "world-scene kitchen-scene"}
        aria-label={place === "pause" ? "La Pause" : "La Cuisine"}
        onClick={handleSceneClick}
        onPointerMove={handleScenePointerMove}
      >
        <Image src={sceneImage} alt={sceneAlt} fill priority unoptimized sizes="100vw" className="scene-image" />
        <div className="scene-vignette" />

        {isSupabaseConfigured ? (
          <div className="role-pin locked" aria-label="Rôle connecté">
            <button type="button" className="signout-key" onClick={signOut} aria-label="Sortir">
              Clef
            </button>
          </div>
        ) : (
          <div className="role-pin" aria-label="Changer de rôle">
            <button type="button" className={role === "chef" ? "active" : ""} onClick={() => setRole("chef")}>
              Chef
            </button>
            <button type="button" className={role === "serveuse" ? "active" : ""} onClick={() => setRole("serveuse")}>
              Serveuse
            </button>
          </div>
        )}

        {place !== "cuisine" ? (
          <button className="return-cuisine" type="button" onClick={() => setPlace("cuisine")} aria-label="Retour à la cuisine">
            ↩
          </button>
        ) : null}

        {visibleHotspots.map((hotspot) => (
          <button
            key={hotspot.id}
            type="button"
            className={`scene-hotspot hotspot-${hotspot.id} ${hotspot.state ?? "quiet"}`}
            style={{
              ...imagePointToCssPoint(hotspot, sceneSize),
              width: `${hotspot.widthPercent}%`,
              height: `${hotspot.heightPercent}%`,
            }}
            onClick={hotspot.action}
            aria-label={hotspot.label}
          >
            <span>{hotspot.label}</span>
          </button>
        ))}

        {(place === "cuisine" || place === "pause") && (
          <>
            {visibleItems.map((item) => {
              const cssPoint = imagePointToCssPoint(item, sceneSize);
              const meta = itemMeta[item.type];
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`placed-item ${item.type}`}
                  style={cssPoint}
                  onClick={() => setActiveItemId(item.id)}
                  aria-label={`${meta.label} de ${roleLabels[item.authorId]}`}
                >
                  <span>{meta.mark}</span>
                </button>
              );
            })}
            {previewCss && placingType ? (
              <span className={`placed-item ghost ${placingType}`} style={previewCss} aria-hidden="true">
                <span>{itemMeta[placingType].mark}</span>
              </span>
            ) : null}
          </>
        )}

        {place === "cuisine" ? (
          <>
            <aside className={statusDockOpen ? "status-dock open" : "status-dock"} aria-label="État du personnel">
              <button
                className={`status-pull ${isChef ? "chef-hat" : "apron"}`}
                type="button"
                onClick={() => setStatusDockOpen((current) => !current)}
                aria-label={isChef ? "État du Chef" : "État de la Serveuse"}
              >
                <span aria-hidden="true">{isChef ? "👨‍🍳" : ""}</span>
              </button>
              {statusDockOpen ? (
                <div className="status-paper">
                  {isChef ? (
                    <>
                      <div className="status-line chef-line">
                        <span>Le Chef</span>
                        <strong>{statusLine(chefStatuses, chefStatus)}</strong>
                      </div>
                      <div className="status-options">
                        {chefStatuses.map((status) => (
                          <button
                            key={status.id}
                            type="button"
                            className={chefStatus === status.id ? "active" : ""}
                            onClick={() => {
                              setChefStatus(status.id);
                              setStatusDockOpen(false);
                            }}
                          >
                            {status.label}
                          </button>
                        ))}
                      </div>
                      <div className="status-line read-only">
                        <span>Serveuse</span>
                        <strong>{statusLine(serveuseStatuses, serveuseStatus)}</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="status-line serveuse-line">
                        <span>Serveuse</span>
                        <strong>{statusLine(serveuseStatuses, serveuseStatus)}</strong>
                      </div>
                      <div className="status-options">
                        {serveuseStatuses.map((status) => (
                          <button
                            key={status.id}
                            type="button"
                            className={serveuseStatus === status.id ? "active" : ""}
                            onClick={() => {
                              setServeuseStatus(status.id);
                              setStatusDockOpen(false);
                            }}
                          >
                            {status.label}
                          </button>
                        ))}
                      </div>
                      <div className="status-line read-only">
                        <span>Le Chef</span>
                        <strong>{statusLine(chefStatuses, chefStatus)}</strong>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </aside>
          </>
        ) : null}

        {(place === "cuisine" || place === "pause") && (
          <>
            <aside className={passageOpen ? "passage-ticket open" : "passage-ticket"}>
              <span>Dernier passage</span>
              {newestEvent ? (
                <>
                  <button className="ticket-summary" type="button" onClick={() => setPassageOpen((current) => !current)}>
                    <strong>{newestEvent.title}</strong>
                    <time>{eventTime(newestEvent.date)}</time>
                  </button>
                  {passageOpen ? (
                    <>
                      <p>{newestEvent.message}</p>
                      <EventPrivateMedia event={newestEvent} />
                      {isChef ? (
                        <div className="tiny-actions">
                          {chefResponses.map((response) => (
                            <button key={response.title} type="button" onClick={() => addEvent("chef", response.title, response.message, "serveuse")}>
                              {response.title}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <button className="vu-button" type="button" onClick={() => setSeenEventIds((current) => (current.includes(newestEvent.id) ? current : [...current, newestEvent.id]))}>
                        {newestEventSeen ? "VU ✓" : "Marquer VU"}
                      </button>
                    </>
                  ) : null}
                </>
              ) : (
                <p>Rien pour toi pour l’instant.</p>
              )}
            </aside>

            <aside className={drawerOpen ? "action-drawer open" : "action-drawer"} aria-label="Actions">
              <button
                className="drawer-pull"
                type="button"
                onClick={() => {
                  if (drawerOpen) setObjectTrayOpen(false);
                  setDrawerOpen((current) => !current);
                }}
                aria-label="Actions"
              >
                ✦
              </button>
              {drawerOpen ? (
                <div>
                  <span>Actions</span>
                  <button type="button" onClick={() => setObjectTrayOpen((current) => !current)}>
                    💌 Laisser quelque chose
                  </button>
                  {objectTrayOpen ? (
                    <div className="object-choice-grid" aria-label="Objets à cacher">
                      {(activeScene === "pause" ? pauseItemTypes : cuisineItemTypes).map((item) => (
                        <button key={item.id} type="button" onClick={() => beginPlacement(item.id)}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {!isChef && activeScene === "cuisine" ? (
                    <button type="button" onClick={beginDistractionPlacement}>
                      😈 Distraire
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setCaisseMode("tip");
                      setTipTo(otherRole(role));
                      setPlace("caisse");
                      setDrawerOpen(false);
                    }}
                  >
                    🪙 Pourboire
                  </button>
                </div>
              ) : null}
            </aside>

            {placingType ? (
              <div className="placement-hint">
                <b>{itemMeta[placingType].mark}</b>
                {placingDistraction ? "Choisis où cacher la distraction." : "Choisis un endroit."}
                <button type="button" onClick={cancelPlacement}>
                  Annuler
                </button>
              </div>
            ) : null}
          </>
        )}

        {place === "grimoire" ? (
          <section className="grimoire-book" aria-label="Le Grimoire">
            <button className="book-close" type="button" onClick={() => setPlace("cuisine")}>
              Fermer
            </button>
            <nav className="book-tabs" aria-label="Sections du Grimoire">
              {grimoireSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={grimoireSection === section.id ? "active" : ""}
                  onClick={() => openGrimoireSection(section.id)}
                >
                  {section.label}
                </button>
              ))}
            </nav>

            {grimoireSection === "index" ? (
              <div className="book-spread index-spread">
                <article className="book-page left-page">
                  <span>Le Grimoire</span>
                  <h1>Index</h1>
                  <p>Le livre de la cuisine privée. Rien ici n’a besoin d’impressionner quelqu’un dehors.</p>
                </article>
                <article className="book-page right-page">
                  {grimoireSections
                    .filter((section) => section.id !== "index")
                    .map((section) => (
                      <button key={section.id} type="button" className="index-line" onClick={() => openGrimoireSection(section.id)}>
                        <strong>{section.label}</strong>
                        <small>{section.description}</small>
                      </button>
                    ))}
                </article>
              </div>
            ) : (
              <div className="book-spread">
                <article className="book-page left-page">
                  <span>{grimoireSections.find((section) => section.id === grimoireSection)?.label}</span>
                  {grimoireDraftOpen ? (
                    grimoireDraft.section === "pour_toi" ? (
                      <div className="book-form pour-toi-form">
                        <div className="pour-toi-switch" aria-label="Type de page Pour toi">
                          <button
                            type="button"
                            className={grimoireDraft.kind === "envie" ? "active" : ""}
                            onClick={() => setGrimoireDraft((current) => ({ ...current, kind: "envie" }))}
                          >
                            J’ai envie de...
                          </button>
                          <button
                            type="button"
                            className={grimoireDraft.kind === "ferais" ? "active" : ""}
                            onClick={() => setGrimoireDraft((current) => ({ ...current, kind: "ferais" }))}
                          >
                            Je te ferais...
                          </button>
                        </div>
                        {grimoireDraft.kind === "envie" ? (
                          <>
                            <h2>J’ai envie de...</h2>
                            <label>
                              J’ai envie de
                              <textarea
                                value={grimoireDraft.envie}
                                onChange={(event) => setGrimoireDraft((current) => ({ ...current, envie: event.target.value }))}
                                placeholder="Quelque chose de chaud..."
                              />
                            </label>
                            <label>
                              Saveurs / ingrédients
                              <input
                                value={grimoireDraft.flavors}
                                onChange={(event) => setGrimoireDraft((current) => ({ ...current, flavors: event.target.value }))}
                                placeholder="Pistache + chocolat noir"
                              />
                            </label>
                            <label>
                              Je ne veux pas
                              <input
                                value={grimoireDraft.avoid}
                                onChange={(event) => setGrimoireDraft((current) => ({ ...current, avoid: event.target.value }))}
                                placeholder="Pas trop sucré"
                              />
                            </label>
                          </>
                        ) : (
                          <>
                            <h2>Je te ferais...</h2>
                            <label>
                              Nom / idée du plat
                              <textarea
                                value={grimoireDraft.dishIdea}
                                onChange={(event) => setGrimoireDraft((current) => ({ ...current, dishIdea: event.target.value }))}
                                placeholder="Entrecôte, pommes dauphines, jus au poivre..."
                              />
                            </label>
                            <label>
                              Description
                              <textarea
                                value={grimoireDraft.description}
                                onChange={(event) => setGrimoireDraft((current) => ({ ...current, description: event.target.value }))}
                                placeholder="Ce que je cuisinerais aujourd’hui..."
                              />
                            </label>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="book-form">
                        <label>
                          Nom
                          <input
                            value={grimoireDraft.title}
                            onChange={(event) => setGrimoireDraft((current) => ({ ...current, title: event.target.value }))}
                            placeholder="Nom de la recette"
                          />
                        </label>
                        <label>
                          Portions / rendement
                          <input
                            value={grimoireDraft.portions}
                            onChange={(event) => setGrimoireDraft((current) => ({ ...current, portions: event.target.value }))}
                            placeholder="4 portions"
                          />
                        </label>
                        <label>
                          Ingrédients
                          <textarea
                            value={grimoireDraft.ingredients}
                            onChange={(event) => setGrimoireDraft((current) => ({ ...current, ingredients: event.target.value }))}
                            placeholder="Un ingrédient par ligne"
                          />
                        </label>
                        <label>
                          Quantités
                          <textarea
                            value={grimoireDraft.quantities}
                            onChange={(event) => setGrimoireDraft((current) => ({ ...current, quantities: event.target.value }))}
                            placeholder="2 aubergines, 80 g beurre..."
                          />
                        </label>
                      </div>
                    )
                  ) : (
                    <>
                      <div className="book-entry-list">
                        {currentGrimoireEntries.length > 0 ? (
                          currentGrimoireEntries.map((entry) => (
                            <button
                              key={entry.id}
                              type="button"
                              className={activeGrimoireEntry?.id === entry.id ? "active" : ""}
                              onClick={() => setActiveGrimoireId(entry.id)}
                            >
                              <strong>{entry.title}</strong>
                              <small>
                                {roleLabels[entry.from]} · {entryDate(entry.date)}
                              </small>
                            </button>
                          ))
                        ) : (
                          <p>
                            {grimoireSection === "pour_toi"
                              ? "Ce qu’on cuisine l’un pour l’autre. La première vraie page attend encore."
                              : "Cette section attend sa première page."}
                          </p>
                        )}
                      </div>
                      {activeGrimoireEntry ? (
                        activeGrimoireEntry.section === "pour_toi" ? (
                          <div className={`ingredient-ink pour-toi-paper ${activeGrimoireEntry.kind}`}>
                            <h2>{activeGrimoireEntry.kind === "envie" ? "J’ai envie de..." : "Je te ferais..."}</h2>
                            <p className="from-line">
                              {roleLabels[activeGrimoireEntry.from]} → {roleLabels[activeGrimoireEntry.to ?? otherRole(activeGrimoireEntry.from)]}
                            </p>
                            <h3>{activeGrimoireEntry.title}</h3>
                            {activeGrimoireEntry.kind === "envie" ? (
                              <>
                                <p>{activeGrimoireEntry.envie || activeGrimoireEntry.preparation}</p>
                                {activeGrimoireEntry.flavors ? (
                                  <>
                                    <h3>Saveurs / ingrédients</h3>
                                    <p>{activeGrimoireEntry.flavors}</p>
                                  </>
                                ) : null}
                                {activeGrimoireEntry.avoid ? (
                                  <>
                                    <h3>Je ne veux pas</h3>
                                    <p>{activeGrimoireEntry.avoid}</p>
                                  </>
                                ) : null}
                                {activeGrimoireEntry.liberty ? (
                                  <>
                                    <h3>Liberté du Chef</h3>
                                    <p>{activeGrimoireEntry.liberty}</p>
                                  </>
                                ) : null}
                              </>
                            ) : (
                              <>
                                <p>{activeGrimoireEntry.dishIdea || activeGrimoireEntry.preparation}</p>
                                {activeGrimoireEntry.description ? <p>{activeGrimoireEntry.description}</p> : null}
                                {activeGrimoireEntry.whyYou ? (
                                  <>
                                    <h3>Pourquoi</h3>
                                    <p>{activeGrimoireEntry.whyYou}</p>
                                  </>
                                ) : null}
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="ingredient-ink">
                            <h2>{activeGrimoireEntry.title}</h2>
                            <dl>
                              {activeGrimoireEntry.portions ? (
                                <div>
                                  <dt>Portions</dt>
                                  <dd>{activeGrimoireEntry.portions}</dd>
                                </div>
                              ) : null}
                              <div>
                                <dt>Temps</dt>
                                <dd>{activeGrimoireEntry.time}</dd>
                              </div>
                              <div>
                                <dt>Températures</dt>
                                <dd>{activeGrimoireEntry.temperatures}</dd>
                              </div>
                            </dl>
                            <h3>Ingrédients</h3>
                            <ul>
                              {lines(activeGrimoireEntry.ingredients).map((ingredient) => (
                                <li key={ingredient}>{ingredient}</li>
                              ))}
                            </ul>
                            {activeGrimoireEntry.quantities ? (
                              <>
                                <h3>Quantités</h3>
                                <ul>
                                  {lines(activeGrimoireEntry.quantities).map((quantity) => (
                                    <li key={quantity}>{quantity}</li>
                                  ))}
                                </ul>
                              </>
                            ) : null}
                          </div>
                        )
                      ) : null}
                    </>
                  )}
                </article>

                <article className="book-page right-page">
                  {grimoireDraftOpen ? (
                    <div className="book-form">
                      {grimoireDraft.section === "pour_toi" ? (
                        grimoireDraft.kind === "envie" ? (
                          <>
                            <label>
                              Humeur
                              <input
                                value={grimoireDraft.mood}
                                onChange={(event) => setGrimoireDraft((current) => ({ ...current, mood: event.target.value }))}
                                placeholder="Fatiguée, affamée, dangereuse..."
                              />
                            </label>
                            <label>
                              Liberté du Chef
                              <select
                                value={grimoireDraft.liberty}
                                onChange={(event) => setGrimoireDraft((current) => ({ ...current, liberty: event.target.value as PourToiLiberty }))}
                              >
                                <option>Totale</option>
                                <option>Quelques indications</option>
                                <option>Très précise</option>
                              </select>
                            </label>
                            <label>
                              Petit mot
                              <textarea
                                value={grimoireDraft.petitMot}
                                onChange={(event) => setGrimoireDraft((current) => ({ ...current, petitMot: event.target.value }))}
                                placeholder="Surprends-moi. Mais si c’est moche, je juge."
                              />
                            </label>
                          </>
                        ) : (
                          <>
                            <label>
                              Pourquoi
                              <textarea
                                value={grimoireDraft.whyYou}
                                onChange={(event) => setGrimoireDraft((current) => ({ ...current, whyYou: event.target.value }))}
                                placeholder="Parce que tu dis que tu n’as pas faim..."
                              />
                            </label>
                            <label>
                              Petit mot
                              <textarea
                                value={grimoireDraft.petitMot}
                                onChange={(event) => setGrimoireDraft((current) => ({ ...current, petitMot: event.target.value }))}
                                placeholder="Petit mot pour l’autre..."
                              />
                            </label>
                          </>
                        )
                      ) : (
                        <>
                          <label>
                            Temps
                            <input
                              value={grimoireDraft.time}
                              onChange={(event) => setGrimoireDraft((current) => ({ ...current, time: event.target.value }))}
                              placeholder="45 min"
                            />
                          </label>
                          <label>
                            Températures
                            <input
                              value={grimoireDraft.temperatures}
                              onChange={(event) => setGrimoireDraft((current) => ({ ...current, temperatures: event.target.value }))}
                              placeholder="Four 210 °C"
                            />
                          </label>
                          <label>
                            Préparation
                            <textarea
                              value={grimoireDraft.preparation}
                              onChange={(event) => setGrimoireDraft((current) => ({ ...current, preparation: event.target.value }))}
                              placeholder="Écrire sur la page..."
                            />
                          </label>
                          <label>
                            Techniques
                            <textarea
                              value={grimoireDraft.techniques}
                              onChange={(event) => setGrimoireDraft((current) => ({ ...current, techniques: event.target.value }))}
                              placeholder="Rôtir, réduire, monter..."
                            />
                          </label>
                          <label>
                            Dressage
                            <textarea
                              value={grimoireDraft.dressage}
                              onChange={(event) => setGrimoireDraft((current) => ({ ...current, dressage: event.target.value }))}
                              placeholder="Notes d’emplatage..."
                            />
                          </label>
                          <label>
                            Notes
                            <textarea
                              value={grimoireDraft.notes}
                              onChange={(event) => setGrimoireDraft((current) => ({ ...current, notes: event.target.value }))}
                              placeholder="Pour la prochaine fois..."
                            />
                          </label>
                          <label>
                            À modifier la prochaine fois
                            <textarea
                              value={grimoireDraft.next}
                              onChange={(event) => setGrimoireDraft((current) => ({ ...current, next: event.target.value }))}
                              placeholder="Ce que tu changerais..."
                            />
                          </label>
                        </>
                      )}
                      <div className="book-actions">
                        <button type="button" onClick={() => setGrimoireDraftOpen(false)}>
                          Annuler
                        </button>
                        <button type="button" onClick={addGrimoireEntry}>
                          Encrer la page
                        </button>
                      </div>
                    </div>
                  ) : activeGrimoireEntry ? (
                    activeGrimoireEntry.section === "pour_toi" ? (
                      <>
                        <span>
                          {activeGrimoireEntry.status === "en_cours"
                            ? "Le Chef s’en occupe"
                            : activeGrimoireEntry.status === "servi"
                              ? "Servi"
                              : "Envoyé"}
                        </span>
                        <h2>{activeGrimoireEntry.kind === "envie" ? "Commande personnelle" : "Réponse possible"}</h2>
                        {activeGrimoireEntry.petitMot || activeGrimoireEntry.notes ? (
                          <>
                            <h3>Petit mot</h3>
                            <p>{activeGrimoireEntry.petitMot || activeGrimoireEntry.notes}</p>
                          </>
                        ) : null}
                        {activeGrimoireEntry.mood ? (
                          <>
                            <h3>Humeur</h3>
                            <p>{activeGrimoireEntry.mood}</p>
                          </>
                        ) : null}
                        {activeGrimoireEntry.chefDecision ? (
                          <>
                            <h3>Le Chef a décidé</h3>
                            <p>{activeGrimoireEntry.chefDecision}</p>
                          </>
                        ) : null}
                        {activeGrimoireEntry.reaction ? (
                          <>
                            <h3>Réponse</h3>
                            <p>{activeGrimoireEntry.reaction}</p>
                          </>
                        ) : null}
                        {canRespondToActiveGrimoireEntry ? (
                          <>
                            <div className="book-actions reaction-actions">
                              {activeGrimoireEntry.kind === "envie" && isChef ? (
                                <button type="button" onClick={() => updateGrimoireStatus(activeGrimoireEntry.id, "en_cours")}>
                                  👨‍🍳 Je m’en occupe
                                </button>
                              ) : null}
                              <button type="button" onClick={() => setPourToiReply("😍 Je veux ça")}>
                                😍 Je veux ça
                              </button>
                              <button type="button" onClick={() => setPourToiReply("🤨 Convaincs-moi")}>
                                🤨 Convaincs-moi
                              </button>
                              <button type="button" onClick={() => setPourToiReply("❤️ Pour moi ?")}>
                                ❤️ Pour moi ?
                              </button>
                              <button type="button" onClick={() => setPourToiReply("😈 Recommence, Chef")}>
                                😈 Recommence, Chef
                              </button>
                            </div>
                            <label className="book-reply">
                              {activeGrimoireEntry.kind === "envie" && isChef ? "Le Chef a décidé..." : "Répondre"}
                              <textarea
                                value={pourToiReply}
                                onChange={(event) => setPourToiReply(event.target.value)}
                                placeholder={
                                  activeGrimoireEntry.kind === "envie" && isChef
                                    ? "Fondant au chocolat noir, cœur pistache..."
                                    : "Une réponse brève..."
                                }
                              />
                            </label>
                            <div className="book-actions">
                              <button type="button" onClick={() => updatePourToiReply(activeGrimoireEntry.id, pourToiReply)}>
                                Glisser la réponse
                              </button>
                              <button type="button" onClick={() => updateGrimoireStatus(activeGrimoireEntry.id, "servi")}>
                                🍽️ Servi
                              </button>
                              {isChef ? (
                                <button type="button" onClick={() => addPourToiToChefRecipes(activeGrimoireEntry)}>
                                  Ajouter aux Recettes du Chef
                                </button>
                              ) : null}
                            </div>
                          </>
                        ) : (
                          <p className="quiet-book-note">Cette page attend l’autre personne.</p>
                        )}
                      </>
                    ) : (
                      <>
                        <span>Page ouverte</span>
                        <h2>Préparation</h2>
                        <p>{activeGrimoireEntry.preparation}</p>
                        <h3>Techniques</h3>
                        <ul>
                          {lines(activeGrimoireEntry.techniques).map((technique) => (
                            <li key={technique}>{technique}</li>
                          ))}
                        </ul>
                        {activeGrimoireEntry.notes ? (
                          <>
                            <h3>Notes</h3>
                            <p>{activeGrimoireEntry.notes}</p>
                          </>
                        ) : null}
                        {activeGrimoireEntry.dressage ? (
                          <>
                            <h3>Dressage</h3>
                            <p>{activeGrimoireEntry.dressage}</p>
                          </>
                        ) : null}
                        {activeGrimoireEntry.next ? (
                          <>
                            <h3>À modifier la prochaine fois</h3>
                            <p>{activeGrimoireEntry.next}</p>
                          </>
                        ) : null}
                      </>
                    )
                  ) : (
                    <p>Choisis une page ou écris-en une nouvelle.</p>
                  )}
                </article>
              </div>
            )}

            {grimoireSection !== "index" && !grimoireDraftOpen ? (
              <button
                className="new-page-button"
                type="button"
                onClick={() => {
                  setGrimoireDraft(createEmptyGrimoireDraft(grimoireSection));
                  setGrimoireDraftOpen(true);
                }}
              >
                Nouvelle page
              </button>
            ) : null}
          </section>
        ) : null}

        {place === "caisse" ? (
          <section className="caisse-drawer" aria-label="La Caisse">
            <header>
              <span>Caisse ouverte</span>
              <button type="button" onClick={() => setPlace("cuisine")}>
                Fermer
              </button>
            </header>
            <div className="wallets">
              <strong>Chef <small>🪙 {wallets.chef}</small></strong>
              <strong>Serveuse <small>🪙 {wallets.serveuse}</small></strong>
            </div>
            <nav className="caisse-tabs" aria-label="Actions de caisse">
              <button type="button" className={caisseMode === "tip" ? "active" : ""} onClick={() => setCaisseMode("tip")}>
                Pourboire
              </button>
              <button type="button" className={caisseMode === "shop" ? "active" : ""} onClick={() => setCaisseMode("shop")}>
                Boutique
              </button>
              <button type="button" onClick={() => setHistoryOpen((current) => !current)}>
                Historique
              </button>
            </nav>

            {caisseMode === "overview" ? (
              <p className="caisse-note">Chaque solde reste personnel. La cuisine, elle, appartient aux deux.</p>
            ) : null}

            {caisseMode === "tip" ? (
              <div className="receipt-form">
                <label>
                  À
                  <select value={tipTo} onChange={(event) => setTipTo(event.target.value as UserRole)}>
                    <option value="chef">Chef</option>
                    <option value="serveuse">Serveuse</option>
                  </select>
                </label>
                <label>
                  Montant
                  <input type="number" min={1} max={wallets[role]} value={tipAmount} onChange={(event) => setTipAmount(Number(event.target.value))} />
                </label>
                <textarea value={tipMessage} onChange={(event) => setTipMessage(event.target.value)} placeholder="Mot sur le reçu..." />
                <button type="button" onClick={sendTip}>
                  Donner un pourboire
                </button>
              </div>
            ) : null}

            {caisseMode === "shop" ? (
              <div className="shop-list">
                {boutiqueItems.map((item) => {
                  const owned = sharedItems.some((ownedItem) => ownedItem.id === item.id);
                  return (
                    <button key={item.id} type="button" disabled={owned || wallets[role] < item.cost} onClick={() => buyKitchenItem(item)}>
                      {item.name}
                      <small>{owned ? "installé" : `${item.cost} 🪙`}</small>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {historyOpen ? (
              <div className="receipt-history">
                {caisseEntries.length > 0 ? (
                  caisseEntries.slice(0, 8).map((entry) => (
                    <article key={entry.id}>
                      <time>{eventTime(entry.date)}</time>
                      <b>{roleLabels[entry.from]}</b>
                      <span>{entry.item ?? entry.type}</span>
                      <small>-{entry.amount} 🪙 {entry.message}</small>
                    </article>
                  ))
                ) : (
                  <p>Aucun mouvement pour l’instant.</p>
                )}
              </div>
            ) : null}
          </section>
        ) : null}

        {place === "pause" ? <p className="pause-whisper">La Pause</p> : null}

        {draftPlacement ? (
          <section className={draftPlacement.type === "lettre" ? "paper-modal letter-paper writing-paper context-paper" : "paper-modal small-paper context-paper"} style={draftCss ?? undefined} aria-label="Poser un objet">
            <span>{itemMeta[draftPlacement.type].label}</span>
            <h2>{draftPlacement.type === "lettre" ? "Écrire une lettre" : "Laisser quelque chose ici"}</h2>
            <textarea
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              placeholder={draftPlacement.type === "lettre" ? "À cacher exactement ici..." : "Un petit mot, si tu veux..."}
            />
            <div className="modal-actions">
              <button type="button" onClick={cancelPlacement}>
                Annuler
              </button>
              <button type="button" onClick={placeDraftItem}>
                {draftPlacement.type === "lettre" ? "Cacher la lettre" : "Poser ici"}
              </button>
            </div>
          </section>
        ) : null}

        {activeItem ? (
          <section className={activeItem.type === "lettre" ? "paper-modal letter-paper read-letter" : "paper-modal tiny-paper"} aria-label="Objet trouvé">
            <span>{itemMeta[activeItem.type].label}</span>
            <h2>{itemMeta[activeItem.type].mark} Trouvé</h2>
            <p>{activeItem.message || `${roleLabels[activeItem.authorId]} a laissé quelque chose ici.`}</p>
            <EventPrivateMedia event={activeItem} />
            <small>
              {roleLabels[activeItem.authorId]} · {eventTime(activeItem.createdAt)}
            </small>
            <div className="modal-actions">
              <button type="button" onClick={() => setActiveItemId(null)}>
                Fermer
              </button>
              <button type="button" onClick={() => collectItem(activeItem.id)}>
                Ramasser
              </button>
            </div>
          </section>
        ) : null}

        {distractionOpen ? (
          <section className="paper-modal tiny-paper context-paper" style={distractionCss ?? undefined} aria-label="Distraire le Chef">
            <span>😈 Distraire le Chef</span>
            <h2>Comment veux-tu le distraire ?</h2>
            <textarea value={distractionText} onChange={(event) => setDistractionText(event.target.value)} placeholder="Je viens t’embrasser pendant que tu dresses les assiettes." />
            <label className="private-photo-field">
              Photo ou vidéo privée
              <input
                ref={captureInputRef}
                className="hidden-file-input"
                type="file"
                accept="image/*,video/*"
                capture
                onChange={(event) => setDistractionFile(event.target.files?.[0] ?? null)}
              />
              <input
                ref={galleryInputRef}
                className="hidden-file-input"
                type="file"
                accept="image/*,video/*"
                onChange={(event) => setDistractionFile(event.target.files?.[0] ?? null)}
              />
              <div className="camera-actions">
                <button type="button" onClick={() => captureInputRef.current?.click()}>
                  Caméra
                </button>
                <button type="button" onClick={() => galleryInputRef.current?.click()}>
                  Galerie / fichier
                </button>
              </div>
              <small>{distractionFile ? distractionFile.name : "Tu peux prendre une photo, enregistrer une courte vidéo ou choisir un fichier."}</small>
            </label>
            <label className="private-photo-field">
              Disparaît après
              <select value={distractionDurationHours} onChange={(event) => setDistractionDurationHours(Number(event.target.value))}>
                <option value={0.25}>15 minutes</option>
                <option value={1}>1 heure</option>
                <option value={6}>6 heures</option>
                <option value={12}>12 heures</option>
                <option value={24}>24 heures</option>
              </select>
            </label>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => {
                  setDistractionOpen(false);
                  setDistractionPlacement(null);
                  setPreviewPoint(null);
                }}
              >
                Fermer
              </button>
              <button type="button" onClick={submitDistraction} disabled={distractionBusy || (!distractionText.trim() && !distractionFile)}>
                {distractionBusy ? "..." : "Poser ici"}
              </button>
            </div>
            {authError ? <p className="staff-error">{authError}</p> : null}
          </section>
        ) : null}
      </section>
    </main>
  );
}
