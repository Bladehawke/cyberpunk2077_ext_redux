import { AllExpectedSuccesses, AllExpectedTestSupportFailures } from "./mods.example";
import { matchInstaller } from "./utils.helper";

// These are actually already tested in installer-fix… (including
// the expected failures!) but I guess it doesn’t hurt to have this.

describe("Selecting the installer for a mod type", () => {
  AllExpectedSuccesses.forEach((examples, set) => {
    describe(`${set} mods`, () => {
      examples.forEach(async (mod, desc) => {
        test(`select the ${mod.expectedInstallerType} installer when ${desc}`, async () => {
          const installer = await matchInstaller(mod.inFiles);
          expect(installer).toBeDefined();
          expect(installer.type).toBe(mod.expectedInstallerType);
        });
      });
    });
  });

  AllExpectedTestSupportFailures.forEach((examples, set) => {
    describe(`testSupport attempts that should fail, ${set}`, () => {
      examples.forEach(async (mod, desc) => {
        test(`rejects with an error when ${desc}`, async () => {
          let message;

          try {
            // wow
            await matchInstaller(mod.inFiles);
          } catch (error) {
            // such type
            message = error.message;
          } finally {
            if (message) {
              // much fp
              expect(message).toEqual(mod.failure);
            } else {
              // very safety
              expect(message, `should've rejected for ${desc}`).toEqual(mod.failure);
            }
          }
        });
      });
    });
  });

  // describe("fallback for anything that doesn't match other installers", () => {
  //   const fallbackInstaller = getFallbackInstaller();

  //   AllModTypes.forEach((set) => {
  //     set.forEach(async (mod, desc) => {
  //       test(`doesn’t match mod matched by specific installer when ${desc}`, async () => {
  //         const result = await matchSpecific(fallbackInstaller, mod.inFiles);
  //         expect(result.supported).toBeFalsy();
  //       });
  //     });
  //   });
  // });
});
