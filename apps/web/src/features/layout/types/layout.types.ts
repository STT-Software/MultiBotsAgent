export interface Session {
  empresa: {
    id: string
    nombre: string
  }
  usuario: {
    id: string
    nombre: string
    email: string
  }
}

export interface NavItemConfig {
  label: string
  href: string
  icon: string
}
