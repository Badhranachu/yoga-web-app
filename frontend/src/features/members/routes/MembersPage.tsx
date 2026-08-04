import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { useBodyScrollLock } from '@/shared/lib/useBodyScrollLock';
import { Button, TextField } from '@/shared/ui';
import { FormError, FormSuccess } from '@/shared/ui/FormFeedback/FormFeedback';
import { membersApi } from '../api/membersApi';
import type { UserProfile } from '../types';

const initialForm = {
  username: '',
  email: '',
  password: '',
  password_confirm: '',
};

export const MembersPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  useBodyScrollLock(isOpen);

  const loadMembers = async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const data = await membersApi.list();
      setMembers(data);
    } catch (error) {
      setListError(extractErrorMessage(error, 'Could not load members.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const closeDialog = () => {
    setIsOpen(false);
    setIsSubmitting(false);
    setErrorMessage(null);
    setForm(initialForm);
  };

  const handleChange = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const created = await membersApi.create(form);
      setSuccessMessage(`Member ${created.username ?? created.email} created successfully.`);
      closeDialog();
      await loadMembers();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Could not create member account.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="mb-2 font-serif text-2xl text-[#2B241E]">Members</h2>
          <p className="text-sm text-[#786A58]">Create normal member accounts manually from the admin dashboard.</p>
        </div>
        <Button type="button" className="px-5 py-3" onClick={() => { setErrorMessage(null); setSuccessMessage(null); setIsOpen(true); }}>
          <Plus size={16} />
          Add Member
        </Button>
      </div>

      <FormSuccess message={successMessage} />
      <FormError message={listError} />

      <div className="overflow-hidden rounded-3xl border border-[#2B241E]/10 bg-white/35">
        {isLoading ? (
          <p className="p-6 text-sm text-[#786A58]">Loading members...</p>
        ) : members.length === 0 ? (
          <p className="p-6 text-sm text-[#786A58]">No members yet. Add one to get started.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#2B241E]/10 text-xs uppercase tracking-widest text-[#786A58]">
                <th className="px-6 py-4 font-medium">Username</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-[#2B241E]/5 text-[#2B241E] last:border-b-0">
                  <td className="px-6 py-4">{member.username ?? '—'}</td>
                  <td className="px-6 py-4">{member.email}</td>
                  <td className="px-6 py-4 capitalize">{member.role}</td>
                  <td className="px-6 py-4">{new Date(member.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B241E]/35 px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-white/70 bg-[#F5EFE5] p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl text-[#2B241E]">Add Member</h3>
                <p className="mt-1 text-sm text-[#786A58]">This creates a normal user in the custom user model and a linked user profile.</p>
              </div>
              <button type="button" onClick={closeDialog} className="text-sm uppercase tracking-widest text-[#786A58] hover:text-[#2B241E]">
                Close
              </button>
            </div>

            <FormError message={errorMessage} />

            <form className="space-y-5" onSubmit={handleSubmit}>
              <TextField
                label="Username"
                name="username"
                value={form.username}
                onChange={(event) => handleChange('username', event.target.value)}
                required
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={(event) => handleChange('email', event.target.value)}
                required
              />
              <TextField
                label="Password"
                name="password"
                type="password"
                value={form.password}
                onChange={(event) => handleChange('password', event.target.value)}
                required
              />
              <TextField
                label="Confirm Password"
                name="password_confirm"
                type="password"
                value={form.password_confirm}
                onChange={(event) => handleChange('password_confirm', event.target.value)}
                required
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" className="px-5 py-3" onClick={closeDialog} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="px-5 py-3" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Member'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
