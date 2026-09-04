import React, { useRef, useEffect, useState } from 'react';
import { Box, RotateCcw } from 'lucide-react';

export const Immersive3DVisualizer = ({ labels = [], values = [], metricLabel = 'Metric', isCurrency = false }) => {
  const canvasRef = useRef(null);
  const [pitch, setPitch] = useState(30);
  const [yaw, setYaw] = useState(45);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, pitch: 30, yaw: 45 });

  const maxVal = Math.max(...values.map(v => Number(v) || 0), 1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI screens
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background gradient for immersive space
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height * 0.72;

    const radPitch = (pitch * Math.PI) / 180;
    const radYaw = (yaw * Math.PI) / 180;

    // Project 3D point to 2D
    const project = (x, y, z) => {
      // Rotate around Y axis (Yaw)
      const x1 = x * Math.cos(radYaw) - z * Math.sin(radYaw);
      const z1 = x * Math.sin(radYaw) + z * Math.cos(radYaw);

      // Rotate around X axis (Pitch)
      const y2 = y * Math.cos(radPitch) - z1 * Math.sin(radPitch);
      const z2 = y * Math.sin(radPitch) + z1 * Math.cos(radPitch);

      return {
        px: cx + x1,
        py: cy - y2,
        depth: z2
      };
    };

    // Draw coordinate plane floor grid
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 1;
    const gridSize = 160;
    const gridStep = 40;
    for (let gx = -gridSize; gx <= gridSize; gx += gridStep) {
      const p1 = project(gx, 0, -gridSize);
      const p2 = project(gx, 0, gridSize);
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();
    }
    for (let gz = -gridSize; gz <= gridSize; gz += gridStep) {
      const p1 = project(-gridSize, 0, gz);
      const p2 = project(gridSize, 0, gz);
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();
    }

    // Render 3D columns
    const n = Math.min(labels.length, 12);
    const spacing = 35;
    const startX = -((n - 1) * spacing) / 2;
    const barWidth = 18;
    const barDepth = 18;
    const maxHeight = 130;

    // Sort bars by depth for painter's algorithm
    const bars = [];
    for (let i = 0; i < n; i++) {
      const val = Number(values[i]) || 0;
      const h = (val / maxVal) * maxHeight;
      const bx = startX + i * spacing;
      const bz = 0;
      const centerProj = project(bx, h / 2, bz);
      bars.push({
        index: i,
        label: labels[i],
        val,
        h,
        bx,
        bz,
        depth: centerProj.depth
      });
    }

    // Sort farthest to nearest
    bars.sort((a, b) => a.depth - b.depth);

    bars.forEach(bar => {
      const { bx, bz, h, label, val } = bar;
      const halfW = barWidth / 2;
      const halfD = barDepth / 2;

      // 8 Vertices of the 3D Box
      const v0 = project(bx - halfW, 0, bz - halfD);
      const v1 = project(bx + halfW, 0, bz - halfD);
      const v2 = project(bx + halfW, 0, bz + halfD);
      const v3 = project(bx - halfW, 0, bz + halfD);

      const v4 = project(bx - halfW, h, bz - halfD);
      const v5 = project(bx + halfW, h, bz - halfD);
      const v6 = project(bx + halfW, h, bz + halfD);
      const v7 = project(bx - halfW, h, bz + halfD);

      // Front face
      ctx.fillStyle = 'rgba(37, 99, 235, 0.85)';
      ctx.beginPath();
      ctx.moveTo(v3.px, v3.py);
      ctx.lineTo(v2.px, v2.py);
      ctx.lineTo(v6.px, v6.py);
      ctx.lineTo(v7.px, v7.py);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.stroke();

      // Right face
      ctx.fillStyle = 'rgba(29, 78, 216, 0.9)';
      ctx.beginPath();
      ctx.moveTo(v2.px, v2.py);
      ctx.lineTo(v1.px, v1.py);
      ctx.lineTo(v5.px, v5.py);
      ctx.lineTo(v6.px, v6.py);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2563eb';
      ctx.stroke();

      // Top face (highlighted)
      ctx.fillStyle = 'rgba(96, 165, 250, 0.95)';
      ctx.beginPath();
      ctx.moveTo(v7.px, v7.py);
      ctx.lineTo(v6.px, v6.py);
      ctx.lineTo(v5.px, v5.py);
      ctx.lineTo(v4.px, v4.py);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#93c5fd';
      ctx.stroke();

      // Value label on top
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      const formattedVal = isCurrency ? `₹${val.toLocaleString('en-IN')}` : val.toLocaleString();
      ctx.fillText(formattedVal, v6.px, v6.py - 6);

      // Bottom label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px ui-sans-serif, system-ui';
      const truncatedLabel = label.length > 8 ? label.substring(0, 8) + '…' : label;
      ctx.fillText(truncatedLabel, v3.px, v3.py + 14);
    });
  }, [labels, values, pitch, yaw, maxVal, isCurrency]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      pitch,
      yaw
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setYaw((dragStartRef.current.yaw + dx * 0.5) % 360);
    setPitch(Math.max(10, Math.min(80, dragStartRef.current.pitch + dy * 0.5)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="relative w-full h-72 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 select-none shadow-inner">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div className="absolute top-2 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[10px] text-slate-300 font-mono">
        <Box className="h-3 w-3 text-cyan-400" />
        <span>3D Space • Pitch: {Math.round(pitch)}° Yaw: {Math.round(yaw)}°</span>
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => { setPitch(30); setYaw(45); }}
          className="p-1 rounded bg-slate-900/90 border border-slate-700 hover:border-slate-500 text-slate-300 text-[10px] flex items-center gap-1 px-1.5 transition-colors cursor-pointer"
          title="Reset Camera View"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          <span>Reset</span>
        </button>
      </div>
      <div className="absolute bottom-2 right-2 text-[9px] text-slate-400 font-mono bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
        Drag to rotate pitch & yaw
      </div>
    </div>
  );
};
