import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { useBodyScrollLock } from '@/shared/lib/useBodyScrollLock';
import { Button, TextField } from '@/shared/ui';
import { FormError, FormSuccess } from '@/shared/ui/FormFeedback/FormFeedback';
import { adminsApi } from '../api/adminsApi';
import type { AdminAccount } from '../types/admin';

const initialForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  password: '',
  password_confirm: '',
};

export const MembersPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  useBodyScrollLock(isOpen);

  const loadAdmins = async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const data = await adminsApi.list();
      setAdmins(data);
    } catch (error) {
      setListError(extractErrorMessage(error, 'Could not load admins.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
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
      const created = await adminsApi.create(form);
      setSuccessMessage(`Admin ${created.full_name || created.email} created successfully.`);
      closeDialog();
      await loadAdmins();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Could not create admin account.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="mb-2 font-serif text-2xl text-[#2B241E]">Admins</h2>
          <p className="text-sm text-[#786A58]">Create and manage admin accounts with full dashboard access.</p>
        </div>
        <Button type="button" className="px-5 py-3" onClick={() => { setErrorMessage(null); setSuccessMessage(null); setIsOpen(true); }}>
          <Plus size={16} />
          Create Admin
        </Button>
      </div>

      <FormSuccess message={successMessage} />
      <FormError message={listError} />

      <div className="overflow-hidden rounded-3xl border border-[#2B241E]/10 bg-white/35">
        {isLoading ? (
          <p className="p-6 text-sm text-[#786A58]">Loading admins...</p>
        ) : admins.length === 0 ? (
          <p className="p-6 text-sm text-[#786A58]">No admins yet. Add one to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#2B241E]/10 text-xs uppercase tracking-widest text-[#786A58]">
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Phone</th>
                  <th className="px-6 py-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-[#2B241E]/5 text-[#2B241E] last:border-b-0">
                    <td className="px-6 py-4">{admin.full_name || '—'}</td>
                    <td className="px-6 py-4">{admin.email}</td>
                    <td className="px-6 py-4">{admin.phone_number || '—'}</td>
                    <td className="px-6 py-4">{new Date(admin.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B241E]/35 px-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/70 bg-[#F5EFE5] p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl text-[#2B241E]">Create Admin</h3>
                <p className="mt-1 text-sm text-[#786A58]">This creates a new admin account with full dashboard access.</p>
              </div>
              <button type="button" onClick={closeDialog} className="text-sm uppercase tracking-widest text-[#786A58] hover:text-[#2B241E]">
                Close
              </button>
            </div>

            <FormError message={errorMessage} />

            <form className="space-y-5" onSubmit={handleSubmit}>
              <TextField
                label="First Name"
                name="first_name"
                value={form.first_name}
                onChange={(event) => handleChange('first_name', event.target.value)}
                required
              />
              <TextField
                label="Last Name"
                name="last_name"
                value={form.last_name}
                onChange={(event) => handleChange('last_name', event.target.value)}
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={(event) => handleChange('email', event.target.value)}
                required
              />
              <div>
                <TextField
                  label="Phone Number"
                  name="phone_number"
                  type="tel"
                  value={form.phone_number}
                  onChange={(event) => handleChange('phone_number', event.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-[#786A58]">Use a number reachable on WhatsApp only.</p>
              </div>
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
                  {isSubmitting ? 'Creating...' : 'Create Admin'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
