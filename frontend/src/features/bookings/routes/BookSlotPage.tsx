import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormError, FormSuccess } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { classesApi } from '@/features/classes/api/classesApi';
import type { Slot } from '@/features/classes/types';
import { paymentsApi } from '@/features/payments/api/paymentsApi';
import { openRazorpayCheckout } from '@/features/payments/lib/razorpay';
import { tokenStorage } from '@/features/auth/lib/tokenStorage';
import type { SubscriptionPlan } from '@/features/payments/types';
import { bookingsApi, getSuggestedSlotFromConflict } from '../api/bookingsApi';
import { BookingConfirmDialog } from '../components/BookingConfirmDialog';
import { BookingConflictDialog } from '../components/BookingConflictDialog';
import { BookingPaymentChoiceDialog } from '../components/BookingPaymentChoiceDialog';
import { SlotPickerGrid } from '../components/SlotPickerGrid';

// Member-facing slot picker. Tapping Book always requires a step before the
// slot is reserved: a member with sessions remaining on an active
// subscription confirms twice (no charge — already covered by their plan);
// a member without one is offered a choice — pay once for this slot, or
// start the monthly subscription — and the slot is only booked once
// whichever payment is verified.
export const BookSlotPage = () => {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [bookingSlotId, setBookingSlotId] = useState<number | null>(null);
  const [suggestedSlot, setSuggestedSlot] = useState<Slot | null>(null);
  const [confirmSlot, setConfirmSlot] = useState<Slot | null>(null);
  const [paymentChoiceSlot, setPaymentChoiceSlot] = useState<Slot | null>(null);
  const [slotPrice, setSlotPrice] = useState<number | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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

  const finalizeBooking = async (slot: Slot) => {
    setBookingSlotId(slot.id);
    try {
      await bookingsApi.createBooking({ slot_id: slot.id });
      setSuccessMessage(`Booked ${slot.date} at ${slot.start_time.slice(0, 5)}.`);
      await loadSlots();
    } catch (err) {
      const conflictSuggestion = getSuggestedSlotFromConflict(err);
      if (conflictSuggestion) {
        setSuggestedSlot(conflictSuggestion);
      } else {
        setError(extractErrorMessage(err, 'Could not book this slot. It may have just been taken.'));
      }
      await loadSlots();
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
    const slot = paymentChoiceSlot;
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
              });
              setPaymentChoiceSlot(null);
              setIsProcessingPayment(false);
              await finalizeBooking(slot);
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
      <p className="text-[#786A58] text-sm mb-8">
        Choose an available slot below. Booked and unavailable slots stay visible so you can see the full schedule.
      </p>

      <FormError message={error} />
      <FormSuccess message={successMessage} />

      {slots && <SlotPickerGrid slots={slots} bookingSlotId={bookingSlotId} onBook={handleBook} />}

      {confirmSlot && (
        <BookingConfirmDialog
          slot={confirmSlot}
          isBooking={bookingSlotId === confirmSlot.id}
          onConfirm={() => void handleConfirmBooking()}
          onCancel={() => setConfirmSlot(null)}
        />
      )}

      {paymentChoiceSlot && slotPrice !== null && (
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
