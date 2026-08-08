import { useEffect, useState } from 'react';
import { FormError } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { bookingsApi } from '../api/bookingsApi';
import { BookingChangeDialog } from '../components/BookingChangeDialog';
import { classesApi } from '@/features/classes/api/classesApi';
import type { Slot } from '@/features/classes/types';
import { instructorsApi } from '@/features/instructors/api/instructorsApi';
import type { InstructorProfile } from '@/features/instructors/types';
import type { Booking, BookingChangeRequest, BookingStatus } from '../types';

const STATUS_STYLES: Record<BookingStatus, string> = {
  booked: 'bg-[#D8B46A]/15 text-[#8a6f2e]',
  attended: 'bg-[#2B241E]/10 text-[#2B241E]',
};

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

const formatTime = (isoTime: string) =>
  new Date(`1970-01-01T${isoTime}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

// Studio-wide booking log (single instructor — one unified list, no
// per-instructor filter needed). Every booking stays visible regardless of
// status; admins mark attendance here, which is what actually deducts a
// session from the member's subscription (see apps.payments.services).
export const BookingsPage = () => {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [instructors, setInstructors] = useState<InstructorProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [reassigningId, setReassigningId] = useState<number | null>(null);
  const [changeRequests, setChangeRequests] = useState<BookingChangeRequest[]>([]);
  const [transferBooking, setTransferBooking] = useState<Booking | null>(null);
  const [transferSlots, setTransferSlots] = useState<Slot[]>([]);
  const [selectedTransferSlot, setSelectedTransferSlot] = useState<Slot | null>(null);
  const [reviewRequest, setReviewRequest] = useState<BookingChangeRequest | null>(null);
  const [isChanging, setIsChanging] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadBookings = async () => {
    try {
      const [response, requestResponse, instructorList] = await Promise.all([
        bookingsApi.getAllBookings(),
        bookingsApi.getAdminChangeRequests(),
        instructorsApi.list(),
      ]);
      setBookings(response.results);
      setChangeRequests(requestResponse.results);
      setInstructors(instructorList);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load bookings.'));
    }
  };

  const openTransfer = async (booking: Booking) => {
    setError(null);
    try {
      const response = await classesApi.getSlots({ page: 1 });
      const slots = response.results.filter((slot) => slot.availability === 'available' && slot.id !== booking.slot.id);
      setTransferSlots(slots);
      setSelectedTransferSlot(slots[0] ?? null);
      setTransferBooking(booking);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load available slots.'));
    }
  };

  const handleTransferRequest = async () => {
    if (!transferBooking || !selectedTransferSlot) return;
    setIsChanging(true);
    try {
      await bookingsApi.createTransferRequest({ booking_id: transferBooking.id, slot_id: selectedTransferSlot.id });
      setTransferBooking(null);
      await loadBookings();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not send the transfer request.'));
    } finally {
      setIsChanging(false);
    }
  };

  const handleReview = async (approve: boolean) => {
    if (!reviewRequest) return;
    setIsChanging(true);
    try {
      if (approve) await bookingsApi.approveChangeRequest(reviewRequest.id);
      else await bookingsApi.rejectChangeRequest(reviewRequest.id);
      setReviewRequest(null);
      await loadBookings();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not update the booking request.'));
    } finally {
      setIsChanging(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, []);

  const handleMarkAttended = async (booking: Booking) => {
    setError(null);
    setProcessingId(booking.id);
    try {
      await bookingsApi.markAttended(booking.id);
      await loadBookings();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not mark this booking as attended.'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevertAttended = async (booking: Booking) => {
    setError(null);
    setProcessingId(booking.id);
    try {
      await bookingsApi.revertAttended(booking.id);
      await loadBookings();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not revert attendance.'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReassign = async (booking: Booking, instructorId: number | null) => {
    setError(null);
    setReassigningId(booking.id);
    try {
      await bookingsApi.reassignInstructor(booking.id, instructorId);
      await loadBookings();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not reassign the instructor.'));
    } finally {
      setReassigningId(null);
    }
  };

  return (
    <div className="max-w-4xl">
      <h2 className="font-serif text-2xl text-[#2B241E] mb-2">Bookings</h2>
      <p className="text-[#786A58] text-sm mb-8">
        Every booking across the studio. Marking a booking attended deducts one session from the member's
        subscription, if they have one — reverting restores it.
      </p>

      <FormError message={error} />

      {bookings && bookings.length === 0 && <p className="text-sm text-[#786A58]">No bookings yet.</p>}

      {bookings && bookings.length > 0 && (
        <div className="space-y-2">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-[#2B241E]/10 px-4 py-3 text-sm"
            >
              <div>
                <div className="text-[#2B241E] font-medium">
                  {formatDate(booking.slot.date)} · {formatTime(booking.slot.start_time)}
                </div>
                <div className="text-[#786A58]">{booking.user_email}</div>
              </div>
              <div className="flex items-center gap-3">
                {editingId === booking.id ? (
                  <select
                    value={booking.instructor_id ?? ''}
                    onChange={(e) => void handleReassign(booking, e.target.value ? Number(e.target.value) : null)}
                    disabled={reassigningId === booking.id}
                    className="rounded-full border border-[#2B241E]/15 bg-white/60 px-2.5 py-1 text-xs text-[#2B241E] outline-none disabled:opacity-50"
                  >
                    <option value="">No instructor</option>
                    {instructors.map((instructor) => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.username ?? instructor.email}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-[#786A58]">
                    {instructors.find((i) => i.id === booking.instructor_id)?.username ?? booking.instructor_name ?? 'No instructor'}
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${STATUS_STYLES[booking.status]}`}
                >
                  {booking.status}
                </span>
                {editingId === booking.id ? (
                  <>
                    {booking.status === 'booked' && (
                      <>
                        <button onClick={() => void openTransfer(booking)} className="text-xs uppercase tracking-widest text-[#786A58] hover:text-[#D8B46A] transition-colors">
                          Transfer
                        </button>
                        <button
                          onClick={() => handleMarkAttended(booking)}
                          disabled={processingId === booking.id}
                          className="px-3 py-1.5 rounded-full text-xs uppercase tracking-widest bg-[#2B241E] text-white hover:bg-[#D8B46A] transition-colors disabled:opacity-40"
                        >
                          {processingId === booking.id ? 'Saving…' : 'Mark Attended'}
                        </button>
                      </>
                    )}
                    {booking.status === 'attended' && (
                      <button
                        onClick={() => handleRevertAttended(booking)}
                        disabled={processingId === booking.id}
                        className="text-xs uppercase tracking-widest text-[#786A58] hover:text-[#D8B46A] transition-colors disabled:opacity-40"
                      >
                        {processingId === booking.id ? 'Saving…' : 'Revert'}
                      </button>
                    )}
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs uppercase tracking-widest text-[#786A58] hover:text-[#2B241E] transition-colors"
                    >
                      Done
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditingId(booking.id)}
                    className="text-xs uppercase tracking-widest text-[#786A58] hover:text-[#2B241E] transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {changeRequests.some((item) => item.status === 'pending' && item.request_type === 'reschedule') && (
        <div className="mt-8 space-y-2">
          <h3 className="font-serif text-xl text-[#2B241E]">Reschedule Requests</h3>
          {changeRequests.filter((item) => item.status === 'pending' && item.request_type === 'reschedule').map((item) => (
            <button key={item.id} type="button" onClick={() => setReviewRequest(item)} className="w-full rounded-xl border border-[#D8B46A]/40 bg-[#D8B46A]/10 px-4 py-3 text-left text-sm text-[#2B241E]">
              {item.requested_by_email} requested {formatDate(item.requested_date)} at {formatTime(item.requested_start_time)}.
            </button>
          ))}
        </div>
      )}

      {transferBooking && (
        <BookingChangeDialog
          booking={transferBooking}
          requestedSlot={selectedTransferSlot}
          availableSlots={transferSlots}
          isSubmitting={isChanging}
          title="Transfer Booking"
          onSlotChange={(slotId) => setSelectedTransferSlot(transferSlots.find((slot) => slot.id === slotId) ?? null)}
          onAccept={() => void handleTransferRequest()}
          onReject={() => setTransferBooking(null)}
        />
      )}

      {reviewRequest && (
        <BookingChangeDialog
          booking={reviewRequest.booking}
          requestedSlot={reviewRequest.requested_slot}
          isSubmitting={isChanging}
          title="Reschedule Request"
          onAccept={() => void handleReview(true)}
          onReject={() => void handleReview(false)}
        />
      )}
    </div>
  );
};
