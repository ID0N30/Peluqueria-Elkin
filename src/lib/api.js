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
    
  lookupAppointments: async (clientPhone, uid) => {
    // Note: now it also can support lookup by user ID if integrated in frontend.
    const results = await lookupAppointments(clientPhone, uid);
    return { appointments: results };
  },
    
  cancelAppointment: async (id, clientPhone, uid) => {
    return await cancelAppointment(id, clientPhone, uid);
  },
    
  adminLogin: async (password) => {
    // Using default admin email if previously it was a single password system. 
    // This is a stub for compatibility. Real auth uses `loginWithEmail` directly now.
    console.warn("adminLogin API stub called. Please migrate to authService.js loginWithEmail.");
    return await loginWithEmail('peluqueriaelkin@gmail.com', password);
  },
    
  changePassword: async (currentPassword, newPassword) => {
    return await changePassword(currentPassword, newPassword);
  }
};
