import sedanImg from '../assets/sedan_dzire.jpg';
import suvImg from '../assets/ertiga_suv.jpg';
import innovaImg from '../assets/innova_crysta.jpg';
import tempoImg from '../assets/tempo_traveller.jpg';

// CABZO Outstation Vehicle & Pricing Master Configuration
export const TOLL_VEHICLE_CLASSES = {
  sedan: {
    tollClass: 'CAR_LMV',
    tollClassLabel: 'Car / Jeep / Van / LMV (Class 1)',
    multiplier: 1.0
  },
  suv: {
    tollClass: 'CAR_LMV',
    tollClassLabel: 'Car / Jeep / Van / LMV (Class 1)',
    multiplier: 1.0
  },
  innova: {
    tollClass: 'CAR_LMV',
    tollClassLabel: 'Car / Jeep / Van / LMV (Class 1)',
    multiplier: 1.0
  },
  tempo: {
    tollClass: 'MINIBUS_LCV',
    tollClassLabel: 'Mini-Bus / LCV (Class 2)',
    multiplier: 1.6
  }
};

export const VEHICLE_CONFIGS = {
  sedan: {
    id: 'sedan',
    name: 'Sedan',
    modelName: 'Maruti Suzuki Dzire / Etios',
    fullName: 'Sedan Dzire (4+1)',
    tag: 'Economical & Popular',
    description: 'Maruti Dzire, Toyota Etios, Hyundai Aura',
    ratePerKm: 14,
    extraKmRate: 12,
    minKmPerDay: 250,
    driverBataPerDay: 300,
    driverBataMultiDay: 400,
    tollClass: 'CAR_LMV',
    statePermitPerBorder: 150,
    capacity: 4,
    capacityText: '4 Seats',
    luggage: '2 Large Bags',
    ac: true,
    available: true,
    image: sedanImg
  },
  suv: {
    id: 'suv',
    name: 'SUV (Ertiga)',
    modelName: 'Maruti Suzuki Ertiga',
    fullName: 'Maruti Suzuki Ertiga (6+1)',
    tag: 'Spacious & Comfortable',
    description: 'Maruti Suzuki Ertiga AC with extra boot space',
    ratePerKm: 19,
    extraKmRate: 12,
    minKmPerDay: 250,
    driverBataPerDay: 300,
    driverBataMultiDay: 400,
    tollClass: 'CAR_LMV',
    statePermitPerBorder: 150,
    capacity: 6,
    capacityText: '6 Seats',
    luggage: '3 Large Bags',
    ac: true,
    available: true,
    image: suvImg
  },
  innova: {
    id: 'innova',
    name: 'Innova Crysta',
    modelName: 'Toyota Innova Crysta',
    fullName: 'Innova Crysta (7+1)',
    tag: 'Executive Family Ride',
    description: 'Toyota Innova Crysta with Captain Seats',
    ratePerKm: 24,
    extraKmRate: 12,
    minKmPerDay: 250,
    driverBataPerDay: 300,
    driverBataMultiDay: 400,
    tollClass: 'CAR_LMV',
    statePermitPerBorder: 150,
    capacity: 7,
    capacityText: '6/7 Seats',
    luggage: '4 Large Bags',
    ac: true,
    available: true,
    image: innovaImg
  },
  tempo: {
    id: 'tempo',
    name: 'Tempo Traveller',
    modelName: 'Force Luxury Traveller',
    fullName: 'Tempo Traveller (12+1)',
    tag: 'Presently Not Available',
    statusText: 'Presently Not Available',
    description: 'Force Traveller AC (Currently Not Available)',
    ratePerKm: 26,
    extraKmRate: 12,
    minKmPerDay: 300,
    driverBataPerDay: 500,
    tollClass: 'MINIBUS_LCV',
    statePermitPerBorder: 350,
    capacity: 12,
    capacityText: '12 Seats',
    luggage: '8 Large Bags',
    ac: true,
    available: false,
    image: tempoImg
  }
};

