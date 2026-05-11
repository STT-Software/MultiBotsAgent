'use client'

interface HeaderProps {
  empresaNombre: string
  usuarioNombre: string
}

export function Header({ empresaNombre, usuarioNombre }: HeaderProps) {
  function handleLogout() {
    console.log('logout')
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h2 className="text-lg font-semibold text-gray-800">{empresaNombre}</h2>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{usuarioNombre}</span>
        <button
          onClick={handleLogout}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}
