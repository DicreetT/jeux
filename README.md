# jeux

Demo local de **Le Grimoire**, una PWA privada para dos personas que mezcla restaurante, recetario compartido, retos culinarios, clientes ficticios, cartas y economia imaginaria.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Vinext / Cloudflare-compatible build
- Datos mock centralizados, sin Supabase todavia

## Ejecutar

```bash
npm install
npm run dev
```

La app suele abrir en `http://localhost:3001/` si el puerto 3000 esta ocupado.

## Verificar

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

## Estructura principal

- `src/types/domain.ts`: interfaces de usuarios, recetas, platos, ingredientes, clientes, pedidos, reseñas, propinas, objetos del restaurante, cartas y retos.
- `src/data/mock-data.ts`: contenido mock inicial.
- `src/lib/game.ts`: generacion de caja misteriosa, reseña, propina y progreso.
- `src/components/le-grimoire-app.tsx`: experiencia navegable por escenas.
- `public/scenes/*`: assets reemplazables para Salon, Comptoir, Cuisine, Reserve, Caisse y Grimoire.

## Estado actual

La primera demo conserva la funcionalidad de cocina y recetario, pero cambia la navegacion hacia un pequeno mundo explorable basado en habitaciones, hotspots responsive y objetos interactivos.
