import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { TripPlan, EventPlan } from '../services/geminiService';

export const exportToPDF = (tripPlan: TripPlan, formData: any, totalBudget: number) => {
  const doc = new jsPDF();
  const destinationNames = tripPlan.destinations.map(d => d.name).join(', ');
  const isSolo = parseInt(formData.numberOfPeople) === 1;

  // Title
  doc.setFontSize(20);
  doc.text('AURA V-SAGE Trip Plan', 14, 22);

  // Summary
  doc.setFontSize(14);
  doc.text('Trip Summary', 14, 32);
  doc.setFontSize(11);
  doc.text(`Mode: ${isSolo ? 'Solo Travel' : 'Group Trip'}`, 14, 40);
  doc.text(`Departure: ${formData.departureCity}`, 14, 46);
  doc.text(`Destinations: ${destinationNames}`, 14, 52);
  doc.text(`Duration: ${formData.numberOfDays} Days`, 14, 58);
  doc.text(`Group Size: ${formData.numberOfPeople} People`, 14, 64);

  // Budget Breakdown
  doc.setFontSize(14);
  doc.text('Budget Breakdown', 14, 76);
  doc.setFontSize(11);
  doc.text(`Total Budget: INR ${totalBudget.toLocaleString()}`, 14, 84);
  
  const totalEstCost = tripPlan.destinations.reduce((sum, d) => sum + d.cost, 0);
  doc.text(`Estimated Total Cost: INR ${totalEstCost.toLocaleString()}`, 14, 90);

  // Destination Details
  doc.setFontSize(14);
  doc.text('Places Covered', 14, 102);
  doc.setFontSize(11);
  
  let yPos = 110;
  tripPlan.destinations.forEach((dest, index) => {
    doc.text(`${index + 1}. ${dest.name} (${dest.type}) - ${dest.distance}`, 14, yPos);
    yPos += 6;
  });

  // Emergency Contacts
  yPos += 6;
  doc.setFontSize(14);
  doc.text('Emergency Contacts', 14, yPos);
  yPos += 8;
  doc.setFontSize(11);
  doc.text(`Hospital: ${tripPlan.emergencyContacts.hospital}`, 14, yPos);
  yPos += 6;
  doc.text(`Police: ${tripPlan.emergencyContacts.police}`, 14, yPos);
  yPos += 6;
  doc.text(`Helpline: ${tripPlan.emergencyContacts.helpline}`, 14, yPos);

  // Hotels
  yPos += 12;
  doc.setFontSize(14);
  doc.text('Recommended Stays', 14, yPos);
  yPos += 8;
  doc.setFontSize(11);
  tripPlan.hotels?.forEach((hotel, index) => {
    doc.text(`${index + 1}. ${hotel.name} - INR ${hotel.costPerNight}/night (${hotel.rating}*)`, 14, yPos);
    yPos += 6;
  });

  // Restaurants
  yPos += 6;
  doc.setFontSize(14);
  doc.text('Restaurant Suggestions', 14, yPos);
  yPos += 8;
  doc.setFontSize(11);
  tripPlan.restaurants?.forEach((restaurant, index) => {
    doc.text(`${index + 1}. ${restaurant.name} (${restaurant.cuisine}) - Avg INR ${restaurant.avgCostPerPerson}/head`, 14, yPos);
    yPos += 6;
  });

  // Itinerary Table
  const tableData: any[] = [];
  tripPlan.itinerary.forEach((dayPlan) => {
    dayPlan.activities.forEach((activity) => {
      tableData.push([
        `Day ${dayPlan.day}`,
        activity.time,
        activity.title,
        activity.desc,
        activity.distanceFromPrevious || '-',
        `INR ${activity.cost}`
      ]);
    });
  });

  autoTable(doc, {
    startY: yPos + 10,
    head: [['Day', 'Time', 'Activity', 'Location', 'Distance', 'Est. Cost']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [255, 122, 24] }
  });

  doc.save('AURA_V-SAGE_Trip_Plan.pdf');
};

