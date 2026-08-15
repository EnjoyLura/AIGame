export interface M0BaselineInput {
    projectName: string;
    creatorVersion: string;
    designWidth: number;
    designHeight: number;
    portrait: boolean;
    hasNoUiDependency: boolean;
}

export interface M0BaselineResult {
    passed: boolean;
    checks: string[];
}

export const M0_BASELINE = {
    projectName: 'client',
    creatorVersion: '3.8.8',
    designWidth: 750,
    designHeight: 1334,
    portrait: true,
};

export function evaluateM0Baseline(input: M0BaselineInput): M0BaselineResult {
    const checks: string[] = [];

    if (input.projectName !== M0_BASELINE.projectName) {
        throw new Error(`Unexpected project name: ${input.projectName}`);
    }
    checks.push('project metadata');

    if (input.creatorVersion !== M0_BASELINE.creatorVersion) {
        throw new Error(`Unexpected Creator version: ${input.creatorVersion}`);
    }
    checks.push('Creator version');

    if (input.designWidth !== M0_BASELINE.designWidth || input.designHeight !== M0_BASELINE.designHeight) {
        throw new Error(`Unexpected design resolution: ${input.designWidth}x${input.designHeight}`);
    }
    checks.push('portrait design resolution');

    if (!input.portrait) {
        throw new Error('Project must use portrait orientation');
    }
    checks.push('portrait orientation');

    if (!input.hasNoUiDependency) {
        throw new Error('M0 baseline must not depend on UI or final art');
    }
    checks.push('no UI dependency');

    return { passed: true, checks };
}
