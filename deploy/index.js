import { DynamoDBClient, PutItemCommand, GetItemCommand} from "@aws-sdk/client-dynamodb";
import {
    SecretsManagerClient,
    GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const db = new DynamoDBClient();
const client = new SecretsManagerClient({
    region: process.env.REGION
});

export const handler = async (event) => {
  console.log("Received event:", event);

  const release_info = await db.send(new GetItemCommand({
        TableName: process.env.DYNAMODB_TABLE_NAME,
        Key: {
          release_id: { S: event.release_id }
        }
    }));
    
  if (!release_info.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Release not found" })
    };
  }

  await deploy(release_info);
  // TODO: Call Service now to update the change request for the release.
  // await updateServiceNowCRWithStatus(release_info.Item.change_request_id.S);

  await db.send(new PutItemCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME,
    Item: {
      ...release_info.Item,
      status: { S: "COMPLETED" }
    }
  }));

  return { statusCode: 200 };
};

const deploy = async (release_info) => {
    if (release_info.Item.status.S !== "APPROVED") {
      console.log("Release is not approved yet. Current status: ", release_info.Item.status.S);
      return;
    }
    const secret = await getSecret();
    secretValue = secret.SecretString;
    if (release_info.Item.platform.S === "github") {
        // /repos/{owner}/{repo}/statuses/{sha}
        const response = await axios.post(`https://api.github.com/repos/${release_info.Item.repo.S}/statuses/${release_info.Item.commit_sha.S}`, {
            state: "success",
            context: "service-now-approval",
            description: `Deployment for release ${release_info.Item.release_id.S} approved by ServiceNow change request ${release_info.Item.change_request_id.S}`,
            environment: release_info.Item.env.S
        }, {
            headers: {
                Authorization: `Bearer ${secretValue.GITHUB_PAT}`,
                "Accept": "application/vnd.github.v3+json"
            }
        });
        console.log("GitHub deployment response: ", response.data);
    } else if (release_info.Item.platform.S === "jenkins") {

    } else if (release_info.Item.platform.S === "circleci") {

    } else if (release_info.Item.platform.S === "azure-devops") {

    } else {
      console.log("Unknown platform: ", release_info.Item.platform.S);
      return;
    }
}

const updateServiceNowCRWithStatus = async (change_request_id) => { 
  // TODO: Implement the logic to call ServiceNow API and update the change request
};

const getSecret = async () => {
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
