/**
 * Mermaid 客户端渲染（Shadow DOM 隔离 + 缩放/平移）。
 *
 * core 会把 ```mermaid 代码块转为 <pre class="mermaid">源码</pre>；
 * 本脚本加载 mermaid 后将每个图渲染为 SVG，放入 Shadow DOM（样式双向隔离，
 * 且 CSS 变量仍可穿透继承），内含滚轮/双指缩放、拖拽平移与 +/−/重置按钮。
 *
 * 视图固定使用浅色背景：mermaid 默认主题为深色线条，在深色页面背景下不可见。
 *
 * 配置经 <script data-hulog-mermaid data-src data-theme> 传入。
 */
const scriptEl = document.querySelector("script[data-hulog-mermaid]");
const MERMAID_SRC =
  (scriptEl && scriptEl.dataset.src) ||
  "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
const MERMAID_THEME = (scriptEl && scriptEl.dataset.theme) || "default";

/** 视图内部样式（作用于 shadow root，浅色背景） */
const VIEWER_CSS = `
  :host { display: block; position: relative; }
  #stage { position: absolute; inset: 0; overflow: hidden; cursor: grab; touch-action: none; }
  #stage.grabbing { cursor: grabbing; }
  #content { position: absolute; top: 0; left: 0; transform-origin: 0 0; will-change: transform; width: 100%; }
  #content svg { display: block; max-width: none !important; height: auto; user-select: none; }
  .mz-toolbar { position: absolute; right: 8px; bottom: 8px; display: flex; gap: 4px; z-index: 2; }
  .mz-toolbar button {
    width: 26px; height: 26px; padding: 0; font-size: 14px; line-height: 1;
    border: 1px solid rgba(0, 0, 0, .15); border-radius: 6px;
    background: rgba(255, 255, 255, .9); color: #333; cursor: pointer;
  }
  .mz-toolbar button:hover { background: #fff; border-color: rgba(0, 0, 0, .3); }
`;

/** 解析 SVG viewBox → 宽高比（用于设置宿主元素高度） */
function aspectRatioOf(svg) {
  const m = /viewBox="([\d.\- ]+)"/.exec(svg);
  if (!m) return null;
  const p = m[1].trim().split(/\s+/).map(Number);
  if (p.length !== 4 || !(p[2] > 0) || !(p[3] > 0)) return null;
  return p[2] + " / " + p[3];
}

