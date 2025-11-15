import React, { useState, useEffect } from 'react';
import dataService from './services/dataService';
import WeekDetailModal from './components/WeekDetailModal';

const TraumaSurgeryPlannerRefactored = () => {
  const [baseStaff, setBaseStaff] = useState(20);
  const [leave, setLeave] = useState([]);
  const [swaps, setSwaps] = useState({});
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedSurgeon, setSelectedSurgeon] = useState('');
  const [selectedSwapSurgeon1, setSelectedSwapSurgeon1] = useState('');
  const [selectedSwapSurgeon2, setSelectedSwapSurgeon2] = useState('');
  const [selectedLeaveReason, setSelectedLeaveReason] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [packhamClarkeOverrides, setPackhamClarkeOverrides] = useState({});
  const [bakerBickOverrides, setBakerBickOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [consultants, setConsultants] = useState([]);
  const [leaveReasons, setLeaveReasons] = useState([]);
  const [rotations, setRotations] = useState({});
  const [weekendRota, setWeekendRota] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Set leave dates when week is selected
  useEffect(() => {
    if (selectedWeek) {
      setLeaveStartDate(selectedWeek.days[0].date.toISOString().split('T')[0]);
      setLeaveEndDate(selectedWeek.days[4].date.toISOString().split('T')[0]);
    }
  }, [selectedWeek]);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load static data
        const consultantsData = dataService.getConsultants();
        setConsultants(consultantsData);

        const reasons = dataService.getLeaveReasons();
        setLeaveReasons(reasons);

        const rotationsData = dataService.getRotations();
        setRotations(rotationsData);

        const weekendRotaData = dataService.getWeekendRota();
        setWeekendRota(weekendRotaData);

        // Load dynamic data from Netlify Functions
        const [leaveData, swapsData, overridesData] = await Promise.all([
          dataService.getLeave(),
          dataService.getSwaps(),
          dataService.getOverrides()
        ]);

        setLeave(leaveData);
        setSwaps(swapsData);
        setPackhamClarkeOverrides(overridesData.packhamClarke || {});
        setBakerBickOverrides(overridesData.bakerBick || {});
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // API handlers
  const handleAddLeave = async (leaveEntry) => {
    try {
      const result = await dataService.addLeave(leaveEntry);
      setLeave(prev => [...prev, result.entry]);
      return result;
    } catch (error) {
      console.error('Error adding leave:', error);
    }
  };

  const handleRemoveLeave = async (id) => {
    try {
      await dataService.removeLeave(id);
      setLeave(prev => prev.filter(l => l.id !== id));
    } catch (error) {
      console.error('Error removing leave:', error);
    }
  };

  const handleAddSwap = async (weekDay, swap) => {
    try {
      await dataService.addSwap(weekDay, swap);
      setSwaps(prev => ({ ...prev, [weekDay]: swap }));
    } catch (error) {
      console.error('Error adding swap:', error);
    }
  };

  const handleUpdateOverrides = async () => {
    try {
      await dataService.updateOverrides({
        packhamClarke: packhamClarkeOverrides,
        bakerBick: bakerBickOverrides
      });
    } catch (error) {
      console.error('Error updating overrides:', error);
    }
  };

  // Helper functions using loaded data
  const getConsultantNames = () => {
    return consultants.map(c => c.name).sort();
  };

  const getConsultantByInitials = (initials) => {
    const consultant = consultants.find(c => c.initials === initials);
    return consultant ? consultant.name : initials;
  };

  // Baker/Bick pattern with override capability
  const getBakerBickPattern = (weekStartDate) => {
    const septemberStart = new Date('2025-09-01');
    const septemberMonday = new Date(septemberStart);
    septemberMonday.setDate(septemberStart.getDate() - septemberStart.getDay() + 1);

    const weekKey = weekStartDate.toISOString().split('T')[0];
    if (bakerBickOverrides[weekKey]) {
      return bakerBickOverrides[weekKey];
    }

    if (weekStartDate < septemberMonday) {
      return 'Rich Baker';
    }

    const weeksSinceSeptember = Math.floor((weekStartDate - septemberMonday) / (7 * 24 * 60 * 60 * 1000));
    const pattern = rotations.bakerBickRotation?.pattern || [];
    return pattern[weeksSinceSeptember % 8] || 'Rich Baker';
  };

  // Packham/Clarke pattern with override capability
  const getPackhamClarkePattern = (weekNumber, weekStartDate) => {
    const weekKey = weekStartDate.toISOString().split('T')[0];
    if (packhamClarkeOverrides[weekKey]) {
      return packhamClarkeOverrides[weekKey];
    }

    const weeksSinceStart = Math.floor((weekStartDate - new Date('2025-08-11')) / (7 * 24 * 60 * 60 * 1000));
    const cyclePosition = Math.floor(weeksSinceStart / 4);
    const pattern = rotations.packhamClarkeRotation?.pattern || ['Iain Packham', 'Damian Clarke'];
    return pattern[cyclePosition % 2];
  };

  // Helper function to get current consultant (handles maternity cover)
  const getCurrentConsultant = (originalName, currentDate) => {
    const consultant = consultants.find(c => c.name === originalName);
    if (consultant?.maternityCover) {
      const checkDate = new Date(currentDate);
      const maternityStart = new Date(consultant.maternityCover.startDate);
      const maternityEnd = new Date(consultant.maternityCover.endDate);

      if (checkDate >= maternityStart && checkDate <= maternityEnd) {
        const coverConsultant = consultants.find(c => c.id === consultant.maternityCover.coveredBy);
        return coverConsultant ? coverConsultant.name : originalName;
      }
    }
    return originalName;
  };

  // Friday Theatre 4 assignment
  const getFridayTheatre4Assignment = (staffOnLeave, currentDate) => {
    const priorities = rotations.weeklySchedule?.friday?.theatre4Priority || [];

    for (const surgeonName of priorities) {
      const currentName = getCurrentConsultant(surgeonName, currentDate);
      const isAvailable = !staffOnLeave.some(l => l.name === currentName);

      if (isAvailable) {
        return { name: currentName, available: true };
      }
    }

    return { name: 'No one available', available: false };
  };

  // Get week number
  const getWeekNumber = (date) => {
    const startDate = new Date('2025-08-11');
    const diffTime = date - startDate;
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    const cycleWeek = (diffWeeks % 4) + 1;
    return cycleWeek;
  };

  // Get Friday on-call
  const getFridayOnCall = (weekStartDate) => {
    const friday = new Date(weekStartDate);
    friday.setDate(friday.getDate() + 4);
    const dateStr = friday.toISOString().split('T')[0];
    const initials = weekendRota[dateStr];
    return initials ? getConsultantByInitials(initials) : '';
  };

  // Get on-call surgeon
  const getOnCallSurgeon = (day, weekNumber, weekStartDate) => {
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayName = dayNames[day];

    if (day === 4) {
      return getFridayOnCall(weekStartDate);
    }

    const onCallSchedule = rotations.onCallSchedule?.[dayName];
    if (!onCallSchedule) return '';

    let surgeon = onCallSchedule[weekNumber];

    if (surgeon === 'PACKHAM_CLARKE') {
      return getPackhamClarkePattern(weekNumber, weekStartDate);
    } else if (surgeon === 'BAKER_BICK') {
      return getBakerBickPattern(weekStartDate);
    } else {
      return getCurrentConsultant(surgeon, weekStartDate);
    }
  };

  // Get staff for day
  const getStaffForDay = (day, weekNumber, weekStartDate) => {
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayName = dayNames[day];
    const daySchedule = rotations.weeklySchedule?.[dayName];

    if (!daySchedule) return { flexible: [], assigned: [] };

    const flexible = daySchedule.flexible.map(name => {
      if (name === 'PACKHAM_CLARKE') {
        return getPackhamClarkePattern(weekNumber, weekStartDate);
      } else if (name === 'BAKER_BICK') {
        return getBakerBickPattern(weekStartDate);
      } else {
        return getCurrentConsultant(name, weekStartDate);
      }
    });

    const assigned = daySchedule.assigned.map(assignment => {
      if (assignment.weeks && !assignment.weeks.includes(weekNumber)) {
        return null;
      }
      return {
        name: getCurrentConsultant(assignment.surgeon, weekStartDate),
        duty: assignment.duty
      };
    }).filter(Boolean);

    return { flexible, assigned };
  };

  // Calculate capacity
  const calculateCapacity = () => {
    const weeks = [];
    const today = new Date();

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay() + 1);

    for (let w = 0; w < 52; w++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + (w * 7));

      const weekNumber = getWeekNumber(weekStart);
      const days = [];

      for (let day = 0; day < 5; day++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + day);

        const staffOnLeave = leave.filter(l => {
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          return dayDate >= start && dayDate <= end;
        });

        const staffForDay = getStaffForDay(day, weekNumber, weekStart);
        const onCallSurgeon = getOnCallSurgeon(day, weekNumber, weekStart);

        const key = `${w}-${day}`;
        const swap = swaps[key];

        let updatedStaffForDay = { ...staffForDay };
        if (swap) {
          updatedStaffForDay.flexible = updatedStaffForDay.flexible.map(name =>
            name === swap.originalSurgeon ? swap.newSurgeon : name
          );
        }

        if (day === 4) {
          const fridayAssignment = getFridayTheatre4Assignment(staffOnLeave, dayDate);
          updatedStaffForDay.assigned.push({
            name: fridayAssignment.name,
            duty: 'Theatre 4',
            available: fridayAssignment.available
          });
        }

        const assignedNames = updatedStaffForDay.assigned.map(a => a.name).filter(name => !name.includes('/'));
        const assignedStaff = [...assignedNames];
        if (onCallSurgeon) assignedStaff.push(onCallSurgeon);

        const availableFlexibleStaff = updatedStaffForDay.flexible.filter(name =>
          !assignedStaff.includes(name) && !staffOnLeave.some(l => l.name === name)
        );

        const totalAvailable = assignedStaff.length + availableFlexibleStaff.length - staffOnLeave.length;
        const capacityPercentage = Math.round((totalAvailable / baseStaff) * 100);

        days.push({
          date: dayDate,
          weekNumber,
          dayOfWeek: day,
          available: totalAvailable,
          capacityPercentage,
          onLeave: staffOnLeave,
          assigned: updatedStaffForDay.assigned,
          flexible: updatedStaffForDay.flexible,
          availableFlexible: availableFlexibleStaff,
          onCall: onCallSurgeon,
          swap
        });
      }

      weeks.push({
        weekNumber: w,
        startDate: weekStart,
        days
      });
    }

    return weeks;
  };

  const addLeave = () => {
    if (selectedSurgeon && leaveStartDate && leaveEndDate && selectedLeaveReason) {
      const leaveEntry = {
        name: selectedSurgeon,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: selectedLeaveReason
      };
      handleAddLeave(leaveEntry);
      setSelectedSurgeon('');
      setSelectedLeaveReason('');
      setLeaveStartDate('');
      setLeaveEndDate('');
    }
  };

  const addSwap = (weekIndex, dayIndex) => {
    if (selectedSwapSurgeon1 && selectedSwapSurgeon2) {
      const key = `${weekIndex}-${dayIndex}`;
      const swap = {
        originalSurgeon: selectedSwapSurgeon1,
        newSurgeon: selectedSwapSurgeon2
      };
      handleAddSwap(key, swap);
      setSelectedSwapSurgeon1('');
      setSelectedSwapSurgeon2('');
    }
  };

  const weeks = calculateCapacity();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-lg">Loading data...</div>
      </div>
    );
  }

  // Rest of the component JSX remains the same as the original
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Trauma Surgery Daily Capacity Planner</h1>

        {/* Controls Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Base Staffing */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3">Base Staffing</h3>
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium">Total Surgeons:</label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setBaseStaff(Math.max(1, baseStaff - 1))}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  -
                </button>
                <span className="px-3 py-1 bg-gray-100 rounded font-medium">{baseStaff}</span>
                <button
                  onClick={() => setBaseStaff(Math.min(30, baseStaff + 1))}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Leave Management */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3">Leave Management</h3>
            <p className="text-xs text-gray-500 mb-2">
              Click a week in the calendar to auto-fill dates, or enter manually
            </p>
            <div className="space-y-2 text-sm">
              <select
                value={selectedSurgeon}
                onChange={(e) => setSelectedSurgeon(e.target.value)}
                className="w-full px-2 py-1 border rounded"
              >
                <option value="">Select surgeon...</option>
                {getConsultantNames().map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  placeholder="Start date"
                  className="px-2 py-1 border rounded"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                />
                <input
                  type="date"
                  placeholder="End date"
                  className="px-2 py-1 border rounded"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                />
              </div>
              <select
                value={selectedLeaveReason}
                onChange={(e) => setSelectedLeaveReason(e.target.value)}
                className="w-full px-2 py-1 border rounded"
              >
                <option value="">Reason for leave...</option>
                {leaveReasons.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
              <button
                onClick={addLeave}
                disabled={!selectedSurgeon || !leaveStartDate || !leaveEndDate || !selectedLeaveReason}
                className="w-full px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
              >
                Add Leave
              </button>
            </div>
          </div>
        </div>

        {/* Current Leave and Swaps Display */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Leave Display */}
            {leave.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Current Leave:</h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {leave.map((l) => (
                    <div key={l.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                      <span>
                        <strong>{l.name}</strong>: {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()} ({l.reason})
                      </span>
                      {l.id !== 999999 && (
                        <button
                          onClick={() => handleRemoveLeave(l.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Swaps Display */}
            {Object.keys(swaps).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Current Swaps:</h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {Object.entries(swaps).map(([key, swap]) => {
                    const [week, day] = key.split('-');
                    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                    return (
                      <div key={key} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                        <span>
                          Week {parseInt(week) + 1} {dayNames[day]}: <strong>{swap.originalSurgeon}</strong> → <strong>{swap.newSurgeon}</strong>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Calendar View */}
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
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <tr
                    key={week.weekNumber}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      selectedWeek?.weekNumber === week.weekNumber ? 'bg-blue-100' : week.weekNumber % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    }`}
                    onClick={() => {
                      setSelectedWeek(week);
                      setIsModalOpen(true);
                    }}
                  >
                    <td className="px-4 py-2 text-sm">
                      <div className="font-medium">
                        Week {week.weekNumber + 1} (Cycle {week.days[0].weekNumber})
                      </div>
                      <div className="text-xs text-gray-500">
                        {week.startDate.toLocaleDateString()}
                      </div>
                    </td>
                    {week.days.map((day, dayIndex) => {
                      const isLowCapacity = day.capacityPercentage < 75;
                      const isCritical = day.capacityPercentage < 50;

                      return (
                        <td
                          key={dayIndex}
                          className={`px-4 py-2 text-center ${
                            isCritical
                              ? 'bg-red-100'
                              : isLowCapacity
                              ? 'bg-yellow-100'
                              : 'bg-green-100'
                          }`}
                        >
                          <div className="text-lg font-semibold">
                            {day.available}
                          </div>
                          <div className="text-xs text-gray-600">
                            {day.capacityPercentage}%
                          </div>
                          {day.swap && (
                            <div className="text-xs text-blue-600 mt-1">Swap</div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWeek(week);
                          setIsModalOpen(true);
                        }}
                        className="text-sm text-blue-500 hover:text-blue-700"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Week Detail Modal */}
        <WeekDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          selectedWeek={selectedWeek}
          selectedSwapSurgeon1={selectedSwapSurgeon1}
          setSelectedSwapSurgeon1={setSelectedSwapSurgeon1}
          selectedSwapSurgeon2={selectedSwapSurgeon2}
          setSelectedSwapSurgeon2={setSelectedSwapSurgeon2}
          getConsultantNames={getConsultantNames}
          addSwap={addSwap}
          baseStaff={baseStaff}
        />
      </div>
    </div>
  );
};

export default TraumaSurgeryPlannerRefactored;