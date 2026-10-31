/*
This file is part of the JivanLekh project.

Notion-style controls for top-level editor blocks. The document model remains
ProseMirror/Tiptap, so existing note content and block IDs stay compatible.
*/

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { Editor } from "../../types.js";

type BlockTarget = {
  pos: number;
  node: ProseMirrorNode;
  dom: HTMLElement;
  left: number;
  top: number;
  width: number;
  height: number;
};

function getBlockAt(editor: Editor, x: number, y: number): BlockTarget | null {
  if (editor.isDestroyed || editor.view.isDestroyed) return null;

  const hit = editor.view.posAtCoords({ left: x, top: y });
  if (!hit) return null;

  try {
    const $pos = editor.state.doc.resolve(hit.pos);
    if ($pos.depth < 1) return null;

    // Controls operate on the top-level block, even when the pointer is
    // inside a nested list item, table cell, or callout.
    const pos = $pos.before(1);
    const node = $pos.node(1);
    if (!node.isBlock) return null;

    const dom = editor.view.nodeDOM(pos);
    if (!(dom instanceof HTMLElement) || dom === editor.view.dom) return null;

    const rect = dom.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    return {
      pos,
      node,
      dom,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };
  } catch {
    return null;
  }
}

function dispatchNodeSelection(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node || node.type.spec.selectable === false) return;

  editor.view.dispatch(
    editor.state.tr
      .setSelection(NodeSelection.create(editor.state.doc, pos))
      .setMeta("addToHistory", false)
  );
}

function moveBlock(editor: Editor, from: number, to: number): boolean {
  const state = editor.state;
  const node = state.doc.nodeAt(from);
  if (!node || to === from || to === from + node.nodeSize) return false;

  let tr = state.tr.delete(from, from + node.nodeSize);
  const destination = tr.mapping.map(to, -1);
  const $destination = tr.doc.resolve(destination);

  // Only reorder sibling blocks in the document. Nested content continues to
  // use its own list/table interactions.
  if (
    $destination.depth !== 0 ||
    !$destination.parent.canReplaceWith(
      $destination.index(),
      $destination.index(),
      node.type
    )
  )
    return false;

  tr = tr.insert(destination, node);
  const moved = tr.doc.nodeAt(destination);
  if (moved && moved.type.spec.selectable !== false) {
    tr = tr.setSelection(NodeSelection.create(tr.doc, destination));
  }

  editor.view.dispatch(tr.setMeta("uiEvent", "drop").scrollIntoView());
  return true;
}

function duplicateBlock(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;

  const copy = node.type.create(node.attrs, node.content, node.marks);
  const at = pos + node.nodeSize;
  editor.view.dispatch(
    editor.state.tr.insert(at, copy).setMeta("uiEvent", "input").scrollIntoView()
  );
}

function deleteBlock(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;

  let tr = editor.state.tr;
  if (editor.state.doc.childCount <= 1) {
    const paragraph = editor.schema.nodes.paragraph?.create();
    if (!paragraph) return;
    tr = tr.replaceWith(pos, pos + node.nodeSize, paragraph);
    tr = tr.setSelection(TextSelection.create(tr.doc, pos + 1));
  } else {
    tr = tr.delete(pos, pos + node.nodeSize);
  }
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
}

function insertParagraphAfter(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  const paragraph = editor.schema.nodes.paragraph?.create();
  if (!node || !paragraph) return;

  const at = pos + node.nodeSize;
  const tr = editor.state.tr.insert(at, paragraph);
  tr.setSelection(TextSelection.create(tr.doc, at + 1));
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
}

function getSiblingPosition(editor: Editor, pos: number, direction: -1 | 1) {
  const siblings: Array<{ pos: number; node: ProseMirrorNode }> = [];
  editor.state.doc.forEach((node, childPos) => siblings.push({ pos: childPos, node }));
  const index = siblings.findIndex((item) => item.pos === pos);
  const sibling = siblings[index + direction];
  if (!sibling) return null;

  return direction < 0
    ? sibling.pos
    : sibling.pos + sibling.node.nodeSize;
}

function convertTextBlock(editor: Editor, pos: number, typeName: string, level?: number) {
  const node = editor.state.doc.nodeAt(pos);
  const targetType = editor.schema.nodes[typeName];
  if (!node?.isTextblock || !targetType?.isTextblock) return;

  const allowedAttributes = Object.keys(targetType.spec.attrs ?? {});
  const attrs: Record<string, unknown> = {};
  for (const name of allowedAttributes) {
    if (Object.prototype.hasOwnProperty.call(node.attrs, name))
      attrs[name] = node.attrs[name];
  }
  if (typeName === "heading" && level) attrs.level = level;

  try {
    const converted = targetType.create(attrs, node.content, node.marks);
    const tr = editor.state.tr.replaceWith(pos, pos + node.nodeSize, converted);
    editor.view.dispatch(tr.scrollIntoView());
    editor.view.focus();
  } catch {
    // Some custom text blocks have schema-specific content constraints.
  }
}

