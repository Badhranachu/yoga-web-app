import { useEffect, useState } from 'react';
import { Eye, Pencil, Plus } from 'lucide-react';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { useBodyScrollLock } from '@/shared/lib/useBodyScrollLock';
import { Button, TextField } from '@/shared/ui';
import { FormError, FormSuccess } from '@/shared/ui/FormFeedback/FormFeedback';
import { instructorsApi } from '../api/instructorsApi';
import type { InstructorProfile } from '../types';

const initialForm = {
  username: '',
  email: '',
  first_name: '',
  phone_number: '',
  age: '',
  password: '',
  password_confirm: '',
};

const initialEditForm = {
  username: '',
  email: '',
  age: '',
  bio: '',
  show_on_homepage: false,
};

export const InstructorsPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [instructors, setInstructors] = useState<InstructorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [viewingInstructor, setViewingInstructor] = useState<InstructorProfile | null>(null);
  const [editingInstructor, setEditingInstructor] = useState<InstructorProfile | null>(null);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useBodyScrollLock(isOpen || editingInstructor !== null || viewingInstructor !== null);

  const loadInstructors = async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const data = await instructorsApi.list();
      setInstructors(data);
    } catch (error) {
      setListError(extractErrorMessage(error, 'Could not load instructors.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInstructors();
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
      const created = await instructorsApi.create({
        username: form.username,
        email: form.email,
        first_name: form.first_name,
        phone_number: form.phone_number,
        age: form.age ? Number(form.age) : null,
        password: form.password,
        password_confirm: form.password_confirm,
      });
      setSuccessMessage(`Instructor ${created.username ?? created.email} created successfully.`);
      closeDialog();
      await loadInstructors();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Could not create instructor account.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (instructor: InstructorProfile) => {
    setEditingInstructor(instructor);
    setEditForm({
      username: instructor.username ?? '',
      email: instructor.email,
      age: instructor.age !== null ? String(instructor.age) : '',
      bio: instructor.bio,
      show_on_homepage: instructor.show_on_homepage,
    });
    setEditPhoto(null);
    setEditPhotoPreview(null);
    setEditPassword('');
    setEditError(null);
  };

  const closeEditDialog = () => {
    setEditingInstructor(null);
    setEditPhoto(null);
    setEditPhotoPreview(null);
    setEditPassword('');
    setIsSavingEdit(false);
    setEditError(null);
  };

  const handleEditChange = (field: keyof typeof initialEditForm, value: string) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const handleEditPhotoSelect = (file: File | null) => {
    setEditPhoto(file);
    setEditPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingInstructor) return;
    setIsSavingEdit(true);
    setEditError(null);
    try {
      await instructorsApi.update(editingInstructor.id, {
        username: editForm.username,
        email: editForm.email,
        age: editForm.age ? Number(editForm.age) : null,
        bio: editForm.bio,
        show_on_homepage: editForm.show_on_homepage,
        photo: editPhoto,
        ...(editPassword ? { password: editPassword } : {}),
      });
      closeEditDialog();
      await loadInstructors();
    } catch (error) {
      setEditError(extractErrorMessage(error, 'Could not update instructor.'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="mb-2 font-serif text-2xl text-[#2B241E]">Instructors</h2>
          <p className="text-sm text-[#786A58]">Create and manage instructor accounts.</p>
        </div>
        <Button type="button" className="px-5 py-3" onClick={() => { setErrorMessage(null); setSuccessMessage(null); setIsOpen(true); }}>
          <Plus size={16} />
          Add Instructor
        </Button>
      </div>

      <FormSuccess message={successMessage} />
      <FormError message={listError} />

      <div className="overflow-hidden rounded-3xl border border-[#2B241E]/10 bg-white/35">
        {isLoading ? (
          <p className="p-6 text-sm text-[#786A58]">Loading instructors...</p>
        ) : instructors.length === 0 ? (
          <p className="p-6 text-sm text-[#786A58]">No instructors yet. Add one to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#2B241E]/10 text-xs uppercase tracking-widest text-[#786A58]">
                  <th className="px-6 py-4 font-medium">Photo</th>
                  <th className="px-6 py-4 font-medium">Username</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Age</th>
                  <th className="px-6 py-4 font-medium">Show on Homepage</th>
                  <th className="px-6 py-4 font-medium">Created</th>
                  <th className="px-6 py-4 font-medium">View</th>
                  <th className="px-6 py-4 font-medium">Edit</th>
                </tr>
              </thead>
              <tbody>
                {instructors.map((instructor) => (
                  <tr key={instructor.id} className="border-b border-[#2B241E]/5 text-[#2B241E] last:border-b-0">
                    <td className="px-6 py-4">
                      {instructor.photo ? (
                        <img src={instructor.photo} alt="" className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2B241E]/10 text-xs text-[#786A58]">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">{instructor.username ?? '—'}</td>
                    <td className="px-6 py-4">{instructor.email}</td>
                    <td className="px-6 py-4">{instructor.age ?? '—'}</td>
                    <td className="px-6 py-4">{instructor.show_on_homepage ? 'Yes' : 'No'}</td>
                    <td className="px-6 py-4">{new Date(instructor.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setViewingInstructor(instructor)}
                        className="flex items-center gap-1 text-xs uppercase tracking-widest text-[#786A58] hover:text-[#2B241E]"
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => openEditDialog(instructor)}
                        className="flex items-center gap-1 text-xs uppercase tracking-widest text-[#786A58] hover:text-[#2B241E]"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                    </td>
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
                <h3 className="font-serif text-2xl text-[#2B241E]">Add Instructor</h3>
                <p className="mt-1 text-sm text-[#786A58]">This creates an instructor account with its own login.</p>
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
                label="Name"
                name="first_name"
                value={form.first_name}
                onChange={(event) => handleChange('first_name', event.target.value)}
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
                label="Age"
                name="age"
                type="number"
                min={1}
                max={129}
                value={form.age}
                onChange={(event) => handleChange('age', event.target.value)}
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
                  {isSubmitting ? 'Creating...' : 'Create Instructor'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingInstructor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B241E]/35 px-4">
          <div className="max-h-[90vh] w-full max-w-lg origin-center overflow-y-auto rounded-[28px] border border-white/70 bg-[#F5EFE5] p-6 shadow-2xl sm:scale-[0.8]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl text-[#2B241E]">Instructor Details</h3>
                <p className="mt-1 text-sm text-[#786A58]">Read-only view.</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingInstructor(null)}
                className="text-sm uppercase tracking-widest text-[#786A58] hover:text-[#2B241E]"
              >
                Close
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <span className="mb-2 block text-xs uppercase tracking-widest text-[#786A58]">Photo</span>
                {viewingInstructor.photo ? (
                  <img src={viewingInstructor.photo} alt="" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2B241E]/10 text-xs text-[#786A58]">
                    None
                  </span>
                )}
              </div>

              <div>
                <span className="mb-1 block text-xs uppercase tracking-widest text-[#786A58]">Username</span>
                <p className="text-sm text-[#2B241E]">{viewingInstructor.username ?? '—'}</p>
              </div>

              <div>
                <span className="mb-1 block text-xs uppercase tracking-widest text-[#786A58]">Email</span>
                <p className="text-sm text-[#2B241E]">{viewingInstructor.email}</p>
              </div>

              <div>
                <span className="mb-1 block text-xs uppercase tracking-widest text-[#786A58]">Age</span>
                <p className="text-sm text-[#2B241E]">{viewingInstructor.age ?? '—'}</p>
              </div>

              <div>
                <span className="mb-1 block text-xs uppercase tracking-widest text-[#786A58]">Description</span>
                <p className="whitespace-pre-wrap text-sm text-[#2B241E]">{viewingInstructor.bio || '—'}</p>
              </div>

              <div>
                <span className="mb-1 block text-xs uppercase tracking-widest text-[#786A58]">Show on Homepage</span>
                <p className="text-sm text-[#2B241E]">{viewingInstructor.show_on_homepage ? 'Yes' : 'No'}</p>
              </div>

              <div>
                <span className="mb-1 block text-xs uppercase tracking-widest text-[#786A58]">Created</span>
                <p className="text-sm text-[#2B241E]">{new Date(viewingInstructor.created_at).toLocaleDateString()}</p>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="button" variant="outline" className="px-5 py-3" onClick={() => setViewingInstructor(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingInstructor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B241E]/35 px-4">
          <div className="max-h-[90vh] w-full max-w-lg origin-center overflow-y-auto rounded-[28px] border border-white/70 bg-[#F5EFE5] p-6 shadow-2xl sm:scale-[0.8]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl text-[#2B241E]">Edit Instructor</h3>
                <p className="mt-1 text-sm text-[#786A58]">Update this instructor's details, photo, and homepage visibility.</p>
              </div>
              <button type="button" onClick={closeEditDialog} className="text-sm uppercase tracking-widest text-[#786A58] hover:text-[#2B241E]">
                Close
              </button>
            </div>

            <FormError message={editError} />

            <form className="space-y-5" onSubmit={handleEditSubmit}>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-widest text-[#786A58]">Photo</label>
                <label className="flex cursor-pointer items-center gap-3">
                  {editPhotoPreview || editingInstructor?.photo ? (
                    <img
                      src={editPhotoPreview ?? editingInstructor?.photo ?? ''}
                      alt=""
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2B241E]/10 text-xs text-[#786A58]">
                      None
                    </span>
                  )}
                  <span className="text-xs uppercase tracking-widest text-[#786A58] hover:text-[#2B241E]">
                    Choose Photo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleEditPhotoSelect(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <TextField
                label="Username"
                name="edit-username"
                value={editForm.username}
                onChange={(event) => handleEditChange('username', event.target.value)}
                required
              />
              <TextField
                label="Email"
                name="edit-email"
                type="email"
                value={editForm.email}
                onChange={(event) => handleEditChange('email', event.target.value)}
                required
              />
              <TextField
                label="Age"
                name="edit-age"
                type="number"
                min={1}
                max={129}
                value={editForm.age}
                onChange={(event) => handleEditChange('age', event.target.value)}
              />

              <div>
                <TextField
                  label="New Password"
                  name="edit-password"
                  type="password"
                  value={editPassword}
                  onChange={(event) => setEditPassword(event.target.value)}
                  placeholder="Leave blank to keep the current password"
                />
              </div>

              <div>
                <label htmlFor="edit-bio" className="mb-2 block text-xs uppercase tracking-widest text-[#786A58]">
                  Description
                </label>
                <textarea
                  id="edit-bio"
                  name="edit-bio"
                  rows={4}
                  value={editForm.bio}
                  onChange={(event) => handleEditChange('bio', event.target.value)}
                  placeholder="A short description shown under this instructor's photo on the homepage."
                  className="w-full rounded-2xl border border-[#2B241E]/15 bg-white/70 px-4 py-3 text-sm text-[#2B241E] outline-none focus:border-[#D8B46A]"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#D8B46A]"
                  checked={editForm.show_on_homepage}
                  onChange={(event) => setEditForm((current) => ({ ...current, show_on_homepage: event.target.checked }))}
                />
                <span className="text-xs uppercase tracking-widest text-[#786A58]">Show on Homepage</span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" className="px-5 py-3" onClick={closeEditDialog} disabled={isSavingEdit}>
                  Cancel
                </Button>
                <Button type="submit" className="px-5 py-3" disabled={isSavingEdit}>
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
