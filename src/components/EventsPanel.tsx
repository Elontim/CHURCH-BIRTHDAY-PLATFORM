import { FormEvent, useEffect, useState } from "react";
import { CalendarDays, Clock, LoaderCircle, MapPin, Plus, X } from "lucide-react";
import { friendlyError, supabase } from "../lib/supabase";

type ChurchEvent = {
  id: string;
  title: string;
  description: string;
  venue: string | null;
  starts_at: string;
  ends_at: string | null;
  visibility: "public" | "members" | "leaders";
};

export default function EventsPanel({ canManage }: { canManage: boolean }) {
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ title: "", description: "", venue: "", starts_at: "", ends_at: "", visibility: "members" });

  const load = async () => {
    const { data, error } = await supabase.from("events").select("*").gte("starts_at", new Date().toISOString()).order("starts_at").limit(30);
    if (error) setMessage(friendlyError(error)); else setEvents((data || []) as ChurchEvent[]);
    setBusy(false);
  };
  useEffect(() => { load(); }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("events").insert({
      ...form,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      created_by: userData.user?.id,
    });
    if (error) setMessage(friendlyError(error));
    else {
      setMessage("Event created successfully.");
      setOpen(false);
      setForm({ title: "", description: "", venue: "", starts_at: "", ends_at: "", visibility: "members" });
      await load();
    }
    setBusy(false);
  };

  return <>
    <section className="pageIntro">
      <span className="eyebrow">Church calendar</span>
      <h1>Gather, worship, and grow together</h1>
      <p>Find services, programmes, ministry meetings, and important community moments.</p>
    </section>
    <div className="sectionHead"><div><span className="eyebrow">Coming up</span><h2>Upcoming events</h2></div>{canManage && <button className="primaryButton" onClick={() => setOpen(true)}><Plus /> Add event</button>}</div>
    {message && <div className="notice success">{message}</div>}
    {busy ? <div className="loadingState"><LoaderCircle className="spin" /></div> : events.length ? <div className="eventGrid">{events.map(item => {
      const date = new Date(item.starts_at);
      return <article key={item.id}><div className="eventDate"><strong>{date.getDate()}</strong><span>{date.toLocaleDateString("en-NG", { month: "short" })}</span></div><div><span className="visibilityPill">{item.visibility}</span><h3>{item.title}</h3><p>{item.description}</p><div className="eventMeta"><span><Clock />{date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</span>{item.venue && <span><MapPin />{item.venue}</span>}</div></div></article>;
    })}</div> : <div className="emptyState large"><CalendarDays /><h3>No upcoming events</h3><p>New events will appear here once they are published.</p></div>}

    {open && <div className="modalBackdrop" onMouseDown={() => setOpen(false)}><form className="roleModal eventModal" onSubmit={create} onMouseDown={event => event.stopPropagation()}><header><div><span className="eyebrow">New church event</span><h2>Create an event</h2></div><button type="button" className="iconButton" onClick={() => setOpen(false)}><X /></button></header><div className="formGrid"><label>Event title<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label><label>Venue<input value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} /></label><label>Starting time<input required type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} /></label><label>Ending time<input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} /></label><label>Who can see it<select value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })}><option value="public">Everyone</option><option value="members">Members</option><option value="leaders">Leaders</option></select></label><label className="wide">Description<textarea required rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label></div><footer><button className="primaryButton" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <Plus />} Create event</button><button type="button" className="softButton" onClick={() => setOpen(false)}>Cancel</button></footer></form></div>}
  </>;
}