// Known Regions & Major Places for State Detection
export const STATE_MAPPINGS = {
  karnataka: [
    'karnataka', 'bengaluru', 'bangalore', 'mysuru', 'mysore', 'coorg', 'madikeri',
    'mangaluru', 'mangalore', 'hubballi', 'hubli', 'dharwad', 'belagavi', 'belgaum',
    'shivamogga', 'shimoga', 'chikkamagaluru', 'chikmagalur', 'hampi', 'hospet',
    'hosapete', 'hassan', 'udupi', 'gokarna', 'davanagere', 'kalaburagi', 'gulbarga',
    'ballari', 'bellary', 'vijayapura', 'bijapur', 'raichur', 'bidar', 'tumakuru',
    'tumkur', 'kolar', 'mandya', 'ramanagara', 'channapatna', 'chitradurga', 'bagalkot',
    'gadag', 'haveri', 'koppal', 'yadgir', 'karwar', 'bhatkal', 'murudeshwar', 'dandeli',
    'sakleshpur', 'sirsi', 'shravanabelagola', 'badami', 'srirangapatna', 'chamarajanagar',
    'nanjangud', 'bandipur', 'kudremukh', 'malpe', 'kundapura', 'dharmasthala', 'horanadu',
    'kodagu', 'bellandur', 'whitefield', 'indiranagar', 'koramangala', 'jayanagar', 'hebbal',
    'electronic city', 'rajajinagar', 'malleswaram', 'yelahanka', 'devanahalli'
  ],
  tamil_nadu: [
    'tamil nadu', 'tamilnadu', 'chennai', 'ooty', 'udhagamandalam', 'coimbatore', 'madurai',
    'kodaikanal', 'pondicherry', 'puducherry', 'hosur', 'vellore', 'salem', 'trichy',
    'tiruchirappalli', 'tirunelveli', 'kanyakumari', 'rameshwaram', 'thanjavur', 'kanchipuram', 'yelagiri'
  ],
  kerala: [
    'kerala', 'wayanad', 'kochi', 'cochin', 'trivandrum', 'thiruvananthapuram', 'calicut',
    'kozhikode', 'munnar', 'alleppey', 'alappuzha', 'kannur', 'thrissur', 'palakkad', 'bekal'
  ],
  andhra_pradesh: [
    'andhra', 'andhra pradesh', 'tirupati', 'vijayawada', 'visakhapatnam', 'vizag', 'guntur',
    'nellore', 'kurnool', 'anantapur', 'kadapa', 'chittoor', 'srisailam'
  ],
  telangana: [
    'telangana', 'hyderabad', 'secunderabad', 'warangal', 'nizamabad'
  ],
  goa: [
    'goa', 'panaji', 'panjim', 'madgaon', 'margao', 'vasco', 'calangute', 'baga', 'anjuna'
  ],
  maharashtra: [
    'maharashtra', 'mumbai', 'pune', 'nagpur', 'nashik', 'shirdi', 'kolhapur', 'solapur',
    'lonavala', 'mahabaleshwar', 'alibaug', 'aurangabad', 'chhatrapati sambhajinagar'
  ]
};

export function identifyState(location) {
  if (!location) return '';
  const text = (typeof location === 'object'
    ? `${location.state || ''} ${location.city || ''} ${location.name || ''} ${location.address || ''}`
    : String(location)
  ).toLowerCase().trim();

  for (const [stateKey, keywords] of Object.entries(STATE_MAPPINGS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        return stateKey;
      }
    }
  }
  return '';
}

