const bcrypt = require('bcryptjs');

// Demo users with hashed passwords
const users = [
  {
    id: '1',
    email: 'john.doe@accenture.com',
    password: bcrypt.hashSync('demo123', 10), // demo123
    name: 'John Doe',
    role: 'project_pic',
    department: 'Technology',
    title: 'Senior Manager'
  },
  {
    id: '2',
    email: 'jane.smith@accenture.com',
    password: bcrypt.hashSync('demo123', 10), // demo123
    name: 'Jane Smith',
    role: 'business_ops',
    department: 'Business Operations',
    title: 'Operations Manager'
  },
  {
    id: '3',
    email: 'admin@accenture.com',
    password: bcrypt.hashSync('demo123', 10), // demo123
    name: 'Admin User',
    role: 'admin',
    department: 'IT',
    title: 'System Administrator'
  }
];

const projects = [
  {
    "id": "1",
    "clientName": "Tech Corp",
    "projectName": "Digital Transformation Initiative",
    "projectCode": "DTI-001",
    "status": "active",
    "metroCity": "Jakarta",
    "startDate": "2024-01-15",
    "endDate": "2024-12-31",
    "deliveryLeadEmail": "john.doe@accenture.com",
    "primaryContactEmail": "john.doe@accenture.com",
    "secondaryContactEmail": "jane.contact@accenture.com",
    "primaryCPMOEmail": "cpmo1@accenture.com",
    "seatCountPercent": 85,
    "chargedSeatPercent": 75,
    "seatRate": 150000,
    "createdBy": "1",
    "lastModified": "2024-01-15T10:00:00Z",
    "wbsEntries": [
      {
        "id": "1",
        "wbsCode": "WBS-001-DEFAULT",
        "isDefault": true,
        "isActive": true,
        "createdDate": "2024-01-15T10:00:00Z"
      }
    ]
  },
  {
    "id": "2",
    "clientName": "Finance Solutions",
    "projectName": "Banking Platform Modernization",
    "projectCode": "BPM-002",
    "status": "active",
    "metroCity": "Surabaya",
    "startDate": "2024-02-01",
    "endDate": "2024-11-30",
    "deliveryLeadEmail": "sarah.lead@accenture.com",
    "primaryContactEmail": "sarah.lead@accenture.com",
    "secondaryContactEmail": "mike.contact@accenture.com",
    "seatCountPercent": 90,
    "chargedSeatPercent": 80,
    "seatRate": 175000,
    "createdBy": "1",
    "lastModified": "2024-02-01T09:00:00Z",
    "wbsEntries": [
      {
        "id": "2",
        "wbsCode": "WBS-002-DEFAULT",
        "isDefault": true,
        "isActive": true,
        "createdDate": "2024-02-01T09:00:00Z"
      }
    ]
  },
  {
    "id": "3",
    "clientName": "PT Telco",
    "projectName": "Telco Digital Platform",
    "projectCode": "TDP-003",
    "status": "active",
    "metroCity": "Jakarta",
    "startDate": "2024-03-01",
    "endDate": "2024-12-31",
    "deliveryLeadEmail": "john.doe@accenture.com",
    "primaryContactEmail": "john.doe@accenture.com",
    "secondaryContactEmail": "jane.contact@accenture.com",
    "primaryCPMOEmail": "cpmo1@accenture.com",
    "seatCountPercent": 80,
    "chargedSeatPercent": 70,
    "seatRate": 160000,
    "createdBy": "1",
    "lastModified": "2024-03-01T09:00:00Z",
    "wbsEntries": [
      {
        "id": "3",
        "wbsCode": "WBS-003-DEFAULT",
        "isDefault": true,
        "isActive": true,
        "createdDate": "2024-03-01T09:00:00Z"
      }
    ]
  },
  {
    "id": "4",
    "clientName": "PT Telko",
    "projectName": "Digital App",
    "projectCode": "TELKODA",
    "status": "active",
    "metroCity": "Semarang",
    "startDate": "2025-08-01",
    "endDate": "2026-03-31",
    "deliveryLeadEmail": "john.doe@accenture.com",
    "primaryContactEmail": "telkoPC@acn.com",
    "secondaryContactEmail": "telkoSC@acn.com",
    "primaryCPMOEmail": "telkoPCPMO@acn.com",
    "secondaryCPMOEmail": "telkoSCPMO@acn.com",
    "seatCountPercent": 60,
    "chargedSeatPercent": 60,
    "seatRate": 200000,
    "wbsEntries": [
      {
        "wbsCode": "BYD534L",
        "isDefault": true,
        "isActive": true,
        "createdDate": "2025-07-18T03:55:17.785Z"
      },
      {
        "wbsCode": "BYD477O",
        "isDefault": false,
        "isActive": true,
        "createdDate": "2025-07-18T03:55:17.785Z"
      }
    ],
    "createdBy": "2",
    "lastModified": "2025-07-18T03:55:17.793Z"
  }
];

