#!/usr/bin/env node

import os from "os";
import path from "path";
import sanitize from "sanitize-filename";
import { input, select, checkbox, Separator } from "@inquirer/prompts";
import openExplorer from "open-file-explorer";
import { QUERY_MOVIES_ROOT, MOVIE_DETAILS_ROOT, MOVIE_SUBTITLES_ROOT } from "./utils/constants.js";
import fetchData from "./utils/fetchData.js";
import { mkdir, writeFile } from "fs/promises";

process.on("uncaughtException", () => {
	process.exit(0);
});

const downloadsFolder = path.join(os.homedir(), "Downloads");

const movie = await input({ message: "Enter a movie name:", required: true, loop: false });
const movies = await fetchData(`${QUERY_MOVIES_ROOT}?query_term=${encodeURIComponent(movie.toLowerCase())}&sort_by=download_count&limit=10`);

if (movies.data.movie_count === 0) {
	console.log("No movies found :(");
	process.exit(0);
}

const imdb_code = await select({ message: "Select a movie:", choices: movies.data.movies.map((movie) => ({ name: `${movie.title} (${movie.year})`, value: movie.imdb_code })) });
const selectedMovie = await fetchData(`${MOVIE_DETAILS_ROOT}?imdb_id=${imdb_code}`);
const { subtitles } = await fetchData(`${MOVIE_SUBTITLES_ROOT}?imdb_id=${imdb_code}`);
const { title, year, torrents } = selectedMovie.data.movie;

const files = await checkbox({
	loop: false,
	message: "Choose torrents and subtitles:",
	choices: [
		new Separator(`=== Torrents (${torrents.length}) ===`),
		...torrents.map((torrent) => ({ name: `${torrent.quality} (${torrent.size})`, value: { type: "torrent", url: torrent.url, quality: torrent.quality } })),
		new Separator(`=== Subtitles (${subtitles.length}) === `),
		...subtitles.map((subtitle) => ({ name: subtitle.language, value: { type: "subtitle", url: subtitle.href, language: subtitle.language } })),
	],
});

const folderName = sanitize(title);
await mkdir(path.join(downloadsFolder, folderName), { recursive: true });

files.forEach(async (file) => {
	const download = await fetch(file.url);
	const downloadData = await download.arrayBuffer();
	const fileName = file.type === "torrent" ? sanitize(`${title} (${year}) [${file.quality}].torrent`) : sanitize(`${file.language}.zip`);

	await writeFile(path.join(downloadsFolder, folderName, fileName), Buffer.from(downloadData));
});

openExplorer(path.join(downloadsFolder, folderName));
