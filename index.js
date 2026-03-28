import {
    SecretsManagerClient,
    GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { postlogs } from "./shared/elastic.js";
import { ACTION_TYPE, API_TYPE_ENUM, EVENT_TYPE, getAppDomain, getDuration, getRunEnvironment, MESSAGES, ORIGIN } from "./shared/util.js";
import { callGithubApi } from "./shared/github.js";
import { sendTeamsNotification } from "./shared/teams.js";

let PAT = ""; // Personal Access Token for GitHub API, should be stored securely in Secrets Manager
let isInitialState = false

const client = new SecretsManagerClient({
    region: "us-east-1",
});

export const handler = async (event) => {
    let secretValue = await getSecret();
    console.log("Received secret: ", secretValue);
    let secretText = JSON.parse(secretValue.SecretString);
    console.log("Received secret string: ", secretText);
    let payload = event?.body ? JSON.parse(event?.body) : {};
    PAT = secretText.GITHUB_PAT;
    isInitialState = false;
    
    console.log("Received payload: ", payload);

    const record = {
        "@timestamp": payload.workflow_run.updated_at,
        // job_name: job.name,
        workflow: payload.workflow_run.name,
        status: payload.workflow_run.status,
        conclusion: payload.workflow_run.conclusion,
        started_at: payload.workflow_run.created_at,
        completed_at: payload.workflow_run.updated_at,
        // owner: context.repo.owner,
        repo: payload.workflow_run.repository.name,
        run_id: payload.workflow_run.id,
        release_id: null, // to be filled after fetching PR data or computed
        env: getRunEnvironment(payload.workflow_run.name),
        actor: payload.workflow_run.triggering_actor.login,
        origin: ORIGIN.GITHUB,
        domain: getAppDomain(payload.workflow_run.repository.owner.login),
        workflow_url: payload.workflow_run.url,
        logs_url: payload.workflow_run.logs_url,
        pr_url: null, // to be filled if workflow triggered by a PR
        duration: null,
        jobs: [], // to be filled for completed action
        diff: null,
        merge_commit_sha: null // to be filled if workflow triggered by a PR
    };
    await getReleaseId(payload, record);
    
    console.log("Constructed record: ", record);

    if ((payload?.action === ACTION_TYPE.REQUESTED || 
        (payload?.action === ACTION_TYPE.INPROGRESS && payload.event === EVENT_TYPE.PULL_REQUEST))
         && isInitialState) {
        await sendTeamsNotification(payload, record, secretText.TEAMS_WEBHOOK);
        console.log("Handling requested action");
    } else if (payload?.action === ACTION_TYPE.COMPLETED) {
        console.log("Handling completed action");
        record.duration = getDuration(record.started_at, record.completed_at);
        await getJobDetails(payload, record);
        await computeDiff(payload, record);
        await sendTeamsNotification(payload, record, secretText.TEAMS_WEBHOOK, false);
        await postlogs(record, secretText.ELASTIC_ENDPOINT, secretText.ELASTIC_APIKEY);
    }
    return {
        statusCode: 200,
        body: "Success"
    };
}

async function getSecret() {
    try {
        return await client.send(
            new GetSecretValueCommand({
                SecretId: process.env.SECRET_ARN
            })
        );
    } catch (error) {
        throw error;
    }
}

const getReleaseId = async (payload, record) => {
    if (payload.workflow_run.event === EVENT_TYPE.PULL_REQUEST) {
        let prMetaData = await callGithubApi(payload, API_TYPE_ENUM.PR, PAT);
        if (prMetaData.length > 0) {
            const title = prMetaData[0].title.toLowerCase();
            record.pr_url = prMetaData[0].url;
            record.merge_commit_sha = prMetaData[0].merge_commit_sha;
            if (title.includes('[') && title.includes(']')) {
                console.log("Release Id found in PR title: " + title.substring(title.indexOf("[") + 1, title.lastIndexOf("]")));
                record.release_id = title.substring(title.indexOf("[") + 1, title.lastIndexOf("]"));
            } else {
                // Not an intermediate deployment step, workflow triggered by a PR, compute new release id with format: env-runId-shortSha
                isInitialState = true;
                record.release_id = computeReleaseId(payload);
            }
        } else {
            console.log("PR unknown");
            throw new Error(MESSAGES.REL_ID_NOT_FOUND);
        }
    } else {
        // Workflow triggered on a release/main branch, new release id created with format: env-runId-shortSha
        isInitialState = true;
        record.release_id = computeReleaseId(payload);
    }
}

const getJobDetails = async (payload, record) => {
    if (payload?.action === ACTION_TYPE.COMPLETED) {
        let jobs = await callGithubApi(payload, API_TYPE_ENUM.JOBS, PAT);
        jobs = jobs?.jobs || [];
        if (jobs && jobs.length > 0) {
            record.jobs = jobs.map(job => ({
                name: job.name,
                conclusion: job.conclusion
            }));
        }
        console.log("Received jobs data: ", record.jobs);
    }
}

const computeDiff = async (payload, record) => {
    // For PR triggered workflows, compute diff with base branch. 
    if (payload.workflow_run.event === EVENT_TYPE.PULL_REQUEST) {
        const diffData = await callGithubApi(payload, API_TYPE_ENUM.DIFF_PR, PAT, record.merge_commit_sha);
        console.log("Received diff data: ", diffData);
        record.diff = diffData?.files?.map(file => file.filename).toString() || [];
    } else { //For release/main branch triggered workflows, compute diff with last successful run of the same workflow.
        const runs = await callGithubApi(payload, API_TYPE_ENUM.WORKFLOW, PAT);
        if (runs && runs?.workflow_runs.length > 1) {
            const latest_run = runs.workflow_runs[1];
            const diffData = await callGithubApi(payload, API_TYPE_ENUM.DIFF, PAT, latest_run.head_sha);
            console.log("Received diff data: ", diffData);
            record.diff = diffData?.files?.map(file => file.filename).toString() || [];
        }
    }
}

const computeReleaseId = (payload) => {
    let env = getRunEnvironment(payload.workflow_run.name);
    return `${env}-${payload.workflow_run.id}-${payload.workflow_run.head_sha.substring(0, 7)}`;
}
