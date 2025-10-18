"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../firebaseConfig";
import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, query, where, getDocs } from "firebase/firestore";

// Rect shape with optional assigned exhibitor
type RectShape = { id: string; x: number; y: number; w: number; h: number; exId?: string };

export default function FloorplanDesignerPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [eventId, setEventId] = useState<string>("");
  const [exhibitors, setExhibitors] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("");

  // Canvas state
  const [shapes, setShapes] = useState<RectShape[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [mode, setMode] = useState<"select" | "rect">("select");
  const [dragging, setDragging] = useState<{ idx: number; dx: number; dy: number } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // Load auth + eventId + exhibitors + existing design
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { router.replace("/"); return; }
      setUser(u);
      try {
        const appSnap = await getDoc(doc(db, "AppSettings", "global"));
        const eid = appSnap.exists() && (appSnap.data() as any).eventId ? (appSnap.data() as any).eventId : "default";
        setEventId(eid);
        // Exhibitors
        const exUnsub = onSnapshot(collection(db, "Events", eid, "Exhibitors"), (snap) => {
          setExhibitors(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        });
        // Existing design
        const cfgSnap = await getDoc(doc(db, "Events", eid, "Config", "floorplanDesign"));
        if (cfgSnap.exists()) {
          const d = cfgSnap.data() as any;
          if (Array.isArray(d.shapes)) setShapes(d.shapes as RectShape[]);
        }
        return () => exUnsub();
      } catch {}
    });
    return () => unsub();
  }, [router]);

  const addRect = () => {
    const idx = shapes.length + 1;
    const id = `B${idx.toString().padStart(2, '0')}`;
    const s: RectShape = { id, x: 40 + idx * 10, y: 40 + idx * 10, w: 120, h: 80 };
    setShapes((prev) => [...prev, s]);
    setSelectedIdx(shapes.length);
  };

  const updateShape = (idx: number, patch: Partial<RectShape>) => {
    setShapes((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeShape = (idx: number) => {
    setShapes((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIdx(null);
  };

  const onMouseDown = (e: React.MouseEvent<SVGRectElement, MouseEvent>, idx: number) => {
    if (mode !== "select") return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const local = pt.matrixTransform(ctm.inverse());
    const s = shapes[idx];
    setDragging({ idx, dx: local.x - s.x, dy: local.y - s.y });
    setSelectedIdx(idx);
  };

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!dragging) return;
    const svg = svgRef.current; if (!svg) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM(); if (!ctm) return;
    const local = pt.matrixTransform(ctm.inverse());
    const { idx, dx, dy } = dragging;
    const nx = Math.max(0, local.x - dx);
    const ny = Math.max(0, local.y - dy);
    updateShape(idx, { x: nx, y: ny });
  };

  const onMouseUp = () => setDragging(null);

  const toSvgString = (): string => {
    const width = 1200; const height = 800;
    const rects = shapes.map((s) => (
      `<rect id="${s.id}" x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="#1e293b" stroke="#38bdf8" stroke-width="2"${s.exId ? ` data-exhibitor-id="${s.exId}"` : ''} />`
    )).join("\n");
    const labels = shapes.map((s) => (
      `<text x="${s.x + s.w/2}" y="${s.y + s.h/2}" fill="#e2e8f0" font-size="14" text-anchor="middle" dominant-baseline="middle">${s.id}</text>`
    )).join("\n");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#0b1020"/>${rects}${labels}</svg>`;
  };

  const saveDesign = async () => {
    if (!eventId) { setStatus('No current event set. Set Event ID in organizer.'); setTimeout(()=>setStatus(''),2000); return; }
    try {
      await setDoc(doc(db, "Events", eventId, "Config", "floorplanDesign"), {
        shapes,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setStatus('Design saved');
      setTimeout(()=>setStatus(''),1500);
    } catch (e:any) {
      setStatus(`Save failed: ${e?.message||e}`);
      setTimeout(()=>setStatus(''),2500);
    }
  };

  const publishSvg = async () => {
    if (!eventId) { setStatus('No current event set. Set Event ID in organizer.'); setTimeout(()=>setStatus(''),2000); return; }
    try {
      if (!shapes.length) { setStatus('Add at least one booth before publishing'); setTimeout(()=>setStatus(''),2000); return; }
      const svg = toSvgString();
      await setDoc(doc(db, "Events", eventId, "Config", "default"), {
        floorplanSvg: svg,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setStatus('Published SVG');
      setTimeout(()=>setStatus(''),1500);
    } catch (e:any) {
      setStatus(`Publish failed: ${e?.message||e}`);
      setTimeout(()=>setStatus(''),2500);
    }
  };

  const selectedShape = useMemo(() => (selectedIdx !== null ? shapes[selectedIdx] : null), [selectedIdx, shapes]);

  return (
    <div className="min-h-screen bg-[#0f1419] text-white">
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Floorplan Designer</h1>
          <div className="flex gap-2">
            <button onClick={() => router.push('/dashboard')} className="bg-[#6c757d] hover:bg-[#5a6268] text-white px-3 py-2 rounded">Back</button>
            <button onClick={saveDesign} className="bg-[#0d6efd] hover:bg-[#fd7e14] text-white px-3 py-2 rounded">Save Design</button>
            <button onClick={publishSvg} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded">Publish</button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/10 mb-3 flex items-center gap-2">
          <div className="text-white/80 mr-2">Mode:</div>
          <button onClick={() => setMode('select')} className={`px-3 py-2 rounded ${mode==='select' ? 'bg-[#0d6efd]' : 'bg-[#232b3e]/60'} `}>Select/Move</button>
          <button onClick={addRect} className="px-3 py-2 rounded bg-[#232b3e]/60">Add Rectangle</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Canvas */}
          <div className="bg-[#0b1020] rounded border border-white/10 overflow-auto" style={{ minHeight: 320 }}>
            <svg ref={svgRef} viewBox="0 0 1200 800" className="w-full h-auto" onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
              <rect width="1200" height="800" fill="#0b1020" />
              {shapes.map((s, i) => (
                <g key={i}>
                  <rect
                    x={s.x} y={s.y} width={s.w} height={s.h}
                    fill="#1e293b" stroke={selectedIdx === i ? '#fd7e14' : '#38bdf8'} strokeWidth={2}
                    cursor="move"
                    onMouseDown={(e) => onMouseDown(e, i)}
                    onClick={() => setSelectedIdx(i)}
                  />
                  <text x={s.x + s.w/2} y={s.y + s.h/2} fill="#e2e8f0" fontSize={14} textAnchor="middle" dominantBaseline="middle">{s.id}</text>
                </g>
              ))}
            </svg>
          </div>

          {/* Inspector */}
          <div>
            {selectedShape ? (
              <div className="bg-white/5 rounded p-3 border border-white/10 space-y-2">
                <div className="font-semibold">Booth Properties</div>
                <label className="block text-sm text-[#6c757d]">Booth ID
                  <input value={selectedShape.id} onChange={(e)=>{
                    const v = e.target.value.trim();
                    // Prevent duplicate booth IDs
                    const dupe = shapes.some((s, i) => i !== selectedIdx && (s.id || '').toLowerCase() === v.toLowerCase());
                    if (dupe) {
                      setStatus('Booth ID already used. Choose a unique ID.');
                      setTimeout(()=>setStatus(''), 2000);
                      return;
                    }
                    updateShape(selectedIdx!, { id: v });
                  }} className="w-full p-2 rounded bg-[#181f2a] text-white border border-white/10"/>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-sm text-[#6c757d]">X
                    <input type="number" value={selectedShape.x} onChange={(e)=>updateShape(selectedIdx!, { x: Number(e.target.value) })} className="w-full p-2 rounded bg-[#181f2a] text-white border border-white/10"/>
                  </label>
                  <label className="block text-sm text-[#6c757d]">Y
                    <input type="number" value={selectedShape.y} onChange={(e)=>updateShape(selectedIdx!, { y: Number(e.target.value) })} className="w-full p-2 rounded bg-[#181f2a] text-white border border-white/10"/>
                  </label>
                  <label className="block text-sm text-[#6c757d]">W
                    <input type="number" value={selectedShape.w} onChange={(e)=>updateShape(selectedIdx!, { w: Number(e.target.value) })} className="w-full p-2 rounded bg-[#181f2a] text-white border border-white/10"/>
                  </label>
                  <label className="block text-sm text-[#6c757d]">H
                    <input type="number" value={selectedShape.h} onChange={(e)=>updateShape(selectedIdx!, { h: Number(e.target.value) })} className="w-full p-2 rounded bg-[#181f2a] text-white border border-white/10"/>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedIdx(null)} className="bg-[#6c757d] text-white px-3 py-1 rounded">Deselect</button>
                  <button onClick={() => removeShape(selectedIdx!)} className="bg-red-600 text-white px-3 py-1 rounded">Remove</button>
                </div>
                <div className="mt-3">
                  <div className="font-semibold mb-1">Assign Exhibitor</div>
                  <div className="text-sm text-[#6c757d] mb-2">Set this booth ID on the exhibitor to complete the mapping</div>
                  <select className="w-full p-2 rounded bg-[#181f2a] text-white border border-white/10" onChange={async (e)=>{
                    const exId = e.target.value;
                    if (!exId || !selectedShape) return;
                    try {
                      const bid = (selectedShape.id || '').trim();
                      if (!bid) { setStatus('Booth ID is empty'); setTimeout(()=>setStatus(''),1500); return; }
                      // Clear conflicting assignments (any exhibitor currently using this booth ID)
                      const qSnap = await getDocs(query(collection(db, 'Events', eventId || 'default', 'Exhibitors'), where('boothId', '==', bid)));
                      let cleared = 0;
                      for (const d of qSnap.docs) {
                        if (d.id !== exId) {
                          await setDoc(doc(db, 'Events', eventId || 'default', 'Exhibitors', d.id), { boothId: '' }, { merge: true });
                          cleared++;
                        }
                      }
                      // Assign selected exhibitor
                      await setDoc(doc(db, 'Events', eventId || 'default', 'Exhibitors', exId), { boothId: bid, updatedAt: serverTimestamp() }, { merge: true });
                      // Update local shapes: set this booth's exId and clear any other booth currently using this exhibitor
                      setShapes(prev => prev.map((s,i)=> {
                        if (i === selectedIdx) return { ...s, exId };
                        if (s.exId === exId) return { ...s, exId: undefined };
                        return s;
                      }));
                      setStatus(`Assigned ${bid} to exhibitor${cleared ? ` (cleared ${cleared} conflict${cleared>1?'s':''})` : ''}`);
                      setTimeout(()=>setStatus(''),2000);
                    } catch (err:any) {
                      setStatus(`Assign failed: ${err?.message||err}`);
                      setTimeout(()=>setStatus(''),2500);
                    }
                  }}>
                    <option value="">Select exhibitor...</option>
                    {exhibitors.map((x) => (
                      <option key={x.id} value={x.id}>{x.company || x.name || x.id}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="text-[#6c757d]">Select a rectangle to edit its properties and assign an exhibitor.</div>
            )}
          </div>
        </div>

        {status && (
          <div className="mt-3 p-3 rounded bg-green-500/20 text-green-300 border border-green-500/30">{status}</div>
        )}
        <div className="mt-4 p-3 bg-white/5 rounded border border-white/10">
          <div className="text-sm text-[#6c757d]">Notes</div>
          <ul className="text-sm text-white/80 list-disc pl-5">
            <li>Use "Add Rectangle" to place booths. Click a booth to select and drag to move. Use numeric fields to resize.</li>
            <li>Click "Save Design" to store the layout JSON (editable later).</li>
            <li>Click "Publish" to generate and save the SVG in the event config. The public page uses this to display the interactive floorplan.</li>
            <li>To map exhibitor details to a booth, set the boothId on the exhibitor via the Assign dropdown.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