// Known Highway FASTag Toll Matrix for Major Indian Outstation Corridors (One-Way for Car/LMV)
// Note: In India (NHAI Rules), Sedan, Ertiga, and Innova Crysta ALL fall under Class 1 (Car / Jeep / Van / LMV)
// and pay identical toll rates at all National Highway FASTag toll plazas.
const HIGHWAY_CORRIDOR_TOLLS = {
  'bengaluru-mysuru': { carToll: 330, plazas: 2, stateBorders: 0, highway: 'NH 275 Bengaluru-Mysuru Expressway' },
  'mysuru-bengaluru': { carToll: 330, plazas: 2, stateBorders: 0, highway: 'NH 275 Bengaluru-Mysuru Expressway' },
  'bengaluru-mangaluru': { carToll: 290, plazas: 4, stateBorders: 0, highway: 'NH 75 Hassan-Mangalore Highway' },
  'mangaluru-bengaluru': { carToll: 290, plazas: 4, stateBorders: 0, highway: 'NH 75 Hassan-Mangalore Highway' },
  'bengaluru-coorg': { carToll: 280, plazas: 3, stateBorders: 0, highway: 'NH 275 / State Highway' },
  'coorg-bengaluru': { carToll: 280, plazas: 3, stateBorders: 0, highway: 'NH 275 / State Highway' },
  'bengaluru-chennai': { carToll: 420, plazas: 6, stateBorders: 1, highway: 'NH 48 Bengaluru-Chennai Highway' },
  'chennai-bengaluru': { carToll: 420, plazas: 6, stateBorders: 1, highway: 'NH 48 Bengaluru-Chennai Highway' },
  'bengaluru-hyderabad': { carToll: 790, plazas: 9, stateBorders: 2, highway: 'NH 44 North-South Corridor' },
  'hyderabad-bengaluru': { carToll: 790, plazas: 9, stateBorders: 2, highway: 'NH 44 North-South Corridor' },
  'bengaluru-ooty': { carToll: 340, plazas: 4, stateBorders: 1, highway: 'NH 766 Bandipur Corridor' },
  'ooty-bengaluru': { carToll: 340, plazas: 4, stateBorders: 1, highway: 'NH 766 Bandipur Corridor' },
  'chennai-pondicherry': { carToll: 180, plazas: 2, stateBorders: 1, highway: 'ECR / NH 32' },
  'pondicherry-chennai': { carToll: 180, plazas: 2, stateBorders: 1, highway: 'ECR / NH 32' },
  'mumbai-pune': { carToll: 320, plazas: 2, stateBorders: 0, highway: 'Mumbai-Pune Expressway' },
  'pune-mumbai': { carToll: 320, plazas: 2, stateBorders: 0, highway: 'Mumbai-Pune Expressway' },
  'delhi-agra': { carToll: 435, plazas: 3, stateBorders: 1, highway: 'Yamuna Expressway' },
  'agra-delhi': { carToll: 435, plazas: 3, stateBorders: 1, highway: 'Yamuna Expressway' },
  'delhi-jaipur': { carToll: 460, plazas: 5, stateBorders: 1, highway: 'NH 48 / Delhi-Mumbai Expressway' },
  'jaipur-delhi': { carToll: 460, plazas: 5, stateBorders: 1, highway: 'NH 48 / Delhi-Mumbai Expressway' }
};

/**
 * Calculates highway toll and state border permit fees
 * based on actual route, distance, legal vehicle toll-class, and trip type.
 * 
 * Rules:
 * 1. Sedan, Ertiga, and Innova are all Car/LMV (Class 1) and pay identical toll.
 * 2. Tempo Traveller is Mini-Bus/LCV (Class 2) and pays 1.6x Car toll.
 * 3. Short trips (< 40 km) have 0 plazas and ₹0 toll.
 * 4. For round trips returning within 24 hours (1-day trip), NHAI offers a 24-hr return
 *    journey discount (1.5x one-way toll). Multi-day trips pay 2x one-way toll.
 * 5. Intra-state trips have ₹0 state border tax.
 */
