import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Timeline.css';

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 30;
const ZOOM_SPEED = 0.0015;

const YEAR_START = 1150;
const YEAR_END = 2050;
const PX_PER_YEAR = 10;

const EVENTS_APPEAR = 0.55;
const ERA_ICONS_HIDE = 0.45;
const FOCUS_ZOOM = 2.5;      // event takes over as page
const BLOB_ZOOM = 4;          // blobs are visible
const BLOB_DETAIL_ZOOM = 7;   // zooming into a blob shows its content

const NODE_HEIGHT = 52;
const NODE_GAP = 4;

const SPICET_META = {
  social: { label: 'Social', color: '#E74C3C', icon: 'S' },
  political: { label: 'Political', color: '#3498DB', icon: 'P' },
  interactions: { label: 'Interactions', color: '#2ECC71', icon: 'I' },
  cultural: { label: 'Cultural', color: '#9B59B6', icon: 'C' },
  economic: { label: 'Economic', color: '#F39C12', icon: 'E' },
  technology: { label: 'Technology', color: '#1ABC9C', icon: 'T' },
};

const BLOB_LAYOUT = [
  { key: 'overview', label: 'Overview', color: '#4A90D9', icon: '📖', row: 0, col: 0, colSpan: 2 },
  { key: 'social', label: 'Social', color: '#E74C3C', icon: '👥', row: 1, col: 0 },
  { key: 'political', label: 'Political', color: '#3498DB', icon: '🏛', row: 1, col: 1 },
  { key: 'interactions', label: 'Interactions', color: '#2ECC71', icon: '🌍', row: 1, col: 2 },
  { key: 'cultural', label: 'Cultural', color: '#9B59B6', icon: '🎭', row: 2, col: 0 },
  { key: 'economic', label: 'Economic', color: '#F39C12', icon: '💰', row: 2, col: 1 },
  { key: 'technology', label: 'Technology', color: '#1ABC9C', icon: '⚙', row: 2, col: 2 },
  { key: 'keyterms', label: 'Key Terms', color: '#95A5A6', icon: '🔑', row: 3, col: 0, colSpan: 2 },
  { key: 'quiz', label: 'Review Quiz', color: '#E67E22', icon: '✏', row: 3, col: 2 },
];

