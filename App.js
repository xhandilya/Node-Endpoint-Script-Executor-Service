import fs from "fs";
import path from "path";
import process from "process";

import EndpointService from "./EndpointService.js";

try {
	const configFile = process.argv[2];
	const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), configFile), "utf-8"));
	const endpointService = new EndpointService(config);
	endpointService.startService();
} catch (err) {
	console.error(`Failed to run Node-Endpoint-Script-Executor-Service >`, err.message);
}