const employees = [
  {
    id: '1',
    employeeId: 'EMP001',
    name: 'Alice Johnson',
    email: 'alice.johnson@accenture.com',
    department: 'Technology',
    title: 'Senior Developer',
    projectAssignments: ['1']
  },
  {
    id: '2',
    employeeId: 'EMP002',
    name: 'Bob Wilson',
    email: 'bob.wilson@accenture.com',
    department: 'Technology',
    title: 'Solutions Architect',
    projectAssignments: ['1', '2']
  },
  {
    id: '3',
    employeeId: 'EMP003',
    name: 'Carol Davis',
    email: 'carol.davis@accenture.com',
    department: 'Business Analysis',
    title: 'Business Analyst',
    projectAssignments: ['2']
  }
];

const facilities = [
  {
    id: '1',
    name: 'Jakarta Office Tower',
    metroCity: 'Jakarta',
    buildingName: 'Accenture Tower',
    buildingFloor: 15,
    address: 'Jl. Sudirman No. 123, Jakarta',
    totalSeats: 200,
    availableSeats: 45
  },
  {
    id: '2',
    name: 'Semarang Office',
    metroCity: 'Semarang',
    buildingName: 'Menara Suara Merdeka',
    buildingFloor: 9,
    address: 'Jl. Raya Darmo No. 456, Semarang',
    totalSeats: 150,
    availableSeats: 30
  }
];

const seatTypes = [
  {
    id: '1',
    name: 'Regular',
    costPerMonth: 150000,
    notes: 'Standard workspace with basic amenities'
  },
  {
    id: '2',
    name: 'Premium',
    costPerMonth: 200000,
    notes: 'Enhanced workspace with premium amenities'
  },
  {
    id: '3',
    name: 'Dedicated',
    costPerMonth: 250000,
    notes: 'Private workspace with dedicated resources'
  }
];

const seatInventory = [
  {
    id: '1',
    facilityId: '1',
    seatCode: 'JKT-15-A001',
    seatTypeId: '1',
    status: 'allocated',
    floor: 15,
    zone: 'Zone A',
    notes: 'Window seat'
  },
  {
    id: '2',
    facilityId: '1',
    seatCode: 'JKT-15-A002',
    seatTypeId: '1',
    status: 'allocated',
    floor: 15,
    zone: 'Zone A'
  },
  {
    id: '3',
    facilityId: '1',
    seatCode: 'JKT-15-B001',
    seatTypeId: '2',
    status: 'available',
    floor: 15,
    zone: 'Zone B'
  },
  // Add Semarang facility seats
  {
    id: '4',
    facilityId: '2',
    seatCode: 'SMG-09-A001',
    seatTypeId: '1',
    status: 'available',
    floor: 9,
    zone: 'Zone A'
  },
  {
    id: '5',
    facilityId: '2',
    seatCode: 'SMG-09-A002',
    seatTypeId: '1',
    status: 'available',
    floor: 9,
    zone: 'Zone A'
  },
  {
    id: '6',
    facilityId: '2',
    seatCode: 'SMG-09-A003',
    seatTypeId: '1',
    status: 'available',
    floor: 9,
    zone: 'Zone A'
  },
  {
    id: '7',
    facilityId: '2',
    seatCode: 'SMG-09-B001',
    seatTypeId: '2',
    status: 'available',
    floor: 9,
    zone: 'Zone B'
  },
  {
    id: '8',
    facilityId: '2',
    seatCode: 'SMG-09-B002',
    seatTypeId: '2',
    status: 'available',
    floor: 9,
    zone: 'Zone B'
  }
];

const seatRequests = [
  {
    id: '1',
    projectId: '1',
    requestorId: '1',
    startDate: '2024-01-15',
    endDate: '2024-12-31',
    headcount: 12,
    seatCount: 10,
    status: 'approved',
    projectComments: 'Initial team setup for project launch',
    employeeIds: ['1', '2'],
    seatIds: ['1', '2'],
    createdDate: '2024-01-10T14:30:00Z',
    lastModified: '2024-01-12T16:45:00Z'
  },
  {
    id: '2',
    projectId: '2',
    requestorId: '1',
    startDate: '2024-02-01',
    endDate: '2024-11-30',
    headcount: 8,
    seatCount: 7,
    status: 'pending',
    projectComments: 'Team expansion for phase 2',
    employeeIds: ['3'],
    seatIds: [],
    createdDate: '2024-01-25T11:15:00Z',
    lastModified: '2024-01-25T11:15:00Z'
  }
];

