const { seatInventory, projects } = require('../data/mockData');

/**
 * Updates seat assignments when a seat allocation ticket is approved
 * Modifies existing assignments and handles overlapping projects
 */
const updateSeatAssignments = (ticket, seatAssignments) => {
  if (ticket.type !== 'seat_allocation' || ticket.currentStatus !== 'approved') {
    return seatAssignments;
  }

  const { projectId, startDate, endDate, employeeEmails } = ticket.formData;
  const project = projects.find(p => p.id === projectId);
  
  if (!project) {
    console.error('Project not found:', projectId);
    return seatAssignments;
  }

  // Calculate required seats based on headcount and seat count percentage
  const headcount = employeeEmails ? employeeEmails.length : 0;
  const seatCountPercent = project.seatCountPercent || 70;
  const requiredSeats = Math.ceil(headcount * (seatCountPercent / 100));

  // Find available seats for the project's metro city
  const projectFacilities = seatInventory.filter(seat => {
    const facility = require('../data/mockData').facilities.find(f => f.id === seat.facilityId);
    return facility && facility.metroCity === project.metroCity;
  });

  if (projectFacilities.length === 0) {
    console.error('No facilities found for metro city:', project.metroCity);
    return seatAssignments;
  }

  // Get seats that are available or currently assigned to this project
  const availableSeats = projectFacilities.filter(seat => {
    const existingAssignment = seatAssignments.find(sa => 
      sa.seatId === seat.id && 
      sa.isActive && 
      new Date(sa.endDate) >= new Date(startDate)
    );
    
    // Seat is available if no assignment or assigned to same project
    return !existingAssignment || existingAssignment.projectId === projectId;
  }).slice(0, requiredSeats);

  if (availableSeats.length < requiredSeats) {
    console.warn(`Not enough seats available. Required: ${requiredSeats}, Available: ${availableSeats.length}`);
  }

  // Step 1: End existing assignments for this project that are not in the new request
  const newStartDate = new Date(startDate);
  const dayBefore = new Date(newStartDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const endDateForOldAssignments = dayBefore.toISOString().split('T')[0];

  seatAssignments.forEach(assignment => {
    if (assignment.projectId === projectId && 
        assignment.isActive && 
        new Date(assignment.endDate) >= newStartDate) {
      
      // Check if this seat is still needed in the new request
      const seatStillNeeded = availableSeats.some(seat => seat.id === assignment.seatId);
      
      if (!seatStillNeeded) {
        // End this assignment the day before new request starts
        assignment.endDate = endDateForOldAssignments;
        assignment.isActive = new Date(endDateForOldAssignments) >= new Date();
      }
    }
  });

  // Step 2: Create or update assignments for seats in the new request
  availableSeats.forEach((seat, index) => {
    const existingAssignment = seatAssignments.find(sa => 
      sa.seatId === seat.id && 
      sa.projectId === projectId && 
      sa.isActive
    );

    if (existingAssignment) {
      // Update existing assignment end date
      existingAssignment.endDate = endDate;
      existingAssignment.isActive = new Date(endDate) >= new Date();
    } else {
      // Create new assignment
      const newAssignment = {
        id: String(seatAssignments.length + 1),
        seatId: seat.id,
        facilityId: seat.facilityId,
        employeeId: employeeEmails && employeeEmails[index] ? employeeEmails[index] : `project_${projectId}_seat_${index + 1}`,
        projectId: projectId,
        startDate: startDate,
        endDate: endDate,
        isActive: true
      };
      
      seatAssignments.push(newAssignment);
    }
  });

  return seatAssignments;
};

/**
 * Removes employees from project when seat allocation is reduced
 * This is called when a new seat allocation ticket is approved with fewer employees
 */
const removeEmployeesFromProject = (ticket, allTickets) => {
  if (ticket.type !== 'seat_allocation' || ticket.currentStatus !== 'approved') {
    return allTickets;
  }

  const { projectId, employeeEmails: newEmployeeEmails } = ticket.formData;
  
  if (!newEmployeeEmails || !Array.isArray(newEmployeeEmails)) {
    return allTickets;
  }

  // Find previous approved seat allocation tickets for this project
  const previousTickets = allTickets.filter(t => 
    t.type === 'seat_allocation' && 
    t.currentStatus === 'approved' && 
    t.projectId === projectId &&
    parseInt(t.id) < parseInt(ticket.id) // Earlier tickets
  );

  if (previousTickets.length === 0) {
    return allTickets; // No previous tickets to compare
  }

  // Get the latest previous ticket
  const latestPreviousTicket = previousTickets.reduce((latest, current) => 
    parseInt(current.id) > parseInt(latest.id) ? current : latest
  );

  const previousEmployeeEmails = latestPreviousTicket.formData?.employeeEmails || [];
  
  // Find employees that were removed (in previous but not in new)
  const removedEmployees = previousEmployeeEmails.filter(email => 
    !newEmployeeEmails.includes(email)
  );

  console.log(`Removing ${removedEmployees.length} employees from project ${projectId}:`, removedEmployees);

  // Note: In a real database, we would delete employee records here
  // For mock data, the employee list is generated dynamically from tickets
  // so removing employees happens automatically when the new ticket becomes the latest

  return allTickets;
};
module.exports = {
  updateSeatAssignments,
  removeEmployeesFromProject
};