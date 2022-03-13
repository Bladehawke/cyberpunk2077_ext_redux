import path from "path";

/** Correct Directory structure:
 * root_folder
 * |-📁 archive
 * | |-📁 pc
 * | | |-📁 mod
 * | | | |- 📄 *.archive
 * |-📁 bin
 * | |-📁 x64
 * | | |-📁 plugins
 * | | | |-📁 cyber_engine_tweaks
 * | | | | |-📁 mods
 * | | | | | |-📁 SomeMod
 * | | | | | | |- 📄 init.lua
 * | | | | | | |- Whatever structure the mod wants
 * |-📁 engine
 * | |-📁 config
 * | | |-📄 giweights.json
 * | | |-📁 platform
 * | | | |-📁 pc
 * | | | | |-📄 *.ini -- Typically loose files, no subdirs
 * |-📁 r6
 * | |-📁 config
 * | | |-📁 settings
 * | | | |-📄 options.json
 * | | | |-📁 platform
 * | | | | |-📁 pc
 * | | | | | |-📄 options.json
 * | | |-📄 bumperSettings.json
 * | | |-📄 *.xml (68.2 kB)
 * | |-📁 scripts
 * | | |-📁 SomeMod
 * | | | |-📄 *.reds
 * |-📁 red4ext
 * | |-📁 plugins
 * | | |-📁 SomeMod
 * | | | |-📄 *.dll
 */

export const CET_MOD_CANONICAL_INIT_FILE = "init.lua";
export const CET_MOD_CANONICAL_PATH_PREFIX = path.normalize(
  "bin/x64/plugins/cyber_engine_tweaks/mods",
);

export const REDS_MOD_CANONICAL_EXTENSION = ".reds";
export const REDS_MOD_CANONICAL_PATH_PREFIX = path.normalize("r6/scripts");

export const RED4EXT_MOD_CANONICAL_EXTENSION = ".dll";
export const RED4EXT_MOD_CANONICAL_PATH_PREFIX =
  path.normalize("red4ext/plugins/");

export const RED4EXT_CORE_RED4EXT_DLL = path.join(`red4ext\\RED4ext.dll`);

export const RED4EXT_KNOWN_NONOVERRIDABLE_DLLS = [
  path.join(`clrcompression.dll`),
  path.join(`clrjit.dll`),
  path.join(`coreclr.dll`),
  path.join(`D3DCompiler_47_cor3.dll`),
  path.join(`mscordaccore.dll`),
  path.join(`PenImc_cor3.dll`),
  path.join(`PresentationNative_cor3.dll`),
  path.join(`vcruntime140_cor3.dll`),
  path.join(`wpfgfx_cor3.dll`),
];

export const RED4EXT_KNOWN_NONOVERRIDABLE_DLL_DIRS = [
  path.join(`bin\\x64\\`), // Not okay!
];

export const ARCHIVE_ONLY_CANONICAL_EXT = ".archive";
export const ARCHIVE_ONLY_CANONICAL_PREFIX = path.normalize("archive/pc/mod/");
export const ARCHIVE_ONLY_TRADITIONAL_WRONG_PREFIX =
  path.normalize("archive/pc/patch/");

/**
 * The extension of most mods
 */
export const MOD_FILE_EXT = ".archive";
/**
 *  The path where INI files should lay
 */
export const INI_MOD_PATH = path.join("engine", "config", "platform", "pc");
export const INI_MOD_EXT = ".ini";
/**
 * The extension of a JSON file
 */
export const JSON_FILE_EXT = ".json";
export const KNOWN_JSON_FILES = {
  "giweights.json": path.join("engine", "config", "giweights.json"),
  "bumpersSettings.json": path.join("r6", "config", "bumpersSettings.json"),
};
