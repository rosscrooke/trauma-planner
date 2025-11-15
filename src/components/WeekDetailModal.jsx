import React from 'react';
import { X } from 'lucide-react';

const WeekDetailModal = ({
  isOpen,
  onClose,
  selectedWeek,
  selectedSwapSurgeon1,
  setSelectedSwapSurgeon1,
  selectedSwapSurgeon2,
  setSelectedSwapSurgeon2,
  getConsultantNames,
  addSwap,
  baseStaff
}) => {
  if (!isOpen || !selectedWeek) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                Week {selectedWeek.weekNumber + 1} Details - Starting {selectedWeek.startDate.toLocaleDateString()}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Swap Management */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Add Swap for this Week
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedSwapSurgeon1}
                    onChange={(e) => setSelectedSwapSurgeon1(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg"
                    onClick={(e) => e.stopPropagation()}
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
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">Replacement surgeon...</option>
                    {getConsultantNames().map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Days Grid */}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            addSwap(selectedWeek.weekNumber, dayIndex);
                          }}
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
          </div>
        </div>
      </div>
    </>
  );
};

export default WeekDetailModal;