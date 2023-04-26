"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shuffle = exports.getRandomInt = exports.saveText = exports.readText = exports.saveJson = exports.readJson = exports.ensureDirExists = exports.deleteIfExists = exports.copyFiles = exports.loopOverFiles = exports.loopOverFolders = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
async function loopOverFolders(parentFolderPath, callback) {
    const folderNames = fs_extra_1.default.readdirSync(parentFolderPath);
    for (const folderName of folderNames) {
        const folderPath = `${parentFolderPath}/${folderName}`;
        if (!fs_extra_1.default.lstatSync(folderPath).isDirectory())
            continue; // ignore files, like .DS_Store
        await callback(folderPath, folderName);
    }
}
exports.loopOverFolders = loopOverFolders;
async function loopOverFiles(parentFolderPath, callback) {
    const fileNames = fs_extra_1.default.readdirSync(parentFolderPath);
    for (const fileName of fileNames) {
        const filePath = `${parentFolderPath}/${fileName}`;
        if (fs_extra_1.default.lstatSync(filePath).isDirectory())
            continue; // ignore folders
        await callback(filePath, fileName);
    }
}
exports.loopOverFiles = loopOverFiles;
function copyFiles(folderIn, folderOut) {
    if (!fs_extra_1.default.existsSync(folderIn))
        return;
    // console.log('Copying files', { folderIn, folderOut })
    ensureDirExists(folderOut);
    fs_extra_1.default.copySync(folderIn, folderOut);
    // console.log('Files copied')
}
exports.copyFiles = copyFiles;
function deleteIfExists(folderPath) {
    fs_extra_1.default.rmSync(folderPath, { recursive: true, force: true });
}
exports.deleteIfExists = deleteIfExists;
function ensureDirExists(filePath, isDirectory = false) {
    var currentDirName = path_1.default.dirname(filePath);
    // By default I'm checking whether the folder containing this file exists.
    // Use this flag if I want it to pass a path to a directory, not a path to a file.
    if (isDirectory)
        currentDirName = filePath;
    if (fs_extra_1.default.existsSync(currentDirName))
        return true;
    ensureDirExists(currentDirName); // check nested dir
    fs_extra_1.default.mkdirSync(currentDirName); // create folder for this one
}
exports.ensureDirExists = ensureDirExists;
function readJson(path) {
    const text = fs_extra_1.default.readFileSync(path, 'utf8');
    const parsed = JSON.parse(text);
    return parsed;
}
exports.readJson = readJson;
function saveJson(path, object) {
    ensureDirExists(path);
    fs_extra_1.default.writeFileSync(path, JSON.stringify(object, null, 2));
}
exports.saveJson = saveJson;
function readText(path) {
    const str = fs_extra_1.default.readFileSync(path, 'utf8');
    return str;
}
exports.readText = readText;
function saveText(path, str) {
    ensureDirExists(path);
    fs_extra_1.default.writeFileSync(path, str);
}
exports.saveText = saveText;
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
exports.getRandomInt = getRandomInt;
// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
// The de-facto unbiased shuffle algorithm is the Fisher-Yates (aka Knuth) Shuffle.
function shuffle(array) {
    if (!array)
        return [];
    let currentIndex = array.length, randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}
exports.shuffle = shuffle;