export function calculateDynamicToll({
  pickup = '',
  drop = '',
  distanceKm = 145,
  vehicleId = 'sedan',
  tripType = 'oneway',
  days = 1
}) {
  const vehicle = VEHICLE_CONFIGS[vehicleId] || VEHICLE_CONFIGS.sedan;
  const tollClass = TOLL_VEHICLE_CLASSES[vehicleId] || TOLL_VEHICLE_CLASSES.sedan;

  const pName = (typeof pickup === 'object' ? pickup.city || pickup.name : pickup || '').toLowerCase().trim();
  const dName = (typeof drop === 'object' ? drop.city || drop.name : drop || '').toLowerCase().trim();

  const pState = identifyState(pickup);
  const dState = identifyState(drop);

  // Check if trip is strictly intra-state
  const isIntraKarnataka = (pState === 'karnataka' && (dState === 'karnataka' || !dState)) ||
                           (dState === 'karnataka' && !pState);
  const isSameState = isIntraKarnataka || (pState && dState && pState === dState);

  // 1. Check known highway corridors
  let corridorKey = null;
  for (const key of Object.keys(HIGHWAY_CORRIDOR_TOLLS)) {
    const [cFrom, cTo] = key.split('-');
    if (
      (pName.includes(cFrom) && dName.includes(cTo)) ||
      (pName.includes(cTo) && dName.includes(cFrom))
    ) {
      corridorKey = key;
      break;
    }
  }

  let baseCarToll = 0;
  let estimatedPlazas = 0;
  let highwayNote = 'National Highway NHAI Corridor';
  let stateBorderCount = 0;

  if (corridorKey && HIGHWAY_CORRIDOR_TOLLS[corridorKey]) {
    const corridor = HIGHWAY_CORRIDOR_TOLLS[corridorKey];
    baseCarToll = corridor.carToll;
    estimatedPlazas = corridor.plazas || 3;
    highwayNote = corridor.highway;
    stateBorderCount = corridor.stateBorders !== undefined 
      ? corridor.stateBorders 
      : (isSameState ? 0 : 1);
  } else {
    // Dynamic formula for arbitrary outstation routes across India:
    // Trips under 40 km are local/city rides with zero toll plazas
    if (distanceKm < 40) {
      estimatedPlazas = 0;
      baseCarToll = 0;
      highwayNote = 'City / Intra-District (No Highway Toll)';
    } else {
      // NHAI toll plazas are located every 60-70 km on Indian national highways
      estimatedPlazas = Math.max(1, Math.round(distanceKm / 65));
      // Standard average NHAI Car/LMV fee per toll plaza is ~₹95
      baseCarToll = estimatedPlazas * 95;
      highwayNote = `${estimatedPlazas} NHAI FASTag Plazas (~₹95/plaza)`;
    }

    // State border crossings logic:
    if (isSameState || isIntraKarnataka) {
      stateBorderCount = 0;
    } else if (pState && dState && pState !== dState) {
      stateBorderCount = distanceKm >= 900 ? 2 : 1;
    } else {
      if (distanceKm >= 1200) stateBorderCount = 2;
      else if (distanceKm >= 650) stateBorderCount = 1;
      else stateBorderCount = 0;
    }
  }

  // Raw one-way toll multiplied by legally applicable vehicle-class multiplier
  // Sedan (1.0), SUV/Ertiga (1.0), and Innova Crysta (1.0) pay IDENTICAL toll!
  const rawOneWayToll = Math.round(baseCarToll * tollClass.multiplier);

  // State border permit fee (strictly ₹0 for intra-state!)
  const statePermitFee = stateBorderCount * vehicle.statePermitPerBorder;
  const oneWayToll = rawOneWayToll + statePermitFee;

  // Round Trip Logic:
  // Under NHAI rules, a 24-Hour Return Journey pass provides a discounted return rate (1.5x one-way toll).
  // For multi-day trips (> 24 hours), the return trip pays full 2x toll.
  const isRoundTrip = tripType === 'roundtrip';
  const roundTripMultiplier = (days === 1) ? 1.5 : 2.0;

  const totalRawToll = isRoundTrip 
    ? Math.round(rawOneWayToll * roundTripMultiplier) 
    : rawOneWayToll;

  const totalStatePermit = isRoundTrip 
    ? Math.round(statePermitFee * (days === 1 ? 1.0 : 2.0)) 
    : statePermitFee;

  const totalToll = totalRawToll + totalStatePermit;

  let note = estimatedPlazas > 0 
    ? `${estimatedPlazas} NHAI Toll Plaza${estimatedPlazas > 1 ? 's' : ''} (FASTag)` 
    : 'No Highway Tolls';

  if (isRoundTrip && estimatedPlazas > 0) {
    note += days === 1 ? ' • 24-Hr Return Pass (1.5×)' : ' • Round Trip (2×)';
  }

  if (stateBorderCount > 0) {
    note += ` + ${stateBorderCount} State Border Permit${stateBorderCount > 1 ? 's' : ''}`;
  } else if (isIntraKarnataka || pState === 'karnataka') {
    note += ` (Intra-State • Zero Border Tax)`;
  }

  // --- TEMPORARY DEBUG LOGGING ---
  if (typeof console !== 'undefined' && console.log) {
    console.log('=== [CABZO TOLL CALCULATION DEBUG] ===', {
      pickup: pName,
      drop: dName,
      oneWayDistanceKm: distanceKm,
      roundTripDistanceKm: isRoundTrip ? distanceKm * 2 : distanceKm,
      route: corridorKey || 'Dynamic Distance-based NHAI Formula',
      tollPlazasDetected: estimatedPlazas,
      baseCarToll,
      vehicleCategory: vehicle.name,
      vehicleTollClass: tollClass.tollClassLabel,
      tollMultiplier: tollClass.multiplier,
      rawOneWayToll,
      tripType,
      days,
      roundTripMultiplier: isRoundTrip ? roundTripMultiplier : 1.0,
      stateBorderCount,
      statePermitFee,
      finalCalculatedToll: totalToll
    });
  }

  return {
    totalToll,
    oneWayToll,
    nhaiToll: totalRawToll,
    statePermitFee: totalStatePermit,
    estimatedPlazas: isRoundTrip ? estimatedPlazas * 2 : estimatedPlazas,
    stateBorderCount: isRoundTrip ? stateBorderCount * (days === 1 ? 1 : 2) : stateBorderCount,
    highwayNote: note,
    isInterstate: stateBorderCount > 0,
    isKarnataka: isIntraKarnataka || pState === 'karnataka'
  };
}

