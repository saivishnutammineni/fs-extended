import * as fs from 'fs';
import * as path from 'path';
import { forkJoin, merge, Observable, Subject } from 'rxjs';
import { File } from '../models/file-model';
import { IReadFileOptions } from './models/read-options';

// types

/**
 * @description specfies the emission strategy
 * whether to emit data whenever it is available or wait untill all data is accumilated
 * ex:- whether to emit each file or emit all files after all are read while reading multiple files
 */
export type EmissionStrategy = 'eager' | 'lazy';

/**
 * exported functions
 */

/**
 * @description reads a file from the file system and returns a string containing the data
 * @param filePath path to file to read
 * @param options optional param to pass in ecoding
 *  and other options. if not passed defaults to encoding of 'utf-8'
 */
export function readFileSync(filePath: string, options?: IReadFileOptions | string): File {
	if (!options) {
		options = getDefaultReadOptions();
	}
	const file = getFileDataFromPath(filePath);
	file.content = fs.readFileSync(filePath, options);
	return file;
}

/**
 * @description reads a file asyncronously
 * @param filePath path to file to read
 * @param options an optional param to pass in encoding etc. if not passed encoding defaults to 'utf-8'
 * @returns an observable to subscribe to
 */
export function readFileAsync(filePath: string, options?: IReadFileOptions | string): Observable<File> {
	if (!options) {
		options = getDefaultReadOptions();
	}
	const file = getFileDataFromPath(filePath);
	return new Observable<File>((observer) => {
		fs.promises.readFile(filePath, options).then((fileContent) => {
			file.content = fileContent.toString();
			observer.next(file);
			observer.complete();
		});
	});
}

/**
 * @description reads given files from file system
 * @param filePaths paths to files to read
 * @param options an optional param to specify read options. defaults to 'utf-8' encoding
 */
export function readFilesSync(filePaths: string[], options?: IReadFileOptions | string): File[] {
	if (!options) {
		options = getDefaultReadOptions();
	}
	const files: File[] = [];
	filePaths.forEach((filePath) => {
		const file = readFileSync(filePath);
		files.push(file);
	});
	return files;
}

/**
 * @description reads given files asyncronously
 * @param filePaths paths to files to read
 * @param emissionStrategy whether to emit each file when it's reading is complete or emit all files
 * at once when reading is complete
 * @returns an observable to subscribe to get notified of files read and their content
 */
export function readFilesAsync(
	filePaths: string[],
	emissionStrategy: 'eager',
	options?: string | IReadFileOptions
): Observable<File>;
export function readFilesAsync(
	filePaths: string[],
	emissionStrategy: 'lazy',
	options?: string | IReadFileOptions
): Observable<File[]>;
export function readFilesAsync(
	filePaths: string[],
	emissionStrategy: EmissionStrategy,
	options?: string | IReadFileOptions
): Observable<File | File[]> {
	const filesSubject: Subject<File | File[]> = new Subject();
	if (!options) {
		options = getDefaultReadOptions();
	}
	const fileObservables: Array<Observable<File>> = [];
	filePaths.forEach((filePath) => {
		fileObservables.push(readFileAsync(filePath, options));
	});
	let finalObservable: Observable<File | File[]>;
	if (emissionStrategy === 'eager') {
		// merge all observables
		finalObservable = merge(...fileObservables);
	} else {
		// join all observables
		finalObservable = forkJoin(fileObservables);
	}
	finalObservable.subscribe(
		(data) => {
			filesSubject.next(data);
		},
		// nothing on error
		() => undefined,
		// handle completion of all observables
		() => {
			filesSubject.complete();
		}
	);
	return filesSubject.asObservable();
}

/**
 * @description retuns parent directory for given file path
 * @param filePath file path to get the parent directory from
 */
export function getParentDirectoryFromFilePath(filePath: string): string {
	return path.dirname(filePath);
}

/**
 * @description gets the file name from the given file path
 * strips all content till last slash, and then all content after last '.'
 * @param filePath file path to get file name from
 */
export function getFileNameFromPath(filePath: string): string {
	filePath = path.normalize(filePath);
	return filePath.substring(filePath.lastIndexOf(path.sep) + 1, filePath.lastIndexOf('.'));
}

/**
 * @description gets the file extn from the given file path
 * @param filePath file path to get file extn from
 */
export function getFileExtnFromPath(filePath: string): string {
	return path.extname(filePath);
}

/**
 * functions not exported
 */

function getDefaultReadOptions(): IReadFileOptions {
	return {
		encoding: 'utf-8',
	};
}

/**
 * @description returns a file object containing data that can be obtained from given file path
 * @note does not contain file content
 * @param filePath
 */
function getFileDataFromPath(filePath: string): File {
	const file = new File();
	file.name = getFileNameFromPath(filePath);
	file.filePath = filePath;
	file.fileExtn = getFileExtnFromPath(filePath);
	file.parentDirectory = getParentDirectoryFromFilePath(filePath);
	return file;
}
