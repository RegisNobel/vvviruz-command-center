export default function PublicHomePage() {
  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <section className="panel overflow-hidden px-6 py-8 sm:px-8">
          <div className="max-w-4xl">
            <div className="pill">Public site in progress</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              vvviruz
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              The public vvviruz website will live here. The internal command center
              now runs inside a separate protected admin area with server-enforced
              authentication and TOTP verification.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
