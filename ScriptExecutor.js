import { spawn } from "child_process";

export default class ScriptExecutor {
	#script;
	#config;
	#request;

	constructor(script, config, request) {
		this.#script = script;
		this.#config = config;
		this.#request = request;
	}

	execute() {
		return new Promise((resolve, reject) => {
			const argument = {
				config: this.#config,
				request: this.#request
			};

			console.debug(`Executing script ${this.#script}`);
			const child = spawn(
				"node",
				[
					this.#script,
					Buffer.from(JSON.stringify(argument)).toString("base64")
				],
				{
					stdio: "pipe"
				}
			);

			let stdout = "";
			let stderr = "";

			child.stdout.on("data", (data) => {
				stdout += data.toString();
			});

			child.stderr.on("data", (data) => {
				stderr += data.toString();
			});

			child.on("close", (code) => {
				if (code === 0) {
					try {
						const output = JSON.parse(Buffer.from(stdout, "base64").toString("utf-8"));
						output.response_code = output.response_code ?? 200;
						output.content_type = output.content_type ?? "text/plain";
						resolve(output);
					} catch (err) {
						reject(err);
					}
				} else {
					reject(new Error(`Script exited with code ${code}: ${stderr}`));
				}
			});

			child.on("error", (err) => {
				reject(err);
			});
		});
	}

}