/**
 * Calculates itemized outstation fare breakdown
 * @param {Object} params
 */
export function calculateFare({
  vehicleId = 'suv',
  distanceKm = 145,
  days = 1,
  tripType = 'roundtrip',
  includeToll = true,
  needCarrier = false,
  extraLuggageCarrier = false,
  passengers = 2,
  pickup = '',
  drop = '',
  stops = []
}) {
  let selectedVehicleId = vehicleId;
  // If tempo selected but unavailable, default to suv
  if (selectedVehicleId === 'tempo') {
    selectedVehicleId = 'suv';
  }
  const vehicle = VEHICLE_CONFIGS[selectedVehicleId] || VEHICLE_CONFIGS.suv;

  // --- Distance & Billing Km ---
  // actualDistance is the one-way driving route distance
  const oneWayKm = Math.max(1, Math.round(Number(distanceKm) || 145));
  const isRoundTrip = tripType === 'roundtrip';
  const billingKm = isRoundTrip ? (oneWayKm * 2) : oneWayKm;

  // --- Trip Days ---
  // One-way trips are strictly 1 day (unless > 650 km, e.g. cross-country)
  // Round-trip trips respect user-selected calendar days (1 day for same-day return, 2 days, etc.)
  const numDays = isRoundTrip
    ? Math.max(1, Number(days) || 1)
    : (oneWayKm > 650 ? Math.ceil(oneWayKm / 500) : 1);

  // --- Driver Allowance (Bata) ---
  // Official Business Rule:
  // - 1-Day Trip: ₹300 per day (Total ₹300 for 1 day)
  // - Multi-Day Trip (> 1 day): ₹400 per day (Total numDays * ₹400)
  // - One-Way: ₹0 (Driver bata is included in the one-way per-km tariff; trips > 650 km get night allowance)
  const isMultiDay = numDays > 1;
  const driverBataRate = isMultiDay
    ? (vehicle.driverBataMultiDay || 400)
    : (vehicle.driverBataPerDay || 300);

  const driverAllowance = isRoundTrip
    ? numDays * driverBataRate
    : (oneWayKm > 650 ? driverBataRate : 0);

  // --- Dynamic Toll & State Border Taxes ---
  const tollInfo = calculateDynamicToll({
    pickup,
    drop,
    distanceKm: oneWayKm,
    vehicleId: selectedVehicleId,
    tripType,
    days: numDays
  });
  const tollAndFees = includeToll ? tollInfo.totalToll : 0;

  // --- Base Fare Calculation ---
  let baseFare = 0;
  let chargedKm = billingKm;

  if (isRoundTrip) {
    // Round Trip: Minimum billable km = numDays × minKmPerDay (250 km/day)
    // If actual round-trip km exceeds this threshold, user only pays for actual km!
    const minBillableKm = numDays * (vehicle.minKmPerDay || 250);
    chargedKm = Math.max(billingKm, minBillableKm);
    baseFare = Math.round(chargedKm * vehicle.ratePerKm);
  } else {
    // One-Way: Minimum billable km = 100 km (standard outstation minimum)
    // For standard trips (e.g. 145 km Bangalore-Mysuru), user pays actual 145 km × rate
    const minOneWayKm = 100;
    chargedKm = Math.max(oneWayKm, minOneWayKm);
    baseFare = Math.round(chargedKm * vehicle.ratePerKm);
  }

  // --- Roof Carrier / Extra Luggage Charge (+₹100) ---
  const hasCarrier = Boolean(needCarrier || extraLuggageCarrier);
  const carrierCharge = hasCarrier ? 100 : 0;
  const otherCharges = carrierCharge;

  // Extra km overage rate: ₹12 per km after total destination limit
  const extraKmRate = vehicle.extraKmRate || 12;

  const grossTotal = baseFare + driverAllowance + tollAndFees + otherCharges;

  // Advance Payment: 10% of gross (min ₹500, max ₹10,000)
  const advanceAmount = Math.min(10000, Math.max(500, Math.round(grossTotal * 0.10)));
  const balancePayable = Math.max(0, grossTotal - advanceAmount);

  return {
    vehicle,
    actualDistance: oneWayKm,       // Always one-way km for display
    chargedKm,                       // Km used for base fare billing
    ratePerKm: vehicle.ratePerKm,
    extraKmRate,
    baseFare,
    numDays,
    driverBataPerDay: isRoundTrip ? driverBataRate : 0,
    totalDriverBata: driverAllowance,
    tollParking: tollAndFees,
    estimatedToll: tollInfo.totalToll,
    nhaiToll: tollInfo.nhaiToll,
    statePermitFee: tollInfo.statePermitFee,
    estimatedPlazas: tollInfo.estimatedPlazas,
    stateBorderCount: tollInfo.stateBorderCount,
    highwayNote: tollInfo.highwayNote,
    isInterstate: tollInfo.isInterstate,
    isKarnataka: tollInfo.isKarnataka,
    includeToll,
    hasCarrier,
    carrierCharge,
    otherCharges,
    grossTotal,
    advanceAmount,
    balancePayable,
    passengers
  };
}

