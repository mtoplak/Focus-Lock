import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-6 text-slate-100">
      <main className="w-full max-w-md text-center">
        <p className="mb-2 text-sm font-medium tracking-wide text-slate-400 uppercase">
          Focus Lock
        </p>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight">
          Vite + React + Tailwind PWA
        </h1>
        <p className="mb-8 text-slate-400">
          Boilerplate frontend. Edit{' '}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm text-slate-200">
            src/App.tsx
          </code>{' '}
          to get started.
        </p>

        <button
          type="button"
          className="rounded-lg bg-indigo-500 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:outline-none"
          onClick={() => setCount((value) => value + 1)}
        >
          Count is {count}
        </button>
      </main>
    </div>
  )
}

export default App

