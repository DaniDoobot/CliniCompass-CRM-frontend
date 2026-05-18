/**
 * Hook que actualiza el título del documento y el favicon
 * con el número de conversaciones con mensajes sin leer.
 */
import { useEffect, useRef } from "react";

const BASE_TITLE = "CRM";

/**
 * Draw the nwee "n" icon on a canvas context (blue on transparent).
 * Mimics the SVG: two thick rounded-cap strokes forming a lowercase "n".
 */
function drawNweeN(ctx: CanvasRenderingContext2D, size: number) {
  const s = size / 512; // scale factor

  ctx.strokeStyle = "#2387EF";
  ctx.lineWidth = 100 * s;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Left vertical bar
  ctx.beginPath();
  ctx.moveTo(150 * s, 425 * s);
  ctx.lineTo(150 * s, 115 * s);
  ctx.stroke();

  // Arch + right bar
  ctx.beginPath();
  ctx.moveTo(150 * s, 190 * s);
  ctx.quadraticCurveTo(150 * s, 82 * s, 260 * s, 82 * s);
  ctx.quadraticCurveTo(370 * s, 82 * s, 370 * s, 190 * s);
  ctx.lineTo(370 * s, 425 * s);
  ctx.stroke();
}

/**
 * Dibuja un badge rojo con número sobre el favicon de la "n" nwee.
 * Devuelve un data-URL listo para usar como href del <link rel="icon">.
 */
function drawBadge(count: number): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Draw the "n" icon
  drawNweeN(ctx, 64);

  if (count > 0) {
    // Badge rojo arriba-derecha
    const badgeRadius = count > 9 ? 18 : 14;
    const bx = 64 - badgeRadius;
    const by = badgeRadius;

    ctx.beginPath();
    ctx.arc(bx, by, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#ef4444";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Número
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${count > 9 ? 16 : 18}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = count > 99 ? "99+" : String(count);
    ctx.fillText(label, bx, by + 1);
  }

  return canvas.toDataURL("image/png");
}

function setFavicon(dataUrl: string) {
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/png";
  link.href = dataUrl;
}

export function useUnreadBadge(unreadCount: number) {
  const prevCount = useRef(-1);

  useEffect(() => {
    // Solo actualizar si cambió el conteo
    if (prevCount.current === unreadCount) return;
    prevCount.current = unreadCount;

    // Título
    document.title = unreadCount > 0 ? `(${unreadCount}) ${BASE_TITLE}` : BASE_TITLE;

    // Favicon
    const dataUrl = drawBadge(unreadCount);
    if (dataUrl) setFavicon(dataUrl);
  }, [unreadCount]);
}
