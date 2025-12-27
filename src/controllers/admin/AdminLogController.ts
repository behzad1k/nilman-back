import fs from "fs";
import path from "path";
import moment from "jalali-moment";

class LogController {
	// Search logs with filtering
	static async search(req, res) {
		try {
			const {
				startDate,
				endDate,
				userId,
				method,
				pathname,
				ipAddress,
				page = 1,
				limit = 100,
			} = req.query;

			// Parse date range
			const start = startDate ? moment(startDate, "jYYYY/jMM/jDD") : null;
			const end = endDate ? moment(endDate, "jYYYY/jMM/jDD") : null;

			// Get all log files in date range
			const logFiles = LogController.getLogFilesInRange(start, end);
			if (logFiles.length === 0) {
				return res.status(200).json({
					success: true,
					data: [],
					total: 0,
					page: parseInt(page),
					limit: parseInt(limit),
				});
			}

			// Read and parse all logs
			let allLogs = [];
			for (const logFile of logFiles) {
				const logs = LogController.readLogFile(logFile);
				allLogs = allLogs.concat(logs);
			}

			// Filter logs based on query params
			let filteredLogs = allLogs.filter((log) => {
				if (userId && log.userId !== userId) return false;
				if (method && log.method !== method.toUpperCase()) return false;
				if (pathname && !log.pathname.includes(pathname)) return false;
				if (ipAddress && log.ipAddress !== ipAddress) return false;

				// Date filtering
				if (start || end) {
					const logDate = moment(log.date, "jYYYY/jMM/jDD");
					if (start && logDate.isBefore(start, "day")) return false;
					if (end && logDate.isAfter(end, "day")) return false;
				}

				return true;
			});

			// Sort by date and time (newest first)
			filteredLogs.sort((a, b) => {
				const dateA = moment(`${a.date} ${a.time}`, "jYYYY/jMM/jDD HH:mm");
				const dateB = moment(`${b.date} ${b.time}`, "jYYYY/jMM/jDD HH:mm");
				return dateB.diff(dateA);
			});

			// Pagination
			const total = filteredLogs.length;
			const startIndex = (page - 1) * limit;
			const endIndex = startIndex + parseInt(limit);
			const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

			return res.status(200).json({
				success: true,
				data: paginatedLogs,
				total,
				page: parseInt(page),
				limit: parseInt(limit),
				totalPages: Math.ceil(total / limit),
			});
		} catch (error) {
			console.error("Error searching logs:", error);
			return res.status(500).json({
				success: false,
				message: "Error searching logs",
				error: error.message,
			});
		}
	}

	// Get all log files within date range
	static getLogFilesInRange(startDate, endDate) {
		const logDir = path.join(__dirname, "../../logs");

		if (!fs.existsSync(logDir)) {
			return [];
		}
		const allFiles = fs.readdirSync(logDir);
		const logFiles = allFiles.filter(
			(file) => file.startsWith("access-") && file.endsWith(".log"),
		);

		if (!startDate && !endDate) {
			return logFiles.map((file) => path.join(logDir, file));
		}

		return logFiles
			.filter((file) => {
				const dateMatch = file.match(/access-(\d{4}-\d{2}-\d{2})\.log/);
				if (!dateMatch) return false;

				const fileDate = moment(dateMatch[1], "jYYYY-jMM-jDD");

				if (startDate && fileDate.isBefore(startDate, "day")) return false;
				if (endDate && fileDate.isAfter(endDate, "day")) return false;

				return true;
			})
			.map((file) => path.join(logDir, file));
	}

	// Read and parse a log file
	static readLogFile(filePath) {
		try {
			const content = fs.readFileSync(filePath, "utf8");
			const lines = content.trim().split("\n");

			return lines
				.filter((line) => line.trim())
				.map((line) => {
					try {
						return JSON.parse(line);
					} catch (e) {
						console.error("Error parsing log line:", e);
						return null;
					}
				})
				.filter((log) => log !== null);
		} catch (error) {
			console.error(`Error reading log file ${filePath}:`, error);
			return [];
		}
	}

	// Get log statistics
	static async stats(req, res) {
		try {
			const { startDate, endDate } = req.query;

			const start = startDate ? moment(startDate, "jYYYY/jMM/jDD") : null;
			const end = endDate ? moment(endDate, "jYYYY/jMM/jDD") : null;

			const logFiles = LogController.getLogFilesInRange(start, end);

			let allLogs = [];
			for (const logFile of logFiles) {
				const logs = LogController.readLogFile(logFile);
				allLogs = allLogs.concat(logs);
			}

			const stats = {
				totalRequests: allLogs.length,
				methods: {},
				uniqueUsers: new Set(
					allLogs.map((log) => log.userId).filter((id) => id),
				).size,
				uniqueIPs: new Set(allLogs.map((log) => log.ipAddress)).size,
				topPaths: {},
			};

			// Count methods
			allLogs.forEach((log) => {
				stats.methods[log.method] = (stats.methods[log.method] || 0) + 1;
				stats.topPaths[log.pathname] = (stats.topPaths[log.pathname] || 0) + 1;
			});

			// Sort top paths
			stats.topPaths = Object.entries(stats.topPaths)
				.sort((a: any, b: any) => b[1] - a[1])
				.slice(0, 10)
				.reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});

			return res.status(200).json({
				success: true,
				data: stats,
			});
		} catch (error) {
			console.error("Error getting log stats:", error);
			return res.status(500).json({
				success: false,
				message: "Error getting log statistics",
				error: error.message,
			});
		}
	}
}

export default LogController;
