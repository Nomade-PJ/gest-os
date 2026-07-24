import React, { useEffect, useRef } from 'react';
const PatternLockDisplay = ({
  pattern,
  size = 200
}) => {
  const canvasRef = useRef(null);
  const dotPositions = useRef([]);
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = size;
    canvas.height = size;
    const dotSize = 12;
    const padding = 30;
    const width = size - padding * 2;
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

    // Parse pattern
    let patternArray = [];
    try {
      if (pattern && pattern.trim() !== '') {
        patternArray = pattern.split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num));
      }
    } catch (e) {
      console.error('Error parsing pattern:', e);
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines (subtle)
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(padding + cellSize * i, padding);
      ctx.lineTo(padding + cellSize * i, size - padding);
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(padding, padding + cellSize * i);
      ctx.lineTo(size - padding, padding + cellSize * i);
      ctx.stroke();
    }

    // Draw pattern lines first (so dots appear on top)
    if (patternArray.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const firstDot = dotPositions.current[patternArray[0]];
      if (firstDot) {
        ctx.moveTo(firstDot.x, firstDot.y);
        for (let i = 1; i < patternArray.length; i++) {
          const dot = dotPositions.current[patternArray[i]];
          if (dot) {
            ctx.lineTo(dot.x, dot.y);
          }
        }
        ctx.stroke();

        // Draw arrows to show direction
        for (let i = 1; i < patternArray.length; i++) {
          const prevDot = dotPositions.current[patternArray[i - 1]];
          const currDot = dotPositions.current[patternArray[i]];
          if (prevDot && currDot) {
            // Calculate arrow direction
            const dx = currDot.x - prevDot.x;
            const dy = currDot.y - prevDot.y;
            const angle = Math.atan2(dy, dx);

            // Draw small arrow at midpoint
            const midX = (prevDot.x + currDot.x) / 2;
            const midY = (prevDot.y + currDot.y) / 2;
            const arrowSize = 8;
            ctx.save();
            ctx.translate(midX, midY);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-arrowSize, -arrowSize / 2);
            ctx.lineTo(-arrowSize, arrowSize / 2);
            ctx.closePath();
            ctx.fillStyle = '#3b82f6';
            ctx.fill();
            ctx.restore();
          }
        }
      }
    }

    // Draw dots
    dotPositions.current.forEach((pos, index) => {
      const isInPattern = patternArray.includes(index);
      const orderIndex = patternArray.indexOf(index);

      // Draw outer circle (glow effect for selected dots)
      if (isInPattern) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, dotSize + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.fill();
      }

      // Draw dot
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = isInPattern ? '#3b82f6' : '#d1d5db';
      ctx.fill();

      // Draw inner circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotSize - 4, 0, Math.PI * 2);
      ctx.fillStyle = isInPattern ? '#60a5fa' : '#e5e7eb';
      ctx.fill();

      // Draw order number for dots in pattern
      if (isInPattern && orderIndex >= 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((orderIndex + 1).toString(), pos.x, pos.y);
      }

      // Draw dot number (grid position)
      ctx.fillStyle = isInPattern ? '#1e40af' : '#6b7280';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(index.toString(), pos.x, pos.y + dotSize + 4);
    });
  }, [pattern, size]);
  return <div className="flex flex-col items-center">
      <canvas ref={canvasRef} className="border border-gray-200 rounded-lg shadow-sm" />
      <p className="text-xs text-muted-foreground mt-2">
        Padrão: {pattern || 'Nenhum padrão definido'}
      </p>
    </div>;
};
export default PatternLockDisplay;
