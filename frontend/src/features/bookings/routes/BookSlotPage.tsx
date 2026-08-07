import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Loader2, X } from 'lucide-react';
import { FormError, FormSuccess } from '@/shared/ui';
import { useBodyScrollLock } from '@/shared/lib/useBodyScrollLock';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { classesApi } from '@/features/classes/api/classesApi';
import type { Slot } from '@/features/classes/types';
import { paymentsApi } from '@/features/payments/api/paymentsApi';
import { openRazorpayCheckout } from '@/features/payments/lib/razorpay';
import { SubscriptionStartDateDialog } from '@/features/payments/components/SubscriptionStartDateDialog';
import { tokenStorage } from '@/features/auth/lib/tokenStorage';
import type { SubscriptionPlan, SubscriptionStartDateOptions } from '@/features/payments/types';
import { bookingsApi, getSuggestedSlotFromConflict } from '../api/bookingsApi';
import { BookingCalendar } from '../components/BookingCalendar';
import { BookingConfirmDialog } from '../components/BookingConfirmDialog';
import { BookingConflictDialog } from '../components/BookingConflictDialog';
import { BookingPaymentChoiceDialog } from '../components/BookingPaymentChoiceDialog';
import { SlotPickerGrid } from '../components/SlotPickerGrid';

const SLOTS_PAGE_SIZE = 12;

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatSelectedDate = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

const QUICK_PICK_DAYS = 5;

const nextFewDays = (): string[] => {
  const today = new Date();
  return Array.from({ length: QUICK_PICK_DAYS }, (_, i) => {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    return toDateKey(day);
  });
};

