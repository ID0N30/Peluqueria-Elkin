import { 
  getAvailability, 
  createAppointment, 
  lookupAppointments, 
  cancelAppointment 
} from './bookingService.js';
import { loginWithEmail, changePassword } from './authService.js';

// DEPRECATED: This file is kept for backward compatibility with older components.
// It maps the old Vercel Serverless API calls to the new Direct Firebase Client SDK logic.

export const api = {
  getAvailability: async (date) => {
    return await getAvailability(date);
  },
    
  createAppointment: async (appointmentData) => {
    return await createAppointment(appointmentData);
  },
    
  lookupAppointments: async (clientPhone, uid = null) => {
    const results = await lookupAppointments(clientPhone, uid);
    return { appointments: results };
  },
    
  cancelAppointment: async (id, clientPhone, uid = null) => {
    return await cancelAppointment(id, clientPhone, uid);
  },
    
  adminLogin: async (password) => {
    console.warn("adminLogin API stub called. Please migrate to authService.js loginWithEmail.");
    return await loginWithEmail('peluqueriaelkin@gmail.com', password);
  },
    
  changePassword: async (currentPassword, newPassword) => {
    return await changePassword(currentPassword, newPassword);
  }
};
