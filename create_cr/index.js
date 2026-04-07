import { DynamoDBClient, PutItemCommand, GetItemCommand} from "@aws-sdk/client-dynamodb";

const db = new DynamoDBClient();

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

  // TODO: Call Service now to create a new change request for the release.
  // createChangeRequestInServiceNow(release_info.Item);

  await db.send(new PutItemCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME,
    Item: {
      ...release_info.Item,
      status: { S: "PENDING" }
    }
  }));

  return { ...event};
};

const createChangeRequestInServiceNow = async (release_info) => {
  // TODO: Implement the logic to call ServiceNow API and create a change request
};