const invoices = [
  {
    id: '1',
    projectId: '1',
    billingPeriod: '2024-01',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    totalCost: 25000000,
    status: 'approved',
    seatRate: 150000,
    chargedSeatPercent: 75,
    generatedDate: '2024-01-26T08:00:00Z',
    confirmedBy: '1',
    confirmedDate: '2024-01-28T14:30:00Z',
    transactions: [
      {
        id: '1',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        headcount: 12,
        chargedSeat: 9,
        workingDays: 22,
        value: 25000000
      }
    ],
    payments: [
      {
        id: '1',
        wbsCode: 'WBS-001-DEFAULT',
        amount: 25000000
      }
    ]
  },
  {
    id: '2',
    projectId: '1',
    billingPeriod: '2024-02',
    startDate: '2024-02-01',
    endDate: '2024-02-29',
    totalCost: 23000000,
    status: 'pending_approval',
    seatRate: 150000,
    chargedSeatPercent: 75,
    generatedDate: '2024-02-26T08:00:00Z',
    transactions: [
      {
        id: '2',
        startDate: '2024-02-01',
        endDate: '2024-02-29',
        headcount: 12,
        chargedSeat: 9,
        workingDays: 20,
        value: 23000000
      }
    ],
    payments: [
      {
        id: '2',
        wbsCode: 'WBS-001-DEFAULT',
        amount: 23000000
      }
    ]
  }
];

const tickets = [
  {
    "id": "1",
    "type": "project_setup",
    "createdBy": "1",
    "currentStatus": "pending",
    "approvalStatus": "pending",
    "createdDate": "2024-01-20T10:00:00Z",
    "lastModified": "2024-01-20T10:00:00Z",
    "comments": [
      {
        "id": "1",
        "userId": "1",
        "message": "Requesting approval for new project setup",
        "createdDate": "2024-01-20T10:00:00Z"
      }
    ],
    "formData": {
      "clientName": "New Client Corp",
      "projectName": "Innovation Project",
      "metroCity": "Jakarta",
      "startDate": "2024-03-01",
      "endDate": "2024-12-31",
      "deliveryLeadEmail": "lead@accenture.com"
    }
  },
  {
    "id": "2",
    "type": "seat_allocation",
    "projectId": "2",
    "createdBy": "1",
    "currentStatus": "pending",
    "approvalStatus": "pending",
    "createdDate": "2024-01-25T11:15:00Z",
    "lastModified": "2024-01-25T11:15:00Z",
    "comments": [
      {
        "id": "2",
        "userId": "1",
        "message": "Requesting additional seats for team expansion",
        "createdDate": "2024-01-25T11:15:00Z"
      }
    ],
    "relatedSeatRequestId": "2",
    "formData": {
      "headcount": 8,
      "seatCount": 6,
      "employeeEmails": [
        "john.doe@accenture.com",
        "jane.smith@accenture.com",
        "bob.wilson@accenture.com",
        "alice.johnson@accenture.com",
        "carol.davis@accenture.com",
        "mike.brown@accenture.com"
      ],
      "reason": "Team expansion for phase 2"
    }
  },
  {
    "id": "3",
    "type": "project_setup",
    "formData": {
      "clientName": "PT Telko",
      "projectName": "Digital App",
      "projectCode": "TELKODA",
      "metroCity": "Semarang",
      "startDate": "2025-08-01",
      "endDate": "2026-03-31",
      "deliveryLeadEmail": "john.doe@accenture.com",
      "primaryContactEmail": "telkoPC@acn.com",
      "secondaryContactEmail": "telkoSC@acn.com",
      "primaryCPMOEmail": "telkoPCPMO@acn.com",
      "secondaryCPMOEmail": "telkoSCPMO@acn.com",
      "wbsEntries": [
        {
          "id": "1",
          "wbsCode": "BYD534L",
          "isActive": true,
          "isDefault": true
        },
        {
          "id": "1752810853361",
          "wbsCode": "BYD477O",
          "isActive": true,
          "isDefault": false
        }
      ]
    },
    "createdBy": "1",
    "currentStatus": "approved",
    "approvalStatus": "approved",
    "createdDate": "2025-07-18T03:54:25.681Z",
    "lastModified": "2025-07-18T03:55:17.783Z",
    "comments": [],
    "busOpsComments": "approved",
    "busOpsFields": {
      "seatCountPercent": "60",
      "chargedSeatPercent": "60",
      "seatRate": "200000"
    }
  },
  {
    "id": "4",
    "type": "seat_allocation",
    "projectId": "4",
    "formData": {
      "projectId": "4",
      "startDate": "2025-08-01",
      "endDate": "2026-03-31",
      "headcount": 4,
      "seatCount": 3,
      "employeeEmails": [
        "telkoemp1@acn.com",
        "telkoemp2@acn.com",
        "telkoemp3@acn.com"
      ],
      "reason": "first seat allocation"
    },
    "createdBy": "1",
    "currentStatus": "pending",
    "approvalStatus": "pending",
    "createdDate": "2025-07-18T03:56:26.165Z",
    "lastModified": "2025-07-18T03:56:26.165Z",
    "comments": []
  }
];

