import { Booking, Unit } from '../types';
import { differenceInCalendarDays, startOfDay, addDays } from 'date-fns';

let intervalId: any = null;
const NOTIFIED_BOOKINGS_KEY = 'pms_notified_bookings';

// Map storing boolean flags for notified bookings based on action and date:
// e.g. { "booking-123_checkin_2024-01-01": true }
const getNotifiedStore = (): Record<string, boolean> => {
    try {
        const data = localStorage.getItem(NOTIFIED_BOOKINGS_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
};

const markAsNotified = (key: string) => {
    const store = getNotifiedStore();
    store[key] = true;
    localStorage.setItem(NOTIFIED_BOOKINGS_KEY, JSON.stringify(store));
};

export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return false;

    if (Notification.permission === 'granted') return true;

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

const showNotification = (title: string, options: NotificationOptions) => {
    if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
            icon: '/favicon.ico', // Assuming there's a favicon
            badge: '/favicon.ico',
            requireInteraction: true, // Keep it visible until dismissed in some browsers
            ...options
        });

        notification.onclick = function () {
            window.focus(); // Focus the browser tab
            // Navigate to bookings page using hash route
            window.location.hash = '#/bookings';
            this.close();
        };
    }
};

export const startNotificationScheduler = (bookings: Booking[], units: Unit[]) => {
    // Clear any existing interval
    if (intervalId) clearInterval(intervalId);

    // Run check every minute to see if time matches 9:00 PM (21:00)
    intervalId = setInterval(() => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // Target: 21:00 (9PM)
        if (hours === 21 && minutes === 0) {
            checkAndSendNotifications(bookings, units, false);
        }
    }, 60000); // Check every minute

    // Return cleanup function
    return () => {
        if (intervalId) clearInterval(intervalId);
    };
};

// Extracted for manual testing or immediate run if needed
export const checkAndSendNotifications = (bookings: Booking[], units: Unit[], isManualTrigger: boolean = false) => {
    if (Notification.permission !== 'granted') return;

    const store = getNotifiedStore();
    const now = new Date();
    const today = startOfDay(now);
    const hours = now.getHours();

    // If added manually before 9PM, skip immediate notification, wait for scheduler.
    // If added manually after 9PM, trigger immediately because scheduler has already passed.
    const shouldSendTomorrow = isManualTrigger ? hours >= 21 : true;

    bookings.forEach(booking => {
        // Only active/confirmed bookings
        if (booking.status !== 'Confirmed') return;

        const checkInDate = startOfDay(new Date(booking.start_date));
        const checkOutDate = startOfDay(new Date(booking.end_date));
        const unitName = units.find(u => u.id === booking.unit_id)?.name || 'Unit';

        // Check-in tomorrow
        const diffCheckIn = differenceInCalendarDays(checkInDate, today);
        if (diffCheckIn === 1 && shouldSendTomorrow) { // Tomorrow is check-in
            const key = `${booking.id}_checkin_${booking.start_date}`;
            if (!store[key]) {
                showNotification(`تذكير بدخول: ${booking.tenant_name}`, {
                    body: `تذكير: غداً موعد الدخول (Check-in) للعميل ${booking.tenant_name} في ${unitName}.`,
                    tag: key // Prevent duplicate notifications
                });
                markAsNotified(key);
            }
        }

        // Check-out tomorrow
        const diffCheckOut = differenceInCalendarDays(checkOutDate, today);
        if (diffCheckOut === 1 && shouldSendTomorrow) { // Tomorrow is check-out
            const key = `${booking.id}_checkout_${booking.end_date}`;
            if (!store[key]) {
                showNotification(`تذكير بمغادرة: ${booking.tenant_name}`, {
                    body: `تذكير: غداً موعد الخروج (Check-out) للعميل ${booking.tenant_name} من ${unitName}.`,
                    tag: key
                });
                markAsNotified(key);
            }
        }
    });
};
