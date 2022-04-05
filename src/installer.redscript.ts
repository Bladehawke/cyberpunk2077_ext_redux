import path from "path";
import {
  FileTree,
  dirWithSomeIn,
  filesUnder,
  Glob,
  findDirectSubdirsWithSome,
  FILETREE_ROOT,
} from "./filetree";
import { extraCanonArchiveInstructions } from "./installer.archive";
import { promptToFallbackOrFailOnUnresolvableLayout } from "./installer.fallback";
import {
  REDS_MOD_CANONICAL_PATH_PREFIX,
  MaybeInstructions,
  NoInstructions,
  RedscriptLayout,
  REDS_MOD_CANONICAL_EXTENSION,
} from "./installers.layouts";
import {
  moveFromTo,
  instructionsForSourceToDestPairs,
  instructionsForSameSourceAndDestPaths,
  makeSyntheticName,
  toSamePath,
  toDirInPath,
} from "./installers.shared";
import { InstallerType } from "./installers.types";
import { trueish } from "./installers.utils";
import {
  VortexApi,
  VortexWrappedTestSupportedFunc,
  VortexLogFunc,
  VortexTestResult,
  VortexWrappedInstallFunc,
  VortexInstallResult,
} from "./vortex-wrapper";

const matchRedscript = (file: string) =>
  path.extname(file) === REDS_MOD_CANONICAL_EXTENSION;

const allRedscriptFiles = (files: string[]): string[] => files.filter(matchRedscript);

export const detectRedscriptBasedirLayout = (fileTree: FileTree): boolean =>
  dirWithSomeIn(REDS_MOD_CANONICAL_PATH_PREFIX, matchRedscript, fileTree);

export const redscriptBasedirLayout = (
  api: VortexApi,
  modName: string,
  fileTree: FileTree,
): MaybeInstructions => {
  const hasBasedirReds = detectRedscriptBasedirLayout(fileTree);

  if (!hasBasedirReds) {
    api.log("debug", "No basedir Redscript files found");
    return NoInstructions.NoMatch;
  }

  const allBasedirAndSubdirFiles = filesUnder(
    REDS_MOD_CANONICAL_PATH_PREFIX,
    Glob.Any,
    fileTree,
  );

  const modnamedDir = path.join(REDS_MOD_CANONICAL_PATH_PREFIX, modName);

  const allToBasedirWithSubdirAsModname = allBasedirAndSubdirFiles.map(
    moveFromTo(REDS_MOD_CANONICAL_PATH_PREFIX, modnamedDir),
  );

  return {
    kind: RedscriptLayout.Basedir,
    instructions: instructionsForSourceToDestPairs(allToBasedirWithSubdirAsModname),
  };
};

const findCanonicalRedscriptDirs = (fileTree: FileTree) =>
  findDirectSubdirsWithSome(REDS_MOD_CANONICAL_PATH_PREFIX, matchRedscript, fileTree);

export const detectRedscriptCanonOnlyLayout = (fileTree: FileTree): boolean =>
  !detectRedscriptBasedirLayout(fileTree) &&
  findCanonicalRedscriptDirs(fileTree).length > 0;

export const redscriptCanonLayout = (
  api: VortexApi,
  _modName: string,
  fileTree: FileTree,
): MaybeInstructions => {
  const allCanonRedscriptFiles = findCanonicalRedscriptDirs(fileTree).flatMap(
    (namedSubdir) => filesUnder(namedSubdir, Glob.Any, fileTree),
  );

  if (allCanonRedscriptFiles.length < 1) {
    api.log("error", "No canonical Redscript files found.");
    return NoInstructions.NoMatch;
  }

  // This is maybe slightly annoying to check, but makes
  // logic elsewhere cleaner. I suppose we can decide that
  // layouts need to be robust enough in themselves if they
  // would otherwise depend on some external check that isn't
  // always present.
  //
  // Generally, shouldn't get here.
  //
  const hasBasedirReds = detectRedscriptBasedirLayout(fileTree);

  if (hasBasedirReds) {
    // Errors need to be handled downstream if it's relevant there
    api.log("debug", "No instructions from canon: basedir overrides");
    return NoInstructions.NoMatch;
  }

  return {
    kind: RedscriptLayout.Canon,
    instructions: instructionsForSameSourceAndDestPaths(allCanonRedscriptFiles),
  };
};

export const testForRedscriptMod: VortexWrappedTestSupportedFunc = (
  api: VortexApi,
  log: VortexLogFunc,
  files: string[],
  _fileTree: FileTree,
): Promise<VortexTestResult> => {
  const redscriptFiles = allRedscriptFiles(files);

  log("debug", "redscriptFiles: ", { redscriptFiles });

  // We could do more detection here but the
  // installer will already need to duplicate
  // all that. Maybe just check whether there
  // are any counterindications?
  if (redscriptFiles.length === 0) {
    log("debug", "No Redscripts");
    return Promise.resolve({ supported: false, requiredFiles: [] });
  }

  log("info", "Matched to Redscript");
  return Promise.resolve({
    supported: true,
    requiredFiles: [],
  });
};

// Install the Redscript stuff, as well as any archives we find
export const installRedscriptMod: VortexWrappedInstallFunc = async (
  api: VortexApi,
  log: VortexLogFunc,
  files: string[],
  fileTree: FileTree,
  destinationPath: string,
): Promise<VortexInstallResult> => {
  // We could get a lot fancier here, but for now we don't accept
  // subdirectories anywhere other than in a canonical location.

  // .\*.reds
  // eslint-disable-next-line no-underscore-dangle
  const hasToplevelReds = dirWithSomeIn(FILETREE_ROOT, matchRedscript, fileTree);
  const toplevelReds = hasToplevelReds
    ? filesUnder(FILETREE_ROOT, Glob.Any, fileTree)
    : [];

  // .\r6\scripts\*.reds
  // eslint-disable-next-line no-underscore-dangle
  const hasBasedirReds = dirWithSomeIn(
    REDS_MOD_CANONICAL_PATH_PREFIX,
    matchRedscript,
    fileTree,
  );
  const basedirReds = hasBasedirReds
    ? filesUnder(REDS_MOD_CANONICAL_PATH_PREFIX, Glob.Any, fileTree)
    : [];

  const canonSubdirs = findDirectSubdirsWithSome(
    REDS_MOD_CANONICAL_PATH_PREFIX,
    matchRedscript,
    fileTree,
  );
  const hasCanonReds = canonSubdirs.length > 0;
  const canonReds = hasCanonReds
    ? canonSubdirs.flatMap((dir) => filesUnder(dir, Glob.Any, fileTree))
    : [];

  const installable = [hasToplevelReds, hasBasedirReds, hasCanonReds].filter(trueish);

  if (installable.length !== 1) {
    return promptToFallbackOrFailOnUnresolvableLayout(
      api,
      InstallerType.Redscript,
      fileTree,
    );
  }

  const modName = makeSyntheticName(destinationPath);

  const extraArchiveInstructions = extraCanonArchiveInstructions(api, fileTree);

  // Only one of these should exist but why discriminate?
  const allSourcesAndDestinations = [
    canonReds.map(toSamePath),
    basedirReds.map(toDirInPath(REDS_MOD_CANONICAL_PATH_PREFIX, modName)),
    toplevelReds.map(toDirInPath(REDS_MOD_CANONICAL_PATH_PREFIX, modName)),
  ];

  const redsInstructions = allSourcesAndDestinations.flatMap(
    instructionsForSourceToDestPairs,
  );

  const instructions = [...redsInstructions, ...extraArchiveInstructions.instructions];

  return Promise.resolve({ instructions });
};