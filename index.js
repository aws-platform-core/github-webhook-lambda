import axios from "axios";
import {
    SecretsManagerClient,
    GetSecretValueCommand,
    PutSecretValueCommand
} from "@aws-sdk/client-secrets-manager";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";


const client = new SecretsManagerClient({
    region: "us-east-1",
});

export const handler = async (event) => {
    // let elasticHost = await getSecret("ELASTIC_HOST");
    // elasticHost = JSON.parse(elasticHost.SecretString).secretText;
    // console.log("ELASTIC_HOST: ", elasticHost);

    let payload = event.body;
    console.log("Received payload: ", payload);

    return {
        statusCode: 200,
        body: "Success"
    };
}

async function getSecret(secretName) {
    try {
        return await client.send(
            new GetSecretValueCommand({
                SecretId: secretName,
                VersionStage: "AWSCURRENT",
            })
        );
    } catch (error) {
        throw error;
    }
}
