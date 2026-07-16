import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  adminResetUserPassword,
} from "@/lib/user-management.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Pencil, KeyRound, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { audit } from "@/lib/audit";

export type ManagedRole = "driver" | "student" | "faculty";
export type ManagedPerson = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  roll_no?: string | null;
  employee_id?: string | null;
  license_no?: string | null;
  department?: string | null;
  branch?: string | null;
  section?: string | null;
  year_of_study?: number | null;
  student_status?: string | null;
};

const roleLabel: Record<ManagedRole, string> = {
  driver: "Driver",
  student: "Student",
  faculty: "Faculty",
};

function passwordResetRedirect(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/reset-password`;
}

export function AddUserButton({
  role,
  onChange,
}: {
  role: ManagedRole;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <UserPlus className="h-4 w-4" /> Add {roleLabel[role]}
        </Button>
      </DialogTrigger>
      <UserFormDialogBody
        mode="create"
        role={role}
        onClose={() => setOpen(false)}
        onDone={() => {
          setOpen(false);
          onChange();
        }}
      />
    </Dialog>
  );
}

export function UserRowActions({
  person,
  role,
  onChange,
}: {
  person: ManagedPerson;
  role: ManagedRole;
  onChange: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const deleteFn = useServerFn(adminDeleteUser);
  const resetFn = useServerFn(adminResetUserPassword);
  const updateFn = useServerFn(adminUpdateUser);

  async function handleDelete() {
    if (!confirm(`Delete this ${roleLabel[role].toLowerCase()}? This removes their account permanently.`)) return;
    try {
      await deleteFn({ data: { userId: person.id } });
      audit(`${role}.delete`, { entityType: "profile", entityId: person.id, before: person });
      toast.success("Account deleted");
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function handleReset() {
    if (!person.email) return toast.error("No email on file");
    try {
      await resetFn({ data: { email: person.email, redirect_to: passwordResetRedirect() } });
      audit(`${role}.password_reset`, { entityType: "profile", entityId: person.id });
      toast.success("Password reset email sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
    }
  }

  async function handleToggleActive() {
    const nowActive = (person.student_status ?? "active") === "active";
    const next = nowActive ? "inactive" : "active";
    try {
      await updateFn({ data: { userId: person.id, patch: { student_status: next } } });
      audit(`${role}.${nowActive ? "deactivate" : "activate"}`, {
        entityType: "profile",
        entityId: person.id,
      });
      toast.success(nowActive ? "Deactivated" : "Activated");
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)} aria-label="Edit">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleReset} aria-label="Reset password">
        <KeyRound className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleToggleActive} aria-label="Toggle active">
        <Power
          className={`h-4 w-4 ${(person.student_status ?? "active") === "active" ? "text-emerald-500" : "text-muted-foreground"}`}
        />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleDelete} aria-label="Delete">
        <Trash2 className="h-4 w-4" />
      </Button>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <UserFormDialogBody
          mode="edit"
          role={role}
          person={person}
          onClose={() => setEditOpen(false)}
          onDone={() => {
            setEditOpen(false);
            onChange();
          }}
        />
      </Dialog>
    </div>
  );
}

function UserFormDialogBody({
  mode,
  role,
  person,
  onClose,
  onDone,
}: {
  mode: "create" | "edit";
  role: ManagedRole;
  person?: ManagedPerson;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    email: person?.email ?? "",
    password: "",
    full_name: person?.full_name ?? "",
    phone: person?.phone ?? "",
    roll_no: person?.roll_no ?? "",
    employee_id: person?.employee_id ?? "",
    license_no: person?.license_no ?? "",
    department: person?.department ?? "",
    branch: person?.branch ?? "",
    section: person?.section ?? "",
    year_of_study: person?.year_of_study ?? null,
  });
  const [sendReset, setSendReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const createFn = useServerFn(adminCreateUser);
  const updateFn = useServerFn(adminUpdateUser);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "create") {
        if (!form.email.trim() || form.password.length < 6) {
          toast.error("Email and a 6+ character password are required");
          setBusy(false);
          return;
        }
        await createFn({
          data: {
            email: form.email.trim(),
            password: form.password,
            role,
            full_name: form.full_name.trim() || undefined,
            phone: form.phone.trim() || undefined,
            roll_no: role === "student" ? form.roll_no.trim() || undefined : undefined,
            employee_id: role === "faculty" ? form.employee_id.trim() || undefined : undefined,
            license_no: role === "driver" ? form.license_no.trim() || undefined : undefined,
            department: form.department.trim() || undefined,
            branch: form.branch.trim() || undefined,
            section: form.section.trim() || undefined,
            year_of_study: form.year_of_study ?? undefined,
            send_reset_email: sendReset,
            redirect_to: sendReset ? passwordResetRedirect() : undefined,
          },
        });
        audit(`${role}.create`, { entityType: "profile", after: { email: form.email, role } });
        toast.success(`${roleLabel[role]} created`);
      } else if (person) {
        await updateFn({
          data: {
            userId: person.id,
            patch: {
              full_name: form.full_name.trim() || null,
              phone: form.phone.trim() || null,
              roll_no: role === "student" ? form.roll_no.trim() || null : null,
              employee_id: role === "faculty" ? form.employee_id.trim() || null : null,
              license_no: role === "driver" ? form.license_no.trim() || null : null,
              department: form.department.trim() || null,
              branch: form.branch.trim() || null,
              section: form.section.trim() || null,
              year_of_study: form.year_of_study,
            },
          },
        });
        audit(`${role}.update`, { entityType: "profile", entityId: person.id, after: form });
        toast.success("Updated");
      }
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {mode === "create" ? `Add ${roleLabel[role]}` : `Edit ${roleLabel[role]}`}
        </DialogTitle>
        <DialogDescription>
          {mode === "create"
            ? `Create a new ${roleLabel[role].toLowerCase()} account. The user will be able to sign in with the email and password you set.`
            : `Update profile details. To reset a password, use the key icon on the row.`}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 space-y-1.5">
            <Label>Full name</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Email {mode === "edit" && <span className="text-xs text-muted-foreground">(read-only)</span>}</Label>
            <Input
              type="email"
              required
              disabled={mode === "edit"}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          {mode === "create" && (
            <div className="col-span-2 space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          {role === "student" && (
            <>
              <div className="space-y-1.5">
                <Label>Roll no.</Label>
                <Input value={form.roll_no} onChange={(e) => setForm({ ...form, roll_no: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <Input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Select
                  value={form.year_of_study ? String(form.year_of_study) : ""}
                  onValueChange={(v) => setForm({ ...form, year_of_study: v ? Number(v) : null })}
                >
                  <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((y) => (
                      <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Section</Label>
                <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
              </div>
            </>
          )}
          {role === "faculty" && (
            <div className="space-y-1.5 col-span-2">
              <Label>Employee ID</Label>
              <Input value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
            </div>
          )}
          {role === "driver" && (
            <div className="space-y-1.5 col-span-2">
              <Label>Licence no.</Label>
              <Input value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} />
            </div>
          )}
          {mode === "create" && (
            <label className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={sendReset}
                onChange={(e) => setSendReset(e.target.checked)}
              />
              Also email a password reset link
            </label>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : mode === "create" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}