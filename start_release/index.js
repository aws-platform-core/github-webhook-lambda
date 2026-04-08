import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const db = new DynamoDBClient();
const sfn = new SFNClient({});

export const handler = async (event) => {
  const body = JSON.parse(event.body);
  console.log("Received event:", body);
  const release_info = await db.send(new GetItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: {
        release_id: { S: body.release_id }
      }
  }));

  console.log("Retrieved release info:", release_info);

  if (!release_info.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Release not found" })
    };
  }

  await db.send(new PutItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: {
        release_id: { S: release_info.Item.release_id.S },
        repo: { S: body.repo },
        sha: { S: body.sha },
        platform: { S: release_info.Item.platform.S },
        env: { S: release_info.Item.env.S },
        change_request_id: { S: "" },
        pr_number: { S: "" },
        status: { S: release_info.Item.status.S }
      }
    }));

  const release = unmarshall(release_info.Item);

  console.log("Unmarshalled release info:", release);

  const startExecutionResponse = await sfn.send(new StartExecutionCommand({
    stateMachineArn: process.env.STATE_MACHINE_ARN,
    input: JSON.stringify(release)
  }));
  console.log("Started Step Function execution: ", startExecutionResponse);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Release started" })
  };
};