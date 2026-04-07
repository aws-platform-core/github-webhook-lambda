import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
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