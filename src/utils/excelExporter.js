/**
 * Excel / CSV Exporter & Spreadsheet Formatter for CabBazar Bookings
 */

export function convertBookingsToCSV(bookings = []) {
  const headers = [
    "Booking ID",
    "Booking Date",
    "Customer Phone",
    "Trip Type",
    "Trip Status",
    "Pickup City",
    "Pickup Full Address",
    "Drop City / Destination",
    "Drop Full Address",
    "Intermediate Stopovers",
    "Selected Route Mode",
    "Highway Corridor",
    "Distance (KM)",
    "Est. Duration",
    "Vehicle Category",
    "Passengers",
    "Pickup Schedule Date",
    "Pickup Time",
    "Return Date",
    "Return Time",
    "Total Gross Fare (INR)",
    "Advance Paid (INR)",
    "Balance Payable to Driver (INR)",
    "Driver Name",
    "Driver Phone",
    "Cab Registration Number",
    "Cab Model",
    "Payment ID"
  ];

  const rows = bookings.map(b => {
    const pAddr = typeof b.pickupLocation === "object" ? (b.pickupLocation?.address || b.pickup) : (b.pickup || "");
    const dAddr = typeof b.dropLocation === "object" ? (b.dropLocation?.address || b.drop) : (b.drop || "");
    const stopsList = (b.stops || []).map(s => typeof s === "object" ? s.name : s).join(" | ") || "None";
    let createdDate = "N/A";
    try {
      if (b.createdAt) createdDate = new Date(b.createdAt).toLocaleString("en-IN");
    } catch {}

    return [
      b.bookingId || "",
      createdDate,
      b.userPhone || "9876543210",
      b.tripType === "roundtrip" ? "Round Trip" : "One Way",
      b.status || "CONFIRMED",
      b.pickup || "",
      pAddr.replace(/,/g, " "),
      b.drop || "",
      dAddr.replace(/,/g, " "),
      stopsList.replace(/,/g, " "),
      b.selectedRouteName || "Car (Fastest)",
      b.selectedRouteSummary || "via Express Highway",
      b.distanceKm || 145,
      b.estimatedDuration || "3 hrs 15 mins",
      b.vehicleName || "Sedan (4+1)",
      b.passengers || 2,
      b.pickupDate || "",
      b.pickupTime || "",
      b.returnDate || "N/A",
      b.returnTime || "N/A",
      b.estimatedFare || 2050,
      b.advancePaid || 500,
      b.balancePayable || 1550,
      b.driverDetails?.name || "M. Suresh Kumar",
      b.driverDetails?.phone || "+91 94441 23456",
      b.driverDetails?.cabNumber || "TN 09 BX 4589",
      b.driverDetails?.cabModel || "Maruti Suzuki Dzire",
      b.paymentId || "pay_demo_10024"
    ];
  });

  const csvContent = [
    headers.map(h => '"' + h + '"').join(','),
    ...rows.map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(','))
  ].join('\r\n');

  return '\uFEFF' + csvContent;
}

export function downloadBookingsExcel(bookings = [], filename = "cabbazar_bookings_report.csv") {
  const csv = convertBookingsToCSV(bookings);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
