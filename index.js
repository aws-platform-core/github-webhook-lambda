import {
    SecretsManagerClient,
    GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { postlogs } from "./shared/elastic.js";
import { ACTION_TYPE, API_TYPE_ENUM, EVENT_TYPE, getAppDomain, getRunEnvironment, MESSAGES, ORIGIN } from "./shared/util.js";
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
    let release_id = await getReleaseId(payload);
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
        release_id,
        env: getRunEnvironment(payload.workflow_run.name),
        actor: payload.workflow_run.triggering_actor.login,
        origin: ORIGIN.GITHUB,
        domain: getAppDomain(payload.workflow_run.repository.owner.login)
    };
    console.log("Constructed record: ", record);

    if (payload?.action === ACTION_TYPE.REQUESTED && isInitialState) {
        await sendTeamsNotification(payload, record, secretText.TEAMS_WEBHOOK);
        console.log("Handling requested action");
    } else if (payload?.action === ACTION_TYPE.COMPLETED) {
        console.log("Handling completed action");
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

const getReleaseId = async (payload) => {
    if (payload.workflow_run.event === EVENT_TYPE.PULL_REQUEST) {
        let prMetaData = await callGithubApi(payload, API_TYPE_ENUM.PR, PAT);
        if (prMetaData.length > 0) {
            const title = prMetaData[0].title.toLowerCase();
            if (title.includes('[') && title.includes(']')) {
                console.log("Release Id found in PR title: " + title.substring(title.indexOf("[") + 1, title.lastIndexOf("]")));
                return title.substring(title.indexOf("[") + 1, title.lastIndexOf("]"));
            } else {
                // Not an intermediate deployment step, workflow triggered by a PR, compute new release id with format: env-runId-shortSha
                isInitialState = true;
                return computeReleaseId(payload);
            }
        } else {
            console.log("PR unknown");
            throw new Error(MESSAGES.REL_ID_NOT_FOUND);
        }
    } else {
        // Workflow triggered on a release/main branch, new release id created with format: env-runId-shortSha
        isInitialState = true;
        return computeReleaseId(payload);
    }
}

const computeReleaseId = (payload) => {
    let env = getRunEnvironment(payload.workflow_run.name);
    return `${env}-${payload.workflow_run.id}-${payload.workflow_run.head_sha.substring(0, 7)}`;
}
