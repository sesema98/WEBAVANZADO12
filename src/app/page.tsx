export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-16 sm:px-10">
      <div className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
          Laboratorio 12
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950">
          Next.js + Prisma + API Routes
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
          El ejercicio 1 ya está implementado con App Router, Prisma Client y
          el endpoint <code>/api/authors</code> para listar y crear autores.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl bg-zinc-50 p-5">
            <h2 className="text-lg font-semibold text-zinc-900">GET</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Lista los autores junto con sus libros y el conteo total de
              libros por autor.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-zinc-950 p-4 text-sm text-zinc-100">
              GET /api/authors
            </pre>
          </section>

          <section className="rounded-2xl bg-zinc-50 p-5">
            <h2 className="text-lg font-semibold text-zinc-900">POST</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Crea un autor nuevo validando nombre, email y formato de
              `birthYear`.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-zinc-950 p-4 text-sm text-zinc-100">
{`POST /api/authors
Content-Type: application/json

{
  "name": "Isabel Allende",
  "email": "isabel@example.com",
  "bio": "Escritora chilena",
  "nationality": "Chile",
  "birthYear": "1942"
}`}
            </pre>
          </section>
        </div>
      </div>
    </main>
  );
}
