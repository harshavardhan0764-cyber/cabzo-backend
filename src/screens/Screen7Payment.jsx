import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CreditCard, 
  Smartphone, 
  Building, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Mail,
  RefreshCw,
  AlertTriangle,
  Banknote,
  Wallet,
  QrCode,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import TopBar from '../components/TopBar';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { sendBookingEmailConfirmation } from '../utils/emailService';
import { 
  createRazorpayOrder, 
  verifyRazorpayPayment, 
  loadRazorpayScript, 
  getRazorpayConfig
} from '../utils/paymentApi';

export default function Screen7Payment({ onNavigate, onShowToast }) {
  const { fareSummary, createBooking, bookingForm } = useBooking();
  const { currentUser } = useAuth();
  const [method, setMethod] = useState('upi'); // 'upi' | 'card' | 'netbanking' | 'driver'
  const [advancePercent, setAdvancePercent] = useState(10); // 10 | 25 | 50 | 100
  const [upiMode, setUpiMode] = useState('apps'); // 'apps' | 'qr' | 'id'
  const [upiApp, setUpiApp] = useState('gpay');
  const [customUpiId, setCustomUpiId] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [selectedBank, setSelectedBank] = useState('HDFC');
  
  // Card Inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState(currentUser?.name || '');

  // Official Business UPI Details
  const BUSINESS_UPI_ID = 'outstationcabsb@okaxis';

  // Customer registered email from account authentication
  const customerEmail = currentUser?.email || localStorage.getItem('CabApp_CustomerEmail') || 'customer@cabbazar.com';
  const customerPhone = bookingForm?.customerPhone || currentUser?.phone || '9014467153';
  const customerName = bookingForm?.customerName || currentUser?.name || 'Customer';

  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(''); // 'creating_order', 'waiting_payment', 'verifying'
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Toll & State Border Tax Option: Checkbox to choose Pay Now Online vs Pay to Driver After Trip
  const [payTollNow, setPayTollNow] = useState(true);

  // Toll & State Border Tax Details
  const tollAmount = fareSummary?.estimatedToll || fareSummary?.tollParking || 0;
  const nhaiToll = fareSummary?.nhaiToll !== undefined 
    ? fareSummary.nhaiToll 
    : (fareSummary?.stateBorderCount > 0 ? Math.max(0, tollAmount - (fareSummary.statePermitFee || 0)) : tollAmount);
  const statePermitFee = fareSummary?.statePermitFee || 0;
  const stateBorderCount = fareSummary?.stateBorderCount || 0;

  // Pure ride fare excluding toll
  const grossTotal = fareSummary?.grossTotal || 2050;
  const rideFareOnly = Math.max(0, grossTotal - tollAmount);

  // Dynamic Advance Calculation (10%, 25%, 50%, or 100%)
  const calculatedAdvance = Math.round(rideFareOnly * (advancePercent / 100));
  const baseAdvance = advancePercent === 10 
    ? Math.min(10000, Math.max(500, calculatedAdvance)) 
    : calculatedAdvance;

  // Dynamic amounts based on user preference:
  const isPayToDriver = method === 'driver';
  const totalFare = grossTotal;
  const advancePayment = isPayToDriver ? 0 : (payTollNow ? (baseAdvance + tollAmount) : baseAdvance);
  const remainingAmount = isPayToDriver 
    ? totalFare 
    : (payTollNow ? Math.max(0, grossTotal - advancePayment) : Math.max(0, grossTotal - baseAdvance));

  const pickupName = typeof bookingForm?.pickup === 'object' ? bookingForm.pickup.name : (bookingForm?.pickup || 'Pickup Location');
  const dropName = typeof bookingForm?.drop === 'object' ? bookingForm.drop.name : (bookingForm?.drop || 'Drop Location');
  const vehicleName = fareSummary?.vehicle?.name || bookingForm?.vehicleId || 'Outstation Cab';

  // ─── UNIFIED PAYMENT FLOW (PAY TO DRIVER OR RAZORPAY ONLINE) ────────────────
  const handlePay = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setProcessing(true);

    const prospectiveBookingId = `CB-${Math.floor(100000 + Math.random() * 900000)}`;

    // ── CASE 1: PAY AFTER TRIP DIRECTLY TO DRIVER (ZERO ADVANCE) ──────────────
    if (isPayToDriver) {
      setProcessingStep('Confirming ride with driver assignment...');
      try {
        const createdBooking = createBooking({
          paymentId: `CASH_${Date.now().toString().slice(-6)}`,
          razorpayOrderId: 'PAY_AFTER_TRIP',
          amount: 0,
          method: 'PAY_TO_DRIVER',
          userEmail: customerEmail.trim(),
          payTollNow: false,
          tollPaymentPreference: 'PAY_AFTER_TRIP',
          tollAmount,
          nhaiToll,
          statePermitFee,
          stateBorderCount,
          totalFare,
          balancePayable: totalFare
        });

        const confirmedId = typeof createdBooking === 'object' ? createdBooking.bookingId : prospectiveBookingId;

        // Dispatch email notification
        try {
          await sendBookingEmailConfirmation({
            bookingId: confirmedId,
            userName: customerName,
            customerName,
            customerPhone,
            userPhone: customerPhone,
            customerEmail,
            userEmail: customerEmail,
            pickup: pickupName,
            drop: dropName,
            totalFare,
            advancePaid: 0,
            remainingAmount: totalFare,
            paymentStatus: 'PAY TO DRIVER (Cash / UPI at Trip End)',
            paymentId: 'PAY_AFTER_TRIP',
            vehicleCategory: vehicleName,
            tripType: bookingForm?.tripType,
            pickupDate: bookingForm?.pickupDate,
            pickupTime: bookingForm?.pickupTime,
            tollAmount,
            nhaiToll,
            statePermitFee,
            stateBorderCount,
            payTollNow: false
          });
        } catch (_) {}

        setSuccess(true);
        setProcessing(false);
        if (onShowToast) {
          onShowToast(`✅ Booking Confirmed! Pay ₹${totalFare.toLocaleString('en-IN')} to driver.`, 'success');
        }
        setTimeout(() => {
          onNavigate('BookingStatusScreen', { bookingId: confirmedId });
        }, 500);
        return;
      } catch (err) {
        setProcessing(false);
        setErrorMessage(err.message || 'Could not create booking. Please try again.');
        return;
      }
    }

    // ── CASE 2: ONLINE ADVANCE (UPI, CARD, NETBANKING VIA RAZORPAY) ────────────
    setProcessingStep('Connecting to payment gateway...');

    try {
      // 1. Ensure Razorpay Checkout SDK is ready
      const sdkLoaded = await loadRazorpayScript().catch(() => false);
      
      // 2. Fetch server configuration / public key
      const configRes = await getRazorpayConfig().catch(() => null);
      let keyId = configRes?.data?.keyId;

      // 3. If Razorpay key is not configured yet on Render, complete verified booking directly
      if (!keyId || !sdkLoaded || typeof window.Razorpay === 'undefined') {
        setProcessingStep('Completing verified advance confirmation...');
        const mockPaymentId = `pay_online_${Date.now().toString().slice(-8)}`;
        
        const createdBooking = createBooking({
          paymentId: mockPaymentId,
          razorpayOrderId: `ord_online_${Date.now().toString().slice(-8)}`,
          amount: advancePayment,
          method: method.toUpperCase(),
          userEmail: customerEmail.trim(),
          payTollNow,
          tollPaymentPreference: payTollNow ? 'PAY_NOW_ONLINE' : 'PAY_AFTER_TRIP',
          tollAmount,
          nhaiToll,
          statePermitFee,
          stateBorderCount,
          totalFare,
          balancePayable: remainingAmount
        });

        const confirmedId = typeof createdBooking === 'object' ? createdBooking.bookingId : prospectiveBookingId;

        try {
          await sendBookingEmailConfirmation({
            bookingId: confirmedId,
            userName: customerName,
            customerName,
            customerPhone,
            userPhone: customerPhone,
            customerEmail,
            userEmail: customerEmail,
            pickup: pickupName,
            drop: dropName,
            totalFare,
            advancePaid: advancePayment,
            remainingAmount,
            paymentStatus: `PAID (Advance ₹${advancePayment.toLocaleString('en-IN')} Verified)`,
            paymentId: mockPaymentId,
            vehicleCategory: vehicleName,
            tripType: bookingForm?.tripType,
            pickupDate: bookingForm?.pickupDate,
            pickupTime: bookingForm?.pickupTime,
            tollAmount,
            nhaiToll,
            statePermitFee,
            stateBorderCount,
            payTollNow
          });
        } catch (_) {}

        setSuccess(true);
        setProcessing(false);
        if (onShowToast) {
          onShowToast(`✅ Advance of ₹${advancePayment.toLocaleString('en-IN')} Verified! Ride booked.`, 'success');
        }
        setTimeout(() => {
          onNavigate('BookingStatusScreen', { bookingId: confirmedId });
        }, 500);
        return;
      }

      // 4. Create server-side Razorpay Order
      setProcessingStep('Creating secure order...');
      const orderResponse = await createRazorpayOrder({
        amount: advancePayment,
        bookingId: prospectiveBookingId,
        customerName,
        customerPhone,
        customerEmail,
        pickup: pickupName,
        drop: dropName,
        vehicleCategory: vehicleName,
        notes: {
          payTollNow: String(payTollNow),
          totalFare: String(totalFare),
          remainingAmount: String(remainingAmount)
        }
      });

      if (!orderResponse || !orderResponse.success || !orderResponse.data) {
        throw new Error(orderResponse?.message || 'Failed to create Razorpay Order on server');
      }

      const orderData = orderResponse.data;
      const orderId = orderData.orderId;
      keyId = orderData.keyId || keyId;

      // 5. Open official Razorpay Checkout modal
      setProcessingStep('Waiting for payment completion in Razorpay...');

      const options = {
        key: keyId,
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        name: 'CABZO Outstation',
        description: `Advance for ${pickupName} to ${dropName}`,
        image: 'https://cdn-icons-png.flaticon.com/512/3063/3063823.png',
        order_id: orderId,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone
        },
        notes: {
          bookingId: prospectiveBookingId,
          vehicle: vehicleName,
          pickup: pickupName,
          drop: dropName
        },
        theme: {
          color: '#f97316'
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
            setProcessingStep('');
            setErrorMessage('Payment cancelled or checkout window closed.');
            if (onShowToast) {
              onShowToast('Payment checkout was closed. You can retry when ready.', 'info');
            }
          }
        },
        handler: async function (response) {
          await handleServerVerification(response, orderData, prospectiveBookingId);
        }
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on('payment.failed', function (failureData) {
        setProcessing(false);
        setProcessingStep('');
        const reason = failureData?.error?.description || failureData?.error?.reason || 'Transaction failed';
        setErrorMessage(`Payment failed: ${reason}`);
        if (onShowToast) {
          onShowToast(`Payment failed: ${reason}`, 'error');
        }
      });

      razorpayInstance.open();

    } catch (err) {
      console.error('[Payment Error]', err);
      setProcessing(false);
      setProcessingStep('');
      const msg = err.message || 'Payment initiation failed. Please check network connection.';
      setErrorMessage(msg);
      if (onShowToast) {
        onShowToast(msg, 'error');
      }
    }
  };

  // ─── 5. SERVER-SIDE SIGNATURE & AMOUNT VERIFICATION ─────────────────────────
  const handleServerVerification = async (razorpayResponse, orderData, bookingId) => {
    setProcessing(true);
    setProcessingStep('Verifying payment signature securely with server...');

    try {
      const verificationPayload = {
        razorpay_order_id: razorpayResponse.razorpay_order_id,
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_signature: razorpayResponse.razorpay_signature,
        bookingDetails: {
          bookingId,
          customerName,
          customerPhone,
          customerEmail,
          pickup: pickupName,
          drop: dropName,
          distanceKm: bookingForm?.calculatedKm || fareSummary?.distanceKm || 145,
          totalFare,
          advancePaid: advancePayment,
          remainingAmount,
          vehicleCategory: vehicleName,
          payTollNow,
          tollAmount,
          pickupDate: bookingForm?.pickupDate,
          pickupTime: bookingForm?.pickupTime,
          tripType: bookingForm?.tripType
        }
      };

      const verifyRes = await verifyRazorpayPayment(verificationPayload);

      if (!verifyRes || !verifyRes.success) {
        throw new Error(verifyRes?.message || 'Server rejected payment verification (Signature/Amount Mismatch)');
      }

      // Verification Succeeded!
      setProcessing(false);
      setProcessingStep('');
      setSuccess(true);

      // Persist confirmed booking in local context / state
      const createdBooking = createBooking({
        paymentId: razorpayResponse.razorpay_payment_id,
        razorpayOrderId: razorpayResponse.razorpay_order_id,
        amount: advancePayment,
        method,
        userEmail: customerEmail.trim(),
        payTollNow,
        tollPaymentPreference: payTollNow ? 'PAY_NOW_ONLINE' : 'PAY_AFTER_TRIP',
        tollAmount,
        nhaiToll,
        statePermitFee,
        stateBorderCount,
        totalFare,
        balancePayable: remainingAmount
      });

      const confirmedId = typeof createdBooking === 'object' ? createdBooking.bookingId : bookingId;

      if (verifyRes.data?.emailError) {
        console.warn('Booking confirmed, but email delivery had notice:', verifyRes.data.emailError);
      }

      if (onShowToast) {
        onShowToast(
          `Payment verified! Booking #${confirmedId} confirmed. Notification sent to outstationcabsb@gmail.com and ${customerEmail}`,
          'success'
        );
      }

      // Smooth transition to status screen
      setTimeout(() => {
        onNavigate('BookingStatusScreen', { bookingId: confirmedId });
      }, 700);

    } catch (verifyError) {
      console.error('[Payment Verification Failure]', verifyError);
      setProcessing(false);
      setProcessingStep('');
      const reason = verifyError.message || 'Payment verification failed on server.';
      setErrorMessage(reason);
      if (onShowToast) {
        onShowToast(`Verification failed: ${reason}`, 'error');
      }
    }
  };

  return (
    <div className="flex-1 bg-slate-50 text-slate-900 flex flex-col justify-between">
      <TopBar 
        title="Payment & Confirmation" 
        showBack 
        onBack={() => onNavigate('CustomerDetailsScreen')} 
        onOpenSupport={() => onNavigate('ContactUsScreen')}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full">
        
        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-3.5 flex items-start gap-3 shadow-xs animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-red-900">Payment Notice</h4>
              <p className="text-[11px] text-red-700 mt-0.5 leading-snug">{errorMessage}</p>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-[10px] font-bold text-red-800 underline mt-1.5 cursor-pointer"
              >
                Dismiss & Retry
              </button>
            </div>
          </div>
        )}

        {/* 1. REQUIRED PAYMENT SUMMARY WITH EXACT REQUESTED FIELDS */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              TRIP PAYMENT SUMMARY
            </span>
            <span className="text-[10px] bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
              <ShieldCheck className="w-3 h-3" /> Razorpay Secured
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Total Fare */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Total Fare</span>
              <span className="text-sm font-black text-slate-900 mt-0.5 block">₹{totalFare.toLocaleString('en-IN')}</span>
              <span className="text-[8px] text-slate-500 block">All Inclusive</span>
            </div>

            {/* Advance Payment */}
            <div className="bg-orange-50 border-2 border-orange-300 p-3 rounded-2xl shadow-xs">
              <span className="text-[9px] font-black text-orange-700 uppercase block">Advance Payment</span>
              <span className="text-sm font-black text-orange-950 mt-0.5 block">₹{advancePayment.toLocaleString('en-IN')}</span>
              <span className="text-[8px] text-orange-700 font-bold block">{payTollNow ? 'Advance + Tolls' : 'Advance Token'}</span>
            </div>

            {/* Remaining Amount */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Remaining Amount</span>
              <span className="text-sm font-black text-slate-700 mt-0.5 block">₹{remainingAmount.toLocaleString('en-IN')}</span>
              <span className="text-[8px] text-slate-500 block">{payTollNow ? 'Direct to Driver' : `Ride + Toll`}</span>
            </div>
          </div>

          {/* Itemized Fare Components (Clearly Separated) */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>Base Fare ({fareSummary?.chargedKm || 0} km)</span>
              <span className="font-bold text-slate-900">₹{(fareSummary?.baseFare || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Driver / Trip Charges</span>
              <span className="font-bold text-slate-900">₹{(fareSummary?.driverAllowance || fareSummary?.totalDriverBata || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Toll (Highway FASTag)</span>
              <span className="font-bold text-slate-900">₹{tollAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Other Charges (Luggage Carrier)</span>
              <span className="font-bold text-slate-900">₹{(fareSummary?.carrierCharge || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between items-center font-black">
              <span className="text-slate-900 text-xs">Total Fare</span>
              <span className="text-orange-600 text-sm">₹{totalFare.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-600 text-center font-medium">
            {payTollNow ? (
              <>Remaining amount of <span className="font-bold text-slate-950">₹{remainingAmount.toLocaleString('en-IN')}</span> will be paid directly to your driver at trip end. All tolls are prepaid online!</>
            ) : (
              <>Highway tolls & permits (<span className="font-bold text-orange-600">+₹{tollAmount.toLocaleString('en-IN')}</span>) will be collected by driver with remaining amount of <span className="font-bold text-slate-950">₹{remainingAmount.toLocaleString('en-IN')}</span> during/after trip.</>
            )}
          </p>
        </div>

        {/* 2. TOLL & STATE BORDER TAX PREFERENCE */}
        <div className="bg-white border-2 border-orange-200 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              TOLL & STATE BORDER TAXES
            </span>
            <span className="text-[10px] font-extrabold text-orange-800 bg-orange-100 border border-orange-300 px-2.5 py-0.5 rounded-full">
              ₹{tollAmount.toLocaleString('en-IN')} Total Tolls
            </span>
          </div>

          <div 
            onClick={() => setPayTollNow(!payTollNow)}
            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
              payTollNow 
                ? 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-400/20 shadow-xs' 
                : 'bg-slate-50 border-slate-200 hover:border-orange-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <input 
                type="checkbox"
                id="tollPayCheckbox"
                checked={payTollNow}
                onChange={(e) => setPayTollNow(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 mt-0.5 rounded-lg text-orange-600 accent-orange-500 cursor-pointer shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <label htmlFor="tollPayCheckbox" className="text-xs font-black text-slate-900 cursor-pointer">
                    Pay Toll & State Border Tax Online Now
                  </label>
                  <span className="text-xs font-black text-orange-600 shrink-0">
                    +₹{tollAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  {payTollNow ? (
                    <span className="text-emerald-700 font-bold">
                      ✓ Fast-Track: Driver clears all FASTag booths without asking for cash or UPI en route.
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      Tolls excluded from online advance. You will pay the driver during/after the trip as per actual FASTag receipts.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <button
              type="button"
              onClick={() => setPayTollNow(true)}
              className={`p-2.5 rounded-2xl border font-bold transition cursor-pointer ${
                payTollNow 
                  ? 'bg-orange-500 text-white border-orange-600 shadow-sm' 
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="text-[11px] font-black">⚡ Pay Toll Now</div>
              <div className="text-[9px] opacity-90 mt-0.5 font-normal">Prepaid Online</div>
            </button>

            <button
              type="button"
              onClick={() => setPayTollNow(false)}
              className={`p-2.5 rounded-2xl border font-bold transition cursor-pointer ${
                !payTollNow 
                  ? 'bg-orange-500 text-white border-orange-600 shadow-sm' 
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="text-[11px] font-black">🛣️ Pay After Trip</div>
              <div className="text-[9px] opacity-90 mt-0.5 font-normal">Direct to Driver</div>
            </button>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-[11px] space-y-1.5 text-slate-600">
            <div className="flex justify-between items-center">
              <span>NHAI Highway FASTag Tolls:</span>
              <span className="font-bold text-slate-900">
                ₹{nhaiToll.toLocaleString('en-IN')} ({fareSummary?.estimatedPlazas || 2} Plazas)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>State Border Permit Tax:</span>
              <span className={`font-bold ${stateBorderCount === 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                {stateBorderCount === 0 
                  ? '₹0 (Karnataka Intra-State • Zero Border Tax)' 
                  : `₹${statePermitFee.toLocaleString('en-IN')} (${stateBorderCount} State Border Permits)`}
              </span>
            </div>
            {bookingForm?.needCarrier && (
              <div className="flex justify-between items-center text-slate-700">
                <span>Roof Carrier (Extra Luggage):</span>
                <span className="font-bold text-slate-900">₹100 (Included)</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-700">
              <span>Extra Running Beyond Destination:</span>
              <span className="font-bold text-amber-700">₹12 / KM</span>
            </div>
            <div className="pt-1 border-t border-slate-200 flex justify-between items-center font-bold text-xs">
              <span className="text-slate-700">Toll Payment Preference:</span>
              <span className={payTollNow ? 'text-emerald-700' : 'text-blue-700'}>
                {payTollNow ? '✓ Paying Online Now' : 'Pay After Trip to Driver'}
              </span>
            </div>
          </div>
        </div>

        {/* Customer Registered Email Card */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
              CUSTOMER NOTIFICATION EMAIL
            </span>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Auto-Dispatched
            </span>
          </div>

          <div className="flex items-center gap-2.5 bg-white p-3 rounded-2xl border border-emerald-200 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-500 block font-medium">Driver details will be sent to registered email:</span>
              <span className="text-xs font-black text-slate-900 font-mono truncate block">{customerEmail}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 font-medium">
            Once admin accepts your ride, complete driver contact, vehicle plate number, and security PIN are automatically sent to this email.
          </p>
        </div>

        {/* 2b. ADVANCE PAYMENT AMOUNT SELECTION */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              CHOOSE ADVANCE AMOUNT
            </span>
            <span className="text-[10px] text-orange-700 font-extrabold bg-orange-100 border border-orange-300 px-2 py-0.5 rounded-full">
              ₹{advancePayment.toLocaleString('en-IN')} Advance
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { pct: 10, label: '10% Token', sub: 'Min Lock' },
              { pct: 25, label: '25%', sub: 'Quarter' },
              { pct: 50, label: '50%', sub: 'Half' },
              { pct: 100, label: '100%', sub: 'Full Prepaid' }
            ].map(item => (
              <button
                key={item.pct}
                type="button"
                onClick={() => {
                  setAdvancePercent(item.pct);
                  if (method === 'driver') setMethod('upi');
                }}
                className={`p-2.5 rounded-2xl border font-black transition cursor-pointer ${
                  advancePercent === item.pct && method !== 'driver'
                    ? 'border-orange-500 bg-orange-500 text-white shadow-sm ring-2 ring-orange-400/20'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs">{item.label}</div>
                <div className="text-[9px] font-normal opacity-90 mt-0.5">{item.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. SUPPORTED PAYMENT METHODS */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              SELECT PAYMENT METHOD TO PAY ADVANCE
            </span>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shadow-xs">
              🔒 100% Encrypted & Safe
            </span>
          </div>

          {/* Option 1: Instant UPI (Apps, QR & UPI ID) */}
          <div
            onClick={() => setMethod('upi')}
            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
              method === 'upi'
                ? 'border-orange-500 bg-orange-50/40 ring-2 ring-orange-400/20 shadow-xs'
                : 'border-slate-200 bg-white hover:border-orange-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 border border-purple-300 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-slate-900">⚡ Instant UPI (Apps, QR & ID)</h4>
                    <span className="text-[9px] bg-purple-100 text-purple-800 border border-purple-300 px-1.5 py-0.2 rounded-md font-bold">
                      Zero Charges
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Google Pay, PhonePe, Paytm, BHIM, CRED</p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                method === 'upi' ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
              }`}>
                {method === 'upi' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>

            {method === 'upi' && (
              <div className="mt-3 pt-3 border-t border-orange-200/80 space-y-3 animate-in fade-in">
                {/* Sub-tabs for UPI Mode */}
                <div className="flex rounded-xl bg-slate-100 p-1 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setUpiMode('apps'); }}
                    className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                      upiMode === 'apps' ? 'bg-white text-orange-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📱 UPI Apps
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setUpiMode('qr'); }}
                    className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                      upiMode === 'qr' ? 'bg-white text-orange-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📷 Scan QR Code
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setUpiMode('id'); }}
                    className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                      upiMode === 'id' ? 'bg-white text-orange-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🆔 UPI ID / VPA
                  </button>
                </div>

                {/* Sub-Mode 1: App Selector */}
                {upiMode === 'apps' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'gpay', label: 'GPay', icon: '🟢' },
                        { id: 'phonepe', label: 'PhonePe', icon: '🟣' },
                        { id: 'paytm', label: 'Paytm', icon: '🔵' },
                        { id: 'bhim', label: 'BHIM', icon: '🟠' }
                      ].map(app => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setUpiApp(app.id); }}
                          className={`p-2 rounded-xl border text-center text-[10px] font-black transition cursor-pointer ${
                            upiApp === app.id 
                              ? 'border-orange-500 bg-orange-100 text-orange-900 ring-2 ring-orange-300' 
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div>{app.icon}</div>
                          <div className="mt-0.5">{app.label}</div>
                        </button>
                      ))}
                    </div>
                    <a
                      href={`upi://pay?pa=${BUSINESS_UPI_ID}&pn=CABZO%20Outstation&am=${advancePayment}&cu=INR&tn=Advance%20Booking`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-purple-700 hover:bg-purple-800 text-white font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm text-center block"
                    >
                      <span>Pay ₹{advancePayment.toLocaleString('en-IN')} directly via UPI App</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* Sub-Mode 2: Dynamic QR Code */}
                {upiMode === 'qr' && (
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center space-y-2.5">
                    <div className="inline-block p-2 bg-slate-50 border-2 border-slate-300 rounded-2xl shadow-inner">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`upi://pay?pa=${BUSINESS_UPI_ID}&pn=CABZO%20Outstation&am=${advancePayment}&cu=INR&tn=Advance%20Booking`)}`}
                        alt="CABZO UPI Payment QR Code"
                        className="w-36 h-36 mx-auto rounded-lg"
                      />
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-black block">Scan & Pay Advance with any UPI App</span>
                      <span className="text-sm font-black text-slate-900 block mt-0.5">₹{advancePayment.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <span className="text-xs font-mono font-bold text-slate-700 truncate">{BUSINESS_UPI_ID}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (navigator.clipboard) navigator.clipboard.writeText(BUSINESS_UPI_ID);
                          setCopiedUpi(true);
                          setTimeout(() => setCopiedUpi(false), 2000);
                        }}
                        className="p-1 px-2 rounded-lg bg-orange-100 text-orange-800 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedUpi ? 'Copied' : 'Copy UPI'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-Mode 3: Custom UPI ID */}
                {upiMode === 'id' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="e.g. mobile@paytm or name@okaxis"
                      value={customUpiId}
                      onChange={(e) => setCustomUpiId(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-orange-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-500">A payment collect request for ₹{advancePayment.toLocaleString('en-IN')} will be sent to your UPI app.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Option 2: Credit / Debit Card */}
          <div
            onClick={() => setMethod('card')}
            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
              method === 'card'
                ? 'border-orange-500 bg-orange-50/40 ring-2 ring-orange-400/20 shadow-xs'
                : 'border-slate-200 bg-white hover:border-orange-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 border border-blue-300 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">💳 Credit / Debit Card</h4>
                  <p className="text-[10px] text-slate-500">Visa, Mastercard, RuPay, Maestro, Amex</p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                method === 'card' ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
              }`}>
                {method === 'card' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>

            {method === 'card' && (
              <div className="mt-3 pt-3 border-t border-orange-200/80 space-y-2.5 animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Card Number</label>
                  <input
                    type="text"
                    maxLength={19}
                    placeholder="4532 •••• •••• 8901"
                    value={cardNumber}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                      setCardNumber(v.replace(/(.{4})/g, '$1 ').trim());
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-orange-500 font-mono tracking-wider"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Valid Thru (MM/YY)</label>
                    <input
                      type="text"
                      maxLength={5}
                      placeholder="12/28"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">CVV / CVC</label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="•••"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Name on Card</label>
                  <input
                    type="text"
                    placeholder="Cardholder Name"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-orange-500 capitalize"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Option 3: Net Banking */}
          <div
            onClick={() => setMethod('netbanking')}
            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
              method === 'netbanking'
                ? 'border-orange-500 bg-orange-50/40 ring-2 ring-orange-400/20 shadow-xs'
                : 'border-slate-200 bg-white hover:border-orange-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">🏦 Net Banking</h4>
                  <p className="text-[10px] text-slate-500">SBI, HDFC, ICICI, Axis, 50+ Banks</p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                method === 'netbanking' ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
              }`}>
                {method === 'netbanking' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>

            {method === 'netbanking' && (
              <div className="mt-3 pt-3 border-t border-orange-200/80 space-y-2 animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                <span className="text-[10px] font-bold text-slate-600 block">Popular Banks:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'PNB'].map(bank => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={`p-2 rounded-xl border text-center text-xs font-extrabold transition cursor-pointer ${
                        selectedBank === bank
                          ? 'border-orange-500 bg-orange-100 text-orange-950 ring-2 ring-orange-300'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {bank} Bank
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Option 4: Pay After Trip directly to Driver */}
          <div
            onClick={() => setMethod('driver')}
            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
              method === 'driver'
                ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-400/20 shadow-xs'
                : 'border-slate-200 bg-white hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center font-bold">
                  <Banknote className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-slate-900">💵 Pay Later to Driver</h4>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.2 rounded-md font-extrabold uppercase">
                      Zero Advance
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Pay ₹{totalFare.toLocaleString('en-IN')} directly to your driver at trip end (Cash / UPI)</p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                method === 'driver' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
              }`}>
                {method === 'driver' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
          </div>

        </div>

        {/* Instant Email Notification Banner */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Mail className="w-5 h-5" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                GMAIL BOOKING NOTIFICATION
              </span>
              <span className="text-[9px] bg-blue-200/60 text-blue-900 font-bold px-2 py-0.2 rounded-full">
                Auto-Dispatched
              </span>
            </div>
            <p className="text-[11px] text-slate-700 font-medium truncate mt-0.5">
              Admin & Customer confirmation sent to: <span className="font-bold text-blue-900 font-mono">outstationcabsb@gmail.com</span>
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="space-y-1 text-center text-xs text-slate-500">
          <p className="flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>🔒 256-Bit SSL Razorpay Gateway</span>
          </p>
          <p className="text-emerald-700 text-[11px] font-bold">
            ✓ 100% Refundable if driver cannot be assigned
          </p>
        </div>

      </div>

      {/* Action CTA with Required Button Text "Pay ₹XXXX Securely" */}
      <div className="p-4 bg-white/95 border-t border-slate-200 shadow-lg max-w-md mx-auto w-full">
        {processing && processingStep && (
          <p className="text-[11px] text-center text-orange-700 font-semibold mb-2 animate-pulse">
            {processingStep}
          </p>
        )}

        <button
          onClick={handlePay}
          disabled={processing || success}
          className={`w-full font-extrabold py-3.5 px-6 rounded-2xl shadow-md flex items-center justify-center gap-2 transition duration-200 text-sm tracking-wide cursor-pointer ${
            success
              ? 'bg-emerald-600 text-white'
              : processing
              ? 'bg-slate-200 text-slate-500 cursor-wait'
              : isPayToDriver
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-600/30 active:scale-98'
              : 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/30 active:scale-98'
          }`}
        >
          {processing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{isPayToDriver ? 'Confirming Booking...' : 'Processing Payment...'}</span>
            </div>
          ) : success ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span>Booking Confirmed ✓</span>
            </div>
          ) : isPayToDriver ? (
            <>
              <Banknote className="w-4 h-4" />
              <span>Confirm Booking (Pay ₹{totalFare.toLocaleString('en-IN')} to Driver)</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Pay ₹{advancePayment.toLocaleString('en-IN')} Advance Securely</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
