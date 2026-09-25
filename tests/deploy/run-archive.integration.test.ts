import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, setDefaultTimeout, test } from 'bun:test';

type DeploymentResult = {
  appRelease: string;
  artifactExists: boolean;
  commands: string;
  deploymentOutput: string;
  deploymentStatus: number;
  finalUnit: string;
  previousReleaseExists: boolean;
};

type FailedKeepOldOptions = {
  restartCount?: number;
  outputIncludes?: string;
  forbidStop?: boolean;
};

type DeploymentScenario =
  | 'success'
  | 'first-deployment'
  | 'preparation-failure'
  | 'pre-switch-failure'
  | 'port-check-failure'
  | 'restart-failure'
  | 'health-failure'
  | 'rollback-failure'
  | 'signal-hup'
  | 'signal-int'
  | 'signal-term'
  | 'signal-after-switch';

setDefaultTimeout(180_000);

const projectRoot = process.cwd();
const { uid: hostUid, gid: hostGid } = userInfo();
const workspaces: string[] = [];

async function runDeployment(scenario: DeploymentScenario): Promise<DeploymentResult> {
  const workspace = await mkdtemp(join(tmpdir(), 'alt-shift-deploy-'));
  workspaces.push(workspace);

  const appPath = join(workspace, 'app');
  const artifactSource = join(workspace, 'artifact-source');
  const artifactPath = join(workspace, 'alt-shift.tar.gz');
  const commandLogPath = join(workspace, 'commands.log');
  if (scenario !== 'first-deployment') {
    await mkdir(appPath);
    await writeFile(join(appPath, 'release.txt'), 'old\n');
  }
  await mkdir(artifactSource);
  await writeFile(join(artifactSource, 'release.txt'), 'new\n');
  await writeFile(join(workspace, 'production.env'), 'NODE_ENV=production\n');
  await writeFile(join(workspace, 'previous-unit.service'), 'previous production unit\n');
  await writeFile(commandLogPath, '');

  const archive = spawnSync('tar', ['-czf', artifactPath, '-C', artifactSource, '.'], {
    encoding: 'utf8',
  });
  expect(archive.status, archive.stderr).toBe(0);

  const fixturePath = join(projectRoot, 'tests/deploy/run-archive-fixture.sh');
  const fakeCommandPath = join(projectRoot, 'tests/deploy/fake-command.sh');
  await chmod(fixturePath, 0o755);
  await chmod(fakeCommandPath, 0o755);

  const container = spawnSync(
    'docker',
    [
      'run',
      '--rm',
      '-e',
      `SCENARIO=${scenario}`,
      '-e',
      `HOST_UID=${hostUid}`,
      '-e',
      `HOST_GID=${hostGid}`,
      '-e',
      'PROJECT_NAME=deployment-test',
      '-e',
      'ARTIFACT_PATH=/workspace/alt-shift.tar.gz',
      '-e',
      'APP_PATH=/workspace/app',
      '-e',
      'ENV_FILE_PATH=/workspace/production.env',
      '-e',
      'APP_PORT=3000',
      '-e',
      'BASE_PATH=/alt-shift',
      '-e',
      'BUN_INSTALL=/workspace/bun-home',
      '-e',
      'COMMAND_LOG=/workspace/commands.log',
      '-v',
      `${projectRoot}:/repo:ro`,
      '-v',
      `${workspace}:/workspace`,
      'debian:bookworm-slim',
      '/repo/tests/deploy/run-archive-fixture.sh',
    ],
    { encoding: 'utf8', timeout: 180_000 },
  );
  expect(container.status, container.stderr).toBe(0);

  return {
    appRelease: (await readFile(join(appPath, 'release.txt'), 'utf8')).trim(),
    artifactExists: existsSync(artifactPath),
    commands: await readFile(commandLogPath, 'utf8'),
    deploymentOutput: await readFile(join(workspace, 'deployment-output.log'), 'utf8'),
    deploymentStatus: Number.parseInt(
      await readFile(join(workspace, 'deployment-status'), 'utf8'),
      10,
    ),
    finalUnit: await readFile(join(workspace, 'final-unit.service'), 'utf8'),
    previousReleaseExists: existsSync(`${appPath}.previous`),
  };
}