export const exportToExcel = (tripPlan: TripPlan, formData: any) => {
  const tableData: any[] = [];
  
  // Add header row
  tableData.push(['Day', 'Time', 'Activity', 'Location', 'Distance', 'Est. Cost (INR)']);
  
  tripPlan.itinerary.forEach((dayPlan) => {
    dayPlan.activities.forEach((activity) => {
      tableData.push([
        `Day ${dayPlan.day}`,
        activity.time,
        activity.title,
        activity.desc,
        activity.distanceFromPrevious || '-',
        activity.cost
      ]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(tableData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Itinerary');

  // Add Hotels sheet
  const hotelData: any[][] = [['Name', 'Description', 'Cost/Night', 'Rating', 'Location']];
  tripPlan.hotels?.forEach(h => {
    hotelData.push([h.name, h.description, h.costPerNight, h.rating, h.location]);
  });
  const hws = XLSX.utils.aoa_to_sheet(hotelData);
  XLSX.utils.book_append_sheet(wb, hws, 'Hotels');

  // Add Restaurants sheet
  const restData: any[][] = [['Name', 'Cuisine', 'Description', 'Avg Cost/Person', 'Rating', 'Location']];
  tripPlan.restaurants?.forEach(r => {
    restData.push([r.name, r.cuisine, r.description, r.avgCostPerPerson, r.rating, r.location]);
  });
  const rws = XLSX.utils.aoa_to_sheet(restData);
  XLSX.utils.book_append_sheet(wb, rws, 'Restaurants');

  XLSX.writeFile(wb, 'AURA_V-SAGE_Trip_Plan.xlsx');
};

export const exportIVApprovalPDF = (tripPlan: TripPlan, formData: any) => {
  const doc = new jsPDF();
  const destinationNames = tripPlan.destinations.map(d => d.name).join(', ');

  doc.setFontSize(18);
  doc.text('Industrial Visit (IV) Approval Request', 14, 22);

  doc.setFontSize(12);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 32);
  doc.text(`To: The Principal / Head of Department`, 14, 40);
  doc.text(`From: Trip Coordinator`, 14, 48);
  doc.text(`Subject: Request for Approval of Industrial Visit to ${destinationNames}`, 14, 56);

  doc.text(`Respected Sir/Madam,`, 14, 70);
  
  const bodyText = `We are planning an Industrial Visit for ${formData.numberOfPeople} students to ${destinationNames} for a duration of ${formData.numberOfDays} days. The objective of this trip is to provide students with practical industry exposure and team-building experiences.`;
  const splitBody = doc.splitTextToSize(bodyText, 180);
  doc.text(splitBody, 14, 80);

  doc.text(`Trip Details:`, 14, 100);
  doc.text(`- Destinations: ${destinationNames}`, 14, 110);
  doc.text(`- Duration: ${formData.numberOfDays} Days`, 14, 118);
  doc.text(`- Number of Students: ${formData.numberOfPeople}`, 14, 126);
  doc.text(`- Departure City: ${formData.departureCity}`, 14, 134);

  doc.text(`Safety Measures:`, 14, 150);
  doc.text(`- First aid kit available`, 14, 160);
  doc.text(`- Verified transport vendor`, 14, 168);
  doc.text(`- Strict curfew timings`, 14, 176);

  doc.text(`We request you to kindly grant us permission for this educational trip.`, 14, 196);

  doc.text(`Yours sincerely,`, 14, 216);
  doc.text(`Trip Coordinator`, 14, 226);

  doc.save('IV_Approval_Document.pdf');
};

export const exportEventToPDF = (eventPlan: EventPlan, formData: any) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('AURA V-SAGE Event Plan', 14, 22);

  // Summary
  doc.setFontSize(14);
  doc.text('Event Summary', 14, 32);
  doc.setFontSize(11);
  doc.text(`Event Type: ${formData.eventType}`, 14, 40);
  doc.text(`Location: ${formData.location}`, 14, 46);
  doc.text(`Guests: ${formData.guests}`, 14, 52);
  doc.text(`Total Budget: INR ${parseInt(formData.budget).toLocaleString()}`, 14, 58);

  // Budget Breakdown Table
  doc.setFontSize(14);
  doc.text('Budget Breakdown', 14, 70);
  const budgetData = eventPlan.budgetBreakdown.map(item => [
    item.category,
    `${item.percentage}%`,
    `INR ${item.allocatedAmount.toLocaleString()}`,
    item.description
  ]);
  autoTable(doc, {
    startY: 75,
    head: [['Category', 'Percentage', 'Allocated Amount', 'Description']],
    body: budgetData,
    theme: 'grid',
    headStyles: { fillColor: [255, 122, 24] }
  });

  // Checklist Table
  let yPos = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('Planning Checklist', 14, yPos);
  const checklistData = eventPlan.checklist.map(item => [
    item.task,
    item.priority,
    item.timeline
  ]);
  autoTable(doc, {
    startY: yPos + 5,
    head: [['Task', 'Priority', 'Timeline']],
    body: checklistData,
    theme: 'grid',
    headStyles: { fillColor: [255, 122, 24] }
  });

  // Itinerary Table
  yPos = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('Event Schedule', 14, yPos);
  const itineraryData = eventPlan.itinerary.map(item => [
    item.time,
    item.activity
  ]);
  autoTable(doc, {
    startY: yPos + 5,
    head: [['Time', 'Activity']],
    body: itineraryData,
    theme: 'grid',
    headStyles: { fillColor: [255, 122, 24] }
  });

  doc.save(`AURA_V-SAGE_${formData.eventType}_Plan.pdf`);
};
