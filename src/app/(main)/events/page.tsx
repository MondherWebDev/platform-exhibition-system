"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../../firebaseConfig";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

// Event metadata stored at Events/{eventId}
// Additional content under subcollections: Exhibitors, Sponsors, Speakers, HostedBuyers, Sessions
// Config docs: Events/{eventId}/Config/{ default, floorplanDesign }
// Pages docs: Events/{eventId}/Pages/{ home }

type EventMeta = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  bannerLogoUrl?: string;
  bannerImageUrl?: string;
  active?: boolean;
  theme?: { primary?: string; secondary?: string };
  createdAt?: any;
  updatedAt?: any;
};

export default function OrganizerEventsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Global current event id (from AppSettings/global)
  const [currentEventId, setCurrentEventId] = useState<string>("");

  // List & selection
  const [events, setEvents] = useState<EventMeta[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string>("");
  const selectedEvent = useMemo(() => events.find(e => e.id === selectedId) || null, [events, selectedId]);

  // Editing form
  const [form, setForm] = useState<EventMeta>({ id: "", name: "", startDate: "", endDate: "", startTime: "", endTime: "", location: "", description: "", bannerLogoUrl: "", bannerImageUrl: "", active: false, theme: { primary: "#0d6efd", secondary: "#fd7e14" } });
  const [busy, setBusy] = useState<boolean>(false);
  const [info, setInfo] = useState<string>("");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { router.replace("/"); return; }
      setUser(u);
      // load global eventId
      const gsnap = await getDoc(doc(db, "AppSettings", "global"));
      if (gsnap.exists()) {
        const g = gsnap.data() as any;
        if (g.eventId) setCurrentEventId(String(g.eventId));
      }
      // subscribe to events
      const evUnsub = onSnapshot(collection(db, "Events"), (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as EventMeta[];
        setEvents(list.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)));
        if (!selectedId && list.length) setSelectedId(list[0].id);
      });
      return () => evUnsub();
    });
    return () => unsub();
  }, [router, selectedId]);

  useEffect(() => {
    if (!selectedEvent) return;
    setForm({
      id: selectedEvent.id,
      name: selectedEvent.name || "",
      startDate: selectedEvent.startDate || "",
      endDate: selectedEvent.endDate || "",
      startTime: selectedEvent.startTime || "",
      endTime: selectedEvent.endTime || "",
      location: selectedEvent.location || "",
      description: selectedEvent.description || "",
      bannerLogoUrl: selectedEvent.bannerLogoUrl || "",
      bannerImageUrl: selectedEvent.bannerImageUrl || "",
      active: !!selectedEvent.active,
      theme: selectedEvent.theme || { primary: "#0d6efd", secondary: "#fd7e14" },
    });
  }, [selectedEvent]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return events;
    return events.filter(e => [e.id, e.name, e.location].join("\n").toLowerCase().includes(q));
  }, [events, filter]);

  const resetForm = () => setForm({ id: "", name: "", startDate: "", endDate: "", location: "", description: "", active: false, theme: { primary: "#0d6efd", secondary: "#fd7e14" } });

  const createOrUpdate = async () => {
    if (!form.id || !form.name) { setInfo("Event ID and Name are required"); setTimeout(()=>setInfo(""), 1800); return; }
    try {
      setBusy(true);
      await setDoc(doc(db, "Events", form.id), {
        name: form.name,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        location: form.location || "",
        description: form.description || "",
        bannerLogoUrl: form.bannerLogoUrl || "",
        bannerImageUrl: form.bannerImageUrl || "",
        active: !!form.active,
        theme: form.theme || {},
        updatedAt: serverTimestamp(),
        createdAt: selectedEvent?.createdAt || serverTimestamp(),
      }, { merge: true });
      setInfo("Saved");
      setTimeout(()=>setInfo(""), 1500);
      if (!selectedId) setSelectedId(form.id);
    } finally {
      setBusy(false);
    }
  };

  const setActive = async (id: string, active: boolean) => {
    await setDoc(doc(db, "Events", id), { active, updatedAt: serverTimestamp() }, { merge: true });
    if (active) await setDoc(doc(db, "AppSettings", "global"), { eventId: id }, { merge: true });
  };

  const setCurrent = async (id: string) => {
    await setDoc(doc(db, "AppSettings", "global"), { eventId: id }, { merge: true });
    setCurrentEventId(id);
    setInfo(`Current event set to ${id}`);
    setTimeout(()=>setInfo(""), 1500);
  };

  const duplicateEvent = async (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId) return;
    setBusy(true);
    try {
      const sRef = doc(db, "Events", sourceId);
      const tRef = doc(db, "Events", targetId);
      const sMeta = await getDoc(sRef);
      const meta = sMeta.exists() ? sMeta.data() as any : {};
      await setDoc(tRef, {
        name: meta.name ? `${meta.name} (Copy)` : targetId,
        startDate: meta.startDate || null,
        endDate: meta.endDate || null,
        startTime: meta.startTime || null,
        endTime: meta.endTime || null,
        location: meta.location || "",
        description: meta.description || "",
        bannerLogoUrl: meta.bannerLogoUrl || "",
        bannerImageUrl: meta.bannerImageUrl || "",
        active: false,
        theme: meta.theme || {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Copy known subcollections
      const subcols = ["Exhibitors", "Sponsors", "Speakers", "HostedBuyers", "Sessions"];
      for (const colName of subcols) {
        const srcSnap = await getDocs(collection(db, "Events", sourceId, colName));
        for (const d of srcSnap.docs) {
          await setDoc(doc(db, "Events", targetId, colName, d.id), d.data());
        }
      }

      // Copy Pages/home
      const pagesHome = await getDoc(doc(db, "Events", sourceId, "Pages", "home"));
      if (pagesHome.exists()) await setDoc(doc(db, "Events", targetId, "Pages", "home"), pagesHome.data());

      // Copy Config/default + floorplanDesign if available
      const cfgDefault = await getDoc(doc(db, "Events", sourceId, "Config", "default"));
      if (cfgDefault.exists()) await setDoc(doc(db, "Events", targetId, "Config", "default"), cfgDefault.data());
      const cfgDesign = await getDoc(doc(db, "Events", sourceId, "Config", "floorplanDesign"));
      if (cfgDesign.exists()) await setDoc(doc(db, "Events", targetId, "Config", "floorplanDesign"), cfgDesign.data());

      setInfo("Duplicated");
      setTimeout(()=>setInfo(""), 1500);
    } finally {
      setBusy(false);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!id || !confirm(`Delete event ${id}? This will remove known content.`)) return;
    setBusy(true);
    try {
      // Delete known subcollections docs, then delete event doc
      const subcols = ["Exhibitors", "Sponsors", "Speakers", "HostedBuyers", "Sessions"]; 
      for (const colName of subcols) {
        const snap = await getDocs(collection(db, "Events", id, colName));
        for (const d of snap.docs) await deleteDoc(doc(db, "Events", id, colName, d.id));
      }
      await deleteDoc(doc(db, "Events", id, "Pages", "home"));
      await deleteDoc(doc(db, "Events", id, "Config", "default"));
      await deleteDoc(doc(db, "Events", id, "Config", "floorplanDesign"));
      await deleteDoc(doc(db, "Events", id));
      if (selectedId === id) { setSelectedId(""); resetForm(); }
      setInfo("Deleted"); setTimeout(()=>setInfo(""), 1500);
    } finally {
      setBusy(false);
    }
  };

  // Helper: Cloudinary image upload
  const uploadToCloud = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'event_logo_unsigned');
    const res = await fetch('https://api.cloudinary.com/v1_1/dp3fxdxyj/image/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.secure_url) throw new Error('Upload failed');
    return data.secure_url as string;
  };

  return (
    <div className="min-h-screen bg-[#0f1419] text-white">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Event Builder (CRUD)</h1>
          <div className="flex items-center gap-2">
            <span className="text-[#6c757d] text-sm">Current Event:</span>
            <span className="px-2 py-1 rounded bg-white/10 text-white/90 text-sm">{currentEventId || "(none)"}</span>
            <button onClick={()=>router.push('/dashboard')} className="bg-[#6c757d] hover:bg-[#5a6268] text-white px-3 py-2 rounded">Back</button>
          </div>
        </div>
        {info && <div className="mb-3 p-2 rounded bg-green-500/20 text-green-300 border border-green-500/30">{info}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Events list */}
          <div className="md:col-span-1 bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <input value={filter} onChange={(e)=>setFilter(e.target.value)} placeholder="Search events" className="flex-1 p-2 rounded bg-[#181f2a] text-white border border-white/10"/>
              <button onClick={()=>{ setSelectedId(""); resetForm(); }} className="bg-[#0d6efd] hover:bg-[#fd7e14] text-white px-3 py-2 rounded">New</button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filtered.length ? filtered.map(ev => (
                <div key={ev.id} className={`p-2 rounded border border-white/10 ${selectedId===ev.id ? 'bg-white/10' : 'bg-white/5'}`}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{ev.name || ev.id}</div>
                      <div className="text-[#6c757d] text-xs truncate">{ev.id}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {ev.active ? <span className="text-xs bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded">Active</span> : null}
                      <button onClick={()=>setSelectedId(ev.id)} className="text-xs bg-[#6c757d] text-white px-2 py-1 rounded">Edit</button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={()=>setCurrent(ev.id)} className="text-xs bg-[#0d6efd] text-white px-2 py-1 rounded">Set Current</button>
                    {ev.active ? (
                      <button onClick={()=>setActive(ev.id, false)} className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">Deactivate</button>
                    ) : (
                      <button onClick={()=>setActive(ev.id, true)} className="text-xs bg-green-600 text-white px-2 py-1 rounded">Activate</button>
                    )}
                    <button onClick={async()=>{
                      const id = prompt('Duplicate to event id (slug):');
                      if (id) await duplicateEvent(ev.id, id);
                    }} className="text-xs bg-[#232b3e] text-white px-2 py-1 rounded">Duplicate</button>
                    <button onClick={()=>deleteEvent(ev.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                  </div>
                </div>
              )) : <div className="text-[#6c757d] text-sm">No events found.</div>}
            </div>
          </div>

          {/* Editor */}
          <div className="md:col-span-2 bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block text-sm text-[#6c757d]">Event ID (slug)
                <input value={form.id} onChange={(e)=>setForm({...form, id: e.target.value.trim()})} placeholder="e.g., tech-expo-2025" className="w-full p-2 rounded bg-[#181f2a] text-white border border-white/10"/>
              </label>
              <label className="block text-sm text-[#6c757d]">Name
                <input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} placeholder="Event name" className="w-full p-2 rounded bg-[#181f2a] text-white border border-white/10"/>
              </label>
              <label className="block text-sm text-[#6c757d]">Start Date
                <input type="date" value={form.startDate || ''} onChange={(e)=>setForm({...form, startDate: e.target.value})} className="w-full p-2 rounded bg-[#181f2a] text-white border border-white/10"/>
              </label>
              <label className="block text-sm text-[#6c757d]">End Date
                <input type="date" value={form.endDate || ''} onChange={(e)=>setForm({...form, endDate: e.target.value})} className="w-full p-2 rounded bg-[#181f2a] text-white border border-white/10"/>
              </label>
              <label className="block text-sm text-[#6c757d]">Start Time
                <input type="time" value={form.startTime || ''} onChange={(e)=>setForm({...form, startTime: e.target.value})} className="w-full p-2 rounded bg-[#181f2a] text-white border border-white/10"/>
              </label>
              <label className="block text-sm text-[#6c757d]">End Time
                <input type="time" value={form.endTime || ''} onChange={(e)=>setForm({...form, endTime: e.target.value})} className="w-full p-2 rounded bg-[#181f2a] text-white border border-white/10"/>
              </label>
              <label className="block text-sm text-[#6c757d]">Location
                <input value={form.location || ''} onChange={(e)=>setForm({...form, location: e.target.value})} placeholder="Venue / City" className="w-full p-2 rounded bg-[#181f2a] text-white border border-white/10"/>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:col-span-2">
                <label className="block text-sm text-[#6c757d]">Banner Logo URL
                  <div className="flex gap-2">
                    <input value={form.bannerLogoUrl || ''} onChange={(e)=>setForm({...form, bannerLogoUrl: e.target.value})} placeholder="https://.../logo.png" className="flex-1 p-2 rounded bg-[#181f2a] text-white border border-white/10"/>
                    <input type="file" accept="image/*" onChange={async (e)=>{ const f=e.target.files?.[0]; if(f){ const url=await uploadToCloud(f); setForm(prev=>({...prev, bannerLogoUrl: url})); } }} />
                  </div>
                </label>
                <label className="block text-sm text-[#6c757d]">Banner Image URL
                  <div className="flex gap-2">
                    <input value={form.bannerImageUrl || ''} onChange={(e)=>setForm({...form, bannerImageUrl: e.target.value})} placeholder="https://.../banner.jpg" className="flex-1 p-2 rounded bg-[#181f2a] text-white border border-white/10"/>
                    <input type="file" accept="image/*" onChange={async (e)=>{ const f=e.target.files?.[0]; if(f){ const url=await uploadToCloud(f); setForm(prev=>({...prev, bannerImageUrl: url})); } }} />
                  </div>
                </label>
              </div>
              <label className="block text-sm text-[#6c757d]">Active
                <select value={form.active ? '1' : '0'} onChange={(e)=>setForm({...form, active: e.target.value==='1'})} className="w-full p-2 rounded bg-[#181f2a] text-white border border-white/10">
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </label>
              <label className="block text-sm text-[#6c757d] md:col-span-2">Description
                <textarea value={form.description || ''} onChange={(e)=>setForm({...form, description: e.target.value})} placeholder="Short description" className="w-full p-2 rounded bg-[#181f2a] text-white border border-white/10" rows={3}/>
              </label>
              <div className="grid grid-cols-2 gap-3 md:col-span-2">
                <label className="block text-sm text-[#6c757d]">Theme Primary
                  <input type="color" value={form.theme?.primary || '#0d6efd'} onChange={(e)=>setForm({...form, theme: { ...(form.theme||{}), primary: e.target.value }})} className="w-full h-10 p-1 rounded bg-[#181f2a] border border-white/10"/>
                </label>
                <label className="block text-sm text-[#6c757d]">Theme Secondary
                  <input type="color" value={form.theme?.secondary || '#fd7e14'} onChange={(e)=>setForm({...form, theme: { ...(form.theme||{}), secondary: e.target.value }})} className="w-full h-10 p-1 rounded bg-[#181f2a] border border-white/10"/>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button disabled={busy} onClick={createOrUpdate} className="bg-[#0d6efd] hover:bg-[#fd7e14] disabled:opacity-50 text-white px-4 py-2 rounded">Save</button>
              <button disabled={busy || !form.id} onClick={()=>setCurrent(form.id)} className="bg-[#6c757d] hover:bg-[#5a6268] disabled:opacity-50 text-white px-4 py-2 rounded">Set Current</button>
              <button disabled={busy || !form.id} onClick={()=>setActive(form.id, !form.active)} className={`px-4 py-2 rounded text-white ${form.active ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}>{form.active ? 'Deactivate' : 'Activate'}</button>
              <button disabled={busy || !form.id} onClick={async()=>{ const id = prompt('Duplicate to event id (slug):'); if (id) await duplicateEvent(form.id, id); }} className="bg-[#232b3e] text-white hover:opacity-90 px-4 py-2 rounded">Duplicate</button>
              <button disabled={busy || !form.id} onClick={()=>deleteEvent(form.id)} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded">Delete</button>
            </div>

            <div className="mt-6 p-3 bg-white/5 border border-white/10 rounded text-[#6c757d] text-sm">
              <div className="font-semibold text-white mb-1">Tips</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Use a concise, URL-safe Event ID (slug). This becomes /e/{`{eventId}`}</li>
                <li>Activate an event to make / redirect to /e/{`{eventId}`}</li>
                <li>Duplicate to copy exhibitors, sponsors, speakers, hosted buyers, sessions, pages and config to a new event.</li>
                <li>Use the Floorplan Designer at /dashboard/organizer/floorplan-designer to draw and publish the floorplan.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
