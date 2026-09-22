import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bell, CalendarDays, Camera, Check, ChevronRight, Church, Eye, EyeOff,
  Gift, Heart, Home, LoaderCircle, LogOut, Menu, MessageCircle, Moon,
  PartyPopper, Search, Settings, ShieldCheck, Sparkles, Sun, Upload, UserRound,
  Users, X
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { friendlyError, isSupabaseConfigured, supabase } from "./lib/supabase";
import type { Birthday, Notice, Profile, RoleName } from "./types";
import ManagementAdminPanel from "./components/AdminPanel";
import EventsPanel from "./components/EventsPanel";

type View = "home" | "birthdays" | "events" | "members" | "messages" | "admin" | "profile";
type AuthMode = "login" | "register" | "forgot";

const nav: { id: View; label: string; icon: typeof Home; protected?: boolean }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "birthdays", label: "Birthdays", icon: Gift },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "members", label: "Members", icon: Users },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "admin", label: "Admin", icon: ShieldCheck, protected: true },
];

const roleLabels: Record<RoleName, string> = {
  general_admin: "General Admin",
  admin: "Admin",
  birthday_manager: "Birthday Manager",
  event_manager: "Event Manager",
  content_manager: "Content Manager",
  member_manager: "Member Manager",
  notification_manager: "Notification Manager",
  member: "Member",
};

const initials = (name = "Member") => name.split(" ").slice(0, 2).map(part => part[0]).join("").toUpperCase();
const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long" }).format(new Date(value + "T12:00:00"))
  : "Date not added";

function daysUntilBirthday(value?: string | null) {
  if (!value) return 999;
  const today = new Date();
  const date = new Date(value + "T12:00:00");
  let next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
  if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    next = new Date(today.getFullYear() + 1, date.getMonth(), date.getDate());
  }
  return Math.ceil((next.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
}

function Avatar({ profile, size = "normal" }: { profile?: Partial<Profile | Birthday> | null; size?: "small" | "normal" | "large" }) {
  return profile?.avatar_url
    ? <img className={"avatar " + size} src={profile.avatar_url} alt={profile.full_name || "Member"} />
    : <span className={"avatar avatarFallback " + size} aria-hidden="true">{initials(profile?.full_name)}</span>;
}

function Brand() {
  return <div className="brand"><span className="brandMark"><Church size={24} /></span><span><strong>TACN Connect</strong><small>Our church family</small></span></div>;
}

function Mascot() {
  return <div className="mascot" aria-hidden="true">
    <div className="mascotGlow" />
    <div className="churchBody">
      <div className="churchRoof" />
      <div className="churchCross">✦</div>
      <div className="churchDoor" />
      <span className="churchWindow left" /><span className="churchWindow right" />
    </div>
    <div className="pullLine" />
  </div>;
}

function AuthScreen({ onReady }: { onReady: () => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", birthday: "" });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      setError("Connect Supabase using the environment variables described in the README.");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (authError) throw authError;
        onReady();
      } else if (mode === "register") {
        const { error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.name, date_of_birth: form.birthday } },
        });
        if (authError) throw authError;
        setMessage("Your account was created. Please check your email to confirm it.");
      } else {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: window.location.origin + "/",
        });
        if (authError) throw authError;
        setMessage("Password reset instructions have been sent to your email.");
      }
    } catch (caught) {
      setError(friendlyError(caught));
    } finally { setBusy(false); }
  };

  const google = async () => {
    if (!isSupabaseConfigured) return setError("Connect Supabase before using Google sign in.");
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (authError) setError(friendlyError(authError));
  };

  return <main className="authPage">
    <section className="authStory">
      <Brand />
      <div className="storyCopy">
        <span className="eyebrow"><Sparkles size={15} /> Celebrate people with care</span>
        <h1>Every person matters.<br />Every birthday tells a story.</h1>
        <p>One warm home for church birthdays, member care, events, and shared moments.</p>
        <div className="storyStats">
          <div><strong>One family</strong><span>Connected with purpose</span></div>
          <div><strong>Every moment</strong><span>Remembered with love</span></div>
        </div>
      </div>
      <blockquote>“Rejoice with those who rejoice.” <span>Romans 12:15</span></blockquote>
    </section>

    <section className="authPanelWrap">
      <Mascot />
      <div className="authCard">
        <div className="mobileBrand"><Brand /></div>
        <span className="eyebrow">{mode === "login" ? "Welcome home" : mode === "register" ? "Join the family" : "Account recovery"}</span>
        <h2>{mode === "login" ? "Sign in to continue" : mode === "register" ? "Create your account" : "Reset your password"}</h2>
        <p className="authIntro">{mode === "forgot" ? "Enter your email and we will send a secure reset link." : "Simple, secure access to your church community."}</p>

        {!isSupabaseConfigured && <div className="notice warning">Database setup is required. Follow the README before signing in.</div>}
        {error && <div className="notice error" role="alert">{error}</div>}
        {message && <div className="notice success" role="status"><Check size={18} />{message}</div>}

        <form onSubmit={submit} className="authForm">
          {mode === "register" && <>
            <label>Full name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your full name" autoComplete="name" /></label>
            <label>Birthday<input required type="date" value={form.birthday} onChange={e => setForm({ ...form, birthday: e.target.value })} /></label>
          </>}
          <label>Email address<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" autoComplete="email" /></label>
          {mode !== "forgot" && <label>Password
            <span className="passwordField">
              <input required minLength={8} type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} />
              <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</button>
            </span>
          </label>}
          {mode === "login" && <button className="textButton forgot" type="button" onClick={() => { setMode("forgot"); setError(""); }}>Forgot password?</button>}
          <button className="primaryButton" disabled={busy}>{busy ? <><LoaderCircle className="spin" /> Please wait</> : mode === "login" ? "Sign in" : mode === "register" ? "Create account" : "Send reset link"}</button>
        </form>

        {mode !== "forgot" && <>
          <div className="or"><span>or</span></div>
          <button className="googleButton" onClick={google}><span className="googleG">G</span> Continue with Google</button>
        </>}
        <p className="switchAuth">
          {mode === "login" ? "New to TACN Connect?" : "Already have an account?"}
          <button className="textButton" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setMessage(""); }}>
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </p>
      </div>
    </section>
  </main>;
}

