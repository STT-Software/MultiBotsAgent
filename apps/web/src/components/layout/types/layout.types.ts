export interface Session {
  empresa: {
    id: string
    nombre: string
    logo?: string | null
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
