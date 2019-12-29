import * as fs from 'fs';

/**
 * @description
 * @param filePath
 * @param options
 */
export function readFileSync(filePath: string, options?: any): string {
	return fs.readFileSync(filePath, { encoding: 'utf-8' });
}

// export function readFileAsync() {}

// export function readFilesSync() {}

// export function readFilesAsync() {}
