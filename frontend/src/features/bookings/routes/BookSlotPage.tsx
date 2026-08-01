import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormError, FormSuccess } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { classesApi } from '@/features/classes/api/classesApi';
import type { Slot } from '@/features/classes/types';
import { bookingsApi, getSuggestedSlotFromConflict } from '../api/bookingsApi';
import { BookingConflictDialog } from '../components/BookingConflictDialog';
import { SlotPickerGrid } from '../components/SlotPickerGrid';

// Member-facing slot picker. Booking a slot only reserves it — no payment
// or subscription check happens here (that's the Subscription module's
// concern, kept independent of booking creation per business rule).
export const BookSlotPage = () => {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [bookingSlotId, setBookingSlotId] = useState<number | null>(null);
  const [suggestedSlot, setSuggestedSlot] = useState<Slot | null>(null);

  const loadSlots = async () => {
    try {
      const response = await classesApi.getSlots({ page: 1 });
      setSlots(response.results);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load slots.'));
    }
  };

  useEffect(() => {
    void loadSlots();
  }, []);

  const handleBook = async (slot: Slot) => {
    setError(null);
    setSuccessMessage(null);
    setBookingSlotId(slot.id);

    try {
      await bookingsApi.createBooking({ slot_id: slot.id });
      setSuccessMessage(`Booked ${slot.date} at ${slot.start_time.slice(0, 5)}.`);
      await loadSlots();
    } catch (err) {
      const conflictSuggestion = getSuggestedSlotFromConflict(err);
      if (conflictSuggestion) {
        setSuggestedSlot(conflictSuggestion);
        setError(null);
      } else {
        setError(extractErrorMessage(err, 'Could not book this slot. It may have just been taken.'));
      }
      await loadSlots();
    } finally {
      setBookingSlotId(null);
    }
  };

  const handleAcceptSuggestion = async () => {
    if (!suggestedSlot) return;

    setSuggestedSlot(null);
    await handleBook(suggestedSlot);
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-serif text-2xl text-[#2B241E]">Book a Class</h2>
        <button
          onClick={() => navigate('/account')}
          className="text-xs uppercase tracking-widest text-[#786A58] hover:text-[#D8B46A] transition-colors"
        >
          My Bookings
        </button>
      </div>
      <p className="text-[#786A58] text-sm mb-8">
        Choose an available slot below. Booked and unavailable slots stay visible so you can see the full schedule.
      </p>

      <FormError message={error} />
      <FormSuccess message={successMessage} />

      {slots && <SlotPickerGrid slots={slots} bookingSlotId={bookingSlotId} onBook={handleBook} />}

      {suggestedSlot && (
        <BookingConflictDialog
          suggestedSlot={suggestedSlot}
          isAccepting={bookingSlotId === suggestedSlot.id}
          onAccept={() => void handleAcceptSuggestion()}
          onCancel={() => setSuggestedSlot(null)}
        />
      )}
    </div>
  );
};