// Update seat requests to include employee emails
seatRequests[0].employeeEmails = [
  'alice.johnson@accenture.com',
  'bob.wilson@accenture.com',
  'carol.davis@accenture.com',
  'david.lee@accenture.com',
  'emma.white@accenture.com',
  'frank.brown@accenture.com',
  'grace.taylor@accenture.com',
  'henry.clark@accenture.com',
  'iris.martinez@accenture.com',
  'jack.anderson@accenture.com'
];

seatRequests[1].employeeEmails = [
  'kevin.thomas@accenture.com',
  'laura.jackson@accenture.com',
  'mike.harris@accenture.com',
  'nina.martin@accenture.com',
  'oscar.garcia@accenture.com',
  'paula.rodriguez@accenture.com',
  'quinn.lewis@accenture.com'
];

// Function to create seat assignments from approved seat requests
const createSeatAssignmentsFromRequests = () => {
  const assignments = [];
  let assignmentId = 1;
  
  // Get all approved seat allocation tickets, sorted by creation date
  const approvedSeatTickets = tickets
    .filter(t => t.type === 'seat_allocation' && t.currentStatus === 'approved')
    .sort((a, b) => new Date(a.createdDate) - new Date(b.createdDate));
  
  // Process each approved ticket to build seat assignments
  approvedSeatTickets.forEach(ticket => {
    const { projectId, startDate, endDate, employeeEmails } = ticket.formData;
    const project = projects.find(p => p.id === projectId);
    
    if (!project || !employeeEmails) return;
    
    // Calculate required seats
    const headcount = employeeEmails.length;
    const seatCountPercent = project.seatCountPercent || 70;
    const requiredSeats = Math.ceil(headcount * (seatCountPercent / 100));
    
    // Find available seats for this project's metro city
    const projectFacilities = seatInventory.filter(seat => {
      const facility = facilities.find(f => f.id === seat.facilityId);
      return facility && facility.metroCity === project.metroCity;
    });
    
    // Get seats that are available for this time period
    const availableSeats = projectFacilities.filter(seat => {
      // Check if seat is available during the requested period
      const conflictingAssignment = assignments.find(assignment => 
        assignment.seatId === seat.id &&
        assignment.projectId !== projectId &&
        assignment.isActive &&
        !(new Date(assignment.endDate) < new Date(startDate) || 
          new Date(assignment.startDate) > new Date(endDate))
      );
      return !conflictingAssignment;
    }).slice(0, requiredSeats);
    
    // End existing assignments for this project that are not in the new request
    const ticketStartDate = new Date(startDate);
    const dayBefore = new Date(ticketStartDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const endDateForOldAssignments = dayBefore.toISOString().split('T')[0];
    
    assignments.forEach(assignment => {
      if (assignment.projectId === projectId && 
          assignment.isActive && 
          new Date(assignment.endDate) >= ticketStartDate) {
        
        // Check if this seat is still needed in the new request
        const seatStillNeeded = availableSeats.some(seat => seat.id === assignment.seatId);
        
        if (!seatStillNeeded) {
          // End this assignment the day before new request starts
          assignment.endDate = endDateForOldAssignments;
          assignment.isActive = new Date(endDateForOldAssignments) >= new Date();
        }
      }
    });
    
    // Create assignments for the new request
    availableSeats.forEach((seat, index) => {
      const existingAssignment = assignments.find(assignment => 
        assignment.seatId === seat.id && 
        assignment.projectId === projectId && 
        assignment.isActive &&
        new Date(assignment.startDate) <= new Date(startDate) &&
        new Date(assignment.endDate) >= new Date(startDate)
      );
      
      if (existingAssignment) {
        // Update existing assignment end date if needed
        if (new Date(existingAssignment.endDate) < new Date(endDate)) {
          existingAssignment.endDate = endDate;
        }
      } else {
        // Create new assignment
        assignments.push({
          id: String(assignmentId++),
          seatId: seat.id,
          facilityId: seat.facilityId,
          employeeId: employeeEmails[index] || `project_${projectId}_seat_${index + 1}`,
          projectId: projectId,
          startDate: startDate,
          endDate: endDate,
          isActive: new Date(endDate) >= new Date()
        });
      }
    });
  });
  
  return assignments;
};

// Legacy function for backward compatibility
const createSeatAssignmentsFromRequestsOld = () => {
  const assignments = [];
  let assignmentId = 1;
  
  seatRequests.forEach(request => {
    if (request.status === 'approved' && request.employeeEmails) {
      const project = projects.find(p => p.id === request.projectId);
      if (!project) return;
      
      // Calculate required seats
      const headcount = request.employeeEmails.length;
      const seatCountPercent = project.seatCountPercent || 70;
      const requiredSeats = Math.ceil(headcount * (seatCountPercent / 100));
      
      // Find available seats for this project's metro city
      const projectFacilities = seatInventory.filter(seat => {
        const facility = facilities.find(f => f.id === seat.facilityId);
        return facility && facility.metroCity === project.metroCity;
      }).slice(0, requiredSeats);
      
      projectFacilities.forEach((seat, index) => {
        const employeeEmail = request.employeeEmails[index];
        if (employeeEmail) {
          assignments.push({
            id: String(assignmentId++),
            seatId: seat.id,
            facilityId: seat.facilityId,
            employeeId: employeeEmail,
            projectId: request.projectId,
            startDate: request.startDate,
            endDate: request.endDate,
            isActive: new Date(request.endDate) >= new Date()
          });
        }
      });
    }
  });
  
  return assignments;
};

// Generate seat assignments from approved requests
const generatedSeatAssignments = createSeatAssignmentsFromRequests();

// Export function to get current seat assignments (including dynamically created ones)
const getSeatAssignments = () => {
  return createSeatAssignmentsFromRequests();
};
// Add PT Telco project for testing
const ptTelcoProject = {
  id: '3',
  clientName: 'PT Telco',
  projectName: 'Telco Digital Platform',
  projectCode: 'TDP-003',
  status: 'active',
  metroCity: 'Jakarta',
  startDate: '2024-03-01',
  endDate: '2024-12-31',
  deliveryLeadEmail: 'john.doe@accenture.com',
  primaryContactEmail: 'john.doe@accenture.com',
  secondaryContactEmail: 'jane.contact@accenture.com',
  primaryCPMOEmail: 'cpmo1@accenture.com',
  seatCountPercent: 80,
  chargedSeatPercent: 70,
  seatRate: 160000,
  createdBy: '1',
  lastModified: '2024-03-01T09:00:00Z',
  wbsEntries: [
    {
      id: '3',
      wbsCode: 'WBS-003-DEFAULT',
      isDefault: true,
      isActive: true,
      createdDate: '2024-03-01T09:00:00Z'
    }
  ]
};

projects.push(ptTelcoProject);

// Add seat request for PT Telco project
const ptTelcoSeatRequest = {
  id: '3',
  projectId: '3',
  requestorId: '1',
  startDate: '2024-03-01',
  endDate: '2024-12-31',
  headcount: 15,
  seatCount: 11,
  status: 'approved',
  projectComments: 'Initial team setup for PT Telco project',
  employeeIds: ['4', '5', '6'],
  seatIds: ['3'],
  createdDate: '2024-02-25T10:00:00Z',
  lastModified: '2024-02-27T14:00:00Z',
  employeeEmails: [
    'telco.lead@accenture.com',
    'telco.dev1@accenture.com',
    'telco.dev2@accenture.com',
    'telco.analyst@accenture.com',
    'telco.architect@accenture.com',
    'telco.pm@accenture.com',
    'telco.qa1@accenture.com',
    'telco.qa2@accenture.com',
    'telco.devops@accenture.com',
    'telco.ui@accenture.com',
    'telco.backend@accenture.com'
  ]
};

seatRequests.push(ptTelcoSeatRequest);

const holidays = [
  {
    id: '1',
    date: '2024-01-01',
    name: 'New Year\'s Day',
    isActive: true
  },
  {
    id: '2',
    date: '2024-08-17',
    name: 'Independence Day',
    isActive: true
  },
  {
    id: '3',
    date: '2024-12-25',
    name: 'Christmas Day',
    isActive: true
  }
];

module.exports = {
  users,
  projects,
  employees,
  facilities,
  seatTypes,
  seatInventory,
  seatRequests,
  invoices,
  tickets,
  holidays,
  getSeatAssignments
};