import { win32 } from "path";
import { readFileSync } from "fs";
import {
  VortexAPI,
  VortexLogFunc,
  VortexTestResult,
  VortexInstruction,
  VortexInstallResult,
  VortexProgressDelegate,
  VortexWrappedInstallFunc,
  VortexWrappedTestSupportedFunc,
} from "./vortex-wrapper";
import {
  CET_MOD_CANONICAL_INIT_FILE,
  REDS_MOD_CANONICAL_EXTENSION,
} from "./installers";

const path = win32;

/**
 * The extension of a JSON file
 */
const JSON_FILE_EXT = ".json";
const KNOWN_JSON_FILES = {
  "giweights.json": path.join("engine", "config", "giweights.json"),
  "bumpersSettings.json": path.join("r6", "config", "bumpersSettings.json"),
};
/**
 *  The path where INI files should lay
 */
export const INI_MOD_PATH = path.join("engine", "config", "platform", "pc");
const INI_MOD_EXT = ".ini";
export const RESHADE_MOD_PATH = path.join("bin", "x64");
const SHADERS_DIR = "reshade-shaders";
export const SHADERS_PATH = path.join(RESHADE_MOD_PATH, SHADERS_DIR);
const CET_GLOBAL_INI = path.normalize("bin/x64/global.ini");

export const testForJsonMod: VortexWrappedTestSupportedFunc = (
  _api: VortexAPI,
  log: VortexLogFunc,
  files: string[],
  gameId: string,
): Promise<VortexTestResult> => {
  // Make sure we're able to support this mod.
  log("info", "Checking JSON files for game: ", gameId);

  const filtered = files.filter(
    (file: string) => path.extname(file).toLowerCase() === JSON_FILE_EXT,
  );
  if (filtered.length === 0) {
    log("info", "No JSON files");
    return Promise.resolve({
      supported: false,
      requiredFiles: [],
    });
  }

  // just make sure we don't somehow have a CET mod that got here
  const cetModJson = files.filter(
    (file: string) =>
      path.basename(file).toLowerCase() === CET_MOD_CANONICAL_INIT_FILE,
  );
  if (cetModJson.length !== 0) {
    log("error", "We somehow got a CET mod in the JSON check");
    return Promise.resolve({
      supported: false,
      requiredFiles: [],
    });
  }
  let proper = true;
  // check for options.json in the file list
  const options = filtered.some((file: string) =>
    file.endsWith("options.json"),
  );
  if (options) {
    log("debug", "Options.json files found: ", options);
    proper = filtered.some((f: string) =>
      path
        .dirname(f)
        .toLowerCase()
        .startsWith(path.normalize("r6/config/settings")),
    );

    if (!proper) {
      log(
        "info",
        "Improperly located options.json found in archive, we can't install this",
      );
      return Promise.reject(
        new Error(
          "Improperly located options.json file found.  We don't know where it belongs",
        ),
      );
    }
  }

  log("debug", "We got through it all and it is a JSON mod");
  return Promise.resolve({
    supported: true,
    requiredFiles: [],
  });
};

export const installJsonMod: VortexWrappedInstallFunc = (
  api: VortexAPI,
  log: VortexLogFunc,
  files: string[],
  _destinationPath: string,
): Promise<VortexInstallResult> => {
  const filtered: string[] = files.filter(
    (file: string) => path.extname(file) !== "",
  );
  log("info", "Installing JSON files: ", filtered);

  let movedJson = false;

  const jsonFileInstructions = filtered.map((file: string) => {
    const fileName = path.basename(file);

    let instPath = file;

    if (KNOWN_JSON_FILES[fileName] !== undefined) {
      instPath = KNOWN_JSON_FILES[fileName];

      log("debug", "instPath set as ", instPath);
      movedJson = movedJson || file !== instPath;
    }

    return {
      type: "copy",
      source: file,
      destination: instPath,
    };
  });

  if (movedJson)
    log(
      "info",
      "JSON files were found outside their canonical locations: Fixed",
    );

  log("debug", "Installing JSON files with: ", jsonFileInstructions);

  const instructions = [].concat(jsonFileInstructions);

  return Promise.resolve({ instructions });
};