function Welcome({ profile, birthdays }: { profile: Profile | null; birthdays: Birthday[] }) {
  const next = birthdays[0];
  return <>
    <section className="welcome">
      <div><span className="eyebrow">Good to see you</span><h1>Welcome, {profile?.full_name?.split(" ")[0] || "friend"}.</h1><p>Here is what is happening across your church family.</p></div>
      <button className="primaryButton"><PartyPopper size={19} /> Create a greeting</button>
    </section>
    <section className="heroGrid">
      <article className="celebrationCard">
        <span className="eyebrow light">Next celebration</span>
        {next ? <div className="nextBirthday"><Avatar profile={next} size="large" /><div><h2>{next.full_name}</h2><p>{formatDate(next.date_of_birth)}</p><strong>{daysUntilBirthday(next.date_of_birth) === 0 ? "Today" : daysUntilBirthday(next.date_of_birth) + " days to go"}</strong></div></div> : <p>Add member birthdays to begin celebrating together.</p>}
        <Gift className="giftWatermark" />
      </article>
      <article className="verseCard"><Heart /><p>“Let all that you do be done in love.”</p><span>1 Corinthians 16:14</span></article>
    </section>
  </>;
}

function BirthdayList({ birthdays }: { birthdays: Birthday[] }) {
  return <section className="sectionBlock">
    <div className="sectionHead"><div><span className="eyebrow">Celebrate together</span><h2>Upcoming birthdays</h2></div><button className="softButton">View calendar <ChevronRight size={17} /></button></div>
    <div className="birthdayGrid">
      {birthdays.length ? birthdays.slice(0, 6).map(person => <article className="personCard" key={person.id}>
        <Avatar profile={person} size="large" />
        <div><h3>{person.full_name}</h3><p>{formatDate(person.date_of_birth)}</p></div>
        <span className="dayPill">{daysUntilBirthday(person.date_of_birth) === 0 ? "Today" : daysUntilBirthday(person.date_of_birth) + " days"}</span>
        <button aria-label={"Celebrate " + person.full_name}><Gift size={18} /></button>
      </article>) : <div className="emptyState"><CalendarDays /><h3>No birthdays yet</h3><p>Birthdays will appear here when member profiles are completed.</p></div>}
    </div>
  </section>;
}