/** 为单个 SVG 创建 Shadow DOM 视图（隔离 + 缩放/平移） */
function buildViewer(svg) {
  const host = document.createElement("div");
  host.className = "mermaid-viewer";
  const ratio = aspectRatioOf(svg);
  if (ratio) host.style.setProperty("--mz-ratio", ratio);
  else host.style.height = "360px";

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = VIEWER_CSS;

  const stage = document.createElement("div");
  stage.id = "stage";
  const content = document.createElement("div");
  content.id = "content";
  content.innerHTML = svg;
  stage.appendChild(content);

  const toolbar = document.createElement("div");
  toolbar.className = "mz-toolbar";
  toolbar.innerHTML =
    '<button type="button" data-act="out" title="缩小" aria-label="缩小">−</button>' +
    '<button type="button" data-act="reset" title="重置" aria-label="重置">⟲</button>' +
    '<button type="button" data-act="in" title="放大" aria-label="放大">+</button>' +
    '<button type="button" data-act="expand" title="全屏" aria-label="全屏">⛶</button>';

  shadow.append(style, stage, toolbar);

  // ---- 缩放 / 平移 ----
  const svgEl = content.querySelector("svg");
  let iw = 800, ih = 600;
  if (svgEl) {
    const vb = svgEl.viewBox && svgEl.viewBox.baseVal;
    const rect = svgEl.getBoundingClientRect();
    iw = (vb && vb.width) || rect.width || 800;
    ih = (vb && vb.height) || rect.height || 600;
    // 固定为 viewBox 内在尺寸：使 transform 的缩放基准与实际布局一致
    svgEl.setAttribute("width", String(iw));
    svgEl.setAttribute("height", String(ih));
    svgEl.style.maxWidth = "none";
    content.style.width = iw + "px";
    content.style.height = ih + "px";
  }
  let scale = 1, tx = 0, ty = 0;
  const apply = () => {
    content.style.transform =
      "translate(" + tx + "px," + ty + "px) scale(" + scale + ")";
  };
  const fit = () => {
    const cw = stage.clientWidth, ch = stage.clientHeight;
    if (!cw || !ch) return; // 尚未布局，等待 ResizeObserver 回调
    scale = Math.min(cw / iw, ch / ih) || 1;
    tx = (cw - iw * scale) / 2;
    ty = (ch - ih * scale) / 2;
    apply();
  };
  const zoomAt = (cx, cy, factor) => {
    const ns = Math.max(0.15, Math.min(10, scale * factor));
    tx = cx - (cx - tx) * (ns / scale);
    ty = cy - (cy - ty) * (ns / scale);
    scale = ns;
    apply();
  };

  // 全屏（自定义遮罩）：切换 host 的 .expanded，并锁定页面滚动
  const expandBtn = toolbar.querySelector('[data-act="expand"]');
  const toggleExpand = () => {
    const expanded = host.classList.toggle("expanded");
    expandBtn.textContent = expanded ? "✕" : "⛶";
    expandBtn.title = expanded ? "退出全屏" : "全屏";
    expandBtn.setAttribute("aria-label", expanded ? "退出全屏" : "全屏");
    document.body.style.overflow = expanded ? "hidden" : "";
    requestAnimationFrame(fit);
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && host.classList.contains("expanded")) toggleExpand();
  });

  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }, { passive: false });

  const pointers = new Map(); // pointerId -> 舞台坐标 { x, y }
  let dragging = false, sx = 0, sy = 0;
  let pinchDist = 0, pinchMidX = 0, pinchMidY = 0;

  const stagePoint = (e) => {
    const r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const startPinch = () => {
    const a = [...pointers.values()][0];
    const b = [...pointers.values()][1];
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    pinchMidX = (a.x + b.x) / 2;
    pinchMidY = (a.y + b.y) / 2;
    dragging = false;
    stage.classList.remove("grabbing");
  };

  stage.addEventListener("pointerdown", (e) => {
    const p = stagePoint(e);
    pointers.set(e.pointerId, p);
    try { stage.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
    if (pointers.size === 2) {
      startPinch();
    } else if (pointers.size === 1) {
      dragging = true;
      sx = p.x - tx;
      sy = p.y - ty;
      stage.classList.add("grabbing");
    }
  });
  stage.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = stagePoint(e);
    pointers.set(e.pointerId, p);
    if (pointers.size === 2) {
      // 双指捏合：以两指中点为锚点缩放，并跟随中点平移
      const a = [...pointers.values()][0];
      const b = [...pointers.values()][1];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      zoomAt(pinchMidX, pinchMidY, dist / pinchDist);
      tx += midX - pinchMidX;
      ty += midY - pinchMidY;
      apply();
      pinchDist = dist;
      pinchMidX = midX;
      pinchMidY = midY;
      return;
    }
    if (!dragging) return;
    tx = p.x - sx;
    ty = p.y - sy;
    apply();
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size >= 2) {
      startPinch();
      return;
    }
    if (pointers.size === 1) {
      // 双指变单指：以剩余指针重建拖拽基准，避免跳变
      const p = [...pointers.values()][0];
      dragging = true;
      sx = p.x - tx;
      sy = p.y - ty;
      stage.classList.add("grabbing");
      return;
    }
    dragging = false;
    stage.classList.remove("grabbing");
  };
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);

  // 双击舞台切换全屏（与工具栏按钮等效）
  stage.addEventListener("dblclick", (e) => {
    e.preventDefault();
    toggleExpand();
  });

  toolbar.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const act = b.getAttribute("data-act");
    if (act === "in") zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 1.25);
    else if (act === "out") zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 1 / 1.25);
    else if (act === "expand") toggleExpand();
    else fit();
  });

  // shadow 内容渲染后再 fit（此时尺寸已可测）
  requestAnimationFrame(fit);
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(fit).observe(stage);
  } else {
    window.addEventListener("resize", fit);
  }

  return host;
}

async function main() {
  const blocks = Array.from(document.querySelectorAll(".mermaid"));
  if (blocks.length === 0) return;
  let mermaid;
  try {
    mermaid = (await import(MERMAID_SRC)).default;
  } catch (err) {
    console.error("[hulog] mermaid 加载失败", err);
    return;
  }
  mermaid.initialize({
    startOnLoad: false,
    theme: MERMAID_THEME,
    securityLevel: "strict",
  });
  let i = 0;
  for (const el of blocks) {
    const source = el.textContent || "";
    try {
      const { svg } = await mermaid.render("hulog-mermaid-" + i++, source);
      el.replaceWith(buildViewer(svg));
    } catch (err) {
      el.textContent = "Mermaid 渲染失败：" + ((err && err.message) || String(err));
    }
  }
}

void main();
