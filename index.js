import {
    SecretsManagerClient,
    GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { postlogs } from "./shared/elastic.js";


const client = new SecretsManagerClient({
    region: "us-east-1",
});

export const handler = async (event) => {
    let secretText = JSON.parse(await getSecret().SecretString);
    let payload = event?.body ? JSON.parse(event?.body) : {};

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
        release_id: payload.workflow_run.id,
        env: getRunEnvironment(payload.workflow_run.name),
        actor: payload.workflow_run.triggering_actor.login,
        origin: "github"
    };

    if (payload?.action === "requested") {
        console.log("Handling requested action");
    } else if (payload.action === "completed") {
        console.log("Handling completed action");
        let response = await postlogs(record, secretText.ELASTIC_ENDPOINT, secretText.ELASTIC_APIKEY);
        console.log("Response from Elastic: ", response);
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

const getRunEnvironment = (title) => {
    if (title.includes("staging")) {
        return "staging";
    } else if (title.includes("prod")) {
        return "prod";
    } else if (title.includes("agile")) {
        return "agile";
    } else if (title.includes("test")) {
        return "test";
    } else {
        return "dev";
    }
}
