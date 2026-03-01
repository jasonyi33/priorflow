import { useEffect, useRef } from 'react';
import { cn } from './ui/utils';

interface TVNoiseProps {
  opacity?: number;
  intensity?: number;
  speed?: number;
  className?: string;
}

export default function TVNoise({
  opacity = 0.3,
  intensity = 0.2,
  speed = 40,
  className,
}: TVNoiseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const resize = () => {
      canvas.width = canvas.offsetWidth || 1;
      canvas.height = canvas.offsetHeight || 1;
    };

    const drawNoise = () => {
      const { width, height } = canvas;
      if (width === 0 || height === 0) return;
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const value = Math.random() * 255 * intensity;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = 255;
      }

      ctx.putImageData(imageData, 0, 0);
    };

    resize();

    const interval = setInterval(drawNoise, 1000 / speed);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    return () => {
      clearInterval(interval);
      if (animationId) cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, [intensity, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0 w-full h-full pointer-events-none z-10', className)}
      style={{ opacity, mixBlendMode: 'overlay' }}
    />
  );
}