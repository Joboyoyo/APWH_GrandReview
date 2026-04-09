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
  { key: 'primarysources', label: 'Primary Sources', color: '#D4AC0D', icon: '📜', row: 3, col: 0, colSpan: 3 },
  { key: 'essayprompts', label: 'SAQ / LEQ Practice', color: '#8E44AD', icon: '✍', row: 4, col: 0, colSpan: 3 },
  { key: 'keyterms', label: 'Key Terms', color: '#95A5A6', icon: '🔑', row: 5, col: 0, colSpan: 2 },
  { key: 'quiz', label: 'Review Quiz', color: '#E67E22', icon: '✏', row: 5, col: 2 },
];

const MIN_NODE_WIDTH = 100;

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
    const evNaturalRight = yearToX(event.endYear);
    // Use the same minimum width as the rendered node
    const evRight = evLeft + Math.max(MIN_NODE_WIDTH, evNaturalRight - evLeft);
    const padding = 12;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeThemeFilter, setActiveThemeFilter] = useState(null); // null or SPICE-T key
  const [searchSelectedIdx, setSearchSelectedIdx] = useState(0); // which dropdown item is highlighted
  const [keyboardSelectedIdx, setKeyboardSelectedIdx] = useState(-1); // arrow key navigation of events

  // Smooth spring animation for zoom/pan transitions
  const animRef = useRef(null);
  const animateTo = useCallback((targetZoom, targetPanX, duration = 400) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const startZoom = zoom;
    const startPanX = panX;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Ease out cubic for smooth deceleration
      const ease = 1 - Math.pow(1 - t, 3);
      const currentZoom = startZoom + (targetZoom - startZoom) * ease;
      const currentPanX = startPanX + (targetPanX - startPanX) * ease;
      setZoom(currentZoom);
      setPanX(currentPanX);
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        animRef.current = null;
      }
    };
    animRef.current = requestAnimationFrame(animate);
  }, [zoom, panX]);

  // Clean up animation on unmount
  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

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

  // Compute lanes at a fixed reference zoom so nodes don't shift when zooming
  const fixedYearToX = useCallback((year) => (year - YEAR_START) * PX_PER_YEAR, []);
  const laneAssignments = useMemo(() => assignLanes(allEvents, fixedYearToX), [allEvents, fixedYearToX]);

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

  // Lock the event when entering focus mode — prefer locked (keyboard) > hovered > nearest
  const prevInFocusRef = useRef(false);
  useEffect(() => {
    const wasInFocus = prevInFocusRef.current;
    prevInFocusRef.current = inFocusMode;

    if (!inFocusMode && wasInFocus) {
      // Only clear locked event when zooming OUT of focus mode (not during animation in)
      setLockedEvent(null);
    } else if (inFocusMode && !lockedEvent) {
      // Entering focus mode without a locked event — pick hovered or nearest
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
      // In focus mode (blob grid visible), let the page scroll naturally
      // Only capture wheel for zooming when on the timeline or in blob detail
      const focusPage = el.querySelector('.focus-page');
      if (focusPage && focusPage.scrollHeight > focusPage.clientHeight) {
        // Check if we're scrolling within the focus page and it can still scroll
        const atTop = focusPage.scrollTop <= 0 && e.deltaY < 0;
        const atBottom = focusPage.scrollTop + focusPage.clientHeight >= focusPage.scrollHeight - 1 && e.deltaY > 0;
        if (!atTop && !atBottom) {
          // Let the focus page scroll naturally
          return;
        }
      }

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
    animateTo(nz, clampPanX(cx - worldX * nz, nz), 250);
  }, [zoom, panX, animateTo]);

  // Zoom to center on a year range at a target zoom level
  const zoomToRange = useCallback((startYear, endYear, targetZoom, instant = false) => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const midYearWorld = ((startYear + endYear) / 2 - YEAR_START) * PX_PER_YEAR;
    const newPanX = clampPanX(cw / 2 - midYearWorld * targetZoom, targetZoom);
    if (instant) {
      setZoom(targetZoom);
      setPanX(newPanX);
    } else {
      animateTo(targetZoom, newPanX, 500);
    }
  }, [animateTo]);

  const zoomLabel = inBlobDetail ? 'Reading' : inFocusMode ? 'Focus' : eventBlend < 0.3 ? 'Eras' : 'Events';

  // Search & filter matching
  const hasFilter = searchQuery.trim() !== '' || activeThemeFilter !== null;
  const eventMatchesFilter = (event) => {
    if (!hasFilter) return true;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || [
      event.title, event.summary, ...(event.keyTerms || []),
      event.spiceT?.social, event.spiceT?.political, event.spiceT?.interactions,
      event.spiceT?.cultural, event.spiceT?.economic, event.spiceT?.technology,
    ].some(s => s && s.toLowerCase().includes(q));
    const matchesTheme = !activeThemeFilter || (
      event.spiceT?.[activeThemeFilter] && event.spiceT[activeThemeFilter].length > 0
    ) || (event.quiz?.some(q => q.theme === activeThemeFilter));
    return matchesSearch && matchesTheme;
  };

  const matchingEvents = useMemo(() => {
    if (!hasFilter) return null;
    return allEvents.filter(e => eventMatchesFilter(e));
  }, [searchQuery, activeThemeFilter, allEvents]);

  const matchingEventIds = useMemo(() => {
    if (!matchingEvents) return null;
    return new Set(matchingEvents.map(e => e.id));
  }, [matchingEvents]);

  // Reset selected index when results change
  useEffect(() => { setSearchSelectedIdx(0); }, [searchQuery, activeThemeFilter]);

  // Navigate to selected matching event
  const navigateToEvent = useCallback((event) => {
    if (!event) return;
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const padding = 30;
    const yearRange = (event.endYear + padding) - (event.startYear - padding);
    // Zoom to events scale (past EVENTS_APPEAR threshold so nodes are fully visible)
    const targetZoom = Math.max(EVENTS_APPEAR + 0.3, Math.min(2.0, cw / (yearRange * PX_PER_YEAR)));
    const midYearWorld = ((event.startYear + event.endYear) / 2 - YEAR_START) * PX_PER_YEAR;
    const newPanX = clampPanX(cw / 2 - midYearWorld * targetZoom, targetZoom);
    animateTo(targetZoom, newPanX, 350);
  }, [animateTo]);

  // Auto-navigate to the selected matching event when search changes
  const prevFilterRef = useRef(null);
  useEffect(() => {
    if (!matchingEvents || matchingEvents.length === 0) {
      prevFilterRef.current = null;
      return;
    }
    const filterKey = searchQuery + '|' + (activeThemeFilter || '');
    if (filterKey === prevFilterRef.current) return;
    prevFilterRef.current = filterKey;

    // Jump to the first matching event
    navigateToEvent(matchingEvents[0]);
  }, [matchingEvents]);

  // Get blob content for focused event
  // Sorted events for keyboard navigation (memoized)
  const sortedEvents = useMemo(() => [...allEvents].sort((a, b) => a.startYear - b.startYear), [allEvents]);

  // Keyboard shortcuts — use refs to avoid stale closures
  const zoomRef = useRef(zoom);
  const panXRef = useRef(panX);
  const kbIdxRef = useRef(keyboardSelectedIdx);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panXRef.current = panX; }, [panX]);
  useEffect(() => { kbIdxRef.current = keyboardSelectedIdx; }, [keyboardSelectedIdx]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        const el = containerRef.current;
        if (!el) return;
        const cw = el.clientWidth;
        const totalRange = (YEAR_END - YEAR_START) * PX_PER_YEAR;
        const minZ = cw / ((ERA_RIGHT_YEAR - ERA_LEFT_YEAR) * PX_PER_YEAR);
        const fitZoom = Math.max(minZ, Math.min(1.5, (cw - 80) / totalRange));
        const midX = ((ERA_LEFT_YEAR + ERA_RIGHT_YEAR) / 2 - YEAR_START) * PX_PER_YEAR * fitZoom;
        // Animate from current values
        const startZ = zoomRef.current;
        const startP = panXRef.current;
        const targetP = cw / 2 - midX;
        const clampedP = Math.max(cw - (ERA_RIGHT_YEAR - YEAR_START) * PX_PER_YEAR * fitZoom - 20, Math.min(-((ERA_LEFT_YEAR - YEAR_START) * PX_PER_YEAR * fitZoom) + 20, targetP));
        const duration = 500;
        const start = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const ease = 1 - Math.pow(1 - t, 3);
          setZoom(startZ + (fitZoom - startZ) * ease);
          setPanX(startP + (clampedP - startP) * ease);
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        setKeyboardSelectedIdx(-1);
        setLockedEvent(null);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const curIdx = kbIdxRef.current;
        const newIdx = Math.max(0, Math.min(sortedEvents.length - 1, curIdx + dir));
        setKeyboardSelectedIdx(newIdx);
        const event = sortedEvents[newIdx];
        if (event) {
          // Zoom to events scale and center on this event
          const el = containerRef.current;
          if (!el) return;
          const cw = el.clientWidth;
          const targetZoom = Math.max(EVENTS_APPEAR + 0.3, 1.0); // ensure events are fully visible
          const midYearWorld = ((event.startYear + event.endYear) / 2 - YEAR_START) * PX_PER_YEAR;
          const targetPanX = cw / 2 - midYearWorld * targetZoom;
          const clampedPanX = clampPanX(targetPanX, targetZoom);
          // Animate
          const startZ = zoomRef.current;
          const startP = panXRef.current;
          const duration = 300;
          const start = performance.now();
          const step = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const ease = 1 - Math.pow(1 - t, 3);
            setZoom(startZ + (targetZoom - startZ) * ease);
            setPanX(startP + (clampedPanX - startP) * ease);
            if (t < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      } else if (e.key === 'Enter' && kbIdxRef.current >= 0) {
        e.preventDefault();
        const event = sortedEvents[kbIdxRef.current];
        if (event) {
          setLockedEvent(event);
          // Zoom to focus level
          const el = containerRef.current;
          if (!el) return;
          const cw = el.clientWidth;
          const targetZoom = 4.5;
          const midYearWorld = ((event.startYear + event.endYear) / 2 - YEAR_START) * PX_PER_YEAR;
          const targetPanX = clampPanX(cw / 2 - midYearWorld * targetZoom, targetZoom);
          const startZ = zoomRef.current;
          const startP = panXRef.current;
          const duration = 500;
          const start = performance.now();
          const step = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const ease = 1 - Math.pow(1 - t, 3);
            setZoom(startZ + (targetZoom - startZ) * ease);
            setPanX(startP + (targetPanX - startP) * ease);
            if (t < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedEvents]);

  const getBlobContent = (blobKey, event) => {
    if (!event) return null;
    if (blobKey === 'overview') return event.summary;
    if (blobKey === 'keyterms') return event.keyTerms;
    if (blobKey === 'quiz') return event.quiz;
    if (blobKey === 'primarysources') return event.primarySources;
    if (blobKey === 'essayprompts') return event.essayPrompts;
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
          <div className="search-filter-group">
            <div className="search-box-wrapper">
              <div className="search-box">
                <span className="search-icon">&#x1F50D;</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (!matchingEvents || matchingEvents.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const next = Math.min(searchSelectedIdx + 1, matchingEvents.length - 1);
                      setSearchSelectedIdx(next);
                      navigateToEvent(matchingEvents[next]);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const prev = Math.max(searchSelectedIdx - 1, 0);
                      setSearchSelectedIdx(prev);
                      navigateToEvent(matchingEvents[prev]);
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      const event = matchingEvents[searchSelectedIdx];
                      if (event) {
                        setSearchQuery('');
                        setLockedEvent(event);
                        zoomToRange(event.startYear, event.endYear, 4.5);
                      }
                    } else if (e.key === 'Escape') {
                      setSearchQuery('');
                      e.target.blur();
                    }
                  }}
                />
                {searchQuery && (
                  <button className="search-clear" onClick={() => setSearchQuery('')}>&times;</button>
                )}
              </div>
              {searchQuery.trim() && matchingEvents && matchingEvents.length > 0 && matchingEvents.length <= 20 && (
                <div className="search-dropdown">
                  {matchingEvents.map((event, idx) => (
                    <button
                      key={event.id}
                      className={`search-result ${idx === searchSelectedIdx ? 'selected' : ''}`}
                      onClick={() => {
                        setSearchQuery('');
                        setLockedEvent(event);
                        zoomToRange(event.startYear, event.endYear, 4.5);
                      }}
                      onMouseEnter={() => {
                        setSearchSelectedIdx(idx);
                        navigateToEvent(event);
                      }}
                      ref={idx === searchSelectedIdx ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                    >
                      <span className="search-result-color" style={{ background: event.color }} />
                      <span className="search-result-title">{event.title}</span>
                      <span className="search-result-dates">{event.startYear}–{event.endYear}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="theme-filter-chips">
              {Object.entries(SPICET_META).map(([key, meta]) => (
                <button
                  key={key}
                  className={`theme-chip ${activeThemeFilter === key ? 'active' : ''}`}
                  style={activeThemeFilter === key ? { borderColor: meta.color, color: meta.color, background: meta.color + '20' } : {}}
                  onClick={() => setActiveThemeFilter(activeThemeFilter === key ? null : key)}
                  title={meta.label}
                >
                  {meta.icon}
                </button>
              ))}
              {hasFilter && (
                <button className="theme-chip clear-filter" onClick={() => { setSearchQuery(''); setActiveThemeFilter(null); }}>
                  Clear
                </button>
              )}
            </div>
          </div>
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
            animateTo(fitZoom, clampPanX(cw / 2 - midX, fitZoom), 500);
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
                  <div className="era-bg-label" style={{ left: left + width / 2, opacity: eventBlend * 0.12, color: era.color, transform: `translateX(${panX * 0.03}px)` }}>{era.title}</div>
                )}
                <AnimatePresence>
                  {eventBlend > 0.1 && era.events.map((event) => {
                    const evLeft = yearToX(event.startYear);
                    const evWidth = Math.max(MIN_NODE_WIDTH, yearToX(event.endYear) - evLeft);
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
                        className={`event-node-h ${assignment.side === 'above' ? 'above' : 'below'}${matchingEventIds?.has(event.id) ? ' search-match' : ''}${keyboardSelectedIdx >= 0 && sortedEvents[keyboardSelectedIdx]?.id === event.id ? ' kbd-selected' : ''}`}
                        onMouseEnter={(e) => { setHoveredEvent(event); setHoverPos({ x: e.clientX, y: e.clientY }); }}
                        onMouseMove={(e) => { if (hoveredEvent?.id === event.id) setHoverPos({ x: e.clientX, y: e.clientY }); }}
                        onMouseLeave={() => setHoveredEvent(null)}
                        onDoubleClick={(e) => { e.stopPropagation(); setLockedEvent(event); zoomToRange(event.startYear, event.endYear, 4.5); }}
                        style={{
                          ...{
                            left: evLeft, width: evWidth, borderColor: event.color,
                            '--lane-offset': `${laneOffset}px`,
                            cursor: 'pointer',
                          },
                          opacity: isFocused ? Math.max(0, 1 - focusBlend)
                            : matchingEventIds && !matchingEventIds.has(event.id)
                              ? Math.min(0.15, eventBlend * 0.3)
                              : Math.min(1, eventBlend * 1.5),
                        }}
                        initial={false}
                        exit={{ opacity: 0 }}
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
                    // Skip blobs with no data
                    if (blob.key === 'quiz' && (!focusedEvent.quiz || focusedEvent.quiz.length === 0)) return null;
                    if (blob.key === 'keyterms' && !focusedEvent.keyTerms) return null;
                    if (blob.key === 'primarysources' && (!focusedEvent.primarySources || focusedEvent.primarySources.length === 0)) return null;
                    if (blob.key === 'essayprompts' && !focusedEvent.essayPrompts) return null;

                    const content = getBlobContent(blob.key, focusedEvent);
                    const isHovered = hoveredBlob === blob.key;

                    return (
                      <motion.div
                        key={blob.key}
                        className={`blob ${isHovered ? 'hovered' : ''}`}
                        style={{
                          gridRow: blob.row + 1,
                          gridColumn: blob.colSpan ? `${blob.col + 1} / span ${blob.colSpan}` : blob.col + 1,
                          borderColor: isHovered ? blob.color : 'var(--border)',
                          '--blob-color': blob.color,
                          cursor: 'pointer',
                        }}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30, delay: blob.row * 0.06 + blob.col * 0.03 }}
                        onMouseEnter={() => setHoveredBlob(blob.key)}
                        onMouseLeave={() => setHoveredBlob(null)}
                        onClick={() => { setLockedBlob(blob.key); animateTo(14, panX, 400); }}
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
                        {blob.key === 'primarysources' && Array.isArray(content) && (
                          <div className="blob-preview">{content.length} source{content.length !== 1 ? 's' : ''}</div>
                        )}
                        {blob.key === 'essayprompts' && content && (
                          <div className="blob-preview">{(content.saq?.length || 0)} SAQ + {(content.leq?.length || 0)} LEQ</div>
                        )}
                      </motion.div>
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
                    animateTo(fitZoom, clampPanX(cw / 2 - midX, fitZoom), 500);
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

                            {focusedBlob === 'primarysources' && Array.isArray(content) && (
                              <div className="blob-detail-sources">
                                {content.map((src, idx) => (
                                  <div key={idx} className="primary-source-card">
                                    <div className="source-header">
                                      <div className="source-title">{src.title}</div>
                                      <div className="source-meta">
                                        {src.author && <span className="source-author">{src.author}</span>}
                                        {src.date && <span className="source-date">{src.date}</span>}
                                      </div>
                                    </div>
                                    <blockquote className="source-quote">{src.excerpt}</blockquote>
                                    {src.context && <div className="source-context">{src.context}</div>}
                                  </div>
                                ))}
                              </div>
                            )}

                            {focusedBlob === 'essayprompts' && content && (
                              <div className="blob-detail-essays">
                                {content.saq?.map((saq, idx) => (
                                  <div key={`saq-${idx}`} className="essay-card saq-card">
                                    <div className="essay-type-badge saq-badge">SAQ</div>
                                    <div className="essay-prompt">{saq.prompt}</div>
                                    <div className="essay-parts">
                                      {saq.parts.map((part, i) => (
                                        <div key={i} className="essay-part">{part}</div>
                                      ))}
                                    </div>
                                    <details className="essay-guidance">
                                      <summary>Guidance</summary>
                                      <p>{saq.guidance}</p>
                                    </details>
                                  </div>
                                ))}
                                {content.leq?.map((leq, idx) => (
                                  <div key={`leq-${idx}`} className="essay-card leq-card">
                                    <div className="essay-type-badge leq-badge">LEQ</div>
                                    <div className="essay-prompt">{leq.prompt}</div>
                                    <div className="essay-section">
                                      <div className="essay-section-title">Thesis Hint</div>
                                      <p className="essay-hint">{leq.thesis_hint}</p>
                                    </div>
                                    <div className="essay-section">
                                      <div className="essay-section-title">Evidence to Consider</div>
                                      <ul className="essay-evidence">
                                        {leq.evidence_suggestions.map((ev, i) => (
                                          <li key={i}>{ev}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    <details className="essay-guidance">
                                      <summary>Rubric Tips</summary>
                                      <p>{leq.rubric_tips}</p>
                                    </details>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* SPICE-T theme content */}
                            {SPICET_META[focusedBlob] && typeof content === 'string' && (
                              <p className="blob-detail-text">{content}</p>
                            )}

                            <button className="blob-back-btn" onClick={() => animateTo(BLOB_ZOOM + 1, panX, 350)}>
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
          {matchingEventIds ? `${matchingEventIds.size} of ${allEvents.length} events match`
            : inBlobDetail ? `Reading: ${BLOB_LAYOUT.find(b => b.key === focusedBlob)?.label || '...'}`
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
