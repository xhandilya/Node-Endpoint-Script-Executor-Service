import cors from "cors";
import express, { urlencoded, json } from "express";

import TriggerFinder from "./TriggerFinder.js";

export default class EndpointService {
	#app;
	#config;

	constructor(config) {
		this.#app = express();
		this.#config = config;
	}

	startService() {
		const triggerFinder = new TriggerFinder(this.#config.script_search_dir, this.#config.script_search_dir_max_level);
		const triggers = triggerFinder.findTriggers();
		const endpointTriggers = triggers.endpoint;
		const methodEndpointMap = new Map();

		endpointTriggers.forEach(endpointTrigger => {
			if (!methodEndpointMap.has(endpointTrigger[0])) {
				methodEndpointMap.set(endpointTrigger[0], []);
			}
			methodEndpointMap.get(endpointTrigger[0])?.push(endpointTrigger);
		});

		this.#endpointMethodBindingOrder.forEach(method => {
			methodEndpointMap.get(method)?.forEach(endpointTrigger => this.#bindEndpoint(endpointTrigger));
		});

		const jsonInputLimit = this.#config.service_json_input_limit;
		// Necessary for JSON parsing (mb = MegaBytes).
		this.#app.use(urlencoded({ "extended": true, "limit": `${jsonInputLimit}mb` }));
		/**
		 * Controls the maximum request body size (mb = MegaBytes).
		 * If this is a number, then the value specifies the number of bytes.
		 * If it is a string, the value is passed to the bytes library for parsing.
		 * Defaults to "100kb". https://www.npmjs.com/package/bytes 
		 */
		this.#app.use(json({ "limit": `${jsonInputLimit}mb` }));
		// Enable cors.
		this.#app.use(cors());
		/**
		 * [Express behind proxies](http://expressjs.com/en/guide/behind-proxies.html):
		 * When running an Express app behind a proxy, set (by using app.set()) the application variable "trust proxy" to True.
		 * If true, the client’s IP address is understood as the left-most entry in the X-Forwarded-* header.
		 * If false, the app is understood as directly facing the Internet and the client’s IP address is derived
		 * from req.connection.remoteAddress. This is the default setting.
		 */
		this.#app.set("trust proxy", this.#config.service_trusts_proxy);
		// Disable "X-Powered-By" header for security reasons.
		this.#app.disable("x-powered-by");

		const port = this.#config.service_port;
		this.#app.listen(port, () => {
			console.debug(`EndpointService listening on port ${port}`);
		});
	}

	#bindEndpoint(endpointTrigger) {
		const endpointMethod = endpointTrigger[0];
		const endpointPath = endpointTrigger[1];
		const script = endpointTrigger[2];

		switch (endpointMethod) {
			case "all":
				this.#app.all(endpointPath, invoke);
				break;
			case "delete":
				this.#app.delete(endpointPath, invoke);
				break;
			case "get":
				this.#app.get(endpointPath, invoke);
				break;
			case "head":
				this.#app.head(endpointPath, invoke);
				break;
			case "post":
				this.#app.post(endpointPath, invoke);
				break;
			case "put":
				this.#app.put(endpointPath, invoke);
				break;
			default:
				throw new Error(`Encountered invalid endpoint method: ${endpointMethod}`);
		}

		async function invoke(req, res) {
			console.debug(`Executing script ${script}`);
		}
	}

	get #endpointMethodBindingOrder() {
		return [
			"head",
			"get",
			"delete",
			"post",
			"put",
			"all"
		];
	}

}