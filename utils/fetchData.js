import ora from "ora";

export default async function fetchData(url, loading = "Loading...") {
	const spinner = ora(loading).start();

	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Error: ${response.statusText}`);
		}
		const data = await response.json();
		return data;
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	} finally {
		spinner.stop();
	}
}
