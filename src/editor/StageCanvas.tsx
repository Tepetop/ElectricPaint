import Konva from "konva";
import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import { SYMBOL_SIZE, formatScaleLength, labelOffsetFromWorld, polylineToFlat, snapPoint, symbolLabelPosition } from "../domain/geometry";
import { GRID_SIZE, isCable, isSymbol, isText, type OverlayElement, type Point } from "../domain/types";
import {
  canvasPointFromScreen,
  clearSelection,
  clickScalePoint,
  commitCablePoints,
  commitElementPatch,
  commitMove,
  commitCableSegment,
  finishCable,
  placeAt,
  previewCableSegment,
  previewScalePoint,
  startCableSegment,
  selectIds,
  setPan,
  setViewport,
  setZoom,
  useEditor,
} from "../state/editorStore";
import { loadDataUrlImage, preloadSymbolImages, symbolImage } from "./images";

type Box = { x: number; y: number; width: number; height: number };

function elementBox(el: OverlayElement): Box {
  if (isCable(el)) {
    const xs = el.points.map((p) => p.x);
    const ys = el.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return { x: minX, y: minY, width: Math.max(1, Math.max(...xs) - minX), height: Math.max(1, Math.max(...ys) - minY) };
  }
  if (isText(el)) {
    return { x: el.x, y: el.y, width: Math.max(40, el.text.length * el.fontSize * 0.6), height: el.fontSize + 6 };
  }
  return { x: el.x, y: el.y, width: SYMBOL_SIZE * el.scale + 40, height: SYMBOL_SIZE * el.scale };
}

