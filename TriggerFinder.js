import fs from "fs";
import path from "path";

const TRIGGER_SUFFIX = ".trigger.json";

export default class TriggerFinder {
	#dir;
	#maxLevel;

	constructor(dir, maxLevel) {
		this.#dir = path.join(process.cwd(), dir);
		this.#maxLevel = maxLevel;
	}

	findTriggers() {
		const endpointTriggers = []; // [endpoint_method, endpoint_path, script]
		const triggerFiles = this.#findFilesBySuffix(this.#dir, TRIGGER_SUFFIX, 0);
		const triggerList = this.#processTriggerFiles(triggerFiles);

		for (const trigger of triggerList) {
			const script = trigger.script;

			for (const endpoint of trigger.trigger?.endpoint ?? []) {
				try {
					const endpointMethod = endpoint.method ?? (() => { throw new Error(`Endpoint method is not available`) })();
					const endpointPath = endpoint.path ?? (() => { throw new Error(`Endpoint path is not available`) })();
					endpointTriggers.push([endpointMethod, endpointPath, script]);
				} catch (err) {
					console.error(`Failed to process endpoint trigger for script "${script}": >`, err.message);
				}
			}
		}

		return {
			endpoint: endpointTriggers
		};
	}

	#findFilesBySuffix(directory, suffix, level) {
		const matchingFiles = [];

		if (level >= this.#maxLevel) {
			return matchingFiles;
		}

		try {
			const items = fs.readdirSync(directory, { withFileTypes: true });

			for (const item of items) {
				const fullPath = path.join(directory, item.name);

				if (item.isDirectory()) {
					// Recursively search in subdirectories
					const subDirFiles = this.#findFilesBySuffix(fullPath, suffix, level + 1);
					matchingFiles.push(...subDirFiles);
				} else if (item.isFile() && item.name.endsWith(suffix)) {
					// Add the file to the results if it matches the suffix
					matchingFiles.push(fullPath);
				}
			}
		} catch (err) {
			// Handle errors like directory not found or permission issues
			console.error(`Error processing directory "${directory}": >`, err.message);
		}

		return matchingFiles;
	}

	#processTriggerFiles(files) {
		const triggers = [];

		files.forEach(file => {
			try {
				const fileDir = path.dirname(file);
				const triggerJson = JSON.parse(fs.readFileSync(file, "utf-8"));
				const scriptFile = triggerJson.script ?? (() => { throw new Error(`Script is not available`) })();
				triggers.push({
					script: path.join(fileDir, scriptFile),
					trigger: triggerJson.trigger
				});
			} catch (err) {
				console.error(`Failed to process trigger file "${file}": >`, err.message);
			}
		});

		return triggers;
	}

}