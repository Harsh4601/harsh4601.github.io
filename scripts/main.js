/* ============================================================
   Spatial engine — Vision Pro inspired panning canvas.
   Panels live at world coordinates; a camera (x, y, zoom)
   glides over them with parallax depth, drag/scroll/pinch
   navigation, a dock, and a minimap.
   ============================================================ */

(() => {
    'use strict';

    const FLAT = window.matchMedia('(max-width: 820px)').matches;
    const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const viewport = document.getElementById('viewport');
    const dock = document.getElementById('dock');
    const hint = document.getElementById('hint');
    const minimap = document.getElementById('minimap');
    const cursorGlow = document.getElementById('cursor-glow');
    const aurora = document.getElementById('aurora');
    const starsCanvas = document.getElementById('stars');

    /* ------------------------------------------------------------------
       Flat mode: small screens get a normal scrolling page.
       ------------------------------------------------------------------ */
    if (FLAT) {
        document.body.classList.add('flat');
        const groupFirst = {};
        document.querySelectorAll('.panel').forEach(p => {
            const g = p.dataset.group;
            if (g && !groupFirst[g]) groupFirst[g] = p;
        });
        const jumpTo = (g) => {
            const el = groupFirst[g];
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        dock.querySelectorAll('.dock-btn[data-target]').forEach(btn => {
            btn.addEventListener('click', () => jumpTo(btn.dataset.target));
        });
        document.getElementById('zoom-out-btn').addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        document.querySelectorAll('[data-jump]').forEach(btn => {
            btn.addEventListener('click', () => jumpTo(btn.dataset.jump));
        });
        return;
    }

    /* ------------------------------------------------------------------
       Panels
       ------------------------------------------------------------------ */
    const panels = [...document.querySelectorAll('.panel, .space-label')].map((el, i) => ({
        el,
        x: parseFloat(el.dataset.x) || 0,
        y: parseFloat(el.dataset.y) || 0,
        depth: parseFloat(el.dataset.depth) || 1,
        group: el.dataset.group || null,
        isLabel: el.classList.contains('space-label'),
        w: 0, h: 0,
        phase: (i * 1.7) % (Math.PI * 2),
        bobAmp: 5 + ((i * 37) % 10) * 0.7,
        tiltX: 0, tiltY: 0, targetTiltX: 0, targetTiltY: 0,
        hoverScale: 1, targetHoverScale: 1,
        intro: 0,
        introDelay: 500 + i * 70,
    }));

    const contentPanels = panels.filter(p => !p.isLabel);

    let vw = window.innerWidth;
    let vh = window.innerHeight;

    const measure = () => {
        vw = window.innerWidth;
        vh = window.innerHeight;
        panels.forEach(p => {
            p.w = p.el.offsetWidth;
            p.h = p.el.offsetHeight;
        });
    };

    /* World bounds (for camera clamping + minimap) */
    const bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const computeBounds = () => {
        bounds.minX = Math.min(...contentPanels.map(p => p.x - p.w / 2));
        bounds.maxX = Math.max(...contentPanels.map(p => p.x + p.w / 2));
        bounds.minY = Math.min(...contentPanels.map(p => p.y - p.h / 2));
        bounds.maxY = Math.max(...contentPanels.map(p => p.y + p.h / 2));
    };

    /* ------------------------------------------------------------------
       Camera
       ------------------------------------------------------------------ */
    const cam = { x: 0, y: 0, z: REDUCED_MOTION ? 1 : 0.45 };
    const target = { x: 0, y: 0, z: 1 };
    const ZOOM_MIN = 0.24, ZOOM_MAX = 1.4;

    const clampTarget = () => {
        const padX = 300, padY = 260;
        target.x = Math.max(bounds.minX - padX, Math.min(bounds.maxX + padX, target.x));
        target.y = Math.max(bounds.minY - padY, Math.min(bounds.maxY + padY, target.y));
        target.z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, target.z));
    };

    /* ------------------------------------------------------------------
       Starfield environment
       ------------------------------------------------------------------ */
    const starCtx = starsCanvas.getContext('2d');
    let stars = [];
    const initStars = () => {
        starsCanvas.width = vw;
        starsCanvas.height = vh;
        stars = [];
        const layers = [
            { count: Math.round(vw * vh / 9000), parallax: 0.06, rMax: 1.1, alpha: 0.55 },
            { count: Math.round(vw * vh / 18000), parallax: 0.13, rMax: 1.7, alpha: 0.75 },
            { count: Math.round(vw * vh / 50000), parallax: 0.22, rMax: 2.4, alpha: 1 },
        ];
        layers.forEach(l => {
            for (let i = 0; i < l.count; i++) {
                stars.push({
                    x: Math.random() * vw,
                    y: Math.random() * vh,
                    r: 0.4 + Math.random() * l.rMax,
                    a: l.alpha * (0.4 + Math.random() * 0.6),
                    parallax: l.parallax,
                    tw: Math.random() * Math.PI * 2,
                    twSpeed: 0.4 + Math.random() * 1.2,
                });
            }
        });
    };

    const drawStars = (t) => {
        starCtx.clearRect(0, 0, vw, vh);
        const time = t / 1000;
        for (const s of stars) {
            // wrap star positions as the camera pans
            let sx = (s.x - cam.x * s.parallax) % vw;
            let sy = (s.y - cam.y * s.parallax) % vh;
            if (sx < 0) sx += vw;
            if (sy < 0) sy += vh;
            const twinkle = REDUCED_MOTION ? 1 : 0.7 + 0.3 * Math.sin(s.tw + time * s.twSpeed);
            starCtx.globalAlpha = s.a * twinkle;
            starCtx.fillStyle = '#cfd8ff';
            starCtx.beginPath();
            starCtx.arc(sx, sy, s.r, 0, Math.PI * 2);
            starCtx.fill();
        }
        starCtx.globalAlpha = 1;
    };

    /* ------------------------------------------------------------------
       Render loop
       ------------------------------------------------------------------ */
    const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
    let startTime = null;

    const render = (t) => {
        if (startTime === null) startTime = t;
        const elapsed = t - startTime;
        const time = t / 1000;

        // glide camera toward target
        cam.x += (target.x - cam.x) * 0.085;
        cam.y += (target.y - cam.y) * 0.085;
        cam.z += (target.z - cam.z) * 0.07;

        drawStars(t);
        aurora.style.transform = `translate3d(${-cam.x * 0.03}px, ${-cam.y * 0.03}px, 0)`;

        for (const p of panels) {
            // intro reveal, staggered per panel
            if (p.intro < 1) {
                p.intro = REDUCED_MOTION ? 1 :
                    Math.min(1, Math.max(0, (elapsed - p.introDelay) / 900));
            }
            const introE = easeOutCubic(p.intro);

            const f = p.depth * cam.z; // parallax factor
            const bob = (REDUCED_MOTION || p.isLabel) ? 0 :
                Math.sin(time * 0.6 + p.phase) * p.bobAmp;
            const cx = (p.x - cam.x) * f + vw / 2;
            const cy = (p.y - cam.y) * f + vh / 2 + bob;

            // cull panels far outside the viewport
            const margin = Math.max(p.w, p.h) * f + 240;
            if (cx < -margin || cx > vw + margin || cy < -margin || cy > vh + margin) {
                p.el.style.visibility = 'hidden';
                continue;
            }
            p.el.style.visibility = 'visible';

            // ease hover tilt + scale
            p.tiltX += (p.targetTiltX - p.tiltX) * 0.12;
            p.tiltY += (p.targetTiltY - p.tiltY) * 0.12;
            p.hoverScale += (p.targetHoverScale - p.hoverScale) * 0.12;

            const scale = p.depth * cam.z * p.hoverScale * (0.7 + 0.3 * introE);
            let tf = `translate(${cx - p.w / 2}px, ${cy - p.h / 2}px) scale(${scale})`;
            if (!p.isLabel) {
                tf += ` perspective(1100px) rotateX(${p.tiltX}deg) rotateY(${p.tiltY}deg)`;
            }
            p.el.style.transform = tf;
            p.el.style.opacity = p.isLabel ? introE : introE;
            p.el.style.zIndex = Math.round(p.depth * 100);
        }

        drawMinimap();
        requestAnimationFrame(render);
    };

    /* ------------------------------------------------------------------
       Hover tilt (panels lean toward the cursor, visionOS-style)
       ------------------------------------------------------------------ */
    contentPanels.forEach(p => {
        p.el.addEventListener('pointermove', (e) => {
            const r = p.el.getBoundingClientRect();
            const nx = (e.clientX - r.left) / r.width - 0.5;
            const ny = (e.clientY - r.top) / r.height - 0.5;
            p.targetTiltY = nx * 5;
            p.targetTiltX = -ny * 5;
        });
        p.el.addEventListener('pointerenter', () => { p.targetHoverScale = 1.025; });
        p.el.addEventListener('pointerleave', () => {
            p.targetTiltX = 0;
            p.targetTiltY = 0;
            p.targetHoverScale = 1;
        });
    });

    /* ------------------------------------------------------------------
       Drag to pan (with inertia)
       ------------------------------------------------------------------ */
    let drag = null;
    let interacted = false;

    const dismissHint = () => {
        if (!interacted) {
            interacted = true;
            hint.classList.add('hidden');
        }
    };

    viewport.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('a, button, .panel-scroll')) return;
        drag = {
            startX: e.clientX, startY: e.clientY,
            camX: target.x, camY: target.y,
            lastX: e.clientX, lastY: e.clientY, lastT: performance.now(),
            vx: 0, vy: 0,
        };
        viewport.classList.add('dragging');
        viewport.setPointerCapture(e.pointerId);
        dismissHint();
    });

    viewport.addEventListener('pointermove', (e) => {
        if (!drag) return;
        target.x = drag.camX - (e.clientX - drag.startX) / cam.z;
        target.y = drag.camY - (e.clientY - drag.startY) / cam.z;
        const now = performance.now();
        const dt = Math.max(1, now - drag.lastT);
        drag.vx = (e.clientX - drag.lastX) / dt;
        drag.vy = (e.clientY - drag.lastY) / dt;
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        drag.lastT = now;
        clampTarget();
    });

    const endDrag = () => {
        if (!drag) return;
        if (!REDUCED_MOTION) {
            // inertia: keep gliding in the direction of the throw
            target.x -= drag.vx * 160 / cam.z;
            target.y -= drag.vy * 160 / cam.z;
            clampTarget();
        }
        drag = null;
        viewport.classList.remove('dragging');
    };
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    /* ------------------------------------------------------------------
       Wheel: two-finger scroll pans in any direction, pinch zooms
       ------------------------------------------------------------------ */
    viewport.addEventListener('wheel', (e) => {
        // let inner scrollable lists scroll natively when they can
        const sc = e.target.closest('.panel-scroll');
        if (sc && !e.ctrlKey) {
            const goingDown = e.deltaY > 0;
            const canScroll = goingDown
                ? sc.scrollTop + sc.clientHeight < sc.scrollHeight - 1
                : sc.scrollTop > 0;
            if (canScroll) return;
        }
        e.preventDefault();
        dismissHint();
        if (e.ctrlKey || e.metaKey) {
            // trackpad pinch (or ctrl+wheel) → zoom
            const d = Math.max(-30, Math.min(30, e.deltaY));
            target.z *= Math.exp(-d * 0.01);
        } else {
            target.x += e.deltaX / cam.z;
            target.y += e.deltaY / cam.z;
        }
        clampTarget();
    }, { passive: false });

    /* ------------------------------------------------------------------
       Keyboard navigation
       ------------------------------------------------------------------ */
    window.addEventListener('keydown', (e) => {
        if (e.target.matches('input, textarea')) return;
        const step = 260 / cam.z;
        switch (e.key) {
            case 'ArrowLeft': target.x -= step; break;
            case 'ArrowRight': target.x += step; break;
            case 'ArrowUp': target.y -= step; break;
            case 'ArrowDown': target.y += step; break;
            case '+': case '=': target.z *= 1.15; break;
            case '-': case '_': target.z /= 1.15; break;
            case 'Home': target.x = 0; target.y = 0; target.z = 1; break;
            default: return;
        }
        e.preventDefault();
        dismissHint();
        clampTarget();
    });

    /* ------------------------------------------------------------------
       Dock navigation — fly the camera to a panel group
       ------------------------------------------------------------------ */
    const groups = {};
    contentPanels.forEach(p => {
        if (!p.group) return;
        (groups[p.group] = groups[p.group] || []).push(p);
    });

    const flyToGroup = (name) => {
        const g = groups[name];
        if (!g || !g.length) return;
        const minX = Math.min(...g.map(p => p.x - p.w / 2));
        const maxX = Math.max(...g.map(p => p.x + p.w / 2));
        const minY = Math.min(...g.map(p => p.y - p.h / 2));
        const maxY = Math.max(...g.map(p => p.y + p.h / 2));
        target.x = (minX + maxX) / 2;
        target.y = (minY + maxY) / 2;
        const fit = Math.min(vw / (maxX - minX + 160), vh / (maxY - minY + 220));
        target.z = Math.max(ZOOM_MIN, Math.min(1, fit));
        clampTarget();
        dismissHint();
    };

    const dockButtons = [...dock.querySelectorAll('.dock-btn[data-target]')];
    dockButtons.forEach(btn => {
        btn.addEventListener('click', () => flyToGroup(btn.dataset.target));
    });

    document.getElementById('zoom-out-btn').addEventListener('click', () => {
        // overview: fit the whole world
        target.x = (bounds.minX + bounds.maxX) / 2;
        target.y = (bounds.minY + bounds.maxY) / 2;
        target.z = Math.max(ZOOM_MIN, Math.min(1,
            Math.min(vw / (bounds.maxX - bounds.minX + 300), vh / (bounds.maxY - bounds.minY + 300))));
        dismissHint();
    });

    document.querySelectorAll('[data-jump]').forEach(btn => {
        btn.addEventListener('click', () => flyToGroup(btn.dataset.jump));
    });

    // highlight the dock button for the group nearest the camera
    setInterval(() => {
        let best = null, bestD = Infinity;
        for (const name in groups) {
            const g = groups[name];
            const gx = g.reduce((s, p) => s + p.x, 0) / g.length;
            const gy = g.reduce((s, p) => s + p.y, 0) / g.length;
            const d = Math.hypot(gx - cam.x, gy - cam.y);
            if (d < bestD) { bestD = d; best = name; }
        }
        dockButtons.forEach(b => b.classList.toggle('active', b.dataset.target === best));
    }, 400);

    /* ------------------------------------------------------------------
       Minimap
       ------------------------------------------------------------------ */
    const mmCtx = minimap.getContext('2d');
    const MM_W = minimap.width, MM_H = minimap.height;
    const mmScale = () => {
        const pad = 350;
        const wW = bounds.maxX - bounds.minX + pad * 2;
        const wH = bounds.maxY - bounds.minY + pad * 2;
        return {
            s: Math.min(MM_W / wW, MM_H / wH),
            ox: bounds.minX - pad,
            oy: bounds.minY - pad,
            wW, wH,
        };
    };

    const drawMinimap = () => {
        const { s, ox, oy, wW, wH } = mmScale();
        const dx = (MM_W - wW * s) / 2;
        const dy = (MM_H - wH * s) / 2;
        mmCtx.clearRect(0, 0, MM_W, MM_H);
        // panels
        for (const p of contentPanels) {
            mmCtx.fillStyle = p.group === 'home' ? 'rgba(160,190,255,0.95)' : 'rgba(255,255,255,0.45)';
            mmCtx.fillRect(
                dx + (p.x - p.w / 2 - ox) * s,
                dy + (p.y - p.h / 2 - oy) * s,
                Math.max(2, p.w * s),
                Math.max(2, p.h * s)
            );
        }
        // viewport rect
        const viewW = vw / cam.z, viewH = vh / cam.z;
        mmCtx.strokeStyle = 'rgba(122,162,255,0.9)';
        mmCtx.lineWidth = 1.2;
        mmCtx.strokeRect(
            dx + (cam.x - viewW / 2 - ox) * s,
            dy + (cam.y - viewH / 2 - oy) * s,
            viewW * s, viewH * s
        );
    };

    minimap.addEventListener('click', (e) => {
        const r = minimap.getBoundingClientRect();
        const { s, ox, oy, wW, wH } = mmScale();
        const dx = (MM_W - wW * s) / 2;
        const dy = (MM_H - wH * s) / 2;
        target.x = (e.clientX - r.left - dx) / s + ox;
        target.y = (e.clientY - r.top - dy) / s + oy;
        clampTarget();
        dismissHint();
    });

    /* ------------------------------------------------------------------
       Cursor glow follows the pointer
       ------------------------------------------------------------------ */
    let glowX = vw / 2, glowY = vh / 2, glowTX = glowX, glowTY = glowY;
    window.addEventListener('pointermove', (e) => {
        glowTX = e.clientX;
        glowTY = e.clientY;
    });
    setInterval(() => {
        glowX += (glowTX - glowX) * 0.18;
        glowY += (glowTY - glowY) * 0.18;
        cursorGlow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0)`;
    }, 16);

    /* ------------------------------------------------------------------
       Boot
       ------------------------------------------------------------------ */
    const boot = () => {
        measure();
        computeBounds();
        initStars();
    };

    boot();
    window.addEventListener('load', boot);       // re-measure once images/fonts settle
    window.addEventListener('resize', () => {
        boot();
        clampTarget();
    });

    requestAnimationFrame(render);
})();