function assignLanes(allEvents, yearToX) {
  const sorted = [...allEvents].sort((a, b) => {
    if (a.startYear !== b.startYear) return a.startYear - b.startYear;
    return (b.endYear - b.startYear) - (a.endYear - a.startYear);
  });
  const lanesAbove = [];
  const lanesBelow = [];
  const assignments = {};
  for (const event of sorted) {
    const evLeft = yearToX(event.startYear);
    const evRight = yearToX(event.endYear);
    const padding = 10;
    let placed = false;
    for (const [side, lanes] of [['above', lanesAbove], ['below', lanesBelow]]) {
      for (let i = 0; i < lanes.length; i++) {
        if (evLeft >= lanes[i] + padding) {
          lanes[i] = evRight;
          assignments[event.id] = { lane: i, side };
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
    if (!placed) {
      if (lanesAbove.length <= lanesBelow.length) {
        lanesAbove.push(evRight);
        assignments[event.id] = { lane: lanesAbove.length - 1, side: 'above' };
      } else {
        lanesBelow.push(evRight);
        assignments[event.id] = { lane: lanesBelow.length - 1, side: 'below' };
      }
    }
  }
  return assignments;
}

export default function Timeline({ data, onStartQuiz }) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [panX, setPanX] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, panX: 0 });
  const [mouseX, setMouseX] = useState(null);
  const [hoveredEvent, setHoveredEvent] = useState(null); // track which event node the mouse is on
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 }); // mouse position for image tooltip
  const [connectionMode, setConnectionMode] = useState('cause'); // 'off' | 'cause' | 'all'

  const totalWidth = (YEAR_END - YEAR_START) * PX_PER_YEAR * zoom;

  // Clamp panX so user can't scroll past the era boundaries (1200–2001)
  const ERA_LEFT_YEAR = 1200;
  const ERA_RIGHT_YEAR = 2001;

  // Dynamic minimum zoom: era range must fill the viewport width
  const getMinZoom = () => {
    const el = containerRef.current;
    if (!el) return MIN_ZOOM;
    const cw = el.clientWidth;
    const eraWidthPerUnit = (ERA_RIGHT_YEAR - ERA_LEFT_YEAR) * PX_PER_YEAR;
    return Math.max(MIN_ZOOM, cw / eraWidthPerUnit);
  };

  const clampPanX = (px, z) => {
    const el = containerRef.current;
    if (!el) return px;
    const cw = el.clientWidth;
    const zz = z || zoom;
    const leftEdge = (ERA_LEFT_YEAR - YEAR_START) * PX_PER_YEAR * zz;
    const rightEdge = (ERA_RIGHT_YEAR - YEAR_START) * PX_PER_YEAR * zz;
    const maxPan = -leftEdge + 20;
    const minPan = cw - rightEdge - 20;
    return Math.max(minPan, Math.min(maxPan, px));
  };

  const yearToX = useCallback((year) => {
    return (year - YEAR_START) * PX_PER_YEAR * zoom;
  }, [zoom]);

  const allEvents = useMemo(() => {
    const events = [];
    for (const era of data.eras) {
      for (const event of era.events) {
        events.push({ ...event, eraId: era.id, eraTitle: era.title, eraColor: era.color });
      }
    }
    return events;
  }, [data]);

  const laneAssignments = useMemo(() => assignLanes(allEvents, yearToX), [allEvents, yearToX]);

  // Compute max lanes above/below for dynamic height
  const { maxAbove, maxBelow } = useMemo(() => {
    let above = 0, below = 0;
    for (const id of Object.keys(laneAssignments)) {
      const a = laneAssignments[id];
      if (a.side === 'above') above = Math.max(above, a.lane + 1);
      else below = Math.max(below, a.lane + 1);
    }
    return { maxAbove: above, maxBelow: below };
  }, [laneAssignments]);

  const neededHeight = (maxAbove + maxBelow) * (NODE_HEIGHT + NODE_GAP) + 120; // 120 for timeline bar + padding

  // Blend values
  const eventBlend = Math.min(1, Math.max(0, (zoom - EVENTS_APPEAR * 0.6) / (EVENTS_APPEAR * 0.8)));
  const eraIconFade = Math.max(0, 1 - (zoom - ERA_ICONS_HIDE * 0.5) / (ERA_ICONS_HIDE * 0.8));
  const focusBlend = Math.min(1, Math.max(0, (zoom - FOCUS_ZOOM) / (FOCUS_ZOOM * 0.6)));
  const inFocusMode = focusBlend > 0.05;
  const blobBlend = Math.min(1, Math.max(0, (zoom - BLOB_ZOOM) / (BLOB_ZOOM * 0.4)));
  const blobDetailBlend = Math.min(1, Math.max(0, (zoom - BLOB_DETAIL_ZOOM) / (BLOB_DETAIL_ZOOM * 0.4)));
  const inBlobDetail = blobDetailBlend > 0.1;

  // Focused event — use mouse position if available, otherwise viewport center
  // Lock the focused event once we enter focus mode so it doesn't jump
  const [lockedEvent, setLockedEvent] = useState(null);

  const nearestEvent = useMemo(() => {
    if (!containerRef.current) return null;
    const el = containerRef.current;
    const cw = el.clientWidth;
    // Use mouse position if available, otherwise viewport center
    const refX = mouseX !== null ? mouseX : cw / 2;
    const worldX = (refX - panX) / zoom;
    let closest = null;
    let closestDist = Infinity;
    for (const event of allEvents) {
      const evStart = (event.startYear - YEAR_START) * PX_PER_YEAR;
      const evEnd = (event.endYear - YEAR_START) * PX_PER_YEAR;
      // Distance: 0 if mouse is within the event's range, otherwise distance to nearest edge
      const dist = worldX < evStart ? evStart - worldX : worldX > evEnd ? worldX - evEnd : 0;
      if (dist < closestDist) { closestDist = dist; closest = event; }
    }
    return closest;
  }, [allEvents, panX, zoom, mouseX]);

  // Lock the event when entering focus mode — prefer hovered event
  useEffect(() => {
    if (!inFocusMode) {
      setLockedEvent(null);
    } else if (!lockedEvent) {
      setLockedEvent(hoveredEvent || nearestEvent);
    }
  }, [inFocusMode, nearestEvent, lockedEvent, hoveredEvent]);

  const focusedEvent = lockedEvent || hoveredEvent || nearestEvent;

  // Which blob is focused — locks in on hover so it persists when zooming in
  const [hoveredBlob, setHoveredBlob] = useState(null);
  const [lockedBlob, setLockedBlob] = useState('overview');

  // When user hovers a blob, lock it in
  useEffect(() => {
    if (hoveredBlob) setLockedBlob(hoveredBlob);
  }, [hoveredBlob]);

  // Reset locked blob when leaving focus mode
  useEffect(() => {
    if (!inFocusMode) setLockedBlob('overview');
  }, [inFocusMode]);

  const focusedBlob = inBlobDetail ? lockedBlob : null;

  // Scroll wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      setMouseX(cursorX);
      const worldX = (cursorX - panX) / zoom;
      const delta = -e.deltaY * ZOOM_SPEED;
      const minZ = getMinZoom();
      const newZoom = Math.min(MAX_ZOOM, Math.max(minZ, zoom + delta * zoom));
      setPanX(clampPanX(cursorX - worldX * newZoom, newZoom));
      setZoom(newZoom);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [zoom, panX]);

  // Left click OR middle click = pan (works everywhere on the canvas)
  const dragStartRef = useRef(null);
  const handleMouseDown = (e) => {
    if (inFocusMode) return; // no panning in focus/blob view
    if (e.button === 1) e.preventDefault();
    if (e.button === 0 || e.button === 1) {
      dragStartRef.current = { x: e.clientX, panX, moved: false };
      setPanStart({ x: e.clientX, panX });
    }
  };
  const handleMouseMove = (e) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMouseX(e.clientX - rect.left);
    }
    if (!inFocusMode && dragStartRef.current) {
      const dx = Math.abs(e.clientX - dragStartRef.current.x);
      if (dx > 3) {
        dragStartRef.current.moved = true;
        setIsPanning(true);
      }
      if (isPanning) setPanX(clampPanX(dragStartRef.current.panX + (e.clientX - dragStartRef.current.x)));
    }
  };
  const handleMouseUp = (e) => {
    if (e.button === 0 || e.button === 1) {
      setIsPanning(false);
      dragStartRef.current = null;
    }
  };

  useEffect(() => {
    if (isPanning) {
      const up = () => { setIsPanning(false); dragStartRef.current = null; };
      window.addEventListener('mouseup', up);
      return () => window.removeEventListener('mouseup', up);
    }
  }, [isPanning]);

  // Touch support: single finger = pan, two fingers = pinch zoom, double-tap = enter
  const touchRef = useRef({ lastTap: 0, startDist: 0, startZoom: 1, startPanX: 0, startX: 0, panning: false });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getTouchDist = (t) => Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);
    const getTouchMidX = (t) => (t[0].clientX + t[1].clientX) / 2;

    const onTouchStart = (e) => {
      const tr = touchRef.current;
      if (e.touches.length === 1) {
        const now = Date.now();
        const touch = e.touches[0];
        // Double-tap detection
        if (now - tr.lastTap < 300) {
          e.preventDefault();
          // Find what's under the tap
          const target = document.elementFromPoint(touch.clientX, touch.clientY);
          if (target) target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: touch.clientX, clientY: touch.clientY }));
          tr.lastTap = 0;
          return;
        }
        tr.lastTap = now;
        // Single finger pan
        if (!inFocusMode) {
          tr.startX = touch.clientX;
          tr.startPanX = panX;
          tr.panning = true;
        }
      } else if (e.touches.length === 2) {
        e.preventDefault();
        tr.panning = false;
        tr.startDist = getTouchDist(e.touches);
        tr.startZoom = zoom;
        tr.startPanX = panX;
        tr.midX = getTouchMidX(e.touches);
      }
    };

    const onTouchMove = (e) => {
      const tr = touchRef.current;
      if (e.touches.length === 1 && tr.panning && !inFocusMode) {
        e.preventDefault();
        const dx = e.touches[0].clientX - tr.startX;
        setPanX(clampPanX(tr.startPanX + dx));
        if (Math.abs(dx) > 5) setIsPanning(true);
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e.touches);
        const scale = dist / tr.startDist;
        const rect = el.getBoundingClientRect();
        const midX = getTouchMidX(e.touches) - rect.left;
        const worldX = (midX - tr.startPanX) / tr.startZoom;
        const minZ = getMinZoom();
        const newZoom = Math.min(MAX_ZOOM, Math.max(minZ, tr.startZoom * scale));
        setPanX(clampPanX(midX - worldX * newZoom, newZoom));
        setZoom(newZoom);
      }
    };

    const onTouchEnd = (e) => {
      touchRef.current.panning = false;
      setIsPanning(false);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [zoom, panX, inFocusMode]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const timer = requestAnimationFrame(() => {
      const cw = el.clientWidth;
      const totalRange = (YEAR_END - YEAR_START) * PX_PER_YEAR;
      const minZ = getMinZoom();
      const fitZoom = Math.max(minZ, Math.min(1.5, (cw - 80) / totalRange));
      const midX = ((ERA_LEFT_YEAR + ERA_RIGHT_YEAR) / 2 - YEAR_START) * PX_PER_YEAR * fitZoom;
      setZoom(fitZoom); setPanX(clampPanX(cw / 2 - midX, fitZoom));
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  const zoomAtCenter = useCallback((factor) => {
    const el = containerRef.current;
    if (!el) return;
    const cx = el.clientWidth / 2;
    const worldX = (cx - panX) / zoom;
    const nz = Math.min(MAX_ZOOM, Math.max(getMinZoom(), zoom * factor));
    setPanX(clampPanX(cx - worldX * nz, nz)); setZoom(nz);
  }, [zoom, panX]);

  // Zoom to center on a year range at a target zoom level
  const zoomToRange = useCallback((startYear, endYear, targetZoom) => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const midYearWorld = ((startYear + endYear) / 2 - YEAR_START) * PX_PER_YEAR;
    const newPanX = cw / 2 - midYearWorld * targetZoom;
    setZoom(targetZoom);
    setPanX(clampPanX(newPanX, targetZoom));
  }, []);

  const zoomLabel = inBlobDetail ? 'Reading' : inFocusMode ? 'Focus' : eventBlend < 0.3 ? 'Eras' : 'Events';

  // Get blob content for focused event
  const getBlobContent = (blobKey, event) => {
    if (!event) return null;
    if (blobKey === 'overview') return event.summary;
    if (blobKey === 'keyterms') return event.keyTerms;
    if (blobKey === 'quiz') return event.quiz;
    return event.spiceT?.[blobKey] || null;
  };

  return (
    <div className="timeline-wrapper">
      <div className="timeline-toolbar">
        <div className="toolbar-left">
          <span className="toolbar-label">AP World History Timeline</span>
          <span className="toolbar-hint">
            {inBlobDetail ? 'Scroll out to see other sections'
              : inFocusMode ? 'Scroll out to return to timeline'
              : 'Scroll to zoom | Drag to pan | Double-click to enter'}
          </span>
        </div>
        <div className="toolbar-right">
          <span className="zoom-level-label">{zoomLabel}</span>
          <button className="zoom-btn" onClick={() => zoomAtCenter(0.7)}>−</button>
          <span className="zoom-display">{Math.round(zoom * 100)}%</span>
          <button className="zoom-btn" onClick={() => zoomAtCenter(1.4)}>+</button>
          <div className="conn-toggle">
            {['off', 'cause', 'all'].map(mode => (
              <button
                key={mode}
                className={`conn-btn ${connectionMode === mode ? 'active' : ''}`}
                onClick={() => setConnectionMode(mode)}
                title={mode === 'off' ? 'Hide connections' : mode === 'cause' ? 'Cause & effect' : 'All connections'}
              >
                {mode === 'off' ? '—' : mode === 'cause' ? '→' : '⇄'}
              </button>
            ))}
          </div>
          <button className="zoom-btn reset" onClick={() => {
            const el = containerRef.current;
            if (!el) return;
            const cw = el.clientWidth;
            const totalRange = (YEAR_END - YEAR_START) * PX_PER_YEAR;
            const minZ = getMinZoom();
            const fitZoom = Math.max(minZ, Math.min(1.5, (cw - 80) / totalRange));
            const midX = ((ERA_LEFT_YEAR + ERA_RIGHT_YEAR) / 2 - YEAR_START) * PX_PER_YEAR * fitZoom;
            setZoom(fitZoom); setPanX(clampPanX(cw / 2 - midX, fitZoom));
          }}>Reset</button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`timeline-canvas ${isPanning ? 'panning' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* === TIMELINE LAYER === */}
        <div
          className="timeline-inner"
          style={{
            transform: `translateX(${panX}px)`, width: totalWidth,
            minHeight: `${neededHeight}px`,
            opacity: inFocusMode ? Math.max(0.05, 1 - focusBlend * 0.95) : 1,
            pointerEvents: focusBlend > 0.5 ? 'none' : 'auto',
          }}
        >
          <div className="timeline-bg" style={{ width: totalWidth }}>
            {generateYearMarkers(zoom).map((year) => (
              <div key={year} className="year-marker" style={{ left: yearToX(year) }}>
                <div className="year-line" />
                <span className="year-label">{year}</span>
              </div>
            ))}
          </div>
          <div className="timeline-axis" style={{ width: totalWidth }} />

          {data.eras.map((era) => {
            const left = yearToX(era.startYear);
            const width = yearToX(era.endYear) - left;
            const bandOpacity = 0.12 + (1 - eventBlend) * 0.12;
            return (
              <div key={era.id} className="era-span-group">
                <div
                  className="era-band"
                  style={{ left, width, background: era.color, opacity: bandOpacity }}
                  onDoubleClick={(e) => { e.stopPropagation(); zoomToRange(era.startYear, era.endYear, EVENTS_APPEAR + 0.3); }}
                />
                {eventBlend < 0.95 && (
                  <div
                    className="era-band-label"
                    style={{ left: left + width / 2, opacity: 1 - eventBlend, pointerEvents: 'auto', cursor: 'pointer' }}
                    onDoubleClick={(e) => { e.stopPropagation(); zoomToRange(era.startYear, era.endYear, EVENTS_APPEAR + 0.3); }}
                  >
                    {era.image && eraIconFade > 0.05 && (
                      <div className="era-band-icon" style={{ borderColor: era.color, opacity: eraIconFade }}>
                        <img src={era.image} alt={era.title} />
                      </div>
                    )}
                    <div className="era-band-title" style={{ color: era.color }}>{era.title}</div>
                    <div className="era-band-dates">c. {era.startYear}–{era.endYear}</div>
                  </div>
                )}
                {eventBlend > 0.3 && (
                  <div className="era-bg-label" style={{ left: left + width / 2, opacity: eventBlend * 0.12, color: era.color }}>{era.title}</div>
                )}
                <AnimatePresence>
                  {eventBlend > 0.1 && era.events.map((event) => {
                    const evLeft = yearToX(event.startYear);
                    const evWidth = Math.max(100, yearToX(event.endYear) - evLeft);
                    const assignment = laneAssignments[event.id] || { lane: 0, side: 'above' };
                    const laneOffset = assignment.lane * (NODE_HEIGHT + NODE_GAP);
                    const isFocused = focusedEvent?.id === event.id && inFocusMode;
                    // Compute how much the node is clipped off the left edge of the viewport
                    const clippedLeft = Math.max(0, -panX - evLeft);
                    // Also compute clipping on the right edge
                    const viewportWidth = containerRef.current?.clientWidth || 800;
                    const clippedRight = Math.max(0, (evLeft + evWidth) - (viewportWidth - panX));
                    const textInset = Math.min(clippedLeft, evWidth - 120); // don't push text past the node
                    return (
                      <motion.div
                        key={event.id}
                        className={`event-node-h ${assignment.side === 'above' ? 'above' : 'below'}`}
                        style={{
                          left: evLeft, width: evWidth, borderColor: event.color,
                          '--lane-offset': `${laneOffset}px`,
                          opacity: isFocused ? Math.max(0, 1 - focusBlend) : Math.min(1, eventBlend * 1.5),
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => { setHoveredEvent(event); setHoverPos({ x: e.clientX, y: e.clientY }); }}
                        onMouseMove={(e) => { if (hoveredEvent?.id === event.id) setHoverPos({ x: e.clientX, y: e.clientY }); }}
                        onMouseLeave={() => setHoveredEvent(null)}
                        onDoubleClick={(e) => { e.stopPropagation(); setLockedEvent(event); zoomToRange(event.startYear, event.endYear, 4.5); }}
                        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="event-color-bar" style={{ background: event.color }} />
                        <div className="event-header-row" style={{ marginLeft: textInset > 5 ? textInset : 0 }}>
                          {event.image && (
                            <div className="event-image" style={{ borderColor: event.color }}><img src={event.image} alt={event.title} /></div>
                          )}
                          <div className="event-header-text">
                            <div className="event-node-title">{event.title}</div>
                            <div className="event-node-dates">{event.startYear}–{event.endYear}</div>
                          </div>
                        </div>
                        <div className={`event-connector ${assignment.side === 'above' ? 'conn-below' : 'conn-above'}`} style={{ background: event.color }} />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            );
          })}

          {/* === CONNECTION LINES SVG === */}
          {connectionMode !== 'off' && eventBlend > 0.2 && !inFocusMode && data.connections && (() => {
            const containerH = containerRef.current?.clientHeight || 600;
            const midY = containerH / 2;
            const themeColors = {
              social: '#E74C3C', political: '#3498DB', interactions: '#2ECC71',
              cultural: '#9B59B6', economic: '#F39C12', technology: '#1ABC9C',
            };

            const filteredConns = data.connections.filter(conn =>
              connectionMode === 'all' || conn.type === 'cause-effect'
            );

            return (
              <svg className="connections-svg" style={{ opacity: Math.min(1, eventBlend * 1.5) }}>
                <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="var(--text-muted)" opacity="0.7" />
                  </marker>
                </defs>
                {filteredConns.map((conn, i) => {
                  const fromEvent = allEvents.find(e => e.id === conn.from);
                  const toEvent = allEvents.find(e => e.id === conn.to);
                  if (!fromEvent || !toEvent) return null;

                  const fromAssign = laneAssignments[fromEvent.id] || { lane: 0, side: 'above' };
                  const toAssign = laneAssignments[toEvent.id] || { lane: 0, side: 'above' };

                  // X: center of each node
                  const fromX = yearToX((fromEvent.startYear + fromEvent.endYear) / 2);
                  const toX = yearToX((toEvent.startYear + toEvent.endYear) / 2);

                  // Y: center of node
                  const fromLaneOff = fromAssign.lane * (NODE_HEIGHT + NODE_GAP);
                  const toLaneOff = toAssign.lane * (NODE_HEIGHT + NODE_GAP);
                  const fromY = fromAssign.side === 'above'
                    ? midY - 24 - fromLaneOff - NODE_HEIGHT / 2
                    : midY + 24 + fromLaneOff + NODE_HEIGHT / 2;
                  const toY = toAssign.side === 'above'
                    ? midY - 24 - toLaneOff - NODE_HEIGHT / 2
                    : midY + 24 + toLaneOff + NODE_HEIGHT / 2;

                  // Is this connection highlighted (hovered node is source or target)?
                  const isHighlighted = hoveredEvent && (hoveredEvent.id === conn.from || hoveredEvent.id === conn.to);

                  // Bezier: arc away from nodes
                  const ctrlMidX = (fromX + toX) / 2;
                  const xDist = Math.abs(toX - fromX);
                  const bothAbove = fromAssign.side === 'above' && toAssign.side === 'above';
                  const bothBelow = fromAssign.side === 'below' && toAssign.side === 'below';
                  const arcStrength = 50 + xDist * 0.05;
                  let ctrlY;
                  if (bothAbove) {
                    ctrlY = Math.min(fromY, toY) - arcStrength;
                  } else if (bothBelow) {
                    ctrlY = Math.max(fromY, toY) + arcStrength;
                  } else {
                    ctrlY = Math.min(fromY, toY) - arcStrength;
                  }

                  const isCause = conn.type === 'cause-effect';
                  const strokeColor = isCause
                    ? (fromEvent.color || '#888')
                    : (themeColors[conn.theme] || '#888');

                  // Dim non-highlighted lines when hovering a node
                  const hasHover = hoveredEvent !== null;
                  const baseOpacity = isCause ? 0.35 : 0.2;
                  const opacity = hasHover
                    ? (isHighlighted ? 0.85 : 0.08)
                    : baseOpacity;
                  const strokeWidth = hasHover && isHighlighted
                    ? (isCause ? 2.5 : 2)
                    : (isCause ? 1.5 : 1);

                  const labelY = bothBelow ? ctrlY + 14 : ctrlY - 8;

                  return (
                    <g key={`conn-${i}`} className={`connection-line ${isHighlighted ? 'highlighted' : ''}`}>
                      <path
                        d={`M ${fromX} ${fromY} Q ${ctrlMidX} ${ctrlY} ${toX} ${toY}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={isCause ? 'none' : '6 4'}
                        opacity={opacity}
                        markerEnd={isCause ? 'url(#arrowhead)' : undefined}
                      />
                      {/* Label only when highlighted */}
                      {conn.label && isHighlighted && (
                        <text
                          x={ctrlMidX}
                          y={labelY}
                          textAnchor="middle"
                          className="connection-label"
                          fill={strokeColor}
                        >
                          {conn.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            );
          })()}
        </div>

        {/* === FOCUS PAGE with BLOBS === */}
        <AnimatePresence>
          {inFocusMode && focusedEvent && (
            <motion.div
              className="focus-page"
              initial={{ opacity: 0 }}
              animate={{ opacity: focusBlend }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Event header — always visible in focus */}
              <div className="focus-header-bar" style={{ borderBottomColor: focusedEvent.color }}>
                <div className="focus-era-tag" style={{ color: focusedEvent.eraColor }}>{focusedEvent.eraTitle}</div>
                <div className="focus-title-row">
                  {focusedEvent.hoverImage ? (
                    <div className="focus-hero-thumb" style={{ borderColor: focusedEvent.color }}>
                      <img src={focusedEvent.hoverImage} alt={focusedEvent.title} onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
                    </div>
                  ) : focusedEvent.image ? (
                    <div className="focus-icon" style={{ borderColor: focusedEvent.color }}>
                      <img src={focusedEvent.image} alt={focusedEvent.title} />
                    </div>
                  ) : null}
                  <div>
                    <h2 className="focus-title">{focusedEvent.title}</h2>
                    <div className="focus-dates" style={{ color: focusedEvent.color }}>{focusedEvent.startYear} – {focusedEvent.endYear}</div>
                  </div>
                </div>
              </div>

              {/* Blob grid — visible when not zoomed into a specific blob */}
              <div className="blob-container" style={{ opacity: 1 - blobDetailBlend }}>
                <div className="blob-grid">
                  {BLOB_LAYOUT.map((blob) => {
                    // Skip quiz blob if no quiz
                    if (blob.key === 'quiz' && (!focusedEvent.quiz || focusedEvent.quiz.length === 0)) return null;
                    if (blob.key === 'keyterms' && !focusedEvent.keyTerms) return null;

                    const content = getBlobContent(blob.key, focusedEvent);
                    const isHovered = hoveredBlob === blob.key;

                    return (
                      <div
                        key={blob.key}
                        className={`blob ${isHovered ? 'hovered' : ''}`}
                        style={{
                          gridRow: blob.row + 1,
                          gridColumn: blob.colSpan ? `${blob.col + 1} / span ${blob.colSpan}` : blob.col + 1,
                          borderColor: isHovered ? blob.color : 'var(--border)',
                          '--blob-color': blob.color,
                          cursor: 'pointer',
                        }}
                        onMouseEnter={() => setHoveredBlob(blob.key)}
                        onMouseLeave={() => setHoveredBlob(null)}
                        onClick={() => { setLockedBlob(blob.key); setZoom(14); }}
                      >
                        <div className="blob-icon">{blob.icon}</div>
                        <div className="blob-label" style={{ color: blob.color }}>{blob.label}</div>
                        {blob.key === 'overview' && (
                          <div className="blob-preview">{typeof content === 'string' ? content.slice(0, 80) + '...' : ''}</div>
                        )}
                        {blob.key === 'quiz' && content && (
                          <div className="blob-preview">{content.length} questions</div>
                        )}
                        {blob.key === 'keyterms' && content && (
                          <div className="blob-preview">{content.length} terms</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="blob-hint">
                  Click a section or zoom in to read more |{' '}
                  <button className="blob-back-link" onClick={() => {
                    const el = containerRef.current;
                    if (!el) return;
                    const cw = el.clientWidth;
                    const totalRange = (YEAR_END - YEAR_START) * PX_PER_YEAR;
                    const minZ = getMinZoom();
                    const fitZoom = Math.max(minZ, Math.min(1.5, (cw - 80) / totalRange));
                    const midX = ((ERA_LEFT_YEAR + ERA_RIGHT_YEAR) / 2 - YEAR_START) * PX_PER_YEAR * fitZoom;
                    setZoom(fitZoom); setPanX(clampPanX(cw / 2 - midX, fitZoom));
                  }}>Back to timeline</button>
                </div>
              </div>

              {/* Blob detail — full content of the focused blob */}
              <AnimatePresence>
                {inBlobDetail && focusedBlob && focusedEvent && (
                  <motion.div
                    className="blob-detail-page"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: blobDetailBlend }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="blob-detail-content">
                      {(() => {
                        const blob = BLOB_LAYOUT.find(b => b.key === focusedBlob);
                        if (!blob) return null;
                        const content = getBlobContent(focusedBlob, focusedEvent);

                        return (
                          <>
                            <div className="blob-detail-header">
                              <span className="blob-detail-icon">{blob.icon}</span>
                              <span className="blob-detail-title" style={{ color: blob.color }}>{blob.label}</span>
                            </div>

                            {focusedBlob === 'overview' && (
                              <p className="blob-detail-text">{content}</p>
                            )}

                            {focusedBlob === 'keyterms' && Array.isArray(content) && (
                              <div className="blob-detail-terms">
                                {content.map(t => <span key={t} className="blob-term">{t}</span>)}
                              </div>
                            )}

                            {focusedBlob === 'quiz' && Array.isArray(content) && (
                              <div className="blob-detail-quiz">
                                <p className="blob-detail-text">{content.length} AP-style multiple choice questions covering this event.</p>
                                <button className="blob-quiz-btn" onClick={() => onStartQuiz(focusedEvent)}>
                                  Start Review — {content.length} Questions
                                </button>
                              </div>
                            )}

                            {/* SPICE-T theme content */}
                            {SPICET_META[focusedBlob] && typeof content === 'string' && (
                              <p className="blob-detail-text">{content}</p>
                            )}

                            <button className="blob-back-btn" onClick={() => setZoom(BLOB_ZOOM + 1)}>
                              ← Back to sections
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edge fade overlays — show when near boundaries */}
        {!inFocusMode && (
          <>
            {(() => {
              const leftEdgePx = (ERA_LEFT_YEAR - YEAR_START) * PX_PER_YEAR * zoom + panX;
              const rightEdgePx = (ERA_RIGHT_YEAR - YEAR_START) * PX_PER_YEAR * zoom + panX;
              const cw = containerRef.current?.clientWidth || 800;
              const showLeft = leftEdgePx > -40;
              const showRight = rightEdgePx < cw + 40;
              return (
                <>
                  {showLeft && (
                    <div className="timeline-edge-fade left" style={{ left: Math.min(leftEdgePx, 0) }} />
                  )}
                  {showRight && (
                    <div className="timeline-edge-fade right" style={{ right: Math.min(cw - rightEdgePx, 0) }} />
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>

      {/* Hover image tooltip */}
      <AnimatePresence>
        {hoveredEvent?.hoverImage && !inFocusMode && eventBlend > 0.5 && (
          <motion.div
            className="event-hover-tooltip"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            style={{
              left: hoverPos.x + 16,
              top: hoverPos.y - 120,
            }}
          >
            <img src={hoveredEvent.hoverImage} alt={hoveredEvent.title} onError={(e) => { e.target.style.display = 'none'; }} />
            <div className="event-hover-caption" style={{ borderTopColor: hoveredEvent.color }}>
              {hoveredEvent.title}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="timeline-status">
        <div className="status-dot" />
        <span>
          {inBlobDetail ? `Reading: ${BLOB_LAYOUT.find(b => b.key === focusedBlob)?.label || '...'}`
            : inFocusMode ? `Focused: ${focusedEvent?.title || '...'}`
            : eventBlend > 0.3 ? 'Zoom into an event to focus'
            : 'Zoom in to explore events'}
        </span>
        <span className="status-zoom">Zoom: {Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}

function generateYearMarkers(zoom) {
  let step;
  if (zoom < 0.3) step = 200;
  else if (zoom < 0.7) step = 100;
  else if (zoom < 1.5) step = 50;
  else if (zoom < 2.5) step = 25;
  else step = 10;
  const markers = [];
  for (let y = 1200; y <= 2050; y += step) markers.push(y);
  return markers;
}
