/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
*/

import { Box, Button, Flex } from "@theme-ui/components";
import { ReactNodeViewProps, createNodeView } from "../react/index.js";
import { Node, mergeAttributes } from "@tiptap/core";
import { useState, type PointerEvent } from "react";

type Point = { x: number; y: number };
type Stroke = { color: string; width: number; points: Point[] };
type SketchAttrs = { strokes: Stroke[] };

const COLORS = ["#1f2937", "#dc2626", "#2563eb", "#16a34a", "#9333ea"];

function SketchComponent(props: ReactNodeViewProps<SketchAttrs>) {
  const { node, updateAttributes, selected } = props;
  const strokes = node.attrs.strokes as Stroke[];
  const [color, setColor] = useState(COLORS[0]);
  const [brush, setBrush] = useState(3);
  const [active, setActive] = useState<Point[] | null>(null);

  const pointFrom = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1000, ((event.clientX - rect.left) / rect.width) * 1000)),
      y: Math.max(0, Math.min(500, ((event.clientY - rect.top) / rect.height) * 500))
    };
  };
  const pathFor = (points: Point[]) =>
    points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");

  return (
    <Box contentEditable={false} sx={{ border: "1px solid var(--border)", borderColor: selected ? "accent" : "border", borderRadius: "default", p: 2, my: 2, bg: "background-secondary" }}>
      <Flex sx={{ alignItems: "center", gap: 1, mb: 1 }}>
        {COLORS.map((value) => (
          <Button key={value} aria-label={`Brush color ${value}`} onClick={() => setColor(value)} sx={{ width: 20, height: 20, minWidth: 20, p: 0, borderRadius: "full", bg: value, outline: color === value ? "2px solid var(--accent)" : "none" }} />
        ))}
        <select aria-label="Brush size" value={brush} onChange={(event) => setBrush(Number(event.target.value))}>
          <option value={2}>Fine</option><option value={3}>Medium</option><option value={6}>Thick</option>
        </select>
        <Button variant="secondary" onClick={() => updateAttributes({ strokes: strokes.slice(0, -1) })}>Undo</Button>
        <Button variant="secondary" onClick={() => updateAttributes({ strokes: [] })}>Clear</Button>
      </Flex>
      <svg viewBox="0 0 1000 500" role="img" aria-label="Sketch canvas" style={{ width: "100%", height: 220, display: "block", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 6, touchAction: "none" }}
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setActive([pointFrom(event)]); }}
        onPointerMove={(event) => { if (active) setActive([...active, pointFrom(event)]); }}
        onPointerUp={() => { if (active?.length) updateAttributes({ strokes: [...strokes, { color, width: brush, points: active }] }); setActive(null); }}
        onPointerCancel={() => setActive(null)}>
        {strokes.map((stroke, index) => <path key={index} d={pathFor(stroke.points)} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />)}
        {active?.length ? <path d={pathFor(active)} fill="none" stroke={color} strokeWidth={brush} strokeLinecap="round" strokeLinejoin="round" /> : null}
      </svg>
    </Box>
  );
}

export const SketchNode = Node.create({
  name: "sketch",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      strokes: {
        default: [],
        parseHTML: (element: HTMLElement) => {
          try {
            return JSON.parse(element.getAttribute("data-strokes") || "[]");
          } catch {
            return [];
          }
        },
        renderHTML: (attributes: { strokes: Stroke[] }) => ({
          "data-strokes": JSON.stringify(attributes.strokes || [])
        })
      }
    };
  },
  parseHTML() { return [{ tag: "div[data-sketch]" }]; },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-sketch": "true" })];
  },
  addNodeView() {
    return createNodeView(SketchComponent, {
      shouldUpdate: (previous, next) => JSON.stringify(previous.attrs) !== JSON.stringify(next.attrs),
      forceEnableSelection: true
    });
  },
  addCommands() {
    return {
      insertSketch: () => ({ commands }) => commands.insertContent({ type: this.name, attrs: { strokes: [] } })
    };
  }
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    sketch: { insertSketch: () => ReturnType };
  }
}