const testForReshadeFile = (
  log: VortexLogFunc,
  files: string[],
  folder: string,
): boolean => {
  // We're going to make a reasonable assumption here that reshades will
  // only have reshade ini's, so we only need to check the first one

  const fileToExamine = path.join(
    folder,
    files.find((file: string) => path.extname(file) === INI_MOD_EXT),
  );

  const data = readFileSync(fileToExamine, { encoding: "utf8" }); //, (err, contents) => {if (err) {log("error", "Error: ", err)} else data = contents});

  if (data === undefined) {
    log("error", "unable to read contents of ", fileToExamine);
    return false;
  }
  data.slice(0, 80);
  const regex = /^[\[#].+/;
  const testString = data.replace(regex, "");
  if (testString === data) {
    log("info", "Reshade file located.");
    return true;
  }

  return false;
};

// INI (includes Reshade?)
export const testForIniMod: VortexWrappedTestSupportedFunc = (
  api: VortexAPI,
  log: VortexLogFunc,
  files: string[],
  _gameId: string,
): Promise<VortexTestResult> => {
  log("info", "Checking for INI files: ", _gameId);

  const filtered = files.filter(
    (file: string) => path.extname(file).toLowerCase() === INI_MOD_EXT,
  );

  if (filtered.length === 0) {
    log("info", "No INI files.");
    return Promise.resolve({
      supported: false,
      requiredFiles: [],
    });
  }

  if (
    files.some(
      (file: string) =>
        path.basename(file).includes(CET_MOD_CANONICAL_INIT_FILE) ||
        path.extname(file) === REDS_MOD_CANONICAL_EXTENSION,
    )
  ) {
    log("info", "INI file detected within a CET or Redscript mod, aborting");
    return Promise.resolve({
      supported: false,
      requiredFiles: [],
    });
  }
  if (files.includes(CET_GLOBAL_INI)) {
    log("info", "CET Installer detected, not processing as INI");
    return Promise.resolve({
      supported: false,
      requiredFiles: [],
    });
  }
  return Promise.resolve({
    supported: true,
    requiredFiles: [],
  });
};

export const installIniMod: VortexWrappedInstallFunc = (
  api: VortexAPI,
  log: VortexLogFunc,
  files: string[],
  _destinationPath: string,
): Promise<VortexInstallResult> => {
  // This installer gets called for both reshade and "normal" ini mods

  const allIniModFiles = files.filter(
    (file: string) => path.extname(file) === INI_MOD_EXT,
  );

  const reshade = testForReshadeFile(log, allIniModFiles, _destinationPath);

  // Set destination depending on file type

  log("info", "Installing ini files: ", allIniModFiles);
  const iniFileInstructions = allIniModFiles.map((file: string) => {
    const fileName = path.basename(file);
    const dest = reshade
      ? path.join(RESHADE_MOD_PATH, path.basename(file))
      : path.join(INI_MOD_PATH, fileName);

    return {
      type: "copy",
      source: file,
      destination: dest,
    };
  });

  const shaderFiles = files.filter(
    (file: string) => file.includes(SHADERS_DIR) && !file.endsWith(path.sep),
  );

  let shaderInstructions = [];

  if (reshade && shaderFiles.length !== 0) {
    log("info", "Installing shader files: ", shaderFiles);
    shaderInstructions = shaderFiles.map((file: string) => {
      const regex = /.*reshade-shaders/;
      const fileName = file.replace(regex, SHADERS_DIR);
      // log("info", "Shader dir Found. Processing: ", fileName);
      const dest = path.join(RESHADE_MOD_PATH, fileName);
      // log("debug", "Shader file: ", dest);
      return {
        type: "copy",
        source: file,
        destination: dest,
      };
    });
  }
  const instructions = [].concat(iniFileInstructions, shaderInstructions);
  log("debug", "Installing ini files with instructions: ", instructions);

  return Promise.resolve({ instructions });
};
