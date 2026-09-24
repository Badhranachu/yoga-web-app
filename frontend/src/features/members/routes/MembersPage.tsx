import { useEffect, useMemo, useRef, useState } from 'react';
import { MoreVertical, Plus } from 'lucide-react';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { useBodyScrollLock } from '@/shared/lib/useBodyScrollLock';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button, TextField } from '@/shared/ui';
import { FormError, FormSuccess } from '@/shared/ui/FormFeedback/FormFeedback';
import { adminsApi } from '../api/adminsApi';
import { membersApi } from '../api/membersApi';

type CreateKind = 'admin' | 'customer';
type RoleFilter = 'all' | 'admin' | 'customer';

type AccountRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'customer';
  createdAt: string;
};

const initialAdminForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  password: '',
  password_confirm: '',
};

const initialCustomerForm = {
  username: '',
  email: '',
  password: '',
  password_confirm: '',
};

const initialEditAdminForm = {
  first_name: '',
  last_name: '',
  phone_number: '',
  password: '',
};

const initialEditCustomerForm = {
  username: '',
  email: '',
  password: '',
};

const ROLE_TABS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'admin', label: 'Admins' },
  { value: 'customer', label: 'Customers' },
];

export const MembersPage = () => {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState<CreateKind | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState(initialAdminForm);
  const [customerForm, setCustomerForm] = useState(initialCustomerForm);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const menuRef = useRef<HTMLDivElement>(null);

  const [rowMenu, setRowMenu] = useState<{ account: AccountRow; top: number; right: number } | null>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null);
  const [editAdminForm, setEditAdminForm] = useState(initialEditAdminForm);
  const [editCustomerForm, setEditCustomerForm] = useState(initialEditCustomerForm);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<AccountRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useBodyScrollLock(openDialog !== null || editingAccount !== null || deletingAccount !== null);

  const loadAccounts = async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const [admins, customers] = await Promise.all([adminsApi.list(), membersApi.list()]);
      const adminRows: AccountRow[] = admins.map((admin) => ({
        id: admin.id,
        name: admin.full_name || '—',
        email: admin.email,
        phone: admin.phone_number || '—',
        role: 'admin',
        createdAt: admin.created_at,
      }));
      const customerRows: AccountRow[] = customers.map((customer) => ({
        id: customer.id,
        name: customer.username || '—',
        email: customer.email,
        phone: '—',
        role: 'customer',
        createdAt: customer.created_at,
      }));
      setAccounts(
        [...adminRows, ...customerRows].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
    } catch (error) {
      setListError(extractErrorMessage(error, 'Could not load accounts.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (!menuOpen && !rowMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (rowMenu && rowMenuRef.current && !rowMenuRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('[aria-label="Account options"]')) {
          setRowMenu(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, rowMenu]);

  const closeDialog = () => {
    setOpenDialog(null);
    setIsSubmitting(false);
    setErrorMessage(null);
    setAdminForm(initialAdminForm);
    setCustomerForm(initialCustomerForm);
  };

  const handleAdminChange = (field: keyof typeof initialAdminForm, value: string) => {
    setAdminForm((current) => ({ ...current, [field]: value }));
  };

  const handleCustomerChange = (field: keyof typeof initialCustomerForm, value: string) => {
    setCustomerForm((current) => ({ ...current, [field]: value }));
  };

  const handleAdminSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const created = await adminsApi.create(adminForm);
      setSuccessMessage(`Admin ${created.full_name || created.email} created successfully.`);
      closeDialog();
      await loadAccounts();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Could not create admin account.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const created = await membersApi.create(customerForm);
      setSuccessMessage(`Customer ${created.username || created.email} created successfully.`);
      closeDialog();
      await loadAccounts();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Could not create customer account.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (account: AccountRow) => {
    setRowMenu(null);
    setEditError(null);
    setEditingAccount(account);
    if (account.role === 'admin') {
      const [first_name = '', ...rest] = account.name === '—' ? [''] : account.name.split(' ');
      setEditAdminForm({ first_name, last_name: rest.join(' '), phone_number: account.phone === '—' ? '' : account.phone, password: '' });
    } else {
      setEditCustomerForm({ username: account.name === '—' ? '' : account.name, email: account.email, password: '' });
    }
  };

  const closeEditDialog = () => {
    setEditingAccount(null);
    setIsSavingEdit(false);
    setEditError(null);
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingAccount) return;
    setIsSavingEdit(true);
    setEditError(null);

    try {
      if (editingAccount.role === 'admin') {
        const payload = {
          first_name: editAdminForm.first_name,
          last_name: editAdminForm.last_name,
          phone_number: editAdminForm.phone_number,
          ...(editAdminForm.password ? { password: editAdminForm.password } : {}),
        };
        await adminsApi.update(editingAccount.id, payload);
      } else {
        const payload = {
          username: editCustomerForm.username,
          email: editCustomerForm.email,
          ...(editCustomerForm.password ? { password: editCustomerForm.password } : {}),
        };
        await membersApi.update(editingAccount.id, payload);
      }
      closeEditDialog();
      await loadAccounts();
    } catch (error) {
      setEditError(extractErrorMessage(error, 'Could not update this account.'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingAccount) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (deletingAccount.role === 'admin') {
        await adminsApi.remove(deletingAccount.id);
      } else {
        await membersApi.remove(deletingAccount.id);
      }
      setDeletingAccount(null);
      await loadAccounts();
    } catch (error) {
      setDeleteError(extractErrorMessage(error, 'Could not remove this account.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAccounts = useMemo(
    () => (roleFilter === 'all' ? accounts : accounts.filter((account) => account.role === roleFilter)),
    [accounts, roleFilter],
  );

  const isSelf = (account: AccountRow) => account.role === 'admin' && account.id === user?.id;

  const RowMenu = ({ account }: { account: AccountRow }) => (
    <button
      type="button"
      aria-label="Account options"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setRowMenu((current) =>
          current?.account.id === account.id && current.account.role === account.role
            ? null
            : { account, top: rect.bottom + 4, right: window.innerWidth - rect.right },
        );
      }}
      className="rounded-full p-1.5 text-[#786A58] hover:bg-[#2B241E]/5 hover:text-[#2B241E]"
    >
      <MoreVertical size={16} />
    </button>
  );

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="mb-2 font-serif text-2xl text-[#2B241E]">Members</h2>
          <p className="text-sm text-[#786A58]">View and manage all admin and customer accounts.</p>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="Add account"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2B241E] text-white transition-colors duration-300 hover:bg-[#D8B46A]"
          >
            <Plus size={20} />
          </button>

          {menuOpen && (
            <div className="absolute left-0 z-20 mt-2 w-48 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#2B241E]/10 bg-[#F5EFE5] shadow-xl">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setOpenDialog('admin');
                }}
                className="block w-full px-5 py-3 text-left text-sm text-[#2B241E] hover:bg-[#2B241E]/5"
              >
                Add Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setOpenDialog('customer');
                }}
                className="block w-full px-5 py-3 text-left text-sm text-[#2B241E] hover:bg-[#2B241E]/5"
              >
                Add Customer
              </button>
            </div>
          )}
        </div>
      </div>

      <FormSuccess message={successMessage} />
      <FormError message={listError} />

      <div className="mb-4 flex gap-2">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setRoleFilter(tab.value)}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
              roleFilter === tab.value
                ? 'bg-[#2B241E] text-white'
                : 'border border-[#2B241E]/15 text-[#786A58] hover:border-[#D8B46A] hover:text-[#2B241E]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#2B241E]/10 bg-white/35">
        {isLoading ? (
          <p className="p-6 text-sm text-[#786A58]">Loading accounts...</p>
        ) : filteredAccounts.length === 0 ? (
          <p className="p-6 text-sm text-[#786A58]">No accounts yet. Add one to get started.</p>
        ) : (
          <>
            {/* Mobile: stacked cards, no horizontal scroll */}
            <div className="divide-y divide-[#2B241E]/5 sm:hidden">
              {filteredAccounts.map((account) => (
                <div key={`${account.role}-${account.id}`} className="space-y-2 p-4 text-sm text-[#2B241E]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium">{account.name}</span>
                      {isSelf(account) && (
                        <span className="shrink-0 rounded-full bg-[#2B241E] px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-white">
                          You
                        </span>
                      )}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest ${
                          account.role === 'admin' ? 'bg-[#D8B46A]/15 text-[#D8B46A]' : 'bg-[#2B241E]/10 text-[#786A58]'
                        }`}
                      >
                        {account.role}
                      </span>
                      <RowMenu account={account} />
                    </div>
                  </div>
                  <div className="break-all text-[#786A58]">{account.email}</div>
                  <div className="flex justify-between text-xs text-[#786A58]">
                    <span>{account.phone}</span>
                    <span>{new Date(account.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/tablet: full table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#2B241E]/10 text-xs uppercase tracking-widest text-[#786A58]">
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 font-medium">Phone</th>
                    <th className="px-6 py-4 font-medium">Created</th>
                    <th className="px-6 py-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account) => (
                    <tr key={`${account.role}-${account.id}`} className="border-b border-[#2B241E]/5 text-[#2B241E] last:border-b-0">
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2">
                          {account.name}
                          {isSelf(account) && (
                            <span className="rounded-full bg-[#2B241E] px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-white">
                              You
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">{account.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest ${
                            account.role === 'admin' ? 'bg-[#D8B46A]/15 text-[#D8B46A]' : 'bg-[#2B241E]/10 text-[#786A58]'
                          }`}
                        >
                          {account.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">{account.phone}</td>
                      <td className="px-6 py-4">{new Date(account.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <RowMenu account={account} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {openDialog === 'admin' && (
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

            <form className="space-y-5" onSubmit={handleAdminSubmit}>
              <TextField
                label="Email"
                name="email"
                type="email"
                value={adminForm.email}
                onChange={(event) => handleAdminChange('email', event.target.value)}
                required
              />
              <TextField
                label="First Name"
                name="first_name"
                value={adminForm.first_name}
                onChange={(event) => handleAdminChange('first_name', event.target.value)}
                required
              />
              <TextField
                label="Last Name"
                name="last_name"
                value={adminForm.last_name}
                onChange={(event) => handleAdminChange('last_name', event.target.value)}
              />
              <div>
                <TextField
                  label="Phone Number"
                  name="phone_number"
                  type="tel"
                  value={adminForm.phone_number}
                  onChange={(event) => handleAdminChange('phone_number', event.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-[#786A58]">Use a number reachable on WhatsApp only.</p>
              </div>
              <TextField
                label="Password"
                name="password"
                type="password"
                value={adminForm.password}
                onChange={(event) => handleAdminChange('password', event.target.value)}
                required
              />
              <TextField
                label="Confirm Password"
                name="password_confirm"
                type="password"
                value={adminForm.password_confirm}
                onChange={(event) => handleAdminChange('password_confirm', event.target.value)}
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

      {openDialog === 'customer' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B241E]/35 px-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/70 bg-[#F5EFE5] p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl text-[#2B241E]">Create Customer</h3>
                <p className="mt-1 text-sm text-[#786A58]">This creates a new customer account.</p>
              </div>
              <button type="button" onClick={closeDialog} className="text-sm uppercase tracking-widest text-[#786A58] hover:text-[#2B241E]">
                Close
              </button>
            </div>

            <FormError message={errorMessage} />

            <form className="space-y-5" onSubmit={handleCustomerSubmit}>
              <TextField
                label="Username"
                name="username"
                value={customerForm.username}
                onChange={(event) => handleCustomerChange('username', event.target.value)}
                required
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                value={customerForm.email}
                onChange={(event) => handleCustomerChange('email', event.target.value)}
                required
              />
              <TextField
                label="Password"
                name="password"
                type="password"
                value={customerForm.password}
                onChange={(event) => handleCustomerChange('password', event.target.value)}
                required
              />
              <TextField
                label="Confirm Password"
                name="password_confirm"
                type="password"
                value={customerForm.password_confirm}
                onChange={(event) => handleCustomerChange('password_confirm', event.target.value)}
                required
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" className="px-5 py-3" onClick={closeDialog} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="px-5 py-3" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Customer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B241E]/35 px-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/70 bg-[#F5EFE5] p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl text-[#2B241E]">Edit {editingAccount.role === 'admin' ? 'Admin' : 'Customer'}</h3>
                <p className="mt-1 text-sm text-[#786A58]">Leave the password blank to keep it unchanged.</p>
              </div>
              <button type="button" onClick={closeEditDialog} className="text-sm uppercase tracking-widest text-[#786A58] hover:text-[#2B241E]">
                Close
              </button>
            </div>

            <FormError message={editError} />

            {editingAccount.role === 'admin' ? (
              <form className="space-y-5" onSubmit={handleEditSubmit}>
                <TextField
                  label="First Name"
                  name="edit-first-name"
                  value={editAdminForm.first_name}
                  onChange={(event) => setEditAdminForm((current) => ({ ...current, first_name: event.target.value }))}
                  required
                />
                <TextField
                  label="Last Name"
                  name="edit-last-name"
                  value={editAdminForm.last_name}
                  onChange={(event) => setEditAdminForm((current) => ({ ...current, last_name: event.target.value }))}
                />
                <TextField
                  label="Phone Number"
                  name="edit-phone"
                  type="tel"
                  value={editAdminForm.phone_number}
                  onChange={(event) => setEditAdminForm((current) => ({ ...current, phone_number: event.target.value }))}
                  required
                />
                <TextField
                  label="New Password"
                  name="edit-password"
                  type="password"
                  value={editAdminForm.password}
                  onChange={(event) => setEditAdminForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Leave blank to keep the current password"
                />

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" className="px-5 py-3" onClick={closeEditDialog} disabled={isSavingEdit}>
                    Cancel
                  </Button>
                  <Button type="submit" className="px-5 py-3" disabled={isSavingEdit}>
                    {isSavingEdit ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={handleEditSubmit}>
                <TextField
                  label="Username"
                  name="edit-username"
                  value={editCustomerForm.username}
                  onChange={(event) => setEditCustomerForm((current) => ({ ...current, username: event.target.value }))}
                  required
                />
                <TextField
                  label="Email"
                  name="edit-email"
                  type="email"
                  value={editCustomerForm.email}
                  onChange={(event) => setEditCustomerForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
                <TextField
                  label="New Password"
                  name="edit-customer-password"
                  type="password"
                  value={editCustomerForm.password}
                  onChange={(event) => setEditCustomerForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Leave blank to keep the current password"
                />

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" className="px-5 py-3" onClick={closeEditDialog} disabled={isSavingEdit}>
                    Cancel
                  </Button>
                  <Button type="submit" className="px-5 py-3" disabled={isSavingEdit}>
                    {isSavingEdit ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {deletingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B241E]/35 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-[#F5EFE5] p-6 shadow-2xl">
            <h3 className="font-serif text-2xl text-[#2B241E]">Remove {deletingAccount.role === 'admin' ? 'admin' : 'customer'}?</h3>
            <p className="mt-2 text-sm text-[#786A58]">
              This deactivates <span className="font-medium text-[#2B241E]">{deletingAccount.name !== '—' ? deletingAccount.name : deletingAccount.email}</span>{' '}
              and they will no longer be able to sign in.
            </p>

            <FormError message={deleteError} />

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" className="px-5 py-3" onClick={() => setDeletingAccount(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                type="button"
                className="!bg-red-600 px-5 py-3 hover:!bg-red-700"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Removing...' : 'Remove'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {rowMenu && (
        <div
          ref={rowMenuRef}
          style={{ top: rowMenu.top, right: rowMenu.right }}
          className="fixed z-50 w-36 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#2B241E]/10 bg-[#F5EFE5] shadow-xl"
        >
          <button
            type="button"
            onClick={() => openEditDialog(rowMenu.account)}
            className="block w-full px-4 py-2.5 text-left text-sm text-[#2B241E] hover:bg-[#2B241E]/5"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={isSelf(rowMenu.account)}
            onClick={() => {
              const account = rowMenu.account;
              setRowMenu(null);
              setDeleteError(null);
              setDeletingAccount(account);
            }}
            className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-600/30 disabled:hover:bg-transparent"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};
