type Fetcher = {
  fetch(request: Request): Promise<Response>;
};

type D1Database = unknown;

declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
  };
}