function Dashboard({ session }: { session: Session }) {
  const [view, setView] = useState<View>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [roles, setRoles] = useState<RoleName[]>([]);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(false);
  const isAdmin = roles.some(role => role !== "member");

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [profileResult, birthdayResult, noticeResult, roleResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).single(),
        supabase.from("profiles").select("id,full_name,date_of_birth,avatar_url,bio").eq("account_status", "active").not("date_of_birth", "is", null),
        supabase.from("notifications").select("id,title,body,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("user_roles").select("roles(name)").eq("user_id", session.user.id),
      ]);
      if (profileResult.data) setProfile(profileResult.data as Profile);
      const sorted = ((birthdayResult.data || []) as Birthday[]).sort((a, b) => daysUntilBirthday(a.date_of_birth) - daysUntilBirthday(b.date_of_birth));
      setBirthdays(sorted);
      setNotices((noticeResult.data || []) as Notice[]);
      const names = (roleResult.data || []).map((item: any) => item.roles?.name).filter(Boolean) as RoleName[];
      setRoles(names.length ? names : ["member"]);
      setLoading(false);
    };
    load();
  }, [session.user.id]);

  const title = view === "home" ? "Home" : view[0].toUpperCase() + view.slice(1);

  return <div className="appShell">
    <aside className={"sidebar " + (menuOpen ? "open" : "")}>
      <div className="sidebarTop"><Brand /><button className="iconButton mobileClose" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button></div>
      <nav>
        <span className="navLabel">Community</span>
        {nav.filter(item => !item.protected || isAdmin).map(item => <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => { setView(item.id); setMenuOpen(false); }}><item.icon />{item.label}{item.id === "admin" && <span className="navDot" />}</button>)}
      </nav>
      <div className="sidebarFooter">
        <button onClick={() => setView("profile")}><Avatar profile={profile} size="small" /><span><strong>{profile?.full_name || "Member"}</strong><small>{roles.map(role => roleLabels[role]).join(", ")}</small></span><Settings size={17} /></button>
        <button className="signOut" onClick={() => supabase.auth.signOut()}><LogOut size={18} /> Sign out</button>
      </div>
    </aside>
    {menuOpen && <button className="backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
    <main className="mainContent">
      <header className="topbar">
        <button className="iconButton menuButton" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></button>
        <div><small>TACN Connect</small><strong>{title}</strong></div>
        <div className="topActions">
          <label className="search"><Search /><input placeholder="Search community" aria-label="Search community" /></label>
          <button className="iconButton" onClick={() => setDark(value => !value)} aria-label={dark ? "Use light appearance" : "Use dark appearance"}>{dark ? <Sun /> : <Moon />}</button>
          <button className="iconButton notificationButton" aria-label="Notifications"><Bell />{notices.length > 0 && <span>{notices.length}</span>}</button>
          <Avatar profile={profile} size="small" />
        </div>
      </header>

      <div className="page">
        {loading ? <div className="loadingState"><LoaderCircle className="spin" /><p>Preparing your community</p></div> :
        view === "home" ? <><Welcome profile={profile} birthdays={birthdays} /><BirthdayList birthdays={birthdays} /><QuickActions isAdmin={isAdmin} /></> :
        view === "birthdays" ? <PageIntro eyebrow="Birthday ministry" title="Make every celebration meaningful" text="See upcoming birthdays, prepare greetings, and create beautiful celebration moments." children={<BirthdayList birthdays={birthdays} />} /> :
        view === "events" ? <EventsPanel canManage={roles.some(role => ["general_admin", "admin", "event_manager"].includes(role))} /> :
        view === "members" ? <MembersPanel /> :
        view === "messages" ? <MessagesPanel notices={notices} /> :
        view === "admin" ? <ManagementAdminPanel /> :
        <ProfilePanel profile={profile} onSaved={setProfile} />}
      </div>
    </main>
  </div>;
}

function PageIntro({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children: React.ReactNode }) {
  return <><section className="pageIntro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></section>{children}</>;
}

function QuickActions({ isAdmin }: { isAdmin: boolean }) {
  const actions = [
    [Gift, "Create birthday flyer", "Design a warm greeting"],
    [CalendarDays, "Add an event", "Keep everyone informed"],
    [MessageCircle, "Share an announcement", "Reach the church family"],
    [Users, isAdmin ? "Review registrations" : "Find a member", isAdmin ? "Welcome new people" : "Stay connected"],
  ] as const;
  return <section className="sectionBlock"><div className="sectionHead"><div><span className="eyebrow">Useful shortcuts</span><h2>Quick actions</h2></div></div><div className="actionGrid">{actions.map(([Icon, title, text]) => <button key={title}><span><Icon /></span><div><strong>{title}</strong><small>{text}</small></div><ChevronRight /></button>)}</div></section>;
}

function MembersPanel() {
  return <PageIntro eyebrow="Church family" title="People, not just records" text="Find members while keeping private information protected."><div className="emptyState large"><Users /><h3>Member directory</h3><p>Approved member profiles will appear here according to their privacy choices.</p></div></PageIntro>;
}

