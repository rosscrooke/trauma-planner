import React, { useState, useEffect } from 'react';
import dataService from './services/dataService';

const TraumaSurgeryPlannerRefactored = () => {
  const [baseStaff, setBaseStaff] = useState(20);
  const [leave, setLeave] = useState([]);
  const [swaps, setSwaps] = useState({});
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedSurgeon, setSelectedSurgeon] = useState('');
  const [selectedSwapSurgeon1, setSelectedSwapSurgeon1] = useState('');
  const [selectedSwapSurgeon2, setSelectedSwapSurgeon2] = useState('');
  const [selectedLeaveReason, setSelectedLeaveReason] = useState('');
  const [packhamClarkeOverrides, setPackhamClarkeOverrides] = useState({});
  const [bakerBickOverrides, setBakerBickOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [consultants, setConsultants] = useState([]);
  const [leaveReasons, setLeaveReasons] = useState([]);
  const [rotations, setRotations] = useState({});
  const [weekendRota, setWeekendRota] = useState({});

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

        // Add Selina Graham's maternity leave if not present
        const hasSelinaLeave = leaveData.some(l => l.id === 999999);
        if (!hasSelinaLeave) {
          const selinaMaternityLeave = {
            id: 999999,
            name: 'Selina Graham',
            startDate: '2025-09-01',
            endDate: '2026-03-01',
            reason: 'Maternity leave'
          };
          await handleAddLeave(selinaMaternityLeave);
        }
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
    if (selectedSurgeon && selectedWeek && selectedLeaveReason) {
      const leaveEntry = {
        name: selectedSurgeon,
        startDate: selectedWeek.days[0].date.toISOString().split('T')[0],
        endDate: selectedWeek.days[4].date.toISOString().split('T')[0],
        reason: selectedLeaveReason
      };
      handleAddLeave(leaveEntry);
      setSelectedSurgeon('');
      setSelectedLeaveReason('');
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
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Trauma Surgery Staff Planner</h1>

        {/* Controls Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Total Staff Required
              </label>
              <input
                type="number"
                value={baseStaff}
                onChange={(e) => setBaseStaff(parseInt(e.target.value) || 20)}
                className="w-full px-3 py-2 border rounded-lg"
                min="1"
                max="30"
              />
            </div>

            {/* Leave Management */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">
                Quick Add Leave (Select week from calendar first)
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedSurgeon}
                  onChange={(e) => setSelectedSurgeon(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg"
                  disabled={!selectedWeek}
                >
                  <option value="">Select surgeon...</option>
                  {getConsultantNames().map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <select
                  value={selectedLeaveReason}
                  onChange={(e) => setSelectedLeaveReason(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                  disabled={!selectedWeek}
                >
                  <option value="">Reason...</option>
                  {leaveReasons.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
                <button
                  onClick={addLeave}
                  disabled={!selectedSurgeon || !selectedWeek || !selectedLeaveReason}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Add Leave
                </button>
              </div>
              {selectedWeek && (
                <p className="text-sm text-gray-600 mt-1">
                  Selected: Week starting {selectedWeek.startDate.toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Current Leave Display */}
          {leave.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Current Leave:</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {leave.map((l) => (
                  <div key={l.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                    <span>
                      <strong>{l.name}</strong>: {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()} ({l.reason})
                    </span>
                    {l.id !== 999999 && (
                      <button
                        onClick={() => handleRemoveLeave(l.id)}
                        className="text-red-500 hover:text-red-700"
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
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Current Swaps:</h3>
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

        {/* Calendar View */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <h2 className="text-xl font-semibold p-4 border-b">52-Week Capacity View</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-2 text-left text-sm font-medium">Week</th>
                  <th className="px-4 py-2 text-center text-sm font-medium">Mon</th>
                  <th className="px-4 py-2 text-center text-sm font-medium">Tue</th>
                  <th className="px-4 py-2 text-center text-sm font-medium">Wed</th>
                  <th className="px-4 py-2 text-center text-sm font-medium">Thu</th>
                  <th className="px-4 py-2 text-center text-sm font-medium">Fri</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <tr
                    key={week.weekNumber}
                    className={`border-b hover:bg-gray-50 cursor-pointer ${
                      selectedWeek?.weekNumber === week.weekNumber ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedWeek(week)}
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

        {/* Detailed Week View */}
        {selectedWeek && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              Week {selectedWeek.weekNumber + 1} Details - Starting {selectedWeek.startDate.toLocaleDateString()}
            </h2>

            {/* Swap Management */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Add Swap for this Week
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedSwapSurgeon1}
                  onChange={(e) => setSelectedSwapSurgeon1(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg"
                >
                  <option value="">Original surgeon...</option>
                  {getConsultantNames().map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <select
                  value={selectedSwapSurgeon2}
                  onChange={(e) => setSelectedSwapSurgeon2(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg"
                >
                  <option value="">Replacement surgeon...</option>
                  {getConsultantNames().map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((dayName, dayIndex) => {
                const day = selectedWeek.days[dayIndex];

                return (
                  <div key={dayIndex} className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">
                      {dayName}
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        {day.date.toLocaleDateString()}
                      </span>
                    </h3>

                    <div className={`text-2xl font-bold mb-2 ${
                      day.capacityPercentage < 50
                        ? 'text-red-600'
                        : day.capacityPercentage < 75
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}>
                      {day.available} / {baseStaff}
                    </div>

                    {day.swap && (
                      <div className="mb-2 p-2 bg-blue-100 rounded text-xs">
                        <strong>Swap:</strong> {day.swap.originalSurgeon} → {day.swap.newSurgeon}
                      </div>
                    )}

                    {!day.swap && selectedSwapSurgeon1 && selectedSwapSurgeon2 && (
                      <button
                        onClick={() => addSwap(selectedWeek.weekNumber, dayIndex)}
                        className="mb-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                      >
                        Apply Swap Here
                      </button>
                    )}

                    {day.onCall && (
                      <div className="mb-2 p-2 bg-purple-100 rounded">
                        <div className="text-xs font-semibold">On Call:</div>
                        <div className="text-sm">{day.onCall}</div>
                      </div>
                    )}

                    {day.assigned.length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs font-semibold mb-1">Assigned:</div>
                        {day.assigned.map((a, i) => (
                          <div
                            key={i}
                            className={`text-xs p-1 rounded mb-1 ${
                              !a.available && dayIndex === 4 ? 'bg-red-100' : 'bg-gray-100'
                            }`}
                          >
                            <strong>{a.name}</strong>
                            <div className="text-gray-600">{a.duty}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mb-2">
                      <div className="text-xs font-semibold mb-1">Available Flexible:</div>
                      <div className="space-y-1">
                        {day.availableFlexible.map((name, i) => (
                          <div key={i} className="text-xs bg-green-100 p-1 rounded">
                            {name}
                          </div>
                        ))}
                      </div>
                    </div>

                    {day.onLeave.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold mb-1">On Leave:</div>
                        <div className="space-y-1">
                          {day.onLeave.map((l, i) => (
                            <div key={i} className="text-xs bg-red-100 p-1 rounded">
                              {l.name} ({l.reason})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TraumaSurgeryPlannerRefactored;