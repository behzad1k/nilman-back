// utils/BookingValidator.ts

import moment from "jalali-moment";

export class BookingValidator {
	/**
	 * Validate date and time for booking
	 * @param date - Jalali date in jYYYY/jMM/jDD format
	 * @param time - Hour (8-20)
	 * @param isUrgent - Whether this is an urgent booking
	 * @returns null if valid, error message if invalid
	 */
	static validateDateTime(
		date: string,
		time: number,
		isUrgent: boolean = false,
	): string | null {
		// Validate Jalali date format
		if (!moment(date, "jYYYY/jMM/jDD", true).isValid()) {
			return "فرمت تاریخ نامعتبر است. فرمت صحیح: ۱۴۰۴/۰۹/۲۰";
		}

		// Validate time range (8 AM to 8 PM based on your slots)
		if (!Number.isInteger(time) || time < 8 || time > 20) {
			return "ساعت باید بین ۸ تا ۲۰ باشد";
		}

		const now = moment();
		const currentHour = now.hour();

		// Parse requested Jalali date
		const requestedDate = moment(date, "jYYYY/jMM/jDD");
		const todayJalali = now.format("jYYYY/jMM/jDD");
		const today = moment().startOf("day");

		// Calculate if it's today or tomorrow in Jalali
		const isToday = date === todayJalali;
		const isTomorrow = date === now.add(1, "day").format("jYYYY/jMM/jDD");

		// Reset now for tomorrow calculations
		const currentMoment = moment();
		const currentHourForTomorrow = currentMoment.hour();

		// TODAY VALIDATIONS
		if (isToday) {
			console.log(
				"Today validation - current hour:",
				currentHour,
				"requested time:",
				time,
			);

			// Check if time has already passed
			if (currentHour > time) {
				return "این زمان قبلاً گذشته است";
			}

			// Check minimum advance time
			const hoursAhead = time - currentHour;

			if (isUrgent) {
				// Urgent: must book at least 5 hours ahead
				if (hoursAhead < 5) {
					return "برای رزرو فوری حداقل ۵ ساعت جلوتر را انتخاب کنید";
				}
			} else {
				// Non-urgent: must book at least 7 hours ahead
				if (hoursAhead < 7) {
					return "برای رزرو عادی حداقل ۷ ساعت جلوتر را انتخاب کنید";
				}

				// Additional check: must be at least 3 hours ahead (from frontend logic)
				if (hoursAhead < 3) {
					return "این زمان خیلی نزدیک به زمان فعلی است";
				}
			}
		}

		// TOMORROW VALIDATIONS
		if (isTomorrow) {
			console.log(
				"Tomorrow validation - current hour:",
				currentHourForTomorrow,
				"requested time:",
				time,
			);

			if (isUrgent) {
				// Urgent tomorrow restrictions based on current time
				if (
					currentHourForTomorrow >= 16 &&
					currentHourForTomorrow < 18 &&
					time < 10
				) {
					return "این زمان برای فردا و رزرو فوری در دسترس نیست";
				}
				if (currentHourForTomorrow >= 18 && time < 12) {
					return "این زمان برای فردا و رزرو فوری در دسترس نیست";
				}

				// Check if it's too late to book tomorrow urgent
				if (currentHourForTomorrow >= 16 && time < 16) {
					return "برای رزرو فوری فردا، زمان‌های بعد از ۱۶ را انتخاب کنید";
				}
			} else {
				// Non-urgent tomorrow: 5-hour gap requirement
				// From frontend: (!selected.isUrgent && calTab === 1 && (currentHour > 20 ? 20 : currentHour) - i >= 5)
				const maxCurrentHour =
					currentHourForTomorrow > 20 ? 20 : currentHourForTomorrow;
				const hourDifference = maxCurrentHour - time;

				if (hourDifference >= 5) {
					return "برای رزرو فردا باید حداقل ۵ ساعت با زمان فعلی فاصله داشته باشد";
				}
			}
		}

		// FUTURE DATE VALIDATIONS (beyond tomorrow)
		if (!isToday && !isTomorrow) {
			// Check if date is in the past
			if (requestedDate.isBefore(today)) {
				return "نمی‌توان برای زمان گذشته رزرو کرد";
			}
		}

		return null; // Validation passed
	}

	/**
	 * Check if a specific time slot is available based on worker schedules
	 * @param schedules - Worker's schedule data
	 * @param date - Jalali date
	 * @param time - Hour
	 * @returns true if available, false if booked
	 */
	static isTimeSlotAvailable(
		schedules: any,
		date: string,
		time: number,
	): boolean {
		if (!schedules || !schedules[date]) {
			return true; // No schedule means all times are available
		}

		const bookedTimes = schedules[date];
		return !bookedTimes.includes(time);
	}

	/**
	 * Get available time slots for a specific date
	 * @param schedules - Worker's schedule
	 * @param date - Jalali date
	 * @param isUrgent - Whether booking is urgent
	 * @returns Array of available hours (8-20)
	 */
	static getAvailableTimeSlots(
		schedules: any,
		date: string,
		isUrgent: boolean = false,
	): number[] {
		const availableSlots: number[] = [];
		const now = moment();
		const currentHour = now.hour();
		const todayJalali = now.format("jYYYY/jMM/jDD");
		const isToday = date === todayJalali;
		const isTomorrow = date === now.add(1, "day").format("jYYYY/jMM/jDD");

		// Reset for tomorrow calculations
		const currentMoment = moment();
		const currentHourForTomorrow = currentMoment.hour();

		for (let hour = 8; hour <= 20; hour++) {
			let isAvailable = true;

			// Check if already booked
			if (schedules && schedules[date] && schedules[date].includes(hour)) {
				isAvailable = false;
			}

			// Check today restrictions
			if (isToday) {
				const hoursAhead = hour - currentHour;

				if (hoursAhead <= 0) {
					isAvailable = false; // Past hour
				} else if (isUrgent && hoursAhead < 5) {
					isAvailable = false;
				} else if (!isUrgent && hoursAhead < 7) {
					isAvailable = false;
				}
			}

			// Check tomorrow restrictions
			if (isTomorrow) {
				if (isUrgent) {
					if (
						currentHourForTomorrow >= 16 &&
						currentHourForTomorrow < 18 &&
						hour < 10
					) {
						isAvailable = false;
					}
					if (currentHourForTomorrow >= 18 && hour < 12) {
						isAvailable = false;
					}
				} else {
					const maxCurrentHour =
						currentHourForTomorrow > 20 ? 20 : currentHourForTomorrow;
					if (maxCurrentHour - hour >= 5) {
						isAvailable = false;
					}
				}
			}

			if (isAvailable) {
				availableSlots.push(hour);
			}
		}

		return availableSlots;
	}
}
