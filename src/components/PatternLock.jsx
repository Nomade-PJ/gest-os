import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
const PatternLock = ({
  value,
  onChange
}) => {
  const [pattern, setPattern] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const dotPositions = useRef([]);
  const drawDots = useCallback((currentPattern = []) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw dots
    dotPositions.current.forEach((pos, index) => {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = currentPattern.includes(index) ? '#3b82f6' : '#d1d5db';
      ctx.fill();
    });
  }, []);
  const drawPattern = useCallback(currentPattern => {
    if (!canvasRef.current || currentPattern.length < 2) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw lines connecting dots
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    const firstDot = dotPositions.current[currentPattern[0]];
    ctx.moveTo(firstDot.x, firstDot.y);
    for (let i = 1; i < currentPattern.length; i++) {
      const dot = dotPositions.current[currentPattern[i]];
      ctx.lineTo(dot.x, dot.y);
    }
    ctx.stroke();
  }, []);

  // Define dots positions
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const padding = 40;
    const width = rect.width - padding * 2;
    const cellSize = width / 2;

    // Calculate positions for a 3x3 grid
    const positions = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        positions.push({
          x: padding + cellSize * col,
          y: padding + cellSize * row
        });
      }
    }
    dotPositions.current = positions;

    // Draw the initial dots
    drawDots([]);
  }, [drawDots]);

  // Update pattern display when value changes
  useEffect(() => {
    if (!value || value === "") {
      setPattern([]);
      drawDots([]);
      return;
    }

    // If the value is a comma-separated list of numbers, parse it
    try {
      const parsedPattern = value.split(',').map(Number);
      if (parsedPattern.some(isNaN)) {
        setPattern([]);
        drawDots([]);
      } else {
        setPattern(parsedPattern);
        drawDots(parsedPattern);
        drawPattern(parsedPattern);
      }
    } catch {
      setPattern([]);
      drawDots([]);
    }
  }, [value, drawDots, drawPattern]);

  // Removido daqui pois foi movido para cima e refatorado com useCallback

  const findClosestDot = (x, y) => {
    for (let i = 0; i < dotPositions.current.length; i++) {
      const dot = dotPositions.current[i];
      const distance = Math.sqrt(Math.pow(dot.x - x, 2) + Math.pow(dot.y - y, 2));

      // If within 20px of a dot
      if (distance < 20) {
        return i;
      }
    }
    return null;
  };
  const handleMouseDown = event => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const dotIndex = findClosestDot(x, y);
    if (dotIndex !== null) {
      setIsDrawing(true);
      const newPattern = [dotIndex];
      setPattern(newPattern);
      drawDots(newPattern);
    }
  };
  const handleMouseMove = event => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const dotIndex = findClosestDot(x, y);
    if (dotIndex !== null && !pattern.includes(dotIndex)) {
      const newPattern = [...pattern, dotIndex];
      setPattern(newPattern);
      drawDots(newPattern);
      drawPattern(newPattern);
    }
  };
  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);

      // If pattern is drawn, update the value
      if (pattern.length > 0) {
        onChange(pattern.join(','));
      }
    }
  };
  const handleTouchStart = event => {
    event.preventDefault();
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const dotIndex = findClosestDot(x, y);
    if (dotIndex !== null) {
      setIsDrawing(true);
      const newPattern = [dotIndex];
      setPattern(newPattern);
      drawDots(newPattern);
    }
  };
  const handleTouchMove = event => {
    event.preventDefault();
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const dotIndex = findClosestDot(x, y);
    if (dotIndex !== null && !pattern.includes(dotIndex)) {
      const newPattern = [...pattern, dotIndex];
      setPattern(newPattern);
      drawDots(newPattern);
      drawPattern(newPattern);
    }
  };
  const handleTouchEnd = event => {
    event.preventDefault();
    if (isDrawing) {
      setIsDrawing(false);

      // If pattern is drawn, update the value
      if (pattern.length > 0) {
        onChange(pattern.join(','));
      }
    }
  };
  const clearPattern = () => {
    setPattern([]);
    onChange('');
    drawDots([]);
  };
  return <div className="w-full flex flex-col items-center">
      <div ref={containerRef} className="w-full max-w-[240px] aspect-square relative mb-2">
        <canvas ref={canvasRef} className="absolute inset-0 touch-none" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} />
      </div>
      <Button variant="outline" size="sm" onClick={clearPattern} type="button" className="flex items-center gap-1">
        <X className="h-4 w-4" /> Limpar Padrão
      </Button>
    </div>;
};
export default PatternLock;
