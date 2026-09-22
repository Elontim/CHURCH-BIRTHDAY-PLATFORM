import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, LoaderCircle, ShieldCheck, UserCheck, Users, X } from "lucide-react";
import { friendlyError, supabase } from "../lib/supabase";
import type { Profile, RoleName } from "../types";

type Role = { id: string; name: RoleName; label: string; description: string };
type Assignment = { user_id: string; role_id: string };

export default function AdminPanel() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [membersResult, rolesResult, assignmentsResult] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("roles").select("id,name,label,description").order("label"),
      supabase.from("user_roles").select("user_id,role_id"),
    ]);
    if (membersResult.error || rolesResult.error || assignmentsResult.error) {
      setMessage(friendlyError(membersResult.error || rolesResult.error || assignmentsResult.error));
    } else {
      setMembers((membersResult.data || []) as Profile[]);
      setRoles((rolesResult.data || []) as Role[]);
      setAssignments((assignmentsResult.data || []) as Assignment[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pending = useMemo(() => members.filter(member => member.account_status === "pending"), [members]);
  const selectedRoleIds = selected
    ? assignments.filter(item => item.user_id === selected.id).map(item => item.role_id)
    : [];

  const setStatus = async (member: Profile, status: Profile["account_status"]) => {
    setBusy(member.id); setMessage("");
    const { error } = await supabase.from("profiles").update({
      account_status: status,
      approved_at: status === "active" ? new Date().toISOString() : null,
    }).eq("id", member.id);
    if (error) setMessage(friendlyError(error));
    else {
      setMembers(current => current.map(item => item.id === member.id ? { ...item, account_status: status } : item));
      setMessage(status === "active" ? member.full_name + " is now an approved member." : "Account status updated.");
    }
    setBusy("");
  };

  const toggleRole = async (role: Role, enabled: boolean) => {
    if (!selected) return;
    setBusy(role.id); setMessage("");
    const result = enabled
      ? await supabase.from("user_roles").insert({ user_id: selected.id, role_id: role.id })
      : await supabase.from("user_roles").delete().eq("user_id", selected.id).eq("role_id", role.id);
    if (result.error) setMessage(friendlyError(result.error));
    else {
      setAssignments(current => enabled
        ? [...current, { user_id: selected.id, role_id: role.id }]
        : current.filter(item => !(item.user_id === selected.id && item.role_id === role.id)));
    }
    setBusy("");
  };

  const grantAll = async () => {
    if (!selected) return;
    setBusy("all"); setMessage("");
    const records = roles.map(role => ({ user_id: selected.id, role_id: role.id }));
    const { error } = await supabase.from("user_roles").upsert(records, { onConflict: "user_id,role_id", ignoreDuplicates: true });
    if (error) setMessage(friendlyError(error));
    else {
      const others = assignments.filter(item => item.user_id !== selected.id);
      setAssignments([...others, ...records]);
      setMessage("All available roles have been granted to " + selected.full_name + ".");
    }
    setBusy("");
  };

  const initials = (name: string) => name.split(" ").slice(0, 2).map(part => part[0]).join("").toUpperCase();

  if (loading) return <div className="loadingState"><LoaderCircle className="spin" /><p>Loading administration tools</p></div>;

  return <>
    <section className="pageIntro">
      <span className="eyebrow">General administration</span>
      <h1>Care for the whole community</h1>
      <p>Welcome new members, manage account access, and assign responsibilities clearly.</p>
    </section>

    {message && <div className="notice success" role="status">{message}</div>}

    <div className="adminStats">
      <article><Users /><div><strong>{members.length}</strong><span>Total accounts</span></div></article>
      <article><UserCheck /><div><strong>{pending.length}</strong><span>Awaiting review</span></div></article>
      <article><ShieldCheck /><div><strong>{roles.length}</strong><span>Available roles</span></div></article>
    </div>

    <section className="sectionBlock">
      <div className="sectionHead"><div><span className="eyebrow">Needs attention</span><h2>New registrations</h2></div></div>
      {pending.length ? <div className="registrationList">{pending.map(member => <article key={member.id}>
        <span className="avatar avatarFallback">{initials(member.full_name)}</span>
        <div><h3>{member.full_name}</h3><p>{member.email}</p><small>Registered {new Date(member.created_at).toLocaleDateString("en-NG")}</small></div>
        <span className="statusBadge pending">Pending</span>
        <button className="softButton" onClick={() => setSelected(member)}>View access</button>
        <button className="primaryButton compact" disabled={busy === member.id} onClick={() => setStatus(member, "active")}>
          {busy === member.id ? <LoaderCircle className="spin" /> : <Check />} Approve
        </button>
      </article>)}</div> : <div className="emptyState"><Check /><h3>Everything is reviewed</h3><p>There are no pending registrations.</p></div>}
    </section>

    <section className="sectionBlock">
      <div className="sectionHead"><div><span className="eyebrow">Access control</span><h2>Members and roles</h2></div></div>
      <div className="memberAdminTable">
        {members.map(member => <button key={member.id} onClick={() => setSelected(member)}>
          <span className="avatar avatarFallback small">{initials(member.full_name)}</span>
          <span><strong>{member.full_name}</strong><small>{member.email}</small></span>
          <span className={"statusBadge " + member.account_status}>{member.account_status}</span>
          <ChevronDown />
        </button>)}
      </div>
    </section>

    {selected && <div className="modalBackdrop" role="presentation" onMouseDown={() => setSelected(null)}>
      <section className="roleModal" role="dialog" aria-modal="true" aria-labelledby="role-title" onMouseDown={event => event.stopPropagation()}>
        <header><div><span className="eyebrow">Role management</span><h2 id="role-title">{selected.full_name}</h2><p>{selected.email}</p></div><button className="iconButton" onClick={() => setSelected(null)} aria-label="Close role management"><X /></button></header>
        <button className="grantAllButton" onClick={grantAll} disabled={busy === "all"}><ShieldCheck /> <span><strong>Grant All Access</strong><small>Assign every available role and permission</small></span>{busy === "all" ? <LoaderCircle className="spin" /> : <Check />}</button>
        <div className="roleChoices">{roles.map(role => {
          const checked = selectedRoleIds.includes(role.id);
          return <label key={role.id}><input type="checkbox" checked={checked} disabled={busy === role.id} onChange={event => toggleRole(role, event.target.checked)} /><span><strong>{role.label}</strong><small>{role.description}</small></span></label>;
        })}</div>
        <footer>
          {selected.account_status !== "active" ? <button className="primaryButton" onClick={() => setStatus(selected, "active")}><Check /> Approve account</button> : <button className="dangerButton" onClick={() => setStatus(selected, "suspended")}>Suspend account</button>}
          <button className="softButton" onClick={() => setSelected(null)}>Done</button>
        </footer>
      </section>
    </div>}
  </>;
}
