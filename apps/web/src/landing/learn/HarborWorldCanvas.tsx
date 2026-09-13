import { useEffect, useRef } from "react";
import { createHarborWorld, type HarborHue, type HarborWorldHandle } from "./harborWorld";

type Props = {
  progress: number;
  flash: "ok" | "no" | null;
  hue: HarborHue;
  reducedMotion: boolean;
  className?: string;
};

/** Full-bleed WebGL river voyage behind the Harbor Quest HUD. */
export function HarborWorldCanvas({ progress, flash, hue, reducedMotion, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<HarborWorldHandle | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const world = createHarborWorld(canvas, { hue, reducedMotion });
    worldRef.current = world;

    const onResize = () => world.resize();
    window.addEventListener("resize", onResize);
    // Layout may settle after mount (fullscreen HUD).
    requestAnimationFrame(() => world.resize());

    return () => {
      window.removeEventListener("resize", onResize);
      world.dispose();
      worldRef.current = null;
    };
    // Recreate only when canvas mounts; hue / motion / flash sync via setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    worldRef.current?.setProgress(progress);
  }, [progress]);

  useEffect(() => {
    worldRef.current?.setFlash(flash);
  }, [flash]);

  useEffect(() => {
    worldRef.current?.setHue(hue);
  }, [hue]);

  useEffect(() => {
    worldRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "hq-world-canvas"}
      aria-hidden="true"
    />
  );
}