function MessagesPanel({ notices }: { notices: Notice[] }) {
  return <PageIntro eyebrow="Stay informed" title="Messages and announcements" text="Important updates from your church leadership."><div className="noticeList">{notices.length ? notices.map(item => <article key={item.id}><span><Bell /></span><div><h3>{item.title}</h3><p>{item.body}</p><small>{new Date(item.created_at).toLocaleDateString("en-NG")}</small></div></article>) : <div className="emptyState large"><Bell /><h3>All caught up</h3><p>New announcements will appear here.</p></div>}</div></PageIntro>;
}

function AdminPanel() {
  const [pending, setPending] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("profiles").select("*").eq("account_status", "pending").order("created_at", { ascending: false }).then(({ data }) => {
      setPending((data || []) as Profile[]); setLoading(false);
    });
  }, []);
  return <PageIntro eyebrow="General administration" title="Care for the whole community" text="Review registrations, manage access, and keep church information healthy.">
    <div className="adminStats"><article><Users /><div><strong>{pending.length}</strong><span>New registrations</span></div></article><article><ShieldCheck /><div><strong>Protected</strong><span>Database policies active</span></div></article><article><Bell /><div><strong>Ready</strong><span>Notification centre</span></div></article></div>
    <section className="sectionBlock"><div className="sectionHead"><div><span className="eyebrow">Needs attention</span><h2>New registrations</h2></div><button className="softButton">Manage roles</button></div>
      {loading ? <LoaderCircle className="spin" /> : pending.length ? <div className="registrationList">{pending.map(person => <article key={person.id}><Avatar profile={person} /><div><h3>{person.full_name}</h3><p>{person.email}</p><small>Joined {new Date(person.created_at).toLocaleDateString("en-NG")}</small></div><span className="statusPill">Pending</span><button className="primaryButton compact">Review</button></article>)}</div> : <div className="emptyState"><Check /><h3>No pending registrations</h3><p>Every new member has been reviewed.</p></div>}
    </section>
  </PageIntro>;
}

function ProfilePanel({ profile, onSaved }: { profile: Profile | null; onSaved: (profile: Profile) => void }) {
  const [form, setForm] = useState({ full_name: profile?.full_name || "", phone: profile?.phone || "", date_of_birth: profile?.date_of_birth || "", bio: profile?.bio || "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const upload = async (file?: File) => {
    if (!file || !profile) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) return setMessage("Choose a JPG, PNG, or WebP image smaller than 5 MB.");
    setBusy(true); setMessage("Uploading photograph");
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = profile.id + "/avatar." + extension;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) { setMessage(friendlyError(uploadError)); setBusy(false); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatar_url = data.publicUrl + "?v=" + Date.now();
    const { data: updated } = await supabase.from("profiles").update({ avatar_url }).eq("id", profile.id).select().single();
    if (updated) onSaved(updated as Profile);
    setMessage("Profile photograph updated"); setBusy(false);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!profile) return; setBusy(true); setMessage("");
    const { data, error } = await supabase.from("profiles").update(form).eq("id", profile.id).select().single();
    if (error) setMessage(friendlyError(error)); else { onSaved(data as Profile); setMessage("Profile saved successfully"); }
    setBusy(false);
  };
  return <PageIntro eyebrow="Your account" title="Profile and preferences" text="Keep your details accurate and choose the photograph used in celebrations.">
    <div className="profileLayout"><aside className="profilePhotoCard"><Avatar profile={profile} size="large" /><h3>{profile?.full_name}</h3><p>{profile?.email}</p><label className="softButton uploadButton"><Camera /> {busy ? "Please wait" : "Change photograph"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e.target.files?.[0])} /></label><small>JPG, PNG, or WebP. Maximum 5 MB.</small></aside>
      <form className="profileForm" onSubmit={save}><h2>Personal details</h2>{message && <div className="notice success">{message}</div>}<div className="formGrid"><label>Full name<input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></label><label>Phone number<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label><label>Birthday<input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></label><label className="wide">Short biography<textarea rows={4} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Share a short sentence about yourself" /></label></div><button className="primaryButton" disabled={busy}><Check /> Save profile</button></form>
    </div>
  </PageIntro>;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecking(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setChecking(false); });
    return () => data.subscription.unsubscribe();
  }, []);
  if (checking) return <div className="splash"><Brand /><LoaderCircle className="spin" /></div>;
  return session ? <Dashboard session={session} /> : <AuthScreen onReady={() => undefined} />;
}
