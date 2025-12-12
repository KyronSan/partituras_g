// partitura.js (versión corregida + ocultar títulos por defecto en PDF)
document.addEventListener('DOMContentLoaded', () => {

  const FIXED_ROWS = 7;
  const FIXED_COLS = 32;

  const score = document.getElementById('scoreContainer');
  const exportPdfBtn = document.getElementById('btnPdf');
  const exportEditableBtn = document.getElementById('btnEditable');
  const realImportBtn = document.getElementById('btnImport');
  const realFileInput = document.getElementById('fileInput');
  const deleteLastBtn = document.getElementById('rebuild');
  const clearAllBtn = document.getElementById('clearAll');

  const canvasWrap = document.getElementById("canvasWrap");
  const ligatureSvg = document.getElementById("ligatureSvg");

  const mobileShiftBtn = document.getElementById("mobileShiftBtn");
  const shiftIndicator = document.getElementById("shiftIndicator");

  let ligStart = null;
  let ligEnd = null;
  let isShift = false;
  const ligatures = [];

  document.addEventListener("keydown", e => {
    if (e.key === "Shift") {
      isShift = true;
      mobileShiftBtn && mobileShiftBtn.classList.add("active");
      shiftIndicator && shiftIndicator.classList.add("on");
    }
  });

  document.addEventListener("keyup", e => {
    if (e.key === "Shift") {
      isShift = false;
      mobileShiftBtn && mobileShiftBtn.classList.remove("active");
      shiftIndicator && shiftIndicator.classList.remove("on");
    }
  });

  if (mobileShiftBtn) {
    mobileShiftBtn.addEventListener("click", () => {
      isShift = !isShift;
      if (isShift) {
        mobileShiftBtn.classList.add("active");
        shiftIndicator.classList.add("on");
      } else {
        mobileShiftBtn.classList.remove("active");
        shiftIndicator.classList.remove("on");
      }
    });
  }

  function buildScore(rows = FIXED_ROWS, cols = FIXED_COLS) {
    score.innerHTML = "";
    ligatureSvg.innerHTML = "";
    ligatures.length = 0;

    for (let r = 0; r < rows; r++) {
      const tabRow = document.createElement('div');
      tabRow.className = 'tab-row';

      const titleArea = document.createElement('div');
      titleArea.className = 'title-area';

      const title = document.createElement('div');
      title.className = `title-text title-${r + 1}`;
      title.textContent = `Título ${r + 1}`;

      const hint = document.createElement('div');
      hint.className = 'title-hint';
      hint.textContent = '(Escribe aquí el título)';

      titleArea.appendChild(title);
      titleArea.appendChild(hint);
      tabRow.appendChild(titleArea);

      titleArea.addEventListener("click", () =>
        makeTitleEditable(title, hint, titleArea)
      );

      for (let i = 0; i < 6; i++) {
        const s = document.createElement('div');
        s.className = 'string';

        for (let c = 0; c < cols; c++) {
          const cell = document.createElement('div');
          cell.className = 'cell';

          cell.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (isShift) handleLigatureClick(cell);
            else openEditor(cell);
          });

          s.appendChild(cell);
        }

        tabRow.appendChild(s);
      }

      score.appendChild(tabRow);
    }
  }

  function makeTitleEditable(titleDiv, hint, wrapper) {
    const input = document.createElement('input');
    input.className = "title-input";
    input.value = titleDiv.textContent;

    wrapper.innerHTML = "";
    wrapper.appendChild(input);
    wrapper.appendChild(hint);

    input.focus();
    input.select();

    input.addEventListener("input", () => {
      hint.style.opacity = input.value.trim() === "" ? 1 : 0;
    });

    input.addEventListener("blur", () => {
      const val = input.value.trim();
      const newTitle = document.createElement("div");
      newTitle.className = "title-text";
      newTitle.textContent = val || "Título";

      wrapper.innerHTML = "";
      wrapper.appendChild(newTitle);
      wrapper.appendChild(hint);

      wrapper.addEventListener("click", () =>
        makeTitleEditable(newTitle, hint, wrapper)
      );
    });
  }

  function openEditor(cell) {
    if (cell.querySelector("input")) return;

    const prev = cell.dataset.value ?? "";
    cell.innerHTML = "";

    const inp = document.createElement("input");
    inp.type = "text";
    inp.maxLength = 4;
    inp.value = prev;

    cell.appendChild(inp);
    inp.focus();
    inp.select();

    inp.addEventListener("keydown", e => {
      if (e.key === "Escape" || e.key === "Enter") inp.blur();
      if (/^[a-zA-Z0-9]$/.test(e.key)) return;
      if (["Backspace","Delete","ArrowLeft","ArrowRight","Tab"].includes(e.key)) return;
      e.preventDefault();
    });

    inp.addEventListener("blur", () => {
      const v = inp.value.trim();
      if (v === "") deleteCell(cell);
      else setCellValue(cell, v);
    });
  }

  function setCellValue(cell, value) {
    const bigEmojis = ["𝄞", "𝄢", "𝄡", "↑", "↓"];
    const bigEmojis2 = ["✕","DoM","ReM","MiM","FaM","SolM","LaM","SiM",
      "Dom","Rem","Mim","Fam","Solm","Lam","Sim",
      "Do7","Re7","Mi7","Fa7","Sol7","La7","Si7"
    ];

    cell.dataset.value = value;
    cell.textContent = value;

    if (bigEmojis.includes(value)) {
      cell.classList.add("big-emoji");
      cell.classList.remove("big-emoji2");

    } else if (bigEmojis2.includes(value)) {
      cell.classList.add("big-emoji2");
      cell.classList.remove("big-emoji");

    } else {
      cell.classList.remove("big-emoji");
      cell.classList.remove("big-emoji2");
    }
  }

  function deleteCell(cell) {
    delete cell.dataset.value;
    cell.textContent = "";
  }

  function handleLigatureClick(cell) {
    if (!ligStart) {
      ligStart = cell;
      cell.classList.add("lig-start-select");
    } else {
      ligEnd = cell;
      createLigature(ligStart, ligEnd);
      ligStart.classList.remove("lig-start-select");
      ligStart = null;
      ligEnd = null;
    }
  }

  function createLigature(cellA, cellB) {
    const wrapRect = canvasWrap.getBoundingClientRect();
    const rectA = cellA.getBoundingClientRect();
    const rectB = cellB.getBoundingClientRect();

    const x1 = rectA.left + rectA.width/2 - wrapRect.left;
    const y1 = rectA.top + rectA.height/2 - wrapRect.top;

    const x2 = rectB.left + rectB.width/2 - wrapRect.left;
    const y2 = rectB.top + rectB.height/2 - wrapRect.top;

    const offset = 25;
    const midY = Math.min(y1, y2) - offset;

    const path = document.createElementNS("http://www.w3.org/2000/svg","path");
    path.setAttribute("d", `M${x1},${y1} Q ${(x1+x2)/2},${midY} ${x2},${y2}`);
    path.setAttribute("stroke","#ffd166");
    path.setAttribute("stroke-width","3");
    path.setAttribute("fill","none");

    ligatureSvg.appendChild(path);
    ligatures.push(path);
  }

  deleteLastBtn.addEventListener("click", () => {
    const last = ligatures.pop();
    if (last) last.remove();
  });

  clearAllBtn.addEventListener("click", () => {
    if (!confirm("¿Borrar todo?")) return;
    document.querySelectorAll(".cell").forEach(deleteCell);
    ligatureSvg.innerHTML = "";
    ligatures.length = 0;
  });

  /* -------------------------------
         EXPORTAR PDF (MODO PC)
  --------------------------------*/
  exportPdfBtn.addEventListener('click', async () => {
    try {
      const controls = document.querySelector('.controls');
      const prevControlsDisplay = controls ? (controls.style.display || "") : "";

      if (controls) controls.style.display = "none";

      /* 🔥 OCULTAR TÍTULOS Y HINTS POR DEFECTO */
      const titleAreas = document.querySelectorAll(".title-area");
      const titleBackup = [];

      titleAreas.forEach((area, i) => {
        const title = area.querySelector(".title-text");
        const hint = area.querySelector(".title-hint");

        const defaultTitle = `Título ${i + 1}`;
        const txt = title.textContent.trim();

        titleBackup.push({ title, hint, hideTitle:false, hideHint:false });

        // título sin cambiar
        if (txt === defaultTitle || txt === "" || txt === "Título") {
          title.classList.add("title-hidden");
          titleBackup[i].hideTitle = true;
        }

        // hint sin cambiar
        if (hint && hint.textContent.trim() === "(Escribe aquí el título)") {
          hint.classList.add("title-hidden");
          titleBackup[i].hideHint = true;
        }
      });

      // ✨ Forzar PC
      const prevWidth = canvasWrap.style.width;
      const prevMinWidth = canvasWrap.style.minWidth;
      const prevTransform = canvasWrap.style.transform;

      canvasWrap.style.width = "1500px";
      canvasWrap.style.minWidth = "1500px";
      canvasWrap.style.transform = "scale(1)";

      const temp = document.createElement('div');
      temp.style.position = 'fixed';
      temp.style.left = '-200vw';
      temp.style.top = '0';
      temp.style.width = canvasWrap.offsetWidth + 'px';
      temp.style.background = '#ffffff';
      temp.style.padding = '18px';
      temp.style.boxSizing = 'border-box';

      const cloneWrap = canvasWrap.cloneNode(true);
      const clonedSvg = cloneWrap.querySelector('#ligatureSvg');
      if (clonedSvg) {
        clonedSvg.id = 'ligatureSvg_temp_for_export';
        clonedSvg.innerHTML = ligatureSvg.innerHTML;
      }

      temp.appendChild(cloneWrap);
      document.body.appendChild(temp);

      const canvas = await html2canvas(cloneWrap, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });

      document.body.removeChild(temp);

      // 🔄 Restaurar títulos/hints originales
      titleBackup.forEach(t => {
        if (t.hideTitle) t.title.classList.remove("title-hidden");
        if (t.hideHint) t.hint.classList.remove("title-hidden");
      });

      // restaurar UI
      if (controls) controls.style.display = prevControlsDisplay;
      canvasWrap.style.width = prevWidth;
      canvasWrap.style.minWidth = prevMinWidth;
      canvasWrap.style.transform = prevTransform;

      const imgData = canvas.toDataURL('image/png');
      const jsPDF = window.jspdf.jsPDF;
      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const margin = 40;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;

      let drawW = maxW;
      let drawH = canvas.height * (drawW / canvas.width);

      if (drawH > maxH) {
        drawH = maxH;
        drawW = canvas.width * (drawH / canvas.height);
      }

      const x = (pageW - drawW) / 2;
      const y = (pageH - drawH) / 2;

      pdf.addImage(imgData, 'PNG', x, y, drawW, drawH);
      pdf.save('partituras.pdf');

    } catch (err) {
      alert("Error al generar PDF: " + err);
      console.error(err);
    }
  });

  /* -------------------------------
         EXPORTAR JSON (EDITABLE)
  --------------------------------*/
  exportEditableBtn.addEventListener("click", () => {
    const rows = document.querySelectorAll(".tab-row");

    const data = {
      rows: FIXED_ROWS,
      cols: FIXED_COLS,
      titles: [],
      cells: [],
      ligs: []
    };

    rows.forEach(row => {
      const titleText = row.querySelector(".title-text")?.textContent || "";
      data.titles.push(titleText);

      const strings = row.querySelectorAll(".string");
      let stringsData = [];

      strings.forEach(s => {
        const rowCells = [];
        s.querySelectorAll(".cell").forEach(cell => {
          rowCells.push(cell.dataset.value || "");
        });
        stringsData.push(rowCells);
      });

      data.cells.push(stringsData);
    });

    ligatures.forEach(path => {
      data.ligs.push({ d: path.getAttribute("d") });
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "partituras_para_editar.json";
    a.click();
  });

  realImportBtn.addEventListener("click", () => {
    realFileInput.click();
  });

  realFileInput.addEventListener("change", evt => {
    const file = evt.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      const data = JSON.parse(e.target.result);

      buildScore(FIXED_ROWS, FIXED_COLS);

      const rows = document.querySelectorAll(".tab-row");

      rows.forEach((row, rIndex) => {
        row.querySelector(".title-text").textContent = data.titles[rIndex] || "";

        const strings = row.querySelectorAll(".string");
        strings.forEach((s, sIndex) => {
          const cells = s.querySelectorAll(".cell");
          cells.forEach((cell, cIndex) => {
            const val = (data.cells[rIndex] && data.cells[rIndex][sIndex] && data.cells[rIndex][sIndex][cIndex]) ?
                        data.cells[rIndex][sIndex][cIndex] : "";
            if (val !== "") setCellValue(cell, val);
          });
        });
      });

      ligatureSvg.innerHTML = "";
      ligatures.length = 0;
      (data.ligs || []).forEach(l => {
        const p = document.createElementNS("http://www.w3.org/2000/svg","path");
        p.setAttribute("d", l.d);
        p.setAttribute("stroke","#ffd166");
        p.setAttribute("stroke-width","3");
        p.setAttribute("fill","none");

        ligatureSvg.appendChild(p);
        ligatures.push(p);
      });
    };

    reader.readAsText(file);
  });

  buildScore(FIXED_ROWS, FIXED_COLS);
});

// =============================
//  VOLTEAR PANTALLA EN MÓVILES
// =============================
const rotateBtn = document.getElementById("rotateBtn");
let rotated = false;

rotateBtn.addEventListener("click", () => {
  rotated = !rotated;

  if(rotated){
    document.body.classList.add("rotate-landscape");
    rotateBtn.textContent = "Volver a Normal";
  } else {
    document.body.classList.remove("rotate-landscape");
    rotateBtn.textContent = "Voltear Pantalla";
  }
});