const formatQuickPickLabel = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00`);
  const today = toDateKey(new Date());
  if (dateKey === today) return 'Today';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
};

// Member-facing booking flow: the calendar is opened on demand (not loaded
// up front) — opening it fetches a lightweight 30-day availability window
// just to mark which dates have an open slot, then tapping a date fetches
// only THAT date's slots. Nothing bulk-loads the whole two-month window
// anymore. Tapping Book always requires a step before the slot is
// reserved: a member with sessions remaining on an active subscription
// confirms twice (no charge — already covered by their plan); a member
// without one is offered a choice — pay once for this slot, or start the
// monthly subscription — and the slot is only booked once whichever
// payment is verified.
export const BookSlotPage = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string>(() => toDateKey(new Date()));
  const [dateSlots, setDateSlots] = useState<Slot[] | null>(null);
  const [visibleCount, setVisibleCount] = useState(SLOTS_PAGE_SIZE);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  useBodyScrollLock(isCalendarOpen);
  const [datesWithAvailability, setDatesWithAvailability] = useState<Set<string> | undefined>(undefined);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [bookingSlotId, setBookingSlotId] = useState<number | null>(null);
  const [suggestedSlot, setSuggestedSlot] = useState<Slot | null>(null);
  const [confirmSlot, setConfirmSlot] = useState<Slot | null>(null);
  const [paymentChoiceSlot, setPaymentChoiceSlot] = useState<Slot | null>(null);
  const [slotPrice, setSlotPrice] = useState<number | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [startDateOptions, setStartDateOptions] = useState<SubscriptionStartDateOptions | null>(null);

  const loadSlotsForDate = async (date: string) => {
    setDateSlots(null);
    setVisibleCount(SLOTS_PAGE_SIZE);
    try {
      const results = await classesApi.getAllSlots({ date_from: date, date_to: date });
      setDateSlots(results);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load slots for this date.'));
    }
  };

  useEffect(() => {
    void loadSlotsForDate(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCalendar = async () => {
    if (isCalendarOpen) {
      setIsCalendarOpen(false);
      return;
    }

    if (datesWithAvailability !== undefined) {
      // Already loaded once this visit — show it immediately, no refetch.
      setIsCalendarOpen(true);
      return;
    }

    setIsLoadingAvailability(true);
    try {
      const today = new Date();
      // Must cover the calendar's full navigable range (this month + next
      // month), not just a fixed N-day window — otherwise dates late in
      // next month never get a dot even though slots exist there.
      const windowEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      const results = await classesApi.getAllSlots({ date_from: toDateKey(today), date_to: toDateKey(windowEnd) });
      const available = new Set<string>();
      for (const slot of results) {
        if (slot.availability === 'available') available.add(slot.date);
      }
      setDatesWithAvailability(available);
      setIsCalendarOpen(true);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load calendar availability.'));
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setIsCalendarOpen(false);
    void loadSlotsForDate(date);
  };

  // For today, don't offer slots that have already started (or are about
  // to, within the same hour) — only ones starting from the next full hour
  // onward are actually bookable in practice.
  const upcomingSlots = (dateSlots ?? []).filter((slot) => {
    if (slot.date !== toDateKey(new Date())) return true;
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0);
    const slotStart = new Date(`${slot.date}T${slot.start_time}`);
    return slotStart >= cutoff;
  });

  const visibleSlots = upcomingSlots.slice(0, visibleCount);

  const finalizeBooking = async (slot: Slot) => {
    setBookingSlotId(slot.id);
    try {
      await bookingsApi.createBooking({ slot_id: slot.id });
      setSuccessMessage(`Booked ${slot.date} at ${slot.start_time.slice(0, 5)}.`);
      await loadSlotsForDate(selectedDate);
    } catch (err) {
      const conflictSuggestion = getSuggestedSlotFromConflict(err);
      if (conflictSuggestion) {
        setSuggestedSlot(conflictSuggestion);
      } else {
        setError(extractErrorMessage(err, 'Could not book this slot. It may have just been taken.'));
      }
      await loadSlotsForDate(selectedDate);
    } finally {
      setBookingSlotId(null);
      setSlotPrice(null);
    }
  };

  const handleBook = async (slot: Slot) => {
    setError(null);
    setSuccessMessage(null);

    try {
      const subscription = await paymentsApi.getMySubscription();
      if (subscription && subscription.has_sessions) {
        setConfirmSlot(slot);
        return;
      }

      const [priceData, planData] = await Promise.all([
        paymentsApi.getSingleSlotPrice(),
        paymentsApi.getPlan(),
      ]);
      setSlotPrice(priceData.single_slot_price);
      setPlan(planData);
      setPaymentChoiceSlot(slot);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not start the booking.'));
    }
  };

  const handleConfirmBooking = async () => {
    if (!confirmSlot) return;
    const slot = confirmSlot;
    setConfirmSlot(null);
    await finalizeBooking(slot);
  };

  const handlePayForSlot = async () => {
    if (!paymentChoiceSlot) return;
    const slot = paymentChoiceSlot;
    setIsProcessingPayment(true);

    try {
      const order = await paymentsApi.createOrder('single_slot');
      await openRazorpayCheckout({
        keyId: order.key_id,
        amount: order.amount,
        currency: order.currency,
        orderId: order.order_id,
        description: `Single Slot — ${slot.date} ${slot.start_time.slice(0, 5)}`,
        prefillEmail: tokenStorage.getUser()?.email,
        onDismiss: () => setIsProcessingPayment(false),
        onSuccess: (checkoutResponse) => {
          void (async () => {
            try {
              await paymentsApi.verifyPayment({
                action: 'slot',
                razorpay_order_id: checkoutResponse.razorpay_order_id,
                razorpay_payment_id: checkoutResponse.razorpay_payment_id,
                razorpay_signature: checkoutResponse.razorpay_signature,
              });
              setPaymentChoiceSlot(null);
              setIsProcessingPayment(false);
              await finalizeBooking(slot);
            } catch (err) {
              setError(extractErrorMessage(err, 'Payment succeeded but booking failed. Contact the studio.'));
              setIsProcessingPayment(false);
            }
          })();
        },
      });
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not start the payment.'));
      setIsProcessingPayment(false);
    }
  };

  const handleStartSubscription = async () => {
    if (!paymentChoiceSlot) return;
    setIsProcessingPayment(true);
    try {
      const options = await paymentsApi.getSubscriptionStartDateOptions();
      setStartDateOptions(options);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load available start dates.'));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleConfirmSubscriptionStartDate = async (startDate: string) => {
    if (!paymentChoiceSlot) return;
    const slot = paymentChoiceSlot;
    const isStartingToday = startDate === toDateKey(new Date());
    setIsProcessingPayment(true);

    try {
      const order = await paymentsApi.createOrder('subscription');
      await openRazorpayCheckout({
        keyId: order.key_id,
        amount: order.amount,
        currency: order.currency,
        orderId: order.order_id,
        description: 'Monthly Subscription',
        prefillEmail: tokenStorage.getUser()?.email,
        onDismiss: () => setIsProcessingPayment(false),
        onSuccess: (checkoutResponse) => {
          void (async () => {
            try {
              await paymentsApi.verifyPayment({
                action: 'purchase',
                razorpay_order_id: checkoutResponse.razorpay_order_id,
                razorpay_payment_id: checkoutResponse.razorpay_payment_id,
                razorpay_signature: checkoutResponse.razorpay_signature,
                start_date: startDate,
              });
              setStartDateOptions(null);
              setPaymentChoiceSlot(null);
              setIsProcessingPayment(false);
              if (isStartingToday) {
                // Subscription is active immediately — it covers the slot
                // the member was originally trying to book.
                await finalizeBooking(slot);
              } else {
                // Subscription is scheduled for a future date — it isn't
                // usable yet, so this specific slot isn't booked. The
                // member can come back and book once it activates.
                setSuccessMessage(
                  `Subscription purchased — it will activate on ${startDate}. Come back then to book classes.`,
                );
                await loadSlotsForDate(selectedDate);
              }
            } catch (err) {
              setError(extractErrorMessage(err, 'Subscription payment succeeded but booking failed. Contact the studio.'));
              setIsProcessingPayment(false);
            }
          })();
        },
      });
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not start the subscription payment.'));
      setIsProcessingPayment(false);
    }
  };

  const handleAcceptSuggestion = async () => {
    if (!suggestedSlot) return;

    const slot = suggestedSlot;
    setSuggestedSlot(null);
    await handleBook(slot);
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
      <p className="text-[#786A58] text-sm mb-6">
        Choose an available slot for today, or tap the calendar to pick a different date (this month or next month).
      </p>

      <FormError message={error} />
      <FormSuccess message={successMessage} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void toggleCalendar()}
          disabled={isLoadingAvailability}
          className="flex items-center gap-2 rounded-full border border-[#2B241E]/15 bg-white/40 px-4 py-2.5 text-sm text-[#2B241E] hover:border-[#D8B46A] transition-colors disabled:opacity-60"
        >
          {isLoadingAvailability ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
          {formatSelectedDate(selectedDate)}
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {nextFewDays().map((dateKey) => (
          <button
            key={dateKey}
            type="button"
            onClick={() => handleSelectDate(dateKey)}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              dateKey === selectedDate
                ? 'border-[#2B241E] bg-[#2B241E] text-white'
                : 'border-[#2B241E]/15 bg-white/40 text-[#2B241E] hover:border-[#D8B46A]'
            }`}
          >
            {formatQuickPickLabel(dateKey)}
          </button>
        ))}
      </div>

      {isCalendarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B241E]/45 px-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choose a date"
            className="w-full max-w-sm rounded-3xl border border-white/60 bg-[#F5EFE5] p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-xl text-[#2B241E]">Choose a Date</h3>
              <button
                type="button"
                onClick={() => setIsCalendarOpen(false)}
                aria-label="Close calendar"
                className="text-[#786A58] hover:text-[#2B241E] transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <BookingCalendar
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              datesWithAvailability={datesWithAvailability}
            />
          </div>
        </div>
      )}

      <div>
        {dateSlots === null ? (
          <p className="text-sm text-[#786A58]">Loading…</p>
        ) : upcomingSlots.length === 0 ? (
          <p className="text-sm text-[#786A58]">No slots scheduled for this date.</p>
        ) : (
          <>
            <SlotPickerGrid slots={visibleSlots} bookingSlotId={bookingSlotId} onBook={handleBook} />
            {visibleCount < upcomingSlots.length && (
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + SLOTS_PAGE_SIZE)}
                className="mt-4 text-xs uppercase tracking-widest text-[#786A58] hover:text-[#D8B46A] transition-colors"
              >
                Show More ({upcomingSlots.length - visibleCount} remaining)
              </button>
            )}
          </>
        )}
      </div>

      {confirmSlot && (
        <BookingConfirmDialog
          slot={confirmSlot}
          isBooking={bookingSlotId === confirmSlot.id}
          onConfirm={() => void handleConfirmBooking()}
          onCancel={() => setConfirmSlot(null)}
        />
      )}

      {paymentChoiceSlot && slotPrice !== null && !startDateOptions && (
        <BookingPaymentChoiceDialog
          slot={paymentChoiceSlot}
          slotPrice={slotPrice}
          plan={plan}
          isProcessing={isProcessingPayment}
          onChooseSlot={() => void handlePayForSlot()}
          onChooseSubscription={() => void handleStartSubscription()}
          onCancel={() => setPaymentChoiceSlot(null)}
        />
      )}

      {startDateOptions && (
        <SubscriptionStartDateDialog
          options={startDateOptions}
          isSubmitting={isProcessingPayment}
          onConfirm={(startDate) => void handleConfirmSubscriptionStartDate(startDate)}
          onCancel={() => setStartDateOptions(null)}
        />
      )}

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
