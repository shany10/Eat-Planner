export function useSidebar() {
  // Non persiste : revient a l'etat agrandi a chaque chargement de page.
  const collapsed = useState('sidebar-collapsed', () => false)

  function toggle() {
    collapsed.value = !collapsed.value
  }

  return { collapsed, toggle }
}
