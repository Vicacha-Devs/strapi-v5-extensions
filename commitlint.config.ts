import type { LintOptions, QualifiedRules, UserConfig } from "@commitlint/types";
import { RuleConfigSeverity } from "@commitlint/types";

declare module "@commitlint/types" {
  type Commit = {
    ticket: string | null;
  };
}

const types = [
  "build",
  "chore",
  "ci",
  "docs",
  "feat",
  "fix",
  "perf",
  "refactor",
  "revert",
  "style",
  "test",
];

const parserPreset: LintOptions = {
  parserOpts: {
    headerPattern: /^(?:\[([A-z]*-\d+)]\s)?(\w*)(?:\((.*)\))?!?:\s(.*)$/,
    headerCorrespondence: ["ticket", "type", "scope", "subject"],
  },
};

const rules: QualifiedRules = {
  "scope-case": [RuleConfigSeverity.Error, "always", "lower-case"],
  "type-enum": [RuleConfigSeverity.Error, "always", types],
  "body-max-line-length": [RuleConfigSeverity.Error, "always", 250],
  "header-max-length": [RuleConfigSeverity.Error, "always", 150],
  "footer-max-line-length": [RuleConfigSeverity.Disabled, "always", 250],
};

const Configuration: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  parserPreset,
  rules,
};

export default Configuration;
