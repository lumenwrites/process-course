"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const gray_matter_1 = __importDefault(require("gray-matter"));
const utils_1 = require("./utils");
const zip_a_folder_1 = require("zip-a-folder");
const WORKING_DIR = process.cwd(); // + `/learn-to-code-from-zero-test`
const CONTENT_DIR = `${WORKING_DIR}/content-gdschool`;
const OUTPUT_DIR = `${WORKING_DIR}/content-gdschool-processed`;
const RELEASES_DIR = `${WORKING_DIR}/content-gdschool-releases`;
async function main() {
    let courseIndexText = (0, utils_1.readText)(`${CONTENT_DIR}/_index.md`);
    const { data: courseFrontmatter } = (0, gray_matter_1.default)(courseIndexText);
    // Copy all files to the output folder
    fs_extra_1.default.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    (0, utils_1.copyFiles)(CONTENT_DIR, OUTPUT_DIR);
    // Find all code files in Godot project folders, so that I can later use them to replace include shortcodes inside codeblocks
    const codeFiles = indexCodeFiles();
    // Process the content of the landing page
    courseIndexText = rewriteImagePaths(courseIndexText, `/courses/${courseFrontmatter.slug}`);
    (0, utils_1.saveText)(`${OUTPUT_DIR}/_index.md`, courseIndexText);
    // Loop over sections
    for (const sectionDirName of fs_extra_1.default.readdirSync(OUTPUT_DIR)) {
        const sectionDirPath = `${OUTPUT_DIR}/${sectionDirName}`;
        if (!fs_extra_1.default.lstatSync(sectionDirPath).isDirectory())
            continue; // ignore files
        if (sectionDirName === 'images')
            continue; // ignore the folder containing images for the landing page
        console.log(`Processing section: ${sectionDirName}`);
        let sectionIndexText = (0, utils_1.readText)(`${sectionDirPath}/_index.md`);
        const { data: sectionFrontmatter } = (0, gray_matter_1.default)(sectionIndexText);
        // Loop over lessons
        for (const lessonFileName of fs_extra_1.default.readdirSync(sectionDirPath)) {
            const lessonFilePath = `${sectionDirPath}/${lessonFileName}`;
            if (fs_extra_1.default.lstatSync(lessonFilePath).isDirectory())
                continue; // ignore directories containing images, files, etc.
            if (['_index.md', '.DS_Store'].includes(lessonFileName))
                continue; // ignore section index and .DS_Store files
            console.log(`Processing lesson: ${lessonFileName}`);
            let lessonText = (0, utils_1.readText)(lessonFilePath);
            // Process the content of the lesson - rewrite image paths, replace shortcodes, etc.
            const imagePathPrefix = `/courses/${courseFrontmatter.slug}/${sectionFrontmatter.slug}`;
            lessonText = rewriteImagePaths(lessonText, imagePathPrefix);
            lessonText = processCodeblocks(lessonText, lessonFileName, codeFiles);
            // Saving the processed lesson, in place.
            (0, utils_1.saveText)(lessonFilePath, lessonText);
        }
    }
    console.log('Compressing the processed course');
    const fileName = `${RELEASES_DIR}/${courseFrontmatter.slug}-${getDate()}.zip`;
    (0, utils_1.ensureDirExists)(fileName);
    await (0, zip_a_folder_1.zip)(OUTPUT_DIR, fileName);
}
// Replace image paths to absolute ones.
function rewriteImagePaths(lessonText, imagePathPrefix) {
    const markdownImagePathRegex = /!\[\]\((.+?)\)/g;
    lessonText = lessonText.replace(markdownImagePathRegex, (match, imagePath) => {
        const modifiedImagePath = `${imagePathPrefix}/${imagePath}`;
        return `![](${modifiedImagePath})`;
    });
    const htmlImagePathRegex = /<img src="(.+?)"(.+?)\/>/g;
    lessonText = lessonText.replace(htmlImagePathRegex, (match, imagePath, attributes) => {
        const modifiedImagePath = `${imagePathPrefix}/${imagePath}`;
        return `<img src="${modifiedImagePath}"${attributes}/>`;
    });
    const thumbnailImagePathRegex = /^thumbnail:\s*(.*)$/gm;
    lessonText = lessonText.replace(thumbnailImagePathRegex, (match, imagePath, attributes) => {
        const modifiedImagePath = `${imagePathPrefix}/${imagePath}`;
        return `thumbnail: ${modifiedImagePath}`;
    });
    return lessonText;
}
function processCodeblocks(lessonText, lessonFileName, codeFiles) {
    // Add filenames to codeblocks, like ```gdscript:/path/to/file/FileName.gd
    lessonText = addFilenamesToCodeblocks(lessonText, codeFiles);
    // Replace includes with code. Include looks like this: {{ include FileName.gd anchor_name }}
    const includeRegex = /{{\s*include\s+([^\s]+)(?:\s+([^\s]+))?\s*}}/g;
    lessonText = lessonText.replace(includeRegex, (match, fileName, anchor) => {
        var _a;
        let updatedContent = `This line replaces the include for ${fileName}, ${anchor}`; // just for testing
        // Find the code file by name so I could read its content
        let codeFilePath = (_a = codeFiles.find((codeFile) => codeFile.fileName === fileName)) === null || _a === void 0 ? void 0 : _a.filePath;
        // If the file path is absolute, use it as is
        if (fileName.includes('/'))
            codeFilePath = WORKING_DIR + '/' + fileName;
        if (!codeFilePath)
            throw new Error(`Code file not found: ${lessonFileName} ${fileName}`);
        let codeText = (0, utils_1.readText)(codeFilePath);
        updatedContent = codeText;
        // If it has anchor tags, extract the text between them
        if (anchor)
            updatedContent = extractTextBetweenAnchors(codeText, anchor);
        updatedContent = removeAnchorTags(updatedContent);
        // updatedContent = trimBlankLines(updatedContent)
        return updatedContent;
    });
    return lessonText;
}
function addFilenamesToCodeblocks(lessonText, codeFiles) {
    const regex = /(```gdscript)(\s*\n)(\{\{\s*include\s+([^}\s]+))/g;
    lessonText = lessonText.replace(regex, (match, p1, p2, p3, fileName) => {
        var _a;
        let relativeFilePath = (_a = codeFiles.find((codeFile) => codeFile.fileName === fileName)) === null || _a === void 0 ? void 0 : _a.relativeFilePath;
        // If instead of the file name the path to the file was provided, like:
        // {{ include godot-complete-demos/ObstacleCourse_Part2/pickups/Pickup.gd apply_effect }}
        if (fileName.includes('/'))
            relativeFilePath = `${fileName.split('/').at(-1)}`; // .split('/').slice(1).join('/')
        return `${p1}:${relativeFilePath}${p2}${p3}`;
    });
    return lessonText;
}
function extractTextBetweenAnchors(content, anchorName) {
    const anchorPattern = new RegExp(`(?:#|\\/\\/)\\s*ANCHOR:\\s*\\b${anchorName}\\b\\s*\\r?\\n(.*?)\\s*(?:#|\\/\\/)\\s*END:\\s*\\b${anchorName}\\b`, 'gms');
    const match = anchorPattern.exec(content);
    if (!match || !match[1])
        throw new Error('No matching anchor found.');
    return match[1];
}
function removeAnchorTags(content) {
    // const anchorPattern = /#\s*(ANCHOR:|END:).*\n?\s*/gm
    const anchorPattern = /^.*#(ANCHOR|END).*\r?\n?/gm;
    return content.replace(anchorPattern, '').trimEnd();
}
function trimBlankLines(str) {
    // Use regular expression to replace blank lines at the beginning and end of the string
    return str.replace(/^\s*[\r\n]/gm, '').replace(/\s*[\r\n]$/gm, '');
}
function indexCodeFiles() {
    // Loop over all folders in this project, find ones that have a project.godot file in them
    let godotProjectFolders = [];
    searchFiles(WORKING_DIR, (currentPath, fileName) => {
        if (fileName === 'project.godot') {
            // console.log('Found Godot project:', currentPath)
            godotProjectFolders.push(currentPath);
        }
    });
    // Loop over all files in Godot project folders, find ones that have a .gd or .shader extension
    let codeFiles = [];
    for (let godotProjectFolder of godotProjectFolders) {
        searchFiles(godotProjectFolder, (currentPath, fileName) => {
            const fileExt = path_1.default.extname(fileName);
            const filePath = path_1.default.join(currentPath, fileName);
            if (['.gd', '.shader'].includes(fileExt)) {
                // console.log(godotProjectFolder, filePath);
                codeFiles.push({
                    fileName,
                    filePath,
                    godotProjectFolder,
                    // Path relative to godot project folder, used to add the path to the script at the top of the code block
                    relativeFilePath: filePath.replace(godotProjectFolder, ''),
                });
            }
        });
    }
    return codeFiles;
}
function searchFiles(currentPath, callback) {
    const files = fs_extra_1.default.readdirSync(currentPath);
    for (let fileName of files) {
        const filePath = path_1.default.join(currentPath, fileName);
        if (fs_extra_1.default.statSync(filePath).isDirectory()) {
            searchFiles(filePath, callback);
        }
        else {
            callback(currentPath, fileName);
        }
    }
}
function getDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    return formattedDate;
}
main();
