import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders Le Grimoire", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Le Grimoire<\/title>/i);
  assert.match(html, /Le Chef/i);
  assert.match(html, /Serveuse/i);
  assert.match(html, /Dernier passage/i);
  assert.match(html, /Le Grimoire/i);
  assert.match(html, /Caisse/i);
  assert.match(html, /Sortie/i);
  assert.doesNotMatch(html, /Abrir recetas|Voir la commande|Libro de reservas/i);
  assert.doesNotMatch(html, /Nos Plats|Menu|Le Comptoir|Entrar por las puertas dobles/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});