function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function StageCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef(new Map<string, Konva.Node>());
  const dragOrigin = useRef<Map<string, Point>>(new Map());
  const space = useRef(false);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [imagesReady, setImagesReady] = useState(0);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [panning, setPanning] = useState(false);
  const lastPointer = useRef<Point | null>(null);
  const marqueeStart = useRef<Point | null>(null);
  const drawingCable = useRef(false);

  const project = useEditor((s) => s.project);
  const backgroundDataUrl = useEditor((s) => s.backgroundDataUrl);
  const zoom = useEditor((s) => s.zoom);
  const pan = useEditor((s) => s.pan);
  const tool = useEditor((s) => s.tool);
  const selectedIds = useEditor((s) => s.selectedIds);
  const showGrid = useEditor((s) => s.showGrid);
  const snap = useEditor((s) => s.snap);
  const cableDraft = useEditor((s) => s.cableDraft);
  const cableColor = useEditor((s) => s.cableColor);
  const cableWidth = useEditor((s) => s.cableWidth);
  const cableStyle = useEditor((s) => s.cableStyle);
  const scaleDraft = useEditor((s) => s.scaleDraft);
  const scalePreview = useEditor((s) => s.scalePreview);
  const scaleReference = useEditor((s) => s.project.scaleReference);
  const layers = project.layers;
  const hidden = useMemo(() => new Set(layers.filter((l) => !l.visible).map((l) => l.id)), [layers]);
  const locked = useMemo(() => new Set(layers.filter((l) => l.locked).map((l) => l.id)), [layers]);

  useEffect(() => {
    void preloadSymbolImages().then(() => setImagesReady((n) => n + 1));
  }, []);

  useEffect(() => {
    if (!backgroundDataUrl) {
      setBgImage(null);
      return;
    }
    void loadDataUrlImage(backgroundDataUrl).then(setBgImage);
  }, [backgroundDataUrl]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setViewport(el.clientWidth, el.clientHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") space.current = true;
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") space.current = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useEffect(() => {
    const onUp = (e: MouseEvent) => {
      if (e.button === 0) endCableStroke();
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const nodes = selectedIds
      .filter((id) => !locked.has(project.elements.find((el) => el.id === id)?.layerId ?? ""))
      .map((id) => nodeRefs.current.get(id))
      .filter((node): node is Konva.Node => Boolean(node) && node!.getAttr("epType") !== "cable");
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, project.elements, locked, imagesReady]);

  const visible = project.elements.filter((el) => !hidden.has(el.layerId));
  const viewport = useEditor((s) => s.viewport);

  const gridLines = useMemo(() => {
    if (!showGrid) return [];
    const lines: number[][] = [];
    for (let x = 0; x <= project.canvas.width; x += GRID_SIZE * 5) {
      lines.push([x, 0, x, project.canvas.height]);
    }
    for (let y = 0; y <= project.canvas.height; y += GRID_SIZE * 5) {
      lines.push([0, y, project.canvas.width, y]);
    }
    return lines;
  }, [showGrid, project.canvas.height, project.canvas.width]);

  function toCanvas(evt: Konva.KonvaEventObject<MouseEvent>): Point {
    const stage = evt.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) return { x: 0, y: 0 };
    return canvasPointFromScreen(pointer);
  }

  function onWheel(evt: Konva.KonvaEventObject<WheelEvent>) {
    evt.evt.preventDefault();
    const stage = evt.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;
    const oldZoom = zoom;
    const next = evt.evt.deltaY > 0 ? oldZoom / 1.1 : oldZoom * 1.1;
    const clamped = Math.min(8, Math.max(0.1, next));
    const world = canvasPointFromScreen(pointer);
    setZoom(clamped);
    setPan({ x: pointer.x - world.x * clamped, y: pointer.y - world.y * clamped });
  }

  function endCableStroke() {
    if (!drawingCable.current) return;
    drawingCable.current = false;
    commitCableSegment();
  }

  function onMouseDown(evt: Konva.KonvaEventObject<MouseEvent>) {
    const isPan = tool === "pan" || space.current || evt.evt.button === 1;
    if (isPan) {
      setPanning(true);
      lastPointer.current = { x: evt.evt.clientX, y: evt.evt.clientY };
      return;
    }
    if (tool === "cable" && evt.evt.button === 2) {
      evt.evt.preventDefault();
      drawingCable.current = false;
      finishCable();
      return;
    }
    if (evt.evt.button !== 0) return;
    if (tool === "cable") {
      drawingCable.current = true;
      startCableSegment(toCanvas(evt));
      return;
    }
    if (tool === "scale") {
      clickScalePoint(toCanvas(evt));
      return;
    }
    const clickedStage = evt.target === evt.target.getStage() || evt.target.getClassName() === "Rect" && evt.target.name() === "bg";
    if (!clickedStage) return;
    if (tool === "select") {
      const start = toCanvas(evt);
      marqueeStart.current = start;
      setMarquee({ x: start.x, y: start.y, width: 0, height: 0 });
      if (!evt.evt.shiftKey) clearSelection();
      return;
    }
    placeAt(toCanvas(evt));
  }

  function onMouseMove(evt: Konva.KonvaEventObject<MouseEvent>) {
    if (drawingCable.current) {
      if ((evt.evt.buttons & 1) === 0) {
        endCableStroke();
        return;
      }
      previewCableSegment(toCanvas(evt));
      return;
    }
    if (tool === "scale" && scaleDraft.length > 0) {
      previewScalePoint(toCanvas(evt));
    }
    if (panning && lastPointer.current) {
      const dx = evt.evt.clientX - lastPointer.current.x;
      const dy = evt.evt.clientY - lastPointer.current.y;
      lastPointer.current = { x: evt.evt.clientX, y: evt.evt.clientY };
      setPan({ x: pan.x + dx, y: pan.y + dy });
      return;
    }
    if (marqueeStart.current) {
      const start = marqueeStart.current;
      const now = toCanvas(evt);
      setMarquee({
        x: Math.min(start.x, now.x),
        y: Math.min(start.y, now.y),
        width: Math.abs(now.x - start.x),
        height: Math.abs(now.y - start.y),
      });
    }
  }

  function onMouseUp(evt: Konva.KonvaEventObject<MouseEvent>) {
    endCableStroke();
    if (panning) {
      setPanning(false);
      lastPointer.current = null;
    }
    if (marqueeStart.current) {
      const start = marqueeStart.current;
      const end = toCanvas(evt);
      const box = {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y),
      };
      if (box.width > 4 && box.height > 4) {
        const hits = visible
          .filter((el) => !locked.has(el.layerId) && intersects(box, elementBox(el)))
          .map((el) => el.id);
        selectIds(hits, evt.evt.shiftKey);
      }
      marqueeStart.current = null;
      setMarquee(null);
    }
  }

  function onContextMenu(evt: Konva.KonvaEventObject<PointerEvent>) {
    if (tool !== "cable") return;
    evt.evt.preventDefault();
    drawingCable.current = false;
    finishCable();
  }

  return (
    <div className="canvas-wrap" ref={wrapRef}>
      <div className="stage-host" data-testid="stage-host">
        <Stage
          ref={stageRef}
          width={viewport.width}
          height={viewport.height}
          scaleX={zoom}
          scaleY={zoom}
          x={pan.x}
          y={pan.y}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onContextMenu={onContextMenu}
          draggable={false}
        >
          <Layer>
            <Rect
              name="bg"
              x={0}
              y={0}
              width={project.canvas.width}
              height={project.canvas.height}
              fill="#f7f4ec"
            />
            {bgImage && (
              <KonvaImage image={bgImage} x={0} y={0} width={project.canvas.width} height={project.canvas.height} listening={false} />
            )}
            {gridLines.map((pts, i) => (
              <Line key={i} points={pts} stroke="#00000018" strokeWidth={1} listening={false} />
            ))}
            {visible.map((el) => {
              const isLocked = locked.has(el.layerId);
              const selected = selectedIds.includes(el.id);
              if (isCable(el)) {
                return (
                  <CableShape
                    key={el.id}
                    el={el}
                    selected={selected}
                    locked={isLocked}
                    tool={tool}
                    snap={snap}
                    onRef={(node) => {
                      if (node) nodeRefs.current.set(el.id, node);
                      else nodeRefs.current.delete(el.id);
                    }}
                  />
                );
              }
              if (isSymbol(el)) {
                const image = symbolImage(el.kind);
                const canMove = !isLocked && (tool === "select" || tool === "symbol");
                return (
                  <KonvaImage
                    key={el.id}
                    image={image}
                    x={el.x}
                    y={el.y}
                    width={SYMBOL_SIZE}
                    height={SYMBOL_SIZE}
                    rotation={el.rotation}
                    scaleX={el.scale}
                    scaleY={el.scale}
                    draggable={canMove}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      if (!canMove) return;
                      selectIds([el.id], e.evt.shiftKey);
                    }}
                    onDragStart={() => {
                      dragOrigin.current.set(el.id, { x: el.x, y: el.y });
                    }}
                    onDragEnd={(e) => {
                      const origin = dragOrigin.current.get(el.id) ?? { x: el.x, y: el.y };
                      const pos = snapPoint({ x: e.target.x(), y: e.target.y() }, snap);
                      commitMove([el.id], pos.x - origin.x, pos.y - origin.y);
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      commitElementPatch(el.id, {
                        x: node.x(),
                        y: node.y(),
                        rotation: node.rotation(),
                        scale: node.scaleX(),
                      });
                    }}
                    ref={(node) => {
                      if (node) {
                        node.setAttr("epType", "symbol");
                        nodeRefs.current.set(el.id, node);
                      } else nodeRefs.current.delete(el.id);
                    }}
                  />
                );
              }
              if (isText(el)) {
                return (
                  <Text
                    key={el.id}
                    text={el.text}
                    x={el.x}
                    y={el.y}
                    fontSize={el.fontSize}
                    fill="#111"
                    rotation={el.rotation}
                    scaleX={el.scale}
                    scaleY={el.scale}
                    draggable={tool === "select" && !isLocked}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      if (isLocked || tool !== "select") return;
                      selectIds([el.id], e.evt.shiftKey);
                    }}
                    onDragEnd={(e) => {
                      const pos = snapPoint({ x: e.target.x(), y: e.target.y() }, snap);
                      commitElementPatch(el.id, { x: pos.x, y: pos.y });
                    }}
                    ref={(node) => {
                      if (node) {
                        node.setAttr("epType", "text");
                        nodeRefs.current.set(el.id, node);
                      } else nodeRefs.current.delete(el.id);
                    }}
                  />
                );
              }
              return null;
            })}
            {visible.filter(isSymbol).map((el) => {
              const labelPos = symbolLabelPosition(el);
              const canMoveLabel = !locked.has(el.layerId) && (tool === "select" || tool === "symbol");
              return (
                <Text
                  key={`${el.id}-label`}
                  x={labelPos.x}
                  y={labelPos.y}
                  text={el.label}
                  fontSize={12}
                  fill="#111"
                  draggable={canMoveLabel}
                  listening={canMoveLabel}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    if (!canMoveLabel) return;
                    selectIds([el.id], e.evt.shiftKey);
                  }}
                  onDragEnd={(e) => {
                    const pos = snapPoint({ x: e.target.x(), y: e.target.y() }, snap);
                    const offset = labelOffsetFromWorld(el, pos);
                    commitElementPatch(el.id, {
                      labelOffset: { x: Math.round(offset.x), y: Math.round(offset.y) },
                    });
                  }}
                />
              );
            })}
            {cableDraft.length > 0 && (
              <Line
                points={polylineToFlat(cableDraft)}
                stroke={cableColor}
                strokeWidth={cableWidth}
                dash={cableStyle === "dashed" ? [12, 8] : undefined}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
            )}
            {tool === "scale" && scaleReference && scaleDraft.length === 0 && (
              <ScaleLine
                x1={scaleReference.x1}
                y1={scaleReference.y1}
                x2={scaleReference.x2}
                y2={scaleReference.y2}
                label={formatScaleLength(scaleReference.lengthM)}
              />
            )}
            {scaleDraft.length > 0 && (
              <ScaleLine
                x1={scaleDraft[0].x}
                y1={scaleDraft[0].y}
                x2={(scaleDraft[1] ?? scalePreview ?? scaleDraft[0]).x}
                y2={(scaleDraft[1] ?? scalePreview ?? scaleDraft[0]).y}
              />
            )}
            {marquee && (
              <Rect x={marquee.x} y={marquee.y} width={marquee.width} height={marquee.height} stroke="#3b82f6" dash={[4, 4]} fill="#3b82f622" />
            )}
            <Transformer
              ref={trRef}
              rotateEnabled
              rotationSnaps={[0, 90, 180, 270]}
              rotationSnapTolerance={46}
              boundBoxFunc={(oldBox, newBox) => (newBox.width < 8 || newBox.height < 8 ? oldBox : newBox)}
            />
          </Layer>
        </Stage>
      </div>
      {!backgroundDataUrl && (
        <div className="empty-hint">
          Importuj rzut JPG/PNG/PDF albo wczytaj projekt przykładowy,
          <br />a następnie umieść symbole z lewego panelu.
        </div>
      )}
    </div>
  );
}

