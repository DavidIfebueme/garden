import { spawnSync } from 'node:child_process'
import { deploymentTargetFromBranch } from '../deploy-targets.mjs'

/**
 * One Workers Builds trigger shares its existing build secrets across main and
 * dev. Route to the matching package script before typechecks or migrations:
 * staging owns shared Postgres migrations; dev only deploys its own resources.
 * Unknown branches fail before any command runs, keeping preview manual.
 * Reference: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
 */
const target = deploymentTargetFromBranch()
const command = target.key === 'staging' ? 'deploy' : 'deploy:dev'
console.log(`Deploying ${process.env.WORKERS_CI_BRANCH} → ${target.workerName}`)
const result = spawnSync('pnpm', ['run', command], { stdio: 'inherit' })
if (result.error) throw result.error
process.exitCode = result.status ?? 1
