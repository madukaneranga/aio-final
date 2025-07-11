import React, { useState } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';

const TimeSlotManager = ({ timeSlots = [], onTimeSlotsChange, className = '' }) => {
  const [newSlot, setNewSlot] = useState({
    day: 'monday',
    startTime: '09:00',
    endTime: '17:00'
  });

  const daysOfWeek = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(time);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  const addTimeSlot = () => {
    if (newSlot.startTime >= newSlot.endTime) {
      alert('End time must be after start time');
      return;
    }

    const exists = timeSlots.some(slot => 
      slot.day === newSlot.day && 
      ((newSlot.startTime >= slot.startTime && newSlot.startTime < slot.endTime) ||
       (newSlot.endTime > slot.startTime && newSlot.endTime <= slot.endTime) ||
       (newSlot.startTime <= slot.startTime && newSlot.endTime >= slot.endTime))
    );

    if (exists) {
      alert('Time slot overlaps with existing slot for this day');
      return;
    }

    const updatedSlots = [...timeSlots, { ...newSlot }];
    onTimeSlotsChange(updatedSlots);
    setNewSlot({ day: 'monday', startTime: '09:00', endTime: '17:00' });
  };

  const removeTimeSlot = (index) => {
    const updatedSlots = timeSlots.filter((_, i) => i !== index);
    onTimeSlotsChange(updatedSlots);
  };

  const getDaySlots = (day) => {
    return timeSlots.filter(slot => slot.day === day);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <Clock className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Operating Hours</h3>
      </div>

      {/* Add New Time Slot */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Add Time Slot</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={newSlot.day}
            onChange={(e) => setNewSlot({ ...newSlot, day: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          >
            {daysOfWeek.map(day => (
              <option key={day.value} value={day.value}>{day.label}</option>
            ))}
          </select>
          
          <select
            value={newSlot.startTime}
            onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          >
            {timeOptions.map(time => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
          
          <select
            value={newSlot.endTime}
            onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          >
            {timeOptions.map(time => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
          
          <button
            onClick={addTimeSlot}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Current Time Slots by Day */}
      <div className="space-y-4">
        {daysOfWeek.map(day => {
          const daySlots = getDaySlots(day.value);
          return (
            <div key={day.value} className="border border-gray-200 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">{day.label}</h5>
              {daySlots.length === 0 ? (
                <p className="text-gray-500 text-sm">Closed</p>
              ) : (
                <div className="space-y-2">
                  {daySlots.map((slot, index) => {
                    const globalIndex = timeSlots.findIndex(s => 
                      s.day === slot.day && s.startTime === slot.startTime && s.endTime === slot.endTime
                    );
                    return (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                        <span className="text-sm">
                          {slot.startTime} - {slot.endTime}
                        </span>
                        <button
                          onClick={() => removeTimeSlot(globalIndex)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeSlotManager;