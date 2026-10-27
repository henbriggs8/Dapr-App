import { assertStagingConfiguration } from "./runtime-policy";

// Must run before routes, database clients or external SDKs are initialized.
assertStagingConfiguration();
