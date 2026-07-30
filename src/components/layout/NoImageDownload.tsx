'use client'

// Bloquea el click derecho y el arrastre sobre imágenes en toda la tienda,
// para que no se pueda hacer "Guardar imagen como..." sobre las fotos de
// producto. Es disuasión, no protección absoluta (una captura de pantalla
// siempre es posible), pero frena el caso común.
//
// Solo bloquea el menú contextual sobre imágenes (IMG, PICTURE o elementos
// con background-image) — el click derecho sobre texto/links sigue normal.

import { useEffect } from 'react'

export default function NoImageDownload() {
  useEffect(() => {
    function esImagen(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false
      if (target.tagName === 'IMG' || target.closest('picture')) return true
      try {
        return getComputedStyle(target).backgroundImage !== 'none'
      } catch {
        return false
      }
    }

    function onContextMenu(e: MouseEvent) {
      if (esImagen(e.target)) e.preventDefault()
    }
    function onDragStart(e: DragEvent) {
      if (e.target instanceof HTMLElement && e.target.tagName === 'IMG') e.preventDefault()
    }

    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('dragstart', onDragStart)
    return () => {
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('dragstart', onDragStart)
    }
  }, [])

  return null
}
