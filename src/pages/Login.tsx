export default function Login() {
  return (
    <main className="flex min-h-dvh flex-col justify-center bg-[#F5F8F5] px-8 py-12 text-[#23392F]">
      <header className="mb-10 flex flex-col items-center">
       <img
         src="/gota.png"
         alt="Logo de AquaSmart"
         className="mb-6 h-32 w-24 object-contain"
        />

        <h1 className="text-4xl font-medium tracking-tight">
          AquaSmart
        </h1>

        <p className="mt-3 text-center text-base text-[#808980]">
          Inicia sesión para continuar
        </p>
      </header>

      <form
        className="flex flex-col"
        onSubmit={(event) => event.preventDefault()}
      >
        <div>
          <label
            htmlFor="correo"
            className="mb-2 block text-base"
          >
            Correo electrónico
          </label>

          <input
            id="correo"
            name="correo"
            type="email"
            autoComplete="email"
            placeholder="Ingresa tu correo"
            required
            className="h-14 w-full rounded-xl border border-[#D3D7D3] bg-white px-4 text-base placeholder:text-gray-400 focus:border-[#77AEC6] focus:outline-none focus:ring-2 focus:ring-[#77AEC6]/30"
          />
        </div>

        <div className="mt-5">
          <label
            htmlFor="password"
            className="mb-2 block text-base"
          >
            Contraseña
          </label>

          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Ingresa tu contraseña"
            required
            className="h-14 w-full rounded-xl border border-[#D3D7D3] bg-white px-4 text-base placeholder:text-gray-400 focus:border-[#77AEC6] focus:outline-none focus:ring-2 focus:ring-[#77AEC6]/30"
          />
        </div>

        <button
          type="button"
          className="mt-2 min-h-11 self-end text-sm text-[#54869C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#54869C]"
        >
          ¿Olvidaste tu contraseña?
        </button>

        <button
          type="submit"
          className="mt-6 min-h-12 w-full rounded-full bg-[#77AEC6] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#659BB3] active:bg-[#54869C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#54869C]"
        >
          INICIAR SESIÓN
        </button>
      </form>
    </main>
  )
}