function ScaleLine({
  x1,
  y1,
  x2,
  y2,
  label,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
}) {
  return (
    <>
      <Line points={[x1, y1, x2, y2]} stroke="#c2410c" strokeWidth={2} dash={[8, 4]} listening={false} />
      <Circle x={x1} y={y1} radius={4} fill="#c2410c" listening={false} />
      <Circle x={x2} y={y2} radius={4} fill="#c2410c" listening={false} />
      {label && (
        <Text
          x={(x1 + x2) / 2 + 6}
          y={(y1 + y2) / 2 - 14}
          text={label}
          fill="#c2410c"
          fontSize={13}
          listening={false}
        />
      )}
    </>
  );
}

function CableShape({
  el,
  selected,
  locked,
  tool,
  snap,
  onRef,
}: {
  el: Extract<OverlayElement, { type: "cable" }>;
  selected: boolean;
  locked: boolean;
  tool: string;
  snap: boolean;
  onRef: (node: Konva.Line | null) => void;
}) {
  return (
    <>
      <Line
        ref={(node) => {
          if (node) node.setAttr("epType", "cable");
          onRef(node);
        }}
        points={polylineToFlat(el.points)}
        stroke={el.color}
        strokeWidth={el.width}
        dash={el.style === "dashed" ? [12, 8] : undefined}
        hitStrokeWidth={16}
        lineCap="round"
        lineJoin="round"
        onClick={(e) => {
          e.cancelBubble = true;
          if (locked || tool !== "select") return;
          selectIds([el.id], e.evt.shiftKey);
        }}
      />
      {el.name && el.points[0] && (
        <Text x={el.points[0].x + 8} y={el.points[0].y - 16} text={el.name} fill={el.color} fontSize={13} listening={false} />
      )}
      {selected && !locked &&
        el.points.map((point, index) => (
          <Circle
            key={index}
            x={point.x}
            y={point.y}
            radius={6}
            fill="#fff"
            stroke={el.color}
            draggable
            onDragEnd={(e) => {
              const pos = snapPoint({ x: e.target.x(), y: e.target.y() }, snap);
              const points = el.points.map((p, i) => (i === index ? pos : p));
              commitCablePoints(el.id, points);
            }}
          />
        ))}
    </>
  );
}