afterEach(async () => {
  await Promise.all(
    workspaces.splice(0).map(async (workspace) => rm(workspace, { recursive: true, force: true })),
  );
});

function expectSuccessfulRelease(result: DeploymentResult): void {
  expect(result.deploymentStatus).toBe(0);
  expect(result.appRelease).toBe('new');
  expect(result.artifactExists).toBeFalse();
  expect(result.previousReleaseExists).toBeFalse();
}

function expectFailedKeepOld(result: DeploymentResult, options?: FailedKeepOldOptions): void {
  expect(result.deploymentStatus).not.toBe(0);
  expect(result.appRelease).toBe('old');
  expect(result.finalUnit).toBe('previous production unit\n');
  if (options?.forbidStop) expect(result.commands).not.toContain('systemctl stop');
  if (options?.restartCount !== undefined) {
    expect(result.commands.match(/systemctl restart/g)).toHaveLength(options.restartCount);
  }
  if (options?.outputIncludes) expect(result.deploymentOutput).toContain(options.outputIncludes);
}

test('activates the candidate and removes the previous release only after a healthy start', async () => {
  const result = await runDeployment('success');

  expectSuccessfulRelease(result);
  expect(result.finalUnit).toContain('WorkingDirectory=/workspace/app');
  expect(result.finalUnit).toContain('Environment=BASE_PATH=/alt-shift');
  expect(result.commands).toContain('http://127.0.0.1:3000/alt-shift/api/health');
  expect(result.commands).toContain('http://127.0.0.1:3000/alt-shift/brand.svg');
  expect(result.commands.indexOf('bun install')).toBeLessThan(
    result.commands.indexOf('systemctl stop'),
  );
  expect(result.commands.indexOf('systemctl restart')).toBeLessThan(
    result.commands.indexOf('curl --fail'),
  );
});

test('supports a first deployment without an existing release or service', async () => {
  expectSuccessfulRelease(await runDeployment('first-deployment'));
});

test('keeps the running release when candidate preparation fails', async () => {
  expectFailedKeepOld(await runDeployment('preparation-failure'), { forbidStop: true });
});

test('restarts the untouched release when deployment fails before switching', async () => {
  expectFailedKeepOld(await runDeployment('pre-switch-failure'), { restartCount: 1 });
});

test('restarts the untouched release when port inspection fails', async () => {
  expectFailedKeepOld(await runDeployment('port-check-failure'), {
    restartCount: 1,
    outputIncludes: 'Failed to inspect port 3000',
  });
});

test('restarts the untouched release when deployment is interrupted before switching', async () => {
  for (const scenario of ['signal-hup', 'signal-int', 'signal-term'] as const) {
    expectFailedKeepOld(await runDeployment(scenario), { restartCount: 1 });
  }
});

test('restores the previous release when deployment is interrupted after switching', async () => {
  expectFailedKeepOld(await runDeployment('signal-after-switch'), { restartCount: 2 });
});

test('restores the previous release and unit when the candidate fails to start', async () => {
  expectFailedKeepOld(await runDeployment('restart-failure'), { restartCount: 2 });
});

test('reports when restoring the previous service fails', async () => {
  expectFailedKeepOld(await runDeployment('rollback-failure'), {
    outputIncludes: 'Rollback failed; manual recovery is required',
  });
});

test('restores the previous release and unit when the candidate remains unhealthy', async () => {
  const result = await runDeployment('health-failure');

  expectFailedKeepOld(result, {
    restartCount: 2,
    outputIncludes: 'Health check attempt 30/30 failed',
  });
  expect(result.commands.match(/curl /g)).toHaveLength(32);
  expect(result.commands.match(/^sleep 2$/gm)).toHaveLength(30);
});
