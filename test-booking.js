// Test script to check booking functionality
const testBooking = async () => {
  try {
    // First, get time slots
    const timeSlotsResponse = await fetch('http://localhost:5000/api/timeslots');
    const timeSlots = await timeSlotsResponse.json();
    console.log('Available time slots:', timeSlots.length);
    
    if (timeSlots.length === 0) {
      console.log('No time slots available');
      return;
    }
    
    // Get services
    const servicesResponse = await fetch('http://localhost:5000/api/services');
    const services = await servicesResponse.json();
    console.log('Available services:', services.length);
    
    if (services.length === 0) {
      console.log('No services available');
      return;
    }
    
    // Try to create a booking without authentication
    const bookingData = {
      serviceLocation: "123 Main St, Test City",
      serviceLocationType: "home",
      zipCode: "12345",
      priceTier: "basic",
      providerId: 1,
      serviceId: services[0].id,
      timeSlotId: timeSlots[0].id,
      timestamp: new Date().toISOString()
    };
    
    console.log('Attempting to create booking with data:', bookingData);
    
    const bookingResponse = await fetch('http://localhost:5000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData)
    });
    
    console.log('Booking response status:', bookingResponse.status);
    const responseText = await bookingResponse.text();
    console.log('Booking response:', responseText);
    
  } catch (error) {
    console.error('Test error:', error);
  }
};

testBooking();