const controlButtonStyle: CSSProperties = {
  alignItems: "center",
  background: "var(--background, #fff)",
  border: "1px solid var(--border, #ddd)",
  borderRadius: 6,
  color: "var(--paragraph-secondary, #777)",
  cursor: "pointer",
  display: "inline-flex",
  height: 25,
  justifyContent: "center",
  padding: 0,
  width: 25
};

const menuButtonStyle: CSSProperties = {
  background: "transparent",
  border: 0,
  borderRadius: 5,
  color: "var(--paragraph, inherit)",
  cursor: "pointer",
  display: "block",
  font: "inherit",
  padding: "7px 10px",
  textAlign: "left",
  whiteSpace: "nowrap",
  width: "100%"
};

export function BlockControls({ editor }: { editor: Editor }) {
  const [activeBlock, setActiveBlock] = useState<BlockTarget | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeRef = useRef<BlockTarget | null>(null);
  const menuOpenRef = useRef(false);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const updateActive = useCallback((target: BlockTarget | null) => {
    activeRef.current = target;
    setActiveBlock(target);
  }, []);

  const refreshAtPointer = useCallback(() => {
    const pointer = pointerRef.current;
    if (!pointer || !editor.isEditable) return;
    updateActive(getBlockAt(editor, pointer.x, pointer.y));
  }, [editor, updateActive]);

  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

  useEffect(() => {
    if (!editor.isEditable) {
      updateActive(null);
      setMenuOpen(false);
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(".jl-block-controls, .jl-block-menu")
      )
        return;

      pointerRef.current = { x: event.clientX, y: event.clientY };
      if (target instanceof Node && editor.view.dom.contains(target)) {
        updateActive(getBlockAt(editor, event.clientX, event.clientY));
      } else if (!menuOpenRef.current && !dragCleanupRef.current) {
        updateActive(null);
      }
    };

    const onPointerDownInEditor = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        editor.view.dom.contains(target) &&
        !(target instanceof Element && target.closest(".jl-block-controls, .jl-block-menu"))
      ) {
        pointerRef.current = { x: event.clientX, y: event.clientY };
        updateActive(getBlockAt(editor, event.clientX, event.clientY));
      }
    };

    const onScroll = () => {
      if (menuOpenRef.current) return;
      refreshAtPointer();
    };

    const onOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(".jl-block-controls, .jl-block-menu")
      )
        return;
      setMenuOpen(false);
      menuOpenRef.current = false;
    };

    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerdown", onPointerDownInEditor, true);
    document.addEventListener("pointerdown", onOutsidePointerDown, true);
    window.addEventListener("scroll", onScroll, true);
    editor.on("transaction", refreshAtPointer);

    return () => {
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("pointerdown", onPointerDownInEditor, true);
      document.removeEventListener("pointerdown", onOutsidePointerDown, true);
      window.removeEventListener("scroll", onScroll, true);
      editor.off("transaction", refreshAtPointer);
      dragCleanupRef.current?.();
    };
  }, [editor, refreshAtPointer, updateActive]);

  const openBlockMenu = (target: BlockTarget) => {
    dispatchNodeSelection(editor, target.pos);
    setMenuOpen((open) => !open);
  };

  const beginDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    target: BlockTarget
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const originalOpacity = target.dom.style.opacity;
    let dragging = false;

    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      target.dom.style.opacity = originalOpacity;
      document.body.style.removeProperty("user-select");
      dragCleanupRef.current = null;
    };

    const onMove = (moveEvent: PointerEvent) => {
      if (
        !dragging &&
        Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > 5
      ) {
        dragging = true;
        target.dom.style.opacity = "0.35";
        document.body.style.setProperty("user-select", "none");
        setMenuOpen(false);
      }
      if (dragging) moveEvent.preventDefault();
    };

    const onUp = (upEvent: PointerEvent) => {
      cleanup();
      if (!dragging) {
        openBlockMenu(target);
        return;
      }

      const dropTarget = getBlockAt(editor, upEvent.clientX, upEvent.clientY);
      if (!dropTarget || dropTarget.pos === target.pos) {
        refreshAtPointer();
        return;
      }

      const insertBefore =
        upEvent.clientY <
        dropTarget.top + dropTarget.height / 2;
      const destination = insertBefore
        ? dropTarget.pos
        : dropTarget.pos + dropTarget.node.nodeSize;
      moveBlock(editor, target.pos, destination);
      pointerRef.current = { x: upEvent.clientX, y: upEvent.clientY };
      refreshAtPointer();
    };

    const onCancel = () => {
      cleanup();
      refreshAtPointer();
    };

    dragCleanupRef.current = cleanup;
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  const runAction = (action: () => void) => {
    setMenuOpen(false);
    menuOpenRef.current = false;
    action();
    refreshAtPointer();
  };

  if (!editor.isEditable || !activeBlock) return null;

  const menuLeft = Math.max(8, activeBlock.left - 54);
  const menuTop = Math.max(8, activeBlock.top);

  return (
    <>
      <div
        className="jl-block-controls"
        style={{
          display: "flex",
          gap: 3,
          left: menuLeft,
          position: "fixed",
          top: menuTop,
          zIndex: 1200
        }}
      >
        <button
          aria-label="Add block below"
          className="jl-block-control-button"
          onClick={() => {
            setMenuOpen(false);
            insertParagraphAfter(editor, activeBlock.pos);
          }}
          style={controlButtonStyle}
          title="Add block below"
          type="button"
        >
          <svg aria-hidden="true" height="15" viewBox="0 0 20 20" width="15">
            <path d="M10 4v12M4 10h12" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </button>
        <button
          aria-label="Drag block or open block menu"
          className="jl-block-control-button jl-block-drag-handle"
          onPointerDown={(event) => beginDrag(event, activeBlock)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openBlockMenu(activeBlock);
            }
          }}
          style={{ ...controlButtonStyle, cursor: "grab", touchAction: "none" }}
          title="Drag to move; click for block actions"
          type="button"
        >
          <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
            {[4, 8, 12].flatMap((x) =>
              [4, 8, 12].map((y) => (
                <circle cx={x} cy={y} fill="currentColor" key={x + "-" + y} r="1.15" />
              ))
            )}
          </svg>
        </button>
      </div>

      {menuOpen ? (
        <div
          aria-label="Block actions"
          className="jl-block-menu"
          onKeyDown={(event) => {
            if (event.key === "Escape") setMenuOpen(false);
          }}
          role="menu"
          style={{
            background: "var(--background, #fff)",
            border: "1px solid var(--border, #ddd)",
            borderRadius: 8,
            boxShadow: "0 8px 28px rgba(0,0,0,.16)",
            left: menuLeft,
            maxHeight: "min(70vh, 420px)",
            minWidth: 176,
            overflowY: "auto",
            padding: 5,
            position: "fixed",
            top: menuTop + 29,
            zIndex: 1201
          }}
        >
          <button
            className="jl-block-menu-item"
            onClick={() => runAction(() => duplicateBlock(editor, activeBlock.pos))}
            role="menuitem"
            style={menuButtonStyle}
            type="button"
          >
            Duplicate
          </button>
          <button
            className="jl-block-menu-item"
            onClick={() =>
              runAction(() => {
                const destination = getSiblingPosition(editor, activeBlock.pos, -1);
                if (destination !== null)
                  moveBlock(editor, activeBlock.pos, destination);
              })
            }
            role="menuitem"
            style={menuButtonStyle}
            type="button"
          >
            Move up
          </button>
          <button
            className="jl-block-menu-item"
            onClick={() =>
              runAction(() => {
                const destination = getSiblingPosition(editor, activeBlock.pos, 1);
                if (destination !== null)
                  moveBlock(editor, activeBlock.pos, destination);
              })
            }
            role="menuitem"
            style={menuButtonStyle}
            type="button"
          >
            Move down
          </button>
          {activeBlock.node.isTextblock ? (
            <>
              <div className="jl-block-menu-divider" />
              <div className="jl-block-menu-heading">Turn into</div>
              {[
                { label: "Text", type: "paragraph" },
                { label: "Heading 1", type: "heading", level: 1 },
                { label: "Heading 2", type: "heading", level: 2 },
                { label: "Heading 3", type: "heading", level: 3 }
              ].map((option) => (
                <button
                  className="jl-block-menu-item"
                  key={option.label}
                  onClick={() =>
                    runAction(() =>
                      convertTextBlock(
                        editor,
                        activeBlock.pos,
                        option.type,
                        option.level
                      )
                    )
                  }
                  role="menuitem"
                  style={menuButtonStyle}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </>
          ) : null}
          <div className="jl-block-menu-divider" />
          <button
            className="jl-block-menu-item jl-block-menu-danger"
            onClick={() => runAction(() => deleteBlock(editor, activeBlock.pos))}
            role="menuitem"
            style={menuButtonStyle}
            type="button"
          >
            Delete
          </button>
        </div>
      ) : null}
    </>
  );
}
