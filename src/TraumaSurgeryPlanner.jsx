import React, { useState } from 'react';

const TraumaSurgeryPlanner = () => {
  const [baseStaff, setBaseStaff] = useState(20); // Updated for 20 total surgeons
  const [leave, setLeave] = useState([]);
  const [swaps, setSwaps] = useState({});
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedSurgeon, setSelectedSurgeon] = useState('');
  const [selectedSwapSurgeon1, setSelectedSwapSurgeon1] = useState('');
  const [selectedSwapSurgeon2, setSelectedSwapSurgeon2] = useState('');
  const [selectedLeaveReason, setSelectedLeaveReason] = useState('');
  const [packhamClarkeOverrides, setPackhamClarkeOverrides] = useState({});
  const [bakerBickOverrides, setBakerBickOverrides] = useState({});

  // Leave reason options
  const leaveReasons = [
    'Annual leave',
    'Study leave',
    'Maternity leave',
    'Paternity leave',
    'Sick leave',
    'Other'
  ];

  // Complete list of consultants for dropdown
  const consultantNames = [
    'Lynn Hutchings', 'Will Poole', 'Damien Tucker', 'Selina Graham',
    'Damian Clarke', 'Iain Packham', 'Mike Kelly', 'Andy Riddick',
    'Alasdair Bott', 'Matilda Powell-Bowns', 'Nic Blucher', 'Mark Dahill',
    'Andy Tasker', 'Rich Baker', 'Simon Bick', 'Pete Robinson',
    'Phil McKeag', 'Sam Jonas', 'Bill Harries', 'Omar Toma'
  ].sort();

  // Pre-populate Selina Graham's maternity leave
  React.useEffect(() => {
    const selinaMaternityLeave = {
      id: 999999, // Fixed ID so it doesn't get duplicated
      name: 'Selina Graham',
      startDate: '2025-09-01', // Adjust start date as needed
      endDate: '2026-03-01',   // 6 months coverage
      reason: 'Maternity leave'
    };
    
    // Only add if not already present
    setLeave(prevLeave => {
      const hasSelinaLeave = prevLeave.some(l => l.id === 999999);
      if (!hasSelinaLeave) {
        return [...prevLeave, selinaMaternityLeave];
      }
      return prevLeave;
    });
  }, []);

  // Baker/Bick pattern with override capability
  const getBakerBickPattern = (weekStartDate) => {
    const septemberStart = new Date('2025-09-01');
    const septemberMonday = new Date(septemberStart);
    septemberMonday.setDate(septemberStart.getDate() - septemberStart.getDay() + 1);
    
    // Check for week-specific override first
    const weekKey = weekStartDate.toISOString().split('T')[0];
    if (bakerBickOverrides[weekKey]) {
      return bakerBickOverrides[weekKey];
    }
    
    if (weekStartDate < septemberMonday) {
      return 'Rich Baker';
    }
    
    const weeksSinceSeptember = Math.floor((weekStartDate - septemberMonday) / (7 * 24 * 60 * 60 * 1000));
    const pattern = ['Simon Bick', 'Simon Bick', 'Rich Baker', 'Simon Bick', 'Rich Baker', 'Simon Bick', 'Rich Baker', 'Rich Baker'];
    return pattern[weeksSinceSeptember % 8] || 'Rich Baker';
  };

  // Packham/Clarke pattern with override capability
  const getPackhamClarkePattern = (weekNumber, weekStartDate) => {
    // Check for week-specific override first
    const weekKey = weekStartDate.toISOString().split('T')[0];
    if (packhamClarkeOverrides[weekKey]) {
      return packhamClarkeOverrides[weekKey];
    }
    
    // Default pattern
    const weeksSinceStart = Math.floor((weekStartDate - new Date('2025-08-11')) / (7 * 24 * 60 * 60 * 1000));
    const cyclePosition = Math.floor(weeksSinceStart / 4);
    return (cyclePosition % 2 === 0) ? 'Iain Packham' : 'Damian Clarke';
  };

  // Helper function to get current consultant (handles maternity cover)
  const getCurrentConsultant = (originalName, currentDate) => {
    if (originalName === 'Selina Graham') {
      const checkDate = new Date(currentDate);
      const maternityStart = new Date('2025-09-01');
      const maternityEnd = new Date('2026-03-01');
      
      if (checkDate >= maternityStart && checkDate <= maternityEnd) {
        return 'Omar Toma'; // Omar covers during maternity leave
      }
    }
    return originalName;
  };

  const removeLeave = (id) => {
    setLeave(leave.filter(l => l.id !== id));
  };

  // Determine Friday Theatre 4 assignment based on availability
  const getFridayTheatre4Assignment = (staffOnLeave, currentDate) => {
    const hutchingsName = getCurrentConsultant('Lynn Hutchings', currentDate);
    
    // Check if we're in Omar's coverage period
    const checkDate = new Date(currentDate);
    const maternityStart = new Date('2025-09-01');
    const maternityEnd = new Date('2026-03-01');
    const isOmarPeriod = checkDate >= maternityStart && checkDate <= maternityEnd;
    
    // During Omar's period, different Friday Theatre 4 priority
    let grahamName, bottName, harriesName;
    if (isOmarPeriod) {
      // Omar period: Lynn → Alasdair → Bill (skip Omar for Friday Theatre 4)
      grahamName = null; // Omar not eligible for Friday Theatre 4
      bottName = getCurrentConsultant('Alasdair Bott', currentDate);
      harriesName = getCurrentConsultant('Bill Harries', currentDate);
    } else {
      // Normal period: Lynn → Selina → Alasdair → Bill
      grahamName = getCurrentConsultant('Selina Graham', currentDate);
      bottName = getCurrentConsultant('Alasdair Bott', currentDate);
      harriesName = getCurrentConsultant('Bill Harries', currentDate);
    }

    const isHutchingsAvailable = !staffOnLeave.some(l => l.name === hutchingsName);
    const isGrahamAvailable = grahamName && !staffOnLeave.some(l => l.name === grahamName);
    const isBottAvailable = !staffOnLeave.some(l => l.name === bottName);
    const isHarriesAvailable = !staffOnLeave.some(l => l.name === harriesName);

    if (isHutchingsAvailable) {
      return { name: hutchingsName, available: true };
    } else if (isGrahamAvailable) {
      return { name: grahamName, available: true };
    } else if (isBottAvailable) {
      return { name: bottName, available: true };
    } else if (isHarriesAvailable) {
      return { name: harriesName, available: true };
    } else {
      return { name: 'No one available', available: false };
    }
  };

  // Calculate week number (4-week cycle, starting from Aug 11, 2025 as Week 1)
  const getWeekNumber = (date) => {
    const startDate = new Date('2025-08-11');
    const diffTime = date - startDate;
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    const cycleWeek = (diffWeeks % 4) + 1;
    return cycleWeek;
  };

  // Consultant name mappings for weekend rota
  const consultantMap = {
    'LH': 'Lynn Hutchings', 'WP': 'Will Poole', 'DT': 'Damien Tucker', 'SG': 'Selina Graham',
    'DC': 'Damian Clarke', 'IP': 'Iain Packham', 'MK': 'Mike Kelly', 'AR': 'Andy Riddick',
    'AB': 'Alasdair Bott', 'TPB': 'Matilda Powell-Bowns', 'NB': 'Nic Blucher', 'MD': 'Mark Dahill',
    'AT': 'Andy Tasker', 'RB': 'Rich Baker', 'SB': 'Simon Bick', 'PR': 'Pete Robinson',
    'PM': 'Phil McKeag', 'SJ': 'Sam Jonas'
  };

  // Staff assignments by day with 4-week cycle patterns
  const getStaffForDay = (day, weekNumber, weekStartDate) => {
    weekStartDate = weekStartDate || new Date();
    
    if (day === 0) { // Monday
      return {
        flexible: [
          getCurrentConsultant('Will Poole', weekStartDate),
          getCurrentConsultant('Damien Tucker', weekStartDate),
          getCurrentConsultant('Selina Graham', weekStartDate),
          getPackhamClarkePattern(weekNumber, weekStartDate),
          getCurrentConsultant('Matilda Powell-Bowns', weekStartDate)
        ],
        assigned: [
          { name: (weekNumber === 1 || weekNumber === 3) ? getCurrentConsultant('Mike Kelly', weekStartDate) : getCurrentConsultant('Andy Riddick', weekStartDate), duty: 'Theatre 4' }
        ]
      };
    }
    
    if (day === 1) { // Tuesday
      return {
        flexible: ['Mike Kelly', 'Alasdair Bott', 'Lynn Hutchings', 'Matilda Powell-Bowns', 'Damien Tucker'],
        assigned: []
      };
    }
    
    if (day === 2) { // Wednesday
      return {
        flexible: [
          getCurrentConsultant('Nic Blucher', weekStartDate),
          getCurrentConsultant('Mark Dahill', weekStartDate),
          getCurrentConsultant('Andy Tasker', weekStartDate),
          getBakerBickPattern(weekStartDate),
          getCurrentConsultant('Selina Graham', weekStartDate)
        ],
        assigned: [
          { name: 'Pelvic team', duty: 'Theatre 4' },
          { name: getCurrentConsultant('Mike Kelly', weekStartDate), duty: 'Theatre 2' }
        ]
      };
    }
    
    if (day === 3) { // Thursday
      return {
        flexible: ['Andy Riddick', 'Pete Robinson', 'Phil McKeag', 'Sam Jonas', 'Andy Tasker', 'Bill Harries'],
        assigned: [
          { name: 'Bill Harries', duty: 'Theatre (preferred)' }
        ]
      };
    }
    
    if (day === 4) { // Friday
      return {
        flexible: [
          'Andy Tasker', 'Matilda Powell-Bowns', 'Damien Tucker'
        ],
        assigned: [
          { name: 'Bill Harries', duty: 'Theatre 3 (morning)' }
        ]
      };
    }
    
    return { flexible: [], assigned: [] };
  };

  // Friday/Weekend on-call rota integration
  const fridayWeekendRota = {
    '2025-09-05': 'MD', '2025-09-06': 'NB', '2025-09-07': 'MD',
    '2025-09-12': 'SG', '2025-09-13': 'AR', '2025-09-14': 'SG',
    '2025-09-19': 'AT', '2025-09-20': 'WP', '2025-09-21': 'AT',
    '2025-09-26': 'PM', '2025-09-27': 'DT', '2025-09-28': 'PM',
    '2025-10-03': 'IP', '2025-10-04': 'LH', '2025-10-05': 'IP',
    '2025-10-10': 'TPB', '2025-10-11': 'RB', '2025-10-12': 'TPB',
    '2025-10-17': 'AB', '2025-10-18': 'MK', '2025-10-19': 'AB',
    '2025-10-24': 'PR', '2025-10-25': 'SJ', '2025-10-26': 'PR',
    '2025-10-31': 'NB', 
    '2025-11-01': 'MD', '2025-11-02': 'NB',
    '2025-11-07': 'AR', '2025-11-08': 'SG', '2025-11-09': 'AR',
    '2025-11-14': 'WP', '2025-11-15': 'AT', '2025-11-16': 'WP',
    '2025-11-21': 'DT', '2025-11-22': 'PM', '2025-11-23': 'DT',
    '2025-11-28': 'LH', '2025-11-29': 'IP', '2025-11-30': 'LH',
    '2025-12-05': 'RB', '2025-12-06': 'TPB', '2025-12-07': 'RB',
    '2025-12-12': 'MK', '2025-12-13': 'AB', '2025-12-14': 'MK',
    '2025-12-19': 'SJ', '2025-12-20': 'PR', '2025-12-21': 'SJ',
    '2025-12-26': 'MD', '2025-12-27': 'NB', '2025-12-28': 'MD'
  };

  const getFridayOnCall = (weekStartDate) => {
    const friday = new Date(weekStartDate);
    friday.setDate(friday.getDate() + 4);
    const dateStr = friday.toISOString().split('T')[0];
    const initials = fridayWeekendRota[dateStr];
    return initials ? consultantMap[initials] || initials : '';
  };

  // On-call schedules with proper 4-week cycle
  const getOnCallSurgeon = (day, weekNumber, weekStartDate) => {
    if (day === 0) { // Monday
      if (weekNumber === 1) {
        return getPackhamClarkePattern(weekNumber, weekStartDate);
      }
      if (weekNumber === 2) return 'Will Poole';
      if (weekNumber === 3) return 'Damien Tucker';
      if (weekNumber === 4) return getCurrentConsultant('Selina Graham', weekStartDate);
    }
    
    if (day === 1) { // Tuesday
      if (weekNumber === 1) return 'Matilda Powell-Bowns';
      if (weekNumber === 2) return 'Mike Kelly';
      if (weekNumber === 3) return 'Lynn Hutchings';
      if (weekNumber === 4) return 'Alasdair Bott';
    }
    
    if (day === 2) { // Wednesday
      if (weekNumber === 1) return 'Andy Tasker';
      if (weekNumber === 2) {
        return getBakerBickPattern(weekStartDate);
      }
      if (weekNumber === 3) return 'Nic Blucher';
      if (weekNumber === 4) return 'Mark Dahill';
    }
    
    if (day === 3) { // Thursday
      if (weekNumber === 1) return 'Pete Robinson';
      if (weekNumber === 2) return 'Andy Riddick';
      if (weekNumber === 3) return 'Sam Jonas';
      if (weekNumber === 4) return 'Phil McKeag';
    }
    
    if (day === 4) { // Friday
      return getFridayOnCall(weekStartDate);
    }
    
    return '';
  };

  // Calculate available staff for each week/day
  const calculateCapacity = () => {
    const weeks = [];
    const today = new Date();
    
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay() + 1);
    
    for (let week = 0; week < 12; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + (week * 7));
      
      const weekNumber = getWeekNumber(weekStart);
      const days = [];
      
      for (let day = 0; day < 5; day++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + day);
        
        const staffForDay = getStaffForDay(day, weekNumber, weekStart);
        const onCallSurgeon = swaps[`${week}-${day}`]?.newSurgeon || getOnCallSurgeon(day, weekNumber, weekStart);
        
        const staffOnLeave = leave.filter(l => {
          const leaveStart = new Date(l.startDate + 'T00:00:00');
          const leaveEnd = new Date(l.endDate + 'T23:59:59');
          const checkDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
          return checkDate >= leaveStart && checkDate <= leaveEnd;
        });
        
        const criticalAssignmentsOnLeave = staffForDay.assigned.filter(assignment => 
          staffOnLeave.some(l => l.name === assignment.name)
        );
        const onCallSurgeonOnLeave = onCallSurgeon && staffOnLeave.some(l => l.name === onCallSurgeon);
        
        let fridayTheatre4Assignment = null;
        let updatedStaffForDay = { ...staffForDay };
        
        if (day === 4) {
          fridayTheatre4Assignment = getFridayTheatre4Assignment(staffOnLeave, dayDate);
          
          updatedStaffForDay.assigned = [
            ...staffForDay.assigned,
            { name: fridayTheatre4Assignment.name, duty: 'Theatre 4' }
          ];
          
          const allTheatre4Options = [
            getCurrentConsultant('Lynn Hutchings', dayDate),
            getCurrentConsultant('Selina Graham', dayDate),
            getCurrentConsultant('Alasdair Bott', dayDate),
            getCurrentConsultant('Bill Harries', dayDate)
          ];
          const availableTheatre4Options = allTheatre4Options.filter(name => 
            name !== fridayTheatre4Assignment.name && !staffOnLeave.some(l => l.name === name)
          );
          
          updatedStaffForDay.flexible = [
            ...staffForDay.flexible,
            ...availableTheatre4Options
          ];
        }

        const assignedNames = updatedStaffForDay.assigned.map(a => a.name).filter(name => !name.includes('/'));
        const assignedStaff = [...assignedNames];
        if (onCallSurgeon) assignedStaff.push(onCallSurgeon);
        
        const availableFlexibleStaff = updatedStaffForDay.flexible.filter(name => 
          !assignedStaff.includes(name) && !staffOnLeave.some(l => l.name === name)
        );
        
        let fridayTheatre4Available = true;
        if (day === 4) {
          fridayTheatre4Available = fridayTheatre4Assignment?.available || false;
        }
        
        const totalStaff = updatedStaffForDay.flexible.length + updatedStaffForDay.assigned.length;
        const availableAssigned = updatedStaffForDay.assigned.filter(a => 
          !staffOnLeave.some(l => l.name === a.name)
        ).length;
        
        const onCallContribution = (onCallSurgeon && !onCallSurgeonOnLeave) ? 1 : 0;
        const availableStaff = availableFlexibleStaff.length + availableAssigned + onCallContribution;
        const requiredStaff = 4;
        
        let status = 'adequate';
        if ((criticalAssignmentsOnLeave.length > 0 || onCallSurgeonOnLeave) || (day === 4 && !fridayTheatre4Available)) {
          status = 'critical';
        } else if (availableStaff < requiredStaff - 1) {
          status = 'critical';
        } else if (availableStaff < requiredStaff) {
          status = 'shortage';
        } else if (availableStaff > requiredStaff + 1) {
          status = 'surplus';
        }
        
        days.push({
          date: dayDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          available: availableStaff,
          required: requiredStaff,
          total: totalStaff,
          status,
          onCall: onCallSurgeon,
          staffOnLeave: staffOnLeave.map(l => l.name),
          availableFlexibleStaff,
          criticalAssignmentsOnLeave,
          onCallSurgeonOnLeave
        });
      }
      
      weeks.push({
        weekNumber,
        startDate: weekStart,
        dateRange: `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${new Date(weekStart.getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
        days
      });
    }
    
    return weeks;
  };

  const weeks = calculateCapacity();

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'bg-red-500';
      case 'shortage': return 'bg-orange-400';
      case 'adequate': return 'bg-blue-500';
      case 'surplus': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const addLeave = () => {
    const name = selectedSurgeon;
    let startDate = document.getElementById('leaveStartDate').value;
    let endDate = document.getElementById('leaveEndDate').value;
    
    if (!name || !startDate || !endDate) {
      alert('Please select a surgeon and enter both start and end dates.');
      return;
    }
    
    // Clean up date formats
    startDate = startDate.replace(/\//g, '-');
    endDate = endDate.replace(/\//g, '-');
    
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toISOString().split('T')[0];
    };
    
    startDate = formatDate(startDate);
    endDate = formatDate(endDate);
    
    const newLeave = {
      id: Date.now(),
      name: name.trim(),
      startDate,
      endDate,
      reason: selectedLeaveReason || 'Leave'
    };
    
    setLeave([...leave, newLeave]);
    
    setSelectedSurgeon('');
    setSelectedLeaveReason('');
    document.getElementById('leaveStartDate').value = '';
    document.getElementById('leaveEndDate').value = '';
  };

  const addDoubleSwap = () => {
    const date1 = document.getElementById('swapDate1').value;
    const surgeon1 = selectedSwapSurgeon1;
    const date2 = document.getElementById('swapDate2').value;
    const surgeon2 = selectedSwapSurgeon2;
    
    if (!date1 || !surgeon1 || !date2 || !surgeon2) {
      alert('Please fill in all fields for the swap.');
      return;
    }
    
    const findWeekDay = (dateStr) => {
      const date = new Date(dateStr);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1);
      
      const startDate = new Date('2025-08-11');
      const diffWeeks = Math.floor((weekStart - startDate) / (7 * 24 * 60 * 60 * 1000));
      const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1;
      
      return { week: diffWeeks, day: dayOfWeek };
    };
    
    const pos1 = findWeekDay(date1);
    const pos2 = findWeekDay(date2);
    
    if (pos1.day > 4 || pos2.day > 4) {
      alert('Swaps can only be made for weekdays (Monday-Friday).');
      return;
    }
    
    setSwaps({
      ...swaps,
      [`${pos1.week}-${pos1.day}`]: { originalSurgeon: 'Original', newSurgeon: surgeon2 },
      [`${pos2.week}-${pos2.day}`]: { originalSurgeon: 'Original', newSurgeon: surgeon1 }
    });
    
    document.getElementById('swapDate1').value = '';
    setSelectedSwapSurgeon1('');
    document.getElementById('swapDate2').value = '';
    setSelectedSwapSurgeon2('');
  };

  const addSingleSwap = () => {
    const date1 = document.getElementById('swapDate1').value;
    const surgeon1 = selectedSwapSurgeon1;
    
    if (!date1 || !surgeon1) {
      alert('Please select a date and surgeon for the change.');
      return;
    }
    
    const findWeekDay = (dateStr) => {
      const date = new Date(dateStr);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1);
      
      const startDate = new Date('2025-08-11');
      const diffWeeks = Math.floor((weekStart - startDate) / (7 * 24 * 60 * 60 * 1000));
      const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1;
      
      return { week: diffWeeks, day: dayOfWeek };
    };
    
    const pos = findWeekDay(date1);
    if (pos.day > 4) {
      alert('Changes can only be made for weekdays (Monday-Friday).');
      return;
    }
    
    setSwaps({
      ...swaps,
      [`${pos.week}-${pos.day}`]: { originalSurgeon: 'Original', newSurgeon: surgeon1 }
    });
    
    document.getElementById('swapDate1').value = '';
    setSelectedSwapSurgeon1('');
  };

  const removeSwap = (key) => {
    const newSwaps = { ...swaps };
    delete newSwaps[key];
    setSwaps(newSwaps);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Trauma Surgery Daily Capacity Planner</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Base Staffing</h3>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">Total Surgeons:</label>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setBaseStaff(Math.max(1, baseStaff - 1))}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >-</button>
              <span className="px-3 py-1 bg-gray-100 rounded font-medium">{baseStaff}</span>
              <button 
                onClick={() => setBaseStaff(baseStaff + 1)}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >+</button>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Leave Management</h3>
          
          <div className="space-y-2 text-sm">
            <select
              value={selectedSurgeon}
              onChange={(e) => setSelectedSurgeon(e.target.value)}
              className="w-full px-2 py-1 border rounded"
            >
              <option value="">Select surgeon...</option>
              {consultantNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            
            <div className="grid grid-cols-2 gap-2">
              <input
                id="leaveStartDate"
                type="date"
                className="px-2 py-1 border rounded"
              />
              <input
                id="leaveEndDate"
                type="date"
                className="px-2 py-1 border rounded"
              />
            </div>
            
            <select
              value={selectedLeaveReason}
              onChange={(e) => setSelectedLeaveReason(e.target.value)}
              className="w-full px-2 py-1 border rounded"
            >
              <option value="">Select leave reason...</option>
              {leaveReasons.map(reason => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
            <button 
              onClick={addLeave}
              className="w-full px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Leave
            </button>
          </div>
        </div>
      </div>

      {/* Job Share Management */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-3">Job Share Swaps</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Packham/Clarke Swaps */}
          <div className="border rounded p-3">
            <h4 className="font-medium mb-2">Packham/Clarke Swap (Monday)</h4>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-3 gap-1">
                <input
                  id="packhamClarkeDate"
                  type="date"
                  className="px-2 py-1 border rounded text-xs"
                  placeholder="Monday date"
                />
                <select
                  id="packhamClarkePerson"
                  className="px-2 py-1 border rounded text-xs"
                >
                  <option value="">Select person...</option>
                  <option value="Iain Packham">Iain Packham</option>
                  <option value="Damian Clarke">Damian Clarke</option>
                </select>
                <button
                  onClick={() => {
                    const date = document.getElementById('packhamClarkeDate').value;
                    const person = document.getElementById('packhamClarkePerson').value;
                    if (date && person) {
                      const selectedDate = new Date(date);
                      const monday = new Date(selectedDate);
                      monday.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);
                      const weekKey = monday.toISOString().split('T')[0];
                      
                      setPackhamClarkeOverrides({
                        ...packhamClarkeOverrides,
                        [weekKey]: person
                      });
                      
                      document.getElementById('packhamClarkeDate').value = '';
                      document.getElementById('packhamClarkePerson').value = '';
                    }
                  }}
                  className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                >
                  Set Monday
                </button>
              </div>
              <div className="text-xs text-gray-500">
                Select any date in the week to set who works Monday
              </div>
            </div>
          </div>

          {/* Baker/Bick Swaps */}
          <div className="border rounded p-3">
            <h4 className="font-medium mb-2">Baker/Bick Swap (Wednesday)</h4>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-3 gap-1">
                <input
                  id="bakerBickDate"
                  type="date"
                  className="px-2 py-1 border rounded text-xs"
                  placeholder="Wednesday date"
                />
                <select
                  id="bakerBickPerson"
                  className="px-2 py-1 border rounded text-xs"
                >
                  <option value="">Select person...</option>
                  <option value="Rich Baker">Rich Baker</option>
                  <option value="Simon Bick">Simon Bick</option>
                </select>
                <button
                  onClick={() => {
                    const date = document.getElementById('bakerBickDate').value;
                    const person = document.getElementById('bakerBickPerson').value;
                    if (date && person) {
                      const selectedDate = new Date(date);
                      const monday = new Date(selectedDate);
                      monday.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);
                      const weekKey = monday.toISOString().split('T')[0];
                      
                      setBakerBickOverrides({
                        ...bakerBickOverrides,
                        [weekKey]: person
                      });
                      
                      document.getElementById('bakerBickDate').value = '';
                      document.getElementById('bakerBickPerson').value = '';
                    }
                  }}
                  className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                >
                  Set Wednesday
                </button>
              </div>
              <div className="text-xs text-gray-500">
                Select any date in the week to set who works Wednesday
              </div>
            </div>
          </div>
        </div>

        {/* Current Overrides Display */}
        {(Object.keys(packhamClarkeOverrides).length > 0 || Object.keys(bakerBickOverrides).length > 0) && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(packhamClarkeOverrides).length > 0 && (
              <div className="p-3 bg-blue-50 rounded">
                <h5 className="font-medium mb-2">Packham/Clarke Swaps:</h5>
                <div className="space-y-1">
                  {Object.entries(packhamClarkeOverrides).map(([weekKey, person]) => {
                    const date = new Date(weekKey);
                    return (
                      <div key={weekKey} className="flex justify-between items-center text-sm">
                        <span>
                          {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} (Mon): <strong>{person}</strong>
                        </span>
                        <button
                          onClick={() => {
                            const newOverrides = { ...packhamClarkeOverrides };
                            delete newOverrides[weekKey];
                            setPackhamClarkeOverrides(newOverrides);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {Object.keys(bakerBickOverrides).length > 0 && (
              <div className="p-3 bg-green-50 rounded">
                <h5 className="font-medium mb-2">Baker/Bick Swaps:</h5>
                <div className="space-y-1">
                  {Object.entries(bakerBickOverrides).map(([weekKey, person]) => {
                    const date = new Date(weekKey);
                    const wednesday = new Date(date);
                    wednesday.setDate(date.getDate() + 2);
                    return (
                      <div key={weekKey} className="flex justify-between items-center text-sm">
                        <span>
                          {wednesday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} (Wed): <strong>{person}</strong>
                        </span>
                        <button
                          onClick={() => {
                            const newOverrides = { ...bakerBickOverrides };
                            delete newOverrides[weekKey];
                            setBakerBickOverrides(newOverrides);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-3">On-Call Swaps</h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-sm">
          <input
            id="swapDate1"
            type="date"
            className="px-2 py-1 border rounded"
          />
          <select
            value={selectedSwapSurgeon1}
            onChange={(e) => setSelectedSwapSurgeon1(e.target.value)}
            className="px-2 py-1 border rounded"
          >
            <option value="">Select first surgeon...</option>
            {consultantNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <input
            id="swapDate2"
            type="date"
            className="px-2 py-1 border rounded"
          />
          <select
            value={selectedSwapSurgeon2}
            onChange={(e) => setSelectedSwapSurgeon2(e.target.value)}
            className="px-2 py-1 border rounded"
          >
            <option value="">Select second surgeon...</option>
            {consultantNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button 
            onClick={addDoubleSwap}
            className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Swap Between
          </button>
          <button 
            onClick={addSingleSwap}
            className="px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            Single Change
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Use "Swap Between" to exchange two surgeons' duties, or "Single Change" to just change the first date/surgeon
        </div>
      </div>

      {leave.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-3">Current Leave</h3>
          <div className="space-y-3">
            {(() => {
              const leaveByConsultant = leave.reduce((acc, l) => {
                if (!acc[l.name]) {
                  acc[l.name] = [];
                }
                acc[l.name].push(l);
                return acc;
              }, {});

              return Object.keys(leaveByConsultant)
                .sort()
                .map(consultantName => {
                  const consultantLeave = leaveByConsultant[consultantName]
                    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                  
                  return (
                    <div key={consultantName} className="border-l-4 border-blue-500 pl-3">
                      <div className="font-semibold text-gray-700 mb-1">{consultantName}</div>
                      <div className="space-y-1">
                        {consultantLeave.map(l => (
                          <div key={l.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                            <span>
                              <strong>{l.reason}</strong> - {l.startDate} to {l.endDate}
                            </span>
                            <button 
                              onClick={() => removeLeave(l.id)}
                              className="text-red-600 hover:text-red-800"
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
            })()}
          </div>
        </div>
      )}

      {Object.keys(swaps).length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-3">Current On-Call Swaps</h3>
          <div className="space-y-1">
            {Object.entries(swaps).map(([key, swap]) => {
              const [week, day] = key.split('-');
              const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
              return (
                <div key={key} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                  <span>
                    Week {parseInt(week) + 1} {dayNames[day]}: <strong>{swap.originalSurgeon}</strong> → <strong>{swap.newSurgeon}</strong>
                  </span>
                  <button 
                    onClick={() => removeSwap(key)}
                    className="text-red-600 hover:text-red-800"
                  >✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left">Week</th>
                <th className="px-4 py-3 text-center">Mon</th>
                <th className="px-4 py-3 text-center">Tue</th>
                <th className="px-4 py-3 text-center">Wed</th>
                <th className="px-4 py-3 text-center">Thu</th>
                <th className="px-4 py-3 text-center">Fri</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, weekIndex) => (
                <tr 
                  key={weekIndex} 
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedWeek(selectedWeek === weekIndex ? null : weekIndex)}
                >
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium">{week.dateRange}</div>
                    <div className="text-xs text-gray-500">Cycle: Week {week.weekNumber}</div>
                  </td>
                  {week.days.map((day, dayIndex) => (
                    <td key={dayIndex} className="px-2 py-3 text-center">
                      <div className={`inline-block px-2 py-1 rounded text-white text-sm font-medium ${getStatusColor(day.status)}`}>
                        {day.available}/{day.required}
                      </div>
                      {day.onCall && (
                        <div className="text-xs text-gray-600 mt-1">
                          {swaps[`${weekIndex}-${dayIndex}`] && <span className="text-purple-600">↻</span>}
                          {day.onCall.split(' ').map(name => name[0]).join('')}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedWeek !== null && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">
            Week {selectedWeek + 1} Detail - {weeks[selectedWeek]?.dateRange}
          </h3>
          <div className="text-sm text-gray-600 mb-2">
            Week {weeks[selectedWeek]?.weekNumber} (Cycle: {['Week 1', 'Week 2', 'Week 3', 'Week 4'][weeks[selectedWeek]?.weekNumber - 1]})
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((dayName, dayIndex) => {
              const day = weeks[selectedWeek]?.days[dayIndex];
              let staffForDay = getStaffForDay(dayIndex, weeks[selectedWeek]?.weekNumber || 1, weeks[selectedWeek]?.startDate);
              
              const staffOnLeaveForDay = leave.filter(l => {
                const weekStart = weeks[selectedWeek]?.startDate;
                if (!weekStart) return false;
                const dayDate = new Date(weekStart);
                dayDate.setDate(weekStart.getDate() + dayIndex);
                
                const leaveStart = new Date(l.startDate + 'T00:00:00');
                const leaveEnd = new Date(l.endDate + 'T23:59:59');
                const checkDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
                return checkDate >= leaveStart && checkDate <= leaveEnd;
              });
              
              const onCallSurgeonOnLeaveForDay = day?.onCall && staffOnLeaveForDay.some(l => l.name === day.onCall);
              
              if (dayIndex === 4) {
                const fridayTheatre4Assignment = getFridayTheatre4Assignment(staffOnLeaveForDay, new Date(weeks[selectedWeek]?.startDate?.getTime() + dayIndex * 24 * 60 * 60 * 1000));
                staffForDay = {
                  ...staffForDay,
                  assigned: [
                    ...staffForDay.assigned,
                    { name: fridayTheatre4Assignment.name, duty: 'Theatre 4' }
                  ]
                };
              }
              
              return (
                <div key={dayIndex} className="border rounded p-3">
                  <h4 className="font-medium text-center mb-2">{dayName}</h4>
                  <div className="text-sm space-y-1">
                    <div className="text-center">
                      <span className={`inline-block px-2 py-1 rounded text-white text-xs ${getStatusColor(day?.status)}`}>
                        {day?.available || 0}/{day?.required || 0}
                      </span>
                    </div>
                    
                    <div>
                      <strong>On Call:</strong> {day?.onCall || 'TBD'} (Wards)
                      {onCallSurgeonOnLeaveForDay && <span className="text-red-600 font-bold"> - ON LEAVE!</span>}
                    </div>
                    
                    <div><strong>Assigned:</strong></div>
                    {staffForDay.assigned.map((staff, i) => (
                      <div key={i} className={`text-xs ${day?.criticalAssignmentsOnLeave?.some(ca => ca.name === staff.name) ? 'text-red-600 font-bold' : 'text-purple-600'}`}>
                        • {staff.name} - {staff.duty}
                        {day?.criticalAssignmentsOnLeave?.some(ca => ca.name === staff.name) && ' - ON LEAVE!'}
                      </div>
                    ))}
                    
                    <div><strong>Flexible:</strong></div>
                    {day?.availableFlexibleStaff?.map((name, i) => (
                      <div key={i} className="text-xs text-blue-600">
                        • {name}
                      </div>
                    ))}
                    
                    {staffOnLeaveForDay?.length > 0 && (
                      <div className="mt-2 text-xs text-red-600">
                        <strong>On Leave:</strong>
                        {staffOnLeaveForDay.map(person => (
                          <div key={person.name}>• {person.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Status Legend</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Critical Shortage</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-400 rounded"></div>
            <span>Minor Shortage</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Adequate Staffing</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Surplus Capacity</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-purple-600">↻</span>
            <span>On-call swap</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraumaSurgeryPlanner;
